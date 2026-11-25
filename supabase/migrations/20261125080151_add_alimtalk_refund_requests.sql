begin;
set local lock_timeout='5s';

alter table public.alimtalk_billing_policy add column terms_version text not null default 'alimtalk_20261125_v1',
  add column pg_reviewed_at timestamptz,
  add column approved_store_id text,add column approved_channel_key text,
  add constraint alimtalk_topup_pg_review check (not topup_enabled or (pg_reviewed_at is not null and approved_store_id is not null and approved_channel_key is not null));
alter table public.alimtalk_topups add column terms_version text,
  add column terms_accepted_at timestamptz,
  add column agreed_unit_price integer check (agreed_unit_price between 1 and 1000),
  add column refunded_amount integer not null default 0 check (refunded_amount between 0 and amount);

create table public.alimtalk_refund_requests (
  id uuid primary key,
  owner_id uuid not null references public.alimtalk_wallets(owner_id),
  menu_site_id uuid not null,
  amount integer not null check (amount>0),
  refunded_amount integer not null default 0 check (refunded_amount between 0 and amount),
  state text not null default 'requested' check (state in ('requested','processing','completed','cancelled','review')),
  terms_version text not null check (terms_version='alimtalk_20261125_v1'),
  created_at timestamptz not null default clock_timestamp(),
  processed_by uuid references auth.users(id) on delete set null,
  processing_at timestamptz,
  resolved_at timestamptz,
  check (state<>'completed' or (refunded_amount=amount and resolved_at is not null)),
  check (state<>'cancelled' or (refunded_amount=0 and resolved_at is not null))
);
create unique index alimtalk_one_open_refund on public.alimtalk_refund_requests(owner_id) where state in ('requested','processing','review');
create index alimtalk_refund_queue on public.alimtalk_refund_requests(created_at desc,id desc);
create index alimtalk_refund_owner_history on public.alimtalk_refund_requests(owner_id,created_at desc);
create table public.alimtalk_refund_payments (
  refund_id uuid not null references public.alimtalk_refund_requests(id),
  payment_id text not null references public.alimtalk_topups(payment_id),
  amount integer not null check (amount>0),
  refunded_amount integer not null default 0 check (refunded_amount between 0 and amount),
  baseline_cancelled integer not null check (baseline_cancelled>=0),
  primary key (refund_id,payment_id)
);
create index alimtalk_refund_payments_payment on public.alimtalk_refund_payments(payment_id);
alter table public.alimtalk_refund_requests enable row level security;
alter table public.alimtalk_refund_payments enable row level security;
revoke all on public.alimtalk_refund_requests,public.alimtalk_refund_payments from public,anon,authenticated;
grant select,insert,update on public.alimtalk_refund_requests,public.alimtalk_refund_payments to service_role;

alter table public.alimtalk_wallet_entries add column refund_id uuid references public.alimtalk_refund_requests(id);
alter table public.alimtalk_wallet_entries drop constraint alimtalk_wallet_entries_kind_check,
  drop constraint alimtalk_wallet_entries_check1,drop constraint alimtalk_wallet_entries_payment_id_key;
alter table public.alimtalk_wallet_entries add constraint alimtalk_wallet_entry_kind check (kind in ('topup','hold','charge','release','refund_hold','refund_release','refund')),
  add constraint alimtalk_wallet_entry_context check (
    (kind='topup' and payment_id is not null and attempt_id is null and refund_id is null) or
    (kind in ('hold','charge','release') and payment_id is null and refund_id is null) or
    (kind in ('refund_hold','refund_release') and refund_id is not null and payment_id is null and attempt_id is null) or
    (kind='refund' and refund_id is not null and payment_id is not null and attempt_id is null));
create unique index alimtalk_one_credit_per_payment on public.alimtalk_wallet_entries(payment_id) where kind='topup';
create unique index alimtalk_refund_hold_once on public.alimtalk_wallet_entries(refund_id,kind) where kind in ('refund_hold','refund_release');
create index alimtalk_wallet_entries_refund on public.alimtalk_wallet_entries(refund_id);

drop function public.create_alimtalk_topup(uuid,uuid,text,integer,text,text);
create function public.create_alimtalk_topup(p_menu_id uuid,p_actor_id uuid,p_payment_id text,p_amount integer,p_store_id text,p_channel_key text,p_terms_version text,p_unit_price integer)
returns setof public.alimtalk_topups language plpgsql security invoker set search_path='' as $$
declare policy public.alimtalk_billing_policy;
begin
  perform 1 from public.menu_sites where id=p_menu_id and user_id=p_actor_id for share;
  if not found then raise exception 'WALLET_OWNER_REQUIRED'; end if;
  select * into policy from public.alimtalk_billing_policy where id;
  if not policy.topup_enabled or policy.pg_reviewed_at is null then raise exception 'WALLET_TOPUP_DISABLED'; end if;
  if p_store_id is distinct from policy.approved_store_id or p_channel_key is distinct from policy.approved_channel_key then raise exception 'WALLET_PG_NOT_REVIEWED'; end if;
  if p_terms_version is distinct from policy.terms_version or p_terms_version<>'alimtalk_20261125_v1' or p_unit_price is distinct from policy.unit_price then raise exception 'WALLET_TERMS_CHANGED'; end if;
  perform 1 from public.alimtalk_wallets where owner_id=p_actor_id and frozen;
  if found then raise exception 'WALLET_FROZEN'; end if;
  perform 1 from public.alimtalk_refund_requests where owner_id=p_actor_id and state in ('requested','processing','review');
  if found then raise exception 'WALLET_REFUND_PENDING'; end if;
  if (select count(*) from public.alimtalk_topups where owner_id=p_actor_id and created_at>now()-interval '1 hour')>=20 then raise exception 'WALLET_TOPUP_LIMIT'; end if;
  return query insert into public.alimtalk_topups(payment_id,owner_id,menu_site_id,amount,store_id,channel_key,terms_version,terms_accepted_at,agreed_unit_price)
    values(p_payment_id,p_actor_id,p_menu_id,p_amount,p_store_id,p_channel_key,p_terms_version,clock_timestamp(),p_unit_price) returning *;
end; $$;

-- All wallet writers lock wallet BEFORE payment/request rows to avoid deadlocks.
create or replace function public.credit_alimtalk_topup(p_payment_id text,p_owner_id uuid,p_verified_amount integer)
returns setof public.alimtalk_wallets language plpgsql security invoker set search_path='' as $$
declare t public.alimtalk_topups; w public.alimtalk_wallets;
begin
  select * into t from public.alimtalk_topups where payment_id=p_payment_id;
  if not found or t.owner_id<>p_owner_id or t.amount<>p_verified_amount then raise exception 'WALLET_PAYMENT_MISMATCH'; end if;
  insert into public.alimtalk_wallets(owner_id) values(t.owner_id) on conflict do nothing;
  select * into w from public.alimtalk_wallets where owner_id=t.owner_id for update;
  select * into t from public.alimtalk_topups where payment_id=p_payment_id for update;
  if t.state='review' then raise exception 'WALLET_PAYMENT_REVIEW'; end if;
  if t.credited_at is not null then return next w; return; end if;
  update public.alimtalk_wallets set balance=balance+t.amount,updated_at=clock_timestamp() where owner_id=t.owner_id returning * into w;
  insert into public.alimtalk_wallet_entries(owner_id,menu_site_id,kind,amount,balance_after,reserved_after,payment_id)
    values(t.owner_id,t.menu_site_id,'topup',t.amount,w.balance,w.reserved,t.payment_id);
  update public.alimtalk_topups set state='credited',credited_at=clock_timestamp() where payment_id=t.payment_id;
  return next w;
end; $$;
create or replace function public.flag_alimtalk_topup_review(p_payment_id text)
returns void language plpgsql security invoker set search_path='' as $$
declare t public.alimtalk_topups;
begin
  select * into t from public.alimtalk_topups where payment_id=p_payment_id;
  if not found then raise exception 'WALLET_PAYMENT_MISMATCH'; end if;
  perform 1 from public.alimtalk_wallets where owner_id=t.owner_id for update;
  update public.alimtalk_topups set state='review' where payment_id=t.payment_id;
  if t.credited_at is not null then
    update public.alimtalk_wallets set frozen=true,updated_at=clock_timestamp() where owner_id=t.owner_id;
    update public.alimtalk_refund_requests set state='review' where owner_id=t.owner_id and state in ('requested','processing');
  end if;
end; $$;

create function public.request_alimtalk_refund(p_menu_id uuid,p_actor_id uuid,p_request_id uuid,p_expected_balance integer,p_terms_version text)
returns setof public.alimtalk_refund_requests language plpgsql security invoker set search_path='' as $$
declare w public.alimtalk_wallets; r public.alimtalk_refund_requests; t public.alimtalk_topups; remaining integer; allocated integer; context_menu uuid;
begin
  if p_menu_id is not null then
    perform 1 from public.menu_sites where id=p_menu_id and user_id=p_actor_id for share;
    if not found then raise exception 'WALLET_OWNER_REQUIRED'; end if;
    context_menu:=p_menu_id;
  else
    -- Account-level refunds remain available after all menus are transferred or deleted.
    select menu_site_id into context_menu from public.alimtalk_topups where owner_id=p_actor_id and credited_at is not null order by created_at desc,payment_id desc limit 1;
    if context_menu is null then raise exception 'WALLET_REFUND_EMPTY'; end if;
  end if;
  select * into w from public.alimtalk_wallets where owner_id=p_actor_id for update;
  if not found then raise exception 'WALLET_REFUND_EMPTY'; end if;
  select * into r from public.alimtalk_refund_requests where id=p_request_id;
  if found then
    if r.owner_id<>p_actor_id then raise exception 'WALLET_OWNER_REQUIRED'; end if;
    return next r; return;
  end if;
  select * into r from public.alimtalk_refund_requests where owner_id=p_actor_id and state in ('requested','processing','review');
  if found then return next r; return; end if;
  if w.frozen then raise exception 'WALLET_FROZEN'; end if;
  if w.reserved<>0 then raise exception 'WALLET_REFUND_HELD'; end if;
  if w.balance<=0 then raise exception 'WALLET_REFUND_EMPTY'; end if;
  if p_expected_balance is distinct from w.balance then raise exception 'WALLET_REFUND_STALE'; end if;
  if p_terms_version is distinct from 'alimtalk_20261125_v1' then raise exception 'WALLET_TERMS_CHANGED'; end if;
  remaining:=w.balance;
  insert into public.alimtalk_refund_requests(id,owner_id,menu_site_id,amount,terms_version)
    values(p_request_id,p_actor_id,context_menu,w.balance,p_terms_version) returning * into r;
  -- Usage consumes oldest funded money; refund remaining paid money newest first.
  for t in select * from public.alimtalk_topups where owner_id=p_actor_id and state='credited' and credited_at is not null
      and amount>refunded_amount order by created_at desc,payment_id desc for update loop
    allocated:=least(remaining,t.amount-t.refunded_amount);
    insert into public.alimtalk_refund_payments(refund_id,payment_id,amount,baseline_cancelled)
      values(r.id,t.payment_id,allocated,t.refunded_amount);
    remaining:=remaining-allocated; exit when remaining=0;
  end loop;
  if remaining<>0 then raise exception 'WALLET_REFUND_FUNDING'; end if;
  update public.alimtalk_wallets set reserved=reserved+r.amount,updated_at=clock_timestamp() where owner_id=p_actor_id returning * into w;
  insert into public.alimtalk_wallet_entries(owner_id,menu_site_id,kind,amount,balance_after,reserved_after,refund_id)
    values(p_actor_id,context_menu,'refund_hold',r.amount,w.balance,w.reserved,r.id);
  return next r;
end; $$;

create function public.cancel_alimtalk_refund(p_actor_id uuid,p_request_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.alimtalk_refund_requests; w public.alimtalk_wallets;
begin
  select * into r from public.alimtalk_refund_requests where id=p_request_id and owner_id=p_actor_id;
  if not found then raise exception 'WALLET_OWNER_REQUIRED'; end if;
  perform 1 from public.alimtalk_wallets where owner_id=p_actor_id for update;
  select * into r from public.alimtalk_refund_requests where id=p_request_id for update;
  if r.state='cancelled' then return; end if;
  if r.state<>'requested' then raise exception 'WALLET_REFUND_PROCESSING'; end if;
  update public.alimtalk_wallets set reserved=reserved-r.amount,updated_at=clock_timestamp() where owner_id=p_actor_id returning * into w;
  update public.alimtalk_refund_requests set state='cancelled',resolved_at=clock_timestamp() where id=r.id;
  insert into public.alimtalk_wallet_entries(owner_id,menu_site_id,kind,amount,balance_after,reserved_after,refund_id)
    values(p_actor_id,r.menu_site_id,'refund_release',r.amount,w.balance,w.reserved,r.id);
end; $$;

create function public.claim_alimtalk_refund(p_admin_id uuid,p_request_id uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.alimtalk_refund_requests; w public.alimtalk_wallets;
begin
  perform 1 from public.admin_users where user_id=p_admin_id;
  if not found then raise exception using errcode='42501',message='WALLET_ADMIN_REQUIRED'; end if;
  select * into r from public.alimtalk_refund_requests where id=p_request_id;
  if not found then raise exception 'WALLET_REFUND_MISSING'; end if;
  select * into w from public.alimtalk_wallets where owner_id=r.owner_id for update;
  select * into r from public.alimtalk_refund_requests where id=p_request_id for update;
  if w.frozen or r.state='review' then raise exception 'WALLET_FROZEN'; end if;
  if r.state='processing' then
    if r.processed_by is distinct from p_admin_id then raise exception 'WALLET_REFUND_ASSIGNED'; end if;
    return;
  end if;
  if r.state<>'requested' then raise exception 'WALLET_REFUND_PROCESSING'; end if;
  update public.alimtalk_refund_requests set state='processing',processed_by=p_admin_id,processing_at=clock_timestamp() where id=r.id;
end; $$;

-- No PG cancellation API is called here. Only a verified cumulative cancellation
-- from the original payment can settle an admin-claimed refund allocation.
create function public.reconcile_alimtalk_refund(p_payment_id text,p_verified_cancelled integer)
returns text language plpgsql security invoker set search_path='' as $$
declare t public.alimtalk_topups; w public.alimtalk_wallets; r public.alimtalk_refund_requests; line public.alimtalk_refund_payments; delta integer;
begin
  select * into t from public.alimtalk_topups where payment_id=p_payment_id;
  if not found then raise exception 'WALLET_PAYMENT_MISMATCH'; end if;
  perform 1 from public.alimtalk_wallets where owner_id=t.owner_id for update;
  select * into t from public.alimtalk_topups where payment_id=p_payment_id for update;
  if p_verified_cancelled is null or p_verified_cancelled<0 or p_verified_cancelled>t.amount then raise exception 'WALLET_PAYMENT_MISMATCH'; end if;
  if p_verified_cancelled<=t.refunded_amount then return 'unchanged'; end if;
  select p.* into line from public.alimtalk_refund_payments p join public.alimtalk_refund_requests q on q.id=p.refund_id
    where p.payment_id=p_payment_id and q.state='processing' and p.refunded_amount<p.amount;
  if not found then perform public.flag_alimtalk_topup_review(p_payment_id); return 'review'; end if;
  select * into r from public.alimtalk_refund_requests where id=line.refund_id for update;
  if t.credited_at is null or t.state<>'credited' or p_verified_cancelled>line.baseline_cancelled+line.amount then
    perform public.flag_alimtalk_topup_review(p_payment_id); return 'review';
  end if;
  delta:=p_verified_cancelled-t.refunded_amount;
  if delta>line.amount-line.refunded_amount then perform public.flag_alimtalk_topup_review(p_payment_id); return 'review'; end if;
  update public.alimtalk_wallets set balance=balance-delta,reserved=reserved-delta,updated_at=clock_timestamp()
    where owner_id=t.owner_id returning * into w;
  update public.alimtalk_topups set refunded_amount=p_verified_cancelled where payment_id=p_payment_id;
  update public.alimtalk_refund_payments set refunded_amount=refunded_amount+delta where refund_id=line.refund_id and payment_id=p_payment_id;
  update public.alimtalk_refund_requests set refunded_amount=refunded_amount+delta,
    state=case when refunded_amount+delta=amount then 'completed' else 'processing' end,
    resolved_at=case when refunded_amount+delta=amount then clock_timestamp() else null end where id=r.id;
  insert into public.alimtalk_wallet_entries(owner_id,menu_site_id,kind,amount,balance_after,reserved_after,refund_id,payment_id)
    values(t.owner_id,r.menu_site_id,'refund',delta,w.balance,w.reserved,r.id,p_payment_id);
  return 'expected';
end; $$;

revoke all on function public.create_alimtalk_topup(uuid,uuid,text,integer,text,text,text,integer),
 public.request_alimtalk_refund(uuid,uuid,uuid,integer,text),public.cancel_alimtalk_refund(uuid,uuid),
 public.claim_alimtalk_refund(uuid,uuid),public.reconcile_alimtalk_refund(text,integer) from public,anon,authenticated;
grant execute on function public.create_alimtalk_topup(uuid,uuid,text,integer,text,text,text,integer),
 public.request_alimtalk_refund(uuid,uuid,uuid,integer,text),public.cancel_alimtalk_refund(uuid,uuid),
 public.claim_alimtalk_refund(uuid,uuid),public.reconcile_alimtalk_refund(text,integer) to service_role;
grant select on public.admin_users to service_role;
notify pgrst,'reload schema';
commit;
