# Service Lifecycle Hard Delete Runbook

This runbook documents the pre-execute checklist for MenuLink service data deletion.

## 1. Lifecycle Policy

MenuLink service lifecycle:

```text
Active service
-> service ended
-> 7-day retention window
-> D-Day remains recoverable
-> the day after D-Day becomes unrecoverable
-> content rows and uploaded images may be deleted
-> service shell, billing, payment, and legal records remain
```

D-Day is the final customer-friendly recovery day. The day after D-Day is the earliest hard-delete eligibility date.

## 2. Holding vs Deleted

Holding:

- Owner preview may remain available.
- Real recovery or conversion CTA may be shown if a flow exists.
- Edit, public menu, and QR access are blocked.

Deleted:

- Owner preview is blocked.
- Linked menu viewing is blocked.
- Edit, public menu, QR, and recovery CTA are blocked.
- Billing/payment detail can remain visible.

## 3. Pending Delete Transition

Retention is based on:

```text
data_retention_until first
deleted_scheduled_at fallback
```

`access_expires_at` is not used as the customer-facing retention D-day.

Cron coverage:

- `app/api/cron/expire-personal-trials/route.ts`
  - expires personal trials
  - moves expired trials to `pending_delete` after D-Day
- `app/api/cron/process-subscriptions/route.ts`
  - processes paid subscription renewal/cancel-at-period-end
  - starts retention for eligible payment issue cases
  - moves business entitlements to `pending_delete` after D-Day

Legacy/stale entitlements with expired access and no retention date should be reported as anomalies, not auto-deleted.

## 4. Dry-Run Command

Default mode is dry-run. It must not delete DB rows, update status, or remove Storage files.

```bash
node --env-file=.env.local scripts/hard-delete-expired-menu-sites.mjs --limit 10
```

Useful allowlist options:

```bash
node --env-file=.env.local scripts/hard-delete-expired-menu-sites.mjs --menu-site-id <menu_site_id>
node --env-file=.env.local scripts/hard-delete-expired-menu-sites.mjs --slug <slug>
```

The dry-run report should be reviewed for:

- `candidateCount`
- `canExecuteSafely`
- `totals.tableCounts`
- `totals.storagePaths`
- `totals.unresolvedErrors`
- each plan's `menuSite.id`, `menuSite.slug`, and `errors`

## 5. Execute Command

Execute is intentionally difficult to trigger:

```bash
node --env-file=.env.local scripts/hard-delete-expired-menu-sites.mjs \
  --execute \
  --confirm HARD_DELETE_EXPIRED_MENU_CONTENT \
  --menu-site-id <menu_site_id>
```

Do not execute unless all checklist items below are satisfied.

## 6. Execute Checklist

Before execute:

- Confirm `git status --short` is clean except intentionally ignored local files.
- Run dry-run with a strict `--menu-site-id` or `--slug` allowlist.
- Confirm `canExecuteSafely: true`.
- Confirm `totals.unresolvedErrors` is empty.
- Confirm no `permission denied` table remains in the dry-run report.
- Confirm `service_entitlements_status_check` permits `deleted` in the remote DB.
- Confirm the candidate is `status = pending_delete`.
- Confirm D-Day has passed in KST.
- Confirm the reported DB row counts match expectations.
- Confirm reported Storage paths are under `menu-sites/<menuSiteId>/`.
- Confirm no `/menu-templates/...`, `/placeholders/...`, or external URL appears as a Storage deletion target.
- Confirm `menu_sites`, `service_entitlements`, `business_subscriptions`, `orders`, and `payments` are not deleted.
- Confirm the user understands this is hard to roll back.

## 7. Permission Denied Policy

If dry-run reports permission denied or unresolved table errors:

```text
execute is forbidden
```

Resolve why the table cannot be selected before attempting execute. Possible causes:

- table exists in local types but not in remote
- table is not exposed through Supabase Data API
- table grants do not allow service role access through PostgREST
- RLS or policy mismatch
- schema cache drift

Do not apply GRANT, RLS, or migration changes as part of a hard-delete execute.

## 8. Remote Constraint Check

Local schema currently allows:

```text
service_entitlements.status in
active, expired, archived, pending_delete, deleted
```

Before execute, confirm the remote DB has the same constraint. If Supabase CLI or catalog access is unavailable, verify manually in Supabase SQL Editor using a read-only catalog query.

Example SQL for manual verification:

```sql
select
  conname,
  pg_get_constraintdef(oid) as definition
from pg_constraint
where conname = 'service_entitlements_status_check';
```

Do not change the constraint during the execute procedure.

## 9. Storage Deletion Notes

Storage deletion is not transactionally tied to DB deletion.

Current policy:

- collect DB image paths and URLs
- collect display settings paths
- optionally list `menu-sites/<menuSiteId>/` prefix
- protect public preset assets and placeholders
- delete DB rows before Storage files
- if DB delete fails, do not remove Storage
- if Storage remove fails, do not mark entitlement as `deleted`

## 10. Preserved Records

Preserve:

- `menu_sites` shell record
- `service_entitlements`
- `business_subscriptions`
- `orders`
- `payments`
- legal/terms records

Hard delete should remove content, not the legal/billing history.

## 11. Content Deletion Scope

Delete content rows tied to the menu site:

- `menu_pages`
- `menu_categories`
- `menu_items`
- `menu_item_price_options`
- `menu_item_traits`
- chef/event/social link rows
- translation rows
- translation jobs
- legacy widget rows if present
- uploaded menu-site Storage files

## 12. Current TODO

- Resolve permission denied / unresolved table access before execute.
- Add an admin detail view for lifecycle state if operational needs grow beyond dashboard counts.
- Consider adding explicit `content_deleted_at`, `hard_deleted_at`, or `deleted_reason` fields in a future schema migration.
- Write a final production execute checklist once remote grants and constraints are confirmed.
