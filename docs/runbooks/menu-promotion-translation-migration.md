# Menu Promotion Translation SQL Editor Runbook

This runbook applies
`supabase/migrations/20260729000508_add_menu_promotion_translations.sql`
manually through the Supabase SQL Editor.

Do not run `supabase migration up --linked` or `supabase db push`. Do not run
typegen or app code changes until the SQL Editor application is confirmed.

## 1. Purpose

CafeA time sales currently keep user-entered display text in
`menu_promotions.settings`:

- `badge_text`, for labels such as `모닝딜` or `재고 마감`
- `time_display_text`, for labels such as `매일 오전 8시부터 10시까지`

This migration adds `public.menu_promotion_translations` for persisted
promotion UUIDs. It stores translations only for user-entered promotion copy.

The migration does not translate or modify:

- `starts_at`
- `ends_at`
- `daily_start_time`
- `daily_end_time`
- `schedule_mode`
- `weekdays`
- discount values
- prices
- promotion targets
- internal `settings` keys
- system-generated countdown or deadline labels

Countdown/deadline copy such as "today" or "time remaining" must be handled by
runtime locale formatters in a later app change.

## 2. Existing Convention

The table follows the current translation-table convention:

- one translation table per persisted entity type
- `locale` limited to `en`, `zh`, `ja`
- `status` defaults to `completed` and allows `pending`, `completed`, `failed`
- nullable translated fields so field-level fallback can use the Korean source
- `source_text_hash` stores a hash of the source Korean fields
- `updated_at` uses the shared `public.set_updated_at()` trigger when present
- owner writes are restricted by the parent menu site's `user_id`
- admin read access uses `public.admin_users`
- `service_role` keeps the existing cleanup convention: `SELECT`, `DELETE`

Unlike `menu_widget_translations`, this table intentionally does not grant
`anon` access and does not create a public select policy. Public/runtime
exposure for promotion translations should be decided by the later loader
implementation.

## 3. Source Hash Policy

The app should build `source_text_hash` from the Korean source values in a
stable field order:

```text
badge_text=<source badge_text>
time_display_text=<source time_display_text>
```

Empty or missing source fields should be represented consistently with the
existing localization hash helper. This migration only prepares the column; it
does not change app hash code.

## 4. Before Applying

Run these read-only checks in Supabase SQL Editor before applying the migration.

### Confirm the table does not already exist

```sql
select to_regclass('public.menu_promotion_translations') as table_regclass;
```

Expected before first apply:

```text
null
```

### Confirm the parent promotion table exists

```sql
select to_regclass('public.menu_promotions') as table_regclass;
```

Expected:

```text
menu_promotions
```

### Confirm promotion columns

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_promotions'
  and column_name in ('id', 'menu_site_id', 'settings', 'created_at', 'updated_at')
order by ordinal_position;
```

Expected:

- `id` is `uuid`
- `menu_site_id` is `uuid`
- `settings` is `jsonb`

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

### Current promotion row count

```sql
select count(*) as total_promotion_rows
from public.menu_promotions;
```

Record the count for later comparison. This migration must not change it.

## 5. Applying

1. Open
   `supabase/migrations/20260729000508_add_menu_promotion_translations.sql`.
2. Copy the entire file.
3. Paste it into Supabase SQL Editor.
4. Execute the full script once.

The migration is wrapped in `begin; ... commit;`. If any statement fails, run
`rollback;` only if SQL Editor leaves the transaction open, then stop and review
the error before retrying.

## 6. Post-Apply Verification

### Table and columns

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_promotion_translations'
order by ordinal_position;
```

Expected columns:

- `id`
- `menu_promotion_id`
- `locale`
- `badge_text`
- `time_display_text`
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
  and t.relname = 'menu_promotion_translations'
order by c.conname;
```

Expected:

- primary key on `id`
- foreign key from `menu_promotion_id` to `public.menu_promotions(id)` with
  `ON DELETE CASCADE`
- locale check allowing only `en`, `zh`, `ja`
- status check allowing only `pending`, `completed`, `failed`
- unique constraint on `(menu_promotion_id, locale)`

### RLS

```sql
select
  relrowsecurity,
  relforcerowsecurity
from pg_class
where oid = 'public.menu_promotion_translations'::regclass;
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
  and tablename = 'menu_promotion_translations'
order by policyname;
```

Expected policies:

- `menu_promotion_translations owner all`
- `menu_promotion_translations admin select`

There should be no `anon` or public select policy for this table.

### Grants

```sql
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'menu_promotion_translations'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;
```

Expected:

- `anon`: no rows
- `authenticated`: `SELECT`, `INSERT`, `UPDATE`, `DELETE`
- `service_role`: `SELECT`, `DELETE`

### Trigger

```sql
select
  tgname,
  pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'public.menu_promotion_translations'::regclass
  and not tgisinternal
order by tgname;
```

Expected:

- `set_menu_promotion_translations_updated_at`
- `before update`
- executes `public.set_updated_at()`

### Translation row count

```sql
select count(*) as total_promotion_translation_rows
from public.menu_promotion_translations;
```

Expected immediately after apply:

```text
0
```

### Existing promotions unchanged

```sql
select count(*) as total_promotion_rows
from public.menu_promotions;
```

Compare with the pre-apply count. It must be unchanged.

## 7. Rollback Notes

Do not run rollback SQL automatically. Rollback must be reviewed separately.

Reference-only rollback:

```sql
begin;

drop table if exists public.menu_promotion_translations;

commit;
```

Only consider this before promotion translation rows are used by runtime code.

## 8. Production Apply Record

2026-07-29 manual Supabase SQL Editor apply completed.

- Migration file: `supabase/migrations/20260729000508_add_menu_promotion_translations.sql`
- `supabase db push` was not used.
- `supabase migration up --linked` was not used.
- Columns/defaults verified.
- FK `menu_promotion_id -> menu_promotions(id) on delete cascade` verified.
- Locale check `en / zh / ja` verified.
- Status check `pending / completed / failed` verified.
- Unique constraint `(menu_promotion_id, locale)` verified.
- RLS enabled verified.
- Owner/admin policies verified.
- Authenticated and service-role grants verified.
- `set_menu_promotion_translations_updated_at` trigger verified.
- Existing `menu_promotions` row count remained `6`.
- New `menu_promotion_translations` row count was `0`.
