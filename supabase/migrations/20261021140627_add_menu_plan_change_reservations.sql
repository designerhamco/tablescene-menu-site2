-- Additive reservation ledger. No existing subscription/menu/payment is backfilled.
begin;
create table public.menu_plan_changes (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.business_subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  state text not null default 'pending' check (state in ('pending','processing','applied','cancelled')),
  effective_at timestamptz not null,
  target_product_key text not null check (target_product_key in ('business_basic_single_monthly','business_basic_multi_monthly')),
  target_access text not null check (target_access in ('standard','all')),
  target_design_id text not null,
  target_amount integer not null check (target_amount > 0 and target_amount <= 1000000),
  contract_version text not null,
  pricebook_version text not null,
  previous_contract jsonb not null,
  payment_id text unique,
  period_end timestamptz,
  requested_at timestamptz not null default now(),
  applied_at timestamptz,
  updated_at timestamptz not null default now()
);
create unique index menu_plan_changes_live_subscription_idx on public.menu_plan_changes(subscription_id) where state in ('pending','processing');
create index menu_plan_changes_user_idx on public.menu_plan_changes(user_id,requested_at desc);
alter table public.menu_plan_changes enable row level security;
revoke all on public.menu_plan_changes from public, anon, authenticated;
grant select,insert,update on public.menu_plan_changes to service_role;

-- Invoker RPCs are server-only and use one subscription lock order throughout.
create function public.reserve_menu_plan_change(p_subscription uuid,p_user uuid,p_expected_billing timestamptz,p_product text,p_access text,p_design text,p_amount integer,p_contract_version text,p_pricebook_version text)
returns public.menu_plan_changes language plpgsql security invoker set search_path = '' as $$
declare s public.business_subscriptions; c public.menu_plan_changes; m public.menu_sites; service_dining boolean; design_dining boolean; standard_design boolean;
begin
  select * into strict s from public.business_subscriptions where id=p_subscription and user_id=p_user for update;
  if s.status <> 'active' or s.cancel_at_period_end is true or s.next_billing_at is null or s.next_billing_at <= now() or s.next_billing_at is distinct from p_expected_billing or s.billing_key_ref is null or s.billing_key_ref = '' then
    raise exception 'SUBSCRIPTION_NOT_ELIGIBLE';
  end if;
  select * into strict m from public.menu_sites where id=s.menu_site_id and user_id=p_user;
  service_dining := m.template_key in ('dining_aube_table_a','dining_aube_table_b');
  if s.plan_type <> 'business_basic' or (not service_dining and m.template_key not in ('cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a')) or
    p_product is distinct from (case when service_dining then 'business_basic_multi_monthly' else 'business_basic_single_monthly' end) then raise exception 'SERVICE_MISMATCH'; end if;
  standard_design := p_design in ('basic-first-column','basic-top-row','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album','dining-full-page','dining-sidebar','dining-full-page-album','dining-sidebar-album');
  design_dining := p_design like 'dining-%' or p_design in ('dining_aube_table_a','dining_aube_table_b');
  if design_dining is distinct from service_dining or (not standard_design and (p_access <> 'all' or p_design not in ('cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a','dining_aube_table_a','dining_aube_table_b'))) then raise exception 'DESIGN_OUTSIDE_ACCESS'; end if;
  if exists(select 1 from public.menu_plan_changes where subscription_id=s.id and state='processing') then raise exception 'CHANGE_PROCESSING'; end if;
  update public.menu_plan_changes set state='cancelled',updated_at=now() where subscription_id=s.id and state='pending';
  insert into public.menu_plan_changes(subscription_id,user_id,menu_site_id,effective_at,target_product_key,target_access,target_design_id,target_amount,contract_version,pricebook_version,previous_contract)
  values(s.id,p_user,m.id,s.next_billing_at,p_product,p_access,p_design,p_amount,p_contract_version,p_pricebook_version,jsonb_build_object('product_key',s.product_key,'billing_cycle',s.billing_cycle,'amount',s.amount,'menu_design_access',s.menu_design_access,'menu_plan_version',s.menu_plan_version,'design_id',coalesce(m.settings->>'menu_design_id',m.template_key))) returning * into c;
  return c;
end $$;
create function public.cancel_menu_plan_change(p_subscription uuid,p_user uuid,p_change uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare s public.business_subscriptions; c public.menu_plan_changes;
begin
  select * into strict s from public.business_subscriptions where id=p_subscription and user_id=p_user for update;
  select * into c from public.menu_plan_changes where id=p_change and subscription_id=s.id and user_id=p_user for update;
  if not found then return false; end if;
  if c.state='cancelled' then return true; end if;
  if c.state <> 'pending' or c.effective_at <= now() then raise exception 'CHANGE_PROCESSING'; end if;
  update public.menu_plan_changes set state='cancelled',updated_at=now() where id=c.id;
  return true;
end $$;
create function public.claim_menu_plan_change(p_subscription uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare s public.business_subscriptions; c public.menu_plan_changes;
begin
  select * into strict s from public.business_subscriptions where id=p_subscription for update;
  select * into c from public.menu_plan_changes where subscription_id=s.id and state in ('pending','processing') for update;
  if not found then return null; end if;
  if s.cancel_at_period_end is true then
    if c.state='processing' then raise exception 'CHANGE_PROCESSING'; end if;
    update public.menu_plan_changes set state='cancelled',updated_at=now() where id=c.id;
    return null;
  end if;
  if s.status <> 'active' or s.currency is distinct from 'KRW' or s.user_id is distinct from c.user_id or s.menu_site_id is distinct from c.menu_site_id or s.next_billing_at is distinct from c.effective_at or c.effective_at > now() or nullif(s.billing_key_ref,'') is null then raise exception 'CHANGE_NOT_DUE'; end if;
  if c.state='pending' then
    update public.menu_plan_changes set state='processing',payment_id='sub_'||s.id::text||'_'||to_char(c.effective_at at time zone 'UTC','YYYYMMDD'),period_end=((c.effective_at at time zone 'UTC')+interval '1 month') at time zone 'UTC',updated_at=now() where id=c.id returning * into c;
  end if;
  return jsonb_build_object('change',to_jsonb(c),'subscription',to_jsonb(s));
end $$;
-- Customer cancellation and rescheduling must not race an in-flight renewal.
create function public.guard_processing_menu_plan_change() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  if new.cancel_at_period_end is distinct from old.cancel_at_period_end and exists(select 1 from public.menu_plan_changes where subscription_id=old.id and state='processing') then raise exception 'PLAN_CHANGE_RENEWAL_PROCESSING'; end if;
  if new.cancel_at_period_end is true and old.cancel_at_period_end is not true then update public.menu_plan_changes set state='cancelled',updated_at=now() where subscription_id=old.id and state='pending'; end if;
  return new;
end $$;
create trigger guard_processing_menu_plan_change before update of cancel_at_period_end on public.business_subscriptions for each row execute function public.guard_processing_menu_plan_change();

-- Called only after the server verified the stable PortOne payment ID and amount.
-- Receipts, contract, entitlement and selected design commit together. Retrying is safe.
create function public.apply_paid_menu_plan_change(p_change uuid,p_payment_id text,p_amount integer,p_menu_updated_at timestamptz,p_template text,p_category text,p_settings jsonb,p_page_settings jsonb,p_brand_color text,p_payment jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare c public.menu_plan_changes; s public.business_subscriptions; m public.menu_sites; order_id public.orders.id%type; expected_template text; payload jsonb; b record;
begin
  -- Discover the immutable parent, then acquire locks in the same order as reservation/claim.
  select * into strict c from public.menu_plan_changes where id=p_change;
  select * into strict s from public.business_subscriptions where id=c.subscription_id for update;
  select * into strict c from public.menu_plan_changes where id=p_change for update;
  if c.state='applied' and c.payment_id=p_payment_id then return jsonb_build_object('applied',true,'alreadyApplied',true); end if;
  if s.status <> 'active' or s.cancel_at_period_end is true or s.currency is distinct from 'KRW' or s.user_id is distinct from c.user_id or s.menu_site_id is distinct from c.menu_site_id or c.state <> 'processing' or c.payment_id is distinct from p_payment_id or c.target_amount is distinct from p_amount or c.period_end is null or s.next_billing_at is distinct from c.effective_at then raise exception 'PAID_CHANGE_MISMATCH'; end if;
  select * into strict m from public.menu_sites where id=c.menu_site_id and user_id=c.user_id for update;
  if m.updated_at is distinct from p_menu_updated_at then raise exception 'MENU_EDIT_CONFLICT'; end if;
  expected_template := case when c.target_design_id in ('basic-first-column','basic-top-row','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album') then 'cafe_design_a' when c.target_design_id in ('dining-full-page','dining-full-page-album') then 'dining_aube_table_a' when c.target_design_id in ('dining-sidebar','dining-sidebar-album') then 'dining_aube_table_b' else c.target_design_id end;
  if p_template is distinct from expected_template or p_settings->>'menu_design_id' is distinct from c.target_design_id then raise exception 'APPLIED_DESIGN_MISMATCH'; end if;
  payload := jsonb_build_object('renewal',true,'subscription_id',s.id,'menu_plan_change_id',c.id,'product_key',c.target_product_key,'plan_type','business_basic','billing_cycle','monthly','menu_design_access',c.target_access,'menu_plan_version',c.contract_version,'portone_payment',p_payment);
  select business_name,representative_name,business_registration_number into b from public.business_profiles where id=s.business_profile_id;
  insert into public.orders(user_id,menu_site_id,product_key,order_name,payment_id,raw_payload,status,total_amount,customer_name,buyer_name,business_name,business_number)
  values(c.user_id,m.id,c.target_product_key,'아티메뉴 이용권 변경 월결제',p_payment_id,payload,'paid',p_amount,b.business_name,b.representative_name,b.business_name,b.business_registration_number) returning id into order_id;
  insert into public.payments(user_id,order_id,product_key,payment_id,portone_payment_id,status,amount,raw_payload)
  values(c.user_id,order_id,c.target_product_key,p_payment_id,p_payment_id,'paid',p_amount,payload);
  update public.business_subscriptions set product_key=c.target_product_key,billing_cycle='monthly',amount=c.target_amount,menu_design_access=c.target_access,menu_plan_version=c.contract_version,initial_design_id=c.target_design_id,status='active',portone_payment_id=p_payment_id,last_paid_at=now(),current_period_start=c.effective_at,current_period_end=c.period_end,next_billing_at=c.period_end where id=s.id;
  update public.service_entitlements set product_key=c.target_product_key,billing_cycle='monthly',status='active',access_expires_at=c.period_end,expired_at=null,data_retention_until=null,deleted_scheduled_at=null where subscription_id=s.id and user_id=c.user_id;
  if not found then raise exception 'ENTITLEMENT_NOT_FOUND'; end if;
  update public.menu_sites set template_key=p_template,template_category=p_category,brand_color=p_brand_color,settings=p_settings,page_settings=p_page_settings,updated_at=now() where id=m.id;
  update public.menu_plan_changes set state='applied',applied_at=now(),updated_at=now() where id=c.id;
  return jsonb_build_object('applied',true,'alreadyApplied',false);
end $$;
revoke all on function public.reserve_menu_plan_change(uuid,uuid,timestamptz,text,text,text,integer,text,text), public.cancel_menu_plan_change(uuid,uuid,uuid), public.claim_menu_plan_change(uuid), public.guard_processing_menu_plan_change(), public.apply_paid_menu_plan_change(uuid,text,integer,timestamptz,text,text,jsonb,jsonb,text,jsonb) from public,anon,authenticated;
grant execute on function public.reserve_menu_plan_change(uuid,uuid,timestamptz,text,text,text,integer,text,text), public.cancel_menu_plan_change(uuid,uuid,uuid), public.claim_menu_plan_change(uuid), public.guard_processing_menu_plan_change(), public.apply_paid_menu_plan_change(uuid,text,integer,timestamptz,text,text,jsonb,jsonb,text,jsonb) to service_role;
comment on table public.menu_plan_changes is 'Owner-selected next-billing monthly plan changes. No mid-cycle charge, automatic legacy migration or price backfill. Server-only RLS ledger.';
commit;
