create table public.menu_pickup_queue_entries (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete restrict,
  business_date date not null default ((timezone('Asia/Seoul', now()))::date),
  queue_number integer not null,
  status text not null default 'waiting',
  source text not null default 'manual',
  external_order_ref text,
  created_by uuid not null references auth.users(id) on delete restrict,
  updated_by uuid not null references auth.users(id) on delete restrict,
  ready_by uuid references auth.users(id) on delete set null,
  completed_by uuid references auth.users(id) on delete set null,
  cancelled_by uuid references auth.users(id) on delete set null,
  ready_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_pickup_queue_number_range check (queue_number between 1 and 9999),
  constraint menu_pickup_queue_status_check check (status in ('waiting', 'ready', 'completed', 'cancelled')),
  constraint menu_pickup_queue_source_check check (source in ('manual', 'external')),
  constraint menu_pickup_queue_external_ref_check check (
    (source = 'manual' and external_order_ref is null)
    or (source = 'external' and external_order_ref is not null and char_length(external_order_ref) between 1 and 160)
  ),
  constraint menu_pickup_queue_ready_state_check check (
    (ready_at is null and ready_by is null)
    or (ready_at is not null and ready_by is not null)
  ),
  constraint menu_pickup_queue_completed_state_check check (
    (completed_at is null and completed_by is null)
    or (completed_at is not null and completed_by is not null)
  ),
  constraint menu_pickup_queue_cancelled_state_check check (
    (cancelled_at is null and cancelled_by is null)
    or (cancelled_at is not null and cancelled_by is not null)
  )
);

comment on table public.menu_pickup_queue_entries is
  'Server-only pickup queue entries. Manual MVP is independent from Order/PG; external_order_ref is reserved for a future POS connector.';

create unique index menu_pickup_queue_site_date_number_uidx
  on public.menu_pickup_queue_entries (menu_site_id, business_date, queue_number);

create unique index menu_pickup_queue_external_order_uidx
  on public.menu_pickup_queue_entries (menu_site_id, external_order_ref)
  where external_order_ref is not null;

create index menu_pickup_queue_board_idx
  on public.menu_pickup_queue_entries (menu_site_id, business_date, status, created_at);

alter table public.menu_pickup_queue_entries enable row level security;
alter table public.menu_pickup_queue_entries force row level security;

revoke all on table public.menu_pickup_queue_entries from public, anon, authenticated, service_role;
grant select, insert, update on table public.menu_pickup_queue_entries to service_role;

create or replace function public.touch_menu_pickup_queue_entry_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.touch_menu_pickup_queue_entry_updated_at() from public, anon, authenticated, service_role;

create trigger touch_menu_pickup_queue_entry_updated_at
before update on public.menu_pickup_queue_entries
for each row execute function public.touch_menu_pickup_queue_entry_updated_at();
