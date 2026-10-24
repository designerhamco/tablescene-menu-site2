import assert from "node:assert/strict";
import test from "node:test";
import { buildOnePageCallPreviewConfig } from "./one-page-call-preview";
import { ONE_PAGE_PROPORTION_TEMPLATE_KEYS } from "./one-page-proportion-policy";
import { buildTemplatePreviewUrl, buildMenuPreviewUrl } from "./menu-preview-devices";
import { readFileSync } from "node:fs";

const input = { enabled: true, menuSiteId: "preview-site", storeName: "Preview" };
test("호출 디자인 미리보기는 일곱 원페이지에서만 켜지고 실제 요청을 보내지 않는다", () => {
  for (const templateKey of ONE_PAGE_PROPORTION_TEMPLATE_KEYS) {
    const config = buildOnePageCallPreviewConfig({ ...input, templateKey });
    assert.equal(config?.callEnabled, true);
    assert.equal(config?.previewOnly, true);
    assert.equal(config?.orderEnabled, false);
    assert.equal(config?.tableLabel, "Table 1");
    assert.equal(buildOnePageCallPreviewConfig({ ...input, templateKey, enabled: false }), undefined);
    assert.equal(buildOnePageCallPreviewConfig({ ...input, templateKey, pagePresentation: "multi" }), undefined);
  }
  for (const templateKey of ["display_menu_a", "dining_aube_table_a", "cafe_brew_chapter_a"]) {
    assert.equal(buildOnePageCallPreviewConfig({ ...input, templateKey }), undefined);
  }
});
test("호출 미리보기는 기기·회전·언어·새 창 URL을 따라가며 OFF에서 제거된다", () => {
  const query = { callPreview: "on", lang: "en" };
  assert.match(buildTemplatePreviewUrl("cafe_design_a", query, { device: "tablet", orientation: "portrait", actual: true, embedded: true }), /callPreview=on.*device=tablet.*orientation=portrait.*view=actual.*embedded=1/);
  assert.doesNotMatch(buildTemplatePreviewUrl("cafe_design_a", query, { device: "mobile", callPreview: false }), /callPreview/);
  assert.doesNotMatch(buildMenuPreviewUrl("menu", query, { device: "pc" }), /callPreview/);
  assert.doesNotMatch(buildMenuPreviewUrl("menu", query, { device: "pc", callPreview: false }), /callPreview/);
});
test("모바일 호출 바와 루프 상단 장식은 공통 호출 리듬을 따른다", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\.cafe-a-mobile-call-bar \{[^}]*height: 3\.5rem;[^}]*min-height: 3\.5rem;/);
  assert.match(css, /data-one-page-call-enabled="true"[^}]*\.cafe-a-mobile-language-row \+ \.cafe-a-mobile-header-copy \{[^}]*margin-top: 1rem;/);
  assert.match(css, /data-one-page-call-enabled="true"\]\[data-template-key="fast_food_loop_bagel_a"\] \{[^}]*padding-top: calc\(var\(--loop-bagel-checker-square\) \* 2\);/);
  assert.match(css, /data-one-page-call-enabled="true"\]\[data-template-key="fast_food_loop_bagel_a"\]::before \{[^}]*inset-block-start: 0;/);
});
