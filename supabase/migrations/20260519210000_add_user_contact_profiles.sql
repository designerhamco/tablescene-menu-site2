create table if not exists public.user_contact_profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  contact_name text not null,
  contact_phone text,
  notification_email text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint user_contact_profiles_contact_name_length_check
    check (char_length(trim(contact_name)) between 1 and 50),
  constraint user_contact_profiles_contact_phone_check
    check (
      contact_phone is null
      or contact_phone = ''
      or contact_phone ~ '^[0-9\-\s]{0,30}$'
    ),
  constraint user_contact_profiles_notification_email_length_check
    check (char_length(notification_email) <= 254),
  constraint user_contact_profiles_notification_email_format_check
    check (notification_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);

create or replace function public.set_user_contact_profiles_updated_at()
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
  if not exists (
    select 1 from pg_trigger
    where tgname = 'set_user_contact_profiles_updated_at'
  ) then
    create trigger set_user_contact_profiles_updated_at
    before update on public.user_contact_profiles
    for each row execute function public.set_user_contact_profiles_updated_at();
  end if;
end $$;

alter table public.user_contact_profiles enable row level security;

grant select, insert, update on public.user_contact_profiles to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_contact_profiles'
      and policyname = 'user contact profiles owner select'
  ) then
    create policy "user contact profiles owner select"
    on public.user_contact_profiles
    for select to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_contact_profiles'
      and policyname = 'user contact profiles owner insert'
  ) then
    create policy "user contact profiles owner insert"
    on public.user_contact_profiles
    for insert to authenticated
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_contact_profiles'
      and policyname = 'user contact profiles owner update'
  ) then
    create policy "user contact profiles owner update"
    on public.user_contact_profiles
    for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;

notify pgrst, 'reload schema';
