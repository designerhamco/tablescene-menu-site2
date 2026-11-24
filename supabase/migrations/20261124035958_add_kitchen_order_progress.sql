begin;
set local lock_timeout = '5s';

alter table public.menu_customer_order_items add column cooking_completed_at timestamptz;

-- Item checks and order completion serialize on the same order row. The
-- application checks staff authorization before calling this service-only RPC.
create function public.manage_kitchen_order(
  p_menu_site_id uuid,
  p_order_id uuid,
  p_actor_user_id uuid,
  p_action text,
  p_order_item_id uuid default null,
  p_checked boolean default null
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  current_status text;
  action_time timestamptz;
begin
  if p_action is null or p_action not in ('start', 'check', 'finish')
    or p_menu_site_id is null or p_order_id is null or p_actor_user_id is null
    or (p_action = 'check' and (p_order_item_id is null or p_checked is null))
  then
    raise exception using errcode = '22023', message = 'KITCHEN_INVALID_ACTION';
  end if;

  select order_row.status into current_status
  from public.menu_customer_orders order_row
  where order_row.menu_site_id = p_menu_site_id and order_row.id = p_order_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'KITCHEN_ORDER_NOT_FOUND';
  end if;
  action_time := pg_catalog.clock_timestamp();

  if p_action = 'start' then
    if current_status = 'cooking' then return; end if;
    if current_status not in ('received', 'accepted') then
      raise exception using errcode = '22023', message = 'KITCHEN_STATUS_CHANGED';
    end if;
    update public.menu_customer_orders
    set status = 'cooking', accepted_at = coalesce(accepted_at, action_time),
        cooking_at = action_time, status_updated_by = p_actor_user_id
    where menu_site_id = p_menu_site_id and id = p_order_id;
    return;
  end if;

  if p_action = 'finish' and current_status in ('ready', 'served') then return; end if;
  if current_status <> 'cooking' then
    raise exception using errcode = '22023', message = 'KITCHEN_STATUS_CHANGED';
  end if;

  if p_action = 'check' then
    update public.menu_customer_order_items
    set cooking_completed_at = case when p_checked then coalesce(cooking_completed_at, action_time) end
    where menu_site_id = p_menu_site_id and order_id = p_order_id and id = p_order_item_id;
    if not found then
      raise exception using errcode = 'P0002', message = 'KITCHEN_ITEM_NOT_FOUND';
    end if;
    return;
  end if;

  if not exists (
    select 1 from public.menu_customer_order_items
    where menu_site_id = p_menu_site_id and order_id = p_order_id
  ) or exists (
    select 1 from public.menu_customer_order_items
    where menu_site_id = p_menu_site_id and order_id = p_order_id and cooking_completed_at is null
  ) then
    raise exception using errcode = '22023', message = 'KITCHEN_ITEMS_INCOMPLETE';
  end if;

  update public.menu_customer_orders
  set status = 'ready', ready_at = action_time, status_updated_by = p_actor_user_id
  where menu_site_id = p_menu_site_id and id = p_order_id;
end;
$$;

revoke all on function public.manage_kitchen_order(uuid,uuid,uuid,text,uuid,boolean) from public, anon, authenticated;
grant execute on function public.manage_kitchen_order(uuid,uuid,uuid,text,uuid,boolean) to service_role;

-- Only the signed-in recipient can subscribe to their topic. Signals contain
-- a menu-site ID to invalidate and carry no order, customer or payment details.
create policy "Read own ArtiMenu order refresh signals"
on realtime.messages for select to authenticated
using (
  extension = 'broadcast'
  and topic = (select realtime.topic())
  and (select realtime.topic()) = 'artimenu-orders:' || (select auth.uid())::text
);

create function private.broadcast_artimenu_order_refresh()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare recipient uuid;
begin
  if tg_op = 'UPDATE' then
    if tg_table_name = 'menu_customer_orders' then
      if old.status is not distinct from new.status and old.payment_status is not distinct from new.payment_status then
        return new;
      end if;
    elsif old.cooking_completed_at is not distinct from new.cooking_completed_at then
      return new;
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
        pg_catalog.jsonb_build_object('menuSiteId', new.menu_site_id),
        'orders-changed', 'artimenu-orders:' || recipient::text, true
      );
    exception when others then
      -- Ordering remains available during an outage of the notification service.
      raise log 'ArtiMenu order refresh signal unavailable (SQLSTATE %)', sqlstate;
    end;
  end loop;
  return new;
end;
$$;

revoke all on function private.broadcast_artimenu_order_refresh() from public, anon, authenticated;
grant execute on function private.broadcast_artimenu_order_refresh() to service_role;

create trigger broadcast_artimenu_order_refresh
after insert or update of status, payment_status on public.menu_customer_orders
for each row execute function private.broadcast_artimenu_order_refresh();

create trigger broadcast_artimenu_cooking_check
after update of cooking_completed_at on public.menu_customer_order_items
for each row execute function private.broadcast_artimenu_order_refresh();

notify pgrst, 'reload schema';
commit;
