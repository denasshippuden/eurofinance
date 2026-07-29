create extension if not exists "pgcrypto";

create table if not exists public.finance_groups (
  id text primary key,
  name text not null,
  created_at timestamptz not null default now()
);

insert into public.finance_groups (id, name)
values
  ('group-a', 'Grupo A'),
  ('group-b', 'Grupo B')
on conflict (id) do update set name = excluded.name;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  app_user_id text,
  email text,
  name text not null default 'FinanceOS Private',
  group_id text not null default 'group-a',
  group_name text not null default 'Grupo A',
  role text not null default 'member' check (role in ('master', 'member')),
  default_currency text not null default 'EUR' check (default_currency in ('EUR', 'BRL', 'USD')),
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  created_at timestamptz not null default now()
);

alter table public.profiles add column if not exists app_user_id text;
alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists group_id text not null default 'group-a';
alter table public.profiles add column if not exists group_name text not null default 'Grupo A';
alter table public.profiles add column if not exists role text not null default 'member';

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null default 'group-a',
  name text not null,
  type text not null check (type in ('income', 'expense', 'both')),
  created_at timestamptz not null default now()
);

alter table public.categories add column if not exists group_id text not null default 'group-a';

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  group_id text not null default 'group-a',
  wallet_user_id text not null default 'master-user',
  wallet_user_name text not null default 'Usuário master',
  type text not null check (type in ('income', 'expense')),
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'BRL', 'USD')),
  category text not null,
  payment_method text,
  source text,
  notes text,
  date date not null,
  created_by_user_id text not null default 'master-user',
  created_by_name text not null default 'Usuário master',
  updated_by_user_id text not null default 'master-user',
  updated_by_name text not null default 'Usuário master',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.transactions add column if not exists group_id text not null default 'group-a';
alter table public.transactions add column if not exists wallet_user_id text not null default 'master-user';
alter table public.transactions add column if not exists wallet_user_name text not null default 'Usuário master';
alter table public.transactions add column if not exists created_by_user_id text not null default 'master-user';
alter table public.transactions add column if not exists created_by_name text not null default 'Usuário master';
alter table public.transactions add column if not exists updated_by_user_id text not null default 'master-user';
alter table public.transactions add column if not exists updated_by_name text not null default 'Usuário master';

create table if not exists public.audit_entries (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  transaction_id uuid not null,
  transaction_description text not null,
  action text not null check (action in ('created', 'updated', 'deleted')),
  actor_user_id text not null,
  actor_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id text primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  app_user_id text not null,
  group_id text not null,
  user_name text not null,
  employer_id text,
  work_date date not null,
  clock_in_at timestamptz not null,
  clock_in_time text not null,
  clock_out_at timestamptz,
  clock_out_time text,
  interval_minutes integer not null default 0 check (interval_minutes >= 0),
  payment_type text not null default 'hourly' check (payment_type in ('hourly', 'daily')),
  hourly_rate numeric(14, 2),
  daily_rate numeric(14, 2),
  notes text,
  entry_source text not null default 'clock' check (entry_source in ('clock', 'manual', 'automatic')),
  closed_automatically boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.receivables (
  id text primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  app_user_id text not null,
  group_id text not null,
  employer_id text,
  payment_id text,
  payer_name text not null,
  work_or_service text not null,
  amount numeric(14, 2) not null check (amount > 0),
  received_amount numeric(14, 2) not null default 0 check (received_amount >= 0),
  currency text not null check (currency in ('EUR', 'BRL', 'USD')),
  due_date date,
  received_at date,
  status text not null default 'open' check (status in ('open', 'received')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.employers (
  id text primary key,
  group_id text not null,
  name text not null,
  normalized_name text not null,
  company_name text,
  phone text,
  email text,
  default_daily_rate numeric(14, 2) not null default 0 check (default_daily_rate >= 0),
  default_hourly_rate numeric(14, 2) check (default_hourly_rate is null or default_hourly_rate >= 0),
  payment_type text not null default 'daily' check (payment_type in ('daily', 'weekly', 'biweekly', 'monthly', 'custom')),
  expected_payment_day integer check (expected_payment_day is null or expected_payment_day between 1 and 31),
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.payments (
  id text primary key,
  group_id text not null,
  employer_id text references public.employers(id) on delete set null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'BRL', 'USD')),
  received_at date not null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.payment_items (
  payment_id text not null references public.payments(id) on delete cascade,
  receivable_id text not null references public.receivables(id) on delete cascade,
  applied_amount numeric(14, 2) not null check (applied_amount > 0),
  primary key (payment_id, receivable_id)
);

alter table public.time_entries add column if not exists employer_id text;
alter table public.receivables add column if not exists employer_id text;
alter table public.receivables add column if not exists payment_id text;
alter table public.receivables add column if not exists received_amount numeric(14, 2) not null default 0 check (received_amount >= 0);
alter table public.receivables add column if not exists received_at date;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'time_entries_employer_id_fkey'
  ) then
    alter table public.time_entries
    add constraint time_entries_employer_id_fkey
    foreign key (employer_id) references public.employers(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'receivables_employer_id_fkey'
  ) then
    alter table public.receivables
    add constraint receivables_employer_id_fkey
    foreign key (employer_id) references public.employers(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint where conname = 'receivables_payment_id_fkey'
  ) then
    alter table public.receivables
    add constraint receivables_payment_id_fkey
    foreign key (payment_id) references public.payments(id) on delete set null;
  end if;
end $$;

create index if not exists categories_group_id_idx on public.categories(group_id);
create unique index if not exists categories_group_name_type_idx on public.categories(group_id, name, type);
create index if not exists transactions_group_id_date_idx on public.transactions(group_id, date desc);
create index if not exists transactions_group_id_wallet_idx on public.transactions(group_id, wallet_user_id);
create index if not exists transactions_group_id_type_idx on public.transactions(group_id, type);
create index if not exists audit_entries_group_id_created_idx on public.audit_entries(group_id, created_at desc);
create index if not exists time_entries_auth_user_date_idx on public.time_entries(auth_user_id, work_date desc);
create unique index if not exists time_entries_app_user_work_date_idx on public.time_entries(app_user_id, work_date);
create index if not exists time_entries_group_employer_date_idx on public.time_entries(group_id, employer_id, work_date desc);
create index if not exists receivables_group_status_due_idx on public.receivables(group_id, status, due_date);
create index if not exists receivables_group_employer_status_due_idx on public.receivables(group_id, employer_id, status, due_date);
create index if not exists receivables_group_created_idx on public.receivables(group_id, created_at desc);
create unique index if not exists employers_group_normalized_name_idx on public.employers(group_id, normalized_name);
create index if not exists employers_group_active_name_idx on public.employers(group_id, active, name);
create index if not exists payments_group_employer_date_idx on public.payments(group_id, employer_id, received_at desc);

insert into public.employers (
  id,
  group_id,
  name,
  normalized_name,
  default_daily_rate,
  payment_type,
  active,
  created_at,
  updated_at
)
select
  'employer-' || encode(digest(receivables.group_id || ':' || lower(regexp_replace(trim(receivables.payer_name), '\s+', ' ', 'g')), 'sha256'), 'hex'),
  receivables.group_id,
  min(regexp_replace(trim(receivables.payer_name), '\s+', ' ', 'g')),
  lower(regexp_replace(trim(receivables.payer_name), '\s+', ' ', 'g')),
  0,
  'custom',
  true,
  now(),
  now()
from public.receivables
where receivables.employer_id is null
  and nullif(trim(receivables.payer_name), '') is not null
group by receivables.group_id, lower(regexp_replace(trim(receivables.payer_name), '\s+', ' ', 'g'))
on conflict (group_id, normalized_name) do nothing;

update public.receivables
set employer_id = employers.id
from public.employers
where receivables.employer_id is null
  and receivables.group_id = employers.group_id
  and lower(regexp_replace(trim(receivables.payer_name), '\s+', ' ', 'g')) = employers.normalized_name;

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_transactions_updated_at on public.transactions;
create trigger set_transactions_updated_at
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists set_time_entries_updated_at on public.time_entries;
create trigger set_time_entries_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

drop trigger if exists set_receivables_updated_at on public.receivables;
create trigger set_receivables_updated_at
before update on public.receivables
for each row execute function public.set_updated_at();

drop trigger if exists set_employers_updated_at on public.employers;
create trigger set_employers_updated_at
before update on public.employers
for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_entries enable row level security;
alter table public.time_entries enable row level security;
alter table public.receivables enable row level security;
alter table public.employers enable row level security;
alter table public.payments enable row level security;
alter table public.payment_items enable row level security;

drop policy if exists "Profiles are private" on public.profiles;
create policy "Profiles are private"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Categories are visible to group" on public.categories;
create policy "Categories are visible to group"
on public.categories
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = categories.group_id
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = categories.group_id
  )
);

drop policy if exists "Transactions are visible to group" on public.transactions;
drop policy if exists "Transactions can be selected by group" on public.transactions;
drop policy if exists "Transactions can be inserted by wallet owner" on public.transactions;
drop policy if exists "Transactions can be updated by wallet owner" on public.transactions;
drop policy if exists "Transactions can be deleted by wallet owner" on public.transactions;

create policy "Transactions can be selected by group"
on public.transactions
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = transactions.group_id
  )
);

create policy "Transactions can be inserted by wallet owner"
on public.transactions
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = transactions.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = transactions.wallet_user_id
      )
  )
);

create policy "Transactions can be updated by wallet owner"
on public.transactions
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = transactions.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = transactions.wallet_user_id
      )
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = transactions.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = transactions.wallet_user_id
      )
  )
);

create policy "Transactions can be deleted by wallet owner"
on public.transactions
for delete
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = transactions.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = transactions.wallet_user_id
      )
  )
);

drop policy if exists "Audit entries are visible to group" on public.audit_entries;
create policy "Audit entries are visible to group"
on public.audit_entries
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = audit_entries.group_id
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = audit_entries.group_id
  )
);

drop policy if exists "Time entries are private" on public.time_entries;
create policy "Time entries are private"
on public.time_entries
for all
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

drop policy if exists "Receivables are visible to group" on public.receivables;
drop policy if exists "Receivables can be inserted by group" on public.receivables;
drop policy if exists "Receivables can be updated by group" on public.receivables;
drop policy if exists "Receivables can be deleted by group" on public.receivables;

create policy "Receivables are visible to group"
on public.receivables
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = receivables.group_id
  )
);

create policy "Receivables can be inserted by group"
on public.receivables
for insert
with check (
  auth.uid() = auth_user_id
  and exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = receivables.group_id
  )
);

create policy "Receivables can be updated by group"
on public.receivables
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = receivables.group_id
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = receivables.group_id
  )
);

create policy "Receivables can be deleted by group"
on public.receivables
for delete
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = receivables.group_id
  )
);

drop policy if exists "Employers are visible to group" on public.employers;
create policy "Employers are visible to group"
on public.employers
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = employers.group_id
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = employers.group_id
  )
);

drop policy if exists "Payments are visible to group" on public.payments;
create policy "Payments are visible to group"
on public.payments
for all
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = payments.group_id
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = payments.group_id
  )
);

drop policy if exists "Payment items are visible to group" on public.payment_items;
create policy "Payment items are visible to group"
on public.payment_items
for all
using (
  exists (
    select 1
    from public.payments
    join public.profiles on profiles.group_id = payments.group_id
    where profiles.id = auth.uid()
      and payments.id = payment_items.payment_id
  )
)
with check (
  exists (
    select 1
    from public.payments
    join public.profiles on profiles.group_id = payments.group_id
    where profiles.id = auth.uid()
      and payments.id = payment_items.payment_id
  )
);

create or replace function public.create_profile_for_new_user()
returns trigger as $$
declare
  normalized_email text := lower(coalesce(new.email, ''));
  next_app_user_id text := coalesce(new.raw_user_meta_data->>'app_user_id', normalized_email);
  next_name text := coalesce(new.raw_user_meta_data->>'name', split_part(normalized_email, '@', 1), 'FinanceOS Private');
  next_group_id text := coalesce(new.raw_user_meta_data->>'group_id', 'group-a');
  next_group_name text := coalesce(new.raw_user_meta_data->>'group_name', 'Grupo A');
  next_role text := coalesce(new.raw_user_meta_data->>'role', 'member');
begin
  if normalized_email in ('admin@financeos.local', 'eduarda@financeos.local') then
    next_group_id := 'group-a';
    next_group_name := 'Grupo A';
  elsif normalized_email in ('pedro@financeos.local', 'gabrielle@financeos.local') then
    next_group_id := 'group-b';
    next_group_name := 'Grupo B';
  end if;

  if normalized_email = 'admin@financeos.local' then
    next_app_user_id := 'master-user';
    next_name := 'Usuário master';
    next_role := 'master';
  elsif normalized_email = 'eduarda@financeos.local' then
    next_app_user_id := 'eduarda-bonalume';
    next_name := 'Eduarda Bonalume';
  elsif normalized_email = 'pedro@financeos.local' then
    next_app_user_id := 'pedro-cabral-roscao';
    next_name := 'Pedro Cabral do Roscão';
  elsif normalized_email = 'gabrielle@financeos.local' then
    next_app_user_id := 'gabrielle';
    next_name := 'Gabrielle';
  end if;

  insert into public.profiles (id, app_user_id, email, name, group_id, group_name, role, default_currency, theme)
  values (new.id, next_app_user_id, normalized_email, next_name, next_group_id, next_group_name, next_role, 'EUR', 'dark')
  on conflict (id) do update set
    app_user_id = excluded.app_user_id,
    email = excluded.email,
    name = excluded.name,
    group_id = excluded.group_id,
    group_name = excluded.group_name,
    role = excluded.role;

  insert into public.categories (user_id, group_id, name, type)
  values
    (new.id, next_group_id, 'Operacional', 'expense'),
    (new.id, next_group_id, 'Software', 'expense'),
    (new.id, next_group_id, 'Marketing', 'expense'),
    (new.id, next_group_id, 'Impostos', 'expense'),
    (new.id, next_group_id, 'Viagens', 'expense'),
    (new.id, next_group_id, 'Alimentação', 'expense'),
    (new.id, next_group_id, 'Casa', 'expense'),
    (new.id, next_group_id, 'Saúde', 'expense'),
    (new.id, next_group_id, 'Educação', 'expense'),
    (new.id, next_group_id, 'Outro', 'expense'),
    (new.id, next_group_id, 'Cliente', 'income'),
    (new.id, next_group_id, 'Salário', 'income'),
    (new.id, next_group_id, 'Freelancer', 'income'),
    (new.id, next_group_id, 'Projeto', 'income'),
    (new.id, next_group_id, 'Reembolso', 'income'),
    (new.id, next_group_id, 'Outro', 'income')
  on conflict (group_id, name, type) do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists create_profile_on_signup on auth.users;
create trigger create_profile_on_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
