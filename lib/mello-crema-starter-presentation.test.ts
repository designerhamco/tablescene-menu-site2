import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { createStarterMenuData, getStarterPreset } from "./menu-starter-presets";
import { buildStarterPreviewData } from "./template-starter-preview";
import { applyStarterPreviewLocalization } from "./template-demo-data/starter-preview-localization";
import { applyPreviewDesign, previewDesignDefaults } from "./menu-preview-design";
import { StarterClient } from "./test-support/starter-provisioning-client";
import { getTemplateByKey } from "./templates";
import { getCustomTypographySettings, mergeTypographySettings } from "./template-typography-presets";

const key = "cafe_sunday_line_a";

test("Mello Crema native defaults and preview controls resolve the same Alata and blue palette", () => {
  const preview = buildStarterPreviewData(key);
  const defaults = previewDesignDefaults(preview);
  assert.equal(getTemplateByKey(key).name, "멜로크레마");
  assert.equal(preview.menuSite.restaurant_name, "mello crema");
  assert.equal(defaults.fontFamily.en, "alata");
  assert.equal(defaults.textColorDefaults.brand, "#2237A0");
  assert.equal(defaults.textColorDefaults.category, "#2237A0");
  assert.equal(defaults.chipColors.generalBackground, "#2237A0");
  assert.equal(defaults.chipColors.saleBackground, "#F76A03");
  assert.ok(preview.timeSales.every(sale => sale.badgeBackgroundColor === "#F76A03"));
  const customized = applyPreviewDesign(preview, { fontFamily: { en: "belleza" }, textColors: { brand: "#123456", category: "#654321" }, textColorGroupsVersion: 2 }, false);
  assert.equal(previewDesignDefaults(customized).fontFamily.en, "belleza");
  assert.equal(previewDesignDefaults(customized).textColors.brand, "#123456");
  assert.equal(previewDesignDefaults(customized).textColors.category, "#654321");
  assert.equal(previewDesignDefaults(preview).fontFamily.en, "alata", "editing a preview does not mutate its native defaults");
});

test("the two supplied photos keep their linked products through every preview locale", () => {
  const preview = buildStarterPreviewData(key);
  const expectedNames = {
    ko: ["멜로우 크림 라떼", "브라운 슈가 크림 라떼"],
    en: ["Mello Cream Latte", "Brown Sugar Cream Latte"],
    zh: ["Mello 奶油拿铁", "黑糖奶油拿铁"],
    ja: ["メロウクリームラテ", "ブラウンシュガークリームラテ"],
  };
  const urls = ["/menu-templates/cafe_sunday_line_a/mello-crema-cream-latte.png", "/menu-templates/cafe_sunday_line_a/mello-crema-brown-sugar-latte.png"];
  assert.deepEqual(preview.featuredSlides?.map(slide => slide.imageUrl), urls);
  for (const url of urls) assert.ok(existsSync(new URL(`../public${url}`, import.meta.url)));
  for (const locale of ["ko", "en", "zh", "ja"] as const) {
    const localized = applyStarterPreviewLocalization(preview, locale);
    assert.deepEqual(localized.featuredSlides?.map(slide => localized.items.find(item => item.id === slide.featuredItemId)?.name), expectedNames[locale]);
    const visibleCopy = JSON.stringify({site: localized.menuSite, items: localized.items, categories: localized.categories});
    assert.doesNotMatch(visibleCopy, /SUNDAY ROASTERS|SUNDAY CREAM LATTE|선데이 크림 라떼|sunday\.roasters|SUNDAY_GUEST/);
    assert.equal(localized.menuSite.restaurant_name, "mello crema");
  }
});

test("new purchases receive the same photos and Alata without replacing merchant identity", async () => {
  const preview = buildStarterPreviewData(key);
  const starter = getStarterPreset(key);
  const client = new StarterClient();
  client.site = { ...client.site, template_key: key, settings: {} };
  await createStarterMenuData(client as never, "merchant-menu", key, null, null, "business_basic_single_monthly");
  const savedTypography = mergeTypographySettings(key, getCustomTypographySettings(client.site.settings, client.site.page_settings));
  assert.equal(savedTypography.english_font_key, "alata");
  assert.equal(client.site.cover_image_url, preview.menuSite.cover_image_url);
  assert.equal(client.site.restaurant_name, "고객 매장");
  const savedItems = client.rows.get("menu_items") ?? [];
  assert.ok(savedItems.some(item => item.name === "멜로우 크림 라떼" && item.set_name === "MELLO CREAM LATTE"));
  const settings = client.site.page_settings as { featured_slides: {image_url: string; featured_item_id: string}[] };
  assert.deepEqual(settings.featured_slides.map(slide => ({url:slide.image_url, name:savedItems.find(item => item.id === slide.featured_item_id)?.name})), starter.featured_slides?.map(slide => ({url:slide.image_url, name:slide.featured_item_name})));
});
