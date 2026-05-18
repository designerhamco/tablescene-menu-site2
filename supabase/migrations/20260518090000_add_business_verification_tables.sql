create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_registration_number text not null,
  business_name text,
  representative_name text not null,
  opening_date date,
  business_status text,
  tax_type text,
  verification_status text not null default 'verified',
  verification_source text not null default 'nts',
  verified_at timestamptz,
  last_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_profiles_registration_number_digits_check
    check (business_registration_number ~ '^[0-9]{10}$'),
  constraint business_profiles_verification_status_check
    check (verification_status in ('verified', 'failed', 'expired', 'pending'))
);

create unique index if not exists business_profiles_user_id_key
on public.business_profiles(user_id);

create index if not exists business_profiles_registration_number_idx
on public.business_profiles(business_registration_number);

create table if not exists public.business_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  business_profile_id uuid references public.business_profiles(id) on delete set null,
  request_type text not null,
  request_payload jsonb,
  response_payload jsonb,
  result text not null,
  error_message text,
  created_at timestamptz not null default now(),
  constraint business_verifications_result_check
    check (result in ('verified', 'failed', 'error'))
);

create index if not exists business_verifications_user_id_idx
on public.business_verifications(user_id, created_at desc);

create index if not exists business_verifications_business_profile_id_idx
on public.business_verifications(business_profile_id);

create or replace function public.set_business_profiles_updated_at()
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
  if not exists (select 1 from pg_trigger where tgname = 'set_business_profiles_updated_at') then
    create trigger set_business_profiles_updated_at before update on public.business_profiles
    for each row execute function public.set_business_profiles_updated_at();
  end if;
end $$;

revoke all privileges on public.business_profiles, public.business_verifications from anon, authenticated;

grant usage on schema public to service_role;
grant select on public.business_profiles to authenticated;
grant select, insert, update on public.business_profiles to service_role;
grant insert on public.business_verifications to service_role;

alter table public.business_profiles enable row level security;
alter table public.business_verifications enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_profiles'
      and policyname = 'business profiles owner select'
  ) then
    create policy "business profiles owner select"
    on public.business_profiles for select to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_profiles'
      and policyname = 'business profiles service role select'
  ) then
    create policy "business profiles service role select"
    on public.business_profiles for select to service_role
    using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_profiles'
      and policyname = 'business profiles service role insert'
  ) then
    create policy "business profiles service role insert"
    on public.business_profiles for insert to service_role
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_profiles'
      and policyname = 'business profiles service role update'
  ) then
    create policy "business profiles service role update"
    on public.business_profiles for update to service_role
    using (true)
    with check (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'business_verifications'
      and policyname = 'business verifications service role insert'
  ) then
    create policy "business verifications service role insert"
    on public.business_verifications for insert to service_role
    with check (true);
  end if;
end $$;
