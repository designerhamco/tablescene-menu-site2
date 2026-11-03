-- Add functions only. No existing merchant rows are changed by this migration.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table private.order_point_deletion_audits (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null,
  point_id uuid not null,
  actor_user_id uuid not null,
  deleted_at timestamptz not null default clock_timestamp(),
  with_history boolean not null,
  summary jsonb not null
);
alter table private.order_point_deletion_audits enable row level security;
alter table private.order_point_deletion_audits force row level security;
revoke all on private.order_point_deletion_audits from public,anon,authenticated,service_role;

create function private.order_point_deletion_summary(p_menu_site_id uuid,p_table_id uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare t public.menu_tables%rowtype; o jsonb; c jsonb; s jsonb; result jsonb;
begin
  select * into t from public.menu_tables where id=p_table_id and menu_site_id=p_menu_site_id;
  if not found then raise exception using errcode='P0002',message='POINT_NOT_FOUND'; end if;
  select jsonb_build_object('orderCount',count(*),
    'pendingOrderCount',count(*) filter(where status not in ('served','cancelled') or (status<>'cancelled' and payment_status='unpaid')),
    'collectedAmount',coalesce(sum(total_amount) filter(where status<>'cancelled' and payment_status in ('manual_paid','paid')),0),
    'monthCollectedAmount',coalesce(sum(total_amount) filter(where status<>'cancelled' and payment_status in ('manual_paid','paid') and payment_completed_at>=date_trunc('month',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' and payment_completed_at<(date_trunc('month',now() at time zone 'Asia/Seoul')+interval '1 month') at time zone 'Asia/Seoul'),0),
    'todayCollectedAmount',coalesce(sum(total_amount) filter(where status<>'cancelled' and payment_status in ('manual_paid','paid') and payment_completed_at>=date_trunc('day',now() at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' and payment_completed_at<(date_trunc('day',now() at time zone 'Asia/Seoul')+interval '1 day') at time zone 'Asia/Seoul'),0),
    'version',coalesce(jsonb_agg(jsonb_build_array(id,updated_at,status,payment_status,total_amount,payment_completed_at) order by id),'[]'::jsonb)) into o
    from public.menu_customer_orders where menu_site_id=p_menu_site_id and menu_table_id=p_table_id;
  select jsonb_build_object('callCount',count(*),'pendingCallCount',count(*) filter(where status not in ('completed','cancelled')),
    'version',coalesce(jsonb_agg(jsonb_build_array(id,updated_at,status) order by id),'[]'::jsonb)) into c
    from public.menu_customer_calls where menu_site_id=p_menu_site_id and menu_table_id=p_table_id;
  select jsonb_build_object('visitCount',count(*),'connectionCount',count(*) filter(where access_channel='terminal'),
    'version',coalesce(jsonb_agg(jsonb_build_array(id,access_channel,revoked_at,expires_at) order by id),'[]'::jsonb)) into s
    from public.table_visit_sessions where menu_site_id=p_menu_site_id and menu_table_id=p_table_id;
  result := (o-'version')||(c-'version')||(s-'version')||jsonb_build_object('id',t.id,'label',t.label,'kind',t.point_kind,'status',t.status,
    'itemCount',(select count(*) from public.menu_customer_order_items i join public.menu_customer_orders r on r.id=i.order_id and r.menu_site_id=i.menu_site_id where r.menu_site_id=p_menu_site_id and r.menu_table_id=p_table_id),
    'optionCount',(select count(*) from public.menu_customer_order_item_options v join public.menu_customer_order_items i on i.id=v.order_item_id and i.menu_site_id=v.menu_site_id join public.menu_customer_orders r on r.id=i.order_id and r.menu_site_id=i.menu_site_id where r.menu_site_id=p_menu_site_id and r.menu_table_id=p_table_id));
  return result||jsonb_build_object('fingerprint',md5((result||jsonb_build_object('pointVersion',jsonb_build_array(t.updated_at,t.qr_public_id),'orders',o->'version','calls',c->'version','visits',s->'version'))::text));
end; $$;

create function public.preview_order_point_deletion(p_menu_site_id uuid,p_table_id uuid)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.order_point_deletion_summary(p_menu_site_id,p_table_id);
$$;

-- The privileged implementation lives outside the exposed schema. Public roles cannot call it.
create function private.delete_order_point(p_menu_site_id uuid,p_table_id uuid,p_actor_user_id uuid,
  p_expected_fingerprint text,p_confirmation_label text,p_with_history boolean)
returns jsonb language plpgsql security definer set search_path = '' set lock_timeout = '5s' set statement_timeout = '30s' as $$
declare t public.menu_tables%rowtype; snapshot jsonb; owner_id uuid;
begin
  select user_id into owner_id from public.menu_sites where id=p_menu_site_id for share;
  if owner_id is null or p_actor_user_id is distinct from owner_id then
    raise exception using errcode='42501',message='POINT_DELETE_OWNER_REQUIRED'; end if;
  select * into t from public.menu_tables where id=p_table_id and menu_site_id=p_menu_site_id for update;
  if not found then raise exception using errcode='P0002',message='POINT_NOT_FOUND'; end if;
  -- Lock existing rows before taking the final snapshot. Point/FK locks prevent new child inserts.
  perform 1 from public.table_visit_sessions where menu_site_id=p_menu_site_id and menu_table_id=p_table_id order by id for update;
  perform 1 from public.menu_customer_orders where menu_site_id=p_menu_site_id and menu_table_id=p_table_id order by id for update;
  perform 1 from public.menu_customer_calls where menu_site_id=p_menu_site_id and menu_table_id=p_table_id order by id for update;
  snapshot := private.order_point_deletion_summary(p_menu_site_id,p_table_id);
  if p_expected_fingerprint is null or snapshot->>'fingerprint' is distinct from p_expected_fingerprint then
    raise exception using errcode='40001',message='POINT_DELETE_CHANGED'; end if;
  if p_confirmation_label is distinct from t.label then
    raise exception using errcode='22023',message='POINT_DELETE_CONFIRMATION_REQUIRED'; end if;
  if p_with_history is not true and ((snapshot->>'orderCount')::bigint>0 or (snapshot->>'callCount')::bigint>0 or (snapshot->>'visitCount')::bigint>0) then
    raise exception using errcode='23514',message='POINT_DELETE_HISTORY_EXISTS'; end if;
  if p_with_history is true then
    if t.status<>'archived' then raise exception using errcode='23514',message='POINT_DELETE_ARCHIVE_FIRST'; end if;
    if (snapshot->>'pendingOrderCount')::bigint>0 or (snapshot->>'pendingCallCount')::bigint>0 then
      raise exception using errcode='23514',message='POINT_DELETE_UNFINISHED'; end if;
    delete from public.menu_customer_calls where menu_site_id=p_menu_site_id and menu_table_id=p_table_id;
    -- Item/option FK cascades delete snapshots belonging to these orders only.
    delete from public.menu_customer_orders where menu_site_id=p_menu_site_id and menu_table_id=p_table_id;
    delete from public.table_visit_sessions where menu_site_id=p_menu_site_id and menu_table_id=p_table_id;
  end if;
  delete from public.menu_tables where menu_site_id=p_menu_site_id and id=p_table_id;
  insert into private.order_point_deletion_audits(menu_site_id,point_id,actor_user_id,with_history,summary)
    values(p_menu_site_id,p_table_id,p_actor_user_id,p_with_history,snapshot-'fingerprint');
  return snapshot-'fingerprint';
end; $$;

create function public.delete_order_point(p_menu_site_id uuid,p_table_id uuid,p_actor_user_id uuid,
  p_expected_fingerprint text,p_confirmation_label text,p_with_history boolean)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.delete_order_point(p_menu_site_id,p_table_id,p_actor_user_id,p_expected_fingerprint,p_confirmation_label,p_with_history);
$$;
revoke all on function private.order_point_deletion_summary(uuid,uuid),public.preview_order_point_deletion(uuid,uuid),
  private.delete_order_point(uuid,uuid,uuid,text,text,boolean),public.delete_order_point(uuid,uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function private.order_point_deletion_summary(uuid,uuid),public.preview_order_point_deletion(uuid,uuid),
  private.delete_order_point(uuid,uuid,uuid,text,text,boolean),public.delete_order_point(uuid,uuid,uuid,text,text,boolean) to service_role;
comment on table private.order_point_deletion_audits is 'Deletion actor/time and aggregate impact only. No order bodies, guest details, payment credentials or tokens.';
notify pgrst,'reload schema';
commit;
