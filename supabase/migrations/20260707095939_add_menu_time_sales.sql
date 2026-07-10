create table if not exists public.menu_promotions (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  type text not null,
  name text not null,
  active boolean not null default true,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  timezone text not null default 'Asia/Seoul',
  settings jsonb not null default '{"time_display_mode":"deadline"}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_promotions_type_check check (type in ('time_sale')),
  constraint menu_promotions_name_not_blank_check check (btrim(name) <> ''),
  constraint menu_promotions_time_range_check check (ends_at > starts_at),
  constraint menu_promotions_timezone_not_blank_check check (btrim(timezone) <> ''),
  constraint menu_promotions_settings_object_check check (jsonb_typeof(settings) = 'object'),
  constraint menu_promotions_time_display_mode_check check (
    not (settings ? 'time_display_mode')
    or settings ->> 'time_display_mode' in ('deadline', 'countdown')
  )
);

create table if not exists public.menu_promotion_items (
  id uuid primary key default gen_random_uuid(),
  promotion_id uuid not null references public.menu_promotions(id) on delete cascade,
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  sale_price integer,
  sale_price_label text,
  visible boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_promotion_items_promotion_item_key unique (promotion_id, menu_item_id),
  constraint menu_promotion_items_sale_price_check check (sale_price is null or sale_price >= 0),
  constraint menu_promotion_items_sale_value_check check (
    sale_price is not null
    or nullif(btrim(coalesce(sale_price_label, '')), '') is not null
  ),
  constraint menu_promotion_items_settings_object_check check (jsonb_typeof(settings) = 'object')
);

create index if not exists menu_promotions_menu_site_idx
  on public.menu_promotions (menu_site_id);

create index if not exists menu_promotions_menu_site_type_active_idx
  on public.menu_promotions (menu_site_id, type, active);

create index if not exists menu_promotions_time_range_idx
  on public.menu_promotions (starts_at, ends_at);

create index if not exists menu_promotion_items_promotion_idx
  on public.menu_promotion_items (promotion_id);

create index if not exists menu_promotion_items_menu_item_idx
  on public.menu_promotion_items (menu_item_id);

create or replace function public.set_menu_promotions_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_menu_promotion_items_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_menu_promotions_updated_at'
  ) then
    create trigger set_menu_promotions_updated_at
      before update on public.menu_promotions
      for each row execute function public.set_menu_promotions_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_menu_promotion_items_updated_at'
  ) then
    create trigger set_menu_promotion_items_updated_at
      before update on public.menu_promotion_items
      for each row execute function public.set_menu_promotion_items_updated_at();
  end if;
end $$;

revoke execute on function public.set_menu_promotions_updated_at() from public, anon, authenticated;
revoke execute on function public.set_menu_promotion_items_updated_at() from public, anon, authenticated;

alter table public.menu_promotions enable row level security;
alter table public.menu_promotion_items enable row level security;

grant select on public.menu_promotions to anon;
grant select, insert, update, delete on public.menu_promotions to authenticated;
grant select, insert, update, delete on public.menu_promotions to service_role;

grant select on public.menu_promotion_items to anon;
grant select, insert, update, delete on public.menu_promotion_items to authenticated;
grant select, insert, update, delete on public.menu_promotion_items to service_role;

create policy "menu_promotions_select_owned"
  on public.menu_promotions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_promotions.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_promotions_select_public_active"
  on public.menu_promotions
  for select
  to anon, authenticated
  using (
    active = true
    and starts_at <= now()
    and ends_at > now()
    and exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_promotions.menu_site_id
        and menu_sites.status = 'published'
    )
  );

create policy "menu_promotions_select_admin"
  on public.menu_promotions
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "menu_promotions_insert_owned"
  on public.menu_promotions
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_promotions.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_promotions_update_owned"
  on public.menu_promotions
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_promotions.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_promotions.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_promotions_delete_owned"
  on public.menu_promotions
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_promotions.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_promotions_service_role_all"
  on public.menu_promotions
  for all
  to service_role
  using (true)
  with check (true);

create policy "menu_promotion_items_select_owned"
  on public.menu_promotion_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.menu_promotions
      join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
      where menu_promotions.id = menu_promotion_items.promotion_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_promotion_items_select_public_active"
  on public.menu_promotion_items
  for select
  to anon, authenticated
  using (
    visible = true
    and exists (
      select 1
      from public.menu_promotions
      join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
      join public.menu_items on menu_items.id = menu_promotion_items.menu_item_id
      join public.menu_categories on menu_categories.id = menu_items.category_id
      left join public.menu_pages on menu_pages.id = menu_categories.menu_page_id
      where menu_promotions.id = menu_promotion_items.promotion_id
        and menu_promotions.active = true
        and menu_promotions.starts_at <= now()
        and menu_promotions.ends_at > now()
        and menu_sites.status = 'published'
        and menu_items.visible = true
        and menu_items.price_visible = true
        and menu_categories.visible = true
        and coalesce(menu_pages.visible, true) = true
        and menu_items.menu_site_id = menu_promotions.menu_site_id
        and menu_categories.menu_site_id = menu_promotions.menu_site_id
    )
  );

create policy "menu_promotion_items_select_admin"
  on public.menu_promotion_items
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "menu_promotion_items_insert_owned"
  on public.menu_promotion_items
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.menu_promotions
      join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
      join public.menu_items on menu_items.id = menu_promotion_items.menu_item_id
      where menu_promotions.id = menu_promotion_items.promotion_id
        and menu_sites.user_id = auth.uid()
        and menu_items.menu_site_id = menu_promotions.menu_site_id
    )
  );

create policy "menu_promotion_items_update_owned"
  on public.menu_promotion_items
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.menu_promotions
      join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
      where menu_promotions.id = menu_promotion_items.promotion_id
        and menu_sites.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_promotions
      join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
      join public.menu_items on menu_items.id = menu_promotion_items.menu_item_id
      where menu_promotions.id = menu_promotion_items.promotion_id
        and menu_sites.user_id = auth.uid()
        and menu_items.menu_site_id = menu_promotions.menu_site_id
    )
  );

create policy "menu_promotion_items_delete_owned"
  on public.menu_promotion_items
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.menu_promotions
      join public.menu_sites on menu_sites.id = menu_promotions.menu_site_id
      where menu_promotions.id = menu_promotion_items.promotion_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_promotion_items_service_role_all"
  on public.menu_promotion_items
  for all
  to service_role
  using (true)
  with check (true);
