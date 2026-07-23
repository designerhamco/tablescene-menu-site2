# CafeA Widget Content Order RPC Runbook

This runbook covers the manual SQL Editor deployment of
`public.save_menu_page_content_order(uuid, uuid, uuid, jsonb)`.

The function saves only the shared `sort_order` values for one menu page's
`menu_categories` and `menu_widgets` rows. It does not create, update, delete,
or backfill content rows.

## Scope

- Applies to `menu_categories` and `menu_widgets`.
- Uses one page-level block payload containing every category and widget for
  the target page.
- Includes hidden rows in the required payload set.
- Rejects legacy widget rows before saving order.
- Rejects pages with more than 3 widget rows.
- Updates both tables inside one PostgreSQL function call.
- Is intended for Next.js server-side service-role calls only.

Out of scope:

- Widget CRUD
- Category CRUD
- Editor UI
- Public loader or CafeA renderer
- Storage cleanup
- Revalidation
- Test inserts or RPC calls during the migration deployment step

## Pre-Apply Read-Only Checks

Run these in Supabase SQL Editor before applying the migration.

```sql
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'save_menu_page_content_order';
```

```sql
select count(*) as menu_category_rows
from public.menu_categories;
```

```sql
select
  widget_type,
  count(*) as row_count
from public.menu_widgets
group by widget_type
order by widget_type;
```

```sql
select count(*) as legacy_widget_rows
from public.menu_widgets
where widget_type in ('notice_text', 'image_banner', 'option_list', 'store_info');
```

```sql
select count(*) as pages_over_widget_limit
from (
  select menu_site_id, menu_page_id, count(*) as widget_count
  from public.menu_widgets
  group by menu_site_id, menu_page_id
  having count(*) > 3
) over_limit;
```

These queries are read-only. Do not insert/update/delete test rows during this
deployment step.

## Apply

1. Open `supabase/migrations/20260721170705_add_menu_page_content_order_rpc.sql`.
2. Copy the full file contents.
3. Paste into Supabase SQL Editor.
4. Execute the full script once.

The migration uses `create or replace function`, revokes public execution, and
grants execution only to `service_role`.

The function is intentionally `security invoker` rather than `security definer`.
It is called only with the server-side service-role client, and it still verifies
`menu_sites.user_id = p_user_id` internally. This avoids adding a security-definer
function to the exposed `public` schema.

Because the function is `security invoker`, the service-role caller also needs
the underlying table/column privileges used by the function body. Those grants
are tracked separately in
`supabase/migrations/20260722093000_grant_menu_content_order_rpc_privileges.sql`
and `docs/runbooks/menu-content-order-rpc-service-role-grants.md`.

The migration file is wrapped in an explicit `begin; ... commit;` block for
manual SQL Editor application. If any statement fails, the function and grants
should roll back together.

## Post-Apply Verification

Confirm the function exists:

```sql
select
  p.proname,
  pg_get_function_identity_arguments(p.oid) as args,
  pg_get_function_result(p.oid) as result_type,
  p.prosecdef as security_definer
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'save_menu_page_content_order';
```

Expected:

- `args`: `p_user_id uuid, p_menu_site_id uuid, p_menu_page_id uuid, p_blocks jsonb`
- `result_type`: `jsonb`
- `security_definer`: `false`

Confirm the function search path:

```sql
select
  p.proname,
  p.proconfig
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'save_menu_page_content_order';
```

Expected `proconfig` includes:

```text
search_path=public, pg_temp
```

Confirm execute privileges:

```sql
select
  grantee,
  privilege_type
from information_schema.routine_privileges
where specific_schema = 'public'
  and routine_name = 'save_menu_page_content_order'
order by grantee, privilege_type;
```

Expected:

- `service_role` has `EXECUTE`.
- `anon` has no `EXECUTE`.
- `authenticated` has no `EXECUTE`.
- `PUBLIC` has no `EXECUTE`.

Optionally inspect the stored function definition:

```sql
select pg_get_functiondef(p.oid) as function_definition
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'save_menu_page_content_order';
```

Confirm no content rows changed by deployment:

```sql
select count(*) as menu_category_rows
from public.menu_categories;
```

```sql
select count(*) as menu_widget_rows
from public.menu_widgets;
```

Compare with the pre-apply counts.

## No RPC Test Call In This Step

Do not call `public.save_menu_page_content_order` during the migration
deployment step. The first test call should happen in a later QA step with a
known test menu page and an exact full block payload.

## 2026-07-21 Production Apply Confirmation

The migration SQL was manually applied through Supabase SQL Editor.

Confirmed after apply:

- SQL Editor manual apply succeeded.
- Function signature exists:
  `public.save_menu_page_content_order(p_user_id uuid, p_menu_site_id uuid, p_menu_page_id uuid, p_blocks jsonb)`.
- Return type is `jsonb`.
- `prosecdef = false`, so the function is `security invoker`.
- `search_path = public, pg_temp`.
- `service_role` has `EXECUTE`.
- `public`, `anon`, and `authenticated` do not have `EXECUTE`.
- `menu_categories` row count was unchanged before/after apply.
- `menu_widgets` remained 0 rows.
- `menu_widget_items` remained 0 rows.
- The RPC was not test-called.
- No test `INSERT`, `UPDATE`, or `DELETE` was executed.
- A follow-up service-role table privilege migration is required before the
  first runtime final-save test.

## Expected Runtime Payload

```json
[
  { "block_type": "category", "id": "category-uuid", "sort_order": 0 },
  { "block_type": "widget", "id": "widget-uuid", "sort_order": 1 },
  { "block_type": "category", "id": "category-uuid-2", "sort_order": 2 }
]
```

Rules:

- Payload must contain every category and widget in the page.
- `visible=false` rows are included.
- `sort_order` must be exactly `0..n-1`.
- Block identity is `(block_type, id)`.
- Legacy widget rows abort the save.
- More than 3 widget rows abort the save.

## Rollback Notes

If the app has not yet been deployed to call this RPC, rollback is simply:

```sql
drop function if exists public.save_menu_page_content_order(uuid, uuid, uuid, jsonb);
notify pgrst, 'reload schema';
```

After the app begins calling the RPC, check the deployed app version before
dropping the function.
