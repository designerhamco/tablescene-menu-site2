-- Keep message content independent from the identity used to prevent re-delivery.
-- This migration only backfills keys; it never removes existing notifications.
begin;
set local lock_timeout = '5s';
lock table public.notification_events in share row exclusive mode;
create temp table notification_retention_before on commit drop as
select count(*) as row_count,md5(coalesce(string_agg(row_to_json(e)::text,'' order by e.id),'')) as fingerprint
from public.notification_events e;
create schema if not exists private;

create table public.notification_delivery_keys (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid,
  subscription_id uuid,
  event_type text not null,
  channel text not null,
  period_key text,
  status text not null,
  sent_at timestamptz,
  created_at timestamptz not null,
  constraint notification_delivery_keys_channel_check check (channel in ('in_app','email'))
);
-- Source UUIDs deliberately have no source FK: deleting a menu/subscription must
-- not forget that the corresponding notice was already issued.
create unique index notification_delivery_keys_period_uidx on public.notification_delivery_keys (
  user_id,
  coalesce(menu_site_id,'00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(subscription_id,'00000000-0000-0000-0000-000000000000'::uuid),
  event_type,channel,period_key
) where period_key is not null;
create index notification_delivery_keys_lookup_idx on public.notification_delivery_keys(user_id,event_type,channel,period_key);
alter table public.notification_delivery_keys enable row level security;
revoke all on public.notification_delivery_keys from public,anon,authenticated;
grant select on public.notification_delivery_keys to service_role;

insert into public.notification_delivery_keys(id,user_id,menu_site_id,subscription_id,event_type,channel,period_key,status,sent_at,created_at)
select id,user_id,menu_site_id,subscription_id,event_type,channel,metadata->>'period_key',status,sent_at,created_at
from public.notification_events;

create function private.capture_notification_delivery_key() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if TG_OP = 'INSERT' then
    -- The unique index is also the atomic guard against simultaneous creators.
    insert into public.notification_delivery_keys(id,user_id,menu_site_id,subscription_id,event_type,channel,period_key,status,sent_at,created_at)
    values(new.id,new.user_id,new.menu_site_id,new.subscription_id,new.event_type,new.channel,new.metadata->>'period_key',new.status,new.sent_at,new.created_at);
  else
    update public.notification_delivery_keys set status=new.status,sent_at=new.sent_at where id=new.id;
  end if;
  return new;
end;
$$;
revoke all on function private.capture_notification_delivery_key() from public,anon,authenticated,service_role;
create trigger capture_notification_delivery_key_insert
before insert on public.notification_events for each row execute function private.capture_notification_delivery_key();
create trigger capture_notification_delivery_key_status
after update of status,sent_at on public.notification_events for each row execute function private.capture_notification_delivery_key();

create index notification_events_retention_idx on public.notification_events(created_at,id)
where status in ('sent','read','skipped');

create function private.prune_notification_content(p_execute boolean default false,p_batch_limit integer default 100)
returns jsonb language plpgsql security definer set search_path = '' set timezone = 'UTC' as $$
declare
  v_now timestamptz := statement_timestamp();
  v_cutoff timestamptz := v_now - interval '1 year';
  v_limit integer := least(greatest(coalesce(p_batch_limit,100),1),500);
  v_candidates integer := 0;
  v_deleted integer := 0;
  v_unfinished bigint;
  v_unverified bigint;
begin
  select count(*) into v_unfinished from public.notification_events e
    where e.created_at < v_cutoff and e.status in ('pending','failed');
  select count(*) into v_unverified from public.notification_events e
    where e.created_at < v_cutoff and e.status in ('sent','read','skipped')
      and not exists(select 1 from public.notification_delivery_keys k
        where k.id=e.id and k.user_id=e.user_id and k.event_type=e.event_type and k.channel=e.channel
          and k.period_key is not distinct from e.metadata->>'period_key' and k.status=e.status);

  if coalesce(p_execute,false) then
    -- Serialize cleanup callers; row locks also exclude active message updates.
    perform pg_catalog.pg_advisory_xact_lock(18206,1103);
    with candidates as (
      select e.id from public.notification_events e
      join public.notification_delivery_keys k on k.id=e.id and k.user_id=e.user_id
        and k.event_type=e.event_type and k.channel=e.channel
        and k.period_key is not distinct from e.metadata->>'period_key' and k.status=e.status
      where e.created_at < v_cutoff and e.status in ('sent','read','skipped')
      order by e.created_at,e.id limit v_limit for update of e skip locked
    ), removed as (
      delete from public.notification_events e using candidates c where e.id=c.id returning e.id
    ) select count(*) into v_deleted from removed;
    v_candidates := v_deleted;
  else
    select count(*) into v_candidates from (
      select e.id from public.notification_events e
      join public.notification_delivery_keys k on k.id=e.id and k.user_id=e.user_id
        and k.event_type=e.event_type and k.channel=e.channel
        and k.period_key is not distinct from e.metadata->>'period_key' and k.status=e.status
      where e.created_at < v_cutoff and e.status in ('sent','read','skipped')
      order by e.created_at,e.id limit v_limit
    ) candidates;
  end if;
  return jsonb_build_object('asOf',v_now,'cutoff',v_cutoff,'dryRun',not coalesce(p_execute,false),
    'batchLimit',v_limit,'candidates',v_candidates,'deleted',v_deleted,
    'protectedUnfinished',v_unfinished,'protectedUnverified',v_unverified);
end;
$$;
revoke all on function private.prune_notification_content(boolean,integer) from public,anon,authenticated;
grant usage on schema private to service_role;
grant execute on function private.prune_notification_content(boolean,integer) to service_role;

-- Only the invoker wrapper is exposed through the Data API. The privileged
-- implementation stays in the private schema, with a fixed empty search_path.
create function public.prune_notification_content(p_execute boolean default false,p_batch_limit integer default 100)
returns jsonb language sql security invoker set search_path = '' as $$
  select private.prune_notification_content(p_execute,p_batch_limit);
$$;
revoke all on function public.prune_notification_content(boolean,integer) from public,anon,authenticated;
grant execute on function public.prune_notification_content(boolean,integer) to service_role;
comment on table public.notification_delivery_keys is 'Minimal notification identity and delivery result. No title, body, address or customer metadata. Survives content cleanup; cascades on auth account hard deletion.';
comment on function public.prune_notification_content(boolean,integer) is 'Service-only, default dry-run. Removes at most 500 completed notifications older than one calendar year only when a matching delivery key exists. Pending/failed are always protected.';
do $$
begin
  if exists(select 1 from pg_temp.notification_retention_before b where
    b.row_count <> (select count(*) from public.notification_events) or
    b.fingerprint <> (select md5(coalesce(string_agg(row_to_json(e)::text,'' order by e.id),'')) from public.notification_events e)) then
    raise exception 'NOTIFICATION_ORIGINALS_CHANGED_DURING_LEDGER_BACKFILL';
  end if;
  if exists(select 1 from public.notification_events e left join public.notification_delivery_keys k on k.id=e.id where k.id is null) then
    raise exception 'NOTIFICATION_LEDGER_BACKFILL_INCOMPLETE';
  end if;
end;
$$;
notify pgrst,'reload schema';
commit;
