# CafeA Widget Type Constraint SQL Editor Runbook

This runbook applies `supabase/migrations/20260721154059_expand_menu_widget_types.sql` manually through the Supabase SQL Editor.

Do not run `supabase migration up --linked`, `supabase db push`, or typegen before the SQL Editor application is confirmed.

## 1. Purpose

The current `menu_widgets.widget_type` check constraint allows only legacy widget values:

- `notice_text`
- `image_banner`
- `option_list`
- `store_info`

The CafeA widget MVP domain contract adds:

- `image`
- `text`
- `image_text`

This migration keeps the four legacy values and adds the three MVP values. It does not backfill rows, change RLS, change grants, alter indexes, update data, or touch `menu_widget_items`.

The 3-1 read-only remote audit found:

- `menu_widgets` rows: 0
- `menu_widget_items` rows: 0
- legacy widget rows: 0
- MVP widget rows: 0
- orphan widget item rows: 0
- image path references: 0
- settings key usage: 0
- category/widget sort order collisions: none

## 2. Before Applying

Run these read-only checks in Supabase SQL Editor before applying the migration.

### Current widget row count

```sql
select count(*) as total_widget_rows
from public.menu_widgets;
```

Expected:

```text
total_widget_rows = 0
```

### Current widget types

```sql
select
  widget_type,
  count(*) as row_count
from public.menu_widgets
group by widget_type
order by widget_type;
```

Expected for the current audited database:

```text
0 rows
```

### Existing widget type constraint

```sql
select
  c.conname,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t
  on t.oid = c.conrelid
join pg_namespace n
  on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'menu_widgets'
  and c.contype = 'c'
order by c.conname;
```

Expected existing constraint before applying:

```text
menu_widgets_widget_type_check
CHECK ((widget_type = ANY (ARRAY['notice_text'::text, 'image_banner'::text, 'option_list'::text, 'store_info'::text])))
```

### Unexpected widget type preflight

```sql
select
  widget_type,
  count(*) as row_count
from public.menu_widgets
where widget_type not in (
  'notice_text',
  'image_banner',
  'option_list',
  'store_info',
  'image',
  'text',
  'image_text'
)
group by widget_type
order by widget_type;
```

Expected:

```text
0 rows
```

Stop and review before applying if this query returns any rows.

## 3. Applying

Open `supabase/migrations/20260721154059_expand_menu_widget_types.sql`, copy the entire file, paste it into Supabase SQL Editor, and run it once.

The migration:

- wraps the preflight, constraint drop, and constraint add in one transaction
- aborts if unexpected `widget_type` rows exist
- drops `menu_widgets_widget_type_check`
- recreates `menu_widgets_widget_type_check` with both legacy and MVP values
- leaves `widget_type text not null` unchanged
- does not add a default
- does not update or delete data
- does not change RLS, grants, indexes, foreign keys, or `menu_widget_items`

The file already includes `begin;` and `commit;`. If any statement errors in SQL Editor, the transaction is aborted and the constraint replacement should not be partially committed. Run `rollback;` if SQL Editor leaves the failed transaction open.

## 4. Post-Apply Verification

### Expanded constraint

```sql
select
  c.conname,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t
  on t.oid = c.conrelid
join pg_namespace n
  on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'menu_widgets'
  and c.contype = 'c'
order by c.conname;
```

Expected:

- `menu_widgets_widget_type_check`
- legacy values included:
  - `notice_text`
  - `image_banner`
  - `option_list`
  - `store_info`
- MVP values included:
  - `image`
  - `text`
  - `image_text`

### Row count remains unchanged

```sql
select count(*) as total_widget_rows
from public.menu_widgets;
```

Expected for the current audited database:

```text
0
```

### Widget type counts remain unchanged

```sql
select
  widget_type,
  count(*) as row_count
from public.menu_widgets
group by widget_type
order by widget_type;
```

Expected for the current audited database:

```text
0 rows
```

This runbook intentionally does not include an insert/update/delete smoke test.

## 5. Rollback Notes

Do not run a rollback SQL automatically.

Before the new widget runtime is connected, the constraint can be reviewed for rollback to legacy-only values if needed. After any `image`, `text`, or `image_text` rows are created, a legacy-only constraint will fail unless those rows are removed or backfilled first.

Before any rollback decision, run:

```sql
select
  widget_type,
  count(*) as row_count
from public.menu_widgets
group by widget_type
order by widget_type;
```

Write rollback SQL only as a separate reviewed step.

## 6. Generated Types

This constraint expansion may not change `lib/supabase/types.ts`, because generated Supabase table types commonly keep check-constrained text columns as `string`.

Policy:

- do not edit `lib/supabase/types.ts` manually
- run typegen only after the SQL Editor application succeeds
- app code should continue to use the domain union in `lib/menu-widgets.ts`
- a typegen diff of zero is acceptable for this constraint-only change

## 7. Follow-Up

After SQL Editor application and verification:

1. Run the project's Supabase typegen command.
2. Confirm whether `lib/supabase/types.ts` changes.
3. Commit the migration, this runbook, and generated type diff if any.
4. Proceed to owner/public loader and editor/save integration in separate steps.

## 8. SQL Editor Application Confirmation

Confirmed on 2026-07-21 after manual Supabase SQL Editor application:

- `menu_widgets_widget_type_check` was expanded successfully.
- Legacy widget types are allowed: `notice_text`, `image_banner`, `option_list`, `store_info`.
- CafeA MVP widget types are allowed: `image`, `text`, `image_text`.
- `menu_widgets` row count remains `0`.
- No test insert/update/delete was run.
