create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  parent_id uuid references public.folders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  arbeitsumgebung_id uuid not null references public.arbeitsumgebungen(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists folders_user_workspace_parent_idx
  on public.folders(user_id, arbeitsumgebung_id, parent_id);

alter table public.folders enable row level security;

create policy "folders_select_own"
  on public.folders
  for select
  using (auth.uid() = user_id);

create policy "folders_insert_own"
  on public.folders
  for insert
  with check (auth.uid() = user_id);

create policy "folders_update_own"
  on public.folders
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "folders_delete_own"
  on public.folders
  for delete
  using (auth.uid() = user_id);

create table if not exists public.files (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  file_path text not null unique,
  folder_id uuid references public.folders(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  arbeitsumgebung_id uuid not null references public.arbeitsumgebungen(id) on delete cascade,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index if not exists files_user_workspace_folder_idx
  on public.files(user_id, arbeitsumgebung_id, folder_id);

alter table public.files enable row level security;

create policy "files_select_own"
  on public.files
  for select
  using (auth.uid() = user_id);

create policy "files_insert_own"
  on public.files
  for insert
  with check (auth.uid() = user_id);

create policy "files_update_own"
  on public.files
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "files_delete_own"
  on public.files
  for delete
  using (auth.uid() = user_id);

insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

create policy "documents_storage_select_own"
  on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_storage_insert_own"
  on storage.objects
  for insert
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_storage_update_own"
  on storage.objects
  for update
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "documents_storage_delete_own"
  on storage.objects
  for delete
  using (
    bucket_id = 'documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
