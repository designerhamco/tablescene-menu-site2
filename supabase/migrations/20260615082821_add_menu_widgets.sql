create table if not exists public.menu_widgets (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  menu_page_id uuid not null references public.menu_pages(id) on delete cascade,
  widget_type text not null,
  title text,
  description text,
  image_url text,
  image_path text,
  link_url text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz,
  constraint menu_widgets_widget_type_check check (
    widget_type in ('notice_text', 'image_banner', 'option_list', 'store_info')
  )
);

create table if not exists public.menu_widget_items (
  id uuid primary key default gen_random_uuid(),
  widget_id uuid not null references public.menu_widgets(id) on delete cascade,
  title text not null,
  description text,
  value text,
  price numeric,
  price_label text,
  image_url text,
  image_path text,
  link_url text,
  visible boolean not null default true,
  sort_order integer not null default 0,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);

create index if not exists menu_widgets_menu_site_page_sort_idx
  on public.menu_widgets (menu_site_id, menu_page_id, sort_order, created_at);

create index if not exists menu_widget_items_widget_sort_idx
  on public.menu_widget_items (widget_id, sort_order, created_at);

alter table public.menu_widgets enable row level security;
alter table public.menu_widget_items enable row level security;

grant select on public.menu_widgets to anon;
grant select, insert, update, delete on public.menu_widgets to authenticated;

grant select on public.menu_widget_items to anon;
grant select, insert, update, delete on public.menu_widget_items to authenticated;

create policy "menu_widgets_select_owned"
  on public.menu_widgets
  for select
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_widgets.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_widgets_select_public_visible"
  on public.menu_widgets
  for select
  using (
    visible = true
    and exists (
      select 1
      from public.menu_sites
      join public.menu_pages on menu_pages.id = menu_widgets.menu_page_id
      where menu_sites.id = menu_widgets.menu_site_id
        and menu_sites.status = 'published'
        and menu_pages.visible = true
    )
  );

create policy "menu_widgets_select_admin"
  on public.menu_widgets
  for select
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "menu_widgets_insert_owned"
  on public.menu_widgets
  for insert
  with check (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_widgets.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_widgets_update_owned"
  on public.menu_widgets
  for update
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_widgets.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_widgets.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_widgets_delete_owned"
  on public.menu_widgets
  for delete
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_widgets.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_widget_items_select_owned"
  on public.menu_widget_items
  for select
  using (
    exists (
      select 1
      from public.menu_widgets
      join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
      where menu_widgets.id = menu_widget_items.widget_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_widget_items_select_public_visible"
  on public.menu_widget_items
  for select
  using (
    visible = true
    and exists (
      select 1
      from public.menu_widgets
      join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
      join public.menu_pages on menu_pages.id = menu_widgets.menu_page_id
      where menu_widgets.id = menu_widget_items.widget_id
        and menu_widgets.visible = true
        and menu_sites.status = 'published'
        and menu_pages.visible = true
    )
  );

create policy "menu_widget_items_select_admin"
  on public.menu_widget_items
  for select
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "menu_widget_items_insert_owned"
  on public.menu_widget_items
  for insert
  with check (
    exists (
      select 1
      from public.menu_widgets
      join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
      where menu_widgets.id = menu_widget_items.widget_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_widget_items_update_owned"
  on public.menu_widget_items
  for update
  using (
    exists (
      select 1
      from public.menu_widgets
      join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
      where menu_widgets.id = menu_widget_items.widget_id
        and menu_sites.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_widgets
      join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
      where menu_widgets.id = menu_widget_items.widget_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_widget_items_delete_owned"
  on public.menu_widget_items
  for delete
  using (
    exists (
      select 1
      from public.menu_widgets
      join public.menu_sites on menu_sites.id = menu_widgets.menu_site_id
      where menu_widgets.id = menu_widget_items.widget_id
        and menu_sites.user_id = auth.uid()
    )
  );
