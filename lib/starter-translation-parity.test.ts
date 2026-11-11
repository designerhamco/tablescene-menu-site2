import assert from "node:assert/strict";
import test from "node:test";
import { ensurePurchasedMenuStarter } from "./server/purchased-menu-provisioning";
import { catalogDesigns } from "./catalog-designs";
import { createStarterMenuData } from "./menu-starter-presets";
import { buildStarterPreviewData } from "./template-starter-preview";
import { applyStarterPreviewLocalization } from "./template-demo-data/starter-preview-localization";
import { getStarterTranslationIds } from "./starter-translation-provisioning";
import { StarterClient } from "./test-support/starter-provisioning-client";
import { getMenuItemBadgeLabel, MENU_BADGE_OPTIONS, PRICE_LIST_BADGE_OPTIONS } from "./menu-badges";
import { getBadgeStyleKey } from "./template-badge-styles";
import { getReadyAubeTableLocales } from "./aube-table-language-readiness";
import { TRANSLATABLE_LOCALES } from "./locales";
import type { TemplateKey } from "./templates";

for (const design of catalogDesigns) test(`${design.id}: purchased translations equal every preview locale`, async () => {
  const client = new StarterClient();
  client.site = { ...client.site, template_key: design.templateKey, settings: { menu_design_id: design.id } };
  // The DB may return inserted rows in a different order.
  client.reverseInsertResults = true;
  const preview = buildStarterPreviewData(design.templateKey as TemplateKey, null, design.id);
  await createStarterMenuData(client as never, "purchased-menu", design.templateKey, null, null,
    design.service === "display" ? "business_display_monthly" : design.service === "dining" ? "business_basic_multi_monthly" : "business_basic_single_monthly", { designId: design.id });
  const rows = (table: string) => client.rows.get(table) ?? [];
  for (const [table, calls] of client.insertCalls) if (table.endsWith("_translations")) assert.equal(calls,1,`${table}: batch all locale copies in one insert`);
  const id = getStarterTranslationIds(preview, { pages: rows("menu_pages"), categories: rows("menu_categories"), items: rows("menu_items"), options: rows("menu_item_price_options"), widgets: rows("menu_widgets"), promotions: rows("menu_promotions") });
  assert.deepEqual((client.site.settings as {enabled_locales: string[]}).enabled_locales,["ko","en","zh","ja"]);
  assert.equal(client.site.restaurant_name,"고객 매장");
  for (const locale of TRANSLATABLE_LOCALES) {
    const translated = applyStarterPreviewLocalization(preview, locale);
    const check = (table: string, foreign: string, sourceId: string, fields: Record<string, unknown>) => {
      const row = rows(table).find(row => row.locale === locale && row[foreign] === id(sourceId));
      assert.ok(row,`${table}/${sourceId}/${locale}`);assert.equal(row.status,"completed");
      for(const [field,expected] of Object.entries(fields)) assert.equal(row[field] ?? null,expected ?? null,`${design.id}/${locale}/${table}/${sourceId}/${field}`);
    };
    assert.equal(rows("menu_site_translations").filter(row=>row.locale===locale&&row.status==="completed").length,1);
    for(const page of translated.pages)check("menu_page_translations","menu_page_id",page.id,{title:page.title,description:page.description});
    for(const category of translated.categories)check("menu_category_translations","category_id",category.id,{name:category.name,description:category.description,course_price_label:category.course_price_label,course_price_description:category.course_price_description});
    for(const item of translated.items){
      check("menu_item_translations","item_id",item.id,{name:item.name,set_name:item.set_name,description:item.description,price_label:item.price_label,price_note:item.priceNote,portion_label:item.portion_label,badge_label:item.badge_label});
      assert.ok(!/[가-힣]/.test(getMenuItemBadgeLabel(item,locale)),`${design.id}/${locale}: Korean chip remains`);
      const original=preview.items.find(candidate=>candidate.id===item.id)!;
      assert.equal(getBadgeStyleKey(item),getBadgeStyleKey(original),"translation never changes chip color role");
    }
    for(const option of translated.priceOptions)check("menu_item_price_option_translations","price_option_id",option.id,{label:option.label,price_label:option.price_label});
    for(const sale of translated.timeSales){if(locale!=="en")assert.notEqual(sale.badgeText,preview.timeSales.find(original=>original.id===sale.id)?.badgeText,`${design.id}/${locale}: sale chip must have target-language copy`);assert.ok(!/[가-힣]/.test(sale.badgeText),`${design.id}/${locale}: Korean sale chip remains`);check("menu_promotion_translations","menu_promotion_id",sale.id,{badge_text:sale.badgeText,time_display_text:sale.displayText});}
    for(const widget of translated.widgets??[])if(widget.type!=="image")check("menu_widget_translations","menu_widget_id",widget.id,{title:widget.title,description:widget.description});
  }
  if(design.service==="dining")assert.deepEqual(getReadyAubeTableLocales({configuredLocales:["ko","en","zh","ja"],coverEnabled:true,site:client.site,pages:rows("menu_pages"),categories:rows("menu_categories"),items:rows("menu_items"),priceOptions:rows("menu_item_price_options"),siteTranslations:rows("menu_site_translations"),pageTranslations:rows("menu_page_translations"),categoryTranslations:rows("menu_category_translations"),itemTranslations:rows("menu_item_translations"),priceOptionTranslations:rows("menu_item_price_option_translations")} as never),["ko","en","zh","ja"]);
});

test("every built-in chip and legacy recommended fallback localizes without translating custom copy",()=>{
  const labels=new Set([...MENU_BADGE_OPTIONS,...PRICE_LIST_BADGE_OPTIONS].map(option=>option.value).filter(value=>value!=="custom"&&value!=="none"));
  for(const locale of TRANSLATABLE_LOCALES)for(const label of [...labels,"베스트","할인","시그니처"]){assert.ok(!/[가-힣]/.test(getMenuItemBadgeLabel({badge_label:label},locale)));}
  assert.equal(getMenuItemBadgeLabel({recommended:true},"en"),"Recommended");
  assert.equal(getMenuItemBadgeLabel({badge_label:"Chef's Pick"},"ja"),"Chef's Pick");
});

test("a failed translation insert rejects starter creation instead of reporting success",async()=>{
  const client=new StarterClient();client.failInsertTable="menu_item_translations";
  await assert.rejects(createStarterMenuData(client as never,"failed-menu","dining_aube_table_a",null,null,"business_basic_multi_monthly"),/번역 생성에 실패/);
});


test("purchase retries reject incomplete translations and preserve complete starter/customer rows",async()=>{
  const client=new StarterClient();
  const input={menuSiteId:"purchased-menu",templateKey:"dining_aube_table_a",productKey:"business_basic_multi_monthly"};
  await ensurePurchasedMenuStarter(client as never,input);
  const snapshot=structuredClone([...client.rows]);
  await ensurePurchasedMenuStarter(client as never,input);
  assert.deepEqual([...client.rows],snapshot,"idempotent retry never re-seeds customer content");
  client.rows.set("menu_item_translations",(client.rows.get("menu_item_translations")??[]).filter(row=>row.locale!=="ja"));
  await assert.rejects(ensurePurchasedMenuStarter(client as never,input),/번역이 일부만 생성/);
});
