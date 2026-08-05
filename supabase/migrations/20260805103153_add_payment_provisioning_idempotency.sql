-- Prevent concurrent retries from provisioning more than one result for the
-- same approved payment or initial subscription purchase.
do $$
begin
  if exists (
    select 1 from public.orders
    where payment_id is not null
      and payment_id <> btrim(payment_id)
  ) or exists (
    select 1 from public.payments
    where (payment_id is not null and payment_id <> btrim(payment_id))
       or (portone_payment_id is not null and portone_payment_id <> btrim(portone_payment_id))
  ) or exists (
    select 1 from public.business_subscriptions
    where portone_payment_id is not null
      and portone_payment_id <> btrim(portone_payment_id)
  ) or exists (
    select 1 from public.menu_sites
    where (nullif(settings ->> 'payment_id', '') is not null and settings ->> 'payment_id' <> btrim(settings ->> 'payment_id'))
       or (nullif(settings ->> 'subscription_id', '') is not null and settings ->> 'subscription_id' <> btrim(settings ->> 'subscription_id'))
  ) then
    raise exception 'Non-canonical provisioning keys with surrounding whitespace must be reviewed before applying this migration';
  end if;

  if exists (
    select 1 from public.orders
    where nullif(btrim(payment_id), '') is not null
    group by btrim(payment_id) having count(*) > 1
  ) then
    raise exception 'Duplicate orders.payment_id values must be resolved before applying this migration';
  end if;

  if exists (
    select 1 from public.payments
    where nullif(btrim(payment_id), '') is not null
    group by btrim(payment_id) having count(*) > 1
  ) then
    raise exception 'Duplicate payments.payment_id values must be resolved before applying this migration';
  end if;

  if exists (
    select 1 from public.payments
    where nullif(btrim(portone_payment_id), '') is not null
    group by btrim(portone_payment_id) having count(*) > 1
  ) then
    raise exception 'Duplicate payments.portone_payment_id values must be resolved before applying this migration';
  end if;

  if exists (
    select 1 from public.payments
    where order_id is not null
    group by order_id having count(*) > 1
  ) then
    raise exception 'Multiple payments for one order must be reviewed before applying this migration';
  end if;

  if exists (
    select 1 from public.business_subscriptions
    where nullif(btrim(portone_payment_id), '') is not null
    group by btrim(portone_payment_id) having count(*) > 1
  ) then
    raise exception 'Duplicate business_subscriptions.portone_payment_id values must be resolved before applying this migration';
  end if;

  if exists (
    select 1 from public.service_entitlements
    where subscription_id is not null
      and menu_site_id is not null
    group by subscription_id, menu_site_id having count(*) > 1
  ) then
    raise exception 'Duplicate entitlement subscription/menu pairs must be resolved before applying this migration';
  end if;

  if exists (
    select 1 from public.menu_sites
    where settings ->> 'source' = 'payment_complete'
      and nullif(btrim(settings ->> 'payment_id'), '') is not null
    group by btrim(settings ->> 'payment_id') having count(*) > 1
  ) then
    raise exception 'Duplicate payment_complete provisioning keys must be resolved before applying this migration';
  end if;

  if exists (
    select 1 from public.menu_sites
    where settings ->> 'source' in ('business_subscription', 'business_subscription_conversion')
      and nullif(btrim(settings ->> 'subscription_id'), '') is not null
    group by btrim(settings ->> 'subscription_id') having count(*) > 1
  ) then
    raise exception 'Duplicate business subscription provisioning keys must be resolved before applying this migration';
  end if;
end
$$;

create unique index if not exists orders_payment_id_unique_idx
  on public.orders (btrim(payment_id))
  where nullif(btrim(payment_id), '') is not null;

create unique index if not exists payments_payment_id_unique_idx
  on public.payments (btrim(payment_id))
  where nullif(btrim(payment_id), '') is not null;

create unique index if not exists payments_portone_payment_id_unique_idx
  on public.payments (btrim(portone_payment_id))
  where nullif(btrim(portone_payment_id), '') is not null;

create unique index if not exists payments_order_id_unique_idx
  on public.payments (order_id)
  where order_id is not null;

create unique index if not exists business_subscriptions_portone_payment_id_unique_idx
  on public.business_subscriptions (btrim(portone_payment_id))
  where nullif(btrim(portone_payment_id), '') is not null;

create unique index if not exists service_entitlements_subscription_menu_unique_idx
  on public.service_entitlements (subscription_id, menu_site_id)
  where subscription_id is not null
    and menu_site_id is not null;

create unique index if not exists menu_sites_payment_provisioning_key_unique_idx
  on public.menu_sites (btrim(settings ->> 'payment_id'))
  where settings ->> 'source' = 'payment_complete'
    and nullif(btrim(settings ->> 'payment_id'), '') is not null;

create unique index if not exists menu_sites_subscription_provisioning_key_unique_idx
  on public.menu_sites (btrim(settings ->> 'subscription_id'))
  where settings ->> 'source' in ('business_subscription', 'business_subscription_conversion')
    and nullif(btrim(settings ->> 'subscription_id'), '') is not null;

comment on index public.service_entitlements_subscription_menu_unique_idx is
  'Prevents duplicate entitlement rows for the same subscription and menu while preserving legacy subscriptions linked to multiple menus.';
