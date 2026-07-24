create table if not exists public.receivables (
  id text primary key,
  auth_user_id uuid not null references auth.users(id) on delete cascade,
  app_user_id text not null,
  group_id text not null,
  payer_name text not null,
  work_or_service text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'BRL', 'USD')),
  due_date date,
  status text not null default 'open' check (status in ('open', 'received')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists receivables_group_status_due_idx
on public.receivables(group_id, status, due_date);

create index if not exists receivables_group_created_idx
on public.receivables(group_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_receivables_updated_at on public.receivables;
create trigger set_receivables_updated_at
before update on public.receivables
for each row execute function public.set_updated_at();

alter table public.receivables enable row level security;

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

notify pgrst, 'reload schema';
