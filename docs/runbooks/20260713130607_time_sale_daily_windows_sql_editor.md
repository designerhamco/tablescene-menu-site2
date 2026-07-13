# Time Sale Daily Windows SQL Editor Runbook

This runbook applies `supabase/migrations/20260713130607_add_time_sale_daily_windows.sql` manually through the Supabase SQL Editor.

Do not run `supabase migration up`, `supabase db push`, or typegen before the SQL Editor application is confirmed.

## 1. Before Applying

This migration changes the time-sale public exposure boundary. It adds:

- `menu_promotions.schedule_type`
- `menu_promotions.daily_start_time`
- `menu_promotions.daily_end_time`
- expanded `settings.time_display_mode` values
- optional `settings.time_display_text` validation
- a helper function for public active checks
- recreated public select policies for `menu_promotions` and `menu_promotion_items`

Because public policies are recreated, confirm the current policy names and data shape first.

## 2. Preflight SQL

Run these in Supabase SQL Editor before applying the migration.

### Current promotion columns

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_promotions'
order by ordinal_position;
```

### Current promotion constraints

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.menu_promotions'::regclass
order by conname;
```

### Current promotion item constraints

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.menu_promotion_items'::regclass
order by conname;
```

### Current indexes

```sql
select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('menu_promotions', 'menu_promotion_items')
order by tablename, indexname;
```

### Current public policies

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('menu_promotions', 'menu_promotion_items')
order by tablename, policyname;
```

### Existing promotion rows

```sql
select
  count(*) as promotion_count,
  count(*) filter (where active = true) as active_count,
  count(*) filter (where starts_at <= now() and ends_at > now()) as currently_in_range_count
from public.menu_promotions;
```

### Existing time display modes

```sql
select settings ->> 'time_display_mode' as time_display_mode, count(*) as count
from public.menu_promotions
group by settings ->> 'time_display_mode'
order by time_display_mode;
```

## 3. Stop Conditions

Stop and review before applying if:

- the existing public policy names differ from:
  - `menu_promotions_select_public_active`
  - `menu_promotion_items_select_public_active`
- `settings.time_display_mode` contains values other than `deadline` or `countdown`
- the latest option-column time-sale policy is missing from `menu_promotion_items`
- preflight SQL returns unexpected table/constraint errors

If an apply error occurs, stop immediately and copy the full SQL Editor error.

## 4. Applying

Open `supabase/migrations/20260713130607_add_time_sale_daily_windows.sql`, copy the entire file, paste it into Supabase SQL Editor, and run it once.

The file is written to be safe for SQL Editor application:

- columns use `add column if not exists`
- indexes use `create index if not exists`
- constraints and public policies are dropped/recreated by name
- the helper function uses `create or replace function`

You may wrap the file in an explicit transaction:

```sql
begin;
-- paste the full migration file here
commit;
```

If using a manual transaction, run `rollback;` instead of `commit;` if any statement errors.

## 5. Post-Apply SQL

### New columns

```sql
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_promotions'
  and column_name in ('schedule_type', 'daily_start_time', 'daily_end_time')
order by column_name;
```

### New and replaced constraints

```sql
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'public.menu_promotions'::regclass
  and conname in (
    'menu_promotions_schedule_type_check',
    'menu_promotions_daily_window_check',
    'menu_promotions_time_display_mode_check',
    'menu_promotions_time_display_text_length_check'
  )
order by conname;
```

### Helper function

```sql
select proname, provolatile, proconfig
from pg_proc
where proname = 'is_menu_promotion_active_now';
```

Expected:

- `provolatile = 's'`
- `proconfig` includes `search_path=public, pg_temp`

### Public policies

```sql
select tablename, policyname, cmd, roles, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('menu_promotions', 'menu_promotion_items')
  and policyname in (
    'menu_promotions_select_public_active',
    'menu_promotion_items_select_public_active'
  )
order by tablename, policyname;
```

### Existing rows remain once schedule

```sql
select schedule_type, count(*) as count
from public.menu_promotions
group by schedule_type
order by schedule_type;
```

### Helper behavior smoke check

```sql
select
  public.is_menu_promotion_active_now(
    true,
    now() - interval '1 hour',
    now() + interval '1 hour',
    'once',
    null,
    null,
    'Asia/Seoul',
    now()
  ) as once_active,
  public.is_menu_promotion_active_now(
    true,
    now() - interval '1 day',
    now() + interval '1 day',
    'daily_window',
    ((now() at time zone 'Asia/Seoul')::time - interval '1 hour')::time,
    ((now() at time zone 'Asia/Seoul')::time + interval '1 hour')::time,
    'Asia/Seoul',
    now()
  ) as daily_window_active;
```

Expected result: both values are `true`.

## 6. After Applying

After the SQL Editor application and post-apply checks succeed:

1. Run project typegen in a separate step.
2. Commit the migration and generated types together.
3. Only then implement public loading, server save/validation, editor UI, and CafeDesignA rendering for daily windows and message display.

Do not edit generated Supabase types by hand.
