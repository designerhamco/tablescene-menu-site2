create table if not exists public.business_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid references public.menu_sites(id) on delete set null,
  business_profile_id uuid references public.business_profiles(id) on delete restrict,
  product_key text not null,
  plan_type text not null default 'business_basic',
  billing_cycle text not null,
  billing_key_ref text not null,
  status text not null default 'pending',
  amount integer not null,
  currency text not null default 'KRW',
  portone_payment_id text,
  next_billing_at timestamptz,
  last_paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_subscriptions_product_key_check
    check (product_key in ('business_basic_monthly', 'business_basic_yearly', 'business_display_monthly', 'business_display_yearly')),
  constraint business_subscriptions_plan_type_check
    check (plan_type in ('business_basic', 'business_display')),
  constraint business_subscriptions_billing_cycle_check
    check (billing_cycle in ('monthly', 'yearly')),
  constraint business_subscriptions_status_check
    check (status in ('pending', 'active', 'failed', 'canceled', 'past_due', 'expired'))
);

create index if not exists business_subscriptions_user_id_idx
on public.business_subscriptions(user_id);

create index if not exists business_subscriptions_menu_site_id_idx
on public.business_subscriptions(menu_site_id);

create index if not exists business_subscriptions_business_profile_id_idx
on public.business_subscriptions(business_profile_id);

create unique index if not exists business_subscriptions_active_menu_site_idx
on public.business_subscriptions(menu_site_id)
where status in ('pending', 'active', 'past_due');

create or replace function public.set_business_subscriptions_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_business_subscriptions_updated_at') then
    create trigger set_business_subscriptions_updated_at before update on public.business_subscriptions
    for each row execute function public.set_business_subscriptions_updated_at();
  end if;
end $$;

revoke all privileges on public.business_subscriptions from anon, authenticated;

grant usage on schema public to service_role;
grant select, insert, update on public.business_subscriptions to service_role;

alter table public.business_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_subscriptions'
      and policyname = 'business subscriptions service role select'
  ) then
    create policy "business subscriptions service role select"
    on public.business_subscriptions for select to service_role
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_subscriptions'
      and policyname = 'business subscriptions service role insert'
  ) then
    create policy "business subscriptions service role insert"
    on public.business_subscriptions for insert to service_role
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_subscriptions'
      and policyname = 'business subscriptions service role update'
  ) then
    create policy "business subscriptions service role update"
    on public.business_subscriptions for update to service_role
    using (true)
    with check (true);
  end if;
end $$;
