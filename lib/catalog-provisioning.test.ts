import assert from "node:assert/strict";
import test from "node:test";
import { existsSync } from "node:fs";
import { catalogDesigns } from "./catalog-designs";
import { getMenuPlanSelection } from "./menu-plan-contract";
import { createStarterMenuData, getStarterPreset } from "./menu-starter-presets";
import { getMenuDesignDisplayName, getSavedMenuDesign } from "./menu-design-identity";
import { parseMenuWidgetRows, type MenuWidgetRow } from "./menu-widget-db-mappers";
import { buildDisplayMenuAPreviewData } from "./template-demo-data/display-menu-a";
import { StarterClient } from "./test-support/starter-provisioning-client";

for (const design of catalogDesigns) {
  const product = design.service === "basic" ? "business_basic_single_monthly" : design.service === "dining" ? "business_basic_multi_monthly" : "business_display_monthly";
  test(`${design.id}: catalog purchase identity, complete generation and recovery`, async () => {
    const client = new StarterClient();
    client.site = {...client.site, id: "merchant-menu", template_key: design.templateKey, settings: {menu_design_id: design.id, table_order: {orderEnabled: true}}};
    const preset = getStarterPreset(design.templateKey, null, null, design.id);
    const result = await createStarterMenuData(client as never, "merchant-menu", design.templateKey, null, null, product, {designId: design.id});
    assert.equal(result.created, true);
    assert.equal(client.site.restaurant_name, "고객 매장");
    assert.equal(client.site.restaurant_address, "고객 주소");
    assert.equal(client.site.restaurant_phone, "고객 전화");
    assert.equal(getSavedMenuDesign(design.templateKey, client.site.settings)?.id, design.id);
    if (design.service === "display") {
      const display = buildDisplayMenuAPreviewData();
      assert.deepEqual((client.rows.get("menu_items") ?? []).map(item => item.name), display.items.map(item => item.name));
      assert.equal(client.rows.get("menu_pages")?.length, display.pages.length);
      return;
    }
    assert.equal(client.site.brand_description, preset.site.brand_description, "store introduction must match the chosen starter");
    if (design.kind === "standard") {
      const visibleCopy = preset.pages.map(page => ({title:page.title,description:page.description,categories:page.categories.map(category=>({name:category.name,description:category.description,courseDescription:category.course_price_description,items:category.items.map(item=>({name:item.name,description:item.description}))}))}));
      assert.doesNotMatch(JSON.stringify(visibleCopy), /오브 테이블|메종 마레|Aube Table|Maison Marais|REAL MATCHA|리얼 맛차/i, "neutral starter copy cannot restore a designer's store identity");
    }

    const expectedItems = preset.pages.flatMap(page => [...page.categories.flatMap(c => c.items), ...page.direct_items ?? []]);
    const items = client.rows.get("menu_items") ?? [];
    assert.deepEqual(items.map(item => item.name), expectedItems.map(item => item.name));
    assert.equal(client.rows.get("menu_pages")?.length, preset.pages.length);
    const widgets = client.rows.get("menu_widgets") ?? [];
    assert.equal(widgets.length, preset.widgets?.length ?? 0, "registered starter widgets must be saved too");
    assert.ok(widgets.every(widget => (client.rows.get("menu_pages") ?? []).some(page => page.id === widget.menu_page_id)));
    assert.equal(widgets.filter(widget => widget.visible).length, design.id === "cafe_mocha_forest_a" ? widgets.length : 0);
    const parsedWidgets = parseMenuWidgetRows(widgets as MenuWidgetRow[]);
    assert.deepEqual(parsedWidgets.issues, []);
    assert.equal(parsedWidgets.widgets.length, widgets.length);
    for (const [index, widget] of widgets.entries()) {
      assert.equal(widget.widget_type, preset.widgets?.[index].type);
      assert.deepEqual(widget.settings, {schemaVersion: 1, ...preset.widgets?.[index].settings});
    }

    assert.ok(items.every(item => (client.rows.get("menu_categories") ?? []).some(c => c.id === item.category_id) || item.category_id === null));
    const page = client.site.page_settings as {featured_slides?: {image_url?: string; featured_item_id?: string}[]};
    const expectedCover = preset.featured_slides?.find(slide => slide.image_url)?.image_url ?? preset.site.cover_image_url;
    assert.equal(client.site.cover_image_url, expectedCover);
    for (const slide of page.featured_slides ?? []) {
      assert.ok(!slide.featured_item_id || items.some(item => item.id === slide.featured_item_id));
      if (slide.image_url?.startsWith("/")) assert.ok(existsSync(`public${slide.image_url}`), slide.image_url);
    }
    assert.ok((client.rows.get("menu_site_translations") ?? []).every(row => row.restaurant_name == null), "language switching must retain the merchant's entered store name");
    assert.deepEqual(getMenuPlanSelection(product, design.id, design.templateKey)?.access, design.kind === "standard" ? "standard" : "all");
    const start = new URL(design.startHref, "https://menu.test");
    assert.equal(start.searchParams.get("design"), design.id);
    assert.equal(start.searchParams.get("template"), design.templateKey);
    assert.ok(getMenuDesignDisplayName(design.templateKey, null, client.site.settings).includes(design.kind === "standard" ? "기본 디자인" : design.name));
    assert.ok(existsSync(`public${design.image}`), design.image);
    const original = structuredClone({site:client.site, rows:[...client.rows]});
    assert.equal((await createStarterMenuData(client as never, "merchant-menu", design.templateKey, null, null, product, {designId: design.id})).created, false);
    assert.deepEqual({site:client.site,rows:[...client.rows]},original);
  });
}

test("new starter never replaces a merchant's existing introduction", async () => {
  for (const design of catalogDesigns.filter(design => design.service !== "display")) {
    const client = new StarterClient();
    client.site.brand_description = "직접 입력한 매장 설명";
    client.site.settings = {menu_design_id: design.id};
    await createStarterMenuData(client as never, "merchant-menu", design.templateKey, null, null, design.service === "basic" ? "business_basic_single_monthly" : "business_basic_multi_monthly", {designId: design.id});
    assert.equal(client.site.brand_description, "직접 입력한 매장 설명");
  }
});
