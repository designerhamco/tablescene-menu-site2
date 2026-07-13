alter table public.menu_promotion_items
  add column if not exists price_column_id uuid null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_promotion_items_price_column_id_fkey'
      and conrelid = 'public.menu_promotion_items'::regclass
  ) then
    alter table public.menu_promotion_items
      add constraint menu_promotion_items_price_column_id_fkey
      foreign key (price_column_id)
      references public.menu_category_price_columns(id)
      on delete cascade;
  end if;
end $$;

alter table public.menu_promotion_items
  drop constraint if exists menu_promotion_items_promotion_item_key;

drop index if exists public.menu_promotion_items_promotion_item_key;

create index if not exists menu_promotion_items_price_column_id_idx
  on public.menu_promotion_items (price_column_id);

create index if not exists menu_promotion_items_menu_item_price_column_idx
  on public.menu_promotion_items (menu_item_id, price_column_id);

create unique index if not exists menu_promotion_items_unique_single_price_target_idx
  on public.menu_promotion_items (promotion_id, menu_item_id)
  where price_column_id is null;

create unique index if not exists menu_promotion_items_unique_column_price_target_idx
  on public.menu_promotion_items (promotion_id, menu_item_id, price_column_id)
  where price_column_id is not null;

create or replace function public.validate_menu_promotion_item_price_column()
returns trigger
language plpgsql
as $$
declare
  v_promotion_site_id uuid;
  v_item_category_id uuid;
  v_item_site_id uuid;
  v_column_category_id uuid;
  v_column_site_id uuid;
begin
  if new.price_column_id is null then
    return new;
  end if;

  select menu_site_id
  into v_promotion_site_id
  from public.menu_promotions
  where id = new.promotion_id;

  if v_promotion_site_id is null then
    raise exception 'menu promotion % does not exist', new.promotion_id;
  end if;

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

  if v_item_site_id <> v_promotion_site_id then
    raise exception 'promotion target item menu_site_id mismatch';
  end if;

  if v_column_site_id <> v_promotion_site_id then
    raise exception 'promotion target price column menu_site_id mismatch';
  end if;

  if v_item_category_id is distinct from v_column_category_id then
    raise exception 'promotion target price column must belong to the same category as the menu item';
  end if;

  return new;
end;
$$;

drop trigger if exists validate_menu_promotion_item_price_column on public.menu_promotion_items;

create trigger validate_menu_promotion_item_price_column
  before insert or update on public.menu_promotion_items
  for each row execute function public.validate_menu_promotion_item_price_column();

revoke execute on function public.validate_menu_promotion_item_price_column() from public, anon, authenticated;

drop policy if exists "menu_promotion_items_select_public_active" on public.menu_promotion_items;

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
        and (
          menu_promotion_items.price_column_id is null
          or exists (
            select 1
            from public.menu_category_price_columns
            join public.menu_item_price_column_values
              on menu_item_price_column_values.price_column_id = menu_category_price_columns.id
             and menu_item_price_column_values.menu_item_id = menu_promotion_items.menu_item_id
            where menu_category_price_columns.id = menu_promotion_items.price_column_id
              and menu_category_price_columns.visible = true
              and menu_category_price_columns.menu_site_id = menu_promotions.menu_site_id
              and menu_category_price_columns.category_id = menu_items.category_id
              and menu_item_price_column_values.price_column_id = menu_promotion_items.price_column_id
              and menu_item_price_column_values.visible = true
              and menu_item_price_column_values.price is not null
          )
        )
    )
  );
