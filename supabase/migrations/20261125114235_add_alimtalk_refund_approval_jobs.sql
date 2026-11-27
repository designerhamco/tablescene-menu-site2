begin;

-- This migration prepares refunds; it deliberately does not enable execution.
alter table public.alimtalk_billing_policy
  add column refund_execution_enabled boolean not null default false,
  add constraint alimtalk_refund_execution_review_check check (
    not refund_execution_enabled or (pg_reviewed_at is not null and
      nullif(approved_store_id,'') is not null and nullif(approved_channel_key,'') is not null));
alter table public.alimtalk_refund_requests
  add column approved_by uuid references auth.users(id),
  add column approved_at timestamptz,
  add constraint alimtalk_refund_approval_pair check ((approved_by is null)=(approved_at is null));

create table public.alimtalk_refund_jobs (
  id uuid primary key default gen_random_uuid(),
  refund_id uuid not null,
  payment_id text not null,
  before_cancelled integer not null check (before_cancelled>=0),
  target_cancelled integer not null check (target_cancelled>before_cancelled),
  state text not null default 'queued' check (state in ('queued','submitting','pending','completed','review')),
  created_at timestamptz not null default clock_timestamp(),
  submission_started_at timestamptz,
  checked_at timestamptz,
  last_error_code text check (length(last_error_code)<=80),
  unique(refund_id,payment_id),
  foreign key(refund_id,payment_id) references public.alimtalk_refund_payments(refund_id,payment_id),
  check (state not in ('submitting','pending') or submission_started_at is not null)
);
create index alimtalk_refund_jobs_pending_idx on public.alimtalk_refund_jobs(state,checked_at,created_at)
  where state in ('queued','submitting','pending');
alter table public.alimtalk_refund_jobs enable row level security;
revoke all on public.alimtalk_refund_jobs from public,anon,authenticated,service_role;
grant select on public.alimtalk_refund_jobs to service_role;
-- Immutable payment/amount/idempotency snapshots may only be created by approval.
grant update(state,checked_at,last_error_code) on public.alimtalk_refund_jobs to service_role;

create function public.approve_alimtalk_refund(p_admin_id uuid,p_request_id uuid,p_expected_remaining integer)
returns void language plpgsql security invoker set search_path='' as $$
declare r public.alimtalk_refund_requests; w public.alimtalk_wallets;
begin
  perform 1 from public.admin_users where user_id=p_admin_id;
  if not found then raise exception using errcode='42501',message='WALLET_ADMIN_REQUIRED'; end if;
  perform 1 from public.alimtalk_billing_policy where id and refund_execution_enabled and pg_reviewed_at is not null
    and nullif(approved_store_id,'') is not null and nullif(approved_channel_key,'') is not null;
  if not found then raise exception 'WALLET_REFUND_DISABLED'; end if;
  select * into r from public.alimtalk_refund_requests where id=p_request_id;
  if not found then raise exception 'WALLET_REFUND_MISSING'; end if;
  select * into w from public.alimtalk_wallets where owner_id=r.owner_id for update;
  if not found then raise exception 'WALLET_REFUND_FUNDING'; end if;
  select * into r from public.alimtalk_refund_requests where id=p_request_id for update;
  if r.approved_by is not null then
    if r.approved_by<>p_admin_id then raise exception 'WALLET_REFUND_ASSIGNED'; end if;
    return;
  end if;
  if w.frozen or r.state='review' then raise exception 'WALLET_FROZEN'; end if;
  if r.state not in ('requested','processing') then raise exception 'WALLET_REFUND_PROCESSING'; end if;
  if r.processed_by is not null and r.processed_by<>p_admin_id then raise exception 'WALLET_REFUND_ASSIGNED'; end if;
  if p_expected_remaining is distinct from r.amount-r.refunded_amount or p_expected_remaining<=0 then raise exception 'WALLET_REFUND_STALE'; end if;
  if w.reserved<r.amount-r.refunded_amount then raise exception 'WALLET_REFUND_FUNDING'; end if;
  if exists(select 1 from public.alimtalk_refund_payments p join public.alimtalk_topups t using(payment_id)
    where p.refund_id=r.id and p.refunded_amount<p.amount and
      (t.state<>'credited' or t.credited_at is null or t.refunded_amount<>p.baseline_cancelled+p.refunded_amount)) then
    raise exception 'WALLET_REFUND_FUNDING';
  end if;
  update public.alimtalk_refund_requests set state='processing',processed_by=p_admin_id,
    processing_at=coalesce(processing_at,clock_timestamp()),approved_by=p_admin_id,approved_at=clock_timestamp() where id=r.id;
  insert into public.alimtalk_refund_jobs(refund_id,payment_id,before_cancelled,target_cancelled)
    select p.refund_id,p.payment_id,p.baseline_cancelled+p.refunded_amount,p.baseline_cancelled+p.amount
    from public.alimtalk_refund_payments p where p.refund_id=r.id and p.refunded_amount<p.amount;
end; $$;

-- Commit the one permitted submission before any HTTP side effect. A timeout or
-- lost response never puts a job back in queued, even after PortOne's 3h window.
create function private.start_alimtalk_refund_job(p_job_id uuid,p_verified_cancelled integer)
returns boolean language plpgsql security definer set search_path='' as $$
declare j public.alimtalk_refund_jobs; r public.alimtalk_refund_requests; w public.alimtalk_wallets; t public.alimtalk_topups;
begin
  select * into j from public.alimtalk_refund_jobs where id=p_job_id;
  if not found then return false; end if;
  select * into r from public.alimtalk_refund_requests where id=j.refund_id;
  select * into w from public.alimtalk_wallets where owner_id=r.owner_id for update;
  if not found then return false; end if;
  select * into t from public.alimtalk_topups where payment_id=j.payment_id for update;
  select * into r from public.alimtalk_refund_requests where id=j.refund_id for update;
  select * into j from public.alimtalk_refund_jobs where id=p_job_id for update;
  if j.state<>'queued' or j.submission_started_at is not null then return false; end if;
  if w.frozen or r.state<>'processing' or r.approved_at is null then return false; end if;
  perform 1 from public.admin_users where user_id=r.approved_by;
  if not found then return false; end if;
  perform 1 from public.alimtalk_billing_policy where id and refund_execution_enabled and pg_reviewed_at is not null;
  if not found then return false; end if;
  if t.state<>'credited' or t.credited_at is null or t.owner_id<>r.owner_id or
    t.refunded_amount<>j.before_cancelled or j.target_cancelled>t.amount or
    w.reserved<r.amount-r.refunded_amount or p_verified_cancelled is distinct from j.before_cancelled then return false; end if;
  update public.alimtalk_refund_jobs set state='submitting',submission_started_at=clock_timestamp(),checked_at=clock_timestamp() where id=j.id;
  return true;
end; $$;
-- Exposed RPC is invoker-only; the definer and its narrow write privileges live
-- in the private schema. Anonymous/authenticated roles have neither entry point.
create function public.start_alimtalk_refund_job(p_job_id uuid,p_verified_cancelled integer)
returns boolean language sql security invoker set search_path='' as $$
  select private.start_alimtalk_refund_job(p_job_id,p_verified_cancelled);
$$;
revoke all on function public.approve_alimtalk_refund(uuid,uuid,integer),
  public.start_alimtalk_refund_job(uuid,integer),private.start_alimtalk_refund_job(uuid,integer) from public,anon,authenticated;
grant execute on function public.approve_alimtalk_refund(uuid,uuid,integer),
  public.start_alimtalk_refund_job(uuid,integer),private.start_alimtalk_refund_job(uuid,integer) to service_role;
-- Approval is invoker-only and needs these additional columns/tables. The
-- service_role already owns refund-request updates in the existing contract.
grant insert on public.alimtalk_refund_jobs to service_role;
notify pgrst,'reload schema';
commit;
