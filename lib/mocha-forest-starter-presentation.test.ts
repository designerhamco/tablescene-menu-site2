import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getStarterPreset } from "./menu-starter-presets";
import { getCustomTypographySettings, mergeTypographySettings } from "./template-typography-presets";

const globalStylesSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const cafeSource = readFileSync(
  new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url),
  "utf8",
);

test("Mocha Forest starter uses Pretendard and Carme", () => {
  const preset = getStarterPreset("cafe_mocha_forest_a");
  const typography = mergeTypographySettings(
    preset.template_key,
    getCustomTypographySettings(preset.site.settings),
  );

  assert.equal(typography.korean_font_key, "pretendard");
  assert.equal(typography.english_font_key, "carme");
});

test("legacy notice face remains available to excluded engines; one-page uses its scoped saved-font rule", () => {
  assert.match(
    globalStylesSource,
    /\.cafe-a-typography :is\([\s\S]*?\.brew-chapter-cover-notices[\s\S]*?--cafe-a-script-ko-font: "Pretendard";[\s\S]*?--cafe-a-script-en-font: "Pretendard";[\s\S]*?font-family: "Pretendard", system-ui, sans-serif;/,
  );
  assert.match(cafeSource, /const noticeFontAssets = getKoreanFontLoadAssets\("pretendard"\);/);
  assert.match(cafeSource, /assets=\{\[koreanFontAssets, englishFontAssets, noticeFontAssets, \.\.\.roleFontAssets\]\}/);
});

test("Mocha Forest widens category rhythm off mobile without overriding the shared mobile category size", () => {
  assert.match(
    globalStylesSource,
    /data-preview-device="tablet"\] \{\s*--cafe-a-category-title-to-first-ratio: 1\.2;/,
  );
  assert.doesNotMatch(
    globalStylesSource,
    /data-template-key="cafe_mocha_forest_a"[^}]*data-preview-device="mobile"[^}]*--cafe-a-sunday-category-ratio/,
  );
  assert.match(
    globalStylesSource,
    /@media \(min-width: 768px\)[\s\S]*?cafe_mocha_forest_a[\s\S]*?not\(\[data-preview-device="mobile"\]\)[\s\S]*?--cafe-a-category-title-to-first-ratio: 1\.2;/,
  );
});

test("Mocha Forest slightly reduces the linked supporting copy off mobile", () => {
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_mocha_forest_a"\]\[data-cafe-a-skin="mocha_forest"\]:is\([\s\S]*data-preview-device="pc"[\s\S]*data-preview-device="tablet"[\s\S]*--cafe-a-template-supporting-copy-scale: 0\.96;/,
  );
  assert.match(
    globalStylesSource,
    /@media \(min-width: 768px\) \{[\s\S]*data-template-key="cafe_mocha_forest_a"\]\[data-cafe-a-skin="mocha_forest"\]:not\(\[data-preview-device\]\)[\s\S]*--cafe-a-template-supporting-copy-scale: 0\.96;/,
  );
  assert.match(
    globalStylesSource,
    /:is\(\s*\[data-cafe-a-widget-body\],[\s\S]*\.cafe-a-store-description,[\s\S]*\.cafe-a-description-text[\s\S]*var\(--cafe-a-template-supporting-copy-scale\)/,
  );
  assert.match(
    globalStylesSource,
    /:is\(\s*\.cafe-a-menu-description,[\s\S]*\.cafe-a-time-sale-time-text[\s\S]*var\(--cafe-a-template-supporting-copy-scale\)[^}]*var\(--fit-menu-wrap-scale, 1\)/,
  );
  assert.match(
    globalStylesSource,
    /data-cafe-a-skin="mocha_forest"\] \{[\s\S]*--cafe-a-template-supporting-copy-scale: 1;/,
  );
});

test("Mocha Forest text chips use a subtle corner radius", () => {
  assert.match(
    globalStylesSource,
    /data-template-key="cafe_mocha_forest_a"\]\[data-cafe-a-skin="mocha_forest"\] :is\(\s*\.cafe-a-menu-badge,\s*\.cafe-a-featured-badge,\s*\.cafe-a-menu-chip\s*\) \{\s*border-radius: 0\.25rem;/,
  );
});

test("MELLOW native starter, catalog controls and provisioning share its logo, palette and widget", async () => {
  const { buildStarterPreviewData } = await import("./template-starter-preview");
  const { previewDesignDefaults, applyPreviewDesign } = await import("./menu-preview-design");
  const { getTemplatePreviewOptions } = await import("./template-preview-options");
  const { applyTemplatePreviewOptions } = await import("./template-preview-data");
  const { getFixedOnePageLayoutShell } = await import("./one-page-layout-shells");
  const { menuSurfaceDefaults } = await import("./menu-design-surfaces");
  const { getTemplateByKey } = await import("./templates");
  const { StarterClient } = await import("./test-support/starter-provisioning-client");
  const { createStarterMenuData } = await import("./menu-starter-presets");
  const key = "cafe_mocha_forest_a";
  const starter = getStarterPreset(key);
  const preview = buildStarterPreviewData(key);
  assert.equal(getTemplateByKey(key).name, "MELLOW");
  assert.equal(getFixedOnePageLayoutShell(key), "brand_top_band");
  assert.equal(starter.site.restaurant_name, "MELLOW");
  assert.equal(preview.menuSite.restaurant_name, "MELLOW");
  assert.equal(preview.menuSite.logo_url, "/menu-templates/cafe_mocha_forest_a/mellow-logo-resized.png");
  assert.equal(getTemplatePreviewOptions(preview, {}).logoPreview, true);
  const defaults = previewDesignDefaults(preview);
  assert.equal(defaults.colors.page, "#792839");
  assert.equal(defaults.colors.auxiliary, "#792839");
  assert.equal(menuSurfaceDefaults(key).pageBackground, defaults.colors.page);
  assert.ok(Object.values(defaults.textColorDefaults).every(color => color === "#ECEAB7"));
  const widget = preview.widgets![0];
  assert.equal(widget.imageUrl, "/menu-templates/cafe_mocha_forest_a/mellow-widget-resized.png");
  assert.equal(widget.settings.aspectRatio, "2:1");
  assert.equal(widget.settings.objectFit, "contain");
  assert.equal(widget.settings.objectPosition, "bottom-right");
  assert.equal(widget.settings.placement, "flow");
  assert.equal(widget.visible, true);
  assert.equal(applyTemplatePreviewOptions(preview, { widgetsPreview: "off" }).widgets!.length, 0);
  const changed = applyPreviewDesign(preview, { textColorGroupsVersion: 2, textColors: { category: "#123456" }, pageBackground: "#EFEFEF" }, false);
  assert.equal(previewDesignDefaults(changed).textColors.category, "#123456");
  assert.equal(previewDesignDefaults(changed).colors.page, "#EFEFEF");
  assert.equal(previewDesignDefaults(preview).colors.page, "#792839");
  const client = new StarterClient();
  client.site = { ...client.site, template_key: key };
  await createStarterMenuData(client as never, "merchant-menu", key, null, null, "business_basic_single_monthly");
  assert.equal(client.site.logo_url, preview.menuSite.logo_url);
  assert.equal((client.site.settings as Record<string, unknown>).logo_replaces_name, true);
  const savedWidget = (client.rows.get("menu_widgets") ?? [])[0];
  assert.equal(savedWidget.image_url, widget.imageUrl);
  for (const [field, value] of Object.entries(widget.settings)) assert.equal((savedWidget.settings as Record<string, unknown>)[field], value);
});


test("MELLOW starts without representative media or secondary names, while both preview options remain available", async () => {
  const { existsSync } = await import("node:fs");
  const { buildStarterPreviewData } = await import("./template-starter-preview");
  const { getTemplatePreviewOptions } = await import("./template-preview-options");
  const { applyTemplatePreviewOptions } = await import("./template-preview-data");
  const { previewDesignDefaults } = await import("./menu-preview-design");
  const { getOnePageTopRowAlignment } = await import("./one-page-layout-shells");
  const data = buildStarterPreviewData("cafe_mocha_forest_a");
  const options = getTemplatePreviewOptions(data, {});
  assert.equal(getOnePageTopRowAlignment(data.menuSite.template_key), "left");
  assert.equal(options.coverPreview, false);
  assert.equal(options.secondaryNamesPreview, false);
  assert.equal(data.menuSite.cover_image_url, "");
  assert.deepEqual(data.featuredSlides, []);
  assert.equal(existsSync(new URL("../public/menu-templates/cafe_mocha_forest_a/featured.png", import.meta.url)), false);
  const enabled = applyTemplatePreviewOptions(data, { coverPreview: "on", secondaryNamesPreview: "on" });
  assert.equal(enabled.pageSettings.menu_cover_enabled, true);
  assert.equal(enabled.menuSite.cover_image_url, "");
  assert.deepEqual(enabled.featuredSlides, []);
  assert.ok(enabled.items.every(item => Boolean(item.set_name)));
  assert.ok(data.items.every(item => !item.set_name));
  const chips = previewDesignDefaults(data).chipColors;
  assert.equal(chips.saleText, chips.generalText);
});


test("MELLOW sale ink keeps readable custom-background fallback and explicit foreground overrides", async () => {
  const { getTemplateTimeSaleBadgeTextColor, getReadableTextColorForTimeSaleBadge } = await import("./menu-time-sales");
  const { buildStarterPreviewData } = await import("./template-starter-preview");
  const { applyPreviewDesign, readPreviewDesign } = await import("./menu-preview-design");
  assert.equal(getTemplateTimeSaleBadgeTextColor("cafe_mocha_forest_a", "#101010"), "#FFF8EA");
  assert.equal(getTemplateTimeSaleBadgeTextColor("cafe_design_a", "#ECEAB7"), getReadableTextColorForTimeSaleBadge("#ECEAB7"));
  const data = applyPreviewDesign(buildStarterPreviewData("cafe_mocha_forest_a"), { chipColors: { saleText: "#123456" } }, false);
  const design = (data.menuSite.page_settings as { design: { previewChipColors: { saleText: string } } }).design;
  assert.equal(readPreviewDesign({ chipColors: design.previewChipColors }).chipColors?.saleText, "#123456");
});
