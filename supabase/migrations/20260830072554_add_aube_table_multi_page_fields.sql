-- Additive foundation for the Aube Table multi-page Dining template.
--
-- Safety:
-- - Existing single-page and hidden Brew Chapter rows keep their current behavior.
-- - No row is deleted or rewritten.
-- - New fields are nullable or have backward-compatible defaults.
-- - RLS and grants are unchanged because no new exposed table is created.

alter table public.menu_pages
  add column if not exists layout_columns smallint not null default 1,
  add column if not exists text_alignment text not null default 'left';

alter table public.menu_pages
  drop constraint if exists menu_pages_layout_columns_check,
  add constraint menu_pages_layout_columns_check
    check (layout_columns in (1, 2)),
  drop constraint if exists menu_pages_text_alignment_check,
  add constraint menu_pages_text_alignment_check
    check (text_alignment in ('left', 'center'));

alter table public.menu_categories
  add column if not exists course_price integer,
  add column if not exists course_price_label text,
  add column if not exists course_price_visible boolean not null default true,
  add column if not exists course_price_description text,
  add column if not exists course_price_description_visible boolean not null default true;

alter table public.menu_categories
  drop constraint if exists menu_categories_course_price_check,
  add constraint menu_categories_course_price_check
    check (course_price is null or course_price >= 0),
  drop constraint if exists menu_categories_course_price_label_length_check,
  add constraint menu_categories_course_price_label_length_check
    check (course_price_label is null or char_length(course_price_label) <= 30),
  drop constraint if exists menu_categories_course_price_description_length_check,
  add constraint menu_categories_course_price_description_length_check
    check (course_price_description is null or char_length(course_price_description) <= 120);

alter table public.menu_items
  add column if not exists menu_page_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_items_menu_page_id_fkey'
      and conrelid = 'public.menu_items'::regclass
  ) then
    alter table public.menu_items
      add constraint menu_items_menu_page_id_fkey
      foreign key (menu_page_id)
      references public.menu_pages(id)
      on delete set null;
  end if;
end;
$$;

create index if not exists menu_items_menu_page_sort_idx
  on public.menu_items (menu_page_id, sort_order, created_at)
  where menu_page_id is not null;

alter table public.menu_category_translations
  add column if not exists course_price_label text,
  add column if not exists course_price_description text;

create or replace function public.validate_menu_item_multi_page_container()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  target_page_site_id uuid;
  target_category_site_id uuid;
  target_category_page_id uuid;
begin
  if new.menu_page_id is not null then
    select page.menu_site_id
      into target_page_site_id
      from public.menu_pages as page
      where page.id = new.menu_page_id;

    if target_page_site_id is distinct from new.menu_site_id then
      raise exception 'menu item page must belong to the same menu site';
    end if;
  end if;

  if new.category_id is not null then
    select category.menu_site_id, category.menu_page_id
      into target_category_site_id, target_category_page_id
      from public.menu_categories as category
      where category.id = new.category_id;

    if target_category_site_id is distinct from new.menu_site_id then
      raise exception 'menu item course must belong to the same menu site';
    end if;

    if new.menu_page_id is not null
      and target_category_page_id is not null
      and target_category_page_id is distinct from new.menu_page_id then
      raise exception 'menu item page must match the course page';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists validate_menu_item_multi_page_container on public.menu_items;
create trigger validate_menu_item_multi_page_container
before insert or update of menu_site_id, menu_page_id, category_id
on public.menu_items
for each row
execute function public.validate_menu_item_multi_page_container();

revoke all on function public.validate_menu_item_multi_page_container() from public, anon, authenticated;
