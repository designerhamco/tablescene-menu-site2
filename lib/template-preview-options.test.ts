import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import MenuPreviewDeviceFrame from "../components/menu/MenuPreviewDeviceFrame";
import { DEFAULT_DESIGN_REVIEWS } from "./menu-design-policy";
import type { MenuPageData } from "./menu-page-data";
import { getTemplatePreviewOptionGroups, getTemplatePreviewOptions } from "./template-preview-options";
import { applyTemplatePreviewOptions } from "./template-preview-data";
import { getDefaultPageSettings } from "../types/menu";

function fixture(): MenuPageData {
  return {
    menuSite: { id: "preview", template_key: "cafe_design_a", name: "Native brand", restaurant_name: "Native brand", brand_description: "Native description", logo_url: null, cover_image_url: "/native-cover.jpg", brand_color: "#654321", page_settings: { design: { backgroundColor: "#123456" } }, settings: { typography: { korean_font_key: "native-font" }, footer_notice_1: "Native notice" } },
    locale: "ko", initialNowMs: Date.UTC(2026, 9, 20),
    pageSettings: { ...getDefaultPageSettings(), menu_cover_enabled: true, featured_item_enabled: true, featured_item_id: "one" },
    pages: [{ id: "page", sort_order: 0, visible: true }],
    categories: [
      { id: "category", name: "Category", description: "Category description", description_visible: true, priceColumns: [{ id: "hot", key: "hot", categoryId: "category", label: "HOT", sortOrder: 0, visible: true }] },
      { id: "course", name: "Course", course_price: 120000, priceColumns: [] },
    ],
    items: ["one", "two", "course-item"].map((id, index) => ({ id, category_id: index === 2 ? "course" : "category", name: id, set_name: "SECONDARY", description: "Item description", price: 5000, priceNote: "ICE ONLY", image_url: "/native-item.jpg", badge: "BEST", badge_label: "BEST", recommended: true, is_best: true, is_sold_out: index === 1, visible: true, priceColumnValues: [{ id: `${id}-hot`, priceColumnId: "hot", price: 5000, visible: true }] })),
    priceOptions: [{ id: "option", menu_item_id: "one", label: "HOT", price: 5000, visible: true, sort_order: 0 }],
    widgets: [{ id: "widget", visible: true }],
    featuredSlides: [{ id: "cover", imageUrl: "/native-cover.jpg", featuredItemId: "one", sortOrder: 0 }],
    timeSales: [{ id: "sale", items: [{ id: "sale-item", menuItemId: "one", priceColumnId: "hot", salePrice: 4000, visible: true }] }],
    nextTimeSaleStartAt: null,
  } as unknown as MenuPageData;
}

test("unmodified designer previews retain the exact native data and ignore unrelated query values", () => {
  const source = fixture();
  assert.equal(applyTemplatePreviewOptions(source, {}), source);
  assert.equal(applyTemplatePreviewOptions(source, { lang: "en", logoPreview: "invalid" }), source);
  const options = getTemplatePreviewOptions(source, {});
  assert.equal(options.logoPreview, false);
  assert.equal(options.imagesPreview, true);
  assert.equal(options.soldOutPreview, true);
  assert.equal(options.popupPreview, false);
});

test("catalog visibility overrides preserve source, native styles, content identity and course pricing", () => {
  const source = fixture(), before = structuredClone(source);
  const query = Object.fromEntries(getTemplatePreviewOptionGroups("cafe_design_a").flatMap(group => group.choices.map(([key]) => [key, "off"])));
  const data = applyTemplatePreviewOptions(source, query);
  assert.deepEqual(source, before);
  assert.deepEqual(data.items.map(item => [item.id, item.name, item.price]), source.items.map(item => [item.id, item.name, item.price]));
  assert.equal(data.categories[1].course_price, 120000);
  assert.deepEqual((data.menuSite.settings as Record<string, unknown>).typography, (source.menuSite.settings as Record<string, unknown>).typography);
  assert.deepEqual((data.menuSite.page_settings as Record<string, unknown>).design, (source.menuSite.page_settings as Record<string, unknown>).design);
  assert.equal(data.pageSettings.menu_cover_enabled, false);
  assert.equal(data.pageSettings.featured_item_enabled, false);
  assert.ok(data.items.every(item => !item.image_url && !item.set_name && !item.description && !item.badge_label && !item.is_sold_out && !item.priceNote));
  assert.equal(data.priceOptions.length + data.widgets!.length + data.timeSales.length, 0);
  assert.ok(data.categories.every(category => !category.description && !category.priceColumns.length));
});

test("ordinary text chips never switch off sale or sold-out states", () => {
  const source = fixture();
  const data = applyTemplatePreviewOptions(source, { badgesPreview: "off" });
  assert.deepEqual(data.timeSales, source.timeSales);
  assert.equal(data.items[1].is_sold_out, true);
  assert.ok(data.items.every(item => !item.badge_label && !item.recommended && !item.is_best));
});

test("hiding price options retains the independently enabled promotion", () => {
  const data = applyTemplatePreviewOptions(fixture(), { priceOptionsPreview: "off" });
  assert.equal(data.priceOptions.length, 0);
  assert.equal(data.timeSales[0].items[0].priceColumnId, null);
  assert.equal(data.timeSales[0].items[0].salePrice, 4000);
  assert.equal(data.timeSales[0].items[0].menuItemId, "one");
});

test("explicit opt-ins demonstrate missing features without adding images to configured-price courses", () => {
  const source = fixture();
  source.items.forEach(item => { item.image_url = null; item.is_sold_out = false; });
  source.widgets = []; source.timeSales = []; source.priceOptions = [];
  source.categories.forEach(category => { category.priceColumns = []; });
  source.items.forEach(item => { item.priceColumnValues = []; });
  const data = applyTemplatePreviewOptions(source, { imagesPreview: "on", widgetsPreview: "on", logoPreview: "on", popupPreview: "on", soldOutPreview: "on", priceOptionsPreview: "on", timeSalesPreview: "on" });
  assert.ok(data.menuSite.logo_url);
  assert.ok(data.items[0].image_url);
  assert.equal(data.items[2].image_url, null);
  assert.ok(data.items[1].is_sold_out);
  assert.equal(data.widgets?.length, 1);
  assert.equal(data.categories[0].priceColumns.length, 2);
  assert.equal(data.timeSales.length, 1);
  const popup = (data.menuSite.settings as Record<string, unknown>).advertisementPopup as { enabled: boolean; images: unknown[] };
  assert.equal(popup.enabled, true); assert.equal(popup.images.length, 3);
});

test("supported options match each native engine and preserve neutral album exclusions", () => {
  const basic = getTemplatePreviewOptionGroups("cafe_sunday_line_a").flatMap(group => group.choices.map(([key]) => key));
  const dining = getTemplatePreviewOptionGroups("dining_aube_table_a").flatMap(group => group.choices.map(([key]) => key));
  assert.equal(basic.length, 14); assert.ok(basic.includes("widgetsPreview"));
  assert.equal(dining.length, 11); assert.ok(dining.includes("coverImagesPreview"));
  assert.ok(!dining.includes("featuredPreview") && !dining.includes("timeSalesPreview"));
  assert.deepEqual(getTemplatePreviewOptionGroups("display_menu_a"), []);
  for (const design of DEFAULT_DESIGN_REVIEWS.filter(design => design.itemLayout === "album" && design.layout.startsWith("basic-"))) {
    assert.ok(!getTemplatePreviewOptionGroups(design.renderer, design).flatMap(group => group.choices).some(([key]) => key === "priceOptionsPreview"));
  }
});

test("the real catalog toolbar exposes grouped options and preserves selections in device and detached links", () => {
  const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: { push() {} } as never },
    createElement(MenuPreviewDeviceFrame, { templateKey: "cafe_sunday_line_a", device: "tablet", orientation: "landscape", query: { imagesPreview: "off", secondaryNamesPreview: "off" }, previewDisplayOptions: getTemplatePreviewOptions(fixture(), { imagesPreview: "off", secondaryNamesPreview: "off" }) })));
  for (const label of ["보기 옵션", "영역·이미지", "메뉴 정보", "가격·판매 상태", "로고 보기", "품절 보기", "일반 텍스트칩 보기"]) assert.ok(html.includes(label), label);
  assert.match(html, /imagesPreview=off&amp;secondaryNamesPreview=off/);
  assert.match(html, /view=actual&amp;embedded=1/);
  assert.equal((html.match(/aria-label="광고 보기"/g) ?? []).length, 1);
});

test("explicit secondary-name previews use existing translations and OFF also removes alternate-locale copy", () => {
  const source = fixture();
  source.menuSite.id = "template-preview-cafe_mocha_forest_a";
  source.menuSite.template_key = "cafe_mocha_forest_a";
  source.items[0].id = `${source.menuSite.id}-item-0-0-0`;
  source.items[0].name = "포레스트 모카";
  source.items.forEach(item => { item.set_name = null; });
  const enabled = applyTemplatePreviewOptions(source, { secondaryNamesPreview: "on" });
  assert.equal(enabled.items[0].set_name, "FOREST MOCHA");
  enabled.locale = "en";
  enabled.items[0].default_name = "포레스트 모카";
  const disabled = applyTemplatePreviewOptions(enabled, { secondaryNamesPreview: "off" });
  assert.ok(disabled.items.every(item => !item.set_name && !item.default_name));
});


test("ON fills partially missing fields for every eligible item and category", () => {
  const source = fixture();
  source.items[0].image_url = "/original.jpg";
  source.items[1].image_url = null;
  source.items[1].description = null;
  source.categories[0].description = "Original category copy";
  const data = applyTemplatePreviewOptions(source, { imagesPreview: "on", descriptionsPreview: "on", categoryDescriptionsPreview: "on", widgetsPreview: "on" });
  assert.equal(data.items[0].image_url, "/original.jpg");
  assert.ok(data.items[1].image_url && data.items[1].description);
  assert.equal(data.items[2].image_url, source.items[2].image_url, "priced-course media remains registered but is excluded by the course renderer");
  assert.ok(data.categories.every(category => category.description && category.description_visible));
  assert.ok(data.widgets?.every(widget => widget.type === "image_text" && widget.imageUrl && widget.title && widget.description));
  assert.equal(source.items[1].image_url, null, "preview does not rewrite the source");
});

test("an empty representative ON receives a real image slot and optional featured product", () => {
  const source = fixture();
  source.featuredSlides = []; source.menuSite.cover_image_url = null;
  source.pageSettings.menu_cover_enabled = false;
  source.pageSettings.featured_item_id = null;
  const data = applyTemplatePreviewOptions(source, { coverPreview: "on", featuredPreview: "on" });
  assert.ok(data.featuredSlides?.[0].imageUrl);
  assert.equal(data.featuredSlides?.[0].featuredItemId, source.items[0].id);
  assert.equal(data.pageSettings.menu_cover_enabled, true);
  assert.equal(source.menuSite.cover_image_url, null);
});


test("generated sold-out samples do not conceal independently enabled promotions", () => {
  const source = fixture();
  source.items.forEach(item => { item.is_sold_out = false; });
  source.items.push({ ...source.items[0], id: "ordinary-without-sale" });
  source.timeSales[0].items.push({ ...source.timeSales[0].items[0], id: "second-sale-target", menuItemId: "two" });
  const data = applyTemplatePreviewOptions(source, { soldOutPreview: "on", timeSalesPreview: "on" });
  assert.deepEqual(data.items.filter(item => item.is_sold_out).map(item => item.id), ["ordinary-without-sale"]);
  assert.deepEqual(data.timeSales, source.timeSales);
});
