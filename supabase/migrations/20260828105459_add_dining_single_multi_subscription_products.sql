begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.business_subscriptions
  add constraint business_subscriptions_product_key_check_v2
  check (
    product_key in (
      'business_basic_monthly',
      'business_basic_yearly',
      'business_basic_single_monthly',
      'business_basic_single_yearly',
      'business_basic_multi_monthly',
      'business_basic_multi_yearly',
      'business_display_monthly',
      'business_display_yearly'
    )
  ) not valid;

alter table public.business_subscriptions
  validate constraint business_subscriptions_product_key_check_v2;

alter table public.business_subscriptions
  drop constraint business_subscriptions_product_key_check;

alter table public.business_subscriptions
  rename constraint business_subscriptions_product_key_check_v2
  to business_subscriptions_product_key_check;

comment on constraint business_subscriptions_product_key_check on public.business_subscriptions is
  'Allows legacy dining subscriptions plus new single-page and multi-page monthly/yearly products.';

commit;
