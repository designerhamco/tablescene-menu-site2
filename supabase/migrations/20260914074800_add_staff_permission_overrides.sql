-- Store owner-managed per-member permission differences without weakening the
-- existing role presets. Billing, staff management, archive, and baseline read
-- access intentionally remain outside this override surface.

create or replace function private.is_valid_menu_site_permission_overrides(candidate jsonb)
returns boolean
language plpgsql
immutable
set search_path = ''
as $$
declare
  item jsonb;
  permission_name text;
begin
  if candidate is null or pg_catalog.jsonb_typeof(candidate) <> 'object' then
    return false;
  end if;

  if not (candidate ? 'allow')
    or not (candidate ? 'deny')
    or candidate - 'allow' - 'deny' <> '{}'::jsonb
    or pg_catalog.jsonb_typeof(candidate -> 'allow') <> 'array'
    or pg_catalog.jsonb_typeof(candidate -> 'deny') <> 'array'
  then
    return false;
  end if;

  for item in
    select value from pg_catalog.jsonb_array_elements(candidate -> 'allow')
    union all
    select value from pg_catalog.jsonb_array_elements(candidate -> 'deny')
  loop
    if pg_catalog.jsonb_typeof(item) <> 'string' then
      return false;
    end if;

    permission_name := item #>> '{}';
    if permission_name not in (
      'menu.edit',
      'menu.publish',
      'ai.use',
      'qr.manage',
      'table.manage',
      'order.read',
      'order.manage',
      'order.cancel_unpaid',
      'payment.manual',
      'call.manage',
      'pickup.manage',
      'sales.read'
    ) then
      return false;
    end if;
  end loop;

  return true;
end;
$$;

alter table public.menu_site_members
  add column if not exists permission_overrides jsonb not null
    default '{"allow":[],"deny":[]}'::jsonb;

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'menu_site_members_permission_overrides_check'
      and conrelid = 'public.menu_site_members'::regclass
  ) then
    alter table public.menu_site_members
      add constraint menu_site_members_permission_overrides_check
      check (private.is_valid_menu_site_permission_overrides(permission_overrides));
  end if;
end;
$$;

revoke all on function private.is_valid_menu_site_permission_overrides(jsonb)
  from public, anon, authenticated;

comment on column public.menu_site_members.permission_overrides is
  'Owner-managed allow/deny differences from the member role preset; owner-only permissions and menu.read are forbidden.';

create or replace function public.update_menu_site_member_access(
  p_actor_user_id uuid,
  p_membership_id uuid,
  p_expected_role text,
  p_expected_updated_at timestamptz,
  p_next_role text,
  p_next_permission_overrides jsonb,
  p_action text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  previous_overrides jsonb;
begin
  if auth.role() <> 'service_role' then
    raise exception 'service role required' using errcode = '42501';
  end if;

  if p_action not in ('staff.role_changed', 'staff.permissions_changed') then
    raise exception 'unsupported staff access action' using errcode = '22023';
  end if;

  select member.permission_overrides
  into previous_overrides
  from public.menu_site_members as member
  where member.id = p_membership_id
    and member.status = 'active'
    and member.role = p_expected_role
    and member.updated_at = p_expected_updated_at
    and exists (
      select 1
      from public.menu_sites as menu_site
      where menu_site.id = member.menu_site_id
        and menu_site.user_id = p_actor_user_id
    )
  for update;

  if not found then
    return false;
  end if;

  update public.menu_site_members as member
  set
    role = p_next_role,
    permission_overrides = p_next_permission_overrides
  where member.id = p_membership_id;

  insert into public.menu_site_audit_logs (
    menu_site_id,
    actor_user_id,
    actor_role,
    action,
    target_type,
    target_id,
    metadata
  )
  select
    member.menu_site_id,
    p_actor_user_id,
    'owner',
    p_action,
    'menu_site_member',
    member.id,
    pg_catalog.jsonb_build_object(
      'from_role', p_expected_role,
      'to_role', p_next_role,
      'from_permission_overrides', previous_overrides,
      'to_permission_overrides', p_next_permission_overrides
    )
  from public.menu_site_members as member
  where member.id = p_membership_id;

  return true;
end;
$$;

revoke all on function public.update_menu_site_member_access(
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.update_menu_site_member_access(
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  jsonb,
  text
) to service_role;

comment on function public.update_menu_site_member_access(
  uuid,
  uuid,
  text,
  timestamptz,
  text,
  jsonb,
  text
) is 'Atomically updates an owner-scoped active staff membership and records its audit event.';
