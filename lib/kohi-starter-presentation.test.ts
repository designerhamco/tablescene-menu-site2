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
  for (const role of ["brand", "itemName", "supporting", "price"] as const) assert.equal(roles[role].color, "#000000");
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
});
