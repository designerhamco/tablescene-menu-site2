-- Storage RLS policy fix for menu-images.
-- Run this after supabase/menu-image-storage-setup.sql if uploads fail with:
-- "new row violates row-level security policy".
--
-- This keeps DB data and Storage files intact. It only replaces Storage
-- policies and adds a private helper function for owner checks.

create schema if not exists private;

create or replace function private.user_owns_menu_site(menu_site_id_text text)
returns boolean
language plpgsql
stable
security definer
set search_path = public, auth, pg_temp
as $$
begin
  if menu_site_id_text is null
    or menu_site_id_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  then
    return false;
  end if;

  return exists (
    select 1
    from public.menu_sites
    where id = menu_site_id_text::uuid
      and user_id = auth.uid()
  );
end;
$$;

revoke all on function private.user_owns_menu_site(text) from public;
grant execute on function private.user_owns_menu_site(text) to authenticated;

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
  and private.user_owns_menu_site((storage.foldername(name))[2])
);

drop policy if exists "menu images owner update" on storage.objects;
create policy "menu images owner update"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'menu-sites'
  and private.user_owns_menu_site((storage.foldername(name))[2])
)
with check (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'menu-sites'
  and private.user_owns_menu_site((storage.foldername(name))[2])
);

drop policy if exists "menu images owner delete" on storage.objects;
create policy "menu images owner delete"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'menu-images'
  and (storage.foldername(name))[1] = 'menu-sites'
  and private.user_owns_menu_site((storage.foldername(name))[2])
);
