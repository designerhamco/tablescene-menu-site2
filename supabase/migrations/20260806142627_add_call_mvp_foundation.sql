begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

create table public.menu_customer_calls (
  id uuid primary key default gen_random_uuid(),
  call_number bigint generated always as identity unique,
  menu_site_id uuid not null references public.menu_sites(id) on delete restrict,
  menu_table_id uuid not null,
  table_visit_session_id uuid not null,
  call_type text not null default 'staff',
  status text not null default 'pending',
  acknowledged_by uuid references auth.users(id) on delete set null,
  acknowledged_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_customer_calls_table_fk
    foreign key (menu_site_id, menu_table_id)
    references public.menu_tables(menu_site_id, id)
    on delete restrict,
  constraint menu_customer_calls_session_fk
    foreign key (menu_site_id, menu_table_id, table_visit_session_id)
    references public.table_visit_sessions(menu_site_id, menu_table_id, id)
    on delete restrict,
  constraint menu_customer_calls_site_id_key unique (menu_site_id, id),
  constraint menu_customer_calls_type_check check (call_type = 'staff'),
  constraint menu_customer_calls_status_check
    check (status in ('pending', 'acknowledged', 'completed', 'cancelled')),
  constraint menu_customer_calls_state_check
    check (
      (
        status = 'pending'
        and acknowledged_by is null and acknowledged_at is null
        and completed_by is null and completed_at is null
        and cancelled_at is null
      )
      or (
        status = 'acknowledged'
        and acknowledged_by is not null and acknowledged_at is not null
        and completed_by is null and completed_at is null
        and cancelled_at is null
      )
      or (
        status = 'completed'
        and acknowledged_by is not null and acknowledged_at is not null
        and completed_by is not null and completed_at is not null
        and cancelled_at is null
      )
      or (
        status = 'cancelled'
        and acknowledged_by is null and acknowledged_at is null
        and completed_by is null and completed_at is null
        and cancelled_at is not null
      )
    )
);

create unique index menu_customer_calls_unresolved_session_type_idx
  on public.menu_customer_calls(table_visit_session_id, call_type)
  where status in ('pending', 'acknowledged');
create index menu_customer_calls_site_status_created_idx
  on public.menu_customer_calls(menu_site_id, status, created_at desc);
create index menu_customer_calls_site_table_created_idx
  on public.menu_customer_calls(menu_site_id, menu_table_id, created_at desc);
create index menu_customer_calls_session_created_idx
  on public.menu_customer_calls(table_visit_session_id, created_at desc);

create trigger set_menu_customer_calls_updated_at
before update on public.menu_customer_calls
for each row execute function public.set_updated_at();

alter table public.menu_customer_calls enable row level security;
alter table public.menu_customer_calls force row level security;

revoke all on table public.menu_customer_calls from public, anon, authenticated, service_role;
grant select, insert, update on table public.menu_customer_calls to service_role;
revoke all on sequence public.menu_customer_calls_call_number_seq from public, anon, authenticated, service_role;
grant usage, select on sequence public.menu_customer_calls_call_number_seq to service_role;

create or replace function public.submit_staff_call(
  p_menu_site_id uuid,
  p_table_visit_session_id uuid
)
returns table (
  call_id uuid,
  call_number bigint,
  call_status text,
  is_duplicate boolean
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_session public.table_visit_sessions%rowtype;
  v_existing public.menu_customer_calls%rowtype;
  v_call public.menu_customer_calls%rowtype;
begin
  if p_menu_site_id is null or p_table_visit_session_id is null then
    raise exception using errcode = '22023', message = 'Missing call identity.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('staff-call:' || p_table_visit_session_id::text, 0)
  );

  select session_row.*
    into v_session
  from public.table_visit_sessions as session_row
  join public.menu_tables as table_row
    on table_row.menu_site_id = session_row.menu_site_id
   and table_row.id = session_row.menu_table_id
  join public.menu_sites as site_row
    on site_row.id = session_row.menu_site_id
  where session_row.id = p_table_visit_session_id
    and session_row.menu_site_id = p_menu_site_id
    and session_row.revoked_at is null
    and session_row.expires_at > pg_catalog.now()
    and table_row.status = 'active'
    and site_row.status = 'published'
  for update of session_row;

  if not found then
    raise exception using errcode = '42501', message = 'The table visit session is not active.';
  end if;

  select call_row.*
    into v_existing
  from public.menu_customer_calls as call_row
  where call_row.table_visit_session_id = p_table_visit_session_id
    and call_row.call_type = 'staff'
    and call_row.status in ('pending', 'acknowledged')
  order by call_row.created_at desc
  limit 1;

  if found then
    return query select v_existing.id, v_existing.call_number, v_existing.status, true;
    return;
  end if;

  if exists (
    select 1
    from public.menu_customer_calls as recent_call
    where recent_call.table_visit_session_id = p_table_visit_session_id
      and recent_call.created_at > pg_catalog.now() - interval '2 minutes'
  ) then
    raise exception using errcode = 'P0001', message = 'CALL_COOLDOWN';
  end if;

  if (
    select count(*)
    from public.menu_customer_calls as hourly_call
    where hourly_call.table_visit_session_id = p_table_visit_session_id
      and hourly_call.created_at > pg_catalog.now() - interval '1 hour'
  ) >= 10 then
    raise exception using errcode = 'P0001', message = 'CALL_RATE_LIMIT';
  end if;

  insert into public.menu_customer_calls (
    menu_site_id,
    menu_table_id,
    table_visit_session_id
  ) values (
    p_menu_site_id,
    v_session.menu_table_id,
    p_table_visit_session_id
  )
  returning * into v_call;

  return query select v_call.id, v_call.call_number, v_call.status, false;
end;
$$;

create or replace function public.cancel_pending_staff_call(
  p_menu_site_id uuid,
  p_table_visit_session_id uuid,
  p_call_id uuid
)
returns table (
  call_id uuid,
  call_status text
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_call public.menu_customer_calls%rowtype;
begin
  if p_menu_site_id is null or p_table_visit_session_id is null or p_call_id is null then
    raise exception using errcode = '22023', message = 'Missing call identity.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('staff-call:' || p_table_visit_session_id::text, 0)
  );

  update public.menu_customer_calls
  set status = 'cancelled',
      cancelled_at = pg_catalog.now()
  where id = p_call_id
    and menu_site_id = p_menu_site_id
    and table_visit_session_id = p_table_visit_session_id
    and status = 'pending'
  returning * into v_call;

  if not found then
    raise exception using errcode = 'P0001', message = 'CALL_NOT_CANCELLABLE';
  end if;

  return query select v_call.id, v_call.status;
end;
$$;

revoke all on function public.submit_staff_call(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.submit_staff_call(uuid, uuid) to service_role;
revoke all on function public.cancel_pending_staff_call(uuid, uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.cancel_pending_staff_call(uuid, uuid, uuid) to service_role;

comment on table public.menu_customer_calls is
  'Server-only table-session staff calls. MVP supports one staff preset, unresolved dedupe, two-minute cooldown, and ten calls per session per hour.';
comment on function public.submit_staff_call(uuid, uuid) is
  'Service-role-only invoker RPC for validated table-session staff calls.';
comment on function public.cancel_pending_staff_call(uuid, uuid, uuid) is
  'Service-role-only invoker RPC allowing the same table session to cancel only a pending staff call.';

commit;
