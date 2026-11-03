-- Additive rollout. Existing rows remain physical tables and retain current channel permissions.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';
alter table public.menu_tables
  add column point_kind text not null default 'table' check (point_kind in ('table','kiosk')),
  add column terminal_order_enabled boolean not null default true,
  add column terminal_call_enabled boolean not null default true,
  add column customer_order_enabled boolean not null default true,
  add column customer_call_enabled boolean not null default true,
  add constraint kiosk_terminal_only check (point_kind <> 'kiosk' or (not customer_order_enabled and not customer_call_enabled));
-- The same number/name can exist once in each section, never twice within one section.
drop index public.menu_tables_active_label_idx;
create unique index menu_tables_active_label_idx on public.menu_tables(menu_site_id,point_kind,lower(label)) where status <> 'archived';

create or replace function private.enforce_menu_table_limit()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_count integer;
begin
  if tg_op='UPDATE' then
    if old.menu_site_id<>new.menu_site_id or old.point_kind<>new.point_kind then
      raise exception using errcode='23514',message='Order point identity cannot change';
    end if;
    if new.status='archived' or old.status<>'archived' then return new; end if;
  elsif new.status='archived' then return new;
  end if;
  perform 1 from public.menu_sites where id=new.menu_site_id for update;
  select count(*) into v_count from public.menu_tables where menu_site_id=new.menu_site_id
    and point_kind=new.point_kind and status<>'archived' and id<>new.id;
  if v_count>=100 then raise exception using errcode='23514',message='menu table limit exceeded'; end if;
  return new;
end; $$;
drop trigger enforce_menu_table_limit on public.menu_tables;
create trigger enforce_menu_table_limit before insert or update of menu_site_id,status,point_kind
  on public.menu_tables for each row execute function private.enforce_menu_table_limit();

-- A kiosk URL never creates a personal-phone visit. Only authenticated registration can issue its terminal session.
create function private.guard_kiosk_visit()
returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.access_channel<>'terminal' and exists(select 1 from public.menu_tables where id=new.menu_table_id
    and menu_site_id=new.menu_site_id and point_kind='kiosk') then
    raise exception using errcode='42501',message='KIOSK_TERMINAL_REQUIRED';
  end if;
  return new;
end; $$;
create trigger guard_kiosk_visit before insert or update of access_channel,menu_table_id,menu_site_id
  on public.table_visit_sessions for each row execute function private.guard_kiosk_visit();

-- Protect all retained RPC versions and direct service-role insert paths, with current saved policy.
create function private.guard_order_point_reception()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_session public.table_visit_sessions%rowtype; v_point public.menu_tables%rowtype;
  v_site public.menu_sites%rowtype; v_order boolean; v_allowed boolean;
begin
  v_order := tg_table_name='menu_customer_orders';
  select * into v_site from public.menu_sites where id=new.menu_site_id for share;
  if not found or v_site.status<>'published' then raise exception using errcode='42501',message='POINT_RECEPTION_UNAVAILABLE'; end if;
  select * into v_point from public.menu_tables where id=new.menu_table_id and menu_site_id=new.menu_site_id for share;
  if not found or v_point.status<>'active' then raise exception using errcode='42501',message='POINT_RECEPTION_UNAVAILABLE'; end if;
  select * into v_session from public.table_visit_sessions where id=new.table_visit_session_id
    and menu_site_id=new.menu_site_id and menu_table_id=new.menu_table_id
    and revoked_at is null and expires_at>pg_catalog.clock_timestamp();
  if not found or (v_point.point_kind='kiosk' and v_session.access_channel<>'terminal') then
    raise exception using errcode='42501',message='POINT_RECEPTION_UNAVAILABLE';
  end if;
  if v_order then
    v_allowed := v_site.settings #> '{table_order,orderEnabled}'='true'::jsonb
      and case when v_session.access_channel='terminal' then v_point.terminal_order_enabled else v_point.customer_order_enabled end;
  else
    v_allowed := v_site.settings #> '{table_order,callEnabled}'='true'::jsonb
      and case when v_session.access_channel='terminal' then v_point.terminal_call_enabled else v_point.customer_call_enabled end;
  end if;
  if v_allowed is distinct from true then raise exception using errcode='42501',message='POINT_RECEPTION_UNAVAILABLE'; end if;
  return new;
end; $$;
create trigger guard_order_point_reception before insert on public.menu_customer_orders
  for each row execute function private.guard_order_point_reception();
create trigger guard_order_point_reception before insert on public.menu_customer_calls
  for each row execute function private.guard_order_point_reception();

revoke all on function private.guard_kiosk_visit(), private.guard_order_point_reception() from public,anon,authenticated;
grant execute on function private.guard_kiosk_visit(), private.guard_order_point_reception() to service_role;
comment on column public.menu_tables.point_kind is 'Immutable physical table or numbered kiosk. Shared FK/session infrastructure; kiosk requires registered terminal access.';
comment on column public.menu_tables.customer_order_enabled is 'Table QR channel policy. Viewing remains available; global publication/order and session guards still apply.';
-- Kiosk guests are independent: identical carts from consecutive guests are new orders.
create or replace function public.submit_postpay_order_v3(
  p_menu_site_id uuid,p_table_visit_session_id uuid,p_client_request_id uuid,
  p_request_text text,p_lines jsonb,p_notification_phone text,p_repeat_order_id uuid
) returns table(order_id uuid,order_number bigint,order_status text,payment_status text,total_amount integer,is_duplicate boolean)
language plpgsql security invoker set search_path = '' as $$
declare s public.table_visit_sessions%rowtype; previous public.menu_customer_orders%rowtype;
  prefs jsonb; signature jsonb; result record;
begin
  select session_row.* into s from public.table_visit_sessions session_row
  join public.menu_tables t on t.id=session_row.menu_table_id and t.menu_site_id=session_row.menu_site_id
  join public.menu_sites m on m.id=session_row.menu_site_id
  where session_row.id=p_table_visit_session_id and session_row.menu_site_id=p_menu_site_id
    and session_row.revoked_at is null and session_row.expires_at>pg_catalog.clock_timestamp()
    and t.status='active' and m.status='published' for update of session_row;
  if not found then raise exception using errcode='42501',message='ORDER_VISIT_INACTIVE'; end if;
  -- Retry the same request safely even when its one-hour ordering window has since ended.
  select o.* into previous from public.menu_customer_orders o
    where o.table_visit_session_id=s.id and o.client_request_id=p_client_request_id and o.menu_site_id=p_menu_site_id;
  if found then
    return query select previous.id,previous.order_number,previous.status,previous.payment_status,previous.total_amount,true;
    return;
  end if;
  if s.access_channel='customer' and coalesce(s.order_expires_at,least(s.expires_at,s.created_at+interval '1 hour'))<=pg_catalog.clock_timestamp() then
    raise exception using errcode='42501',message='ORDER_ACCESS_EXPIRED';
  end if;
  select settings->'table_order' into prefs from public.menu_sites where id=p_menu_site_id;
  if s.access_channel='terminal' and p_notification_phone is not null then
    raise exception using errcode='22023',message='Terminal orders do not collect phone numbers.';
  end if;
  if s.access_channel='customer' then
    if coalesce(prefs->>'customerPhone','required')='hidden' then p_notification_phone:=null; end if;
    if coalesce(prefs->>'customerPhone','required')='required' and p_notification_phone is null then
      raise exception using errcode='22023',message='ORDER_PHONE_REQUIRED';
    end if;
  end if;
  signature:=private.postpay_cart_signature(p_lines);
  select o.* into previous from public.menu_customer_orders o
    where o.table_visit_session_id=s.id and o.menu_site_id=p_menu_site_id and o.status<>'cancelled'
    order by o.order_number desc limit 1;
  if found and previous.order_signature=signature and p_repeat_order_id is distinct from previous.id
    and not exists(select 1 from public.menu_tables where id=s.menu_table_id and menu_site_id=s.menu_site_id and point_kind='kiosk') then
    raise exception using errcode='P0001',message='ORDER_REPEAT_CONFIRM',detail=previous.id::text;
  end if;
  select * into result from public.submit_postpay_order_v2(p_menu_site_id,s.id,p_client_request_id,p_request_text,p_lines);
  update public.menu_customer_orders set notification_phone=p_notification_phone,order_signature=signature where id=result.order_id;
  return query select result.order_id,result.order_number,result.order_status,result.payment_status,result.total_amount,result.is_duplicate;
end;
$$;
notify pgrst, 'reload schema';
commit;
