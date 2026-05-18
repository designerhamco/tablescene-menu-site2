create table if not exists public.service_entitlements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  business_profile_id uuid,
  plan_type text not null,
  billing_type text not null,
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
  constraint service_entitlements_status_check check (status in ('active', 'expired', 'archived', 'pending_delete', 'deleted'))
);

create index if not exists service_entitlements_user_plan_idx
on public.service_entitlements(user_id, plan_type);

create index if not exists service_entitlements_menu_site_idx
on public.service_entitlements(menu_site_id);

create unique index if not exists service_entitlements_one_personal_trial_per_user_idx
on public.service_entitlements(user_id)
where plan_type = 'personal_trial' and status <> 'deleted';

grant select on public.service_entitlements to authenticated;

alter table public.service_entitlements enable row level security;

drop policy if exists "service entitlements owner select" on public.service_entitlements;
create policy "service entitlements owner select"
on public.service_entitlements for select to authenticated
using (user_id = auth.uid());
