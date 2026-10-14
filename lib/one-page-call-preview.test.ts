import assert from "node:assert/strict";
import test from "node:test";
import { buildOnePageCallPreviewConfig } from "./one-page-call-preview";
import { ONE_PAGE_PROPORTION_TEMPLATE_KEYS } from "./one-page-proportion-policy";
import { buildTemplatePreviewUrl, buildMenuPreviewUrl } from "./menu-preview-devices";

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
  assert.match(buildTemplatePreviewUrl("cafe_kohi_a", query, { device: "tablet", orientation: "portrait", actual: true, embedded: true }), /callPreview=on.*device=tablet.*orientation=portrait.*view=actual.*embedded=1/);
  assert.doesNotMatch(buildTemplatePreviewUrl("cafe_kohi_a", query, { device: "mobile", callPreview: false }), /callPreview/);
  assert.match(buildMenuPreviewUrl("menu", query, { device: "pc" }), /callPreview=on/);
  assert.doesNotMatch(buildMenuPreviewUrl("menu", query, { device: "pc", callPreview: false }), /callPreview/);
});
