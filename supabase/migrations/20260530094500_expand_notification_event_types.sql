begin;

alter table public.notification_events
  drop constraint if exists notification_events_event_type_check;

alter table public.notification_events
  add constraint notification_events_event_type_check
  check (event_type in (
    'inquiry_submitted',
    'inquiry_answered',
    'payment_paid',
    'payment_failed',
    'ai_credit_purchased',
    'menu_site_created',
    'business_subscription_started',
    'business_subscription_converted',
    'menu_site_restored',
    'cancellation_scheduled',
    'subscription_expiring_soon',
    'subscription_expired',
    'personal_trial_expiring_soon',
    'subscription_access_ending_soon',
    'data_retention_started',
    'data_retention_ending_soon',
    'data_retention_ended',
    'data_deletion_scheduled',
    'data_deleted',
    'account_deletion_requested',
    'account_data_deletion_scheduled',
    'account_deleted',
    'terms_updated',
    'security_notice',
    'service_incident',
    'test_email'
  ));

notify pgrst, 'reload schema';

commit;
