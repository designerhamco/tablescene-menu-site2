import { readCafeTemplateSource } from "./test-helpers/cafe-template-source";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getTemplateCapabilities } from "./template-capabilities";
import { getAllTemplates } from "./templates";
import { getOnePageItemRhythmMultiplier, getOnePageRhythmMode, ONE_PAGE_PROPORTION_TEMPLATE_KEYS, usesOnePageProportionFitPolicy, usesOnePageProportionPolicy } from "./one-page-proportion-policy";
import { usesKohiFitPolicy } from "./kohi-fit-policy";

test("the common policy covers every available dining single-page template, not other engines", () => {
  const singlePageKeys = getAllTemplates().filter((template) =>
    template.active && template.service === "basic" && !getTemplateCapabilities(template.key).multiPage?.enabled,
  ).map((template) => template.key).sort();
  assert.deepEqual([...ONE_PAGE_PROPORTION_TEMPLATE_KEYS].sort(), singlePageKeys);
  for (const key of singlePageKeys) {
    assert.equal(usesOnePageProportionPolicy(key), true);
    assert.equal(usesOnePageProportionPolicy(key, "one"), true);
    assert.equal(usesOnePageProportionPolicy(key, "multi"), false);
    assert.equal(getOnePageRhythmMode(key, "mobile"), "mobile");
    assert.equal(getOnePageRhythmMode(key, "tablet"), "fit");
    assert.equal(getOnePageRhythmMode(key, "pc"), "fit");
    assert.equal(getOnePageRhythmMode(key, "mobile", "multi"), undefined);
    for (const device of ["pc", "tablet", undefined] as const) assert.equal(usesOnePageProportionFitPolicy(key, device), true);
    assert.equal(usesOnePageProportionFitPolicy(key, "mobile"), false);
    assert.equal(usesOnePageProportionFitPolicy(key, "tablet", "multi"), false);
  }
  for (const key of ["display_menu_a", "dining_aube_table_a", "dining_aube_table_b", "cafe_brew_chapter_a", "cafe_noir_a", "cafe_design_b", "unknown", null, undefined]) {
    assert.equal(usesOnePageProportionPolicy(key), false);
    assert.equal(usesOnePageProportionFitPolicy(key, "tablet"), false);
    assert.equal(getOnePageRhythmMode(key, "mobile"), undefined);
  }
});

test("copy-aware rhythm follows actual visible supporting fields and avoids compounding promotion copy", () => {
  assert.equal(getOnePageItemRhythmMultiplier(true, true), 1);
  assert.equal(getOnePageItemRhythmMultiplier(true, false), 1.1);
  assert.equal(getOnePageItemRhythmMultiplier(false, true), 1.1);
  assert.equal(getOnePageItemRhythmMultiplier(false, false), 1.2);
  for (const secondary of [false, true]) for (const description of [false, true]) {
    assert.equal(getOnePageItemRhythmMultiplier(secondary, description, true), 1);
  }
});

test("all templates share the layout-mode gap mapping while KOHI keeps only its ruled-panel ceiling", () => {
  for (const key of ONE_PAGE_PROPORTION_TEMPLATE_KEYS) {
    assert.equal(usesKohiFitPolicy(key, "tablet"), key === "cafe_kohi_a");
  }
  const source = readCafeTemplateSource();
  assert.match(source, /return isKohiFitPolicy \? limitKohiFitFontCandidates\(previewCandidates, data.previewDevice, window.innerWidth\) : previewCandidates/);
  assert.doesNotMatch(source, /getKohiFitGapScale|getLoopBagelFitGapScale|usesLoopBagelFitSpacing|isLoopBagelFitSpacing/);
  assert.match(source, /return layoutMode === "orderedFit"\s*\? getOrderedFitGapScale[\s\S]*getOrderedBalancedFitGapScale[\s\S]*getBalancedFitGapScale/);
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(css, /--cafe-a-shell-item-rhythm-scale: 0\.74/);
  const styleBlocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const templateItemRhythmOverrides = styleBlocks.filter(([, selector, declarations]) =>
    /data-template-key|data-cafe-a-skin/.test(selector) && /--cafe-a-shell-item-rhythm-scale/.test(declarations),
  );
  assert.deepEqual(templateItemRhythmOverrides.map(([, selector]) => selector.trim()), []);
});

test("product-internal row and image gaps stay on common fit-linked selectors", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const selector of [".cafe-a-menu-item", ".cafe-a-menu-title-row", ".cafe-a-menu-meta", ".cafe-a-price-stack"]) {
    assert.match(css, new RegExp(`\\.cafe-a-desktop-fit-board[^}]+${selector.replaceAll(".", "\\.")}`));
  }
  assert.match(css, /data-cafe-a-adaptive-fit="true"[^}]*\.cafe-a-menu-item-with-image[^}]*\{[^}]*column-gap: calc\(0\.5rem \* var\(--fit-menu-gap-scale\)\)/);
  assert.match(css, /data-cafe-a-adaptive-fit="true"[^}]*\.cafe-a-menu-item-content-shell[^}]*\{[^}]*column-gap: calc\(0\.5rem \* var\(--fit-menu-gap-scale\)\)/);
  const styleBlocks = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  const templateInternalGapOverrides = styleBlocks.filter(([, selector, declarations]) =>
    /data-template-key|data-cafe-a-skin/.test(selector) && /--cafe-a-menu-name-to-description-gap/.test(declarations),
  );
  assert.deepEqual(templateInternalGapOverrides.map(([, selector]) => selector.trim()), []);
});

test("the common behavior gates all final-fill enlargement and only changes between-item CSS", () => {
  const source = readCafeTemplateSource();
  assert.match(source, /hasBoundedFitSpacing = [^;]*usesOnePageProportionFitPolicy\(data.menuSite.template_key, data.previewDevice, data.pagePresentation\)/);
  assert.match(source, /data-cafe-a-proportion-policy=\{usesOnePageProportionPolicy\(data.menuSite.template_key, data.pagePresentation\)/);
  assert.match(source, /data-cafe-a-item-rhythm=\{usesOnePageProportionFitPolicy\(templateKey, previewDevice\) \? getOnePageItemRhythmMultiplier\(hasSecondaryText, hasDescriptionText, showMenuTimeSale/);
  assert.match(source, /getOnePageRhythmMode\(data\.menuSite\.template_key, menuCoverRenderDevice, data\.pagePresentation\)/);
  assert.match(source, /data-cafe-a-copy-aware-rhythm=\{onePageRhythmMode === "fit"/);
  assert.match(source, /data-cafe-a-mobile-style=\{onePageRhythmMode === "mobile"/);
  assert.match(source, /!isMochaForest && !hasBoundedFitSpacing && actualCropMeasurement.bottomGap/);
  assert.match(source, /if \(layoutMode !== "orderedFit" \|\| hasBoundedFitSpacing\)/);
  assert.match(source, /if \(isMochaForest \|\| hasBoundedFitSpacing\) return/);
  assert.match(source, /data-fit-final-font-boost=\{hasBoundedFitSpacing \? 1/);
  assert.match(source, /data-fit-final-gap-boost=\{hasBoundedFitSpacing \? 1/);
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  // Resolve the base on the stack where its density token actually exists;
  // a root alias to a descendant-only variable computed to invalid/zero gaps.
  assert.match(css, /\[data-cafe-a-copy-aware-rhythm="true"\] \.cafe-a-menu-item-stack \{\s*--cafe-a-copy-aware-item-rhythm-gap: var\(--cafe-a-local-item-rhythm-gap\)/);
  assert.match(css, /\[data-cafe-a-copy-aware-rhythm="true"\] \.cafe-a-desktop-fit-board \.cafe-a-menu-item-stack \{\s*--cafe-a-copy-aware-item-rhythm-gap: var\(--cafe-a-item-rhythm-gap\)/);
  for (const factor of ["1.1", "1.2"]) {
    assert.ok(css.includes(`.cafe-a-typography[data-cafe-a-copy-aware-rhythm="true"] .cafe-a-menu-item-stack:not(:last-child):has(> [data-cafe-a-item-rhythm="${factor}"])`));
    assert.ok(css.includes(`margin-bottom: calc(var(--cafe-a-copy-aware-item-rhythm-gap) * ${factor});`));
  }
  // Existing category merging, wrap readability, preferred/rescue columns and footer docking still run.
  for (const contract of ["selectOnePageFitTierState", "getCafeAMenuWrapDensityDecision", "getCafeAActualDomCropMeasurement", "FIT_PRESENTATION_MIN_SAFETY_SCALE", "columnIndex === centerRailColumns.length - 1 && footerInfo"]) assert.ok(source.includes(contract));
});

test("three-part reference is the default; actual content relaxation is conditional", () => {
  const source = readCafeTemplateSource();
  assert.match(source, /if \(onePageRhythmMode === "fit" && copyFitBasis === "three-field"\) restoreReference = beginCafeAThreePartReference\(fitBoardElement\)/);
  assert.ok(source.includes("shouldRelaxOnePageCopyReference"));
  assert.doesNotMatch(source, /setReadableScroll|data-fit-readable-scroll/);
  assert.match(source, /finally \{\s*restoreReference\?\.\(\)/);
  assert.match(source, /\? 0\.83\s*:/);
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.ok(css.includes('[data-cafe-a-reference-copy] { display: none !important; }'));
  assert.ok(css.includes('[data-cafe-a-three-part-reference] .cafe-a-menu-copy > [data-cafe-a-reference-copy] { display: block !important; }'));
});

test("mobile has fixed reading rhythm, independent type bases and one linked section boundary", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const mobile = css.slice(css.indexOf("/* Mobile is a reading layout"));
  const renderer = readCafeTemplateSource();
  assert.match(renderer, /mobileAutoFit=\{mobileReading\}/);
  assert.match(mobile, /font-size: max\(44px, 2\.75rem\)/);
  assert.match(mobile, /--cafe-a-category-title-size: 1\.625rem/);
  assert.doesNotMatch(mobile, /mobile-brand-scale|font-size: 1\.62rem|--cafe-a-van-gogh-notice-size: 0\.75rem/);
  assert.doesNotMatch(mobile, /data-template-key="[^"]+"[^}]*\.cafe-a-category-title\s*\{[^}]*font-size/);
  assert.doesNotMatch(renderer, /<MobileBrandTitle[\s\S]*?ceilingScale=/);
  assert.match(mobile, /--cafe-a-local-item-rhythm-gap: 1\.25rem/);
  assert.match(mobile, /--cafe-a-linked-item-name-size: calc\(1rem \* var\(--menu-font-size-scale/);
  assert.match(mobile, /--cafe-a-mobile-section-gap: 3rem/);
  assert.doesNotMatch(mobile, /var\(--cafe-a-category-separation-ratio\)/);
  assert.doesNotMatch(mobile, /var\(--cafe-a-store-title-device-scale|var\(--round-focus-brand-boost/);
  for (const token of ["--cafe-a-mobile-heading-gap: 1.5rem", "--cafe-a-mobile-inner-gap: 1.5rem", "--cafe-a-mobile-brand-copy-gap: 0.75rem", "--cafe-a-mobile-notice-gap: 0;"]) assert.ok(mobile.includes(token));
  for (const token of ["--cafe-a-mobile-copy-gap: 0.125rem", "--cafe-a-mobile-category-copy-gap: 0.5rem"]) assert.ok(mobile.includes(token));
  assert.match(renderer, /scriptAwareLabels\s+menuPlacement=/);
  assert.doesNotMatch(css, /\[data-template-language-control\] \.cafe-a-script-en \{\s*font-family: "Bagel Fat One"/);
  assert.doesNotMatch(mobile, /line-height: 1\.38/);
  assert.match(mobile, /padding-top: var\(--cafe-a-mobile-menu-start-gap\)/);
  assert.match(mobile, /margin-top: var\(--cafe-a-mobile-upper-to-menu-gap\)/);
  assert.match(mobile, /margin-top: var\(--cafe-a-mobile-category-boundary-gap\)/);
  assert.match(mobile, /\.cafe-a-menu-item-stack:not\(:last-child\) \{\s*margin-bottom: 1\.25rem/);
  assert.match(mobile, /\.cafe-a-desktop-fit-board \{\s*display: none/);
  assert.match(css, /data-template-key="cafe_kohi_a"\]:not\(\[data-preview-device="tablet"\]\):not\(\[data-preview-device="mobile"\]\):not\(\[data-cafe-a-mobile-style="true"\]\)/);
  // Width-only desktop selectors must not change mobile category/meta sizes
  // when an explicit mobile preview is opened in a wide standalone window.
  const desktopGuard = '.cafe-a-typography:where(:not([data-cafe-a-mobile-style="true"]))';
  assert.ok(css.includes(`${desktopGuard} .cafe-a-balanced-menu-grid .cafe-a-category-title`));
  assert.ok(css.includes(`${desktopGuard} .cafe-a-ordered-menu-flow .cafe-a-menu-meta`));
  assert.ok(css.includes(`${desktopGuard}[data-cafe-a-skin="round_focus"] .cafe-a-balanced-menu-grid .cafe-a-category-title`));
  assert.doesNotMatch(mobile, /\d(?:vw|vh|vmin|cqw)|--fit-menu-font-scale|--fit-menu-gap-scale|--cafe-a-copy-aware-item-rhythm-gap/);
  const preview = readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url), "utf8");
  const fixture = preview.slice(preview.indexOf("function applyOnePageRhythmQaFixture"), preview.indexOf("function applyKohiBackgroundQaFixture"));
  assert.match(fixture, /process\.env\.NODE_ENV === "production"/);
  assert.match(fixture, /usesOnePageProportionPolicy/);
});

test("legacy multi-page presentations identify themselves to the reused single-page renderer", () => {
  for (const file of ["MultiPageDesktopPresentation.tsx", "MultiPageStackPresentation.tsx"]) {
    const source = readFileSync(new URL(`../components/menu-templates/multi-page/${file}`, import.meta.url), "utf8");
    assert.match(source, /<CafeDesignA [^>]*pagePresentation="multi"/);
    assert.doesNotMatch(source, /pagePresentation="one"/);
  }
});


test("adaptive canvases share category hierarchy and use the actual frame without legacy device boosts", () => {
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  const shared = css.slice(css.indexOf("/* PC/tablet: one measured primary fit"), css.indexOf("/* Supporting copy is linked"));
  assert.match(shared, /--cafe-a-device-type-scale: 1 !important/);
  assert.match(shared, /--cafe-a-common-category-ratio: 1\.6/);
  assert.match(shared, /max-width: none !important/);
  assert.match(shared, /max-height: none !important/);
  assert.match(shared, /font-size: calc\(var\(--cafe-a-linked-item-name-size\) \* var\(--cafe-a-common-category-ratio\) \* var\(--menu-role-category-size-scale, 1\)\) !important/);
  assert.doesNotMatch(shared, /data-template-key|data-preview-device|1920px|1080px/);
  assert.equal((css.match(/grid-template-rows: minmax\(0, var\(--cafe-a-header-fr, 16fr\)\) minmax\(0, var\(--cafe-a-body-fr, 84fr\)\);/g) ?? []).length, 2);
  assert.doesNotMatch(css, /var\(--cafe-a-header-fr, (?:8|18)fr\)|var\(--cafe-a-body-fr, (?:82|92)fr\)/);
});
