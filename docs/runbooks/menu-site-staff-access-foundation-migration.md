# Menu Site Staff Access Foundation Migration

This runbook manually applies `supabase/migrations/20260805144618_add_menu_site_staff_access_foundation.sql` in the Supabase SQL Editor.

Do not use `supabase db push` or `supabase migration up --linked`. Run the precheck first. If any row has `status = 'STOP'`, do not apply the migration and do not repeat a failed apply.

## Scope

This Phase A migration adds only:

- `menu_site_members`;
- `menu_site_invitations`;
- `menu_site_audit_logs`;
- private owner/member helper functions;
- an authenticated invitation-acceptance wrapper and private transaction function;
- RLS, grants, constraints, indexes, and triggers for those new objects.

It does not change existing `menu_sites`, menu content, translation, Storage, billing, payment, subscription, refund, AI, Order, or Call policies. Existing Owner application behavior remains owner-only until Phase B.

## Confirmed Read-Only Production Baseline

On 2026-08-05, a read-only linked query confirmed:

- `public.menu_sites` RLS is enabled and FORCE RLS is disabled;
- authenticated owner `ALL`, authenticated admin `SELECT`, and anon published `SELECT` policies exist;
- `private` schema exists;
- `private.user_owns_menu_site(text)` is an existing security-definer helper;
- `pgcrypto` and `public.set_updated_at()` exist;
- no existing public table with `audit` or `activity` in its name was returned.

Repeat the precheck immediately before manual apply because remote state can change.

## Application Record

- Pre-apply verification passed with no `STOP` rows.
- Applied on 2026-08-06 through the Supabase SQL Editor.
- The migration block was executed once; `supabase db push` and `supabase migration up --linked` were not used.
- Do not execute the applied migration block again.
- Post-apply verification passed: 3 tables, 12 indexes, 8 policies, 3 triggers, and 8 functions.
- The three new tables contained 0 rows and Owner membership duplication was 0.
- Existing menu content policies remained 73 and `menu_sites` remained 41 rows.
- `npm run supabase:types` completed successfully and updated `lib/supabase/types.ts`; generated types were not edited manually.

## 1. Pre-Apply Verification

Open one new SQL Editor query and run the following read-only statement once. It returns one table with `check_name`, `issue_count`, `status`, and `details`.

```sql
with checks as (
  select
    'target_tables_absent'::text as check_name,
    count(*)::bigint as issue_count,
    case when count(*) = 0 then 'PASS' else 'STOP' end::text as status,
    'menu_site_members, menu_site_invitations, menu_site_audit_logs must not exist'::text as details
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')

  union all

  select
    'target_functions_absent',
    count(*)::bigint,
    case when count(*) = 0 then 'PASS' else 'STOP' end,
    'Phase A helper and acceptance function names must not exist'
  from pg_proc function_row
  join pg_namespace function_schema on function_schema.oid = function_row.pronamespace
  where (
    function_schema.nspname = 'private'
    and function_row.proname in (
      'is_menu_site_owner',
      'get_menu_site_member_role',
      'is_active_menu_site_member',
      'can_read_menu_site',
      'can_edit_menu_site',
      'prevent_menu_site_owner_membership',
      'accept_menu_site_invitation'
    )
  ) or (
    function_schema.nspname = 'public'
    and function_row.proname = 'accept_menu_site_invitation'
  )

  union all

  select
    'target_indexes_absent',
    count(*)::bigint,
    case when count(*) = 0 then 'PASS' else 'STOP' end,
    'Phase A index names must not exist'
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'menu_site_members_user_status_site_idx',
      'menu_site_members_site_status_role_idx',
      'menu_site_members_invited_by_idx',
      'menu_site_invitations_pending_site_email_idx',
      'menu_site_invitations_token_hash_idx',
      'menu_site_invitations_batch_status_site_idx',
      'menu_site_invitations_email_status_expiry_idx',
      'menu_site_invitations_site_status_created_idx',
      'menu_site_invitations_invited_by_idx',
      'menu_site_invitations_accepted_by_idx',
      'menu_site_audit_logs_site_created_idx',
      'menu_site_audit_logs_actor_created_idx'
    )

  union all

  select
    'target_policies_absent',
    count(*)::bigint,
    case when count(*) = 0 then 'PASS' else 'STOP' end,
    'Phase A policy names must not exist'
  from pg_policies
  where schemaname = 'public'
    and tablename in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')

  union all

  select
    'target_triggers_absent',
    count(*)::bigint,
    case when count(*) = 0 then 'PASS' else 'STOP' end,
    'Phase A trigger names must not exist'
  from pg_trigger
  where not tgisinternal
    and tgname in (
      'prevent_menu_site_owner_membership',
      'set_menu_site_members_updated_at',
      'set_menu_site_invitations_updated_at'
    )

  union all

  select
    'menu_sites_rls_enabled',
    case when coalesce(bool_and(site_table.relrowsecurity), false) then 0 else 1 end::bigint,
    case when coalesce(bool_and(site_table.relrowsecurity), false) then 'PASS' else 'STOP' end,
    'public.menu_sites must have RLS enabled'
  from pg_class site_table
  join pg_namespace site_schema on site_schema.oid = site_table.relnamespace
  where site_schema.nspname = 'public'
    and site_table.relname = 'menu_sites'

  union all

  select
    'menu_sites_owner_policy_compatible',
    case when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'menu_sites'
        and cmd = 'ALL'
        and 'authenticated' = any(roles)
        and coalesce(qual, '') like '%auth.uid()%user_id%'
        and coalesce(with_check, '') like '%auth.uid()%user_id%'
    ) then 0 else 1 end::bigint,
    case when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'menu_sites'
        and cmd = 'ALL'
        and 'authenticated' = any(roles)
        and coalesce(qual, '') like '%auth.uid()%user_id%'
        and coalesce(with_check, '') like '%auth.uid()%user_id%'
    ) then 'PASS' else 'STOP' end,
    'An authenticated owner ALL policy must constrain user_id to auth.uid()'

  union all

  select
    'menu_sites_anon_published_policy',
    case when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'menu_sites'
        and cmd = 'SELECT'
        and 'anon' = any(roles)
        and coalesce(qual, '') like '%published%'
    ) then 0 else 1 end::bigint,
    case when exists (
      select 1
      from pg_policies
      where schemaname = 'public'
        and tablename = 'menu_sites'
        and cmd = 'SELECT'
        and 'anon' = any(roles)
        and coalesce(qual, '') like '%published%'
    ) then 'PASS' else 'STOP' end,
    'Anon menu_sites SELECT must remain restricted to published rows'

  union all

  select
    'pgcrypto_available',
    case when exists (select 1 from pg_extension where extname = 'pgcrypto') then 0 else 1 end::bigint,
    case when exists (select 1 from pg_extension where extname = 'pgcrypto') then 'PASS' else 'STOP' end,
    'pgcrypto/gen_random_uuid must be available'

  union all

  select
    'set_updated_at_available',
    case when to_regprocedure('public.set_updated_at()') is not null then 0 else 1 end::bigint,
    case when to_regprocedure('public.set_updated_at()') is not null then 'PASS' else 'STOP' end,
    'Existing public.set_updated_at() trigger function is required'

  union all

  select
    'auth_users_available',
    case when to_regclass('auth.users') is not null then 0 else 1 end::bigint,
    case when to_regclass('auth.users') is not null then 'PASS' else 'STOP' end,
    'auth.users is required for member and actor foreign keys'

  union all

  select
    'private_schema_exists',
    case when exists (select 1 from pg_namespace where nspname = 'private') then 1 else 0 end::bigint,
    'INFO',
    'Existing private schema is reused and is never dropped by rollback'

  union all

  select
    'existing_private_owner_helper',
    count(*)::bigint,
    'INFO',
    'Existing private helpers are preserved; Phase A uses new UUID-signature names'
  from pg_proc function_row
  join pg_namespace function_schema on function_schema.oid = function_row.pronamespace
  where function_schema.nspname = 'private'
    and function_row.proname = 'user_owns_menu_site'

  union all

  select
    'existing_audit_like_tables',
    count(*)::bigint,
    'INFO',
    'Informational only; target table conflict is checked separately'
  from information_schema.tables
  where table_schema = 'public'
    and (table_name ilike '%audit%' or table_name ilike '%activity%')

  union all

  select
    'menu_sites_row_count',
    count(*)::bigint,
    'INFO',
    'Record this baseline and compare it after apply'
  from public.menu_sites

  union all

  select
    'existing_menu_content_policy_count',
    count(*)::bigint,
    'INFO',
    'Record this baseline; Phase A must not change existing content policies'
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'menu_sites',
      'menu_pages',
      'menu_categories',
      'menu_items',
      'menu_item_price_options',
      'menu_item_traits',
      'menu_widgets',
      'menu_widget_items',
      'menu_social_links',
      'menu_chefs',
      'menu_events',
      'menu_promotions',
      'menu_promotion_items',
      'menu_site_translations',
      'menu_page_translations',
      'menu_category_translations',
      'menu_item_translations'
    )
)
select check_name, issue_count, status, details
from checks
order by
  case status when 'STOP' then 0 when 'PASS' then 1 else 2 end,
  check_name;
```

Expected result:

- Every `PASS` row has `issue_count = 0`.
- No `STOP` row is present.
- Target table/function/index/policy/trigger counts are `0`.
- Record `menu_sites_row_count` and `existing_menu_content_policy_count` for post-apply comparison.
- `private_schema_exists` and `existing_private_owner_helper` are informational and may be non-zero.

## 2. SQL Editor Manual Apply

Open one new SQL Editor query. Paste and run the following complete block exactly once. It is machine-compared with `supabase/migrations/20260805144618_add_menu_site_staff_access_foundation.sql`.

<!-- MIGRATION_SQL_START -->
```sql
-- Phase A foundation for menu-site staff access.
-- This migration intentionally does not change existing menu content RLS.

create extension if not exists pgcrypto;
create schema if not exists private;

create table public.menu_site_members (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  invited_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_site_members_menu_site_user_key unique (menu_site_id, user_id),
  constraint menu_site_members_role_check
    check (role in ('manager', 'editor', 'order_staff', 'viewer')),
  constraint menu_site_members_status_check
    check (status in ('active', 'revoked')),
  constraint menu_site_members_state_check
    check (
      (status = 'active' and accepted_at is not null and revoked_at is null)
      or
      (status = 'revoked' and accepted_at is not null and revoked_at is not null)
    )
);

create table public.menu_site_invitations (
  id uuid primary key default gen_random_uuid(),
  invite_batch_id uuid not null,
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  email_normalized text not null,
  role text not null,
  token_hash text not null,
  status text not null default 'pending',
  invited_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz not null,
  accepted_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_site_invitations_email_normalized_check
    check (
      email_normalized = lower(btrim(email_normalized))
      and char_length(email_normalized) between 3 and 320
      and position('@' in email_normalized) > 1
    ),
  constraint menu_site_invitations_role_check
    check (role in ('manager', 'editor', 'order_staff', 'viewer')),
  constraint menu_site_invitations_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint menu_site_invitations_status_check
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  constraint menu_site_invitations_expiry_check
    check (expires_at > created_at),
  constraint menu_site_invitations_state_check
    check (
      (status = 'pending' and accepted_by is null and accepted_at is null and revoked_at is null)
      or
      (status = 'accepted' and accepted_by is not null and accepted_at is not null and revoked_at is null)
      or
      (status = 'revoked' and accepted_by is null and accepted_at is null and revoked_at is not null)
      or
      (status = 'expired' and accepted_by is null and accepted_at is null and revoked_at is null)
    )
);

create table public.menu_site_audit_logs (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  target_type text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint menu_site_audit_logs_actor_role_check
    check (
      actor_role is null
      or actor_role in ('owner', 'manager', 'editor', 'order_staff', 'viewer', 'system')
    ),
  constraint menu_site_audit_logs_action_check
    check (
      char_length(action) between 3 and 100
      and action ~ '^[a-z][a-z0-9_.-]+$'
    ),
  constraint menu_site_audit_logs_target_type_check
    check (target_type is null or char_length(target_type) between 1 and 80),
  constraint menu_site_audit_logs_metadata_object_check
    check (jsonb_typeof(metadata) = 'object')
);

create index menu_site_members_user_status_site_idx
  on public.menu_site_members(user_id, status, menu_site_id);

create index menu_site_members_site_status_role_idx
  on public.menu_site_members(menu_site_id, status, role);

create index menu_site_members_invited_by_idx
  on public.menu_site_members(invited_by)
  where invited_by is not null;

create unique index menu_site_invitations_pending_site_email_idx
  on public.menu_site_invitations(menu_site_id, email_normalized)
  where status = 'pending';

create index menu_site_invitations_token_hash_idx
  on public.menu_site_invitations(token_hash);

create index menu_site_invitations_batch_status_site_idx
  on public.menu_site_invitations(invite_batch_id, status, menu_site_id);

create index menu_site_invitations_email_status_expiry_idx
  on public.menu_site_invitations(email_normalized, status, expires_at);

create index menu_site_invitations_site_status_created_idx
  on public.menu_site_invitations(menu_site_id, status, created_at desc);

create index menu_site_invitations_invited_by_idx
  on public.menu_site_invitations(invited_by)
  where invited_by is not null;

create index menu_site_invitations_accepted_by_idx
  on public.menu_site_invitations(accepted_by)
  where accepted_by is not null;

create index menu_site_audit_logs_site_created_idx
  on public.menu_site_audit_logs(menu_site_id, created_at desc);

create index menu_site_audit_logs_actor_created_idx
  on public.menu_site_audit_logs(actor_user_id, created_at desc)
  where actor_user_id is not null;

create or replace function private.is_menu_site_owner(p_menu_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.menu_sites
    where id = p_menu_site_id
      and user_id = auth.uid()
  );
$$;

create or replace function private.get_menu_site_member_role(p_menu_site_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
  select role
  from public.menu_site_members
  where menu_site_id = p_menu_site_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function private.is_active_menu_site_member(p_menu_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
  select exists (
    select 1
    from public.menu_site_members
    where menu_site_id = p_menu_site_id
      and user_id = auth.uid()
      and status = 'active'
  );
$$;

create or replace function private.can_read_menu_site(p_menu_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $$
  select private.is_menu_site_owner(p_menu_site_id)
    or private.is_active_menu_site_member(p_menu_site_id);
$$;

create or replace function private.can_edit_menu_site(p_menu_site_id uuid)
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $$
  select private.is_menu_site_owner(p_menu_site_id)
    or private.get_menu_site_member_role(p_menu_site_id) in ('manager', 'editor');
$$;

create or replace function private.prevent_menu_site_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public, auth, pg_temp
as $$
begin
  if exists (
    select 1
    from public.menu_sites
    where id = new.menu_site_id
      and user_id = new.user_id
  ) then
    raise exception 'menu site owner cannot be stored as a staff member'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create trigger prevent_menu_site_owner_membership
before insert or update of menu_site_id, user_id
on public.menu_site_members
for each row execute function private.prevent_menu_site_owner_membership();

create trigger set_menu_site_members_updated_at
before update on public.menu_site_members
for each row execute function public.set_updated_at();

create trigger set_menu_site_invitations_updated_at
before update on public.menu_site_invitations
for each row execute function public.set_updated_at();

create or replace function private.accept_menu_site_invitation(p_token_hash text)
returns table (
  accepted_menu_site_id uuid,
  membership_id uuid,
  member_role text,
  accepted_invite_batch_id uuid
)
language plpgsql
security definer
set search_path = pg_catalog, public, private, auth, pg_temp
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_actor_email text;
  v_batch_ids uuid[];
  v_batch_id uuid;
  v_pending_count integer;
  v_now timestamptz := clock_timestamp();
  v_invitation record;
  v_membership_id uuid;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'invitation is invalid' using errcode = '22023';
  end if;

  select lower(btrim(email))
    into v_actor_email
  from auth.users
  where id = v_actor_user_id
    and email_confirmed_at is not null;

  if v_actor_email is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;

  select array_agg(distinct invite_batch_id)
    into v_batch_ids
  from public.menu_site_invitations
  where token_hash = p_token_hash;

  if coalesce(cardinality(v_batch_ids), 0) <> 1 then
    raise exception 'invitation is invalid' using errcode = '22023';
  end if;

  v_batch_id := v_batch_ids[1];

  perform 1
  from public.menu_site_invitations
  where invite_batch_id = v_batch_id
    and token_hash = p_token_hash
  order by id
  for update;

  if exists (
    select 1
    from public.menu_site_invitations
    where invite_batch_id = v_batch_id
      and status = 'pending'
      and token_hash <> p_token_hash
  ) then
    raise exception 'invitation batch has changed' using errcode = '22023';
  end if;

  select count(*)
    into v_pending_count
  from public.menu_site_invitations
  where invite_batch_id = v_batch_id
    and token_hash = p_token_hash
    and status = 'pending';

  if v_pending_count = 0 then
    raise exception 'invitation is no longer available' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.menu_site_invitations
    where invite_batch_id = v_batch_id
      and token_hash = p_token_hash
      and status = 'pending'
      and expires_at <= v_now
  ) then
    raise exception 'invitation has expired' using errcode = '22023';
  end if;

  if exists (
    select 1
    from public.menu_site_invitations
    where invite_batch_id = v_batch_id
      and token_hash = p_token_hash
      and status = 'pending'
      and email_normalized <> v_actor_email
  ) then
    raise exception 'invitation email does not match' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.menu_site_invitations invitation
    join public.menu_sites site on site.id = invitation.menu_site_id
    where invitation.invite_batch_id = v_batch_id
      and invitation.token_hash = p_token_hash
      and invitation.status = 'pending'
      and (
        site.user_id = v_actor_user_id
        or site.user_id is distinct from invitation.invited_by
      )
  ) then
    raise exception 'invitation owner is invalid' using errcode = '42501';
  end if;

  if exists (
    select 1
    from public.menu_site_invitations invitation
    join public.menu_sites site on site.id = invitation.menu_site_id
    where invitation.invite_batch_id = v_batch_id
      and invitation.token_hash = p_token_hash
      and invitation.status = 'pending'
      and site.status = 'archived'
  ) then
    raise exception 'menu site is unavailable' using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.menu_site_invitations invitation
    join public.menu_site_members member
      on member.menu_site_id = invitation.menu_site_id
     and member.user_id = v_actor_user_id
     and member.status = 'active'
    where invitation.invite_batch_id = v_batch_id
      and invitation.token_hash = p_token_hash
      and invitation.status = 'pending'
  ) then
    raise exception 'user is already an active member' using errcode = '23505';
  end if;

  for v_invitation in
    select id, menu_site_id, role, invited_by
    from public.menu_site_invitations
    where invite_batch_id = v_batch_id
      and token_hash = p_token_hash
      and status = 'pending'
    order by id
  loop
    insert into public.menu_site_members (
      menu_site_id,
      user_id,
      role,
      status,
      invited_by,
      accepted_at,
      revoked_at,
      updated_at
    ) values (
      v_invitation.menu_site_id,
      v_actor_user_id,
      v_invitation.role,
      'active',
      v_invitation.invited_by,
      v_now,
      null,
      v_now
    )
    on conflict (menu_site_id, user_id) do update
      set role = excluded.role,
          status = 'active',
          invited_by = excluded.invited_by,
          accepted_at = excluded.accepted_at,
          revoked_at = null,
          updated_at = excluded.updated_at
    returning id into v_membership_id;

    update public.menu_site_invitations
      set status = 'accepted',
          accepted_by = v_actor_user_id,
          accepted_at = v_now,
          revoked_at = null,
          updated_at = v_now
    where id = v_invitation.id
      and status = 'pending';

    if not found then
      raise exception 'invitation changed during acceptance' using errcode = '40001';
    end if;

    insert into public.menu_site_audit_logs (
      menu_site_id,
      actor_user_id,
      actor_role,
      action,
      target_type,
      target_id,
      metadata
    ) values (
      v_invitation.menu_site_id,
      v_actor_user_id,
      v_invitation.role,
      'staff.invitation_accepted',
      'menu_site_member',
      v_membership_id,
      jsonb_build_object(
        'invitation_id', v_invitation.id,
        'invite_batch_id', v_batch_id,
        'role', v_invitation.role
      )
    );

    return query
    select
      v_invitation.menu_site_id,
      v_membership_id,
      v_invitation.role,
      v_batch_id;
  end loop;
end;
$$;

create function public.accept_menu_site_invitation(p_token_hash text)
returns table (
  accepted_menu_site_id uuid,
  membership_id uuid,
  member_role text,
  accepted_invite_batch_id uuid
)
language sql
security invoker
set search_path = pg_catalog, public, private, auth, pg_temp
as $$
  select * from private.accept_menu_site_invitation(p_token_hash);
$$;

grant usage on schema private to authenticated, service_role;

revoke all on function private.is_menu_site_owner(uuid) from public;
revoke all on function private.get_menu_site_member_role(uuid) from public;
revoke all on function private.is_active_menu_site_member(uuid) from public;
revoke all on function private.can_read_menu_site(uuid) from public;
revoke all on function private.can_edit_menu_site(uuid) from public;
revoke all on function private.prevent_menu_site_owner_membership() from public;
revoke all on function private.accept_menu_site_invitation(text) from public;
revoke all on function public.accept_menu_site_invitation(text) from public, anon;

grant execute on function private.is_menu_site_owner(uuid) to authenticated, service_role;
grant execute on function private.get_menu_site_member_role(uuid) to authenticated, service_role;
grant execute on function private.is_active_menu_site_member(uuid) to authenticated, service_role;
grant execute on function private.can_read_menu_site(uuid) to authenticated, service_role;
grant execute on function private.can_edit_menu_site(uuid) to authenticated, service_role;
grant execute on function private.accept_menu_site_invitation(text) to authenticated, service_role;
grant execute on function public.accept_menu_site_invitation(text) to authenticated;

revoke all on public.menu_site_members from anon, authenticated;
revoke all on public.menu_site_invitations from anon, authenticated;
revoke all on public.menu_site_audit_logs from anon, authenticated;

grant select on public.menu_site_members to authenticated;
grant select on public.menu_site_invitations to authenticated;
grant select on public.menu_site_audit_logs to authenticated;

grant select, insert, update, delete on public.menu_site_members to service_role;
grant select, insert, update, delete on public.menu_site_invitations to service_role;
grant select, insert on public.menu_site_audit_logs to service_role;

alter table public.menu_site_members enable row level security;
alter table public.menu_site_invitations enable row level security;
alter table public.menu_site_audit_logs enable row level security;

create policy "menu_site_members owner select"
on public.menu_site_members
for select to authenticated
using (private.is_menu_site_owner(menu_site_id));

create policy "menu_site_members self active select"
on public.menu_site_members
for select to authenticated
using (user_id = auth.uid() and status = 'active');

create policy "menu_site_members service role all"
on public.menu_site_members
for all to service_role
using (true)
with check (true);

create policy "menu_site_invitations owner select"
on public.menu_site_invitations
for select to authenticated
using (private.is_menu_site_owner(menu_site_id));

create policy "menu_site_invitations service role all"
on public.menu_site_invitations
for all to service_role
using (true)
with check (true);

create policy "menu_site_audit_logs owner select"
on public.menu_site_audit_logs
for select to authenticated
using (private.is_menu_site_owner(menu_site_id));

create policy "menu_site_audit_logs service role insert"
on public.menu_site_audit_logs
for insert to service_role
with check (true);

create policy "menu_site_audit_logs service role select"
on public.menu_site_audit_logs
for select to service_role
using (true);

comment on table public.menu_site_members is
  'Current per-menu-site staff access. Owners remain canonical in menu_sites.user_id.';

comment on table public.menu_site_invitations is
  'Per-menu-site invitation rows. Rows in one invite action share invite_batch_id and token_hash.';

comment on table public.menu_site_audit_logs is
  'Append-only menu-site authorization and operational audit events. Never store tokens, secrets, or raw provider payloads.';

comment on function public.accept_menu_site_invitation(text) is
  'Authenticated invitation acceptance wrapper. The server hashes the raw token before calling this function.';
```
<!-- MIGRATION_SQL_END -->

Normal result: `Success. No rows returned`.

If any error appears, do not click Run again. Preserve the complete error and inspect the current catalog before deciding whether rollback is appropriate.

## 3. Post-Apply Verification

### 3.1 Summary

Run this read-only query once. Every `PASS` row must have `issue_count = 0`.

```sql
with checks as (
  select
    'three_tables_exist'::text as check_name,
    (3 - count(*))::bigint as issue_count,
    case when count(*) = 3 then 'PASS' else 'STOP' end::text as status,
    'members, invitations, audit logs'::text as details
  from information_schema.tables
  where table_schema = 'public'
    and table_name in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')

  union all

  select
    'three_tables_rls_enabled',
    (3 - count(*))::bigint,
    case when count(*) = 3 then 'PASS' else 'STOP' end,
    'All new public tables must have RLS enabled'
  from pg_class table_row
  join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
  where table_schema.nspname = 'public'
    and table_row.relname in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
    and table_row.relrowsecurity

  union all

  select
    'fourteen_named_constraints',
    (14 - count(*))::bigint,
    case when count(*) = 14 then 'PASS' else 'STOP' end,
    'Role/status/state/email/token/expiry/audit constraints plus member unique'
  from pg_constraint
  where conname in (
    'menu_site_members_menu_site_user_key',
    'menu_site_members_role_check',
    'menu_site_members_status_check',
    'menu_site_members_state_check',
    'menu_site_invitations_email_normalized_check',
    'menu_site_invitations_role_check',
    'menu_site_invitations_token_hash_check',
    'menu_site_invitations_status_check',
    'menu_site_invitations_expiry_check',
    'menu_site_invitations_state_check',
    'menu_site_audit_logs_actor_role_check',
    'menu_site_audit_logs_action_check',
    'menu_site_audit_logs_target_type_check',
    'menu_site_audit_logs_metadata_object_check'
  )

  union all

  select
    'twelve_named_indexes',
    (12 - count(*))::bigint,
    case when count(*) = 12 then 'PASS' else 'STOP' end,
    'Phase A lookup and partial indexes'
  from pg_indexes
  where schemaname = 'public'
    and indexname in (
      'menu_site_members_user_status_site_idx',
      'menu_site_members_site_status_role_idx',
      'menu_site_members_invited_by_idx',
      'menu_site_invitations_pending_site_email_idx',
      'menu_site_invitations_token_hash_idx',
      'menu_site_invitations_batch_status_site_idx',
      'menu_site_invitations_email_status_expiry_idx',
      'menu_site_invitations_site_status_created_idx',
      'menu_site_invitations_invited_by_idx',
      'menu_site_invitations_accepted_by_idx',
      'menu_site_audit_logs_site_created_idx',
      'menu_site_audit_logs_actor_created_idx'
    )

  union all

  select
    'all_new_foreign_keys_indexed',
    count(*)::bigint,
    case when count(*) = 0 then 'PASS' else 'STOP' end,
    'Every foreign-key column on the three new tables must be covered by an index'
  from pg_constraint constraint_row
  cross join lateral unnest(constraint_row.conkey) as key_column(attnum)
  where constraint_row.contype = 'f'
    and constraint_row.conrelid in (
      'public.menu_site_members'::regclass,
      'public.menu_site_invitations'::regclass,
      'public.menu_site_audit_logs'::regclass
    )
    and not exists (
      select 1
      from pg_index index_row
      where index_row.indrelid = constraint_row.conrelid
        and key_column.attnum = any(index_row.indkey)
    )

  union all

  select
    'eight_policies',
    (8 - count(*))::bigint,
    case when count(*) = 8 then 'PASS' else 'STOP' end,
    'Owner/self/service-role policies on new tables only'
  from pg_policies
  where schemaname = 'public'
    and tablename in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')

  union all

  select
    'three_triggers',
    (3 - count(*))::bigint,
    case when count(*) = 3 then 'PASS' else 'STOP' end,
    'Owner exclusion and updated_at triggers'
  from pg_trigger
  where not tgisinternal
    and tgname in (
      'prevent_menu_site_owner_membership',
      'set_menu_site_members_updated_at',
      'set_menu_site_invitations_updated_at'
    )

  union all

  select
    'eight_functions',
    (8 - count(*))::bigint,
    case when count(*) = 8 then 'PASS' else 'STOP' end,
    'Seven private helpers/functions and one public security-invoker wrapper'
  from pg_proc function_row
  join pg_namespace function_schema on function_schema.oid = function_row.pronamespace
  where (
    function_schema.nspname = 'private'
    and function_row.proname in (
      'is_menu_site_owner',
      'get_menu_site_member_role',
      'is_active_menu_site_member',
      'can_read_menu_site',
      'can_edit_menu_site',
      'prevent_menu_site_owner_membership',
      'accept_menu_site_invitation'
    )
  ) or (
    function_schema.nspname = 'public'
    and function_row.proname = 'accept_menu_site_invitation'
  )

  union all

  select
    'private_functions_are_security_definer',
    count(*) filter (where not function_row.prosecdef)::bigint,
    case when count(*) = 7 and count(*) filter (where not function_row.prosecdef) = 0 then 'PASS' else 'STOP' end,
    'All seven private functions must be security definer'
  from pg_proc function_row
  join pg_namespace function_schema on function_schema.oid = function_row.pronamespace
  where function_schema.nspname = 'private'
    and function_row.proname in (
      'is_menu_site_owner',
      'get_menu_site_member_role',
      'is_active_menu_site_member',
      'can_read_menu_site',
      'can_edit_menu_site',
      'prevent_menu_site_owner_membership',
      'accept_menu_site_invitation'
    )

  union all

  select
    'public_wrapper_is_security_invoker',
    case when count(*) = 1 and bool_and(not function_row.prosecdef) then 0 else 1 end::bigint,
    case when count(*) = 1 and bool_and(not function_row.prosecdef) then 'PASS' else 'STOP' end,
    'Public RPC wrapper must remain security invoker; privileged logic stays in private schema'
  from pg_proc function_row
  join pg_namespace function_schema on function_schema.oid = function_row.pronamespace
  where function_schema.nspname = 'public'
    and function_row.proname = 'accept_menu_site_invitation'

  union all

  select
    'acceptance_execute_scope',
    case when
      not has_function_privilege('anon', 'public.accept_menu_site_invitation(text)', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.accept_menu_site_invitation(text)', 'EXECUTE')
      and has_function_privilege('authenticated', 'private.accept_menu_site_invitation(text)', 'EXECUTE')
    then 0 else 1 end::bigint,
    case when
      not has_function_privilege('anon', 'public.accept_menu_site_invitation(text)', 'EXECUTE')
      and has_function_privilege('authenticated', 'public.accept_menu_site_invitation(text)', 'EXECUTE')
      and has_function_privilege('authenticated', 'private.accept_menu_site_invitation(text)', 'EXECUTE')
    then 'PASS' else 'STOP' end,
    'Authenticated executes the public invoker wrapper; its private definer target is unavailable through the exposed Data API schema'

  union all

  select
    'token_hash_index_is_non_unique',
    count(*) filter (where index_row.indisunique)::bigint,
    case when count(*) = 1 and count(*) filter (where index_row.indisunique) = 0 then 'PASS' else 'STOP' end,
    'Shared batch token hash must not be unique'
  from pg_index index_row
  join pg_class index_class on index_class.oid = index_row.indexrelid
  join pg_namespace index_schema on index_schema.oid = index_class.relnamespace
  where index_schema.nspname = 'public'
    and index_class.relname = 'menu_site_invitations_token_hash_idx'

  union all

  select
    'authenticated_table_writes_revoked',
    count(*)::bigint,
    case when count(*) = 0 then 'PASS' else 'STOP' end,
    'Authenticated may SELECT new tables but cannot INSERT/UPDATE/DELETE directly'
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
    and grantee = 'authenticated'
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE', 'REFERENCES', 'TRIGGER')

  union all

  select
    'anon_table_privileges_revoked',
    count(*)::bigint,
    case when count(*) = 0 then 'PASS' else 'STOP' end,
    'Anon must have no privileges on staff foundation tables'
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
    and grantee = 'anon'

  union all

  select
    'new_tables_empty',
    (
      (select count(*) from public.menu_site_members)
      + (select count(*) from public.menu_site_invitations)
      + (select count(*) from public.menu_site_audit_logs)
    )::bigint,
    case when
      (select count(*) from public.menu_site_members)
      + (select count(*) from public.menu_site_invitations)
      + (select count(*) from public.menu_site_audit_logs) = 0
    then 'PASS' else 'STOP' end,
    'No member, invitation, or audit rows are created by migration'

  union all

  select
    'owner_rows_not_duplicated',
    count(*)::bigint,
    case when count(*) = 0 then 'PASS' else 'STOP' end,
    'menu_sites owners must not appear as staff members'
  from public.menu_site_members member
  join public.menu_sites site
    on site.id = member.menu_site_id
   and site.user_id = member.user_id

  union all

  select
    'menu_sites_row_count',
    count(*)::bigint,
    'INFO',
    'Must match the recorded pre-apply baseline'
  from public.menu_sites

  union all

  select
    'existing_menu_content_policy_count',
    count(*)::bigint,
    'INFO',
    'Must match the recorded pre-apply baseline'
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'menu_sites',
      'menu_pages',
      'menu_categories',
      'menu_items',
      'menu_item_price_options',
      'menu_item_traits',
      'menu_widgets',
      'menu_widget_items',
      'menu_social_links',
      'menu_chefs',
      'menu_events',
      'menu_promotions',
      'menu_promotion_items',
      'menu_site_translations',
      'menu_page_translations',
      'menu_category_translations',
      'menu_item_translations'
    )
)
select check_name, issue_count, status, details
from checks
order by
  case status when 'STOP' then 0 when 'PASS' then 1 else 2 end,
  check_name;
```

### 3.2 Columns and defaults

```sql
select table_name, ordinal_position, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
order by table_name, ordinal_position;
```

### 3.3 Constraints and indexes

```sql
select
  table_row.relname as table_name,
  constraint_row.conname,
  constraint_row.contype,
  pg_get_constraintdef(constraint_row.oid) as definition
from pg_constraint constraint_row
join pg_class table_row on table_row.oid = constraint_row.conrelid
join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
where table_schema.nspname = 'public'
  and table_row.relname in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
order by table_name, constraint_row.conname;

select schemaname, tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
order by tablename, indexname;
```

Confirm that `menu_site_invitations_token_hash_idx` is non-unique and the pending `(menu_site_id, email_normalized)` index is unique and partial.

### 3.4 RLS and policies

```sql
select table_row.relname as table_name, table_row.relrowsecurity, table_row.relforcerowsecurity
from pg_class table_row
join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
where table_schema.nspname = 'public'
  and table_row.relname in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
order by table_name;

select tablename, policyname, permissive, roles, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
order by tablename, policyname;
```

### 3.5 Functions, security mode, and search path

```sql
select
  function_schema.nspname as function_schema,
  function_row.proname as function_name,
  pg_get_function_identity_arguments(function_row.oid) as arguments,
  function_row.prosecdef as security_definer,
  function_row.provolatile as volatility,
  function_row.proconfig as function_config,
  has_function_privilege('anon', function_row.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', function_row.oid, 'EXECUTE') as authenticated_execute
from pg_proc function_row
join pg_namespace function_schema on function_schema.oid = function_row.pronamespace
where (
  function_schema.nspname = 'private'
  and function_row.proname in (
    'is_menu_site_owner',
    'get_menu_site_member_role',
    'is_active_menu_site_member',
    'can_read_menu_site',
    'can_edit_menu_site',
    'prevent_menu_site_owner_membership',
    'accept_menu_site_invitation'
  )
) or (
  function_schema.nspname = 'public'
  and function_row.proname = 'accept_menu_site_invitation'
)
order by function_schema, function_name;
```

Expected:

- all private functions: `security_definer = true` with fixed `search_path`;
- public wrapper: `security_definer = false` with fixed `search_path`;
- anon cannot execute acceptance;
- authenticated can execute the public acceptance wrapper;
- privileged acceptance logic remains in the non-exposed `private` schema;
- raw tokens are never passed to the RPC; the future server sends a lowercase SHA-256 hex hash.

### 3.6 Grants and triggers

```sql
select table_name, grantee, privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('menu_site_members', 'menu_site_invitations', 'menu_site_audit_logs')
order by table_name, grantee, privilege_type;

select
  table_row.relname as table_name,
  trigger_row.tgname,
  pg_get_triggerdef(trigger_row.oid) as definition
from pg_trigger trigger_row
join pg_class table_row on table_row.oid = trigger_row.tgrelid
join pg_namespace table_schema on table_schema.oid = table_row.relnamespace
where table_schema.nspname = 'public'
  and table_row.relname in ('menu_site_members', 'menu_site_invitations')
  and not trigger_row.tgisinternal
order by table_name, trigger_row.tgname;
```

## 4. Expected State After Apply

- Three new tables exist with zero rows.
- Owner remains canonical in `menu_sites.user_id`; no owner membership is created.
- Multi-site invitations use per-site rows with one batch ID and shared non-unique token hash.
- Authenticated users cannot directly mutate the new tables.
- Owner may read staff foundation rows for owned sites; an active member may read only their own active membership.
- Invitation acceptance is authenticated, email-matched, expiry-checked, batch-atomic, race-safe, and audited.
- Existing `menu_sites` and menu content policies/counts are unchanged.
- Existing Owner app behavior remains unchanged because Phase B is not implemented.

## 5. Type Generation After Manual Apply

Type generation is required because three tables and one public RPC are added. Only after post-apply verification passes, run:

```bash
npm run supabase:types
```

Do not edit `lib/supabase/types.ts` manually.

## 6. Emergency Rollback Reference

Do not run rollback merely because an apply failed. Inspect which objects exist first. If Phase A must be intentionally removed before any production invitation/member/audit rows are used, review and execute this block manually:

```sql
begin;

drop function if exists public.accept_menu_site_invitation(text);
drop table if exists public.menu_site_audit_logs;
drop table if exists public.menu_site_invitations;
drop table if exists public.menu_site_members;
drop function if exists private.accept_menu_site_invitation(text);
drop function if exists private.prevent_menu_site_owner_membership();
drop function if exists private.can_edit_menu_site(uuid);
drop function if exists private.can_read_menu_site(uuid);
drop function if exists private.is_active_menu_site_member(uuid);
drop function if exists private.get_menu_site_member_role(uuid);
drop function if exists private.is_menu_site_owner(uuid);

commit;
```

Rollback intentionally does not drop `private` schema, `pgcrypto`, `public.set_updated_at()`, or the pre-existing `private.user_owns_menu_site(text)` helper.

## 7. Features Still Inactive After Phase A

- Staff cannot yet see assigned sites in mypage.
- Existing edit, preview, upload, AI, and publish paths remain Owner-only.
- Invitation creation/resend/cancel UI and email delivery do not exist yet.
- Existing menu content and Storage policies are unchanged.
- Order and Call remain locked and unimplemented.

Phase B starts only after manual apply, post-apply verification, and generated type update.
