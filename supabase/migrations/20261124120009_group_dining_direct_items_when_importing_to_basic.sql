-- Keep the existing RPC signature, permissions and import transaction.
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
  v_group_direct_items boolean;
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

  v_group_direct_items :=
    lower(btrim(v_source_template_key)) in ('dining_aube_table_a', 'dining_aube_table_b')
    and lower(btrim(v_target_template_key)) in (
      'cafe_design_a', 'cafe_mocha_forest_a', 'cafe_sunday_line_a', 'cafe_van_gogh_a',
      'cafe_round_focus_a', 'fast_food_loop_bagel_a', 'restaurant_onue_a',
      'cafe_noir_a', 'cafe_brew_chapter_a'
    );

  create temporary table if not exists shared_menu_page_map (
    source_id uuid primary key,
    target_id uuid not null,
    direct_item_category_id uuid
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
    select
      item.*,
      category_map.target_id as target_category_id,
      page_map.target_id as direct_item_target_page_id,
      case when page_map.target_id is not null then
        (row_number() over (
          partition by item.menu_page_id, item.category_id
          order by item.sort_order, item.created_at, item.id
        ) - 1)::integer
      else item.sort_order end as target_sort_order
    from public.menu_items item
    left join pg_temp.shared_menu_category_map category_map on category_map.source_id = item.category_id
    left join pg_temp.shared_menu_page_map page_map
      on v_group_direct_items and item.category_id is null and page_map.source_id = item.menu_page_id
    where item.menu_site_id = p_source_menu_site_id
    order by item.sort_order, item.created_at, item.id
  loop
    v_target_category_id := v_item.target_category_id;
    if v_item.direct_item_target_page_id is not null then
      select direct_item_category_id
      into v_target_category_id
      from pg_temp.shared_menu_page_map
      where source_id = v_item.menu_page_id;

      -- Create the category only when importing its first direct item.
      if v_target_category_id is null then
        insert into public.menu_categories (
          menu_site_id, menu_page_id, name, description_visible, sort_order, visible
        )
        select
          p_target_menu_site_id, page.id, coalesce(nullif(btrim(page.title), ''), '메뉴'), false,
          least(coalesce((
            select max(category.sort_order)::bigint + 1
            from public.menu_categories category
            where category.menu_site_id = p_target_menu_site_id and category.menu_page_id = page.id
          ), 0), 2147483647)::integer,
          page.visible
        from public.menu_pages page
        where page.id = v_item.direct_item_target_page_id
        returning id into v_target_category_id;

        update pg_temp.shared_menu_page_map
        set direct_item_category_id = v_target_category_id
        where source_id = v_item.menu_page_id;

        insert into public.menu_category_translations (category_id, locale, name, status)
        select v_target_category_id, locale, title, status
        from public.menu_page_translations
        where menu_page_id = v_item.direct_item_target_page_id and nullif(btrim(title), '') is not null;

        v_category_count := v_category_count + 1;
      end if;
    end if;

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
      v_item.target_sort_order,
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
