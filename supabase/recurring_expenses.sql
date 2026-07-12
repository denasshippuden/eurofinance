create extension if not exists "pgcrypto";

alter table public.transactions add column if not exists recurring_expense_id uuid;
alter table public.transactions add column if not exists recurrence_month date;
alter table public.transactions add column if not exists is_recurring_instance boolean not null default false;
alter table public.transactions add column if not exists generation_source text check (generation_source in ('manual', 'automatic'));

alter table public.time_entries add column if not exists interval_minutes integer not null default 0 check (interval_minutes >= 0);
alter table public.time_entries add column if not exists hourly_rate numeric(14, 2);
alter table public.time_entries add column if not exists notes text;
alter table public.time_entries add column if not exists entry_source text not null default 'clock' check (entry_source in ('clock', 'manual', 'automatic'));

create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  group_id text not null,
  wallet_user_id text not null,
  wallet_user_name text not null,
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'BRL', 'USD')),
  category text not null,
  payment_method text not null,
  due_day integer not null check (due_day between 1 and 31),
  start_date date not null,
  end_date date,
  notes text,
  status text not null default 'active' check (status in ('active', 'paused')),
  auto_generate boolean not null default true,
  created_by_user_id text not null,
  created_by_name text not null,
  updated_by_user_id text not null,
  updated_by_name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recurring_expenses_end_after_start check (end_date is null or end_date >= start_date)
);

create table if not exists public.recurring_expense_instances (
  id uuid primary key default gen_random_uuid(),
  recurring_expense_id uuid not null references public.recurring_expenses(id) on delete cascade,
  group_id text not null,
  recurrence_month date not null,
  transaction_id uuid references public.transactions(id) on delete set null,
  status text not null default 'generated' check (status in ('generated', 'deleted', 'skipped')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'transactions_recurring_expense_id_fkey'
      and conrelid = 'public.transactions'::regclass
  ) then
    alter table public.transactions
      add constraint transactions_recurring_expense_id_fkey
      foreign key (recurring_expense_id)
      references public.recurring_expenses(id)
      on delete set null;
  end if;
end $$;

create index if not exists transactions_group_id_date_type_idx on public.transactions(group_id, type, date desc);
create index if not exists transactions_group_id_wallet_date_idx on public.transactions(group_id, wallet_user_id, date desc);
create index if not exists transactions_recurring_expense_idx on public.transactions(recurring_expense_id, recurrence_month);
create unique index if not exists transactions_recurring_expense_month_uidx
on public.transactions(recurring_expense_id, recurrence_month)
where is_recurring_instance = true and recurring_expense_id is not null and recurrence_month is not null;

create index if not exists recurring_expenses_group_status_idx on public.recurring_expenses(group_id, status);
create index if not exists recurring_expenses_group_wallet_idx on public.recurring_expenses(group_id, wallet_user_id);
create unique index if not exists recurring_expense_instances_month_uidx
on public.recurring_expense_instances(recurring_expense_id, recurrence_month);
create index if not exists recurring_expense_instances_group_month_idx
on public.recurring_expense_instances(group_id, recurrence_month);

drop trigger if exists set_recurring_expenses_updated_at on public.recurring_expenses;
create trigger set_recurring_expenses_updated_at
before update on public.recurring_expenses
for each row execute function public.set_updated_at();

drop trigger if exists set_recurring_expense_instances_updated_at on public.recurring_expense_instances;
create trigger set_recurring_expense_instances_updated_at
before update on public.recurring_expense_instances
for each row execute function public.set_updated_at();

alter table public.recurring_expenses enable row level security;
alter table public.recurring_expense_instances enable row level security;

drop policy if exists "Recurring expenses can be selected by group" on public.recurring_expenses;
drop policy if exists "Recurring expenses can be inserted by wallet owner" on public.recurring_expenses;
drop policy if exists "Recurring expenses can be updated by wallet owner" on public.recurring_expenses;
drop policy if exists "Recurring expenses can be deleted by wallet owner" on public.recurring_expenses;

create policy "Recurring expenses can be selected by group"
on public.recurring_expenses
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expenses.group_id
  )
);

create policy "Recurring expenses can be inserted by wallet owner"
on public.recurring_expenses
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expenses.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = recurring_expenses.wallet_user_id
      )
  )
);

create policy "Recurring expenses can be updated by wallet owner"
on public.recurring_expenses
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expenses.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = recurring_expenses.wallet_user_id
      )
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expenses.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = recurring_expenses.wallet_user_id
      )
  )
);

create policy "Recurring expenses can be deleted by wallet owner"
on public.recurring_expenses
for delete
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expenses.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = recurring_expenses.wallet_user_id
      )
  )
);

drop policy if exists "Recurring expense instances can be selected by group" on public.recurring_expense_instances;
drop policy if exists "Recurring expense instances can be inserted by group" on public.recurring_expense_instances;
drop policy if exists "Recurring expense instances can be updated by group" on public.recurring_expense_instances;

create policy "Recurring expense instances can be selected by group"
on public.recurring_expense_instances
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expense_instances.group_id
  )
);

create policy "Recurring expense instances can be inserted by group"
on public.recurring_expense_instances
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expense_instances.group_id
  )
);

create policy "Recurring expense instances can be updated by group"
on public.recurring_expense_instances
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expense_instances.group_id
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = recurring_expense_instances.group_id
  )
);

drop policy if exists "Time entries are private" on public.time_entries;
drop policy if exists "Time entries can be selected by owner or group master" on public.time_entries;
drop policy if exists "Time entries can be inserted by owner or group master" on public.time_entries;
drop policy if exists "Time entries can be updated by owner or group master" on public.time_entries;
drop policy if exists "Time entries can be deleted by owner or group master" on public.time_entries;

create policy "Time entries can be selected by owner or group master"
on public.time_entries
for select
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = time_entries.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = time_entries.app_user_id
      )
  )
);

create policy "Time entries can be inserted by owner or group master"
on public.time_entries
for insert
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = time_entries.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = time_entries.app_user_id
      )
  )
);

create policy "Time entries can be updated by owner or group master"
on public.time_entries
for update
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = time_entries.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = time_entries.app_user_id
      )
  )
)
with check (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = time_entries.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = time_entries.app_user_id
      )
  )
);

create policy "Time entries can be deleted by owner or group master"
on public.time_entries
for delete
using (
  exists (
    select 1 from public.profiles
    where profiles.id = auth.uid()
      and profiles.group_id = time_entries.group_id
      and (
        profiles.role = 'master'
        or profiles.app_user_id = time_entries.app_user_id
      )
  )
);

notify pgrst, 'reload schema';
