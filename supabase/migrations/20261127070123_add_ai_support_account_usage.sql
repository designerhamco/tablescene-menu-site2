begin;

set local lock_timeout = '5s';

create table public.ai_support_account_usage (
  account_id uuid primary key references auth.users(id) on delete cascade,
  reset_at timestamptz not null,
  spent_tokens integer not null default 0 check (spent_tokens >= 0),
  reservation_id uuid,
  reserved_tokens integer not null default 0 check (reserved_tokens >= 0),
  reserved_until timestamptz,
  constraint ai_support_reservation_consistency check (
    (reservation_id is null and reserved_until is null and reserved_tokens = 0)
    or (reservation_id is not null and reserved_until is not null
      and reserved_tokens > 0 and reserved_tokens <= spent_tokens)
  )
);

alter table public.ai_support_account_usage enable row level security;
revoke all on table public.ai_support_account_usage from public, anon, authenticated, service_role;
grant select, insert, update on table public.ai_support_account_usage to service_role;

create function public.get_ai_support_account_quota(
  p_account_id uuid,
  p_daily_limit integer,
  p_reserve_tokens integer
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select coalesce(
    (
      select case
        when usage.reserved_until > statement_timestamp()
          then jsonb_build_object('status', 'busy', 'retryAt', usage.reserved_until)
        when usage.reset_at > statement_timestamp()
          and usage.spent_tokens + p_reserve_tokens > p_daily_limit
          then jsonb_build_object('status', 'limited', 'resetAt', usage.reset_at)
        else '{"status":"ready"}'::jsonb
      end
      from public.ai_support_account_usage as usage
      where usage.account_id = p_account_id
    ),
    '{"status":"ready"}'::jsonb
  );
$$;

create function public.reserve_ai_support_account_usage(
  p_account_id uuid,
  p_reservation_id uuid,
  p_daily_limit integer,
  p_reserve_tokens integer
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_usage public.ai_support_account_usage%rowtype;
  v_now timestamptz;
begin
  if p_reservation_id is null
    or p_reserve_tokens is null or p_reserve_tokens < 1
    or p_daily_limit is null or p_daily_limit < p_reserve_tokens
  then
    raise exception 'Invalid AI support reservation' using errcode = '22023';
  end if;

  insert into public.ai_support_account_usage (account_id, reset_at)
  values (p_account_id, clock_timestamp())
  on conflict (account_id) do nothing;

  select * into strict v_usage
  from public.ai_support_account_usage
  where account_id = p_account_id
  for update;

  v_now := clock_timestamp();
  if v_usage.reserved_until > v_now then
    return jsonb_build_object('status', 'busy', 'retryAt', v_usage.reserved_until);
  end if;

  if v_usage.reset_at <= v_now then
    v_usage.reset_at := v_now + interval '24 hours';
    v_usage.spent_tokens := 0;
  end if;

  if v_usage.spent_tokens + p_reserve_tokens > p_daily_limit then
    return jsonb_build_object('status', 'limited', 'resetAt', v_usage.reset_at);
  end if;

  -- Charge up front so a timeout or worker exit cannot free potentially used tokens.
  update public.ai_support_account_usage
  set reset_at = v_usage.reset_at,
      spent_tokens = v_usage.spent_tokens + p_reserve_tokens,
      reservation_id = p_reservation_id,
      reserved_tokens = p_reserve_tokens,
      reserved_until = v_now + interval '60 seconds'
  where account_id = p_account_id;

  return '{"status":"ready"}'::jsonb;
end;
$$;

create function public.settle_ai_support_account_usage(
  p_account_id uuid,
  p_reservation_id uuid,
  p_daily_limit integer,
  p_reserve_tokens integer,
  p_actual_tokens integer default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if p_actual_tokens < 0 then
    raise exception 'Invalid AI support usage' using errcode = '22023';
  end if;

  update public.ai_support_account_usage
  set reset_at = case
        when p_actual_tokens = 0 and spent_tokens = reserved_tokens then clock_timestamp()
        else reset_at
      end,
      spent_tokens = spent_tokens - reserved_tokens + coalesce(p_actual_tokens, reserved_tokens),
      reservation_id = null,
      reserved_tokens = 0,
      reserved_until = null
  where account_id = p_account_id and reservation_id = p_reservation_id;

  return public.get_ai_support_account_quota(p_account_id, p_daily_limit, p_reserve_tokens);
end;
$$;

revoke execute on function public.get_ai_support_account_quota(uuid, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.reserve_ai_support_account_usage(uuid, uuid, integer, integer)
  from public, anon, authenticated;
revoke execute on function public.settle_ai_support_account_usage(uuid, uuid, integer, integer, integer)
  from public, anon, authenticated;

grant execute on function public.get_ai_support_account_quota(uuid, integer, integer)
  to service_role;
grant execute on function public.reserve_ai_support_account_usage(uuid, uuid, integer, integer)
  to service_role;
grant execute on function public.settle_ai_support_account_usage(uuid, uuid, integer, integer, integer)
  to service_role;

commit;
