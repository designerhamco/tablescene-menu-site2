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
import { previewDesignDefaults } from "./menu-preview-design";
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

test("saved previews preserve exact customer content, colors, visibility and layout", () => {
  const source = fixture(), before = structuredClone(source);
  const preview = buildSavedMenuPreview(source);
  assert.equal(preview.data, source);
  assert.deepEqual(source, before);
  assert.equal(preview.design?.id, "basic-first-column");
  assert.deepEqual(preview.features, { call: false, order: false });
  source.menuSite.settings = { menu_design_id: "basic-first-column-album" };
  assert.equal(buildSavedMenuPreview(source).design?.itemLayout, "album");
});

test("saved service previews follow explicit registered settings and template capabilities", () => {
  const source = fixture();
  for (const [table_order, expected] of [
    [{callEnabled:true,orderEnabled:true}, {call:true,order:true}],
    [{callEnabled:true,orderEnabled:false}, {call:true,order:false}],
    [{callEnabled:false,orderEnabled:true,postpayEnabled:false}, {call:false,order:false}],
    [{callEnabled:"true",orderEnabled:"true"}, {call:false,order:false}],
  ] as const) {
    source.menuSite.settings = { table_order };
    assert.deepEqual(buildSavedMenuPreview(source).features, expected);
  }
  source.menuSite.settings = { table_order: {callEnabled:true,orderEnabled:true} };
  source.menuSite.template_key = "display_menu_a";
  assert.deepEqual(buildSavedMenuPreview(source).features, {call:false,order:false});
});

test("customer preview removes editing tools and legacy overrides from all device and detached links", () => {
  const query = { lang: "en", page: "2", imagesPreview: "off", previewOptions: "design", callPreview: "on", orderPreview: "on", layoutMode: "orderedFit", designPreview: serializePreviewDesign({ pageBackground: "#123456", chipColors:{generalBackground:"#123456"} }) };
  const html = renderToStaticMarkup(createElement(AppRouterContext.Provider, { value: { push() {}, replace() {} } as never }, createElement(MenuPreviewDeviceFrame, {
    menuId: "saved-menu", menuTemplateKey: "cafe_design_a", menuDesignId: "basic-first-column", device: "tablet", orientation: "portrait", query,
  })));
  assert.doesNotMatch(html, /data-preview-options-panel|기능 옵션|디자인 옵션|data-preview-call-toggle|data-preview-order-toggle|data-preview-layout-mode/);
  assert.doesNotMatch(html, /imagesPreview=|designPreview=|callPreview=|orderPreview=|layoutMode=|previewOptions=|\/templates\//);
  assert.doesNotMatch(html, /data-preview-edit-link|수정하기/);
  assert.doesNotMatch(html, /data-preview-tablet-orientation-toggle/);
  assert.doesNotMatch(html, /data-preview-fullscreen-control/);
  assert.match(html, /view=actual&amp;embedded=1/);
  for (const device of ["pc", "tablet", "mobile"] as const) {
    const url = new URL(buildMenuPreviewUrl("saved-menu", query, { device, actual: true, embedded: true, detached: true, callPreview:true, orderPreview:true, layoutMode:"orderedFit" }), "https://example.test");
    assert.equal(url.pathname, "/mypage/menus/saved-menu/preview");
    assert.equal(url.searchParams.get("lang"), "en");
    assert.equal(url.searchParams.get("page"), "2");
    for (const key of ["imagesPreview","designPreview","callPreview","orderPreview","layoutMode","previewOptions","design"]) assert.equal(url.searchParams.get(key), null);
  }
});

test("customer preview omits the edit link and keeps shared viewing controls", () => {
  const html=renderToStaticMarkup(createElement(AppRouterContext.Provider,{value:{push(){}} as never},createElement(MenuPreviewDeviceFrame,{menuId:"saved-menu",device:"pc",orientation:"landscape",query:{}})));
  assert.doesNotMatch(html,/data-preview-edit-link|수정하기/);
});

test("catalog previews retain feature and design experiments with one shared explanation", () => {
  const html=renderToStaticMarkup(createElement(AppRouterContext.Provider,{value:{push(){}} as never},createElement(MenuPreviewDeviceFrame,{templateKey:"cafe_design_a",device:"pc",orientation:"landscape",query:{},previewDesignDefaults:previewDesignDefaults(fixture())})));
  assert.match(html,/data-preview-options-panel/);
  assert.match(html,/기능 옵션/);assert.match(html,/디자인 옵션/);
  assert.equal((html.match(/data-preview-experience-note/g)??[]).length,1);
  assert.match(html,/보기·디자인 옵션을 바꿔 템플릿을 체험해 보세요./);
  assert.match(html,/변경 내용은 미리보기에만 적용되며 저장되지 않습니다./);
  assert.match(html,/data-preview-call-toggle/);assert.match(html,/data-preview-order-toggle/);
});
