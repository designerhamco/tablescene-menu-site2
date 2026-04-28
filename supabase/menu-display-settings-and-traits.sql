alter table public.menu_items add column if not exists portion_label text;
alter table public.menu_items add column if not exists price_visible boolean not null default true;
alter table public.menu_items add column if not exists portion_visible boolean not null default true;
alter table public.menu_items add column if not exists traits_visible boolean not null default true;

alter table public.menu_categories add column if not exists description text;
alter table public.menu_categories add column if not exists description_visible boolean not null default true;

alter table public.menu_events add column if not exists event_regular_price_label text;
alter table public.menu_events add column if not exists event_sale_price_label text;
alter table public.menu_events add column if not exists event_price_visible boolean not null default true;

alter table public.menu_sites add column if not exists page_settings jsonb not null default '{}'::jsonb;

create table if not exists public.menu_item_traits (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  label text not null,
  value integer not null default 0,
  max_value integer not null default 5,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_traits_value_non_negative check (value >= 0),
  constraint menu_item_traits_max_value_positive check (max_value > 0),
  constraint menu_item_traits_value_lte_max check (value <= max_value)
);

comment on table public.menu_item_traits is
  'Menu-level taste and feature indicators such as spice, saltiness, sweetness, acidity, and nuttiness. App code must also verify menu_item_id belongs to menu_site_id before writes.';

create index if not exists menu_item_traits_site_item_sort_idx
  on public.menu_item_traits(menu_site_id, menu_item_id, sort_order);

create index if not exists menu_item_traits_site_visible_sort_idx
  on public.menu_item_traits(menu_site_id, visible, sort_order);

create index if not exists menu_items_site_sort_idx
  on public.menu_items(menu_site_id, sort_order);

create index if not exists menu_categories_site_section_sort_idx
  on public.menu_categories(menu_site_id, section_key, sort_order);

create index if not exists menu_events_site_visible_sort_idx
  on public.menu_events(menu_site_id, visible, sort_order);

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'set_menu_item_traits_updated_at') then
    create trigger set_menu_item_traits_updated_at before update on public.menu_item_traits
    for each row execute function public.set_updated_at();
  end if;
end $$;

alter table public.menu_item_traits enable row level security;

grant select on public.menu_item_traits to anon;
grant select, insert, update, delete on public.menu_item_traits to authenticated;

drop policy if exists "menu_item_traits owner select" on public.menu_item_traits;
create policy "menu_item_traits owner select"
on public.menu_item_traits for select to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_item_traits.menu_site_id
      and user_id = auth.uid()
  )
);

drop policy if exists "menu_item_traits owner insert" on public.menu_item_traits;
create policy "menu_item_traits owner insert"
on public.menu_item_traits for insert to authenticated
with check (
  exists (
    select 1 from public.menu_sites
    where id = menu_item_traits.menu_site_id
      and user_id = auth.uid()
  )
  and exists (
    select 1 from public.menu_items
    where id = menu_item_traits.menu_item_id
      and menu_site_id = menu_item_traits.menu_site_id
  )
);

drop policy if exists "menu_item_traits owner update" on public.menu_item_traits;
create policy "menu_item_traits owner update"
on public.menu_item_traits for update to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_item_traits.menu_site_id
      and user_id = auth.uid()
  )
)
with check (
  exists (
    select 1 from public.menu_sites
    where id = menu_item_traits.menu_site_id
      and user_id = auth.uid()
  )
  and exists (
    select 1 from public.menu_items
    where id = menu_item_traits.menu_item_id
      and menu_site_id = menu_item_traits.menu_site_id
  )
);

drop policy if exists "menu_item_traits owner delete" on public.menu_item_traits;
create policy "menu_item_traits owner delete"
on public.menu_item_traits for delete to authenticated
using (
  exists (
    select 1 from public.menu_sites
    where id = menu_item_traits.menu_site_id
      and user_id = auth.uid()
  )
);

drop policy if exists "menu_item_traits public visible select" on public.menu_item_traits;
create policy "menu_item_traits public visible select"
on public.menu_item_traits for select to anon, authenticated
using (
  visible = true
  and exists (
    select 1 from public.menu_sites
    where id = menu_item_traits.menu_site_id
      and status = 'published'
  )
  and exists (
    select 1 from public.menu_items
    where id = menu_item_traits.menu_item_id
      and menu_site_id = menu_item_traits.menu_site_id
      and visible = true
      and traits_visible = true
  )
);

drop policy if exists "menu_item_traits admin select" on public.menu_item_traits;
create policy "menu_item_traits admin select"
on public.menu_item_traits for select to authenticated
using (
  exists (
    select 1 from public.admin_users
    where user_id = auth.uid()
  )
);
