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
  closed_automatically boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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
