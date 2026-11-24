// Run the actual import migrations in isolated PostgreSQL using synthetic menus.
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const { PGlite } = await import(process.env.QA_PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const id = number => `00000000-0000-4000-8000-${String(number).padStart(12, "0")}`;
const owner = id(1);
const otherOwner = id(2);
const dining = id(10);
const otherDining = id(11);
const basic = id(20);
const linkedBasic = id(21);
const display = id(30);
const published = id(31);
const otherBasic = id(32);
const aLaCarte = id(40);
const drinks = id(41);
const courseOnly = id(42);
const hiddenPage = id(43);
const otherDiningPage = id(44);
const mixedCourse = id(50);
const existingCourse = id(51);

async function applyMigration(file) {
  await db.exec(await readFile(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8"));
}

async function importMenu(source, target, mode = "independent") {
  const { rows } = await db.query(
    "select public.import_menu_site_content($1, $2, $3) as result",
    [source, target, mode],
  );
  return rows[0].result;
}

async function categoryItems(site) {
  const { rows } = await db.query(`
    select page.title as page, category.name as category, category.visible,
      category.sort_order as category_order,
      array_agg(item.name order by item.sort_order, item.created_at, item.id) as items
    from menu_categories category
    join menu_pages page on page.id = category.menu_page_id
    join menu_items item on item.category_id = category.id
    where category.menu_site_id = $1
    group by page.id, category.id
    order by page.sort_order, category.sort_order
  `, [site]);
  return rows;
}

try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create role service_role bypassrls;
    create schema auth;
    create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable
      as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
    grant usage on schema auth to anon, authenticated;
    create table menu_sites(id uuid primary key, user_id uuid not null, template_key text not null, status text not null);
    create table menu_pages(
      id uuid primary key default gen_random_uuid(), menu_site_id uuid not null references menu_sites,
      title text not null, description text, description_visible boolean default true,
      display_settings jsonb default '{}', legacy_section_key text, visible boolean not null default true,
      sort_order integer not null default 0, created_at timestamptz not null default now()
    );
    create table menu_categories(
      id uuid primary key default gen_random_uuid(), menu_site_id uuid not null references menu_sites,
      menu_page_id uuid references menu_pages on delete cascade, name text not null, description text,
      description_visible boolean default true, section_key text, sort_order integer not null default 0,
      visible boolean not null default true, created_at timestamptz not null default now(), updated_at timestamptz default now()
    );
    create table menu_items(
      id uuid primary key default gen_random_uuid(), menu_site_id uuid not null references menu_sites,
      category_id uuid references menu_categories on delete cascade, name text not null, set_name text,
      price integer, price_label text, price_note text, description text, image_url text, image_path text,
      badge text, badge_type text, badge_label text, recommended boolean, origin_info text, is_best boolean,
      is_sold_out boolean, visible boolean default true, sort_order integer not null default 0, options jsonb,
      allergens text[], translations jsonb, portion_label text, price_visible boolean, portion_visible boolean,
      traits_visible boolean, orderable boolean, created_at timestamptz not null default now(), updated_at timestamptz default now()
    );
    create table menu_promotions(id uuid primary key default gen_random_uuid(), menu_site_id uuid references menu_sites);
    create table menu_page_translations(
      menu_page_id uuid references menu_pages on delete cascade, locale text, title text, description text,
      source_text_hash text, status text not null, primary key (menu_page_id, locale)
    );
    create table menu_category_translations(
      category_id uuid references menu_categories on delete cascade, locale text, name text, description text,
      source_text_hash text, status text not null, updated_at timestamptz default now(), primary key (category_id, locale)
    );
    create table menu_item_translations(
      item_id uuid references menu_items on delete cascade, locale text, name text, set_name text, description text,
      price_label text, price_note text, portion_label text, badge_label text, origin_info text,
      source_text_hash text, status text not null, updated_at timestamptz default now(), primary key (item_id, locale)
    );
    create table menu_category_price_columns(
      id uuid primary key default gen_random_uuid(), menu_site_id uuid, category_id uuid references menu_categories on delete cascade,
      key text, label text, sort_order integer, visible boolean, settings jsonb, created_at timestamptz default now()
    );
    create table menu_item_price_column_values(
      menu_item_id uuid references menu_items on delete cascade, price_column_id uuid references menu_category_price_columns on delete cascade,
      price integer, price_label text, visible boolean, settings jsonb
    );
    create table menu_item_price_options(
      id uuid primary key default gen_random_uuid(), menu_site_id uuid, menu_item_id uuid references menu_items on delete cascade,
      label text, price integer, price_label text, visible boolean, sort_order integer, created_at timestamptz default now()
    );
    create table menu_item_price_option_translations(
      price_option_id uuid references menu_item_price_options on delete cascade, locale text, label text, price_label text,
      source_text_hash text, status text
    );
    create table menu_item_traits(
      id uuid primary key default gen_random_uuid(), menu_site_id uuid, menu_item_id uuid references menu_items on delete cascade,
      label text, value integer, max_value integer, visible boolean, sort_order integer, created_at timestamptz default now()
    );
    create table menu_item_trait_translations(
      trait_id uuid references menu_item_traits on delete cascade, locale text, label text, source_text_hash text, status text
    );
    grant select, insert, update, delete on all tables in schema public to authenticated;
    insert into auth.users values ('${owner}'), ('${otherOwner}');
    insert into menu_sites values
      ('${dining}', '${owner}', 'dining_aube_table_a', 'published'),
      ('${otherDining}', '${owner}', 'dining_aube_table_b', 'draft'),
      ('${basic}', '${owner}', 'cafe_design_a', 'draft'),
      ('${linkedBasic}', '${owner}', 'restaurant_onue_a', 'draft'),
      ('${display}', '${owner}', 'display_menu_a', 'draft'),
      ('${published}', '${owner}', 'cafe_design_a', 'published'),
      ('${otherBasic}', '${otherOwner}', 'cafe_design_a', 'draft');
  `);
  await applyMigration("20260828040033_add_shared_menu_catalog.sql");
  await applyMigration("20260830072554_add_aube_table_multi_page_fields.sql");
  await applyMigration("20261124120009_group_dining_direct_items_when_importing_to_basic.sql");
  await db.exec(`
    insert into menu_pages (id, menu_site_id, title, sort_order, visible) values
      ('${aLaCarte}', '${dining}', '단품', 0, true),
      ('${drinks}', '${dining}', '드링크', 1, true),
      ('${courseOnly}', '${dining}', '코스만', 2, true),
      ('${hiddenPage}', '${dining}', '숨긴 메뉴', 3, false),
      ('${otherDiningPage}', '${otherDining}', '단품', 0, true);
    insert into menu_categories (id, menu_site_id, menu_page_id, name, sort_order) values
      ('${mixedCourse}', '${dining}', '${aLaCarte}', '시그니처 코스', 4),
      ('${existingCourse}', '${dining}', '${courseOnly}', '점심 코스', 9);
    insert into menu_items (id, menu_site_id, menu_page_id, category_id, name, sort_order, created_at) values
      ('${id(61)}', '${dining}', '${aLaCarte}', null, '파스타', 1, '2026-11-20'),
      ('${id(62)}', '${dining}', '${aLaCarte}', null, '스테이크', 0, '2026-11-21'),
      ('${id(63)}', '${dining}', '${aLaCarte}', null, '샐러드', 1, '2026-11-20'),
      ('${id(64)}', '${dining}', '${aLaCarte}', '${mixedCourse}', '코스 수프', 2, '2026-11-20'),
      ('${id(65)}', '${dining}', '${drinks}', null, '와인', 0, '2026-11-20'),
      ('${id(66)}', '${dining}', '${courseOnly}', '${existingCourse}', '코스 디저트', 3, '2026-11-20'),
      ('${id(67)}', '${dining}', '${hiddenPage}', null, '시즌 메뉴', 0, '2026-11-20'),
      ('${id(68)}', '${otherDining}', '${otherDiningPage}', null, '리조토', 0, '2026-11-20');
    insert into menu_page_translations (menu_page_id, locale, title, status)
      values ('${aLaCarte}', 'en', 'À la carte', 'completed');
    insert into menu_item_price_options (menu_site_id, menu_item_id, label, price, visible, sort_order)
      values ('${dining}', '${id(62)}', '라지', 20000, true, 0);
    set role authenticated;
  `);
  await db.query("select set_config('request.jwt.claim.sub', $1, false)", [owner]);

  const result = await importMenu(dining, basic);
  assert.deepEqual([result.pageCount, result.categoryCount, result.itemCount], [4, 5, 7]);
  const expected = [
    { page: "단품", category: "시그니처 코스", visible: true, category_order: 4, items: ["코스 수프"] },
    { page: "단품", category: "단품", visible: true, category_order: 5, items: ["스테이크", "파스타", "샐러드"] },
    { page: "드링크", category: "드링크", visible: true, category_order: 0, items: ["와인"] },
    { page: "코스만", category: "점심 코스", visible: true, category_order: 9, items: ["코스 디저트"] },
    { page: "숨긴 메뉴", category: "숨긴 메뉴", visible: false, category_order: 0, items: ["시즌 메뉴"] },
  ];
  assert.deepEqual(await categoryItems(basic), expected);
  await importMenu(dining, basic);
  assert.deepEqual(await categoryItems(basic), expected);

  await db.exec(`
    reset role;
    alter table menu_items add constraint qa_fail_one_imported_item
      check (menu_site_id <> '${basic}' or name <> '파스타') not valid;
    set role authenticated;
  `);
  await assert.rejects(importMenu(dining, basic, "linked"), /qa_fail_one_imported_item/);
  assert.deepEqual(await categoryItems(basic), expected);
  const { rows: [linkedCount] } = await db.query(
    "select count(*)::int as count from menu_items where menu_site_id = $1 and catalog_item_id is not null",
    [dining],
  );
  assert.equal(linkedCount.count, 0);
  await db.exec("reset role; alter table menu_items drop constraint qa_fail_one_imported_item; set role authenticated;");

  const { rows: labels } = await db.query(`
    select translation.name from menu_category_translations translation
    join menu_categories category on category.id = translation.category_id
    where category.menu_site_id = $1 and category.name = '단품' and translation.locale = 'en'
  `, [basic]);
  assert.deepEqual(labels, [{ name: "À la carte" }]);
  const { rows: options } = await db.query(`
    select option.label, option.price from menu_item_price_options option
    join menu_items item on item.id = option.menu_item_id
    where item.menu_site_id = $1 and item.name = '스테이크'
  `, [basic]);
  assert.deepEqual(options, [{ label: "라지", price: 20000 }]);

  await importMenu(otherDining, linkedBasic, "linked");
  await db.query("update menu_items set name = '버섯 리조토' where id = $1", [id(68)]);
  assert.deepEqual((await categoryItems(linkedBasic))[0].items, ["버섯 리조토"]);
  const { rows: [sourceItem] } = await db.query(
    "select category_id, menu_page_id from menu_items where id = $1",
    [id(68)],
  );
  assert.deepEqual(sourceItem, { category_id: null, menu_page_id: otherDiningPage });

  const displayResult = await importMenu(dining, display);
  assert.equal(displayResult.categoryCount, 2);
  assert.deepEqual((await categoryItems(display)).map(row => row.category), ["시그니처 코스", "점심 코스"]);
  await assert.rejects(importMenu(dining, otherBasic), /owner access required/);
  await assert.rejects(importMenu(dining, published), /target menu site must be draft/);
  await db.exec("reset role; set role anon;");
  await assert.rejects(importMenu(dining, basic), /permission denied/);
  console.log("PASS: Dining-to-Basic direct items, mixed pages, item order, translations, repeat imports, rollback, linked edits, and existing import guards");
} finally {
  await db.close();
}
