alter table public.business_subscriptions
  add column if not exists cancel_at_period_end boolean not null default false,
  add column if not exists cancel_requested_at timestamptz,
  add column if not exists canceled_at timestamptz,
  add column if not exists cancellation_reason text,
  add column if not exists current_period_start timestamptz,
  add column if not exists current_period_end timestamptz;

create index if not exists business_subscriptions_cancel_at_period_end_idx
on public.business_subscriptions(cancel_at_period_end)
where cancel_at_period_end = true;

comment on column public.business_subscriptions.cancel_at_period_end is
  'When true, the next renewal should be skipped by the future subscription renewal cron.';

comment on column public.business_subscriptions.current_period_end is
  'End of the currently paid period. Falls back to next_billing_at when null.';
