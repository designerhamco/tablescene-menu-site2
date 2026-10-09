import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { getStarterPreset } from "./menu-starter-presets";
import { getSinglePageStarterTranslations } from "./template-demo-data/single-page-starter-translations";
import { mergeTypographySettings } from "./template-typography-presets";
import { getTemplateCapabilities } from "./template-capabilities";
import { getTemplateLayoutRules } from "./template-layout-rules";
import { getTemplateByKey } from "./templates";
import { supportsPcTabletLayoutMode } from "./menu-layout-modes";

test("KOHI is an independent editable REAL MATCHA-based template", () => {
  const kohi = getStarterPreset("cafe_kohi_a");
  const matcha = getStarterPreset("cafe_design_a");
  assert.equal(getTemplateByKey("cafe_kohi_a").active, true);
  assert.equal(kohi.site.restaurant_name, "KOHI");
  assert.equal(matcha.site.restaurant_name, "REAL MATCHA");
  assert.notEqual(kohi.pages, matcha.pages);
  assert.equal(getTemplateCapabilities("cafe_kohi_a").categoryDescription, true);
  assert.equal(getTemplateLayoutRules("cafe_kohi_a").maxColumns.desktop, 4);
  assert.equal(supportsPcTabletLayoutMode("cafe_kohi_a"), true);
  const roles = mergeTypographySettings("cafe_kohi_a").typography_roles;
  assert.equal(roles.category.color, "#B83A32");
  assert.equal(roles.brand.color, roles.category.color);
  for (const role of ["itemName", "supporting", "price"] as const) assert.equal(roles[role].color, "#000000");
});

test("every KOHI category has concise visible copy in every supported locale", () => {
  const categories = getStarterPreset("cafe_kohi_a").pages.flatMap((page) => page.categories);
  const translations = getSinglePageStarterTranslations("cafe_kohi_a");
  assert.ok(translations);
  for (const category of categories) {
    assert.equal(category.description_visible, true);
    assert.ok(category.description && category.description.length <= 18);
    for (const locale of ["en", "zh", "ja"] as const) assert.ok(translations[locale].categoryDescriptions?.[category.key!]);
  }
});

test("KOHI starter uses the rounded logo instead of the store-name text", () => {
  const preset = getStarterPreset("cafe_kohi_a");
  const capabilities = getTemplateCapabilities("cafe_kohi_a");
  assert.equal(preset.site.logo_url, "/menu-templates/cafe_kohi_a/kohi-rounded-logo.webp");
  assert.equal(preset.site.settings?.logo_replaces_name, true);
  assert.equal(capabilities.brandLogo, true);
  assert.equal(capabilities.brandLogoReplacesName, true);
  assert.ok(existsSync(new URL(`../public${preset.site.logo_url}`, import.meta.url)));
  assert.notEqual(getStarterPreset("cafe_design_a").site.settings?.logo_replaces_name, true);
  const previewSource = readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url), "utf8");
  assert.match(previewSource, /logo_url: template\.key === "cafe_noir_a" \|\| template\.key === "cafe_kohi_a" \? \(preset\.site\.logo_url \?\? null\) : null/);
});

test("KOHI featured content links to its own sample menu and an existing coffee image", () => {
  const preset = getStarterPreset("cafe_kohi_a");
  const itemKeys = new Set(preset.pages.flatMap((page) => page.categories.flatMap((category) => category.items.map((item) => item.key))));
  for (const slide of preset.featured_slides ?? []) {
    assert.ok(itemKeys.has(slide.featured_item_key));
    assert.ok(existsSync(new URL(`../public${slide.image_url}`, import.meta.url)));
    assert.doesNotMatch(slide.image_url, /real-matcha/);
  }
});

test("KOHI alone puts descriptions before headings and mounts non-interactive divider geometry", () => {
  const source = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.match(source, /\{descriptionAbove \? description : null\}[\s\S]*cafe-a-category-heading-row/);
  assert.match(source, /descriptionAbove=\{data\.menuSite\.template_key === "cafe_kohi_a"\}/);
  assert.match(source, /data\.menuSite\.template_key === "cafe_kohi_a" \? <KohiMenuDividers \/>/);
  const css = readFileSync(new URL("../components/menu-templates/KohiMenuDividers.module.css", import.meta.url), "utf8");
  assert.match(css, /position: absolute/);
  assert.match(css, /pointer-events: none/);
});

test("KOHI server save, reset and widget loading use the existing CafeA contracts", () => {
  const actions = readFileSync(new URL("../app/mypage/menus/actions.ts", import.meta.url), "utf8");
  assert.match(actions, /menuSite\.template_key !== "cafe_design_a" && menuSite\.template_key !== "cafe_kohi_a"/);
  assert.match(actions, /templateKey === "cafe_design_a" \|\| templateKey === "cafe_kohi_a"/);
  const loader = readFileSync(new URL("./menu-page-data.ts", import.meta.url), "utf8");
  assert.match(loader, /menuSite\.template_key === "cafe_design_a" \|\| menuSite\.template_key === "cafe_kohi_a"/);
  const renderer = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  const timeSaleGuard = renderer.match(/function isCafeDesignATimeSaleTemplate\([\s\S]*?\n\}/)?.[0] ?? "";
  assert.match(timeSaleGuard, /"cafe_kohi_a"/);
  assert.match(renderer, /const shouldRenderWidgets =[\s\S]*?template_key === "cafe_kohi_a"/);
});

test("KOHI notices retain only option copy and one localized cake countdown", () => {
  const preset = getStarterPreset("cafe_kohi_a");
  assert.equal(preset.site.settings?.footer_notice_1, "디카페인 변경 +0.5 · 우유 변경 +0.5");
  assert.equal(preset.site.settings?.footer_notice_2, "");
  assert.equal(preset.site.settings?.footer_notice_3, "");
  assert.equal(preset.time_sales?.length, 1);
  const sale = preset.time_sales![0];
  assert.equal(sale.duration_minutes, 60);
  assert.equal(sale.time_display_mode, "countdown");
  assert.equal(sale.targets?.[0].target_item_key, "basque-cheesecake");
  assert.equal(sale.targets?.[0].sale_price, 5500);
  assert.equal(sale.badge_background_color, "#000000");
  const translations = getSinglePageStarterTranslations("cafe_kohi_a")!;
  for (const locale of ["en", "zh", "ja"] as const) {
    assert.ok(translations[locale].promotions[sale.key!]?.badgeText);
    assert.deepEqual(translations[locale].site.footerNotices.slice(1), ["", ""]);
  }
});

test("KOHI expands semantic boundary gaps without adding a featured copy panel", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\[data-template-key="cafe_kohi_a"\] \{[^}]*--cafe-a-category-title-to-first-ratio: 2;[^}]*--cafe-a-category-separation-ratio: 3\.4;/);
  assert.doesNotMatch(css, /\[data-template-key="cafe_kohi_a"\] \.cafe-a-cover-hero \.cafe-a-featured-copy \{/);
  assert.match(css, /\[data-template-key="cafe_kohi_a"\] \.cafe-a-cover-hero :is\([^}]*color: #ffffff;/);
});
