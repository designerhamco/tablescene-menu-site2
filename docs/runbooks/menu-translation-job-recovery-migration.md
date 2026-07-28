# Menu Translation Job Recovery SQL Editor Runbook

This runbook applies
`supabase/migrations/20260728232933_add_menu_translation_job_recovery.sql`
manually through the Supabase SQL Editor.

Do not run `supabase migration up --linked` or `supabase db push` for this
step. Do not run automatic translation while applying or verifying the schema.

## 1. Purpose

Automatic translation draft runs currently return translated draft values to the
browser only. If the browser refreshes, closes, or loses the network after a
successful run, the customer can lose the translated draft even though AI
credits were spent.

This migration adds recovery columns to `public.menu_translation_jobs` so future
app code can store the normalized draft result on the completed job and let the
owner reload it without another AI call.

The migration does not:

- call the AI provider
- backfill old completed jobs
- recover any already-lost draft result
- create, update, or delete menu content
- change RLS policy definitions
- change grants
- update generated Supabase types
- connect app UI or server actions

## 2. Stored Data Contract

`draft_payload` stores normalized translation draft patches only. It must not
store provider raw responses, prompts, API keys, auth tokens, image files, signed
URLs, or debug dumps.

Expected app-level shape:

```json
[
  {
    "entityType": "widget",
    "entityId": "uuid",
    "field": "title",
    "locale": "ja",
    "value": "translated text",
    "sourceHash": "sha256"
  }
]
```

`locale_results` stores safe per-locale status summaries only.

Expected app-level shape:

```json
[
  {
    "locale": "ja",
    "status": "success",
    "translatedEntities": 34,
    "translatedTextUnits": 54,
    "draftRowCount": 34,
    "userMessage": null
  }
]
```

Strict field validation remains in application parsers. The database checks only
that the JSON columns are either `null` or JSON arrays.

## 3. Pre-Apply Read-Only Checks

### Current columns

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_translation_jobs'
order by ordinal_position;
```

Expected before first apply:

- `draft_payload` does not exist
- `locale_results` does not exist
- `applied_at` does not exist
- `discarded_at` does not exist
- `result_version` does not exist

### Existing constraints

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
  and t.relname = 'menu_translation_jobs'
order by c.conname;
```

Expected existing constraints include:

- primary key on `id`
- FK to `public.menu_sites(id)` with cascade behavior from the existing schema
- FK to `auth.users(id)` with cascade behavior from the existing schema
- status check for `pending`, `running`, `completed`, `failed`
- supported target locale check, if already applied in the environment

### Existing indexes

```sql
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'menu_translation_jobs'
order by indexname;
```

Expected existing indexes include:

- `menu_translation_jobs_site_created_idx`
- `menu_translation_jobs_requested_by_created_idx`

### RLS

```sql
select
  relrowsecurity,
  relforcerowsecurity
from pg_class
where oid = 'public.menu_translation_jobs'::regclass;
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
  and tablename = 'menu_translation_jobs'
order by policyname;
```

Expected policies:

- `menu_translation_jobs owner all`
- `menu_translation_jobs admin select`

### Grants

```sql
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'menu_translation_jobs'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;
```

Expected existing behavior:

- `authenticated` has owner-gated `SELECT`, `INSERT`, `UPDATE`, `DELETE` through
  RLS.
- `service_role` may have lifecycle cleanup privileges such as `SELECT` and
  `DELETE`.
- `anon` should not have public access to translation jobs.

### Trigger

```sql
select
  tgname,
  pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'public.menu_translation_jobs'::regclass
  and not tgisinternal
order by tgname;
```

Expected:

- `set_menu_translation_jobs_updated_at`

### Row count snapshot

```sql
select count(*) as total_translation_jobs
from public.menu_translation_jobs;
```

Record this count. The migration must not add or delete job rows.

## 4. Apply

1. Open `supabase/migrations/20260728232933_add_menu_translation_job_recovery.sql`.
2. Copy the entire file.
3. Paste it into Supabase SQL Editor.
4. Execute the script once.

The migration is wrapped in `begin; ... commit;`. If any statement fails, stop
and inspect the error before retrying.

## 5. Post-Apply Verification

### New columns

```sql
select
  column_name,
  data_type,
  is_nullable,
  column_default
from information_schema.columns
where table_schema = 'public'
  and table_name = 'menu_translation_jobs'
  and column_name in (
    'draft_payload',
    'locale_results',
    'applied_at',
    'discarded_at',
    'result_version'
  )
order by column_name;
```

Expected:

- `draft_payload`: `jsonb`, nullable, no default
- `locale_results`: `jsonb`, nullable, no default
- `applied_at`: `timestamp with time zone`, nullable
- `discarded_at`: `timestamp with time zone`, nullable
- `result_version`: `integer`, not nullable, default `1`

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
  and t.relname = 'menu_translation_jobs'
  and c.conname in (
    'menu_translation_jobs_result_version_positive_chk',
    'menu_translation_jobs_not_applied_and_discarded_chk',
    'menu_translation_jobs_draft_payload_array_chk',
    'menu_translation_jobs_locale_results_array_chk'
  )
order by c.conname;
```

Expected:

- `result_version >= 1`
- `applied_at is null or discarded_at is null`
- `draft_payload is null or jsonb_typeof(draft_payload) = 'array'`
- `locale_results is null or jsonb_typeof(locale_results) = 'array'`

### Recovery index

```sql
select
  indexname,
  indexdef
from pg_indexes
where schemaname = 'public'
  and tablename = 'menu_translation_jobs'
  and indexname = 'menu_translation_jobs_unapplied_result_idx';
```

Expected partial index:

```text
on public.menu_translation_jobs(menu_site_id, requested_by, completed_at desc)
where status = 'completed'
  and applied_at is null
  and discarded_at is null
  and draft_payload is not null
```

### RLS and policies unchanged

```sql
select
  relrowsecurity,
  relforcerowsecurity
from pg_class
where oid = 'public.menu_translation_jobs'::regclass;
```

```sql
select
  policyname,
  roles,
  cmd
from pg_policies
where schemaname = 'public'
  and tablename = 'menu_translation_jobs'
order by policyname;
```

Expected:

- RLS still enabled.
- Existing owner/admin policies remain.
- No anon policy was added.

### Grants unchanged

```sql
select
  grantee,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name = 'menu_translation_jobs'
  and grantee in ('anon', 'authenticated', 'service_role')
order by grantee, privilege_type;
```

Compare with the pre-apply result. This migration should not add or revoke
privileges.

### Trigger unchanged

```sql
select
  tgname,
  pg_get_triggerdef(oid) as definition
from pg_trigger
where tgrelid = 'public.menu_translation_jobs'::regclass
  and not tgisinternal
order by tgname;
```

Expected:

- `set_menu_translation_jobs_updated_at` still exists.

### Existing data unchanged

```sql
select count(*) as total_translation_jobs
from public.menu_translation_jobs;
```

Compare with the pre-apply count.

```sql
select
  count(*) filter (where draft_payload is not null) as jobs_with_draft_payload,
  count(*) filter (where locale_results is not null) as jobs_with_locale_results,
  count(*) filter (where applied_at is not null) as jobs_with_applied_at,
  count(*) filter (where discarded_at is not null) as jobs_with_discarded_at,
  count(*) filter (where result_version <> 1) as jobs_with_non_default_result_version
from public.menu_translation_jobs;
```

Expected immediately after apply:

- existing jobs have `draft_payload = null`
- existing jobs have `locale_results = null`
- existing jobs have `applied_at = null`
- existing jobs have `discarded_at = null`
- existing jobs have `result_version = 1`

## 6. Rollback Reference

Use rollback SQL only if the migration has been applied in the wrong
environment and no app code has started writing recovery data.

```sql
begin;

drop index if exists public.menu_translation_jobs_unapplied_result_idx;

alter table public.menu_translation_jobs
  drop constraint if exists menu_translation_jobs_result_version_positive_chk,
  drop constraint if exists menu_translation_jobs_not_applied_and_discarded_chk,
  drop constraint if exists menu_translation_jobs_draft_payload_array_chk,
  drop constraint if exists menu_translation_jobs_locale_results_array_chk;

alter table public.menu_translation_jobs
  drop column if exists draft_payload,
  drop column if exists locale_results,
  drop column if exists applied_at,
  drop column if exists discarded_at,
  drop column if exists result_version;

commit;
```

Do not run rollback after app code depends on these columns unless a separate
release rollback plan is prepared.

## 7. Retention Notes

This migration intentionally does not add `expires_at`, cron cleanup, or
automatic deletion.

Follow-up policy candidates:

- Clear `draft_payload` and `locale_results` from applied/discarded jobs after a
  retention period.
- Decide a retention period for unapplied completed jobs after the recovery UI
  is implemented and observed.
- Keep relying on the existing `menu_site_id` foreign key cascade for hard
  menu-site deletion.

## 8. Next App Step

After SQL Editor application, verification, and typegen:

1. Store normalized draft patches and locale results on completed draft jobs.
2. Load the latest un-applied/un-discarded completed job for the owner.
3. Offer a `최근 자동 번역 결과 불러오기` action in the Localization tab.
4. Apply only empty fields and verify source hashes before filling drafts.
5. Mark the job `applied_at` after Localization final save succeeds.
6. Let the owner discard stale results by setting `discarded_at`.

## 9. Production Apply Record

Applied on 2026-07-28 through the Supabase SQL Editor.

- Migration file:
  `supabase/migrations/20260728232933_add_menu_translation_job_recovery.sql`
- SQL Editor manual execution succeeded.
- `supabase db push` was not used.
- `supabase migration up --linked` was not used.
- Verification confirmed the recovery columns:
  - `draft_payload`
  - `locale_results`
  - `applied_at`
  - `discarded_at`
  - `result_version`
- Verification confirmed `result_version` default `1`.
- Verification confirmed the recovery check constraints.
- Verification confirmed `menu_translation_jobs_unapplied_result_idx`.
- Existing RLS, policies, grants, and updated-at trigger were preserved.
- Existing `menu_translation_jobs` row count and data were unchanged.
- Typegen was run after the SQL Editor apply and reflected the new columns in
  `lib/supabase/types.ts`.
