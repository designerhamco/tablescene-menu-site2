begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

-- Order-specific options remain independent of design-only price columns.
-- The owner explicitly saves these values; immutable order snapshots are untouched.
create or replace function public.replace_menu_item_order_options(
  p_menu_site_id uuid,
  p_menu_item_id uuid,
  p_actor_user_id uuid,
  p_expected_updated_at timestamptz,
  p_orderable boolean,
  p_price integer,
  p_groups jsonb
) returns timestamptz
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_updated_at timestamptz;
  v_group jsonb;
  v_value jsonb;
  v_group_id uuid;
  v_value_id uuid;
  v_group_ids uuid[] := '{}';
  v_value_ids uuid[] := '{}';
  v_group_order integer := 0;
  v_value_order integer;
  v_count integer;
begin
  if p_orderable is null or p_price is null or p_price < 0 or p_price > 10000000
    or jsonb_typeof(p_groups) is distinct from 'array' or jsonb_array_length(p_groups) > 10 then
    raise exception using errcode = '22023', message = 'INVALID_ORDER_CONFIGURATION';
  end if;
  if not exists (
    select 1 from public.menu_sites site
    where site.id = p_menu_site_id and site.user_id = p_actor_user_id
      and site.template_key is distinct from 'display_menu_a'
  ) then
    raise exception using errcode = '42501', message = 'OWNER_REQUIRED';
  end if;
  select item.updated_at into v_updated_at from public.menu_items item
    where item.id = p_menu_item_id and item.menu_site_id = p_menu_site_id for update;
  if not found then raise exception using errcode = '22023', message = 'ITEM_NOT_FOUND'; end if;
  if v_updated_at is distinct from p_expected_updated_at then
    raise exception using errcode = '40001', message = 'ORDER_CONFIGURATION_CONFLICT';
  end if;

  for v_group in select value from jsonb_array_elements(p_groups) loop
    v_group_id := (v_group->>'id')::uuid;
    if v_group_id is null or (v_group_id = any(v_group_ids) or v_group_id = any(v_value_ids))
      or char_length(btrim(coalesce(v_group->>'name',''))) not between 1 and 80
      or jsonb_typeof(v_group->'required') is distinct from 'boolean'
      or jsonb_typeof(v_group->'multiple') is distinct from 'boolean'
      or jsonb_typeof(v_group->'values') is distinct from 'array' then
      raise exception using errcode = '22023', message = 'INVALID_OPTION_GROUP';
    end if;
    v_count := jsonb_array_length(v_group->'values');
    if v_count not between 1 and 20 then
      raise exception using errcode = '22023', message = 'INVALID_OPTION_VALUES';
    end if;
    if exists (select 1 from public.menu_order_option_groups g where g.id = v_group_id
      and (g.menu_site_id <> p_menu_site_id or g.menu_item_id <> p_menu_item_id)) then
      raise exception using errcode = '42501', message = 'OPTION_SCOPE_MISMATCH';
    end if;
    v_group_ids := array_append(v_group_ids, v_group_id);
    insert into public.menu_order_option_groups as existing
      (id, menu_site_id, menu_item_id, name, is_required, min_selections, max_selections, display_order, status, archived_at)
    values (v_group_id, p_menu_site_id, p_menu_item_id, btrim(v_group->>'name'), (v_group->>'required')::boolean,
      case when (v_group->>'required')::boolean then 1 else 0 end,
      case when (v_group->>'multiple')::boolean then v_count else 1 end, v_group_order, 'active', null)
    on conflict (id) do update set name = excluded.name, is_required = excluded.is_required,
      min_selections = excluded.min_selections, max_selections = excluded.max_selections,
      display_order = excluded.display_order, status = 'active', archived_at = null;
    v_value_order := 0;
    for v_value in select value from jsonb_array_elements(v_group->'values') loop
      v_value_id := (v_value->>'id')::uuid;
      if v_value_id is null or v_value_id = any(v_value_ids) or v_value_id = any(v_group_ids)
        or char_length(btrim(coalesce(v_value->>'name',''))) not between 1 and 80
        or jsonb_typeof(v_value->'priceDelta') is distinct from 'number'
        or (v_value->>'priceDelta')::numeric <> trunc((v_value->>'priceDelta')::numeric)
        or (v_value->>'priceDelta')::numeric not between 0 and 10000000 then
        raise exception using errcode = '22023', message = 'INVALID_OPTION_VALUE';
      end if;
      if exists (select 1 from public.menu_order_option_values val where val.id = v_value_id
        and (val.menu_site_id <> p_menu_site_id or val.option_group_id <> v_group_id)) then
        raise exception using errcode = '42501', message = 'OPTION_SCOPE_MISMATCH';
      end if;
      v_value_ids := array_append(v_value_ids, v_value_id);
      insert into public.menu_order_option_values
        (id, menu_site_id, option_group_id, name, price_delta, display_order, status, archived_at)
      values (v_value_id, p_menu_site_id, v_group_id, btrim(v_value->>'name'), (v_value->>'priceDelta')::integer, v_value_order, 'active', null)
      on conflict (id) do update set name = excluded.name, price_delta = excluded.price_delta,
        display_order = excluded.display_order, status = 'active', archived_at = null;
      v_value_order := v_value_order + 1;
    end loop;
    update public.menu_order_option_values val set status = 'archived', archived_at = now()
      where val.menu_site_id = p_menu_site_id and val.option_group_id = v_group_id and val.status = 'active' and not (val.id = any(v_value_ids));
    v_group_order := v_group_order + 1;
  end loop;
  update public.menu_order_option_values val set status = 'archived', archived_at = now()
    where val.menu_site_id = p_menu_site_id and val.status = 'active' and val.option_group_id in (
      select g.id from public.menu_order_option_groups g where g.menu_site_id = p_menu_site_id
        and g.menu_item_id = p_menu_item_id and not (g.id = any(v_group_ids))
    );
  update public.menu_order_option_groups g set status = 'archived', archived_at = now()
    where g.menu_site_id = p_menu_site_id and g.menu_item_id = p_menu_item_id and g.status = 'active' and not (g.id = any(v_group_ids));
  update public.menu_items item set orderable = p_orderable, price = p_price
    where item.id = p_menu_item_id and item.menu_site_id = p_menu_site_id returning item.updated_at into v_updated_at;
  return v_updated_at;
end;
$$;
revoke all on function public.replace_menu_item_order_options(uuid,uuid,uuid,timestamptz,boolean,integer,jsonb) from public,anon,authenticated;
grant execute on function public.replace_menu_item_order_options(uuid,uuid,uuid,timestamptz,boolean,integer,jsonb) to service_role;
comment on function public.replace_menu_item_order_options(uuid,uuid,uuid,timestamptz,boolean,integer,jsonb) is
  'Owner-scoped optimistic atomic configuration of orderability, base KRW price and order-only options; service role only. No orders or payments are created.';
commit;
