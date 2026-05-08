-- 실행 전 Supabase Dashboard/SQL Editor에서 내용을 검토하세요.
-- 기존 데이터/컬럼은 삭제하지 않고, 이미지 path 컬럼과 Storage bucket/policy만 보강합니다.

alter table public.menu_sites add column if not exists logo_path text;
alter table public.menu_sites add column if not exists cover_image_path text;
alter table public.menu_items add column if not exists image_path text;
alter table public.menu_events add column if not exists event_image_path text;
alter table public.menu_chefs add column if not exists chef_image_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'menu-images',
  'menu-images',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "menu images public read" on storage.objects;
create policy "menu images public read"
on storage.objects
for select
to anon, authenticated
using (bucket_id = 'menu-images');

drop policy if exists "menu images owner insert" on storage.objects;
create policy "menu images owner insert"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'menu-sites'
  and exists (
    select 1
    from public.menu_sites
    where menu_sites.id::text = (storage.foldername(name))[2]
      and menu_sites.user_id = auth.uid()
  )
);

drop policy if exists "menu images owner update" on storage.objects;
create policy "menu images owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'menu-sites'
  and exists (
    select 1
    from public.menu_sites
    where menu_sites.id::text = (storage.foldername(name))[2]
      and menu_sites.user_id = auth.uid()
  )
)
with check (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'menu-sites'
  and exists (
    select 1
    from public.menu_sites
    where menu_sites.id::text = (storage.foldername(name))[2]
      and menu_sites.user_id = auth.uid()
  )
);

drop policy if exists "menu images owner delete" on storage.objects;
create policy "menu images owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'menu-sites'
  and exists (
    select 1
    from public.menu_sites
    where menu_sites.id::text = (storage.foldername(name))[2]
      and menu_sites.user_id = auth.uid()
  )
);
