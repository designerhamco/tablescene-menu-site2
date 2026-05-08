-- Display-only price options for Basic menu items.
-- Run this manually in Supabase SQL Editor after review.
--
-- Safety notes:
-- - No existing data is deleted.
-- - Existing menu_items.price and menu_items.price_label are kept.
-- - This is not an ordering/POS option schema.

create table if not exists public.menu_item_price_options (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  label text not null,
  price integer,
  price_label text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

alter table public.menu_item_price_options
  add column if not exists menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  add column if not exists menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  add column if not exists label text not null,
  add column if not exists price integer,
  add column if not exists price_label text,
  add column if not exists visible boolean not null default true,
  add column if not exists sort_order integer not null default 0,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_item_price_options_label_length_check'
      and conrelid = 'public.menu_item_price_options'::regclass
  ) then
    alter table public.menu_item_price_options
      add constraint menu_item_price_options_label_length_check
      check (char_length(label) <= 20);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_item_price_options_price_label_length_check'
      and conrelid = 'public.menu_item_price_options'::regclass
  ) then
    alter table public.menu_item_price_options
      add constraint menu_item_price_options_price_label_length_check
      check (price_label is null or char_length(price_label) <= 20);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_item_price_options_price_or_label_check'
      and conrelid = 'public.menu_item_price_options'::regclass
  ) then
    alter table public.menu_item_price_options
      add constraint menu_item_price_options_price_or_label_check
      check (price is not null or price_label is not null);
  end if;
end;
$$;

create index if not exists menu_item_price_options_site_item_sort_idx
  on public.menu_item_price_options(menu_site_id, menu_item_id, sort_order);

create index if not exists menu_item_price_options_item_visible_sort_idx
  on public.menu_item_price_options(menu_item_id, visible, sort_order);

alter table public.menu_item_price_options enable row level security;

drop policy if exists "menu item price options owner select" on public.menu_item_price_options;
create policy "menu item price options owner select"
  on public.menu_item_price_options
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_item_price_options.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

drop policy if exists "menu item price options owner insert" on public.menu_item_price_options;
create policy "menu item price options owner insert"
  on public.menu_item_price_options
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_item_price_options.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.menu_items
      where menu_items.id = menu_item_price_options.menu_item_id
        and menu_items.menu_site_id = menu_item_price_options.menu_site_id
    )
  );

drop policy if exists "menu item price options owner update" on public.menu_item_price_options;
create policy "menu item price options owner update"
  on public.menu_item_price_options
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_item_price_options.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_item_price_options.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
    and exists (
      select 1
      from public.menu_items
      where menu_items.id = menu_item_price_options.menu_item_id
        and menu_items.menu_site_id = menu_item_price_options.menu_site_id
    )
  );

drop policy if exists "menu item price options owner delete" on public.menu_item_price_options;
create policy "menu item price options owner delete"
  on public.menu_item_price_options
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_item_price_options.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

drop policy if exists "menu item price options public visible select" on public.menu_item_price_options;
create policy "menu item price options public visible select"
  on public.menu_item_price_options
  for select
  to anon, authenticated
  using (
    visible = true
    and exists (
      select 1
      from public.menu_items
      join public.menu_sites on menu_sites.id = menu_items.menu_site_id
      where menu_items.id = menu_item_price_options.menu_item_id
        and menu_items.visible = true
        and menu_sites.status = 'published'
    )
  );

grant select on public.menu_item_price_options to anon;
grant select, insert, update, delete on public.menu_item_price_options to authenticated;

do $$
begin
  if not exists (
    select 1
    from information_schema.triggers
    where trigger_schema = 'public'
      and event_object_table = 'menu_item_price_options'
      and trigger_name = 'set_menu_item_price_options_updated_at'
  ) then
    create trigger set_menu_item_price_options_updated_at
      before update on public.menu_item_price_options
      for each row
      execute function public.set_updated_at();
  end if;
end;
$$;
