begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create or replace function public.submit_postpay_order(
  p_menu_site_id uuid,
  p_table_visit_session_id uuid,
  p_client_request_id uuid,
  p_request_text text,
  p_lines jsonb
)
returns table (
  order_id uuid,
  order_number bigint,
  order_status text,
  payment_status text,
  total_amount integer,
  is_duplicate boolean
)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_existing public.menu_customer_orders%rowtype;
  v_session public.table_visit_sessions%rowtype;
  v_order public.menu_customer_orders%rowtype;
  v_order_item_id uuid;
  v_line jsonb;
  v_line_number bigint;
  v_menu_item_id uuid;
  v_quantity integer;
  v_item_name text;
  v_base_price integer;
  v_option_json jsonb;
  v_option_ids uuid[];
  v_option_count integer;
  v_distinct_option_count integer;
  v_resolved_option_count integer;
  v_option_price integer;
  v_unit_price integer;
  v_line_total integer;
  v_subtotal bigint := 0;
begin
  if p_menu_site_id is null or p_table_visit_session_id is null or p_client_request_id is null then
    raise exception using errcode = '22023', message = 'Missing order identity.';
  end if;

  if p_request_text is not null and (
    p_request_text <> btrim(p_request_text)
    or char_length(p_request_text) not between 1 and 300
  ) then
    raise exception using errcode = '22023', message = 'Invalid order request.';
  end if;

  if p_lines is null
    or jsonb_typeof(p_lines) <> 'array'
    or jsonb_array_length(p_lines) not between 1 and 20
  then
    raise exception using errcode = '22023', message = 'An order must contain between 1 and 20 lines.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_table_visit_session_id::text || ':' || p_client_request_id::text, 0)
  );

  select existing_order.*
    into v_existing
  from public.menu_customer_orders as existing_order
  where existing_order.table_visit_session_id = p_table_visit_session_id
    and existing_order.client_request_id = p_client_request_id;

  if found then
    return query
      select
        v_existing.id,
        v_existing.order_number,
        v_existing.status,
        v_existing.payment_status,
        v_existing.total_amount,
        true;
    return;
  end if;

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

  insert into public.menu_customer_orders (
    menu_site_id,
    menu_table_id,
    table_visit_session_id,
    client_request_id,
    request_text,
    subtotal_amount,
    total_amount
  ) values (
    p_menu_site_id,
    v_session.menu_table_id,
    p_table_visit_session_id,
    p_client_request_id,
    p_request_text,
    0,
    0
  )
  returning * into v_order;

  for v_line, v_line_number in
    select line.value, line.ordinality
    from pg_catalog.jsonb_array_elements(p_lines) with ordinality as line(value, ordinality)
  loop
    if pg_catalog.jsonb_typeof(v_line) <> 'object'
      or pg_catalog.jsonb_typeof(v_line -> 'quantity') <> 'number'
      or coalesce(v_line ->> 'quantity', '') !~ '^[0-9]+$'
      or coalesce(v_line ->> 'menuItemId', '') = ''
    then
      raise exception using errcode = '22023', message = 'Invalid order line.';
    end if;

    begin
      v_menu_item_id := (v_line ->> 'menuItemId')::uuid;
      v_quantity := (v_line ->> 'quantity')::integer;
    exception
      when invalid_text_representation or numeric_value_out_of_range then
        raise exception using errcode = '22023', message = 'Invalid order line identity or quantity.';
    end;

    if v_quantity not between 1 and 20 then
      raise exception using errcode = '22023', message = 'Order line quantity must be between 1 and 20.';
    end if;

    v_option_json := coalesce(v_line -> 'optionValueIds', '[]'::jsonb);
    if pg_catalog.jsonb_typeof(v_option_json) <> 'array'
      or pg_catalog.jsonb_array_length(v_option_json) > 20
    then
      raise exception using errcode = '22023', message = 'Invalid order option selection.';
    end if;

    begin
      select
        coalesce(pg_catalog.array_agg(option_id.value::uuid order by option_id.ordinality), '{}'::uuid[]),
        count(*)::integer,
        count(distinct option_id.value)::integer
        into v_option_ids, v_option_count, v_distinct_option_count
      from pg_catalog.jsonb_array_elements_text(v_option_json) with ordinality as option_id(value, ordinality);
    exception
      when invalid_text_representation then
        raise exception using errcode = '22023', message = 'Invalid order option identity.';
    end;

    if v_option_count <> v_distinct_option_count then
      raise exception using errcode = '22023', message = 'Duplicate order options are not allowed.';
    end if;

    select item.name, item.price
      into v_item_name, v_base_price
    from public.menu_items as item
    where item.id = v_menu_item_id
      and item.menu_site_id = p_menu_site_id
      and item.visible = true
      and item.price_visible = true
      and item.orderable = true
      and item.is_sold_out = false;

    if not found then
      raise exception using errcode = '22023', message = 'A selected menu item is not orderable.';
    end if;

    select count(*)::integer, coalesce(sum(option_value.price_delta), 0)::integer
      into v_resolved_option_count, v_option_price
    from public.menu_order_option_values as option_value
    join public.menu_order_option_groups as option_group
      on option_group.menu_site_id = option_value.menu_site_id
     and option_group.id = option_value.option_group_id
    where option_value.id = any(v_option_ids)
      and option_value.menu_site_id = p_menu_site_id
      and option_value.status = 'active'
      and option_group.status = 'active'
      and option_group.menu_item_id = v_menu_item_id;

    if v_resolved_option_count <> v_option_count then
      raise exception using errcode = '22023', message = 'A selected order option is not available.';
    end if;

    if exists (
      select 1
      from public.menu_order_option_groups as option_group
      left join (
        select option_value.option_group_id, count(*)::integer as selected_count
        from public.menu_order_option_values as option_value
        where option_value.id = any(v_option_ids)
        group by option_value.option_group_id
      ) as selection on selection.option_group_id = option_group.id
      where option_group.menu_site_id = p_menu_site_id
        and option_group.menu_item_id = v_menu_item_id
        and option_group.status = 'active'
        and (
          (option_group.is_required and coalesce(selection.selected_count, 0) < option_group.min_selections)
          or (
            coalesce(selection.selected_count, 0) > 0
            and coalesce(selection.selected_count, 0) < option_group.min_selections
          )
          or coalesce(selection.selected_count, 0) > option_group.max_selections
        )
    ) then
      raise exception using errcode = '22023', message = 'Order option selection limits are not satisfied.';
    end if;

    v_unit_price := v_base_price + v_option_price;
    v_line_total := v_unit_price * v_quantity;
    v_subtotal := v_subtotal + v_line_total;

    insert into public.menu_customer_order_items (
      menu_site_id,
      order_id,
      menu_item_id,
      item_name_snapshot,
      base_price_snapshot,
      option_price_snapshot,
      unit_price_snapshot,
      quantity,
      line_total_snapshot,
      display_order
    ) values (
      p_menu_site_id,
      v_order.id,
      v_menu_item_id,
      v_item_name,
      v_base_price,
      v_option_price,
      v_unit_price,
      v_quantity,
      v_line_total,
      (v_line_number - 1)::integer
    )
    returning id into v_order_item_id;

    insert into public.menu_customer_order_item_options (
      menu_site_id,
      order_item_id,
      option_group_id,
      option_value_id,
      group_name_snapshot,
      value_name_snapshot,
      price_delta_snapshot,
      display_order
    )
    select
      p_menu_site_id,
      v_order_item_id,
      option_group.id,
      option_value.id,
      option_group.name,
      option_value.name,
      option_value.price_delta,
      (selected_option.ordinality - 1)::integer
    from pg_catalog.unnest(v_option_ids) with ordinality as selected_option(id, ordinality)
    join public.menu_order_option_values as option_value on option_value.id = selected_option.id
    join public.menu_order_option_groups as option_group on option_group.id = option_value.option_group_id;
  end loop;

  if v_subtotal not between 0 and 100000000 then
    raise exception using errcode = '22023', message = 'Order amount exceeds the allowed limit.';
  end if;

  update public.menu_customer_orders
  set subtotal_amount = v_subtotal::integer,
      total_amount = v_subtotal::integer
  where id = v_order.id
  returning * into v_order;

  return query
    select
      v_order.id,
      v_order.order_number,
      v_order.status,
      v_order.payment_status,
      v_order.total_amount,
      false;
end;
$$;

revoke all on function public.submit_postpay_order(uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated;
grant execute on function public.submit_postpay_order(uuid, uuid, uuid, text, jsonb)
  to service_role;

comment on function public.submit_postpay_order(uuid, uuid, uuid, text, jsonb) is
  'Atomically validates an active table session, snapshots current orderable menu data, and creates an idempotent postpay order. Service-role only.';

commit;
