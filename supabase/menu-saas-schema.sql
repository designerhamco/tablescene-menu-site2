create extension if not exists "pgcrypto";

grant usage on schema public to anon, authenticated;

create table if not exists public.menu_sites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  slug text not null unique,
  template_key text not null default 'design_a',
  status text not null default 'draft' check (status in ('draft', 'published', 'archived')),
  description text,
  logo_url text,
  cover_image_url text,
  brand_color text,
  business_name text,
  business_address text,
  business_phone text,
  settings jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_sites add column if not exists restaurant_name text;
alter table public.menu_sites add column if not exists restaurant_category text;
alter table public.menu_sites add column if not exists restaurant_address text;
alter table public.menu_sites add column if not exists restaurant_phone text;
alter table public.menu_sites add column if not exists instagram_url text;
alter table public.menu_sites add column if not exists notes text;
alter table public.menu_sites add column if not exists brand_description text;
alter table public.menu_sites add column if not exists intro_title text;
alter table public.menu_sites add column if not exists intro_description text;
alter table public.menu_sites add column if not exists menu_cover_title text;
alter table public.menu_sites add column if not exists menu_cover_description text;
alter table public.menu_sites add column if not exists about_description text;
alter table public.menu_sites add column if not exists opening_hours text;
alter table public.menu_sites add column if not exists map_url text;
alter table public.menu_sites add column if not exists design_settings jsonb not null default '{}'::jsonb;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  name text not null,
  description text,
  section_key text not null default 'main_menu' check (section_key in ('set_menu', 'main_menu', 'dessert_drink')),
  sort_order integer not null default 0,
  visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_categories add column if not exists section_key text not null default 'main_menu';

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  category_id uuid references public.menu_categories(id) on delete set null,
  name text not null,
  price integer not null default 0,
  price_label text,
  description text,
  image_url text,
  badge text,
  recommended boolean not null default false,
  is_best boolean not null default false,
  is_sold_out boolean not null default false,
  visible boolean not null default true,
  sort_order integer not null default 0,
  options jsonb not null default '{}'::jsonb,
  allergens jsonb not null default '[]'::jsonb,
  translations jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_items add column if not exists price_label text;
alter table public.menu_items add column if not exists recommended boolean not null default false;

-- TODO: Keep validating in application code that menu_items.category_id belongs to the same menu_site_id.
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  menu_site_id uuid references public.menu_sites(id) on delete set null,
  product_key text,
  template_key text,
  order_name text,
  payment_id text unique,
  customer_name text,
  buyer_name text,
  buyer_phone text,
  buyer_email text,
  business_name text,
  business_number text,
  raw_payload jsonb,
  status text not null default 'pending' check (status in ('pending', 'paid', 'cancelled', 'refunded')),
  total_amount integer not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  product_key text,
  template_key text,
  payment_id text unique,
  portone_payment_id text unique,
  status text not null default 'ready' check (status in ('ready', 'paid', 'failed', 'cancelled')),
  amount integer not null default 0,
  raw_payload jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.menu_chefs (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  chef_name text not null,
  chef_role text,
  chef_description text,
  chef_image_url text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_events (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  event_title text,
  event_subtitle text,
  event_description text,
  event_period text,
  event_image_url text,
  event_benefit text,
  event_detail text,
  start_date date,
  end_date date,
  link_url text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_social_links (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  type text not null,
  label text,
  url text not null,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists menu_categories_site_section_sort_idx on public.menu_categories(menu_site_id, section_key, sort_order);
create index if not exists menu_items_site_category_sort_idx on public.menu_items(menu_site_id, category_id, sort_order);
create index if not exists menu_items_site_recommended_idx on public.menu_items(menu_site_id, recommended);
create index if not exists menu_chefs_site_sort_idx on public.menu_chefs(menu_site_id, sort_order);
create index if not exists menu_events_site_visible_sort_idx on public.menu_events(menu_site_id, visible, sort_order);
create index if not exists menu_social_links_site_visible_sort_idx on public.menu_social_links(menu_site_id, visible, sort_order);
create index if not exists orders_user_id_idx on public.orders(user_id);
create index if not exists payments_user_id_idx on public.payments(user_id);

revoke all privileges on public.menu_sites, public.menu_categories, public.menu_items, public.menu_chefs, public.menu_events, public.menu_social_links from anon, authenticated;
revoke all privileges on public.orders, public.payments from anon, authenticated;

grant select on public.menu_sites to anon;
grant select on public.menu_categories, public.menu_items, public.menu_chefs, public.menu_events, public.menu_social_links to anon;

grant select, insert, update, delete on public.menu_sites, public.menu_categories, public.menu_items, public.menu_chefs, public.menu_events, public.menu_social_links to authenticated;
grant select, insert, update on public.orders, public.payments to authenticated;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_menu_sites_updated_at') then
    create trigger set_menu_sites_updated_at before update on public.menu_sites
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_categories_updated_at') then
    create trigger set_menu_categories_updated_at before update on public.menu_categories
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_items_updated_at') then
    create trigger set_menu_items_updated_at before update on public.menu_items
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_chefs_updated_at') then
    create trigger set_menu_chefs_updated_at before update on public.menu_chefs
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_events_updated_at') then
    create trigger set_menu_events_updated_at before update on public.menu_events
    for each row execute function public.set_updated_at();
  end if;

  if not exists (select 1 from pg_trigger where tgname = 'set_menu_social_links_updated_at') then
    create trigger set_menu_social_links_updated_at before update on public.menu_social_links
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.menu_categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.payments enable row level security;
alter table public.menu_chefs enable row level security;
alter table public.menu_events enable row level security;
alter table public.menu_social_links enable row level security;

drop policy if exists "menu_categories owner all" on public.menu_categories;
create policy "menu_categories owner all"
on public.menu_categories for all to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_categories.menu_site_id
      and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.menu_sites
    where id = menu_categories.menu_site_id
      and user_id = auth.uid()
  )
);

drop policy if exists "menu_categories public visible select" on public.menu_categories;
create policy "menu_categories public visible select"
on public.menu_categories for select to anon, authenticated
using (
  visible = true
  and exists (
    select 1 from public.menu_sites
    where id = menu_categories.menu_site_id
      and status = 'published'
  )
);

drop policy if exists "menu_categories admin select" on public.menu_categories;
create policy "menu_categories admin select"
on public.menu_categories for select to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "menu_items owner all" on public.menu_items;
create policy "menu_items owner all"
on public.menu_items for all to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_items.menu_site_id
      and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.menu_sites
    where id = menu_items.menu_site_id
      and user_id = auth.uid()
  )
);

drop policy if exists "menu_items public visible select" on public.menu_items;
create policy "menu_items public visible select"
on public.menu_items for select to anon, authenticated
using (
  visible = true
  and exists (
    select 1 from public.menu_sites
    where id = menu_items.menu_site_id
      and status = 'published'
  )
);

drop policy if exists "menu_items admin select" on public.menu_items;
create policy "menu_items admin select"
on public.menu_items for select to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "orders owner select" on public.orders;
create policy "orders owner select"
on public.orders for select to authenticated
using (user_id = auth.uid());

drop policy if exists "orders owner insert" on public.orders;
create policy "orders owner insert"
on public.orders for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "orders owner update" on public.orders;
create policy "orders owner update"
on public.orders for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "orders admin select" on public.orders;
create policy "orders admin select"
on public.orders for select to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "payments owner select" on public.payments;
create policy "payments owner select"
on public.payments for select to authenticated
using (user_id = auth.uid());

drop policy if exists "payments owner insert" on public.payments;
create policy "payments owner insert"
on public.payments for insert to authenticated
with check (user_id = auth.uid());

drop policy if exists "payments owner update" on public.payments;
create policy "payments owner update"
on public.payments for update to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "payments admin select" on public.payments;
create policy "payments admin select"
on public.payments for select to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "menu_chefs owner all" on public.menu_chefs;
create policy "menu_chefs owner all"
on public.menu_chefs for all to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_chefs.menu_site_id
      and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.menu_sites
    where id = menu_chefs.menu_site_id
      and user_id = auth.uid()
  )
);

drop policy if exists "menu_chefs public visible select" on public.menu_chefs;
create policy "menu_chefs public visible select"
on public.menu_chefs for select to anon, authenticated
using (
  visible = true
  and exists (
    select 1 from public.menu_sites
    where id = menu_chefs.menu_site_id
      and status = 'published'
  )
);

drop policy if exists "menu_chefs admin select" on public.menu_chefs;
create policy "menu_chefs admin select"
on public.menu_chefs for select to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "menu_events owner all" on public.menu_events;
create policy "menu_events owner all"
on public.menu_events for all to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_events.menu_site_id
      and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.menu_sites
    where id = menu_events.menu_site_id
      and user_id = auth.uid()
  )
);

drop policy if exists "menu_events public visible select" on public.menu_events;
create policy "menu_events public visible select"
on public.menu_events for select to anon, authenticated
using (
  visible = true
  and exists (
    select 1 from public.menu_sites
    where id = menu_events.menu_site_id
      and status = 'published'
  )
);

drop policy if exists "menu_events admin select" on public.menu_events;
create policy "menu_events admin select"
on public.menu_events for select to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);

drop policy if exists "menu_social_links owner all" on public.menu_social_links;
create policy "menu_social_links owner all"
on public.menu_social_links for all to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_social_links.menu_site_id
      and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.menu_sites
    where id = menu_social_links.menu_site_id
      and user_id = auth.uid()
  )
);

drop policy if exists "menu_social_links public visible select" on public.menu_social_links;
create policy "menu_social_links public visible select"
on public.menu_social_links for select to anon, authenticated
using (
  visible = true
  and exists (
    select 1 from public.menu_sites
    where id = menu_social_links.menu_site_id
      and status = 'published'
  )
);

drop policy if exists "menu_social_links admin select" on public.menu_social_links;
create policy "menu_social_links admin select"
on public.menu_social_links for select to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);
