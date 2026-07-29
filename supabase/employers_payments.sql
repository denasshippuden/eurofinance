create extension if not exists "pgcrypto";

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

create unique index if not exists employers_group_normalized_name_idx
on public.employers(group_id, normalized_name);

create index if not exists employers_group_active_name_idx
on public.employers(group_id, active, name);

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
end $$;

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

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'receivables_payment_id_fkey'
  ) then
    alter table public.receivables
    add constraint receivables_payment_id_fkey
    foreign key (payment_id) references public.payments(id) on delete set null;
  end if;
end $$;

create index if not exists time_entries_group_employer_date_idx
on public.time_entries(group_id, employer_id, work_date desc);

create index if not exists receivables_group_employer_status_due_idx
on public.receivables(group_id, employer_id, status, due_date);

create index if not exists payments_group_employer_date_idx
on public.payments(group_id, employer_id, received_at desc);

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

drop trigger if exists set_employers_updated_at on public.employers;
create trigger set_employers_updated_at
before update on public.employers
for each row execute function public.set_updated_at();

alter table public.employers enable row level security;
alter table public.payments enable row level security;
alter table public.payment_items enable row level security;

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

notify pgrst, 'reload schema';
