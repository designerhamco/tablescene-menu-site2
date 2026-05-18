create table if not exists public.service_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  business_profile_id uuid,
  product_key text,
  plan_key text,
  plan_type text not null,
  billing_type text not null,
  billing_cycle text,
  subscription_id uuid,
  status text not null default 'active',
  access_starts_at timestamptz not null default now(),
  access_expires_at timestamptz,
  expired_at timestamptz,
  data_retention_until timestamptz,
  deleted_scheduled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint service_entitlements_plan_type_check check (plan_type in ('personal_trial', 'business_basic', 'business_display')),
  constraint service_entitlements_billing_type_check check (billing_type in ('one_time', 'subscription')),
  constraint service_entitlements_billing_cycle_check check (billing_cycle is null or billing_cycle in ('trial_1_month', 'monthly', 'yearly')),
  constraint service_entitlements_status_check check (status in ('active', 'expired', 'archived', 'pending_delete', 'deleted'))
);

alter table public.service_entitlements
add column if not exists product_key text,
add column if not exists plan_key text,
add column if not exists billing_cycle text,
add column if not exists subscription_id uuid;

alter table public.service_entitlements
drop constraint if exists service_entitlements_billing_cycle_check;

alter table public.service_entitlements
add constraint service_entitlements_billing_cycle_check
check (billing_cycle is null or billing_cycle in ('trial_1_month', 'monthly', 'yearly'));

create index if not exists service_entitlements_user_plan_idx
on public.service_entitlements(user_id, plan_type);

create index if not exists service_entitlements_menu_site_idx
on public.service_entitlements(menu_site_id);

create index if not exists service_entitlements_product_key_idx
on public.service_entitlements(product_key);

create index if not exists service_entitlements_subscription_id_idx
on public.service_entitlements(subscription_id);

create unique index if not exists service_entitlements_one_personal_trial_per_user_idx
on public.service_entitlements(user_id)
where plan_type = 'personal_trial' and status <> 'deleted';

grant select on public.service_entitlements to authenticated;
grant usage on schema public to service_role;
grant select, insert, update on public.service_entitlements to service_role;

alter table public.service_entitlements enable row level security;

drop policy if exists "service entitlements owner select" on public.service_entitlements;
create policy "service entitlements owner select"
on public.service_entitlements for select to authenticated
using (user_id = auth.uid());
