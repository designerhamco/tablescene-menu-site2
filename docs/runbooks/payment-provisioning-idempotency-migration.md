# Payment Provisioning Idempotency Migration

This runbook applies `supabase/migrations/20260805103153_add_payment_provisioning_idempotency.sql` manually in the Supabase SQL Editor.

Do not use `supabase db push` or `supabase migration up --linked`. Do not continue if a duplicate count, non-canonical key count, or pre-existing target index count is non-zero.

## Application Record

- Applied on: 2026-08-05
- Method: manual execution in the Supabase SQL Editor
- Migration: `supabase/migrations/20260805103153_add_payment_provisioning_idempotency.sql`
- Pre-apply duplicate and non-canonical key checks: PASS
- Post-apply verification: all eight indexes are unique, valid, and match the migration definitions
- Legacy compatibility: one subscription linked to three distinct menu sites remains valid
- Existing incomplete orders: three rows remain unchanged for a separate read-only operations audit
- Type generation: not required because the schema shape did not change
- `supabase db push` and `supabase migration up --linked` were not used

## Scope

- One approved non-empty `payment_id` maps to one order and one payment record.
- One non-empty provider payment ID maps to one payment and one initial subscription.
- One order maps to one payment record.
- One subscription/menu pair maps to one entitlement row.
- One `payment_complete` provisioning key maps to one menu site.
- One business subscription provisioning key maps to one menu site.
- Legacy subscriptions may still point to multiple different menu sites.
- No customer row is updated, deleted, recovered, or archived by this migration.

## 1. Pre-Apply Verification

Run each query in this section before applying the migration. Do not select customer names, email addresses, phone numbers, or raw payloads.

### 1.1 Baseline and non-empty key counts

```sql
select
  (select count(*) from public.orders) as orders,
  (select count(*) from public.orders where nullif(btrim(payment_id), '') is not null) as order_payment_keys,
  (select count(*) from public.payments) as payments,
  (select count(*) from public.payments where nullif(btrim(payment_id), '') is not null) as payment_keys,
  (select count(*) from public.payments where nullif(btrim(portone_payment_id), '') is not null) as payment_provider_keys,
  (select count(*) from public.payments where order_id is not null) as payment_order_links,
  (select count(*) from public.business_subscriptions) as subscriptions,
  (select count(*) from public.business_subscriptions where nullif(btrim(portone_payment_id), '') is not null) as subscription_provider_keys,
  (select count(*) from public.service_entitlements) as entitlements,
  (select count(*) from public.service_entitlements where subscription_id is not null and menu_site_id is not null) as entitlement_pairs,
  (select count(*) from public.menu_sites) as menu_sites,
  (select count(*) from public.menu_sites
    where settings ->> 'source' = 'payment_complete'
      and nullif(btrim(settings ->> 'payment_id'), '') is not null) as payment_provisioning_keys,
  (select count(*) from public.menu_sites
    where settings ->> 'source' in ('business_subscription', 'business_subscription_conversion')
      and nullif(btrim(settings ->> 'subscription_id'), '') is not null) as subscription_provisioning_keys;
```

### 1.2 Non-canonical whitespace counts

Every result must be `0`. Provider IDs are case-sensitive and are not lowercased.

```sql
select
  (select count(*) from public.orders
    where payment_id is not null and payment_id <> btrim(payment_id)) as order_payment_key_whitespace,
  (select count(*) from public.payments
    where payment_id is not null and payment_id <> btrim(payment_id)) as payment_key_whitespace,
  (select count(*) from public.payments
    where portone_payment_id is not null and portone_payment_id <> btrim(portone_payment_id)) as payment_provider_key_whitespace,
  (select count(*) from public.business_subscriptions
    where portone_payment_id is not null and portone_payment_id <> btrim(portone_payment_id)) as subscription_provider_key_whitespace,
  (select count(*) from public.menu_sites
    where nullif(settings ->> 'payment_id', '') is not null
      and settings ->> 'payment_id' <> btrim(settings ->> 'payment_id')) as menu_payment_key_whitespace,
  (select count(*) from public.menu_sites
    where nullif(settings ->> 'subscription_id', '') is not null
      and settings ->> 'subscription_id' <> btrim(settings ->> 'subscription_id')) as menu_subscription_key_whitespace;
```

### 1.3 Duplicate groups

Every result must be `0`. These expressions and predicates are identical to the migration contract.

```sql
select
  (select count(*) from (
    select btrim(payment_id) from public.orders
    where nullif(btrim(payment_id), '') is not null
    group by btrim(payment_id) having count(*) > 1
  ) duplicates) as duplicate_order_payment_ids,
  (select count(*) from (
    select btrim(payment_id) from public.payments
    where nullif(btrim(payment_id), '') is not null
    group by btrim(payment_id) having count(*) > 1
  ) duplicates) as duplicate_payment_payment_ids,
  (select count(*) from (
    select btrim(portone_payment_id) from public.payments
    where nullif(btrim(portone_payment_id), '') is not null
    group by btrim(portone_payment_id) having count(*) > 1
  ) duplicates) as duplicate_payment_portone_ids,
  (select count(*) from (
    select order_id from public.payments
    where order_id is not null
    group by order_id having count(*) > 1
  ) duplicates) as duplicate_payment_order_ids,
  (select count(*) from (
    select btrim(portone_payment_id) from public.business_subscriptions
    where nullif(btrim(portone_payment_id), '') is not null
    group by btrim(portone_payment_id) having count(*) > 1
  ) duplicates) as duplicate_subscription_portone_ids,
  (select count(*) from (
    select subscription_id, menu_site_id from public.service_entitlements
    where subscription_id is not null and menu_site_id is not null
    group by subscription_id, menu_site_id having count(*) > 1
  ) duplicates) as duplicate_entitlement_pairs,
  (select count(*) from (
    select btrim(settings ->> 'payment_id') from public.menu_sites
    where settings ->> 'source' = 'payment_complete'
      and nullif(btrim(settings ->> 'payment_id'), '') is not null
    group by btrim(settings ->> 'payment_id') having count(*) > 1
  ) duplicates) as duplicate_payment_provisioning_keys,
  (select count(*) from (
    select btrim(settings ->> 'subscription_id') from public.menu_sites
    where settings ->> 'source' in ('business_subscription', 'business_subscription_conversion')
      and nullif(btrim(settings ->> 'subscription_id'), '') is not null
    group by btrim(settings ->> 'subscription_id') having count(*) > 1
  ) duplicates) as duplicate_subscription_provisioning_keys;
```

### 1.4 Existing target index names

This must return `0` rows before the first apply. If a row exists, stop and inspect its definition instead of relying on `IF NOT EXISTS`.

```sql
select schemaname, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and indexname in (
    'orders_payment_id_unique_idx',
    'payments_payment_id_unique_idx',
    'payments_portone_payment_id_unique_idx',
    'payments_order_id_unique_idx',
    'business_subscriptions_portone_payment_id_unique_idx',
    'service_entitlements_subscription_menu_unique_idx',
    'menu_sites_payment_provisioning_key_unique_idx',
    'menu_sites_subscription_provisioning_key_unique_idx'
  )
order by indexname;
```

### 1.5 Incomplete orders

This query reports only aggregate state. The migration does not modify these rows.

```sql
with duplicate_order_keys as (
  select btrim(payment_id) as payment_key
  from public.orders
  where nullif(btrim(payment_id), '') is not null
  group by btrim(payment_id)
  having count(*) > 1
)
select
  count(*) filter (where menu_site_id is null) as incomplete_orders,
  count(*) filter (
    where menu_site_id is null and nullif(btrim(payment_id), '') is not null
  ) as incomplete_orders_with_payment_key,
  count(*) filter (
    where menu_site_id is null and nullif(btrim(payment_id), '') is null
  ) as incomplete_orders_without_payment_key,
  count(*) filter (
    where menu_site_id is null
      and btrim(payment_id) in (select payment_key from duplicate_order_keys)
  ) as incomplete_orders_with_duplicate_key
from public.orders;
```

### 1.6 Legacy multi-menu subscription compatibility

The known legacy subscription should remain represented as one subscription with three distinct menu sites. No subscription ID is printed.

```sql
with subscription_menu_counts as (
  select subscription_id, count(distinct menu_site_id) as menu_site_count
  from public.service_entitlements
  where subscription_id is not null and menu_site_id is not null
  group by subscription_id
)
select
  count(*) filter (where menu_site_count > 1) as multi_menu_subscription_count,
  coalesce(max(menu_site_count), 0) as maximum_menu_sites_for_one_subscription
from subscription_menu_counts;
```

Expected pre-apply results:

- All duplicate group counts: `0`
- All whitespace counts: `0`
- Existing target index rows: `0`
- Incomplete orders: recorded for follow-up, with duplicate-key count `0`
- Multi-menu relationship: allowed; the known legacy maximum remains `3`

## 2. SQL Editor Manual Apply

Open one new SQL Editor query and run this complete block exactly once. It is identical to `supabase/migrations/20260805103153_add_payment_provisioning_idempotency.sql`.

```sql
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
```

`Success. No rows returned` is expected. If any statement errors, do not rerun the block. Save the exact error and stop.

## 3. Post-Apply Verification

### 3.1 Index validity and exact definitions

This query must return exactly eight rows. Every row must have `indisunique = true` and `indisvalid = true`.

```sql
select
  namespace.nspname as schema_name,
  index_class.relname as index_name,
  index_meta.indisunique,
  index_meta.indisvalid,
  pg_get_indexdef(index_meta.indexrelid) as index_definition
from pg_index index_meta
join pg_class index_class on index_class.oid = index_meta.indexrelid
join pg_namespace namespace on namespace.oid = index_class.relnamespace
where namespace.nspname = 'public'
  and index_class.relname in (
    'orders_payment_id_unique_idx',
    'payments_payment_id_unique_idx',
    'payments_portone_payment_id_unique_idx',
    'payments_order_id_unique_idx',
    'business_subscriptions_portone_payment_id_unique_idx',
    'service_entitlements_subscription_menu_unique_idx',
    'menu_sites_payment_provisioning_key_unique_idx',
    'menu_sites_subscription_provisioning_key_unique_idx'
  )
order by index_class.relname;
```

Confirm that each `index_definition` matches the expressions and predicates in the manual apply block. In particular, text and JSON keys must use `btrim(...)` with a non-empty predicate.

### 3.2 Data invariance

Re-run sections 1.1, 1.2, 1.3, 1.5, and 1.6. Expected:

- Baseline row counts unchanged
- Duplicate group counts remain `0`
- Whitespace counts remain `0`
- Incomplete order counts unchanged
- Legacy multi-menu counts unchanged
- No customer row was updated or deleted

## 4. Emergency Rollback Reference

Use only after explicit approval. Dropping indexes removes concurrency protection but does not modify customer rows.

```sql
drop index if exists public.menu_sites_subscription_provisioning_key_unique_idx;
drop index if exists public.menu_sites_payment_provisioning_key_unique_idx;
drop index if exists public.service_entitlements_subscription_menu_unique_idx;
drop index if exists public.business_subscriptions_portone_payment_id_unique_idx;
drop index if exists public.payments_order_id_unique_idx;
drop index if exists public.payments_portone_payment_id_unique_idx;
drop index if exists public.payments_payment_id_unique_idx;
drop index if exists public.orders_payment_id_unique_idx;
```

No generated Supabase type update is required because this migration changes only indexes and does not add or alter columns, enums, relations, or RPC signatures.
