create table if not exists public.notification_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid references public.menu_sites(id) on delete set null,
  subscription_id uuid references public.business_subscriptions(id) on delete set null,
  event_type text not null,
  channel text not null default 'email',
  title text not null,
  message text not null,
  status text not null default 'pending',
  scheduled_for timestamptz,
  sent_at timestamptz,
  read_at timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint notification_events_event_type_check
    check (event_type in (
      'subscription_expiring_soon',
      'subscription_expired',
      'payment_failed',
      'data_retention_ending_soon',
      'data_deletion_scheduled',
      'data_deleted',
      'account_deletion_requested',
      'account_data_deletion_scheduled',
      'account_deleted',
      'terms_updated',
      'security_notice',
      'service_incident'
    )),
  constraint notification_events_channel_check
    check (channel in ('in_app', 'email')),
  constraint notification_events_status_check
    check (status in ('pending', 'sent', 'failed', 'skipped', 'read'))
);

create index if not exists notification_events_user_created_idx
on public.notification_events(user_id, created_at desc);

create index if not exists notification_events_status_scheduled_idx
on public.notification_events(status, scheduled_for);

create unique index if not exists notification_events_period_key_uidx
on public.notification_events(
  user_id,
  coalesce(menu_site_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(subscription_id, '00000000-0000-0000-0000-000000000000'::uuid),
  event_type,
  channel,
  (metadata->>'period_key')
)
where metadata ? 'period_key';

create or replace function public.set_notification_events_updated_at()
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
    where tgname = 'set_notification_events_updated_at'
  ) then
    create trigger set_notification_events_updated_at
    before update on public.notification_events
    for each row execute function public.set_notification_events_updated_at();
  end if;
end $$;

revoke all privileges on public.notification_events from anon, authenticated;

grant select, update on public.notification_events to authenticated;
grant select, insert, update on public.notification_events to service_role;

alter table public.notification_events enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_events'
      and policyname = 'notification events owner select'
  ) then
    create policy "notification events owner select"
    on public.notification_events for select to authenticated
    using (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_events'
      and policyname = 'notification events owner read update'
  ) then
    create policy "notification events owner read update"
    on public.notification_events for update to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notification_events'
      and policyname = 'notification events service role all'
  ) then
    create policy "notification events service role all"
    on public.notification_events for all to service_role
    using (true)
    with check (true);
  end if;
end $$;

notify pgrst, 'reload schema';
