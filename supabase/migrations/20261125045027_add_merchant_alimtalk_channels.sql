begin;

create table public.menu_alimtalk_channels (
  menu_site_id uuid primary key references public.menu_sites(id) on delete cascade,
  actor_id uuid not null references auth.users(id) on delete cascade,
  channel_id text not null check (channel_id like '@%' and length(channel_id) between 2 and 30),
  category_code text not null check (category_code ~ '^[0-9]{11}$'),
  masked_phone text not null check (masked_phone ~ '^01[016789]-\*{4}-[0-9]{4}$'),
  state text not null check (state in ('requesting', 'pending', 'verifying', 'connected', 'failed')),
  challenge_id uuid not null default gen_random_uuid(),
  requested_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  verify_attempts integer not null default 0 check (verify_attempts between 0 and 5),
  request_window_started_at timestamptz not null default now(),
  request_count integer not null default 1 check (request_count between 1 and 10),
  sender_key text check (sender_key ~ '^[a-fA-F0-9]{40}$'),
  verified_at timestamptz,
  sending_enabled boolean not null default false check (sending_enabled = false),
  check ((state = 'connected') = (sender_key is not null)),
  check ((state = 'connected') = (verified_at is not null))
);
create unique index menu_alimtalk_channel_claim on public.menu_alimtalk_channels(channel_id)
  where state in ('requesting', 'pending', 'verifying', 'connected');
create index menu_alimtalk_actor_requests on public.menu_alimtalk_channels(actor_id, request_window_started_at);
alter table public.menu_alimtalk_channels enable row level security;
revoke all on public.menu_alimtalk_channels from public, anon, authenticated, service_role;
grant select, insert, update on public.menu_alimtalk_channels to service_role;

create function private.check_menu_alimtalk_owner() returns trigger
language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.menu_sites where id = new.menu_site_id and user_id = new.actor_id for share;
  if not found then raise exception using errcode='42501', message='CHANNEL_OWNER_REQUIRED'; end if;
  return new;
end; $$;
revoke all on function private.check_menu_alimtalk_owner() from public, anon, authenticated;
grant execute on function private.check_menu_alimtalk_owner() to service_role;
create trigger check_menu_alimtalk_owner before insert or update on public.menu_alimtalk_channels
  for each row execute function private.check_menu_alimtalk_owner();

create function public.reserve_menu_alimtalk_request(p_menu_id uuid, p_actor_id uuid, p_channel_id text, p_category_code text, p_masked_phone text)
returns setof public.menu_alimtalk_channels language plpgsql security invoker set search_path = '' as $$
declare previous public.menu_alimtalk_channels; actor_count integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('channel-actor:' || p_actor_id::text, 0));
  perform pg_advisory_xact_lock(hashtextextended('channel-id:' || p_channel_id, 0));
  perform 1 from public.menu_sites where id = p_menu_id and user_id = p_actor_id for update;
  if not found then raise exception using errcode='42501', message='CHANNEL_OWNER_REQUIRED'; end if;
  select * into previous from public.menu_alimtalk_channels where menu_site_id=p_menu_id for update;
  if previous.state = 'connected' then raise exception 'CHANNEL_ALREADY_CONNECTED'; end if;
  if previous.requested_at > now() - interval '60 seconds' then raise exception 'CHANNEL_COOLDOWN'; end if;
  if previous.state = 'verifying' and previous.expires_at > now() then raise exception 'CHANNEL_VERIFYING'; end if;
  select coalesce(sum(request_count),0) into actor_count from public.menu_alimtalk_channels
    where actor_id=p_actor_id and request_window_started_at > now()-interval '1 hour';
  if actor_count >= 10 then raise exception 'CHANNEL_REQUEST_LIMIT'; end if;
  -- An expired reservation cannot indefinitely block another store's fresh proof.
  update public.menu_alimtalk_channels set state='failed'
    where channel_id=p_channel_id and state in ('requesting','pending','verifying') and expires_at <= now();
  if exists(select 1 from public.menu_alimtalk_channels where channel_id=p_channel_id and menu_site_id<>p_menu_id
    and state in ('requesting','pending','verifying','connected')) then raise exception 'CHANNEL_IN_USE'; end if;
  return query insert into public.menu_alimtalk_channels(menu_site_id,actor_id,channel_id,category_code,masked_phone,state,
    request_count,request_window_started_at)
  values(p_menu_id,p_actor_id,p_channel_id,p_category_code,p_masked_phone,'requesting',
    case when previous.actor_id=p_actor_id and previous.request_window_started_at > now()-interval '1 hour' then previous.request_count+1 else 1 end,
    case when previous.actor_id=p_actor_id and previous.request_window_started_at > now()-interval '1 hour' then previous.request_window_started_at else now() end)
  on conflict(menu_site_id) do update set actor_id=excluded.actor_id,channel_id=excluded.channel_id,
    category_code=excluded.category_code,masked_phone=excluded.masked_phone,state='requesting',challenge_id=gen_random_uuid(),
    requested_at=now(),expires_at=now()+interval '10 minutes',verify_attempts=0,
    request_count=excluded.request_count,request_window_started_at=excluded.request_window_started_at,
    sender_key=null,verified_at=null,sending_enabled=false
  returning *;
end; $$;

create function public.reserve_menu_alimtalk_verification(p_menu_id uuid,p_actor_id uuid,p_challenge_id uuid)
returns setof public.menu_alimtalk_channels language plpgsql security invoker set search_path = '' as $$
declare current_row public.menu_alimtalk_channels;
begin
  perform 1 from public.menu_sites where id=p_menu_id and user_id=p_actor_id for share;
  if not found then raise exception using errcode='42501', message='CHANNEL_OWNER_REQUIRED'; end if;
  select * into current_row from public.menu_alimtalk_channels where menu_site_id=p_menu_id for update;
  if not found or current_row.actor_id<>p_actor_id or current_row.challenge_id<>p_challenge_id then raise exception 'CHANNEL_STALE'; end if;
  if current_row.expires_at <= now() then raise exception 'CHANNEL_EXPIRED'; end if;
  if current_row.verify_attempts >= 5 then raise exception 'CHANNEL_VERIFY_LIMIT'; end if;
  if current_row.state<>'pending' then raise exception 'CHANNEL_NOT_PENDING'; end if;
  return query update public.menu_alimtalk_channels set state='verifying',verify_attempts=verify_attempts+1
    where menu_site_id=p_menu_id returning *;
end; $$;

revoke all on function public.reserve_menu_alimtalk_request(uuid,uuid,text,text,text) from public,anon,authenticated;
revoke all on function public.reserve_menu_alimtalk_verification(uuid,uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_menu_alimtalk_request(uuid,uuid,text,text,text) to service_role;
grant execute on function public.reserve_menu_alimtalk_verification(uuid,uuid,uuid) to service_role;
commit;
