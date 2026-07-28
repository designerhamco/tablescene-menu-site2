# CafeA Widget Translation SQL Editor Runbook

This runbook applies `supabase/migrations/20260728142935_add_menu_widget_translations.sql`
manually through the Supabase SQL Editor.

Do not run `supabase migration up --linked`, `supabase db push`, typegen, or app
code changes before the SQL Editor application is confirmed.

## 1. Purpose

CafeA widget MVP currently stores widget source text on `menu_widgets`:

- `title`
- `description`

The existing localization system uses one translation table per entity type
instead of a generic entity table. This migration adds
`public.menu_widget_translations` for persisted widget UUIDs only.

The migration does not:

- backfill rows
- create widgets
- update locale settings
- translate image URLs or paths
- translate settings, alignment, visibility, sort order, or alt text
- change app code or generated Supabase types

## 2. Before Applying

Run these read-only checks in Supabase SQL Editor before applying the migration.

### Confirm the table does not already exist

```sql
select to_regclass('public.menu_widget_translations') as table_regclass;
```

Expected before first apply:

```text
null
```

### Confirm the widget table exists

```sql
select to_regclass('public.menu_widgets') as table_regclass;
```

Expected:

```text
menu_widgets
```

### Confirm the updated-at trigger function exists

```sql
select
  p.proname,
  n.nspname
from pg_proc p
join pg_namespace n
  on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'set_updated_at';
```

Expected:

```text
set_updated_at | public
```

### Current widget row count

```sql
select count(*) as total_widget_rows
from public.menu_widgets;
```

Record the count for later comparison. This migration must not change it.

## 3. Applying

1. Open `supabase/migrations/20260728142935_add_menu_widget_translations.sql`.
2. Copy the entire file.
3. Paste it into Supabase SQL Editor.
4. Execute the full script once.

The migration is wrapped in `begin; ... commit;`. If any statement fails, run
`rollback;` only if SQL Editor leaves the transaction open, then stop and review
the error before retrying.

## 4. Post-Apply Verification

### Table and columns

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_widget_translations'
order by ordinal_position;
```

Expected columns:

- `id`
- `menu_widget_id`
- `locale`
- `title`
- `description`
- `source_text_hash`
- `status`
- `created_at`
- `updated_at`

### Constraints

```sql
select
  c.conname,
  c.contype,
  pg_get_constraintdef(c.oid) as definition
from pg_constraint c
join pg_class t
  on t.oid = c.conrelid
join pg_namespace n
  on n.oid = t.relnamespace
where n.nspname = 'public'
  and t.relname = 'menu_widget_translations'
order by c.conname;
```

Expected:

- primary key on `id`
- foreign key from `menu_widget_id` to `public.menu_widgets(id)` with `ON DELETE CASCADE`
- locale check allowing only `en`, `zh`, `ja`
- status check allowing `pending`, `completed`, `failed`
- unique constraint on `(menu_widget_id, locale)`

### RLS

```sql
select
  relrowsecurity,
  relforcerowsecurity
from pg_class
where oid = 'public.menu_widget_translations'::regclass;
```

Expected:

```text
relrowsecurity = true
```

### Policies

```sql
select
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'menu_widget_translations'
order by policyname;
```

Expected policies:

- `menu_widget_translations owner all`
- `menu_widget_translations public select`
- `menu_widget_translations admin select`

### Grants

```sql
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'menu_widget_translations'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;
```

Expected:

- `anon`: `SELECT`
- `authenticated`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- `service_role`: `SELECT`, `DELETE`

### Trigger

```sql
select
  tgname,
  pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'public.menu_widget_translations'::regclass
  and not tgisinternal
order by tgname;
```

Expected:

- `set_menu_widget_translations_updated_at`
- `before update`
- executes `public.set_updated_at()`

### Row count

```sql
select count(*) as total_widget_translation_rows
from public.menu_widget_translations;
```

Expected immediately after apply:

```text
0
```

### Existing widgets unchanged

```sql
select count(*) as total_widget_rows
from public.menu_widgets;
```

Compare with the pre-apply count. It must be unchanged.

## 5. 2026-07-28 Production Apply Confirmation

Applied `supabase/migrations/20260728142935_add_menu_widget_translations.sql`
manually through the Supabase SQL Editor.

Confirmed after apply:

- `menu_widget_translations` row count: `0`
- foreign key: `menu_widget_id` references `menu_widgets(id)` with `ON DELETE CASCADE`
- unique constraint: `(menu_widget_id, locale)`
- locale check: `en`, `zh`, `ja`
- status check: `pending`, `completed`, `failed`
- RLS enabled
- policies present:
  - `menu_widget_translations owner all`
  - `menu_widget_translations public select`
  - `menu_widget_translations admin select`
- grants verified against existing translation-table convention
- `set_menu_widget_translations_updated_at` trigger present and using `public.set_updated_at()`

`npm run supabase:types` completed after the manual SQL Editor apply, and
`lib/supabase/types.ts` now includes `menu_widget_translations` Row, Insert,
Update, and `menu_widget_id -> menu_widgets.id` relationship types.

Did not use `supabase migration up --linked` or `supabase db push`. No test
`INSERT`, `UPDATE`, or `DELETE` was run for this table during this confirmation.

## 6. Rollback Notes

Do not run rollback SQL automatically. Rollback must be reviewed separately.

Reference-only rollback:

```sql
begin;

drop table if exists public.menu_widget_translations;

commit;
```

Only consider this before widget translation rows are used by runtime code.
