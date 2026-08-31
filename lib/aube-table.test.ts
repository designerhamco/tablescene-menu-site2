import test from "node:test";
import assert from "node:assert/strict";

import { getDefaultEnglishFontForTemplate, getDefaultKoreanFontForTemplate } from "./font-options";
import { getStarterPreset } from "./menu-starter-presets";
import {
  AUBE_TABLE_MAX_MENU_PAGES,
  buildAubeTableNavigationUnits,
  normalizeAubeTableCoverBackgroundColor,
  normalizeAubeTableCoverBackgroundOpacity,
  shouldUseAubeTableCoverLogo,
  validateAubeTablePublishStructure,
} from "./aube-table";

test("오브 테이블 페이지네이션은 노출 커버와 노출 페이지만 순서대로 포함한다", () => {
  const units = buildAubeTableNavigationUnits(true, [
    { id: "second", title: "Dessert", visible: true, sort_order: 2 },
    { id: "hidden", title: "Hidden", visible: false, sort_order: 1 },
    { id: "first", title: "Dinner", visible: true, sort_order: 0 },
  ]);

  assert.deepEqual(units.map((unit) => unit.id), ["cover", "page:first", "page:second"]);
});

test("오브 테이블 커버 색상은 6자리 hex만 허용한다", () => {
  assert.equal(normalizeAubeTableCoverBackgroundColor("#abc123"), "#ABC123");
  assert.equal(normalizeAubeTableCoverBackgroundColor("rgba(0,0,0,.5)"), "#171612");
});

test("오브 테이블 커버 배경색 불투명도는 0~100 범위와 75 기본값을 사용한다", () => {
  assert.equal(normalizeAubeTableCoverBackgroundOpacity(0), 0);
  assert.equal(normalizeAubeTableCoverBackgroundOpacity("82"), 82);
  assert.equal(normalizeAubeTableCoverBackgroundOpacity(140), 100);
  assert.equal(normalizeAubeTableCoverBackgroundOpacity(-10), 0);
  assert.equal(normalizeAubeTableCoverBackgroundOpacity("invalid"), 75);
});

test("오브 테이블 커버는 로고가 있으면 매장명보다 우선하고 로드 실패 시 매장명으로 돌아간다", () => {
  assert.equal(shouldUseAubeTableCoverLogo("https://example.com/logo.svg", null), true);
  assert.equal(shouldUseAubeTableCoverLogo("https://example.com/logo.svg", "https://example.com/logo.svg"), false);
  assert.equal(shouldUseAubeTableCoverLogo("", null), false);
  assert.equal(shouldUseAubeTableCoverLogo(null, null), false);
});

test("노출 코스는 노출 메뉴를 한 개 이상 가져야 한다", () => {
  const error = validateAubeTablePublishStructure({
    pages: [{ id: "page", title: "Dinner", visible: true, sort_order: 0 }],
    categories: [{ id: "course", menu_page_id: "page", name: "Signature", visible: true }],
    items: [{ id: "item", menu_page_id: "page", category_id: "course", visible: false }],
  });

  assert.match(error ?? "", /Signature/);
});

test("한 페이지에서 직접 메뉴와 코스 메뉴를 함께 사용할 수 있다", () => {
  const error = validateAubeTablePublishStructure({
    pages: [{ id: "page", title: "Dinner", visible: true, sort_order: 0 }],
    categories: [{ id: "course", menu_page_id: "page", name: "Signature", visible: true }],
    items: [
      { id: "direct", menu_page_id: "page", category_id: null, visible: true },
      { id: "course-item", menu_page_id: "page", category_id: "course", visible: true },
    ],
  });

  assert.equal(error, null);
});

test("오브 테이블은 노출 메뉴 페이지를 최대 열 개까지 허용한다", () => {
  const pages = Array.from({ length: AUBE_TABLE_MAX_MENU_PAGES + 1 }, (_, index) => ({
    id: String(index),
    title: String(index),
    visible: true,
    sort_order: index,
  }));

  assert.match(validateAubeTablePublishStructure({ pages, categories: [], items: [] }) ?? "", /최대 10개/);
});

test("오브 테이블 스타터는 커버와 3개 메뉴 페이지, 코스·단독 메뉴 예시를 제공한다", () => {
  const preset = getStarterPreset("dining_aube_table_a");
  assert.equal(preset.template_key, "dining_aube_table_a");
  assert.equal(preset.pages.length, 3);
  assert.equal(preset.pages[0]?.layout_columns, 1);
  assert.equal(preset.pages[1]?.layout_columns, 2);
  assert.ok(preset.pages.every((page) => page.text_alignment === "center"));
  assert.ok(preset.pages.some((page) => (page.categories ?? []).length > 0));
  assert.ok(preset.pages.some((page) => (page.direct_items ?? []).length > 0));
  assert.equal(preset.site.restaurant_name, "오브 테이블");
  assert.equal(preset.site.menu_cover_title, "THE MENU");
  assert.equal(preset.site.menu_cover_description, "오브 테이블 스페셜 코스 & 셰프 셀렉션");
  assert.equal(preset.site.logo_url, null);
  assert.deepEqual(preset.pages.map((page) => page.title), ["Signature course", "À la carte", "Drink menu"]);
  assert.equal(getDefaultKoreanFontForTemplate("dining_aube_table_a").value, "pretendard");
  assert.equal(getDefaultEnglishFontForTemplate("dining_aube_table_a").value, "tenor-sans");
});
