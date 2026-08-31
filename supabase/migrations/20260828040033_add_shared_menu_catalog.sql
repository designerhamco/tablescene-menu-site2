-- Shared menu catalog foundation.
--
-- Existing menu rows remain untouched until an owner explicitly imports content.
-- Linked imports share only menu/category copy fields. Layout, visibility, widgets,
-- promotions, order settings, and per-menu placement remain independent.

alter table public.menu_categories
  add column if not exists catalog_category_id uuid;

alter table public.menu_items
  add column if not exists catalog_item_id uuid;

create index if not exists menu_categories_catalog_category_id_idx
  on public.menu_categories (catalog_category_id)
  where catalog_category_id is not null;

create index if not exists menu_items_catalog_item_id_idx
  on public.menu_items (catalog_item_id)
  where catalog_item_id is not null;

create unique index if not exists menu_categories_site_catalog_category_key
  on public.menu_categories (menu_site_id, catalog_category_id)
  where catalog_category_id is not null;

create unique index if not exists menu_items_site_catalog_item_key
  on public.menu_items (menu_site_id, catalog_item_id)
  where catalog_item_id is not null;

create table if not exists public.menu_site_content_links (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  source_menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  target_menu_site_id uuid not null references public.menu_sites(id) on delete cascade,
  mode text not null check (mode in ('linked', 'independent')),
  status text not null check (status in ('active', 'copied', 'disconnected')),
  shared_fields_version integer not null default 1 check (shared_fields_version = 1),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_site_content_links_distinct_sites_check
    check (source_menu_site_id <> target_menu_site_id),
  constraint menu_site_content_links_target_key unique (target_menu_site_id)
);

create index if not exists menu_site_content_links_owner_created_idx
  on public.menu_site_content_links (owner_user_id, created_at desc);

create index if not exists menu_site_content_links_source_status_idx
  on public.menu_site_content_links (source_menu_site_id, status);

alter table public.menu_site_content_links enable row level security;

revoke all on table public.menu_site_content_links from public, anon, authenticated;
grant select, insert, update, delete on table public.menu_site_content_links to authenticated;
grant select, insert, update, delete on table public.menu_site_content_links to service_role;

create policy "menu_site_content_links_owner_select"
  on public.menu_site_content_links
  for select
  to authenticated
  using (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.menu_sites source_site
      join public.menu_sites target_site
        on target_site.id = menu_site_content_links.target_menu_site_id
      where source_site.id = menu_site_content_links.source_menu_site_id
        and source_site.user_id = auth.uid()
        and target_site.user_id = auth.uid()
    )
  );

create policy "menu_site_content_links_owner_insert"
  on public.menu_site_content_links
  for insert
  to authenticated
  with check (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.menu_sites source_site
      join public.menu_sites target_site
        on target_site.id = menu_site_content_links.target_menu_site_id
      where source_site.id = menu_site_content_links.source_menu_site_id
        and source_site.user_id = auth.uid()
        and target_site.user_id = auth.uid()
    )
  );

create policy "menu_site_content_links_owner_update"
  on public.menu_site_content_links
  for update
  to authenticated
  using (owner_user_id = auth.uid())
  with check (
    owner_user_id = auth.uid()
    and exists (
      select 1
      from public.menu_sites source_site
      join public.menu_sites target_site
        on target_site.id = menu_site_content_links.target_menu_site_id
      where source_site.id = menu_site_content_links.source_menu_site_id
        and source_site.user_id = auth.uid()
        and target_site.user_id = auth.uid()
    )
  );

create policy "menu_site_content_links_owner_delete"
  on public.menu_site_content_links
  for delete
  to authenticated
  using (owner_user_id = auth.uid());

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.sync_linked_menu_category_core()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_user_id uuid;
begin
  if pg_trigger_depth() > 1 or new.catalog_category_id is null then
    return new;
  end if;

  select menu_sites.user_id
  into v_owner_user_id
  from public.menu_sites
  where menu_sites.id = new.menu_site_id;

  update public.menu_categories target_category
  set
    name = new.name,
    description = new.description,
    updated_at = now()
  from public.menu_sites target_site
  where target_category.catalog_category_id = new.catalog_category_id
    and target_category.id <> new.id
    and target_site.id = target_category.menu_site_id
    and target_site.user_id = v_owner_user_id;

  return new;
end;
$$;

create or replace function private.sync_linked_menu_item_core()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_owner_user_id uuid;
begin
  if pg_trigger_depth() > 1 or new.catalog_item_id is null then
    return new;
  end if;

  select menu_sites.user_id
  into v_owner_user_id
  from public.menu_sites
  where menu_sites.id = new.menu_site_id;

  update public.menu_items target_item
  set
    name = new.name,
    set_name = new.set_name,
    price = new.price,
    price_label = new.price_label,
    price_note = new.price_note,
    description = new.description,
    image_url = new.image_url,
    badge = new.badge,
    badge_type = new.badge_type,
    badge_label = new.badge_label,
    recommended = new.recommended,
    origin_info = new.origin_info,
    is_best = new.is_best,
    is_sold_out = new.is_sold_out,
    options = new.options,
    allergens = new.allergens,
    translations = new.translations,
    portion_label = new.portion_label,
    updated_at = now()
  from public.menu_sites target_site
  where target_item.catalog_item_id = new.catalog_item_id
    and target_item.id <> new.id
    and target_site.id = target_item.menu_site_id
    and target_site.user_id = v_owner_user_id;

  return new;
end;
$$;

create or replace function private.sync_linked_menu_category_translation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_category_id uuid;
  v_catalog_category_id uuid;
  v_owner_user_id uuid;
begin
  if tg_op = 'DELETE' then
    v_source_category_id := old.category_id;
  else
    v_source_category_id := new.category_id;
  end if;

  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select category.catalog_category_id, site.user_id
  into v_catalog_category_id, v_owner_user_id
  from public.menu_categories category
  join public.menu_sites site on site.id = category.menu_site_id
  where category.id = v_source_category_id;

  if v_catalog_category_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    delete from public.menu_category_translations target_translation
    using public.menu_categories target_category, public.menu_sites target_site
    where target_translation.category_id = target_category.id
      and target_translation.locale = old.locale
      and target_category.catalog_category_id = v_catalog_category_id
      and target_category.id <> old.category_id
      and target_site.id = target_category.menu_site_id
      and target_site.user_id = v_owner_user_id;
    return old;
  end if;

  insert into public.menu_category_translations (
    category_id,
    locale,
    name,
    description,
    source_text_hash,
    status
  )
  select
    target_category.id,
    new.locale,
    new.name,
    new.description,
    new.source_text_hash,
    new.status
  from public.menu_categories target_category
  join public.menu_sites target_site on target_site.id = target_category.menu_site_id
  where target_category.catalog_category_id = v_catalog_category_id
    and target_category.id <> new.category_id
    and target_site.user_id = v_owner_user_id
  on conflict (category_id, locale) do update
  set
    name = excluded.name,
    description = excluded.description,
    source_text_hash = excluded.source_text_hash,
    status = excluded.status,
    updated_at = now();

  return new;
end;
$$;

create or replace function private.sync_linked_menu_item_translation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_item_id uuid;
  v_catalog_item_id uuid;
  v_owner_user_id uuid;
begin
  if tg_op = 'DELETE' then
    v_source_item_id := old.item_id;
  else
    v_source_item_id := new.item_id;
  end if;

  if pg_trigger_depth() > 1 then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  select item.catalog_item_id, site.user_id
  into v_catalog_item_id, v_owner_user_id
  from public.menu_items item
  join public.menu_sites site on site.id = item.menu_site_id
  where item.id = v_source_item_id;

  if v_catalog_item_id is null then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    delete from public.menu_item_translations target_translation
    using public.menu_items target_item, public.menu_sites target_site
    where target_translation.item_id = target_item.id
      and target_translation.locale = old.locale
      and target_item.catalog_item_id = v_catalog_item_id
      and target_item.id <> old.item_id
      and target_site.id = target_item.menu_site_id
      and target_site.user_id = v_owner_user_id;
    return old;
  end if;

  insert into public.menu_item_translations (
    item_id,
    locale,
    name,
    set_name,
    description,
    price_label,
    price_note,
    portion_label,
    badge_label,
    origin_info,
    source_text_hash,
    status
  )
  select
    target_item.id,
    new.locale,
    new.name,
    new.set_name,
    new.description,
    new.price_label,
    new.price_note,
    new.portion_label,
    new.badge_label,
    new.origin_info,
    new.source_text_hash,
    new.status
  from public.menu_items target_item
  join public.menu_sites target_site on target_site.id = target_item.menu_site_id
  where target_item.catalog_item_id = v_catalog_item_id
    and target_item.id <> new.item_id
    and target_site.user_id = v_owner_user_id
  on conflict (item_id, locale) do update
  set
    name = excluded.name,
    set_name = excluded.set_name,
    description = excluded.description,
    price_label = excluded.price_label,
    price_note = excluded.price_note,
    portion_label = excluded.portion_label,
    badge_label = excluded.badge_label,
    origin_info = excluded.origin_info,
    source_text_hash = excluded.source_text_hash,
    status = excluded.status,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists sync_linked_menu_category_core on public.menu_categories;
create trigger sync_linked_menu_category_core
  after update of catalog_category_id, name, description
  on public.menu_categories
  for each row
  execute function private.sync_linked_menu_category_core();

drop trigger if exists sync_linked_menu_item_core on public.menu_items;
create trigger sync_linked_menu_item_core
  after update of catalog_item_id, name, set_name, price, price_label, price_note,
    description, image_url, badge, badge_type, badge_label, recommended, origin_info,
    is_best, is_sold_out, options, allergens, translations, portion_label
  on public.menu_items
  for each row
  execute function private.sync_linked_menu_item_core();

drop trigger if exists sync_linked_menu_category_translation on public.menu_category_translations;
create trigger sync_linked_menu_category_translation
  after insert or update or delete
  on public.menu_category_translations
  for each row
  execute function private.sync_linked_menu_category_translation();

drop trigger if exists sync_linked_menu_item_translation on public.menu_item_translations;
create trigger sync_linked_menu_item_translation
  after insert or update or delete
  on public.menu_item_translations
  for each row
  execute function private.sync_linked_menu_item_translation();

revoke all on function private.sync_linked_menu_category_core() from public, anon, authenticated;
revoke all on function private.sync_linked_menu_item_core() from public, anon, authenticated;
revoke all on function private.sync_linked_menu_category_translation() from public, anon, authenticated;
revoke all on function private.sync_linked_menu_item_translation() from public, anon, authenticated;

create or replace function private.protect_active_linked_menu_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1
    from public.menu_site_content_links content_link
    where old.id in (content_link.source_menu_site_id, content_link.target_menu_site_id)
      and content_link.status = 'active'
  ) then
    raise exception 'active linked menu content must be disconnected before deleting menu site'
      using errcode = '55000';
  end if;

  return old;
end;
$$;

drop trigger if exists protect_active_linked_menu_delete on public.menu_sites;
create trigger protect_active_linked_menu_delete
  before delete on public.menu_sites
  for each row
  execute function private.protect_active_linked_menu_delete();

revoke all on function private.protect_active_linked_menu_delete() from public, anon, authenticated;

create or replace function public.import_menu_site_content(
  p_source_menu_site_id uuid,
  p_target_menu_site_id uuid,
  p_mode text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
  v_source_owner_id uuid;
  v_target_owner_id uuid;
  v_source_template_key text;
  v_target_template_key text;
  v_target_status text;
  v_linked boolean := p_mode = 'linked';
  v_page record;
  v_category record;
  v_price_column record;
  v_item record;
  v_price_option record;
  v_trait record;
  v_new_id uuid;
  v_target_page_id uuid;
  v_target_category_id uuid;
  v_target_item_id uuid;
  v_target_price_column_id uuid;
  v_page_count integer := 0;
  v_category_count integer := 0;
  v_item_count integer := 0;
begin
  if v_actor_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  if p_mode not in ('linked', 'independent') then
    raise exception 'unsupported import mode' using errcode = '22023';
  end if;

  if p_source_menu_site_id = p_target_menu_site_id then
    raise exception 'source and target menu sites must differ' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_target_menu_site_id::text, 0));

  select user_id, template_key
  into v_source_owner_id, v_source_template_key
  from public.menu_sites
  where id = p_source_menu_site_id;

  select user_id, template_key, status
  into v_target_owner_id, v_target_template_key, v_target_status
  from public.menu_sites
  where id = p_target_menu_site_id;

  if v_source_owner_id is null or v_target_owner_id is null then
    raise exception 'menu site not found' using errcode = 'P0002';
  end if;

  if v_source_owner_id <> v_actor_user_id or v_target_owner_id <> v_actor_user_id then
    raise exception 'owner access required' using errcode = '42501';
  end if;

  if v_target_status <> 'draft' then
    raise exception 'target menu site must be draft' using errcode = '55000';
  end if;

  if not exists (select 1 from public.menu_items where menu_site_id = p_source_menu_site_id) then
    raise exception 'source menu site has no menu items' using errcode = '22023';
  end if;

  create temporary table if not exists shared_menu_page_map (
    source_id uuid primary key,
    target_id uuid not null
  ) on commit drop;
  create temporary table if not exists shared_menu_category_map (
    source_id uuid primary key,
    target_id uuid not null
  ) on commit drop;
  create temporary table if not exists shared_menu_price_column_map (
    source_id uuid primary key,
    target_id uuid not null
  ) on commit drop;
  create temporary table if not exists shared_menu_item_map (
    source_id uuid primary key,
    target_id uuid not null
  ) on commit drop;
  create temporary table if not exists shared_menu_price_option_map (
    source_id uuid primary key,
    target_id uuid not null
  ) on commit drop;
  create temporary table if not exists shared_menu_trait_map (
    source_id uuid primary key,
    target_id uuid not null
  ) on commit drop;

  truncate table
    pg_temp.shared_menu_page_map,
    pg_temp.shared_menu_category_map,
    pg_temp.shared_menu_price_column_map,
    pg_temp.shared_menu_item_map,
    pg_temp.shared_menu_price_option_map,
    pg_temp.shared_menu_trait_map;

  delete from public.menu_site_content_links
  where target_menu_site_id = p_target_menu_site_id;

  delete from public.menu_promotions
  where menu_site_id = p_target_menu_site_id;
  delete from public.menu_items
  where menu_site_id = p_target_menu_site_id;
  delete from public.menu_categories
  where menu_site_id = p_target_menu_site_id;
  delete from public.menu_pages
  where menu_site_id = p_target_menu_site_id;

  if v_linked then
    update public.menu_categories
    set catalog_category_id = gen_random_uuid()
    where menu_site_id = p_source_menu_site_id
      and catalog_category_id is null;

    update public.menu_items
    set catalog_item_id = gen_random_uuid()
    where menu_site_id = p_source_menu_site_id
      and catalog_item_id is null;
  end if;

  for v_page in
    select *
    from public.menu_pages
    where menu_site_id = p_source_menu_site_id
    order by sort_order, created_at, id
  loop
    insert into public.menu_pages (
      menu_site_id,
      title,
      description,
      description_visible,
      display_settings,
      legacy_section_key,
      visible,
      sort_order
    ) values (
      p_target_menu_site_id,
      v_page.title,
      v_page.description,
      v_page.description_visible,
      case when v_source_template_key = v_target_template_key then v_page.display_settings else '{}'::jsonb end,
      v_page.legacy_section_key,
      v_page.visible,
      v_page.sort_order
    ) returning id into v_new_id;

    insert into pg_temp.shared_menu_page_map(source_id, target_id)
    values (v_page.id, v_new_id);

    insert into public.menu_page_translations (
      menu_page_id, locale, title, description, source_text_hash, status
    )
    select v_new_id, locale, title, description, source_text_hash, status
    from public.menu_page_translations
    where menu_page_id = v_page.id;

    v_page_count := v_page_count + 1;
  end loop;

  for v_category in
    select *
    from public.menu_categories
    where menu_site_id = p_source_menu_site_id
    order by sort_order, created_at, id
  loop
    select target_id
    into v_target_page_id
    from pg_temp.shared_menu_page_map
    where source_id = v_category.menu_page_id;

    insert into public.menu_categories (
      menu_site_id,
      menu_page_id,
      catalog_category_id,
      name,
      description,
      description_visible,
      section_key,
      sort_order,
      visible
    ) values (
      p_target_menu_site_id,
      v_target_page_id,
      case when v_linked then v_category.catalog_category_id else null end,
      v_category.name,
      v_category.description,
      v_category.description_visible,
      v_category.section_key,
      v_category.sort_order,
      v_category.visible
    ) returning id into v_target_category_id;

    insert into pg_temp.shared_menu_category_map(source_id, target_id)
    values (v_category.id, v_target_category_id);

    insert into public.menu_category_translations (
      category_id, locale, name, description, source_text_hash, status
    )
    select v_target_category_id, locale, name, description, source_text_hash, status
    from public.menu_category_translations
    where category_id = v_category.id;

    v_category_count := v_category_count + 1;
  end loop;

  for v_price_column in
    select price_column.*
    from public.menu_category_price_columns price_column
    join pg_temp.shared_menu_category_map category_map
      on category_map.source_id = price_column.category_id
    where price_column.menu_site_id = p_source_menu_site_id
    order by price_column.sort_order, price_column.created_at, price_column.id
  loop
    select target_id
    into v_target_category_id
    from pg_temp.shared_menu_category_map
    where source_id = v_price_column.category_id;

    insert into public.menu_category_price_columns (
      menu_site_id, category_id, key, label, sort_order, visible, settings
    ) values (
      p_target_menu_site_id,
      v_target_category_id,
      v_price_column.key,
      v_price_column.label,
      v_price_column.sort_order,
      v_price_column.visible,
      v_price_column.settings
    ) returning id into v_target_price_column_id;

    insert into pg_temp.shared_menu_price_column_map(source_id, target_id)
    values (v_price_column.id, v_target_price_column_id);
  end loop;

  for v_item in
    select *
    from public.menu_items
    where menu_site_id = p_source_menu_site_id
    order by sort_order, created_at, id
  loop
    select target_id
    into v_target_category_id
    from pg_temp.shared_menu_category_map
    where source_id = v_item.category_id;

    insert into public.menu_items (
      menu_site_id,
      category_id,
      catalog_item_id,
      name,
      set_name,
      price,
      price_label,
      price_note,
      description,
      image_url,
      image_path,
      badge,
      badge_type,
      badge_label,
      recommended,
      origin_info,
      is_best,
      is_sold_out,
      visible,
      sort_order,
      options,
      allergens,
      translations,
      portion_label,
      price_visible,
      portion_visible,
      traits_visible,
      orderable
    ) values (
      p_target_menu_site_id,
      v_target_category_id,
      case when v_linked then v_item.catalog_item_id else null end,
      v_item.name,
      v_item.set_name,
      v_item.price,
      v_item.price_label,
      v_item.price_note,
      v_item.description,
      v_item.image_url,
      null,
      v_item.badge,
      v_item.badge_type,
      v_item.badge_label,
      v_item.recommended,
      v_item.origin_info,
      v_item.is_best,
      v_item.is_sold_out,
      v_item.visible,
      v_item.sort_order,
      v_item.options,
      v_item.allergens,
      v_item.translations,
      v_item.portion_label,
      v_item.price_visible,
      v_item.portion_visible,
      v_item.traits_visible,
      false
    ) returning id into v_target_item_id;

    insert into pg_temp.shared_menu_item_map(source_id, target_id)
    values (v_item.id, v_target_item_id);

    insert into public.menu_item_translations (
      item_id, locale, name, set_name, description, price_label, price_note,
      portion_label, badge_label, origin_info, source_text_hash, status
    )
    select
      v_target_item_id, locale, name, set_name, description, price_label, price_note,
      portion_label, badge_label, origin_info, source_text_hash, status
    from public.menu_item_translations
    where item_id = v_item.id;

    v_item_count := v_item_count + 1;
  end loop;

  for v_price_option in
    select price_option.*
    from public.menu_item_price_options price_option
    join pg_temp.shared_menu_item_map item_map
      on item_map.source_id = price_option.menu_item_id
    where price_option.menu_site_id = p_source_menu_site_id
    order by price_option.sort_order, price_option.created_at, price_option.id
  loop
    select target_id
    into v_target_item_id
    from pg_temp.shared_menu_item_map
    where source_id = v_price_option.menu_item_id;

    insert into public.menu_item_price_options (
      menu_site_id, menu_item_id, label, price, price_label, visible, sort_order
    ) values (
      p_target_menu_site_id,
      v_target_item_id,
      v_price_option.label,
      v_price_option.price,
      v_price_option.price_label,
      v_price_option.visible,
      v_price_option.sort_order
    ) returning id into v_new_id;

    insert into pg_temp.shared_menu_price_option_map(source_id, target_id)
    values (v_price_option.id, v_new_id);

    insert into public.menu_item_price_option_translations (
      price_option_id, locale, label, price_label, source_text_hash, status
    )
    select v_new_id, locale, label, price_label, source_text_hash, status
    from public.menu_item_price_option_translations
    where price_option_id = v_price_option.id;
  end loop;

  for v_trait in
    select trait.*
    from public.menu_item_traits trait
    join pg_temp.shared_menu_item_map item_map
      on item_map.source_id = trait.menu_item_id
    where trait.menu_site_id = p_source_menu_site_id
    order by trait.sort_order, trait.created_at, trait.id
  loop
    select target_id
    into v_target_item_id
    from pg_temp.shared_menu_item_map
    where source_id = v_trait.menu_item_id;

    insert into public.menu_item_traits (
      menu_site_id, menu_item_id, label, value, max_value, visible, sort_order
    ) values (
      p_target_menu_site_id,
      v_target_item_id,
      v_trait.label,
      v_trait.value,
      v_trait.max_value,
      v_trait.visible,
      v_trait.sort_order
    ) returning id into v_new_id;

    insert into pg_temp.shared_menu_trait_map(source_id, target_id)
    values (v_trait.id, v_new_id);

    insert into public.menu_item_trait_translations (
      trait_id, locale, label, source_text_hash, status
    )
    select v_new_id, locale, label, source_text_hash, status
    from public.menu_item_trait_translations
    where trait_id = v_trait.id;
  end loop;

  insert into public.menu_item_price_column_values (
    menu_item_id, price_column_id, price, price_label, visible, settings
  )
  select
    item_map.target_id,
    price_column_map.target_id,
    source_value.price,
    source_value.price_label,
    source_value.visible,
    source_value.settings
  from public.menu_item_price_column_values source_value
  join pg_temp.shared_menu_item_map item_map
    on item_map.source_id = source_value.menu_item_id
  join pg_temp.shared_menu_price_column_map price_column_map
    on price_column_map.source_id = source_value.price_column_id;

  insert into public.menu_site_content_links (
    owner_user_id,
    source_menu_site_id,
    target_menu_site_id,
    mode,
    status
  ) values (
    v_actor_user_id,
    p_source_menu_site_id,
    p_target_menu_site_id,
    p_mode,
    case when v_linked then 'active' else 'copied' end
  );

  return jsonb_build_object(
    'sourceMenuSiteId', p_source_menu_site_id,
    'targetMenuSiteId', p_target_menu_site_id,
    'mode', p_mode,
    'pageCount', v_page_count,
    'categoryCount', v_category_count,
    'itemCount', v_item_count
  );
end;
$$;

revoke all on function public.import_menu_site_content(uuid, uuid, text) from public, anon;
grant execute on function public.import_menu_site_content(uuid, uuid, text) to authenticated;
grant execute on function public.import_menu_site_content(uuid, uuid, text) to service_role;

create or replace function public.disconnect_menu_site_content(
  p_target_menu_site_id uuid
)
returns boolean
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_actor_user_id uuid := auth.uid();
begin
  if v_actor_user_id is null then
    raise exception 'authentication required' using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_target_menu_site_id::text, 0));

  if not exists (
    select 1
    from public.menu_sites
    where id = p_target_menu_site_id
      and user_id = v_actor_user_id
  ) then
    raise exception 'owner access required' using errcode = '42501';
  end if;

  update public.menu_items
  set catalog_item_id = null
  where menu_site_id = p_target_menu_site_id
    and catalog_item_id is not null;

  update public.menu_categories
  set catalog_category_id = null
  where menu_site_id = p_target_menu_site_id
    and catalog_category_id is not null;

  update public.menu_site_content_links
  set status = 'disconnected', updated_at = now()
  where target_menu_site_id = p_target_menu_site_id
    and owner_user_id = v_actor_user_id
    and status = 'active';

  return found;
end;
$$;

revoke all on function public.disconnect_menu_site_content(uuid) from public, anon;
grant execute on function public.disconnect_menu_site_content(uuid) to authenticated;
grant execute on function public.disconnect_menu_site_content(uuid) to service_role;

comment on table public.menu_site_content_links is
  'Owner-created relationship for importing one menu site into another. Active linked imports share category/item core copy fields; layout and channel features remain menu-site-specific.';

comment on column public.menu_items.catalog_item_id is
  'Nullable shared identity. Rows with the same value under one owner synchronize core menu copy fields.';

comment on function public.import_menu_site_content(uuid, uuid, text) is
  'Atomically replaces a draft target menu content from another menu owned by the same authenticated user. Linked mode assigns shared category/item identities; independent mode creates detached copies.';

comment on function public.disconnect_menu_site_content(uuid) is
  'Stops future linked category/item synchronization for an owned target menu without deleting either menu content.';

comment on function private.protect_active_linked_menu_delete() is
  'Prevents either side of an active menu-content link from being hard-deleted while shared content and image URLs may still depend on it.';
