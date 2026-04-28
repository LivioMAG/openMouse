-- Wishlist schema with RLS for owner management and public contributions.

create extension if not exists pgcrypto;

create type public.wishlist_status as enum ('active', 'archived');
create type public.item_status as enum ('active', 'reserved', 'fulfilled', 'archived');
create type public.contribution_type as enum ('take_over', 'amount', 'comment');

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 120),
  description text,
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  is_public boolean not null default true,
  status public.wishlist_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.wishlist_items (
  id uuid primary key default gen_random_uuid(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 140),
  description text,
  image_url text,
  price_chf numeric(10,2),
  external_url text,
  sort_order integer not null default 0,
  status public.item_status not null default 'active',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.item_contributions (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.wishlist_items(id) on delete cascade,
  visitor_name text not null check (char_length(visitor_name) between 1 and 60),
  contribution_type public.contribution_type not null,
  amount_chf numeric(10,2),
  comment text,
  created_at timestamptz not null default timezone('utc', now()),
  constraint amount_required_for_amount_type check (
    (contribution_type = 'amount' and amount_chf is not null and amount_chf > 0)
    or (contribution_type <> 'amount' and amount_chf is null)
  )
);

create index if not exists idx_wishlists_owner on public.wishlists(owner_id);
create index if not exists idx_wishlist_items_wishlist on public.wishlist_items(wishlist_id);
create index if not exists idx_contributions_item on public.item_contributions(item_id);

create or replace function public.touch_updated_at()
returns trigger as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$ language plpgsql;

create trigger touch_wishlists_updated_at
before update on public.wishlists
for each row execute function public.touch_updated_at();

create trigger touch_wishlist_items_updated_at
before update on public.wishlist_items
for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles(id, email, display_name)
  values (new.id, new.email, split_part(coalesce(new.email, ''), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.wishlists enable row level security;
alter table public.wishlist_items enable row level security;
alter table public.item_contributions enable row level security;

create policy "profile owner read/update"
on public.profiles
for all
using (auth.uid() = id)
with check (auth.uid() = id);

create policy "owner can manage own wishlists"
on public.wishlists
for all
using (auth.uid() = owner_id)
with check (auth.uid() = owner_id);

create policy "public can view public wishlists by slug"
on public.wishlists
for select
using (is_public = true and status = 'active');

create policy "owner can manage own wishlist items"
on public.wishlist_items
for all
using (
  exists (
    select 1 from public.wishlists w
    where w.id = wishlist_id and w.owner_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.wishlists w
    where w.id = wishlist_id and w.owner_id = auth.uid()
  )
);

create policy "public can read items for public wishlists"
on public.wishlist_items
for select
using (
  exists (
    select 1 from public.wishlists w
    where w.id = wishlist_id and w.is_public = true and w.status = 'active'
  )
);

create policy "owner can read contributions on own lists"
on public.item_contributions
for select
using (
  exists (
    select 1
    from public.wishlist_items i
    join public.wishlists w on w.id = i.wishlist_id
    where i.id = item_id and w.owner_id = auth.uid()
  )
);

create policy "public can read contributions for public wishlists"
on public.item_contributions
for select
using (
  exists (
    select 1
    from public.wishlist_items i
    join public.wishlists w on w.id = i.wishlist_id
    where i.id = item_id and w.is_public = true and w.status = 'active'
  )
);

create policy "public can insert contributions for public wishlists"
on public.item_contributions
for insert
with check (
  exists (
    select 1
    from public.wishlist_items i
    join public.wishlists w on w.id = i.wishlist_id
    where i.id = item_id and w.is_public = true and w.status = 'active'
  )
);
