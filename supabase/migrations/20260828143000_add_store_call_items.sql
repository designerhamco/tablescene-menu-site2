begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.menu_call_items (
  menu_site_id uuid not null references public.menu_sites(id) on delete restrict,
  item_key text not null,
  label text not null,
  sort_order smallint not null,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (menu_site_id, item_key),
  constraint menu_call_items_key_check
    check (item_key ~ '^[a-z0-9_]{1,64}$'),
  constraint menu_call_items_label_check
    check (label = btrim(label) and char_length(label) between 1 and 30),
  constraint menu_call_items_sort_order_check
    check (sort_order between 0 and 11),
  constraint menu_call_items_archive_state_check
    check (archived_at is null or is_active = false)
);

create index menu_call_items_site_active_sort_idx
  on public.menu_call_items(menu_site_id, is_active, sort_order)
  where archived_at is null;

create trigger set_menu_call_items_updated_at
before update on public.menu_call_items
for each row execute function public.set_updated_at();

alter table public.menu_call_items enable row level security;
alter table public.menu_call_items force row level security;

revoke all on table public.menu_call_items from public, anon, authenticated, service_role;
grant select, insert, update on table public.menu_call_items to service_role;

alter table public.menu_customer_calls
  add column request_key text not null default 'staff',
  add column request_label text not null default '직원 호출';

alter table public.menu_customer_calls
  add constraint menu_customer_calls_request_key_check
    check (request_key ~ '^[a-z0-9_]{1,64}$') not valid,
  add constraint menu_customer_calls_request_label_check
    check (request_label = btrim(request_label) and char_length(request_label) between 1 and 30) not valid;

alter table public.menu_customer_calls
  validate constraint menu_customer_calls_request_key_check;
alter table public.menu_customer_calls
  validate constraint menu_customer_calls_request_label_check;

create or replace function public.list_menu_call_items(
  p_menu_site_id uuid,
  p_include_inactive boolean default false
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
begin
  if p_menu_site_id is null then
    raise exception using errcode = '22023', message = 'Missing menu site identity.';
  end if;

  if exists (
    select 1
    from public.menu_call_items as configured_item
    where configured_item.menu_site_id = p_menu_site_id
      and configured_item.archived_at is null
  ) then
    return query
      select configured_item.item_key,
             configured_item.label,
             configured_item.sort_order,
             configured_item.is_active
      from public.menu_call_items as configured_item
      where configured_item.menu_site_id = p_menu_site_id
        and configured_item.archived_at is null
        and (p_include_inactive or configured_item.is_active)
      order by configured_item.sort_order, configured_item.created_at, configured_item.item_key;
    return;
  end if;

  return query
    select default_item.item_key,
           default_item.label,
           default_item.sort_order,
           true
    from (
      values
        ('staff'::text, '직원 호출'::text, 0::smallint),
        ('water'::text, '물 요청'::text, 1::smallint),
        ('apron'::text, '앞치마 요청'::text, 2::smallint),
        ('tableware'::text, '식기 요청'::text, 3::smallint),
        ('table_cleanup'::text, '테이블 정리'::text, 4::smallint),
        ('order_help'::text, '주문 도움'::text, 5::smallint)
    ) as default_item(item_key, label, sort_order)
    order by default_item.sort_order;
end;
$$;

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
  on conflict (menu_site_id, item_key) do update
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

create or replace function public.submit_staff_call(
  p_menu_site_id uuid,
  p_table_visit_session_id uuid,
  p_call_item_key text
)
returns table (
  call_id uuid,
  call_number bigint,
  call_status text,
  request_key text,
  request_label text,
  is_duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.table_visit_sessions%rowtype;
  v_existing public.menu_customer_calls%rowtype;
  v_call public.menu_customer_calls%rowtype;
  v_item record;
begin
  if p_menu_site_id is null
     or p_table_visit_session_id is null
     or p_call_item_key is null
     or p_call_item_key !~ '^[a-z0-9_]{1,64}$' then
    raise exception using errcode = '22023', message = 'Missing call identity.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('staff-call:' || p_table_visit_session_id::text, 0)
  );

  select session_row.*
    into v_session
  from public.table_visit_sessions as session_row
  join public.menu_tables as table_row
    on table_row.menu_site_id = session_row.menu_site_id
   and table_row.id = session_row.menu_table_id
  join public.menu_sites as site_row
    on site_row.id = session_row.menu_site_id
  where session_row.id = p_table_visit_session_id
    and session_row.menu_site_id = p_menu_site_id
    and session_row.revoked_at is null
    and session_row.expires_at > pg_catalog.now()
    and table_row.status = 'active'
    and site_row.status = 'published'
  for update of session_row;

  if not found then
    raise exception using errcode = '42501', message = 'The table visit session is not active.';
  end if;

  select listed_item.*
    into v_item
  from public.list_menu_call_items(p_menu_site_id, false) as listed_item
  where listed_item.item_key = p_call_item_key
  limit 1;

  if not found then
    raise exception using errcode = 'P0001', message = 'CALL_ITEM_UNAVAILABLE';
  end if;

  select call_row.*
    into v_existing
  from public.menu_customer_calls as call_row
  where call_row.table_visit_session_id = p_table_visit_session_id
    and call_row.call_type = 'staff'
    and call_row.status in ('pending', 'acknowledged')
  order by call_row.created_at desc
  limit 1;

  if found then
    return query
      select v_existing.id,
             v_existing.call_number,
             v_existing.status,
             v_existing.request_key,
             v_existing.request_label,
             true;
    return;
  end if;

  if exists (
    select 1
    from public.menu_customer_calls as recent_call
    where recent_call.table_visit_session_id = p_table_visit_session_id
      and recent_call.created_at > pg_catalog.now() - interval '2 minutes'
  ) then
    raise exception using errcode = 'P0001', message = 'CALL_COOLDOWN';
  end if;

  if (
    select count(*)
    from public.menu_customer_calls as hourly_call
    where hourly_call.table_visit_session_id = p_table_visit_session_id
      and hourly_call.created_at > pg_catalog.now() - interval '1 hour'
  ) >= 10 then
    raise exception using errcode = 'P0001', message = 'CALL_RATE_LIMIT';
  end if;

  insert into public.menu_customer_calls (
    menu_site_id,
    menu_table_id,
    table_visit_session_id,
    request_key,
    request_label
  ) values (
    p_menu_site_id,
    v_session.menu_table_id,
    p_table_visit_session_id,
    v_item.item_key,
    v_item.label
  )
  returning * into v_call;

  return query
    select v_call.id,
           v_call.call_number,
           v_call.status,
           v_call.request_key,
           v_call.request_label,
           false;
end;
$$;

revoke all on function public.list_menu_call_items(uuid, boolean)
  from public, anon, authenticated;
grant execute on function public.list_menu_call_items(uuid, boolean) to service_role;
revoke all on function public.replace_menu_call_items(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_menu_call_items(uuid, jsonb) to service_role;
revoke all on function public.submit_staff_call(uuid, uuid, text)
  from public, anon, authenticated;
grant execute on function public.submit_staff_call(uuid, uuid, text) to service_role;

comment on table public.menu_call_items is
  'Server-only per-menu staff call item configuration. Omitted defaults are virtual until the first explicit save; removed items are archived.';
comment on column public.menu_customer_calls.request_label is
  'Immutable display label snapshot captured when the customer call is created.';
comment on function public.list_menu_call_items(uuid, boolean) is
  'Service-role-only invoker RPC returning configured call items or the six virtual defaults.';
comment on function public.replace_menu_call_items(uuid, jsonb) is
  'Service-role-only invoker RPC atomically replacing up to twelve per-menu call items without hard deletion.';
comment on function public.submit_staff_call(uuid, uuid, text) is
  'Service-role-only invoker RPC validating the selected active per-menu call item and preserving existing call rate limits.';

commit;
