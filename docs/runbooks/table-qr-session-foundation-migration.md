# Table QR And Visit Session Foundation Migration Runbook

Last updated: 2026-08-06

Migration:

`supabase/migrations/20260806105623_add_table_qr_session_foundation.sql`

## 1. Safety Boundary

This migration creates the empty `menu_tables` and `table_visit_sessions` foundations. It does not create customer orders or calls, change entitlements, issue QR codes, create visit sessions, or modify existing customer rows.

Do not run this migration automatically. Do not use `supabase db push` or a linked `supabase migration up`. A person must review the Draft PR and explicitly approve one manual Supabase SQL Editor application.

The approved product constants are:

- SHA-256 hash-only storage for table and visit-session tokens
- raw table token delivered only at create/rotate time
- maximum 12-hour visit session
- maximum 100 non-archived tables per menu site

## 2. Read-Only Production Precheck

Open the Supabase project, choose **SQL Editor**, create a new query, and run this read-only block before applying the migration:

```sql
select
  to_regclass('public.menu_sites') as menu_sites,
  to_regclass('public.menu_tables') as menu_tables,
  to_regclass('public.table_visit_sessions') as table_visit_sessions,
  to_regprocedure('public.set_updated_at()') as set_updated_at,
  exists (
    select 1
    from pg_namespace
    where nspname = 'private'
  ) as private_schema_exists;

select extname
from pg_extension
where extname = 'pgcrypto';
```

Expected result:

- `menu_sites` and `set_updated_at()` exist.
- `private_schema_exists` is true.
- `pgcrypto` exists.
- `menu_tables` and `table_visit_sessions` are null.

Stop if either new table already exists or any required dependency is missing. Do not edit, drop, or overwrite an existing object.

## 3. Manual Application

After the Draft PR is merged and a person explicitly approves Production application:

1. Open `supabase/migrations/20260806105623_add_table_qr_session_foundation.sql`.
2. Copy the entire file.
3. Paste it into a new Supabase **SQL Editor** query.
4. Confirm the target project is Production.
5. Click **Run** once.

The file is wrapped in `begin; ... commit;`. If an error occurs, stop and preserve the error text. Run `rollback;` only if SQL Editor reports that the failed transaction remains open.

## 4. Read-Only Postcheck

Run:

```sql
select
  c.relname,
  c.relrowsecurity,
  c.relforcerowsecurity
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('menu_tables', 'table_visit_sessions')
order by c.relname;

select
  table_name,
  grantee,
  string_agg(privilege_type, ', ' order by privilege_type) as privileges
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('menu_tables', 'table_visit_sessions')
  and grantee in ('anon', 'authenticated', 'service_role')
group by table_name, grantee
order by table_name, grantee;

select
  (select count(*) from public.menu_tables) as menu_table_rows,
  (select count(*) from public.table_visit_sessions) as visit_session_rows;

select
  tgrelid::regclass::text as table_name,
  tgname as trigger_name
from pg_trigger
where not tgisinternal
  and tgrelid in (
    'public.menu_tables'::regclass,
    'public.table_visit_sessions'::regclass
  )
order by table_name, trigger_name;
```

Success criteria:

- both tables exist with `relrowsecurity = true` and `relforcerowsecurity = true`
- neither `anon` nor `authenticated` has a table grant
- `service_role` has only `SELECT`, `INSERT`, and `UPDATE`; direct hard delete is not granted
- both new tables contain zero rows immediately after migration
- `menu_tables` has limit, session-revoke, and updated-at triggers

## 5. Generated Types

Only after the Production postcheck succeeds, refresh generated types using the repository's existing command:

```bash
npm run supabase:types
```

Review the diff. It must only add the two new tables and related relationships. Do not manually edit `lib/supabase/types.ts`.

Commit the generated type update in a separate `agent/*` PR. Runtime table management and session issuance remain locked until that PR is merged.

## 6. Recovery Boundary

Do not automatically drop either table after application. If the migration was applied to the wrong project or the postcheck fails, stop and request a separate recovery review. Any rollback must first confirm both tables are empty and that no runtime deployment has started using them.
