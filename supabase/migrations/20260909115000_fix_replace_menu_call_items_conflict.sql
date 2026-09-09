begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.replace_menu_call_items(
  p_menu_site_id uuid,
  p_items jsonb
)
returns table (
  item_key text,
  label text,
  sort_order smallint,
  is_active boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_item_count integer;
begin
  if p_menu_site_id is null or p_items is null or pg_catalog.jsonb_typeof(p_items) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid call item configuration.';
  end if;

  if not exists (select 1 from public.menu_sites where id = p_menu_site_id) then
    raise exception using errcode = 'P0001', message = 'CALL_MENU_SITE_NOT_FOUND';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('menu-call-items:' || p_menu_site_id::text, 0)
  );

  v_item_count := pg_catalog.jsonb_array_length(p_items);
  if v_item_count < 1 or v_item_count > 12 then
    raise exception using errcode = '22023', message = 'Call item count must be between 1 and 12.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
    where pg_catalog.jsonb_typeof(item.value) <> 'object'
      or pg_catalog.jsonb_typeof(item.value -> 'key') <> 'string'
      or pg_catalog.jsonb_typeof(item.value -> 'label') <> 'string'
      or pg_catalog.jsonb_typeof(item.value -> 'sortOrder') <> 'number'
      or pg_catalog.jsonb_typeof(item.value -> 'active') <> 'boolean'
      or (item.value ->> 'key') !~ '^[a-z0-9_]{1,64}$'
      or (item.value ->> 'label') <> pg_catalog.btrim(item.value ->> 'label')
      or pg_catalog.char_length(item.value ->> 'label') not between 1 and 30
      or (item.value ->> 'sortOrder') !~ '^[0-9]+$'
      or (item.value ->> 'sortOrder')::integer not between 0 and 11
  ) then
    raise exception using errcode = '22023', message = 'Invalid call item value.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
    group by item.value ->> 'key'
    having count(*) > 1
  ) or exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
    group by pg_catalog.lower(item.value ->> 'label')
    having count(*) > 1
  ) or exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
    group by (item.value ->> 'sortOrder')::integer
    having count(*) > 1
  ) then
    raise exception using errcode = '22023', message = 'Call item keys, labels, and order must be unique.';
  end if;

  if not exists (
    select 1
    from pg_catalog.jsonb_array_elements(p_items) as item(value)
    where (item.value ->> 'active')::boolean
  ) then
    raise exception using errcode = '22023', message = 'At least one call item must be active.';
  end if;

  update public.menu_call_items as existing_item
  set is_active = false,
      archived_at = pg_catalog.now()
  where existing_item.menu_site_id = p_menu_site_id
    and existing_item.archived_at is null
    and not exists (
      select 1
      from pg_catalog.jsonb_array_elements(p_items) as item(value)
      where item.value ->> 'key' = existing_item.item_key
    );

  insert into public.menu_call_items (
    menu_site_id,
    item_key,
    label,
    sort_order,
    is_active,
    archived_at
  )
  select p_menu_site_id,
         item.value ->> 'key',
         item.value ->> 'label',
         (item.value ->> 'sortOrder')::smallint,
         (item.value ->> 'active')::boolean,
         null
  from pg_catalog.jsonb_array_elements(p_items) as item(value)
  on conflict on constraint menu_call_items_pkey do update
    set label = excluded.label,
        sort_order = excluded.sort_order,
        is_active = excluded.is_active,
        archived_at = null;

  return query
    select configured_item.item_key,
           configured_item.label,
           configured_item.sort_order,
           configured_item.is_active
    from public.menu_call_items as configured_item
    where configured_item.menu_site_id = p_menu_site_id
      and configured_item.archived_at is null
    order by configured_item.sort_order, configured_item.item_key;
end;
$$;

revoke all on function public.replace_menu_call_items(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_menu_call_items(uuid, jsonb) to service_role;

comment on function public.replace_menu_call_items(uuid, jsonb) is
  'Atomically replaces one menu site call item configuration using an unambiguous primary-key conflict target.';

commit;
