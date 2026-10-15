import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import test from "node:test";
import sharp from "sharp";
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
  assert.equal(mergeTypographySettings("cafe_kohi_a").english_font_key, "darumadrop-one");
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

test("KOHI starter displays the KOHI store-name text in Tilt Warp without a logo image", () => {
  const preset = getStarterPreset("cafe_kohi_a");
  const capabilities = getTemplateCapabilities("cafe_kohi_a");
  assert.equal(preset.site.logo_url, null);
  assert.equal(preset.site.settings?.logo_replaces_name, false);
  assert.equal(preset.site.restaurant_name, "KOHI");
  assert.equal(mergeTypographySettings("cafe_kohi_a").english_font_key, "darumadrop-one");
  assert.equal(capabilities.brandLogo, true);
  assert.equal(capabilities.brandLogoReplacesName, true);
  assert.notEqual(getStarterPreset("cafe_design_a").site.settings?.logo_replaces_name, true);
  const previewSource = readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url), "utf8");
  assert.match(previewSource, /logo_url: template\.key === "cafe_noir_a" \|\| template\.key === "cafe_kohi_a" \? \(preset\.site\.logo_url \?\? null\) : null/);
});

test("KOHI category headings and larger descriptions preserve linked sizing and editable colors", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\[data-template-key="cafe_kohi_a"\] \.cafe-a-category-title \{[^}]*font-weight: 700;/);
  assert.match(css, /\[data-template-key="cafe_kohi_a"\] \.cafe-a-category-eyebrow\.cafe-a-menu-description \{[^}]*font-weight: 800;/);
  assert.doesNotMatch(css, /\[data-template-key="cafe_kohi_a"\] \.cafe-a-category-eyebrow\.cafe-a-menu-description \{[^}]*font-size:/);
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

test("KOHI keeps its PC/tablet category and hand-drawn chip exceptions local to the template", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /data-template-key="cafe_kohi_a"[^}]*--kohi-category-title-scale: 1\.1;/);
  assert.doesNotMatch(css, /data-cafe-a-mobile-style="true"[^}]*data-template-key="cafe_kohi_a"[^}]*--kohi-category-title-scale/);
  assert.doesNotMatch(css, /data-cafe-a-mobile-style="true"[^}]*data-template-key="cafe_kohi_a"[^}]*cafe-a-category-title[^}]*font-size/);
  assert.match(css, /data-template-key="cafe_kohi_a"[^}]*cafe-a-category-title[^}]*var\(--kohi-category-title-scale\)/);
  assert.match(css, /data-template-key="cafe_kohi_a"[^}]*cafe-a-category-eyebrow\.cafe-a-menu-description[^}]*margin: 0 0 0\.18em;/);
  assert.doesNotMatch(css, /data-cafe-a-mobile-style="true"[^}]*data-template-key="cafe_kohi_a"[^}]*data-cafe-a-category-description[^}]*margin-bottom/);
  assert.match(css, /data-template-key="cafe_kohi_a"[^}]*:is\([^}]*cafe-a-time-sale-badge[^}]*\)[^}]*background-image:[^}]*clip-path: polygon/);
});

test("KOHI featured area contains only one original illustration without a product link", () => {
  const preset = getStarterPreset("cafe_kohi_a");
  assert.equal(preset.featured_slides?.length, 1);
  const slide = preset.featured_slides![0];
  assert.equal(slide.image_url, "/menu-templates/cafe_kohi_a/kohi-coffee-crocodile-user-v6.png");
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

test("KOHI artwork keeps transparent backgrounds without overriding the shared cover fit", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const selector = '.cafe-a-typography[data-template-key="cafe_kohi_a"] .cafe-a-cover-hero [data-cafe-a-cover-image]:is([src$="/kohi-coffee-crocodile-user-v4.png"], [src$="/kohi-coffee-crocodile-user-v5.png"], [src$="/kohi-coffee-crocodile-user-v6.png"])';
  const rule = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)) + 1);
  assert.match(rule, /background: transparent;/);
  assert.doesNotMatch(rule, /object-fit:|height:|width:|padding:|margin:|grid-template/);
  const component = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.match(component, /data-cafe-a-cover-image=""[\s\S]{0,500}?object-cover|object-cover[\s\S]{0,500}?data-cafe-a-cover-image=""/);
});

test("KOHI PNG has actual transparent pixels, not a painted paper/checkerboard background", async () => {
  const path = new URL(`../public${getStarterPreset("cafe_kohi_a").site.cover_image_url}`, import.meta.url);
  const image = sharp(readFileSync(path));
  const metadata = await image.metadata();
  const stats = await image.stats();
  assert.equal(metadata.format, "png");
  assert.equal(metadata.hasAlpha, true);
  assert.equal(stats.isOpaque, false);
  assert.equal(stats.channels[3]?.min, 0);
  assert.equal(stats.channels[3]?.max, 255);
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  for (const [x, y] of [[0, 0], [info.width - 1, 0], [0, info.height - 1], [info.width - 1, info.height - 1]]) {
    assert.equal(data[(y * info.width + x) * info.channels + info.channels - 1], 0);
  }
});

test("KOHI uses the user-supplied PNG unchanged, without regenerating or editing pixels", () => {
  const path = new URL(`../public${getStarterPreset("cafe_kohi_a").site.cover_image_url}`, import.meta.url);
  assert.equal(createHash("sha256").update(readFileSync(path)).digest("hex"), "4eccf958f696a8599724d66f08a93d15e62253410d34839c435c6ccfa178f401");
});

test("KOHI transparent illustration removes fallback backdrops without affecting other hero images", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const asset of ["kohi-coffee-crocodile-transparent-v2.png", "kohi-coffee-crocodile-heart-v3.png", "kohi-coffee-crocodile-user-v6.png"]) {
    const imageSelector = asset === "kohi-coffee-crocodile-user-v6.png"
      ? '[data-cafe-a-cover-image]:is([src$="/kohi-coffee-crocodile-user-v4.png"], [src$="/kohi-coffee-crocodile-user-v5.png"], [src$="/kohi-coffee-crocodile-user-v6.png"])'
      : `[data-cafe-a-cover-image][src$="/${asset}"]`;
    const scope = `.cafe-a-typography[data-template-key="cafe_kohi_a"] .cafe-a-cover-hero:has(${imageSelector})`;
    assert.ok(css.includes(`${scope} {\n  background: transparent;\n}`));
    assert.ok(css.includes(`${scope} [data-cafe-a-cover-placeholder] {\n  display: none;\n}`));
  }
  const preview = readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url), "utf8");
  const fixture = preview.slice(preview.indexOf("function applyKohiBackgroundQaFixture"), preview.indexOf("function getOrderCallQaConfig"));
  assert.match(fixture, /process\.env\.NODE_ENV === "production"/);
  assert.match(fixture, /normalizeBackgroundColor/);
  assert.match(fixture, /design: \{ \.\.\.design, backgroundColor \}/);
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
