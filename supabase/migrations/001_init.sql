-- 001_init.sql
-- Basis-Tabellen für ein kleines, klar getrenntes Supabase-Backend.

create table if not exists public.app_events (
  id bigint generated always as identity primary key,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  received_at timestamptz not null default now()
);

create table if not exists public.user_profiles (
  id uuid primary key,
  display_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_app_events_type on public.app_events (event_type);
create index if not exists idx_app_events_received_at on public.app_events (received_at desc);
