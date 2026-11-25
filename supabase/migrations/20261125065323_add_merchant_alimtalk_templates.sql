begin;
set local lock_timeout = '5s';

alter table public.menu_alimtalk_channels
  add column template_code text not null default 'cooking_ready_v1' check (template_code='cooking_ready_v1'),
  add column template_status text not null default 'unregistered' check (template_status in ('unregistered','checking','pending','approved','rejected','blocked','conflict','unknown','failed')),
  add column template_content text check (char_length(template_content)<=1300),
  add column template_checked_at timestamptz,
  add column template_check_id uuid,
  add column template_check_started_at timestamptz,
  add column template_registration_started_at timestamptz,
  add constraint menu_alimtalk_template_approved check (template_status<>'approved' or (state='connected' and template_content is not null and template_checked_at is not null));

create function private.reset_menu_alimtalk_template() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  if old.actor_id is distinct from new.actor_id or old.channel_id is distinct from new.channel_id or old.sender_key is distinct from new.sender_key then
    new.template_status:='unregistered'; new.template_content:=null; new.template_checked_at:=null;
    new.template_check_id:=null; new.template_check_started_at:=null; new.template_registration_started_at:=null;
    new.sending_enabled:=false;
  end if;
  return new;
end; $$;
revoke all on function private.reset_menu_alimtalk_template() from public,anon,authenticated;
grant execute on function private.reset_menu_alimtalk_template() to service_role;
create trigger reset_menu_alimtalk_template before update of actor_id,channel_id,sender_key on public.menu_alimtalk_channels
  for each row execute function private.reset_menu_alimtalk_template();

create function public.reserve_menu_alimtalk_template(p_menu_id uuid,p_actor_id uuid)
returns setof public.menu_alimtalk_channels language plpgsql security invoker set search_path='' as $$
declare current_row public.menu_alimtalk_channels;
begin
  perform 1 from public.menu_sites where id=p_menu_id and user_id=p_actor_id for share;
  if not found then raise exception using errcode='42501',message='CHANNEL_OWNER_REQUIRED'; end if;
  select * into current_row from public.menu_alimtalk_channels where menu_site_id=p_menu_id for update;
  if not found or current_row.actor_id<>p_actor_id or current_row.state<>'connected' then raise exception 'TEMPLATE_CHANNEL_REQUIRED'; end if;
  if current_row.template_check_started_at>now()-interval '10 seconds' then raise exception 'TEMPLATE_COOLDOWN'; end if;
  if current_row.template_status='checking' and current_row.template_check_started_at>now()-interval '45 seconds' then raise exception 'TEMPLATE_BUSY'; end if;
  return query update public.menu_alimtalk_channels set template_status='checking',template_check_id=gen_random_uuid(),
    template_check_started_at=clock_timestamp() where menu_site_id=p_menu_id returning *;
end; $$;
revoke all on function public.reserve_menu_alimtalk_template(uuid,uuid) from public,anon,authenticated;
grant execute on function public.reserve_menu_alimtalk_template(uuid,uuid) to service_role;

-- Receipts must remain bound to the sender used at submission, even if settings later change.
alter table public.menu_order_alimtalk_attempts
  add column provider_app_key_hash text check (provider_app_key_hash is null or provider_app_key_hash ~ '^[a-f0-9]{64}$'),
  add column sender_key text,
  add column channel_id text,
  add column template_code text,
  add column channel_owner_id uuid references auth.users(id) on delete set null,
  add constraint menu_order_alimtalk_sender_snapshot check (
    (sender_key is null and channel_id is null and template_code is null) or
    (sender_key ~ '^[a-fA-F0-9]{40}$' and channel_id like '@%' and length(channel_id) between 2 and 30 and template_code='cooking_ready_v1'
      and sender_key is not null and channel_id is not null and template_code is not null)
  );

create or replace function private.validate_order_alimtalk_attempt() returns trigger
language plpgsql security invoker set search_path='' as $$
begin
  perform 1 from public.menu_customer_orders o where o.menu_site_id=new.menu_site_id and o.id=new.order_id
    and o.status='ready' and o.notification_phone ~ '^01[016789][0-9]{7,8}$' for no key update;
  if not found then raise exception using errcode='P0001',message='ORDER_ALIMTALK_NOT_ELIGIBLE'; end if;
  perform 1 from public.menu_sites m join public.menu_alimtalk_channels c on c.menu_site_id=m.id
    where m.id=new.menu_site_id and m.user_id=c.actor_id and c.actor_id=new.channel_owner_id
      and c.state='connected' and c.template_status='approved' and c.sending_enabled
      and new.provider_app_key_hash is not null
      and c.sender_key=new.sender_key and c.channel_id=new.channel_id and c.template_code=new.template_code for share of c,m;
  if not found then raise exception using errcode='P0001',message='ORDER_ALIMTALK_CHANNEL_UNAVAILABLE'; end if;
  return new;
end; $$;

create trigger validate_order_alimtalk_submission before update of submission_started_at on public.menu_order_alimtalk_attempts
  for each row when (old.submission_started_at is null and new.submission_started_at is not null)
  execute function private.validate_order_alimtalk_attempt();

notify pgrst, 'reload schema';
commit;
