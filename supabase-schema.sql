create extension if not exists pgcrypto;

-- =========================================================
-- Fresh-only bootstrap for a new Supabase project
-- =========================================================

-- ---------------------------------------------------------
-- Cleanup
-- ---------------------------------------------------------

drop policy if exists "weekly attachment read own or admin" on storage.objects;
drop policy if exists "weekly attachment write own or admin" on storage.objects;
drop policy if exists "crm note attachment read own or admin" on storage.objects;
drop policy if exists "crm note attachment write own or admin" on storage.objects;

drop function if exists public.purge_user_account(uuid) cascade;
drop function if exists public.reject_holiday_request(uuid, text) cascade;
drop function if exists public.approve_holiday_request(uuid, text, text) cascade;
drop function if exists public.is_admin_user() cascade;
drop function if exists public.set_updated_at() cascade;

drop table if exists public.project_disco_entries cascade;
drop table if exists public.project_disco_layers cascade;
drop table if exists public.daily_assignments cascade;
drop table if exists public.request_history cascade;
drop table if exists public.holiday_requests cascade;
drop table if exists public.weekly_reports cascade;
drop table if exists public.notes cascade;
drop table if exists public.crm_contacts cascade;
drop table if exists public.projects cascade;
drop table if exists public.school_vacations cascade;
drop table if exists public.platform_holidays cascade;
drop table if exists public.app_profiles cascade;

-- Optional: keep buckets if you already use them elsewhere.
-- delete from storage.buckets where id in ('weekly-attachments', 'crm-note-attachments');

-- ---------------------------------------------------------
-- Shared trigger function
-- ---------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

-- ---------------------------------------------------------
-- Tables
-- ---------------------------------------------------------

create table public.app_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null,
  role_label text not null default 'Monteur',
  is_admin boolean not null default false,
  is_active boolean not null default true,
  vacation_allowance_hours numeric(10,2) not null default 0,
  booked_vacation_hours numeric(10,2) not null default 0,
  carryover_overtime_hours numeric(10,2) not null default 0,
  reported_hours numeric(10,2) not null default 0,
  credited_hours numeric(10,2) not null default 0,
  weekly_hours numeric(10,2) not null default 40,
  target_revenue numeric(12,2) not null default 0,
  school_day_1 smallint,
  school_day_2 smallint,
  block_schedule jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  commission_number text not null,
  name text not null,
  allow_expenses boolean not null default true,
  project_lead_profile_id uuid references public.app_profiles(id) on delete set null,
  construction_lead_profile_id uuid references public.app_profiles(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create unique index projects_commission_number_idx
on public.projects (commission_number);

create table public.weekly_reports (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.app_profiles(id) on delete cascade,
  work_date date not null,
  year integer,
  kw integer,
  abz_typ integer not null default 0,
  project_name text,
  commission_number text not null,
  start_time time not null default '07:00',
  end_time time not null default '16:30',
  lunch_break_minutes integer not null default 60,
  additional_break_minutes integer not null default 30,
  total_work_minutes integer not null default 0,
  adjusted_work_minutes integer not null default 0,
  expenses_amount numeric(10,2) not null default 0,
  other_costs_amount numeric(10,2) not null default 0,
  expense_note text,
  notes text,
  controll text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.holiday_requests (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.app_profiles(id) on delete cascade,
  start_date date not null,
  end_date date not null,
  request_type text not null check (
    request_type in (
      'ferien',
      'militaer',
      'zivildienst',
      'unfall',
      'krankheit',
      'feiertag'
    )
  ),
  notes text,
  controll_pl text,
  controll_gl text,
  attachments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint holiday_requests_range_check check (end_date >= start_date)
);

create table public.request_history (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default timezone('utc', now()),
  profile_id uuid not null references public.app_profiles(id) on delete cascade,
  request text not null,
  context text not null
);

create table public.daily_assignments (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.app_profiles(id) on delete cascade,
  assignment_date date not null,
  project_id uuid references public.projects(id) on delete set null,
  label text not null,
  source text not null default 'manual',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint daily_assignments_unique_profile_day unique (profile_id, assignment_date)
);

create table public.platform_holidays (
  id uuid primary key default gen_random_uuid(),
  holiday_date date not null unique,
  label text not null,
  is_paid boolean not null default true,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.school_vacations (
  id uuid primary key default gen_random_uuid(),
  start_date date not null,
  end_date date not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint school_vacations_range_check check (end_date >= start_date)
);

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  category text not null check (
    category in (
      'kunde',
      'lieferant',
      'elektroplaner',
      'subunternehmer',
      'unternehmer'
    )
  ),
  company_name text,
  first_name text not null,
  last_name text not null,
  street text,
  city text,
  postal_code text,
  phone text,
  email text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.notes (
  id uuid primary key default gen_random_uuid(),
  target_uid uuid not null,
  note_type text not null default 'crm',
  note_text text not null,
  sender_uid uuid not null references public.app_profiles(id) on delete restrict,
  recipient_uid uuid references public.app_profiles(id) on delete set null,
  note_category text not null default 'information',
  requires_response boolean not null default false,
  visible_from_date date,
  note_ranking smallint not null default 2 check (note_ranking between 1 and 3),
  attachments jsonb not null default '[]'::jsonb,
  note_flow jsonb not null default '[]'::jsonb,
  note_pos_x integer not null default 24,
  note_pos_y integer not null default 24,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.project_disco_layers (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  week_start_date date not null,
  profile_uid uuid not null references public.app_profiles(id) on delete cascade,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.project_disco_entries (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  note_id uuid not null references public.notes(id) on delete cascade,
  layer_id uuid references public.project_disco_layers(id) on delete cascade,
  plan_date date,
  sort_order integer not null default 1,
  created_at timestamptz not null default timezone('utc', now())
);

-- ---------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------

create or replace function public.is_admin_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.app_profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

create or replace function public.build_holiday_request_history_text(request_row public.holiday_requests)
returns text
language sql
stable
as $$
  select trim(
    both ' | ' from concat_ws(
      ' | ',
      coalesce(request_row.request_type, 'Absenzantrag'),
      case
        when request_row.start_date is not null and request_row.end_date is not null
          then request_row.start_date::text || ' bis ' || request_row.end_date::text
        else null
      end,
      nullif(trim(coalesce(request_row.notes, '')), '')
    )
  );
$$;

create or replace function public.approve_holiday_request(
  p_request_id uuid,
  p_field_name text,
  p_approval_name text
)
returns public.holiday_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_request public.holiday_requests%rowtype;
  archive_context text;
begin
  if not public.is_admin_user() then
    raise exception 'Nur Admin darf Absenzgesuche freigeben.';
  end if;

  if p_field_name not in ('controll_pl', 'controll_gl') then
    raise exception 'Ungültiges Freigabefeld: %', p_field_name;
  end if;

  perform 1
  from public.holiday_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Absenzgesuch % wurde nicht gefunden.', p_request_id;
  end if;

  if p_field_name = 'controll_pl' then
    update public.holiday_requests
    set controll_pl = p_approval_name
    where id = p_request_id
    returning * into updated_request;
  else
    update public.holiday_requests
    set controll_gl = p_approval_name
    where id = p_request_id
    returning * into updated_request;
  end if;

  if nullif(trim(coalesce(updated_request.controll_pl, '')), '') is not null
     and nullif(trim(coalesce(updated_request.controll_gl, '')), '') is not null then

    insert into public.weekly_reports (
      profile_id,
      work_date,
      year,
      kw,
      project_name,
      commission_number,
      abz_typ,
      start_time,
      end_time,
      lunch_break_minutes,
      additional_break_minutes,
      total_work_minutes,
      adjusted_work_minutes,
      expenses_amount,
      other_costs_amount,
      expense_note,
      notes,
      controll,
      attachments
    )
    select
      updated_request.profile_id,
      gs.work_day::date,
      extract(isoyear from gs.work_day)::integer,
      extract(week from gs.work_day)::integer,
      initcap(replace(coalesce(updated_request.request_type, 'Absenz'), '_', ' ')),
      initcap(replace(coalesce(updated_request.request_type, 'Absenz'), '_', ' ')),
      case lower(coalesce(updated_request.request_type, ''))
        when 'ferien' then 1
        when 'krankheit' then 2
        when 'militaer' then 3
        when 'zivildienst' then 3
        when 'unfall' then 4
        when 'feiertag' then 5
        else 0
      end,
      '07:00'::time,
      '16:30'::time,
      60,
      30,
      480,
      480,
      0,
      0,
      '',
      format(
        'Automatisch aus bestätigter Absenz (%s).',
        initcap(replace(coalesce(updated_request.request_type, 'Absenz'), '_', ' '))
      ),
      '',
      '[]'::jsonb
    from generate_series(
      updated_request.start_date::timestamp,
      updated_request.end_date::timestamp,
      interval '1 day'
    ) as gs(work_day)
    where extract(isodow from gs.work_day) between 1 and 5
      and not exists (
        select 1
        from public.weekly_reports existing
        where existing.profile_id = updated_request.profile_id
          and existing.work_date = gs.work_day::date
      );

    archive_context := format(
      'Bestätigt durch PL: %s | GL: %s',
      updated_request.controll_pl,
      updated_request.controll_gl
    );

    insert into public.request_history (profile_id, request, context)
    values (
      updated_request.profile_id,
      public.build_holiday_request_history_text(updated_request),
      archive_context
    );

    delete from public.holiday_requests
    where id = updated_request.id;
  end if;

  return updated_request;
end;
$$;

create or replace function public.reject_holiday_request(
  p_request_id uuid,
  p_context text default 'Abgelehnt'
)
returns public.holiday_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_request public.holiday_requests%rowtype;
begin
  if not public.is_admin_user() then
    raise exception 'Nur Admin darf Absenzgesuche ablehnen.';
  end if;

  delete from public.holiday_requests
  where id = p_request_id
  returning * into deleted_request;

  if not found then
    raise exception 'Absenzgesuch % wurde nicht gefunden.', p_request_id;
  end if;

  insert into public.request_history (profile_id, request, context)
  values (
    deleted_request.profile_id,
    public.build_holiday_request_history_text(deleted_request),
    coalesce(nullif(trim(p_context), ''), 'Abgelehnt')
  );

  return deleted_request;
end;
$$;

create or replace function public.purge_user_account(
  p_profile_id uuid
)
returns void
language plpgsql
security definer
set search_path = public, auth, storage
as $$
begin
  if p_profile_id is null then
    raise exception 'Profil-ID fehlt.';
  end if;

  if not public.is_admin_user() then
    raise exception 'Nur Admin darf Benutzer restlos entfernen.';
  end if;

  if auth.uid() = p_profile_id then
    raise exception 'Eigenes Profil kann nicht gelöscht werden.';
  end if;

  delete from storage.objects
  where bucket_id = 'weekly-attachments'
    and name like p_profile_id::text || '/%';

  delete from storage.objects
  where bucket_id = 'crm-note-attachments'
    and name like p_profile_id::text || '/%';

  delete from auth.users
  where id = p_profile_id;
end;
$$;

-- ---------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------

revoke all on function public.is_admin_user() from public;
revoke all on function public.approve_holiday_request(uuid, text, text) from public;
revoke all on function public.reject_holiday_request(uuid, text) from public;
revoke all on function public.purge_user_account(uuid) from public;

grant execute on function public.is_admin_user() to authenticated;
grant execute on function public.approve_holiday_request(uuid, text, text) to authenticated;
grant execute on function public.reject_holiday_request(uuid, text) to authenticated;
grant execute on function public.purge_user_account(uuid) to authenticated;

-- ---------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------

create index weekly_reports_profile_work_date_idx on public.weekly_reports (profile_id, work_date);
create index weekly_reports_year_kw_idx on public.weekly_reports (year, kw);
create index holiday_requests_profile_dates_idx on public.holiday_requests (profile_id, start_date, end_date);
create index request_history_profile_created_at_idx on public.request_history (profile_id, created_at desc);
create index daily_assignments_profile_date_idx on public.daily_assignments (profile_id, assignment_date);
create index crm_contacts_last_name_idx on public.crm_contacts (last_name, first_name);
create index notes_target_uid_created_at_idx on public.notes (target_uid, created_at desc);
create index project_disco_layers_project_week_idx on public.project_disco_layers (project_id, week_start_date, sort_order);
create index project_disco_entries_project_note_idx on public.project_disco_entries (project_id, note_id);

-- ---------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------

create trigger set_updated_at_app_profiles
before update on public.app_profiles
for each row execute function public.set_updated_at();

create trigger projects_set_updated_at
before update on public.projects
for each row execute function public.set_updated_at();

create trigger set_updated_at_weekly_reports
before update on public.weekly_reports
for each row execute function public.set_updated_at();

create trigger set_updated_at_holiday_requests
before update on public.holiday_requests
for each row execute function public.set_updated_at();

create trigger set_updated_at_daily_assignments
before update on public.daily_assignments
for each row execute function public.set_updated_at();

create trigger set_updated_at_crm_contacts
before update on public.crm_contacts
for each row execute function public.set_updated_at();

create trigger set_updated_at_school_vacations
before update on public.school_vacations
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------
-- Enable RLS
-- ---------------------------------------------------------

alter table public.app_profiles enable row level security;
alter table public.projects enable row level security;
alter table public.weekly_reports enable row level security;
alter table public.holiday_requests enable row level security;
alter table public.request_history enable row level security;
alter table public.daily_assignments enable row level security;
alter table public.platform_holidays enable row level security;
alter table public.crm_contacts enable row level security;
alter table public.notes enable row level security;
alter table public.school_vacations enable row level security;
alter table public.project_disco_layers enable row level security;
alter table public.project_disco_entries enable row level security;

-- ---------------------------------------------------------
-- Policies
-- ---------------------------------------------------------

drop policy if exists "app_profiles own or admin" on public.app_profiles;
create policy "app_profiles own or admin"
on public.app_profiles
for select
to authenticated
using (public.is_admin_user() or auth.uid() = id);

drop policy if exists "app_profiles insert own or admin" on public.app_profiles;
create policy "app_profiles insert own or admin"
on public.app_profiles
for insert
to authenticated
with check (public.is_admin_user() or auth.uid() = id);

drop policy if exists "app_profiles update own or admin" on public.app_profiles;
create policy "app_profiles update own or admin"
on public.app_profiles
for update
to authenticated
using (public.is_admin_user() or auth.uid() = id)
with check (public.is_admin_user() or auth.uid() = id);

drop policy if exists "app_profiles delete own or admin" on public.app_profiles;
create policy "app_profiles delete own or admin"
on public.app_profiles
for delete
to authenticated
using (public.is_admin_user() or auth.uid() = id);

drop policy if exists "weekly_reports own or admin" on public.weekly_reports;
create policy "weekly_reports own or admin"
on public.weekly_reports
for all
to authenticated
using (public.is_admin_user() or auth.uid() = profile_id)
with check (public.is_admin_user() or auth.uid() = profile_id);

drop policy if exists "holiday_requests own or admin" on public.holiday_requests;
create policy "holiday_requests own or admin"
on public.holiday_requests
for all
to authenticated
using (public.is_admin_user() or auth.uid() = profile_id)
with check (public.is_admin_user() or auth.uid() = profile_id);

drop policy if exists "request_history own or admin" on public.request_history;
create policy "request_history own or admin"
on public.request_history
for select
to authenticated
using (public.is_admin_user() or auth.uid() = profile_id);

drop policy if exists "daily_assignments own or admin" on public.daily_assignments;
create policy "daily_assignments own or admin"
on public.daily_assignments
for all
to authenticated
using (public.is_admin_user() or auth.uid() = profile_id)
with check (public.is_admin_user() or auth.uid() = profile_id);

drop policy if exists "platform_holidays authenticated read" on public.platform_holidays;
create policy "platform_holidays authenticated read"
on public.platform_holidays
for select
to authenticated
using (true);

drop policy if exists "platform_holidays admin write" on public.platform_holidays;
create policy "platform_holidays admin write"
on public.platform_holidays
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "projects admin access" on public.projects;
create policy "projects admin access"
on public.projects
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "crm_contacts admin access" on public.crm_contacts;
create policy "crm_contacts admin access"
on public.crm_contacts
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "notes admin access" on public.notes;
create policy "notes admin access"
on public.notes
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "school_vacations admin access" on public.school_vacations;
create policy "school_vacations admin access"
on public.school_vacations
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "project_disco_layers admin access" on public.project_disco_layers;
create policy "project_disco_layers admin access"
on public.project_disco_layers
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

drop policy if exists "project_disco_entries admin access" on public.project_disco_entries;
create policy "project_disco_entries admin access"
on public.project_disco_entries
for all
to authenticated
using (public.is_admin_user())
with check (public.is_admin_user());

-- ---------------------------------------------------------
-- Storage buckets
-- ---------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('weekly-attachments', 'weekly-attachments', false)
on conflict (id) do update
set public = excluded.public;

insert into storage.buckets (id, name, public)
values ('crm-note-attachments', 'crm-note-attachments', false)
on conflict (id) do update
set public = excluded.public;

-- ---------------------------------------------------------
-- Storage policies
-- ---------------------------------------------------------

drop policy if exists "weekly attachment read own or admin" on storage.objects;
create policy "weekly attachment read own or admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'weekly-attachments'
  and (
    public.is_admin_user()
    or auth.uid()::text = split_part(name, '/', 1)
  )
);

drop policy if exists "weekly attachment write own or admin" on storage.objects;
create policy "weekly attachment write own or admin"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'weekly-attachments'
  and (
    public.is_admin_user()
    or auth.uid()::text = split_part(name, '/', 1)
  )
)
with check (
  bucket_id = 'weekly-attachments'
  and (
    public.is_admin_user()
    or auth.uid()::text = split_part(name, '/', 1)
  )
);

drop policy if exists "crm note attachment read own or admin" on storage.objects;
create policy "crm note attachment read own or admin"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'crm-note-attachments'
  and (
    public.is_admin_user()
    or auth.uid()::text = split_part(name, '/', 1)
  )
);

drop policy if exists "crm note attachment write own or admin" on storage.objects;
create policy "crm note attachment write own or admin"
on storage.objects
for all
to authenticated
using (
  bucket_id = 'crm-note-attachments'
  and (
    public.is_admin_user()
    or auth.uid()::text = split_part(name, '/', 1)
  )
)
with check (
  bucket_id = 'crm-note-attachments'
  and (
    public.is_admin_user()
    or auth.uid()::text = split_part(name, '/', 1)
  )
);
