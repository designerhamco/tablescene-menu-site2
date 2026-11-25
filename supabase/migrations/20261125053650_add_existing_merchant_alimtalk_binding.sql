begin;

alter table public.menu_alimtalk_channels
  alter column masked_phone drop not null,
  add column verification_method text not null default 'kakao_token'
    check (verification_method in ('kakao_token','operator_binding')),
  add constraint menu_alimtalk_phone_proof check (masked_phone is not null or verification_method='operator_binding'),
  add constraint menu_alimtalk_operator_proof check (verification_method<>'operator_binding' or state='connected');

-- This RPC is server-only. The caller first checks an explicit menu + owner +
-- sender-key binding and performs NHN's read-only sender verification.
create function public.link_existing_menu_alimtalk_channel(
  p_menu_id uuid,p_actor_id uuid,p_channel_id text,p_category_code text,p_sender_key text
) returns setof public.menu_alimtalk_channels language plpgsql security invoker set search_path='' as $$
declare previous public.menu_alimtalk_channels;
begin
  perform pg_advisory_xact_lock(hashtextextended('channel-actor:'||p_actor_id::text,0));
  perform pg_advisory_xact_lock(hashtextextended('channel-id:'||p_channel_id,0));
  perform 1 from public.menu_sites where id=p_menu_id and user_id=p_actor_id for update;
  if not found then raise exception using errcode='42501',message='CHANNEL_OWNER_REQUIRED'; end if;
  select * into previous from public.menu_alimtalk_channels where menu_site_id=p_menu_id for update;
  if previous.state='connected' then
    if previous.actor_id=p_actor_id and previous.channel_id=p_channel_id and previous.sender_key=p_sender_key then
      return query select * from public.menu_alimtalk_channels where menu_site_id=p_menu_id;
      return;
    end if;
    raise exception 'CHANNEL_ALREADY_CONNECTED';
  end if;
  if previous.state in ('requesting','pending','verifying') and previous.expires_at>now() then raise exception 'CHANNEL_PENDING'; end if;
  update public.menu_alimtalk_channels set state='failed'
    where channel_id=p_channel_id and state in ('requesting','pending','verifying') and expires_at<=now();
  if exists(select 1 from public.menu_alimtalk_channels where channel_id=p_channel_id and menu_site_id<>p_menu_id
    and state in ('requesting','pending','verifying','connected')) then raise exception 'CHANNEL_IN_USE'; end if;
  return query insert into public.menu_alimtalk_channels(menu_site_id,actor_id,channel_id,category_code,
    masked_phone,state,sender_key,verified_at,verification_method,sending_enabled)
  values(p_menu_id,p_actor_id,p_channel_id,p_category_code,null,'connected',p_sender_key,now(),'operator_binding',false)
  on conflict(menu_site_id) do update set actor_id=excluded.actor_id,channel_id=excluded.channel_id,
    category_code=excluded.category_code,masked_phone=null,state='connected',challenge_id=gen_random_uuid(),
    requested_at=now(),expires_at=now()+interval '10 minutes',verify_attempts=0,
    sender_key=excluded.sender_key,verified_at=excluded.verified_at,verification_method='operator_binding',sending_enabled=false
  returning *;
end; $$;
revoke all on function public.link_existing_menu_alimtalk_channel(uuid,uuid,text,text,text) from public,anon,authenticated;
grant execute on function public.link_existing_menu_alimtalk_channel(uuid,uuid,text,text,text) to service_role;

commit;
