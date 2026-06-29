create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default 'FinanceOS Private',
  default_currency text not null default 'EUR' check (default_currency in ('EUR', 'BRL', 'USD')),
  theme text not null default 'dark' check (theme in ('dark', 'light', 'system')),
  created_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  type text not null check (type in ('income', 'expense', 'both')),
  created_at timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('income', 'expense')),
  description text not null,
  amount numeric(14, 2) not null check (amount > 0),
  currency text not null check (currency in ('EUR', 'BRL', 'USD')),
  category text not null,
  payment_method text,
  source text,
  notes text,
  date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists categories_user_id_idx on public.categories(user_id);
create index if not exists transactions_user_id_date_idx on public.transactions(user_id, date desc);
create index if not exists transactions_user_id_type_idx on public.transactions(user_id, type);

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

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.transactions enable row level security;

drop policy if exists "Profiles are private" on public.profiles;
create policy "Profiles are private"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Categories are private" on public.categories;
create policy "Categories are private"
on public.categories
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Transactions are private" on public.transactions;
create policy "Transactions are private"
on public.transactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create or replace function public.create_profile_for_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, default_currency, theme)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', 'FinanceOS Private'),
    'EUR',
    'dark'
  )
  on conflict (id) do nothing;

  insert into public.categories (user_id, name, type)
  values
    (new.id, 'Operacional', 'expense'),
    (new.id, 'Software', 'expense'),
    (new.id, 'Marketing', 'expense'),
    (new.id, 'Impostos', 'expense'),
    (new.id, 'Viagens', 'expense'),
    (new.id, 'Alimentação', 'expense'),
    (new.id, 'Casa', 'expense'),
    (new.id, 'Saúde', 'expense'),
    (new.id, 'Educação', 'expense'),
    (new.id, 'Outro', 'expense'),
    (new.id, 'Cliente', 'income'),
    (new.id, 'Salário', 'income'),
    (new.id, 'Freelancer', 'income'),
    (new.id, 'Projeto', 'income'),
    (new.id, 'Reembolso', 'income'),
    (new.id, 'Outro', 'income')
  on conflict do nothing;

  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists create_profile_on_signup on auth.users;
create trigger create_profile_on_signup
after insert on auth.users
for each row execute function public.create_profile_for_new_user();
