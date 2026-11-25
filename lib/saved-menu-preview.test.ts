import assert from "node:assert/strict";
import test from "node:test";
import { createElement, type ComponentProps } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { AppRouterContext } from "next/dist/shared/lib/app-router-context.shared-runtime";
import MenuPreviewDeviceFrame from "../components/menu/MenuPreviewDeviceFrame";
import PreviewDesignOptions from "../components/menu/PreviewDesignOptions";
import PreviewDecorationOptions from "../components/menu/PreviewDecorationOptions";
import MenuPreviewOptionsPanel from "../components/menu/MenuPreviewOptionsPanel";
import MenuAppearanceScope from "../components/menu-templates/shared/MenuAppearanceScope";
import { getDefaultDesignOptions } from "./default-design-options";
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
  assert.doesNotMatch(html, /data-preview-options-panel|기능 초기화|기능 옵션|디자인 옵션|data-preview-call-toggle|data-preview-order-toggle|data-preview-layout-mode/);
  assert.doesNotMatch(html, /imagesPreview=|designPreview=|callPreview=|orderPreview=|layoutMode=|previewOptions=|\/templates\//);
  assert.doesNotMatch(html, /data-preview-edit-link|수정하기/);
  assert.match(html, /data-preview-tablet-orientation-toggle/);
  assert.match(html, /orientation=portrait/);
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

test("catalog previews keep controls without reintroducing deleted introductory prose", () => {
  const html=renderToStaticMarkup(createElement(AppRouterContext.Provider,{value:{push(){}} as never},createElement(MenuPreviewDeviceFrame,{templateKey:"cafe_design_a",device:"pc",orientation:"landscape",query:{},previewDesignDefaults:previewDesignDefaults(fixture())})));
  assert.match(html,/data-preview-options-panel/);
  assert.match(html,/기능 옵션/);assert.match(html,/디자인 옵션/);assert.match(html,/기능 초기화/);
  assert.doesNotMatch(html,/data-preview-experience-note|체험해 보세요|미리보기에만 적용|저장되지 않습니다/);
  assert.match(html,/data-preview-call-toggle/);assert.match(html,/data-preview-order-toggle/);
});


test("preview design conditions stay in shared help instead of permanent paragraphs", () => {
  const html=renderToStaticMarkup(createElement(PreviewDesignOptions,{value:{},defaults:previewDesignDefaults(fixture()),templateKey:"cafe_design_a",album:false,dining:false,disabled:false,alignmentDisabled:true,onChange(){}}));
  assert.doesNotMatch(html,/<p[ >]|배경색은 할인 안내|템플릿에 정해진 정렬/);
  assert.match(html,/aria-label="기간할인 색상 적용 범위"/);
  assert.match(html,/aria-label="정렬 변경 제한"/);
  assert.match(html,/디자인 초기화/);
  assert.match(html,/aria-label="가게명·가게 설명 정렬"[^>]*disabled/);
});

test("Basic editor viewing options keep design and decoration tabs without catalog feature controls", () => {
  const html = renderToStaticMarkup(createElement(MenuPreviewOptionsPanel, {
    open: true, onToggle() {}, tab: "decorations", onTabChange() {}, groups: [],
    values: getDefaultDesignOptions({}), onFeatureChange() {}, onFeatureReset() {}, canResetFeatures: false,
    pending: false, templateKey: "cafe_design_a", defaults: previewDesignDefaults(fixture()),
    design: { decorations: { categoryUnderline: { visible: true }, columnDivider: { visible: true } } }, onDesignChange() {}, album: false, device: "pc", designOnly: true,
  }));
  assert.match(html, /디자인 옵션/); assert.match(html, /장식 기능/);
  assert.match(html, /카테고리명 아래 선 두께/); assert.match(html, /열 사이 구분선 스타일/);
  assert.match(html, /type="checkbox" aria-label="카테고리명 아래 선 표시" checked/);
  assert.match(html, /카테고리명 아래 선 색상 선택/); assert.match(html, /카테고리명 아래 선 색상 기본색 복원/);
  assert.doesNotMatch(html, /메뉴 아이템 사이 구분선 두께|색상 방식/);
  assert.doesNotMatch(html, /기능 옵션|기능 초기화|data-preview-call-toggle|data-preview-order-toggle|data-preview-layout-mode/);
});

test("untouched neutral decoration options show unchecked choices and an empty design area", () => {
  const html = renderToStaticMarkup(createElement(MenuPreviewOptionsPanel, {
    open: true, onToggle() {}, tab: "decorations", onTabChange() {}, groups: [],
    values: getDefaultDesignOptions({}), onFeatureChange() {}, onFeatureReset() {}, canResetFeatures: false,
    pending: false, templateKey: "cafe_design_a", defaults: previewDesignDefaults(fixture()),
    design: {}, onDesignChange() {}, album: false, device: "pc", designOnly: true,
  }));
  assert.equal((html.match(/type="checkbox"/g) ?? []).length, 6);
  assert.doesNotMatch(html, /type="checkbox"[^>]*checked|data-preview-decoration="/);
  assert.match(html, /선 장식을 선택하면 디자인 설정이 표시됩니다/);
});

test("decoration selects show actual native values without an inheritance option or an implicit save", () => {
  const design = {}, defaults = previewDesignDefaults(fixture());
  defaults.decorationVisibilityDefaults = { ...defaults.decorationVisibilityDefaults!, categoryUnderline: true };
  let writes = 0;
  const before = structuredClone(design);
  const html = renderToStaticMarkup(createElement(PreviewDecorationOptions, {
    value: design, defaults, renderedDesign: { nativeTextColors: {}, alignment: { value: "left" }, radius: { value: "square" }, decorationStrokes: { categoryUnderline: { width: 1.6, style: "solid" } } },
    album: false, device: "pc", disabled: false, savedFallback: false, onChange() { writes++; },
  }));
  assert.doesNotMatch(html, /템플릿 기본|value="template"/);
  assert.match(html, /value="1.6"[^>]*selected/);
  assert.match(html, /value="solid"[^>]*selected/);
  assert.equal(writes, 0);
  assert.deepEqual(design, before);
});

test("Basic album decoration options omit column, item and price-leader controls", () => {
  const html = renderToStaticMarkup(createElement(MenuPreviewOptionsPanel, {
    open: true, onToggle() {}, tab: "decorations", onTabChange() {}, groups: [],
    values: getDefaultDesignOptions({}), onFeatureChange() {}, onFeatureReset() {}, canResetFeatures: false,
    pending: false, templateKey: "cafe_design_a", defaults: previewDesignDefaults(fixture()),
    design: {}, onDesignChange() {}, album: true, device: "mobile", designOnly: true,
  }));
  assert.match(html, /카테고리명 아래 선 표시/);
  assert.match(html, /카테고리 사이 구분선 표시/);
  assert.doesNotMatch(html, /열 사이 구분선 표시|메뉴 아이템 사이 구분선 표시|메뉴명–가격 연결선 표시/);
});

test("common decoration scope leaves multi-page and other service renderers untouched", () => {
  const pageSettings = { design: { decorations: { categoryUnderline: { visible: true, color: "#123456" } } } };
  for (const props of [{ templateKey: "cafe_design_a", pagePresentation: "multi" as const }, { templateKey: "dining_aube_table_a" }, { templateKey: "display_menu_a" }]) {
    const html = renderToStaticMarkup(createElement(MenuAppearanceScope, { ...props, pageSettings } as ComponentProps<typeof MenuAppearanceScope>, createElement("p", null, "기존 화면")));
    assert.doesNotMatch(html, /data-decoration-underline|--decoration-underline/);
  }
});

test("Basic editor links keep the draft in its own preview mode", () => {
  const draft = serializePreviewDesign({ pageBackground: "#123456" });
  const url = new URL(buildMenuPreviewUrl("saved-menu", { lang: "en" }, {
    device: "tablet", orientation: "portrait", actual: true, embedded: true,
    designEditor: true, designReset: true, designPreview: draft,
  }), "https://example.test");
  assert.equal(url.searchParams.get("editDesign"), "1");
  assert.equal(url.searchParams.get("designReset"), "1");
  assert.doesNotMatch(buildMenuPreviewUrl("saved-menu", {}, { designReset: true }), /designReset/);
  assert.equal(url.searchParams.get("designPreview"), draft);
  assert.equal(url.searchParams.get("orientation"), "portrait");
  assert.equal(url.searchParams.get("lang"), "en");
});

test("Basic design edits preserve saved content, pattern bands and other appearances", async () => {
  const { applyBasicEditorPreviewDesign } = await import("./basic-editor-preview-design");
  const saved = {
    featured_slides: [{ featured_item_id: "existing" }],
    design: { backgroundColor: "#FFFFFF", appearance: { imageRadii: { logo: 8 } }, patternBands: { enabled: true }, textColors: { category: "#202020" } },
  };
  const settings = { menu_design_id: "basic-first-column" };
  assert.deepEqual(applyBasicEditorPreviewDesign(saved, settings, "cafe_design_a", "{}", false), saved);
  const next = applyBasicEditorPreviewDesign(saved, settings, "cafe_design_a", {
    pageBackground: "#123456", chipColors: { saleText: "#ABCDEF" }, textColors: { product: "#333333" },
    imageRadii: { item: 16 }, albumImageRatio: "4:5",
  }, false);
  const { menuSurfaceRecord } = await import("./menu-design-surfaces");
  const design = menuSurfaceRecord(next.design);
  assert.deepEqual(next.featured_slides, saved.featured_slides);
  assert.deepEqual(design.patternBands, { enabled: true });
  assert.equal(design.backgroundColor, "#123456");
  assert.deepEqual(design.textColors, { category: "#202020", product: "#333333" });
  assert.deepEqual(design.chipColors, { saleText: "#ABCDEF" });
  assert.deepEqual(design.appearance, { imageRadii: { logo: 8, item: 16 }, chipShape: "template", albumImageRatio: "1:1" });
  assert.equal(saved.design.backgroundColor, "#FFFFFF");
});
