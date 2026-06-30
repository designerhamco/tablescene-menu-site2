create table if not exists public.refund_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete restrict,
  menu_site_id uuid references public.menu_sites(id) on delete set null,
  business_subscription_id uuid references public.business_subscriptions(id) on delete set null,
  service_entitlement_id uuid references public.service_entitlements(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  payment_id uuid references public.payments(id) on delete set null,
  portone_payment_id text,
  product_key text not null,
  service_type text,
  currency text not null default 'KRW',
  billing_cycle text not null,
  request_type text not null default 'midterm_refund',
  status text not null default 'draft',
  calculation_version text not null default 'yearly_discount_clawback_v1',
  refund_basis_date timestamptz not null,
  paid_amount integer not null,
  monthly_list_price integer not null,
  annual_price integer not null,
  used_days integer not null,
  total_days integer not null,
  monthly_basis_used_amount integer not null,
  annual_basis_used_amount integer not null,
  discount_clawback_amount integer not null,
  estimated_refund_amount integer not null,
  final_refund_amount integer,
  customer_reason text,
  failure_reason text,
  admin_note text,
  metadata jsonb,
  idempotency_key text,
  portone_cancel_id text,
  portone_response jsonb,
  quoted_at timestamptz,
  requested_at timestamptz,
  confirmed_at timestamptz,
  processed_at timestamptz,
  canceled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint refund_requests_status_check check (
    status in ('draft', 'quoted', 'requested', 'processing', 'completed', 'failed', 'needs_review', 'canceled')
  ),
  constraint refund_requests_request_type_check check (
    request_type in ('midterm_refund', 'duplicate_payment', 'service_fault', 'mistaken_payment')
  ),
  constraint refund_requests_billing_cycle_check check (billing_cycle = 'yearly'),
  constraint refund_requests_non_negative_amounts_check check (
    paid_amount >= 0
    and monthly_list_price >= 0
    and annual_price >= 0
    and monthly_basis_used_amount >= 0
    and annual_basis_used_amount >= 0
    and discount_clawback_amount >= 0
    and estimated_refund_amount >= 0
    and (final_refund_amount is null or final_refund_amount >= 0)
  ),
  constraint refund_requests_day_range_check check (
    used_days >= 0
    and total_days > 0
    and used_days <= total_days
  )
);

create index if not exists refund_requests_user_id_created_at_idx
on public.refund_requests(user_id, created_at desc);

create index if not exists refund_requests_menu_site_id_created_at_idx
on public.refund_requests(menu_site_id, created_at desc);

create index if not exists refund_requests_business_subscription_id_idx
on public.refund_requests(business_subscription_id)
where business_subscription_id is not null;

create index if not exists refund_requests_status_idx
on public.refund_requests(status);

create unique index if not exists refund_requests_payment_terminal_or_active_uidx
on public.refund_requests(payment_id)
where payment_id is not null and status in ('requested', 'processing', 'completed', 'needs_review');

create unique index if not exists refund_requests_portone_terminal_or_active_uidx
on public.refund_requests(portone_payment_id)
where portone_payment_id is not null and status in ('requested', 'processing', 'completed', 'needs_review');

create unique index if not exists refund_requests_active_subscription_uidx
on public.refund_requests(business_subscription_id)
where business_subscription_id is not null
  and status in ('requested', 'processing', 'needs_review');

create or replace function public.set_refund_requests_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_refund_requests_updated_at on public.refund_requests;
create trigger set_refund_requests_updated_at
before update on public.refund_requests
for each row
execute function public.set_refund_requests_updated_at();

alter table public.refund_requests enable row level security;

revoke all on public.refund_requests from anon;
revoke all on public.refund_requests from authenticated;
grant select on public.refund_requests to authenticated;
grant all on public.refund_requests to service_role;

create policy "Users can view their own refund requests."
on public.refund_requests
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

comment on table public.refund_requests is
  'Stores quote, request, processing, and completion state for MenuLink yearly subscription refund workflows.';

comment on column public.refund_requests.discount_clawback_amount is
  'Difference between monthly-list-price usage and annual-price prorated usage; used to explain annual discount recalculation.';
