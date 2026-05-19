alter table public.user_contact_profiles
  drop constraint if exists user_contact_profiles_contact_phone_check;

alter table public.user_contact_profiles
  add constraint user_contact_profiles_contact_phone_check
  check (
    contact_phone is null
    or contact_phone = ''
    or contact_phone ~ '^(010-[0-9]{4}-[0-9]{4}|02-[0-9]{3,4}-[0-9]{4}|0[3-9][0-9]-[0-9]{3,4}-[0-9]{4}|1[5-8][0-9]{2}-[0-9]{4})$'
  );

alter table public.user_contact_profiles
  drop constraint if exists user_contact_profiles_notification_email_length_check;

alter table public.user_contact_profiles
  drop constraint if exists user_contact_profiles_notification_email_format_check;

alter table public.user_contact_profiles
  add constraint user_contact_profiles_notification_email_length_check
  check (char_length(notification_email) <= 100);

alter table public.user_contact_profiles
  add constraint user_contact_profiles_notification_email_format_check
  check (
    notification_email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'
    and notification_email !~ '[[:space:]]'
  );

notify pgrst, 'reload schema';
