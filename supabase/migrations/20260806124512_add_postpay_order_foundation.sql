begin;

set local lock_timeout = '5s';
set local statement_timeout = '30s';

alter table public.menu_items
  add column orderable boolean not null default false;

alter table public.menu_items
  add constraint menu_items_site_id_id_key unique (menu_site_id, id);

alter table public.table_visit_sessions
  add constraint table_visit_sessions_site_table_id_key
  unique (menu_site_id, menu_table_id, id);

create table public.menu_order_option_groups (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  menu_item_id uuid not null,
  name text not null,
  is_required boolean not null default false,
  min_selections integer not null default 0,
  max_selections integer not null default 1,
  status text not null default 'active',
  display_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_order_option_groups_site_item_fk
    foreign key (menu_site_id, menu_item_id)
    references public.menu_items(menu_site_id, id)
    on delete cascade,
  constraint menu_order_option_groups_site_id_key unique (menu_site_id, id),
  constraint menu_order_option_groups_name_check
    check (name = btrim(name) and char_length(name) between 1 and 80),
  constraint menu_order_option_groups_selection_check
    check (
      min_selections between 0 and 20
      and max_selections between 1 and 20
      and min_selections <= max_selections
      and (not is_required or min_selections >= 1)
    ),
  constraint menu_order_option_groups_status_check
    check (status in ('active', 'archived')),
  constraint menu_order_option_groups_archive_check
    check (
      (status = 'archived' and archived_at is not null)
      or (status = 'active' and archived_at is null)
    ),
  constraint menu_order_option_groups_display_order_check
    check (display_order between 0 and 9999)
);

create table public.menu_order_option_values (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  option_group_id uuid not null,
  name text not null,
  price_delta integer not null default 0,
  status text not null default 'active',
  display_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_order_option_values_site_group_fk
    foreign key (menu_site_id, option_group_id)
    references public.menu_order_option_groups(menu_site_id, id)
    on delete cascade,
  constraint menu_order_option_values_name_check
    check (name = btrim(name) and char_length(name) between 1 and 80),
  constraint menu_order_option_values_price_check
    check (price_delta between 0 and 10000000),
  constraint menu_order_option_values_status_check
    check (status in ('active', 'archived')),
  constraint menu_order_option_values_archive_check
    check (
      (status = 'archived' and archived_at is not null)
      or (status = 'active' and archived_at is null)
    ),
  constraint menu_order_option_values_display_order_check
    check (display_order between 0 and 9999)
);

create table public.menu_customer_orders (
  id uuid primary key default gen_random_uuid(),
  order_number bigint generated always as identity unique,
  menu_site_id uuid not null references public.menu_sites(id) on delete restrict,
  menu_table_id uuid not null,
  table_visit_session_id uuid not null,
  client_request_id uuid not null,
  status text not null default 'received',
  payment_status text not null default 'unpaid',
  payment_method text,
  request_text text,
  subtotal_amount integer not null,
  total_amount integer not null,
  currency text not null default 'KRW',
  status_updated_by uuid references auth.users(id) on delete set null,
  payment_completed_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  cooking_at timestamptz,
  ready_at timestamptz,
  served_at timestamptz,
  cancelled_at timestamptz,
  cancellation_reason text,
  payment_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_customer_orders_table_fk
    foreign key (menu_site_id, menu_table_id)
    references public.menu_tables(menu_site_id, id)
    on delete restrict,
  constraint menu_customer_orders_session_fk
    foreign key (menu_site_id, menu_table_id, table_visit_session_id)
    references public.table_visit_sessions(menu_site_id, menu_table_id, id)
    on delete restrict,
  constraint menu_customer_orders_site_id_key unique (menu_site_id, id),
  constraint menu_customer_orders_idempotency_key
    unique (table_visit_session_id, client_request_id),
  constraint menu_customer_orders_status_check
    check (status in ('received', 'accepted', 'cooking', 'ready', 'served', 'cancelled')),
  constraint menu_customer_orders_payment_status_check
    check (payment_status in ('unpaid', 'manual_paid', 'paid', 'cancelled', 'refunded')),
  constraint menu_customer_orders_payment_method_check
    check (payment_method is null or payment_method in ('manual_card', 'manual_cash', 'pg')),
  constraint menu_customer_orders_payment_state_check
    check (
      (payment_status = 'unpaid' and payment_method is null and payment_completed_at is null and payment_completed_by is null)
      or (payment_status = 'manual_paid' and payment_method in ('manual_card', 'manual_cash') and payment_completed_at is not null and payment_completed_by is not null)
      or (payment_status = 'paid' and payment_method = 'pg' and payment_completed_at is not null)
      or payment_status in ('cancelled', 'refunded')
    ),
  constraint menu_customer_orders_request_check
    check (request_text is null or (request_text = btrim(request_text) and char_length(request_text) between 1 and 300)),
  constraint menu_customer_orders_amount_check
    check (
      subtotal_amount between 0 and 100000000
      and total_amount = subtotal_amount
    ),
  constraint menu_customer_orders_currency_check check (currency = 'KRW'),
  constraint menu_customer_orders_cancel_check
    check (
      (status = 'cancelled' and cancelled_at is not null and cancellation_reason = btrim(cancellation_reason) and char_length(cancellation_reason) between 1 and 500)
      or (status <> 'cancelled' and cancelled_at is null and cancellation_reason is null)
    )
);

create table public.menu_customer_order_items (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null,
  order_id uuid not null,
  menu_item_id uuid references public.menu_items(id) on delete set null,
  item_name_snapshot text not null,
  base_price_snapshot integer not null,
  option_price_snapshot integer not null default 0,
  unit_price_snapshot integer not null,
  quantity integer not null,
  line_total_snapshot integer not null,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_customer_order_items_order_fk
    foreign key (menu_site_id, order_id)
    references public.menu_customer_orders(menu_site_id, id)
    on delete cascade,
  constraint menu_customer_order_items_site_id_key unique (menu_site_id, id),
  constraint menu_customer_order_items_name_check
    check (item_name_snapshot = btrim(item_name_snapshot) and char_length(item_name_snapshot) between 1 and 160),
  constraint menu_customer_order_items_price_check
    check (
      base_price_snapshot between 0 and 10000000
      and option_price_snapshot between 0 and 10000000
      and unit_price_snapshot = base_price_snapshot + option_price_snapshot
      and line_total_snapshot = unit_price_snapshot * quantity
    ),
  constraint menu_customer_order_items_quantity_check check (quantity between 1 and 20),
  constraint menu_customer_order_items_display_order_check check (display_order between 0 and 19)
);

create table public.menu_customer_order_item_options (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null,
  order_item_id uuid not null,
  option_group_id uuid references public.menu_order_option_groups(id) on delete set null,
  option_value_id uuid references public.menu_order_option_values(id) on delete set null,
  group_name_snapshot text not null,
  value_name_snapshot text not null,
  price_delta_snapshot integer not null default 0,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_customer_order_item_options_item_fk
    foreign key (menu_site_id, order_item_id)
    references public.menu_customer_order_items(menu_site_id, id)
    on delete cascade,
  constraint menu_customer_order_item_options_group_name_check
    check (group_name_snapshot = btrim(group_name_snapshot) and char_length(group_name_snapshot) between 1 and 80),
  constraint menu_customer_order_item_options_value_name_check
    check (value_name_snapshot = btrim(value_name_snapshot) and char_length(value_name_snapshot) between 1 and 80),
  constraint menu_customer_order_item_options_price_check
    check (price_delta_snapshot between 0 and 10000000),
  constraint menu_customer_order_item_options_display_order_check check (display_order between 0 and 19)
);

create unique index menu_order_option_groups_active_name_idx
  on public.menu_order_option_groups(menu_item_id, lower(name))
  where status = 'active';
create index menu_order_option_groups_site_item_order_idx
  on public.menu_order_option_groups(menu_site_id, menu_item_id, display_order)
  where status = 'active';
create unique index menu_order_option_values_active_name_idx
  on public.menu_order_option_values(option_group_id, lower(name))
  where status = 'active';
create index menu_order_option_values_site_group_order_idx
  on public.menu_order_option_values(menu_site_id, option_group_id, display_order)
  where status = 'active';
create index menu_customer_orders_site_status_created_idx
  on public.menu_customer_orders(menu_site_id, status, created_at desc);
create index menu_customer_orders_site_table_created_idx
  on public.menu_customer_orders(menu_site_id, menu_table_id, created_at desc);
create index menu_customer_orders_unpaid_idx
  on public.menu_customer_orders(menu_site_id, created_at desc)
  where payment_status = 'unpaid';
create index menu_customer_orders_session_idx
  on public.menu_customer_orders(table_visit_session_id);
create index menu_customer_orders_status_actor_idx
  on public.menu_customer_orders(status_updated_by)
  where status_updated_by is not null;
create index menu_customer_orders_payment_actor_idx
  on public.menu_customer_orders(payment_completed_by)
  where payment_completed_by is not null;
create index menu_customer_order_items_order_idx
  on public.menu_customer_order_items(menu_site_id, order_id, display_order);
create index menu_customer_order_items_menu_item_idx
  on public.menu_customer_order_items(menu_item_id)
  where menu_item_id is not null;
create index menu_customer_order_item_options_item_idx
  on public.menu_customer_order_item_options(menu_site_id, order_item_id, display_order);
create index menu_customer_order_item_options_group_idx
  on public.menu_customer_order_item_options(option_group_id)
  where option_group_id is not null;
create index menu_customer_order_item_options_value_idx
  on public.menu_customer_order_item_options(option_value_id)
  where option_value_id is not null;
create index menu_items_orderable_site_category_idx
  on public.menu_items(menu_site_id, category_id, sort_order)
  where orderable = true and visible = true and is_sold_out = false;

create or replace function private.enforce_menu_customer_order_item_limits()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_line_count integer;
  v_total_quantity integer;
begin
  perform pg_advisory_xact_lock(hashtextextended(new.order_id::text, 0));

  select count(*), coalesce(sum(quantity), 0)
    into v_line_count, v_total_quantity
  from public.menu_customer_order_items
  where order_id = new.order_id;

  if v_line_count >= 20 then
    raise exception using
      errcode = '23514',
      message = 'A customer order can contain at most 20 lines.';
  end if;

  if v_total_quantity + new.quantity > 50 then
    raise exception using
      errcode = '23514',
      message = 'A customer order can contain at most 50 total units.';
  end if;

  return new;
end;
$$;

create trigger enforce_menu_customer_order_item_limits
before insert on public.menu_customer_order_items
for each row execute function private.enforce_menu_customer_order_item_limits();

create trigger set_menu_order_option_groups_updated_at
before update on public.menu_order_option_groups
for each row execute function public.set_updated_at();

create trigger set_menu_order_option_values_updated_at
before update on public.menu_order_option_values
for each row execute function public.set_updated_at();

create trigger set_menu_customer_orders_updated_at
before update on public.menu_customer_orders
for each row execute function public.set_updated_at();

alter table public.menu_order_option_groups enable row level security;
alter table public.menu_order_option_values enable row level security;
alter table public.menu_customer_orders enable row level security;
alter table public.menu_customer_order_items enable row level security;
alter table public.menu_customer_order_item_options enable row level security;
alter table public.menu_order_option_groups force row level security;
alter table public.menu_order_option_values force row level security;
alter table public.menu_customer_orders force row level security;
alter table public.menu_customer_order_items force row level security;
alter table public.menu_customer_order_item_options force row level security;

revoke all on table public.menu_order_option_groups from public, anon, authenticated, service_role;
revoke all on table public.menu_order_option_values from public, anon, authenticated, service_role;
revoke all on table public.menu_customer_orders from public, anon, authenticated, service_role;
revoke all on table public.menu_customer_order_items from public, anon, authenticated, service_role;
revoke all on table public.menu_customer_order_item_options from public, anon, authenticated, service_role;

grant select, insert, update on table public.menu_order_option_groups to service_role;
grant select, insert, update on table public.menu_order_option_values to service_role;
grant select, insert, update on table public.menu_customer_orders to service_role;
grant select, insert on table public.menu_customer_order_items to service_role;
grant select, insert on table public.menu_customer_order_item_options to service_role;
grant usage, select on sequence public.menu_customer_orders_order_number_seq to service_role;

revoke all on function private.enforce_menu_customer_order_item_limits() from public, anon, authenticated;

comment on column public.menu_items.orderable is
  'Fail-closed orderability flag. Public visibility does not imply orderability.';
comment on table public.menu_order_option_groups is
  'Order-only option groups. Existing display price columns are not reused implicitly.';
comment on table public.menu_order_option_values is
  'Order-only option values with non-negative KRW price deltas.';
comment on table public.menu_customer_orders is
  'Server-only customer table orders. V1 postpay orders start unpaid and preserve status separately from payment.';
comment on table public.menu_customer_order_items is
  'Immutable ordered-item name and price snapshots; no update or delete grant is given to the runtime role.';
comment on table public.menu_customer_order_item_options is
  'Immutable selected-option snapshots; no update or delete grant is given to the runtime role.';

commit;
