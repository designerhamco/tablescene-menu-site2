begin;

-- Table QR and visit-session foundation.
--
-- Product constants approved on 2026-08-06:
-- - at most 100 non-archived tables per menu site
-- - table and visit-session secrets are stored as SHA-256 hashes only
-- - visit sessions live for at most 12 hours
--
-- This migration intentionally does not create Order/Call entitlements, expose
-- customer APIs, or modify existing menu-site policies.

create schema if not exists private;

create table public.menu_tables (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  label text not null,
  display_order integer not null default 0,
  status text not null default 'active',
  token_hash text not null,
  token_rotated_at timestamptz not null default now(),
  archived_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_tables_site_id_id_key unique (menu_site_id, id),
  constraint menu_tables_label_check
    check (
      label = btrim(label)
      and char_length(label) between 1 and 80
    ),
  constraint menu_tables_display_order_check
    check (display_order between 0 and 9999),
  constraint menu_tables_status_check
    check (status in ('active', 'disabled', 'archived')),
  constraint menu_tables_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint menu_tables_archive_state_check
    check (
      (status = 'archived' and archived_at is not null)
      or
      (status in ('active', 'disabled') and archived_at is null)
    )
);

create unique index menu_tables_token_hash_idx
  on public.menu_tables(token_hash);

create unique index menu_tables_active_label_idx
  on public.menu_tables(menu_site_id, lower(label))
  where status <> 'archived';

create index menu_tables_site_status_order_idx
  on public.menu_tables(menu_site_id, status, display_order, created_at);

create index menu_tables_created_by_idx
  on public.menu_tables(created_by)
  where created_by is not null;

create index menu_tables_updated_by_idx
  on public.menu_tables(updated_by)
  where updated_by is not null;

create table public.table_visit_sessions (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null,
  menu_table_id uuid not null,
  token_hash text not null,
  user_agent_hash text not null,
  expires_at timestamptz not null,
  last_seen_at timestamptz not null default now(),
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  constraint table_visit_sessions_table_fk
    foreign key (menu_site_id, menu_table_id)
    references public.menu_tables(menu_site_id, id)
    on delete cascade,
  constraint table_visit_sessions_token_hash_check
    check (token_hash ~ '^[0-9a-f]{64}$'),
  constraint table_visit_sessions_user_agent_hash_check
    check (user_agent_hash ~ '^[0-9a-f]{64}$'),
  constraint table_visit_sessions_expiry_check
    check (
      expires_at > created_at
      and expires_at <= created_at + interval '12 hours'
    ),
  constraint table_visit_sessions_last_seen_check
    check (last_seen_at >= created_at and last_seen_at <= expires_at),
  constraint table_visit_sessions_revoke_check
    check (revoked_at is null or revoked_at >= created_at)
);

create unique index table_visit_sessions_token_hash_idx
  on public.table_visit_sessions(token_hash);

create index table_visit_sessions_site_table_idx
  on public.table_visit_sessions(menu_site_id, menu_table_id);

create index table_visit_sessions_table_expiry_idx
  on public.table_visit_sessions(menu_table_id, expires_at desc)
  where revoked_at is null;

create index table_visit_sessions_site_expiry_idx
  on public.table_visit_sessions(menu_site_id, expires_at desc)
  where revoked_at is null;

create or replace function private.enforce_menu_table_limit()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_table_count integer;
begin
  if tg_op = 'UPDATE' then
    if old.menu_site_id <> new.menu_site_id then
      raise exception 'menu table cannot move between menu sites'
        using errcode = '23514';
    end if;
  end if;

  if new.status = 'archived' then
    return new;
  end if;

  if tg_op = 'UPDATE' then
    if old.menu_site_id = new.menu_site_id
      and old.status <> 'archived' then
      return new;
    end if;
  end if;

  -- Lock the parent row so concurrent creates for one menu site cannot both
  -- pass the count check.
  perform 1
  from public.menu_sites
  where id = new.menu_site_id
  for update;

  select count(*)
    into v_table_count
  from public.menu_tables
  where menu_site_id = new.menu_site_id
    and status <> 'archived'
    and (tg_op = 'INSERT' or id <> new.id);

  if v_table_count >= 100 then
    raise exception 'menu table limit exceeded'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.revoke_table_visit_sessions()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if old.token_hash is distinct from new.token_hash
    or (old.status = 'active' and new.status <> 'active') then
    update public.table_visit_sessions
    set revoked_at = coalesce(revoked_at, clock_timestamp())
    where menu_table_id = new.id
      and revoked_at is null
      and expires_at > clock_timestamp();
  end if;

  if old.token_hash is distinct from new.token_hash then
    new.token_rotated_at := clock_timestamp();
  end if;

  return new;
end;
$$;

create trigger enforce_menu_table_limit
before insert or update of menu_site_id, status
on public.menu_tables
for each row execute function private.enforce_menu_table_limit();

create trigger revoke_table_visit_sessions
before update of token_hash, status
on public.menu_tables
for each row execute function private.revoke_table_visit_sessions();

create trigger set_menu_tables_updated_at
before update on public.menu_tables
for each row execute function public.set_updated_at();

alter table public.menu_tables enable row level security;
alter table public.table_visit_sessions enable row level security;
alter table public.menu_tables force row level security;
alter table public.table_visit_sessions force row level security;

-- Runtime access is intentionally server-only. The service layer must perform
-- menu-site permission and lifecycle checks before using the service role.
revoke all on table public.menu_tables from public, anon, authenticated;
revoke all on table public.table_visit_sessions from public, anon, authenticated;
revoke all on table public.menu_tables from service_role;
revoke all on table public.table_visit_sessions from service_role;

grant select, insert, update on table public.menu_tables to service_role;
grant select, insert, update on table public.table_visit_sessions to service_role;

revoke all on function private.enforce_menu_table_limit() from public, anon, authenticated;
revoke all on function private.revoke_table_visit_sessions() from public, anon, authenticated;

comment on table public.menu_tables is
  'Physical menu-site tables. Only SHA-256 QR token hashes are persisted.';
comment on column public.menu_tables.token_hash is
  'SHA-256 hash of the one-time-delivered public table QR token.';
comment on table public.table_visit_sessions is
  'Server-issued table visit sessions with a maximum lifetime of 12 hours.';
comment on column public.table_visit_sessions.token_hash is
  'SHA-256 hash of the HttpOnly browser session token.';

commit;
