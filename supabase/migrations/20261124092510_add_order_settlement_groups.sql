begin;
set local lock_timeout = '5s';

create table public.menu_order_settlement_groups (
  id uuid primary key,
  menu_site_id uuid not null references public.menu_sites(id) on delete restrict,
  table_ids uuid[] not null check (cardinality(table_ids) >= 2),
  order_ids uuid[] not null check (cardinality(order_ids) >= 2),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz,
  closed_action text check (closed_action in ('release', 'pay')),
  close_request_id uuid,
  unique (menu_site_id, id),
  check ((closed_at is null and closed_action is null and close_request_id is null)
    or (closed_at is not null and closed_action is not null and close_request_id is not null))
);
alter table public.menu_order_settlement_groups enable row level security;
revoke all on public.menu_order_settlement_groups from public, anon, authenticated, service_role;
grant select, insert, update on public.menu_order_settlement_groups to service_role;
create index menu_order_settlement_groups_open_idx
  on public.menu_order_settlement_groups (menu_site_id, created_at, id) where closed_at is null;

alter table public.menu_customer_orders
  add column settlement_group_id uuid,
  add constraint menu_customer_orders_settlement_group_fk
    foreign key (menu_site_id, settlement_group_id) references public.menu_order_settlement_groups(menu_site_id, id);
create index menu_customer_orders_settlement_group_idx
  on public.menu_customer_orders (menu_site_id, settlement_group_id) where settlement_group_id is not null;

create function public.manage_order_settlement_group(
  p_menu_site_id uuid, p_actor_user_id uuid, p_action text, p_request_id uuid,
  p_group_id uuid, p_table_ids uuid[], p_order_ids uuid[], p_expected_total bigint, p_payment_method text
)
returns integer language plpgsql security invoker set search_path = '' as $$
declare
  v_group public.menu_order_settlement_groups%rowtype;
  v_tables uuid[];
  v_expected uuid[];
  v_orders uuid[];
  v_eligible boolean;
  v_total bigint;
  v_count integer;
  v_now timestamptz;
begin
  if p_menu_site_id is null or p_actor_user_id is null or p_request_id is null
    or p_action is null or p_action not in ('combine', 'release', 'pay') then
    raise exception using errcode = '22023', message = 'ORDER_GROUP_INPUT';
  end if;
  select array_agg(distinct id order by id) into v_expected from unnest(p_order_ids) as input(id);
  if p_action = 'combine' then
    select array_agg(distinct id order by id) into v_tables from unnest(p_table_ids) as input(id);
    if coalesce(cardinality(v_tables), 0) < 2 or coalesce(cardinality(v_expected), 0) < 2 then
      raise exception using errcode = '22023', message = 'ORDER_GROUP_INPUT';
    end if;
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('settlement-group:' || p_request_id::text, 0));
    select * into v_group from public.menu_order_settlement_groups
      where id = p_request_id and menu_site_id = p_menu_site_id;
    if found then
      if v_group.table_ids is distinct from v_tables or v_group.order_ids is distinct from v_expected then
        raise exception using errcode = '22023', message = 'ORDER_GROUP_INPUT';
      end if;
      return cardinality(v_group.order_ids);
    end if;
    perform id from public.menu_tables
      where menu_site_id = p_menu_site_id and id = any(v_tables) and status = 'active' and point_kind = 'table'
      order by id for update;
    get diagnostics v_count = row_count;
    if v_count <> cardinality(v_tables) or exists (
      select 1 from public.menu_order_settlement_groups
        where menu_site_id = p_menu_site_id and closed_at is null and table_ids && v_tables
    ) then
      raise exception using errcode = 'P0001', message = 'ORDER_GROUP_TABLE_CHANGED';
    end if;
    select array_agg(o.id order by o.id),
      bool_and(o.payment_status = 'unpaid' and o.settlement_group_id is null),
      count(distinct o.point_id)::integer
    into v_orders, v_eligible, v_count
    from (
      select id, payment_status, settlement_group_id, coalesce(service_table_id, menu_table_id) as point_id
        from public.menu_customer_orders
        where menu_site_id = p_menu_site_id and (service_table_id = any(v_tables)
          or (service_table_id is null and menu_table_id = any(v_tables)))
          and status <> 'cancelled' and (status <> 'served' or payment_status = 'unpaid')
        order by id for update
    ) o;
    if v_orders is distinct from v_expected or v_eligible is not true or v_count <> cardinality(v_tables) then
      raise exception using errcode = 'P0001', message = 'ORDER_GROUP_ORDERS_CHANGED';
    end if;
    insert into public.menu_order_settlement_groups (id, menu_site_id, table_ids, order_ids, created_by)
      values (p_request_id, p_menu_site_id, v_tables, v_orders, p_actor_user_id);
    update public.menu_customer_orders set settlement_group_id = p_request_id
      where menu_site_id = p_menu_site_id and id = any(v_orders);
    return cardinality(v_orders);
  end if;

  select * into v_group from public.menu_order_settlement_groups
    where id = p_group_id and menu_site_id = p_menu_site_id for update;
  if not found then raise exception using errcode = 'P0001', message = 'ORDER_GROUP_TABLE_CHANGED'; end if;
  if v_group.closed_at is not null then
    if v_group.close_request_id = p_request_id and v_group.closed_action = p_action then
      return case when p_action = 'pay' then cardinality(v_expected) else cardinality(v_group.order_ids) end;
    end if;
    raise exception using errcode = 'P0001', message = 'ORDER_GROUP_TABLE_CHANGED';
  end if;

  select array_agg(o.id order by o.id) filter (where o.status <> 'cancelled'),
    bool_and(o.payment_status = 'unpaid' and (p_action = 'release' or o.status = 'served'))
      filter (where o.status <> 'cancelled'),
    sum(o.total_amount) filter (where o.status <> 'cancelled')
  into v_orders, v_eligible, v_total
  from (
    select id, status, payment_status, total_amount from public.menu_customer_orders
      where menu_site_id = p_menu_site_id and settlement_group_id = p_group_id order by id for update
  ) o;

  v_now := pg_catalog.clock_timestamp();
  if p_action = 'pay' then
    if v_orders is null or v_orders is distinct from v_expected or v_eligible is not true
      or v_total is distinct from p_expected_total or p_payment_method is null
      or p_payment_method not in ('manual_card', 'manual_cash') then
      raise exception using errcode = 'P0001', message = 'ORDER_GROUP_PAY_CHANGED';
    end if;
    update public.menu_customer_orders set payment_status = 'manual_paid', payment_method = p_payment_method,
      payment_completed_at = v_now, payment_completed_by = p_actor_user_id
      where menu_site_id = p_menu_site_id and settlement_group_id = p_group_id and id = any(v_orders);
    v_count := cardinality(v_orders);
  else
    if v_eligible is false then
      raise exception using errcode = 'P0001', message = 'ORDER_GROUP_PAY_CHANGED';
    end if;
    update public.menu_customer_orders set settlement_group_id = null
      where menu_site_id = p_menu_site_id and settlement_group_id = p_group_id;
    v_count := cardinality(v_group.order_ids);
  end if;

  update public.menu_order_settlement_groups set closed_at = v_now, closed_action = p_action, close_request_id = p_request_id
    where id = p_group_id and menu_site_id = p_menu_site_id;
  return v_count;
end;
$$;

revoke all on function public.manage_order_settlement_group(uuid, uuid, text, uuid, uuid, uuid[], uuid[], bigint, text)
  from public, anon, authenticated;
grant execute on function public.manage_order_settlement_group(uuid, uuid, text, uuid, uuid, uuid[], uuid[], bigint, text)
  to service_role;

create function private.reject_grouped_order_move()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if old.service_table_id is distinct from new.service_table_id and exists (
    select 1 from public.menu_order_settlement_groups g
      where g.menu_site_id = old.menu_site_id and g.closed_at is null
        and g.table_ids && array[coalesce(old.service_table_id, old.menu_table_id), coalesce(new.service_table_id, new.menu_table_id)]
  ) then
    raise exception using errcode = 'P0001', message = 'ORDER_MOVE_GROUPED';
  end if;
  return new;
end;
$$;
revoke all on function private.reject_grouped_order_move() from public, anon, authenticated;
grant execute on function private.reject_grouped_order_move() to service_role;
create trigger reject_grouped_order_move before update of service_table_id on public.menu_customer_orders
  for each row execute function private.reject_grouped_order_move();

create or replace function private.broadcast_artimenu_order_refresh()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  recipient uuid;
  payload jsonb := pg_catalog.jsonb_build_object('menuSiteId', new.menu_site_id);
begin
  if tg_op = 'UPDATE' then
    if tg_table_name = 'menu_customer_orders' then
      if old.status is not distinct from new.status and old.payment_status is not distinct from new.payment_status
        and old.service_table_id is not distinct from new.service_table_id
        and old.settlement_group_id is not distinct from new.settlement_group_id then
        return new;
      end if;
      if old.status is distinct from new.status then
        payload := payload || pg_catalog.jsonb_build_object('orderUpdate', pg_catalog.jsonb_build_object(
          'orderId', new.id, 'status', new.status, 'updatedAt', new.updated_at
        ));
      end if;
    else
      if old.cooking_completed_at is not distinct from new.cooking_completed_at then return new; end if;
      payload := payload || pg_catalog.jsonb_build_object('itemProgress', true);
    end if;
  end if;

  for recipient in
    select site.user_id from public.menu_sites site where site.id = new.menu_site_id
    union
    select member.user_id from public.menu_site_members member
    where member.menu_site_id = new.menu_site_id and member.status = 'active' and member.revoked_at is null
      and (member.role in ('manager', 'order_staff')
        or coalesce(member.permission_overrides -> 'allow' ? 'order.read', false))
      and not coalesce(member.permission_overrides -> 'deny' ? 'order.read', false)
  loop
    begin
      perform realtime.send(
        payload, 'orders-changed', 'artimenu-orders:' || recipient::text, true
      );
    exception when others then
      -- Ordering remains available during an outage of the notification service.
      raise log 'ArtiMenu order refresh signal unavailable (SQLSTATE %)', sqlstate;
    end;
  end loop;
  return new;
end;
$$;

notify pgrst, 'reload schema';
commit;
