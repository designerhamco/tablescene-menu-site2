begin;

create table public.menu_order_alimtalk_attempts (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null,
  order_id uuid not null,
  attempt_no integer not null check (attempt_no > 0),
  status text not null default 'pending' check (status in ('pending', 'sent', 'failed')),
  provider_message_id text unique check (length(provider_message_id) <= 128),
  submission_started_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint menu_order_alimtalk_attempts_order_fkey foreign key (menu_site_id, order_id)
    references public.menu_customer_orders(menu_site_id, id) on delete cascade,
  unique (menu_site_id, order_id, attempt_no),
  check ((status = 'pending') = (resolved_at is null)),
  check (provider_message_id is null or submission_started_at is not null),
  check (status <> 'sent' or provider_message_id is not null)
);

create unique index menu_order_alimtalk_one_pending
  on public.menu_order_alimtalk_attempts (menu_site_id, order_id)
  where status = 'pending';

alter table public.menu_order_alimtalk_attempts enable row level security;
revoke all on public.menu_order_alimtalk_attempts from public, anon, authenticated, service_role;
grant select, insert, update on public.menu_order_alimtalk_attempts to service_role;

create function private.validate_order_alimtalk_attempt()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  -- Serialize with pickup/serving so the order is still ready when send is reserved.
  perform 1 from public.menu_customer_orders as o
  where o.menu_site_id = new.menu_site_id and o.id = new.order_id
    and o.status = 'ready' and o.notification_phone ~ '^01[016789][0-9]{7,8}$'
  for no key update;
  if not found then
    raise exception using errcode = 'P0001', message = 'ORDER_ALIMTALK_NOT_ELIGIBLE';
  end if;
  return new;
end;
$$;

revoke all on function private.validate_order_alimtalk_attempt() from public, anon, authenticated;
grant execute on function private.validate_order_alimtalk_attempt() to service_role;

create trigger validate_order_alimtalk_attempt
  before insert on public.menu_order_alimtalk_attempts
  for each row execute function private.validate_order_alimtalk_attempt();

commit;
