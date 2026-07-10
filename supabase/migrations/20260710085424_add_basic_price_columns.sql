alter table public.menu_items
  add column if not exists price_note text;

alter table public.menu_item_translations
  add column if not exists price_note text;

create table if not exists public.menu_category_price_columns (
  id uuid primary key default gen_random_uuid(),
  menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  key text not null,
  label text not null,
  sort_order integer not null default 0,
  visible boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_category_price_columns_category_key_key unique (category_id, key),
  constraint menu_category_price_columns_key_format_check check (key ~ '^[a-z0-9][a-z0-9_-]{0,31}$'),
  constraint menu_category_price_columns_label_not_blank_check check (btrim(label) <> ''),
  constraint menu_category_price_columns_sort_order_check check (sort_order >= 0),
  constraint menu_category_price_columns_settings_object_check check (jsonb_typeof(settings) = 'object')
);

create table if not exists public.menu_item_price_column_values (
  id uuid primary key default gen_random_uuid(),
  menu_item_id uuid not null references public.menu_items(id) on delete cascade,
  price_column_id uuid not null references public.menu_category_price_columns(id) on delete cascade,
  price integer,
  price_label text,
  visible boolean not null default true,
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_item_price_column_values_item_column_key unique (menu_item_id, price_column_id),
  constraint menu_item_price_column_values_price_check check (price is null or price >= 0),
  -- price is the numeric source of truth for calculations and future time-sale matching.
  -- price_label is only a display override; non-price guidance belongs in menu_items.price_note.
  constraint menu_item_price_column_values_visible_price_check check (visible = false or price is not null),
  constraint menu_item_price_column_values_settings_object_check check (jsonb_typeof(settings) = 'object')
);

create index if not exists menu_category_price_columns_menu_site_category_sort_idx
  on public.menu_category_price_columns (menu_site_id, category_id, sort_order, created_at);

create index if not exists menu_category_price_columns_category_visible_sort_idx
  on public.menu_category_price_columns (category_id, visible, sort_order);

create index if not exists menu_item_price_column_values_menu_item_idx
  on public.menu_item_price_column_values (menu_item_id);

create index if not exists menu_item_price_column_values_price_column_idx
  on public.menu_item_price_column_values (price_column_id);

create index if not exists menu_item_price_column_values_menu_item_visible_idx
  on public.menu_item_price_column_values (menu_item_id, visible, price_column_id);

create or replace function public.set_menu_category_price_columns_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.set_menu_item_price_column_values_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.validate_menu_category_price_column()
returns trigger
language plpgsql
as $$
declare
  v_category_site_id uuid;
  v_visible_count integer;
begin
  select menu_site_id
  into v_category_site_id
  from public.menu_categories
  where id = new.category_id;

  if v_category_site_id is null then
    raise exception 'menu category % does not exist', new.category_id;
  end if;

  if v_category_site_id <> new.menu_site_id then
    raise exception 'price column menu_site_id must match category menu_site_id';
  end if;

  if new.visible then
    perform pg_advisory_xact_lock(hashtext(new.category_id::text));

    select count(*)
    into v_visible_count
    from public.menu_category_price_columns
    where category_id = new.category_id
      and visible = true
      and id <> coalesce(new.id, '00000000-0000-0000-0000-000000000000'::uuid);

    if v_visible_count >= 3 then
      raise exception 'a category can have at most 3 visible price columns';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.validate_menu_item_price_column_value()
returns trigger
language plpgsql
as $$
declare
  v_item_category_id uuid;
  v_item_site_id uuid;
  v_column_category_id uuid;
  v_column_site_id uuid;
begin
  select category_id, menu_site_id
  into v_item_category_id, v_item_site_id
  from public.menu_items
  where id = new.menu_item_id;

  if v_item_site_id is null then
    raise exception 'menu item % does not exist', new.menu_item_id;
  end if;

  select category_id, menu_site_id
  into v_column_category_id, v_column_site_id
  from public.menu_category_price_columns
  where id = new.price_column_id;

  if v_column_site_id is null then
    raise exception 'price column % does not exist', new.price_column_id;
  end if;

  if v_item_site_id <> v_column_site_id then
    raise exception 'price column value menu_site_id mismatch';
  end if;

  if v_item_category_id is distinct from v_column_category_id then
    raise exception 'price column must belong to the same category as the menu item';
  end if;

  return new;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_menu_category_price_columns_updated_at'
      and tgrelid = 'public.menu_category_price_columns'::regclass
  ) then
    create trigger set_menu_category_price_columns_updated_at
      before update on public.menu_category_price_columns
      for each row execute function public.set_menu_category_price_columns_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'set_menu_item_price_column_values_updated_at'
      and tgrelid = 'public.menu_item_price_column_values'::regclass
  ) then
    create trigger set_menu_item_price_column_values_updated_at
      before update on public.menu_item_price_column_values
      for each row execute function public.set_menu_item_price_column_values_updated_at();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'validate_menu_category_price_column'
      and tgrelid = 'public.menu_category_price_columns'::regclass
  ) then
    create trigger validate_menu_category_price_column
      before insert or update on public.menu_category_price_columns
      for each row execute function public.validate_menu_category_price_column();
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'validate_menu_item_price_column_value'
      and tgrelid = 'public.menu_item_price_column_values'::regclass
  ) then
    create trigger validate_menu_item_price_column_value
      before insert or update on public.menu_item_price_column_values
      for each row execute function public.validate_menu_item_price_column_value();
  end if;
end $$;

revoke execute on function public.set_menu_category_price_columns_updated_at() from public, anon, authenticated;
revoke execute on function public.set_menu_item_price_column_values_updated_at() from public, anon, authenticated;
revoke execute on function public.validate_menu_category_price_column() from public, anon, authenticated;
revoke execute on function public.validate_menu_item_price_column_value() from public, anon, authenticated;

alter table public.menu_category_price_columns enable row level security;
alter table public.menu_item_price_column_values enable row level security;

grant select on public.menu_category_price_columns to anon;
grant select, insert, update, delete on public.menu_category_price_columns to authenticated;
grant select, insert, update, delete on public.menu_category_price_columns to service_role;

grant select on public.menu_item_price_column_values to anon;
grant select, insert, update, delete on public.menu_item_price_column_values to authenticated;
grant select, insert, update, delete on public.menu_item_price_column_values to service_role;

create policy "menu_category_price_columns_select_owned"
  on public.menu_category_price_columns
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_category_price_columns.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_category_price_columns_select_public_visible"
  on public.menu_category_price_columns
  for select
  to anon, authenticated
  using (
    visible = true
    and exists (
      select 1
      from public.menu_sites
      join public.menu_categories on menu_categories.id = menu_category_price_columns.category_id
      left join public.menu_pages on menu_pages.id = menu_categories.menu_page_id
      where menu_sites.id = menu_category_price_columns.menu_site_id
        and menu_sites.status = 'published'
        and menu_categories.visible = true
        and coalesce(menu_pages.visible, true) = true
        and menu_categories.menu_site_id = menu_category_price_columns.menu_site_id
    )
  );

create policy "menu_category_price_columns_select_admin"
  on public.menu_category_price_columns
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "menu_category_price_columns_insert_owned"
  on public.menu_category_price_columns
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.menu_sites
      join public.menu_categories on menu_categories.id = menu_category_price_columns.category_id
      where menu_sites.id = menu_category_price_columns.menu_site_id
        and menu_sites.user_id = auth.uid()
        and menu_categories.menu_site_id = menu_category_price_columns.menu_site_id
    )
  );

create policy "menu_category_price_columns_update_owned"
  on public.menu_category_price_columns
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_category_price_columns.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_sites
      join public.menu_categories on menu_categories.id = menu_category_price_columns.category_id
      where menu_sites.id = menu_category_price_columns.menu_site_id
        and menu_sites.user_id = auth.uid()
        and menu_categories.menu_site_id = menu_category_price_columns.menu_site_id
    )
  );

create policy "menu_category_price_columns_delete_owned"
  on public.menu_category_price_columns
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.menu_sites
      where menu_sites.id = menu_category_price_columns.menu_site_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_category_price_columns_service_role_all"
  on public.menu_category_price_columns
  for all
  to service_role
  using (true)
  with check (true);

create policy "menu_item_price_column_values_select_owned"
  on public.menu_item_price_column_values
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.menu_items
      join public.menu_sites on menu_sites.id = menu_items.menu_site_id
      where menu_items.id = menu_item_price_column_values.menu_item_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_item_price_column_values_select_public_visible"
  on public.menu_item_price_column_values
  for select
  to anon, authenticated
  using (
    visible = true
    and exists (
      select 1
      from public.menu_items
      join public.menu_sites on menu_sites.id = menu_items.menu_site_id
      join public.menu_categories on menu_categories.id = menu_items.category_id
      join public.menu_category_price_columns on menu_category_price_columns.id = menu_item_price_column_values.price_column_id
      left join public.menu_pages on menu_pages.id = menu_categories.menu_page_id
      where menu_items.id = menu_item_price_column_values.menu_item_id
        and menu_sites.status = 'published'
        and menu_items.visible = true
        and menu_items.price_visible = true
        and menu_categories.visible = true
        and menu_category_price_columns.visible = true
        and coalesce(menu_pages.visible, true) = true
        and menu_categories.menu_site_id = menu_items.menu_site_id
        and menu_category_price_columns.menu_site_id = menu_items.menu_site_id
        and menu_category_price_columns.category_id = menu_items.category_id
    )
  );

create policy "menu_item_price_column_values_select_admin"
  on public.menu_item_price_column_values
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.admin_users
      where admin_users.user_id = auth.uid()
    )
  );

create policy "menu_item_price_column_values_insert_owned"
  on public.menu_item_price_column_values
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.menu_items
      join public.menu_sites on menu_sites.id = menu_items.menu_site_id
      join public.menu_category_price_columns on menu_category_price_columns.id = menu_item_price_column_values.price_column_id
      where menu_items.id = menu_item_price_column_values.menu_item_id
        and menu_sites.user_id = auth.uid()
        and menu_category_price_columns.menu_site_id = menu_items.menu_site_id
        and menu_category_price_columns.category_id = menu_items.category_id
    )
  );

create policy "menu_item_price_column_values_update_owned"
  on public.menu_item_price_column_values
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.menu_items
      join public.menu_sites on menu_sites.id = menu_items.menu_site_id
      where menu_items.id = menu_item_price_column_values.menu_item_id
        and menu_sites.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.menu_items
      join public.menu_sites on menu_sites.id = menu_items.menu_site_id
      join public.menu_category_price_columns on menu_category_price_columns.id = menu_item_price_column_values.price_column_id
      where menu_items.id = menu_item_price_column_values.menu_item_id
        and menu_sites.user_id = auth.uid()
        and menu_category_price_columns.menu_site_id = menu_items.menu_site_id
        and menu_category_price_columns.category_id = menu_items.category_id
    )
  );

create policy "menu_item_price_column_values_delete_owned"
  on public.menu_item_price_column_values
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.menu_items
      join public.menu_sites on menu_sites.id = menu_items.menu_site_id
      where menu_items.id = menu_item_price_column_values.menu_item_id
        and menu_sites.user_id = auth.uid()
    )
  );

create policy "menu_item_price_column_values_service_role_all"
  on public.menu_item_price_column_values
  for all
  to service_role
  using (true)
  with check (true);
