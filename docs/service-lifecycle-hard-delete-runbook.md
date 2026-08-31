# Service Lifecycle Hard Delete Runbook

This runbook documents the pre-execute checklist for ArtiMenu service data deletion.

## 1. Lifecycle Policy

ArtiMenu service lifecycle:

```text
Active service
-> service ended
-> policy-specific retention window
-> D-Day remains recoverable
-> the day after D-Day becomes unrecoverable
-> content rows and uploaded images may be deleted
-> service shell, billing, payment, and legal records remain
```

D-Day is the final customer-friendly recovery day. The day after D-Day is the earliest hard-delete eligibility date.

Retention windows:

```text
Personal trial ended: 30-day retention / recovery window
Paid subscription ended: 90-day retention / recovery window
Payment failed or unpaid: 30-day retention / recovery window
```

After the retention window ends, menu content rows, uploaded menu images, and uploaded Display video files may be deleted. Minimal service shell records plus billing, settlement, payment, and legal records must remain preserved.

Implementation note:

- Before any production execute, confirm cron code and `data_retention_until` generation match the policy-specific windows above.
- Do not hard-delete records whose retention date was generated from an older fixed retention policy.
- Existing records that were generated with the previous fixed 7-day policy require a separate backfill/dry-run review before they can be treated as hard-delete candidates.

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
  - starts a 30-day retention / recovery window
  - moves expired trials to `pending_delete` after D-Day
- `app/api/cron/process-subscriptions/route.ts`
  - processes paid subscription renewal/cancel-at-period-end
  - starts a 90-day retention / recovery window for paid subscription end cases
  - starts a 30-day retention / recovery window for eligible payment failed or unpaid cases
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
- `totals.storagePathsByBucket`
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
- Confirm the candidate's `data_retention_until` was calculated from the correct policy window: 30 days for personal-trial end, 90 days for paid subscription end, or 30 days for payment failed/unpaid.
- Confirm D-Day has passed in KST.
- Confirm the reported DB row counts match expectations.
- Confirm reported `menu-images` paths are under `menu-sites/<menuSiteId>/`.
- Confirm reported `menu-videos` paths are under `menu-sites/<menuSiteId>/draft/display-videos/`.
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

### Current Grant Plan

Remote read-only checks on 2026-06-27 confirmed:

- `service_entitlements.status = deleted` is allowed by the remote check constraint.
- cleanup tables exist in the `public` schema.
- the blocker is missing `service_role` `SELECT`/`DELETE` table privileges on several content tables.
- RLS is enabled on those tables, but the observed failure is table privilege/Data API access, not a missing table or unsupported `deleted` status value.

Grant migration draft:

```text
supabase/migrations/20260627105546_grant_service_role_menu_content_cleanup.sql
```

The draft grants only `SELECT` and `DELETE` to `service_role` for menu content cleanup tables:

- translation content:
  - `menu_site_translations`
  - `menu_page_translations`
  - `menu_category_translations`
  - `menu_item_translations`
  - `menu_item_price_option_translations`
  - `menu_item_trait_translations`
  - `menu_chef_translations`
  - `menu_event_translations`
  - `menu_social_link_translations`
- optional content modules:
  - `menu_chefs`
  - `menu_events`
  - `menu_social_links`
- translation workflow rows:
  - `menu_translation_jobs`
- removed runtime legacy rows:
  - `menu_widgets`
  - `menu_widget_items`

The grant migration intentionally does not include preserved service, billing, payment, or legal records:

- `menu_sites`
- `service_entitlements`
- `business_subscriptions`
- `orders`
- `payments`

The hard-delete script preserves those records and only updates the menu-site shell and entitlement marker after DB content deletion and Storage removal complete successfully.

Rollback candidate if the grant must be reverted:

```sql
revoke select, delete on table public.menu_site_translations from service_role;
revoke select, delete on table public.menu_page_translations from service_role;
revoke select, delete on table public.menu_category_translations from service_role;
revoke select, delete on table public.menu_item_translations from service_role;
revoke select, delete on table public.menu_item_price_option_translations from service_role;
revoke select, delete on table public.menu_item_trait_translations from service_role;
revoke select, delete on table public.menu_chefs from service_role;
revoke select, delete on table public.menu_chef_translations from service_role;
revoke select, delete on table public.menu_events from service_role;
revoke select, delete on table public.menu_event_translations from service_role;
revoke select, delete on table public.menu_social_links from service_role;
revoke select, delete on table public.menu_social_link_translations from service_role;
revoke select, delete on table public.menu_translation_jobs from service_role;
revoke select, delete on table public.menu_widgets from service_role;
revoke select, delete on table public.menu_widget_items from service_role;
```

Do not run the rollback SQL during normal hard-delete execution. Keep grant application and hard-delete execution as separate operational steps.

After the grant migration is applied in a separately approved step, rerun dry-run before any execute:

```bash
node --env-file=.env.local scripts/hard-delete-expired-menu-sites.mjs --limit 10
node --env-file=.env.local scripts/hard-delete-expired-menu-sites.mjs --slug <slug>
```

Execute remains forbidden until dry-run reports:

- `canExecuteSafely: true`
- `totals.unresolvedErrors: []`
- no permission denied errors
- expected row counts and Storage paths only

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
