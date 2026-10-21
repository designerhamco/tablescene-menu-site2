-- Additive server-only RPCs. No existing orders, payments, sessions or settings are changed.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create function public.list_visit_customer_orders(p_menu_site_id uuid, p_table_visit_session_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_table_id uuid;
  v_table_label text;
  v_orders jsonb;
  v_more boolean;
begin
  select session_row.menu_table_id, table_row.label into v_table_id, v_table_label
    from public.table_visit_sessions as session_row
    join public.menu_tables as table_row on table_row.menu_site_id = session_row.menu_site_id and table_row.id = session_row.menu_table_id
    join public.menu_sites as site_row on site_row.id = session_row.menu_site_id
    where session_row.id = p_table_visit_session_id and session_row.menu_site_id = p_menu_site_id
      and session_row.revoked_at is null and session_row.expires_at > pg_catalog.clock_timestamp()
      and table_row.status = 'active' and site_row.status = 'published';
  if not found then
    raise exception using errcode = '42501', message = 'ORDER_VISIT_INACTIVE';
  end if;

  -- The existing session index bounds this lookup to one visit. Snapshots are never joined to current menu prices/names.
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
    'id', order_row.id, 'orderNumber', order_row.order_number, 'tableLabel', v_table_label,
    'createdAt', order_row.created_at, 'status', order_row.status, 'paymentStatus', order_row.payment_status,
    'totalAmount', order_row.total_amount,
    'lines', coalesce((select pg_catalog.jsonb_agg(pg_catalog.jsonb_build_object(
      'name', line.item_name_snapshot, 'quantity', line.quantity, 'unitPrice', line.unit_price_snapshot,
      'options', coalesce((select pg_catalog.jsonb_agg(option_row.group_name_snapshot || ': ' || option_row.value_name_snapshot order by option_row.display_order, option_row.id)
        from public.menu_customer_order_item_options as option_row
        where option_row.menu_site_id = p_menu_site_id and option_row.order_item_id = line.id), '[]'::jsonb)
    ) order by line.display_order, line.id) from public.menu_customer_order_items as line
      where line.menu_site_id = p_menu_site_id and line.order_id = order_row.id), '[]'::jsonb)
  ) order by order_row.order_number desc), '[]'::jsonb) into v_orders
  from (select customer_order.id, customer_order.order_number, customer_order.created_at, customer_order.status, customer_order.payment_status, customer_order.total_amount
    from public.menu_customer_orders as customer_order
    where customer_order.menu_site_id = p_menu_site_id and customer_order.table_visit_session_id = p_table_visit_session_id
      and customer_order.menu_table_id = v_table_id
    order by customer_order.order_number desc limit 101) as order_row;
  v_more := pg_catalog.jsonb_array_length(v_orders) > 100;
  if v_more then v_orders := v_orders - 100; end if;
  return pg_catalog.jsonb_build_object('orders', v_orders, 'hasMore', v_more);
end;
$$;

create function public.cancel_visit_customer_order(p_menu_site_id uuid, p_table_visit_session_id uuid, p_order_id uuid)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_table_id uuid;
  v_order public.menu_customer_orders%rowtype;
  v_expires_at timestamptz;
begin
  select session_row.menu_table_id into v_table_id from public.table_visit_sessions as session_row
    where session_row.id = p_table_visit_session_id and session_row.menu_site_id = p_menu_site_id;
  if not found then raise exception using errcode = '42501', message = 'ORDER_VISIT_INACTIVE'; end if;

  -- Table -> visit -> order: QR rotation/disable holds the table before revoking visits.
  perform 1 from public.menu_tables as table_row join public.menu_sites as site_row on site_row.id = table_row.menu_site_id
    where table_row.id = v_table_id and table_row.menu_site_id = p_menu_site_id
      and table_row.status = 'active' and site_row.status = 'published'
    for share of table_row;
  if not found then raise exception using errcode = '42501', message = 'ORDER_VISIT_INACTIVE'; end if;
  select session_row.expires_at into v_expires_at from public.table_visit_sessions as session_row
    where session_row.id = p_table_visit_session_id and session_row.menu_site_id = p_menu_site_id
      and session_row.menu_table_id = v_table_id and session_row.revoked_at is null
      and session_row.expires_at > pg_catalog.clock_timestamp()
    for update of session_row;
  if not found then raise exception using errcode = '42501', message = 'ORDER_VISIT_INACTIVE'; end if;

  select customer_order.* into v_order from public.menu_customer_orders as customer_order
    where customer_order.id = p_order_id and customer_order.menu_site_id = p_menu_site_id
      and customer_order.menu_table_id = v_table_id and customer_order.table_visit_session_id = p_table_visit_session_id
    for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_VISIT_NOT_FOUND'; end if;
  if v_expires_at <= pg_catalog.clock_timestamp() then raise exception using errcode = '42501', message = 'ORDER_VISIT_INACTIVE'; end if;
  if v_order.status = 'cancelled' then
    return pg_catalog.jsonb_build_object('id', v_order.id, 'status', 'cancelled');
  end if;
  if v_order.status <> 'received' or v_order.payment_status <> 'unpaid' then
    raise exception using errcode = 'P0001', message = 'ORDER_VISIT_NOT_CANCELLABLE';
  end if;
  update public.menu_customer_orders as customer_order
    set status = 'cancelled', cancelled_at = pg_catalog.clock_timestamp(), cancellation_reason = '고객 요청', status_updated_by = null
    where customer_order.id = v_order.id and customer_order.menu_site_id = p_menu_site_id
      and customer_order.table_visit_session_id = p_table_visit_session_id
      and customer_order.status = 'received' and customer_order.payment_status = 'unpaid';
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_VISIT_NOT_CANCELLABLE'; end if;
  return pg_catalog.jsonb_build_object('id', v_order.id, 'status', 'cancelled');
end;
$$;

revoke all on function public.list_visit_customer_orders(uuid, uuid) from public, anon, authenticated;
revoke all on function public.cancel_visit_customer_order(uuid, uuid, uuid) from public, anon, authenticated;
grant execute on function public.list_visit_customer_orders(uuid, uuid) to service_role;
grant execute on function public.cancel_visit_customer_order(uuid, uuid, uuid) to service_role;
comment on function public.list_visit_customer_orders(uuid, uuid) is 'Server-only current-visit history from immutable order snapshots; no other table or visit is exposed.';
comment on function public.cancel_visit_customer_order(uuid, uuid, uuid) is 'Server-only atomic customer cancellation before staff acceptance and payment, with active-visit revalidation.';
commit;
