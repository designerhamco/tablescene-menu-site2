# Menu Content Order RPC Service-Role Grants

## Scope

This runbook applies the minimum table and column privileges required for the
server-side `service_role` caller to execute:

```sql
public.save_menu_page_content_order(
  p_user_id uuid,
  p_menu_site_id uuid,
  p_menu_page_id uuid,
  p_blocks jsonb
)
```

The RPC is `security invoker`, so `EXECUTE` alone is not enough. The caller must
also have privileges on every table touched by the function body.

Do not run the RPC, test inserts, updates, deletes, or Storage operations during
this privilege step.

## Related Migration

Apply this file manually in Supabase SQL Editor:

```text
supabase/migrations/20260722093000_grant_menu_content_order_rpc_privileges.sql
```

## Why This Exists

The first real final-save attempt reached the RPC but failed with:

```text
42501 permission denied for table menu_widgets
```

That is expected for a `security invoker` RPC when the caller has function
`EXECUTE` but not the underlying table privileges.

## Pre-Apply Checks

Capture these values before applying the migration. The row-count queries are
read-only.

```sql
select
  has_function_privilege(
    'service_role',
    'public.save_menu_page_content_order(uuid,uuid,uuid,jsonb)',
    'EXECUTE'
  ) as service_role_can_execute,
  has_function_privilege(
    'anon',
    'public.save_menu_page_content_order(uuid,uuid,uuid,jsonb)',
    'EXECUTE'
  ) as anon_can_execute,
  has_function_privilege(
    'authenticated',
    'public.save_menu_page_content_order(uuid,uuid,uuid,jsonb)',
    'EXECUTE'
  ) as authenticated_can_execute;
```

Also inspect the raw routine grants:

```sql
select
  grantee,
  privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name = 'save_menu_page_content_order'
order by grantee, privilege_type;
```

```sql
select
  has_table_privilege('service_role', 'public.menu_sites', 'SELECT') as menu_sites_select,
  has_table_privilege('service_role', 'public.menu_pages', 'SELECT') as menu_pages_select,
  has_column_privilege('service_role', 'public.menu_pages', 'updated_at', 'UPDATE') as menu_pages_updated_at_update,
  has_table_privilege('service_role', 'public.menu_categories', 'SELECT') as menu_categories_select,
  has_column_privilege('service_role', 'public.menu_categories', 'sort_order', 'UPDATE') as menu_categories_sort_order_update,
  has_column_privilege('service_role', 'public.menu_categories', 'updated_at', 'UPDATE') as menu_categories_updated_at_update,
  has_table_privilege('service_role', 'public.menu_widgets', 'SELECT') as menu_widgets_select,
  has_column_privilege('service_role', 'public.menu_widgets', 'sort_order', 'UPDATE') as menu_widgets_sort_order_update,
  has_column_privilege('service_role', 'public.menu_widgets', 'updated_at', 'UPDATE') as menu_widgets_updated_at_update;
```

```sql
select
  has_table_privilege('service_role', 'public.menu_categories', 'INSERT') as menu_categories_insert,
  has_table_privilege('service_role', 'public.menu_categories', 'DELETE') as menu_categories_delete,
  has_table_privilege('service_role', 'public.menu_widgets', 'INSERT') as menu_widgets_insert,
  has_table_privilege('service_role', 'public.menu_widgets', 'DELETE') as menu_widgets_delete;
```

`menu_widgets_delete` may already be true from the existing cleanup migration.
This migration must not be treated as adding widget deletion; compare pre/post
values rather than assuming a fixed expected value.

```sql
select count(*) as menu_category_rows
from public.menu_categories;
```

```sql
select count(*) as menu_widget_rows
from public.menu_widgets;
```

```sql
select count(*) as menu_widget_item_rows
from public.menu_widget_items;
```

## Apply

1. Open `supabase/migrations/20260722093000_grant_menu_content_order_rpc_privileges.sql`.
2. Copy the full file contents.
3. Paste into Supabase SQL Editor.
4. Execute once.

The migration only grants privileges. It does not modify rows, change the RPC
body, change RLS policies, or touch Storage.

## Post-Apply Verification

Re-run the pre-apply privilege and row-count checks.

Expected changes:

- `service_role` can still execute `public.save_menu_page_content_order`.
- `anon`, `authenticated`, and `public` still cannot execute the RPC.
- `service_role` has `SELECT` on:
  - `public.menu_sites`
  - `public.menu_pages`
  - `public.menu_categories`
  - `public.menu_widgets`
- `service_role` has column-level `UPDATE` on:
  - `public.menu_pages.updated_at`
  - `public.menu_categories.sort_order`
  - `public.menu_categories.updated_at`
  - `public.menu_widgets.sort_order`
  - `public.menu_widgets.updated_at`
- `INSERT` privileges are unchanged.
- `DELETE` privileges are unchanged.
- Category/widget/widget-item row counts are unchanged.

## Partial QA Row Policy

During the first failed live save, a QA menu site already ended up with one
`image_text` widget row:

```text
menu_site_id: c9310558-e411-48e7-89c2-6386bf37dc82
widget_id: e11a3b05-fba8-4301-a0f7-f0472f874643
widget_type: image_text
```

Do not delete or manually edit this row as part of the privilege migration.

After applying the grants, verify the edit page hydrates the existing widget
row. The hidden final-save payload should include the same widget UUID. If the
widget is not visible in the editor or the payload omits it, stop and audit
before running final save.

## 2026-07-22 Production Apply Confirmation

The migration SQL was manually applied through Supabase SQL Editor.

Confirmed after apply:

- SQL Editor manual apply succeeded.
- Applied migration file:
  `supabase/migrations/20260722093000_grant_menu_content_order_rpc_privileges.sql`.
- `service_role` has `SELECT` on:
  - `public.menu_sites`
  - `public.menu_pages`
  - `public.menu_categories`
  - `public.menu_widgets`
- `service_role` has column-level `UPDATE` on:
  - `public.menu_pages.updated_at`
  - `public.menu_categories.sort_order`
  - `public.menu_categories.updated_at`
  - `public.menu_widgets.sort_order`
  - `public.menu_widgets.updated_at`
- `service_role` still has `EXECUTE` on
  `public.save_menu_page_content_order(uuid, uuid, uuid, jsonb)`.
- `public`, `anon`, and `authenticated` do not have RPC `EXECUTE`.
- No new `INSERT` or `DELETE` privileges were added by this migration.
- `menu_categories` row count was unchanged before/after apply.
- The existing partial QA `image_text` widget row remained in place.
- `menu_widget_items` remained 0 rows.
- The RPC was not test-called.
- No test `INSERT`, `UPDATE`, or `DELETE` was executed.
- No Storage operation was executed.

## First Runtime QA After Apply

Use a known QA menu page and run only the normal app final-save flow.

Recommended order:

1. Reopen the edit page.
2. Confirm the existing partial widget row appears in the editor.
3. Make a small order/content change.
4. Click final save once.
5. Confirm the RPC no longer fails with `42501`.
6. Confirm no duplicate widget row was created.

Do not call the RPC directly from SQL Editor during this step.

## Rollback Notes

Do not run unconditional `revoke` statements.

If rollback is required, compare the pre-apply privilege snapshot and revoke only
privileges that were added by this migration and are not required by another
server-side feature. In particular, `service_role` may already have
`menu_widgets DELETE` from the cleanup workflow.
