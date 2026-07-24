create table if not exists public.time_entries (
  id text primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  app_user_id text not null,
  group_id text not null,
  user_name text not null,
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

alter table public.time_entries add column if not exists interval_minutes integer not null default 0 check (interval_minutes >= 0);
alter table public.time_entries add column if not exists payment_type text not null default 'hourly' check (payment_type in ('hourly', 'daily'));
alter table public.time_entries add column if not exists hourly_rate numeric(14, 2);
alter table public.time_entries add column if not exists daily_rate numeric(14, 2);
alter table public.time_entries add column if not exists notes text;
alter table public.time_entries add column if not exists entry_source text not null default 'clock' check (entry_source in ('clock', 'manual', 'automatic'));

create index if not exists time_entries_auth_user_date_idx
on public.time_entries(auth_user_id, work_date desc);

create unique index if not exists time_entries_app_user_work_date_idx
on public.time_entries(app_user_id, work_date);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_time_entries_updated_at on public.time_entries;
create trigger set_time_entries_updated_at
before update on public.time_entries
for each row execute function public.set_updated_at();

alter table public.time_entries enable row level security;

drop policy if exists "Time entries are private" on public.time_entries;
create policy "Time entries are private"
on public.time_entries
for all
using (auth.uid() = auth_user_id)
with check (auth.uid() = auth_user_id);

notify pgrst, 'reload schema';
