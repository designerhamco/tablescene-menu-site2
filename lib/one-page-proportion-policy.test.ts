import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getTemplateCapabilities } from "./template-capabilities";
import { getAllTemplates } from "./templates";
import { getOnePageItemRhythmMultiplier, ONE_PAGE_PROPORTION_TEMPLATE_KEYS, usesOnePageProportionFitPolicy, usesOnePageProportionPolicy } from "./one-page-proportion-policy";
import { usesKohiFitPolicy } from "./kohi-fit-policy";
import { usesLoopBagelFitSpacing } from "./loop-bagel-fit-spacing";

test("the common policy covers every available dining single-page template, not other engines", () => {
  const singlePageKeys = getAllTemplates().filter((template) =>
    template.active && template.service === "basic" && !getTemplateCapabilities(template.key).multiPage?.enabled,
  ).map((template) => template.key).sort();
  assert.deepEqual([...ONE_PAGE_PROPORTION_TEMPLATE_KEYS].sort(), singlePageKeys);
  for (const key of singlePageKeys) {
    assert.equal(usesOnePageProportionPolicy(key), true);
    assert.equal(usesOnePageProportionPolicy(key, "one"), true);
    assert.equal(usesOnePageProportionPolicy(key, "multi"), false);
    for (const device of ["pc", "tablet", undefined] as const) assert.equal(usesOnePageProportionFitPolicy(key, device), true);
    assert.equal(usesOnePageProportionFitPolicy(key, "mobile"), false);
    assert.equal(usesOnePageProportionFitPolicy(key, "tablet", "multi"), false);
  }
  for (const key of ["display_menu_a", "dining_aube_table_a", "dining_aube_table_b", "cafe_brew_chapter_a", "cafe_noir_a", "cafe_design_b", "unknown", null, undefined]) {
    assert.equal(usesOnePageProportionPolicy(key), false);
    assert.equal(usesOnePageProportionFitPolicy(key, "tablet"), false);
  }
});

test("copy-aware rhythm follows actual visible supporting fields and avoids compounding promotion copy", () => {
  assert.equal(getOnePageItemRhythmMultiplier(true, true), 1);
  assert.equal(getOnePageItemRhythmMultiplier(true, false), 1.15);
  assert.equal(getOnePageItemRhythmMultiplier(false, true), 1.15);
  assert.equal(getOnePageItemRhythmMultiplier(false, false), 1.35);
  for (const secondary of [false, true]) for (const description of [false, true]) {
    assert.equal(getOnePageItemRhythmMultiplier(secondary, description, true), 1);
  }
});

test("existing numeric profiles stay template-specific instead of copying KOHI's ceilings", () => {
  for (const key of ONE_PAGE_PROPORTION_TEMPLATE_KEYS) {
    assert.equal(usesKohiFitPolicy(key, "tablet"), key === "cafe_kohi_a");
    assert.equal(usesLoopBagelFitSpacing(key, "tablet"), key === "fast_food_loop_bagel_a");
  }
  const source = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.match(source, /return isKohiFitPolicy \? limitKohiFitFontCandidates\(previewCandidates, data.previewDevice, window.innerWidth\) : previewCandidates/);
  assert.match(source, /if \(isLoopBagelFitSpacing\) \{\s*return getLoopBagelFitGapScale/);
  assert.match(source, /return layoutMode === "orderedFit"\s*\? getOrderedFitGapScale[\s\S]*getOrderedBalancedFitGapScale[\s\S]*getBalancedFitGapScale/);
});

test("the common behavior gates all final-fill enlargement and only changes between-item CSS", () => {
  const source = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.match(source, /hasBoundedFitSpacing = [^;]*usesOnePageProportionFitPolicy\(data.menuSite.template_key, data.previewDevice, data.pagePresentation\)/);
  assert.match(source, /data-cafe-a-proportion-policy=\{usesOnePageProportionPolicy\(data.menuSite.template_key, data.pagePresentation\)/);
  assert.match(source, /data-cafe-a-item-rhythm=\{usesOnePageProportionPolicy\(templateKey\) \? getOnePageItemRhythmMultiplier\(hasSecondaryText, hasDescriptionText, showMenuTimeSale/);
  assert.match(source, /!isMochaForest && !hasBoundedFitSpacing && actualCropMeasurement.bottomGap/);
  assert.match(source, /if \(hasBoundedFitSpacing\) \{\s*restoreOrderedFitValidationStyles\(\);\s*return;/);
  assert.match(source, /if \(isMochaForest \|\| hasBoundedFitSpacing\) return/);
  assert.match(source, /data-fit-final-font-boost=\{hasBoundedFitSpacing \? 1/);
  assert.match(source, /data-fit-final-gap-boost=\{hasBoundedFitSpacing \? 1/);
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /\[data-cafe-a-proportion-policy="true"\] \{\s*--cafe-a-copy-aware-item-rhythm-gap: var\(--cafe-a-local-item-rhythm-gap\)/);
  assert.match(css, /\[data-cafe-a-proportion-policy="true"\] \.cafe-a-desktop-fit-board \{\s*--cafe-a-copy-aware-item-rhythm-gap: var\(--cafe-a-item-rhythm-gap\)/);
  for (const factor of ["1.15", "1.35"]) {
    assert.ok(css.includes(`.cafe-a-typography[data-cafe-a-proportion-policy="true"] .cafe-a-menu-item-stack:not(:last-child):has(> [data-cafe-a-item-rhythm="${factor}"])`));
    assert.ok(css.includes(`margin-bottom: calc(var(--cafe-a-copy-aware-item-rhythm-gap) * ${factor});`));
  }
  // Existing category merging, wrap readability, preferred/rescue columns and footer docking still run.
  for (const contract of ["selectOnePageFitTierState", "getCafeAMenuWrapDensityDecision", "getCafeAActualDomCropMeasurement", "FIT_PRESENTATION_MIN_SAFETY_SCALE", "columnIndex === centerRailColumns.length - 1 && footerInfo"]) assert.ok(source.includes(contract));
});

test("legacy multi-page presentations identify themselves to the reused single-page renderer", () => {
  for (const file of ["MultiPageDesktopPresentation.tsx", "MultiPageStackPresentation.tsx"]) {
    const source = readFileSync(new URL(`../components/menu-templates/multi-page/${file}`, import.meta.url), "utf8");
    assert.match(source, /<CafeDesignA [^>]*pagePresentation="multi"/);
    assert.doesNotMatch(source, /pagePresentation="one"/);
  }
});
