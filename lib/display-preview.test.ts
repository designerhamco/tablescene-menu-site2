import assert from "node:assert/strict";
import test from "node:test";
import { getDisplayPreviewPageNumber } from "./display-preview";
import { buildStarterPreviewData } from "./template-starter-preview";
import { applyTemplatePreviewOptions } from "./template-preview-data";
import { applyPreviewDesign } from "./menu-preview-design";
import { buildTemplatePreviewUrl } from "./menu-preview-devices";
import { getCustomTypographySettings, mergeTypographySettings } from "./template-typography-presets";

test("display page selection rejects missing, fractional and out-of-range pages", () => {
  for (const value of [undefined, "", "0", "-1", "5", "1.5", "wrong", Infinity]) assert.equal(getDisplayPreviewPageNumber(value, 4), 1);
  assert.equal(getDisplayPreviewPageNumber(["3", "2"], 4), 3);
  assert.equal(getDisplayPreviewPageNumber("1", 0), 0);
});

test("display preview choices preserve pages, media and source while hiding only selected sample features", () => {
  const source = buildStarterPreviewData("display_menu_a"), before = structuredClone(source);
  assert.equal(applyTemplatePreviewOptions(source, {}), source);
  const result = applyTemplatePreviewOptions(source, { secondaryNamesPreview: "off", badgesPreview: "off", priceOptionsPreview: "off", timeSalesPreview: "off", soldOutPreview: "off", widgetsPreview: "on", descriptionsPreview: "on" });
  assert.deepEqual(source, before);
  assert.deepEqual(result.pages, before.pages);
  assert.deepEqual(result.items.map(item => [item.id, item.name, item.price, item.description, item.image_url]), before.items.map(item => [item.id, item.name, item.price, item.description, item.image_url]));
  assert.ok(result.items.every(item => !item.set_name && !item.badge && !item.badge_label && !item.is_sold_out && !item.priceColumnValues.length));
  assert.equal(result.timeSales.length, 0);
  assert.ok(result.categories.every(category => !category.priceColumns.length));
  assert.deepEqual(result.widgets, before.widgets);
  const restored = applyTemplatePreviewOptions(source, { soldOutPreview: "on" });
  assert.ok(restored.items.some(item => item.is_sold_out));
});

test("display font previews use saved font settings without changing palette, layout or source", () => {
  const source = buildStarterPreviewData("display_menu_a"), before = structuredClone(source);
  const result = applyPreviewDesign(source, { fontFamily: { ko: "noto-serif-kr", en: "tenor-sans" }, pageBackground: "#123456", representativeAlignment: "right", imageRadii: { item: 16 } }, false);
  const typography = mergeTypographySettings("display_menu_a", getCustomTypographySettings(result.menuSite.settings, result.menuSite.page_settings));
  assert.equal(typography.korean_font_key, "noto-serif-kr");
  assert.equal(typography.english_font_key, "tenor-sans");
  assert.deepEqual(source, before);
  assert.deepEqual(result.pages, before.pages);
  const design = (result.menuSite.page_settings as { design: Record<string, unknown> }).design;
  assert.equal(design.backgroundColor, undefined);
  assert.equal(design.representativeAlignment, undefined);
  assert.deepEqual(design.appearance, (before.menuSite.page_settings as { design: Record<string, unknown> }).design.appearance);
});

test("display actual-view links retain page, locale, sample choices, fonts and image position", () => {
  const query = { page: "2", lang: "ja", priceOptionsPreview: "off", fontSizeScale: "l", displayImagePosition: "right", designPreview: '{"fontFamily":{"ko":"noto-serif-kr"}}' };
  const url = new URL(buildTemplatePreviewUrl("display_menu_a", query, { actual: true, detached: true }), "https://example.test");
  for (const [key, value] of Object.entries(query)) assert.equal(url.searchParams.get(key), value);
  assert.equal(url.searchParams.get("view"), "actual");
  assert.equal(url.searchParams.get("detached"), "1");
});
