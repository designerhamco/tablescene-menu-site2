import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { getStarterPreset, resolveStarterFeaturedSlides } from "./menu-starter-presets";
import { getSinglePageStarterTranslations } from "./template-demo-data/single-page-starter-translations";
import { mergeTypographySettings } from "./template-typography-presets";
import { getTemplateCapabilities } from "./template-capabilities";
import { getTemplateLayoutRules } from "./template-layout-rules";
import { getTemplateByKey } from "./templates";
import { supportsPcTabletLayoutMode } from "./menu-layout-modes";
import { BADGE_STYLE_KEYS, getDefaultBadgeStyles } from "./template-badge-styles";

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
  assert.equal(mergeTypographySettings("cafe_kohi_a").english_font_key, "tilt-warp");
  assert.equal(roles.category.color, "#DC4235");
  assert.equal(roles.brand.color, roles.category.color);
  for (const role of ["itemName", "supporting", "price"] as const) assert.equal(roles[role].color, "#000000");
});

test("every KOHI category has concise visible copy in every supported locale", () => {
  const categories = getStarterPreset("cafe_kohi_a").pages.flatMap((page) => page.categories);
  const translations = getSinglePageStarterTranslations("cafe_kohi_a");
  assert.ok(translations);
  for (const category of categories) {
    assert.equal(category.description_visible, true);
    assert.ok(category.description && category.description.length <= 24);
    assert.match(category.description, /[가-힣]/);
    assert.match(translations.en.categoryDescriptions?.[category.key!] ?? "", /^[A-Za-z &,]+$/);
    for (const locale of ["en", "zh", "ja"] as const) assert.ok(translations[locale].categoryDescriptions?.[category.key!]);
  }
});

test("KOHI starter uses the outlined Outfit logo with cafe and menu captions instead of the store-name text", () => {
  const preset = getStarterPreset("cafe_kohi_a");
  const capabilities = getTemplateCapabilities("cafe_kohi_a");
  assert.equal(preset.site.logo_url, "/menu-templates/cafe_kohi_a/kohi-outfit-logo.svg");
  assert.equal(preset.site.settings?.logo_replaces_name, true);
  assert.equal(capabilities.brandLogo, true);
  assert.equal(capabilities.brandLogoReplacesName, true);
  assert.ok(existsSync(new URL(`../public${preset.site.logo_url}`, import.meta.url)));
  const logo = readFileSync(new URL(`../public${preset.site.logo_url}`, import.meta.url), "utf8");
  assert.match(logo, /data-font-family="Outfit"/);
  assert.match(logo, /aria-label="cafe"/);
  assert.match(logo, /aria-label="menu"/);
  assert.match(logo, /fill="#dc4235"/);
  assert.doesNotMatch(logo, /<text[\s>]/);
  assert.notEqual(getStarterPreset("cafe_design_a").site.settings?.logo_replaces_name, true);
  const previewSource = readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url), "utf8");
  assert.match(previewSource, /logo_url: template\.key === "cafe_noir_a" \|\| template\.key === "cafe_kohi_a" \? \(preset\.site\.logo_url \?\? null\) : null/);
});

test("KOHI category headings and larger descriptions preserve linked sizing and editable colors", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\[data-template-key="cafe_kohi_a"\] \.cafe-a-category-title \{[^}]*font-weight: 700;/);
  assert.match(css, /\[data-template-key="cafe_kohi_a"\] \.cafe-a-category-eyebrow\.cafe-a-menu-description \{[^}]*font-size: calc\(var\(--cafe-a-linked-item-name-size\) \* var\(--cafe-a-device-type-scale\) \* 0\.9\);[^}]*font-weight: 800;/);
});

test("KOHI starter omits secondary names, restores all localized descriptions and keeps selected cold-drink price notes", () => {
  const items = getStarterPreset("cafe_kohi_a").pages.flatMap((page) => page.categories.flatMap((category) => category.items));
  assert.equal(items.length, 17);
  assert.ok(items.every((item) => !item.set_name?.trim()));
  assert.ok(items.every((item) => item.description.trim()));
  assert.equal(items.find((item) => item.key === "espresso")?.description, "견과와 다크 초콜릿의 짙은 풍미");
  assert.deepEqual(items.filter((item) => item.price_note).map((item) => [item.key, item.price_note]), [["kohi-cream-coffee", "Ice only"], ["lemon-soda", "Ice only"]]);
  const translations = getSinglePageStarterTranslations("cafe_kohi_a")!;
  for (const locale of ["en", "zh", "ja"] as const) assert.ok(Object.values(translations[locale].items).every((item) => item.description.trim()));
});

test("KOHI defaults unify all regular and timed badge colors without changing other templates", () => {
  const styles = getDefaultBadgeStyles("cafe_kohi_a");
  for (const key of BADGE_STYLE_KEYS) assert.deepEqual(styles[key], { background_color: "#DC4235", text_color: "#FFFFFF" });
  assert.equal(getDefaultBadgeStyles("cafe_design_a").signature.background_color, "#2AA36D");
});

test("KOHI featured area contains only one original illustration without a product link", () => {
  const preset = getStarterPreset("cafe_kohi_a");
  assert.equal(preset.featured_slides?.length, 1);
  const slide = preset.featured_slides![0];
  assert.equal(slide.image_url, "/menu-templates/cafe_kohi_a/kohi-coffee-crocodile-illustration.png");
  assert.equal(preset.site.cover_image_url, slide.image_url);
  assert.equal(slide.featured_item_key, undefined);
  assert.equal(slide.featured_item_name, undefined);
  assert.equal(preset.featured_item_key, undefined);
  assert.equal(preset.featured_item_name, undefined);
  assert.equal(preset.menu_cover_enabled, true);
  assert.equal(preset.menu_cover_visible_pc, true);
  assert.equal(preset.menu_cover_visible_tablet, true);
  assert.equal(preset.menu_cover_visible_mobile, true);
  assert.ok(existsSync(new URL(`../public${slide.image_url}`, import.meta.url)));
  const items = preset.pages.flatMap((page) => page.categories.flatMap((category) => category.items.map((item, index) => ({ id: `item-${index}`, name: item.name, visible: true }))));
  assert.equal(resolveStarterFeaturedSlides(preset, items)[0]?.featured_item_id, null);
  assert.notEqual(getStarterPreset("cafe_design_a").site.cover_image_url, slide.image_url);
});

test("KOHI illustration is not cropped in wide portrait-tablet headers, without changing customer photos", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const selector = '.cafe-a-typography[data-template-key="cafe_kohi_a"] .cafe-a-cover-hero [data-cafe-a-cover-image][src$="/kohi-coffee-crocodile-illustration.png"]';
  const rule = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)) + 1);
  assert.match(rule, /object-fit: contain;/);
  assert.match(rule, /background-color: #f7f5f1;/);
  assert.doesNotMatch(rule, /height:|width:|padding:|margin:|grid-template/);
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
  assert.equal(sale.badge_background_color, "#DC4235");
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
