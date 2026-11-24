begin;
set local lock_timeout = '5s';

-- A floor assignment is independent of the original table/session FK used by guest history.
alter table public.menu_customer_orders
  add column service_table_id uuid,
  add constraint menu_customer_orders_service_table_fk
    foreign key (menu_site_id, service_table_id) references public.menu_tables(menu_site_id, id) on delete restrict;

create index menu_customer_orders_service_table_idx
  on public.menu_customer_orders (menu_site_id, service_table_id)
  where service_table_id is not null;

create table public.menu_order_table_transfers (
  menu_site_id uuid not null references public.menu_sites(id) on delete restrict,
  request_id uuid not null,
  source_table_id uuid not null,
  destination_table_id uuid not null,
  order_ids uuid[] not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (menu_site_id, request_id)
);
alter table public.menu_order_table_transfers enable row level security;
revoke all on table public.menu_order_table_transfers from public, anon, authenticated, service_role;
grant select, insert on table public.menu_order_table_transfers to service_role;

create function public.move_table_orders(
  p_menu_site_id uuid,
  p_source_table_id uuid,
  p_destination_table_id uuid,
  p_order_ids uuid[],
  p_request_id uuid,
  p_actor_user_id uuid
)
returns integer
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_expected uuid[];
  v_current uuid[];
  v_all_unpaid boolean;
  v_previous public.menu_order_table_transfers%rowtype;
  v_points integer;
  v_moved integer;
begin
  if p_menu_site_id is null or p_source_table_id is null or p_destination_table_id is null
    or p_source_table_id = p_destination_table_id or p_request_id is null or p_actor_user_id is null
    or coalesce(pg_catalog.cardinality(p_order_ids), 0) = 0
    or pg_catalog.array_position(p_order_ids, null) is not null
  then
    raise exception using errcode = '22023', message = 'ORDER_MOVE_INPUT';
  end if;

  select pg_catalog.array_agg(distinct id order by id)
    into v_expected from pg_catalog.unnest(p_order_ids) as expected(id);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('table-order-move:' || p_menu_site_id::text || ':' || p_request_id::text, 0)
  );
  select * into v_previous from public.menu_order_table_transfers
    where menu_site_id = p_menu_site_id and request_id = p_request_id;
  if found then
    if v_previous.source_table_id <> p_source_table_id or v_previous.destination_table_id <> p_destination_table_id
      or v_previous.order_ids is distinct from v_expected then
      raise exception using errcode = '22023', message = 'ORDER_MOVE_INPUT';
    end if;
    return pg_catalog.cardinality(v_previous.order_ids);
  end if;

  -- FK key-share locks from new orders/new visits cannot pass these locks while the move is validated.
  perform id from public.menu_tables
    where menu_site_id = p_menu_site_id and id in (p_source_table_id, p_destination_table_id)
      and status = 'active' and point_kind = 'table'
    order by id for update;
  get diagnostics v_points = row_count;
  if v_points <> 2 then
    raise exception using errcode = 'P0001', message = 'ORDER_MOVE_TABLE_UNAVAILABLE';
  end if;

  select pg_catalog.array_agg(o.id order by o.id), pg_catalog.bool_and(o.payment_status = 'unpaid')
    into v_current, v_all_unpaid
    from (
      select id, payment_status from public.menu_customer_orders
        where menu_site_id = p_menu_site_id and (service_table_id = p_source_table_id
          or (service_table_id is null and menu_table_id = p_source_table_id))
          and status <> 'cancelled' and (status <> 'served' or payment_status = 'unpaid')
        order by id for update
    ) o;
  if v_current is distinct from v_expected or v_all_unpaid is not true then
    raise exception using errcode = 'P0001', message = 'ORDER_MOVE_SOURCE_CHANGED';
  end if;

  if exists (
    select 1 from public.menu_customer_orders
      where menu_site_id = p_menu_site_id and (service_table_id = p_destination_table_id
        or (service_table_id is null and menu_table_id = p_destination_table_id))
        and status <> 'cancelled' and (status <> 'served' or payment_status = 'unpaid')
  ) or exists (
    -- An open guest visit without a settled or cancelled order may be about to submit its first order.
    select 1 from public.table_visit_sessions s
      where s.menu_site_id = p_menu_site_id and s.menu_table_id = p_destination_table_id
        and not exists (
          select 1 from public.menu_customer_orders moving
            where moving.menu_site_id = p_menu_site_id and moving.id = any(v_expected)
              and moving.table_visit_session_id = s.id
        )
        and s.access_channel = 'customer' and s.revoked_at is null
        and least(s.expires_at, coalesce(s.order_expires_at, s.created_at + interval '1 hour')) > pg_catalog.clock_timestamp()
        and not exists (
          select 1 from public.menu_customer_orders visit_order
            where visit_order.menu_site_id = p_menu_site_id and visit_order.table_visit_session_id = s.id
              and (visit_order.status = 'cancelled' or (visit_order.status = 'served' and visit_order.payment_status <> 'unpaid'))
        )
  ) then
    raise exception using errcode = 'P0001', message = 'ORDER_MOVE_DESTINATION_OCCUPIED';
  end if;

  update public.menu_customer_orders
    set service_table_id = nullif(p_destination_table_id, menu_table_id)
    where menu_site_id = p_menu_site_id and id = any(v_expected);
  get diagnostics v_moved = row_count;

  insert into public.menu_order_table_transfers
    (menu_site_id, request_id, source_table_id, destination_table_id, order_ids, actor_user_id)
    values (p_menu_site_id, p_request_id, p_source_table_id, p_destination_table_id, v_expected, p_actor_user_id);
  return v_moved;
end;
$$;

revoke all on function public.move_table_orders(uuid, uuid, uuid, uuid[], uuid, uuid) from public, anon, authenticated;
grant execute on function public.move_table_orders(uuid, uuid, uuid, uuid[], uuid, uuid) to service_role;

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
        and old.service_table_id is not distinct from new.service_table_id then
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
