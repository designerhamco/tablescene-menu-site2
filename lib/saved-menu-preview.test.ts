import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import MenuPreviewDeviceFrame from "../components/menu/MenuPreviewDeviceFrame";
import { buildSavedMenuPreview } from "./saved-menu-preview";
import { buildMenuPreviewUrl } from "./menu-preview-devices";
import { serializePreviewDesign } from "./menu-preview-design";
import { getDefaultPageSettings } from "../types/menu";
import { getTemplatePreviewOptionGroups } from "./template-preview-options";
import type { MenuPageData } from "./menu-page-data";

function fixture(): MenuPageData {
  return {
    locale: "ko", initialNowMs: Date.UTC(2026, 9, 22),
    menuSite: { id: "saved-menu", template_key: "cafe_design_a", restaurant_name: "고객 가게", name: "고객 메뉴판", logo_url: "/saved-logo.svg", page_settings: { design: { backgroundColor: "#FFFFFF" } }, settings: { menu_design_id: "basic-first-column", logo_replaces_name: true, advertisementPopup: { enabled: true, images: [{ imageUrl: "/saved-ad.svg", imagePath: "saved/ad" }] } } },
    pageSettings: { ...getDefaultPageSettings(), menu_cover_enabled: true, featured_item_enabled: true, featured_item_id: "one" },
    pages: [{ id: "page", title: "고객 페이지", visible: true, sort_order: 0 }],
    categories: [{ id: "category", name: "고객 카테고리", description: "고객 설명", description_visible: true, priceColumns: [{ id: "hot", categoryId: "category", key: "hot", label: "HOT", visible: true, sortOrder: 0 }] }],
    items: ["one", "two"].map(id => ({ id, name: `고객 상품 ${id}`, category_id: "category", set_name: "CUSTOMER ITEM", description: "고객 상품 설명", price: 7654, priceNote: "ICE ONLY", image_url: "/saved-item.svg", visible: true, is_sold_out: id === "two", badge_label: "고객 칩", badge: "고객 칩", priceColumnValues: [{ id: `${id}-hot`, priceColumnId: "hot", price: 8765, visible: true }] })),
    featuredSlides: [{ id: "featured", imageUrl: "/saved-cover.svg", featuredItemId: "one", sortOrder: 0 }],
    priceOptions: [], traits: [],
    timeSales: [{ id: "sale", name: "고객 할인", items: [{ id: "sale-item", menuItemId: "one", priceColumnId: "hot", salePrice: 6500, visible: true }] }],
    widgets: [{ id: "widget", menuSiteId: "saved-menu", menuPageId: "page", visible: true, sortOrder: 0, type: "image", imageUrl: "/saved-widget.svg", settings: { schemaVersion: 1, aspectRatio: "3:1", objectFit: "contain", objectPosition: "bottom-right", placement: "bottom" } }],
  } as unknown as MenuPageData;
}

test("initial saved previews keep exact customer content, popup and widget visibility", () => {
  const source = fixture(), before = structuredClone(source);
  const preview = buildSavedMenuPreview(source, {});
  assert.equal(preview.data, source);
  assert.deepEqual(source, before);
  assert.equal(preview.design?.id, "basic-first-column");
  assert.equal(preview.options.widgetsPreview, true, "saved customer widgets override catalog defaults");
  assert.equal(preview.options.popupPreview, true);
  source.menuSite.template_key = "cafe_mocha_forest_a";
  source.widgets![0].visible = false;
  assert.equal(buildSavedMenuPreview(source, {}).options.widgetsPreview, false);
});

test("visibility changes are temporary, preserve prices/identity, and restore from saved content", () => {
  const source = fixture(), before = structuredClone(source);
  const query = Object.fromEntries(getTemplatePreviewOptionGroups("cafe_design_a").flatMap(group => group.choices).map(([key]) => [key, "off"]));
  const preview = buildSavedMenuPreview(source, query);
  assert.deepEqual(source, before);
  assert.deepEqual(preview.data.items.map(item => [item.id, item.name, item.price]), source.items.map(item => [item.id, item.name, item.price]));
  assert.ok(preview.data.items.every(item => !item.image_url && !item.description && !item.set_name && !item.is_sold_out));
  assert.equal(preview.data.widgets?.length, 0);
  assert.equal(preview.data.timeSales.length, 0);
  assert.equal(preview.data.pageSettings.menu_cover_enabled, false);
  assert.equal(preview.data.pageSettings.featured_item_enabled, false);
  assert.equal((preview.data.menuSite.settings as Record<string, unknown>).menu_design_id, "basic-first-column");
  const restored = buildSavedMenuPreview(source, Object.fromEntries(Object.keys(query).map(key => [key, "on"])));
  assert.deepEqual(restored.data.items, source.items);
  assert.deepEqual(restored.data.widgets, source.widgets);
  assert.deepEqual(restored.data.featuredSlides, source.featuredSlides);
});

test("saved feature opt-ins never fabricate catalog prices, products, images, ads or translations", () => {
  const source = fixture();
  source.menuSite.logo_url = null; source.menuSite.settings = {}; source.widgets = []; source.timeSales = [];
  source.categories[0].priceColumns = []; source.categories[0].description = null;
  source.items.forEach(item => { item.image_url = null; item.description = null; item.set_name = null; item.priceColumnValues = []; item.is_sold_out = false; });
  const data = buildSavedMenuPreview(source, { imagesPreview: "on", logoPreview: "on", widgetsPreview: "on", popupPreview: "on", priceOptionsPreview: "on", timeSalesPreview: "on", soldOutPreview: "on", secondaryNamesPreview: "on", descriptionsPreview: "on", categoryDescriptionsPreview: "on" }).data;
  assert.deepEqual(data.items, source.items);
  assert.equal(data.menuSite.logo_url, null);
  assert.equal(data.widgets?.length, 0); assert.equal(data.timeSales.length, 0); assert.equal(data.priceOptions.length, 0);
  assert.equal(data.categories[0].priceColumns.length, 0); assert.equal(data.categories[0].description, null);
  assert.deepEqual((data.menuSite.settings as {advertisementPopup:{images:unknown[]}}).advertisementPopup.images, []);
});

test("ordinary chips and price-column visibility keep independent sold-out and sale state", () => {
  const source = fixture();
  const data = buildSavedMenuPreview(source, { badgesPreview: "off", priceOptionsPreview: "off" }).data;
  assert.equal(data.items[1].is_sold_out, true);
  assert.equal(data.timeSales[0].items[0].salePrice, 6500);
  assert.equal(data.timeSales[0].items[0].priceColumnId, null);
  assert.equal(source.timeSales[0].items[0].priceColumnId, "hot");
});

test("saved design overrides remain in memory and URL design parameters cannot switch customer designs", () => {
  const source = fixture(), before = structuredClone(source);
  const preview = buildSavedMenuPreview(source, { design: "dining-sidebar", designPreview: serializePreviewDesign({ pageBackground: "#123456", albumImageRatio: "4:5", imageRadii: { item: 12 } }) });
  assert.equal(preview.design?.id, "basic-first-column");
  assert.deepEqual(source, before); assert.deepEqual(preview.data.items, source.items);
  assert.equal((preview.data.menuSite.page_settings as {design:{backgroundColor:string}}).design.backgroundColor, "#123456");
  source.menuSite.settings = { menu_design_id: "basic-first-column-album" };
  assert.equal(buildSavedMenuPreview(source, {}).design?.itemLayout, "album");
});

test("saved-menu panel uses the common tools while every device and detached link stays private", () => {
  const source = fixture();
  const designPreview = serializePreviewDesign({ pageBackground: "#123456" });
  const query = { imagesPreview: "off", previewOptions: "design", designPreview };
  const preview = buildSavedMenuPreview(source, query);
  const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: { push() {}, replace() {} } as never }, createElement(MenuPreviewDeviceFrame, {
    menuId: "saved-menu", menuTemplateKey: "cafe_design_a", menuDesignId: "basic-first-column", device: "tablet", orientation: "landscape", query,
    previewDisplayOptions: preview.options, previewDesignDefaults: preview.designDefaults,
  })));
  assert.match(html, /보기 옵션/); assert.match(html, /디자인 옵션/); assert.match(html, /기능 옵션/);
  assert.doesNotMatch(html, /\/templates\//);
  assert.match(html, /imagesPreview=off/); assert.match(html, /designPreview=/); assert.match(html, /view=actual&amp;embedded=1/);
  for (const device of ["pc", "tablet", "mobile"] as const) {
    const url = new URL(buildMenuPreviewUrl("saved-menu", query, { device, actual: true, embedded: true }), "https://example.test");
    assert.equal(url.pathname, "/mypage/menus/saved-menu/preview");
    assert.equal(url.searchParams.get("imagesPreview"), "off"); assert.equal(url.searchParams.get("designPreview"), designPreview);
    assert.equal(url.searchParams.get("previewOptions"), null);
    assert.equal(url.searchParams.get("design"), null);
  }
});


test("saved Basic logo checkbox follows the explicit replacement setting while Dining uses its registered cover logo", () => {
  const source = fixture();
  for (const settings of [{}, {logo_replaces_name: false}]) {
    source.menuSite.settings = settings;
    assert.equal(buildSavedMenuPreview(source, {}).options.logoPreview, false);
  }
  source.menuSite.settings = {logo_replaces_name: true};
  assert.equal(buildSavedMenuPreview(source, {}).options.logoPreview, true);
  source.menuSite.settings = {};
  source.menuSite.template_key = "dining_aube_table_a";
  assert.equal(buildSavedMenuPreview(source, {}).options.logoPreview, true);
});
