begin;
set local lock_timeout = '5s';

create function private.assert_floor_reception_paused(p_menu_site_id uuid)
returns void language plpgsql security invoker set search_path = '' as $$
declare v_settings jsonb;
begin
  select settings into v_settings from public.menu_sites where id = p_menu_site_id for share;
  if not found or v_settings #> '{table_order,orderEnabled}' = 'true'::jsonb then
    raise exception using errcode = 'P0001', message = 'FLOOR_RECEPTION_ACTIVE';
  end if;
end;
$$;

create function private.guard_floor_layout_write()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if tg_table_name = 'menu_floor_plans' or tg_op = 'INSERT' then
    perform private.assert_floor_reception_paused(new.menu_site_id);
  elsif old.label is distinct from new.label
    or (old.status is distinct from new.status and ('archived' in (old.status, new.status))) then
    -- Order/call switches, reconnection and ordinary status updates do not change the layout.
    perform private.assert_floor_reception_paused(new.menu_site_id);
    if new.status = 'archived' and old.status <> 'archived' and (
      exists (
        select 1 from public.menu_customer_orders o where o.menu_site_id = new.menu_site_id
          and (o.menu_table_id = new.id or o.service_table_id = new.id)
          and o.status <> 'cancelled' and (o.status <> 'served' or o.payment_status = 'unpaid')
      ) or exists (
        select 1 from public.menu_order_settlement_groups g where g.menu_site_id = new.menu_site_id
          and g.closed_at is null and new.id = any(g.table_ids)
      )
    ) then
      raise exception using errcode = 'P0001', message = 'FLOOR_POINT_HAS_OPEN_ORDERS';
    end if;
  end if;
  return new;
end;
$$;

create trigger guard_floor_layout_reception before insert or update on public.menu_floor_plans
  for each row execute function private.guard_floor_layout_write();
create trigger guard_floor_point_reception before insert or update of label, status on public.menu_tables
  for each row execute function private.guard_floor_layout_write();

create function public.archive_floor_points(p_menu_site_id uuid, p_point_ids uuid[], p_actor_user_id uuid)
returns integer language plpgsql security invoker set search_path = '' as $$
declare v_ids uuid[]; v_count integer;
begin
  if p_actor_user_id is null or coalesce(cardinality(p_point_ids), 0) not between 1 and 200 then
    raise exception using errcode = '22023', message = 'FLOOR_ARCHIVE_SELECTION';
  end if;
  select array_agg(distinct id order by id) into v_ids from unnest(p_point_ids) as ids(id);
  perform private.assert_floor_reception_paused(p_menu_site_id);
  perform id from public.menu_tables
    where menu_site_id = p_menu_site_id and id = any(v_ids) and status in ('active', 'disabled')
    order by id for update;
  get diagnostics v_count = row_count;
  if v_count <> cardinality(v_ids) then
    raise exception using errcode = 'P0001', message = 'FLOOR_ARCHIVE_SELECTION';
  end if;
  update public.menu_tables set status = 'archived', archived_at = statement_timestamp(), updated_by = p_actor_user_id
    where menu_site_id = p_menu_site_id and id = any(v_ids);
  return v_count;
end;
$$;

revoke all on function private.assert_floor_reception_paused(uuid), private.guard_floor_layout_write(),
  public.archive_floor_points(uuid, uuid[], uuid) from public, anon, authenticated;
grant execute on function private.assert_floor_reception_paused(uuid), private.guard_floor_layout_write(),
  public.archive_floor_points(uuid, uuid[], uuid) to service_role;

notify pgrst, 'reload schema';
commit;
