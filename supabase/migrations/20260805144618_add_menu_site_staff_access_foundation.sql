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
