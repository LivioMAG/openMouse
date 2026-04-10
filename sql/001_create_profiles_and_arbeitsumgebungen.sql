create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  has_subscription boolean not null default false
);

alter table public.profiles enable row level security;

create policy "profiles_select_own"
  on public.profiles
  for select
  using (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create table if not exists public.arbeitsumgebungen (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  projektname text not null,
  kommissionsnummer text not null,
  created_at timestamptz not null default now()
);

alter table public.arbeitsumgebungen enable row level security;

create policy "arbeitsumgebungen_select_own"
  on public.arbeitsumgebungen
  for select
  using (auth.uid() = user_id);

create policy "arbeitsumgebungen_insert_own"
  on public.arbeitsumgebungen
  for insert
  with check (auth.uid() = user_id);
