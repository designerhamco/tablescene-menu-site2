-- Additive: no order/payment deletion, no capability/allowlist activation, no PG or messaging calls.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.table_visit_sessions
  add column access_channel text not null default 'customer'
    check (access_channel in ('customer','terminal')),
  add column order_expires_at timestamptz;
alter table public.table_visit_sessions drop constraint table_visit_sessions_expiry_check;
alter table public.table_visit_sessions add constraint table_visit_sessions_expiry_check check (
  expires_at > created_at and expires_at <= created_at +
    case when access_channel = 'terminal' then interval '30 days' else interval '24 hours' end
);
create index menu_customer_orders_visit_latest_idx on public.menu_customer_orders(table_visit_session_id,order_number desc) where status<>'cancelled';

alter table public.menu_customer_orders
  add column notification_phone text check (notification_phone is null or notification_phone ~ '^01[016789][0-9]{7,8}$'),
  add column order_signature jsonb;

create function public.resolve_order_visit_access(p_menu_site_id uuid, p_session_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select pg_catalog.jsonb_build_object('channel',s.access_channel,'orderExpiresAt',
    case when s.access_channel='terminal' then null else coalesce(s.order_expires_at,least(s.expires_at,s.created_at+interval '1 hour')) end)
  from public.table_visit_sessions s join public.menu_tables t on t.id=s.menu_table_id and t.menu_site_id=s.menu_site_id
  join public.menu_sites m on m.id=s.menu_site_id
  where s.id=p_session_id and s.menu_site_id=p_menu_site_id and s.revoked_at is null
    and s.expires_at>pg_catalog.clock_timestamp() and t.status='active' and m.status='published';
$$;

-- Service-role only. The server must first require authenticated table.manage write access.
create function public.register_table_terminal_visit(p_menu_site_id uuid,p_table_id uuid,p_token_hash text,p_user_agent_hash text,p_previous_token_hash text)
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid;
begin
  perform t.id from public.menu_tables t join public.menu_sites m on m.id=t.menu_site_id
    where t.id=p_table_id and t.menu_site_id=p_menu_site_id and t.status='active' and m.status='published' for update of t;
  if not found then raise exception using errcode='42501',message='ORDER_VISIT_INACTIVE';end if;
  insert into public.table_visit_sessions(menu_site_id,menu_table_id,token_hash,user_agent_hash,expires_at,access_channel)
    values(p_menu_site_id,p_table_id,p_token_hash,p_user_agent_hash,pg_catalog.now()+interval '30 days','terminal') returning id into v_id;
  update public.table_visit_sessions set revoked_at=pg_catalog.clock_timestamp()
    where menu_site_id=p_menu_site_id and token_hash=p_previous_token_hash and revoked_at is null;
  return v_id;
end;
$$;

create function public.extend_table_order_access(p_menu_site_id uuid, p_session_id uuid, p_rescan boolean)
returns timestamptz language plpgsql security invoker set search_path = '' as $$
declare v public.table_visit_sessions%rowtype; v_expiry timestamptz;
begin
  select s.* into v from public.table_visit_sessions s
  join public.menu_tables t on t.id=s.menu_table_id and t.menu_site_id=s.menu_site_id
  join public.menu_sites m on m.id=s.menu_site_id
  where s.id=p_session_id and s.menu_site_id=p_menu_site_id and s.revoked_at is null
    and s.expires_at>pg_catalog.clock_timestamp() and s.access_channel='customer'
    and t.status='active' and m.status='published' for update of s;
  if not found or (not p_rescan and coalesce(v.order_expires_at,least(v.expires_at,v.created_at+interval '1 hour'))<=pg_catalog.clock_timestamp()) then
    raise exception using errcode='42501',message='ORDER_ACCESS_EXPIRED';
  end if;
  v_expiry:=least(v.expires_at,pg_catalog.clock_timestamp()+interval '1 hour');
  update public.table_visit_sessions set order_expires_at=v_expiry where id=v.id;
  return v_expiry;
end;
$$;

create function private.postpay_cart_signature(p_lines jsonb)
returns jsonb language sql immutable set search_path = '' as $$
  select coalesce(pg_catalog.jsonb_agg(pg_catalog.jsonb_build_array(kind,identity,options,units)
    order by kind,identity,options),'[]'::jsonb)
  from (select case when line ? 'menuCategoryId' then 'course' else 'item' end kind,
    coalesce(line->>'menuItemId',line->>'menuCategoryId') identity,
    coalesce((select pg_catalog.jsonb_agg(option_id order by option_id)
      from pg_catalog.jsonb_array_elements_text(coalesce(line->'optionValueIds','[]'::jsonb)) as opts(option_id)),'[]'::jsonb) options,
    sum((line->>'quantity')::integer) units
    from pg_catalog.jsonb_array_elements(p_lines) as lines(line) group by 1,2,3) canonical;
$$;

-- This guard also protects the retained V2 entry point during a rolling code deployment.
create function private.guard_postpay_order_access()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare s public.table_visit_sessions%rowtype; prefs jsonb;
begin
  select * into s from public.table_visit_sessions where id=new.table_visit_session_id and menu_site_id=new.menu_site_id for update;
  select settings->'table_order' into prefs from public.menu_sites where id=new.menu_site_id;
  if s.access_channel='customer' and coalesce(s.order_expires_at,least(s.expires_at,s.created_at+interval '1 hour'))<=pg_catalog.clock_timestamp() then
    raise exception using errcode='42501',message='ORDER_ACCESS_EXPIRED';
  end if;
  if (s.access_channel='terminal' and coalesce(prefs->>'terminalOrderEnabled','true')<>'true')
    or (s.access_channel='customer' and coalesce(prefs->>'customerCheckout','postpay') not in ('postpay','both')) then
    raise exception using errcode='42501',message='ORDER_CHECKOUT_UNAVAILABLE';
  end if;
  return new;
end;
$$;
create trigger guard_postpay_order_access before insert on public.menu_customer_orders
  for each row execute function private.guard_postpay_order_access();

create function public.submit_postpay_order_v3(
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
  if found and previous.order_signature=signature and p_repeat_order_id is distinct from previous.id then
    raise exception using errcode='P0001',message='ORDER_REPEAT_CONFIRM',detail=previous.id::text;
  end if;
  select * into result from public.submit_postpay_order_v2(p_menu_site_id,s.id,p_client_request_id,p_request_text,p_lines);
  update public.menu_customer_orders set notification_phone=p_notification_phone,order_signature=signature where id=result.order_id;
  return query select result.order_id,result.order_number,result.order_status,result.payment_status,result.total_amount,result.is_duplicate;
end;
$$;

revoke all on function public.resolve_order_visit_access(uuid,uuid),
  public.register_table_terminal_visit(uuid,uuid,text,text,text),
  public.extend_table_order_access(uuid,uuid,boolean),
  public.submit_postpay_order_v3(uuid,uuid,uuid,text,jsonb,text,uuid),
  private.postpay_cart_signature(jsonb),private.guard_postpay_order_access() from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function public.resolve_order_visit_access(uuid,uuid),
  public.register_table_terminal_visit(uuid,uuid,text,text,text),
  public.extend_table_order_access(uuid,uuid,boolean),
  public.submit_postpay_order_v3(uuid,uuid,uuid,text,jsonb,text,uuid),
  private.postpay_cart_signature(jsonb),private.guard_postpay_order_access() to service_role;
comment on column public.table_visit_sessions.access_channel is 'Server-assigned customer/registered terminal channel; never inferred from viewport or URL mode.';
comment on column public.menu_customer_orders.notification_phone is 'Personal-device order contact snapshot. No Kakao integration or verification is performed.';
commit;
