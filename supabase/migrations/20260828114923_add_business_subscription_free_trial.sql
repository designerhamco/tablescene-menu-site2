alter table public.business_subscriptions
  add column if not exists trial_started_at timestamptz,
  add column if not exists trial_ends_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_subscriptions_trial_period_check'
      and conrelid = 'public.business_subscriptions'::regclass
  ) then
    alter table public.business_subscriptions
      add constraint business_subscriptions_trial_period_check
      check (
        (trial_started_at is null and trial_ends_at is null)
        or (
          trial_started_at is not null
          and trial_ends_at is not null
          and trial_ends_at > trial_started_at
        )
      );
  end if;
end
$$;

create unique index if not exists business_subscriptions_one_free_trial_per_user_idx
  on public.business_subscriptions (user_id)
  where trial_started_at is not null;

comment on column public.business_subscriptions.trial_started_at is
  'Account-level first paid-subscription trial start. Presence permanently consumes the one-time free trial.';

comment on column public.business_subscriptions.trial_ends_at is
  'Exclusive end and first billing boundary for the 30-day free trial.';
