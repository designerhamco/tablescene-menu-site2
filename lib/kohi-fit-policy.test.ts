import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getKohiFitLimits, isKohiFitFontScaleWithinLimits, limitKohiFitFontCandidates, usesKohiFitPolicy } from "./kohi-fit-policy";
import { getOnePageItemRhythmMultiplier } from "./one-page-proportion-policy";

test("the proportion-first fit pilot stays scoped to KOHI PC/tablet", () => {
  for (const device of ["pc", "tablet", undefined] as const) assert.equal(usesKohiFitPolicy("cafe_kohi_a", device), true);
  assert.equal(usesKohiFitPolicy("cafe_kohi_a", "mobile"), false);
  for (const key of ["cafe_design_a", "fast_food_loop_bagel_a", "cafe_sunday_line_a", "cafe_van_gogh_a", "cafe_round_focus_a", "display_menu_a"]) {
    assert.equal(usesKohiFitPolicy(key, "tablet"), false);
  }
});

test("KOHI keeps only its bounded font candidates while sharing common gap mapping", () => {
  assert.deepEqual(getKohiFitLimits("tablet"), { maximumFontScale: 1.2 });
  assert.deepEqual(getKohiFitLimits("pc"), { maximumFontScale: 1.24 });
  assert.equal(getKohiFitLimits(undefined, 1198).maximumFontScale, 1.2);
  assert.equal(getKohiFitLimits(undefined, 1920).maximumFontScale, 1.24);
  const candidates = [1.34, 1.28, 1.24, 1.2, 1, 0.85, 0.64, NaN, Infinity];
  assert.deepEqual(limitKohiFitFontCandidates(candidates, "tablet"), [1.2, 1, 0.85, 0.64]);
  assert.deepEqual(limitKohiFitFontCandidates(candidates, "pc"), [1.24, 1.2, 1, 0.85, 0.64]);
});

test("missing rendered supporting lines add bounded item-only breathing room", () => {
  assert.equal(getOnePageItemRhythmMultiplier(true, true), 1);
  assert.equal(getOnePageItemRhythmMultiplier(false, true), 1.1);
  assert.equal(getOnePageItemRhythmMultiplier(true, false), 1.1);
  assert.equal(getOnePageItemRhythmMultiplier(false, false), 1.2);
  assert.equal(getOnePageItemRhythmMultiplier(false, false, true), 1);
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  for (const factor of ["1.1", "1.2"]) {
    assert.ok(css.includes(`.cafe-a-typography[data-cafe-a-copy-aware-rhythm="true"] .cafe-a-menu-item-stack:not(:last-child):has(> [data-cafe-a-item-rhythm="${factor}"])`));
    assert.ok(css.includes(`calc(var(--cafe-a-copy-aware-item-rhythm-gap) * ${factor})`));
  }
});

test("settled or cached states cannot bypass a tighter viewport ceiling", () => {
  assert.equal(isKohiFitFontScaleWithinLimits(1.24, "pc"), true);
  assert.equal(isKohiFitFontScaleWithinLimits(1.24, "tablet"), false);
  assert.equal(isKohiFitFontScaleWithinLimits(1.2, "tablet"), true);
  assert.equal(isKohiFitFontScaleWithinLimits(1.34, "pc"), false);
  assert.equal(isKohiFitFontScaleWithinLimits(NaN, "pc"), false);
  const source = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.match(source, /cachedState &&\s*canRetainTemplateFitState\(cachedState\)/);
  assert.match(source, /if \(!canRetainTemplateFitState\(currentState\)\)/);
});

test("candidate selection keeps KOHI font bounds without a template-specific gap mapper", () => {
  const source = readFileSync(new URL("../components/menu-templates/CafeDesignA.tsx", import.meta.url), "utf8");
  assert.match(source, /const hasBoundedFitSpacing = isKohiFitPolicy \|\|/);
  assert.doesNotMatch(source, /getKohiFitGapScale|if \(isKohiFitPolicy\)\s*\{\s*return [^;]*GapScale/);
  assert.match(source, /return layoutMode === "orderedFit"\s*\? getOrderedFitGapScale[\s\S]*getOrderedBalancedFitGapScale[\s\S]*getBalancedFitGapScale/);
  assert.match(source, /getOnePageItemRhythmMultiplier\(hasSecondaryText, hasDescriptionText, showMenuTimeSale/);
  for (const candidates of ["ORDERED_FIT_FONT_SCALE_CANDIDATES", "FIT_FONT_SCALE_CANDIDATES"]) {
    assert.ok(source.includes(`for (const fontScale of getTemplateFitFontCandidates(${candidates}))`));
  }
  assert.match(source, /getTemplateFitFontCandidates\(getOrderedBalancedFitFontScaleCandidates/);
  assert.match(source, /!isMochaForest && !hasBoundedFitSpacing && actualCropMeasurement.bottomGap/);
  assert.match(source, /if \(isMochaForest \|\| hasBoundedFitSpacing\) return/);
  assert.match(source, /if \(layoutMode !== "orderedFit" \|\| hasBoundedFitSpacing\)/);
  assert.match(source, /data-fit-final-font-boost=\{hasBoundedFitSpacing \? 1/);
  assert.match(source, /data-fit-final-gap-boost=\{hasBoundedFitSpacing \? 1/);
});
