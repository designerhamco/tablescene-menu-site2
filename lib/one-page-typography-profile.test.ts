import { readCafeTemplateSource } from "./test-helpers/cafe-template-source";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { getOnePageItemNameCeilingRem, getOnePageTypographyProfile } from "./one-page-typography-profile";

test("all one-page typography profiles share the same PC and tablet item-name ceilings", () => {
  const loopProfile = getOnePageTypographyProfile("fast_food_loop_bagel_a");
  assert.equal(loopProfile.key, "heavy-display");
  assert.equal(getOnePageItemNameCeilingRem("pc"), 1.35);
  assert.equal(getOnePageItemNameCeilingRem("tablet"), 1.3);
  assert.equal(getOnePageItemNameCeilingRem("mobile"), undefined);

  for (const key of ["cafe_design_a", "cafe_kohi_a", "cafe_mocha_forest_a", "cafe_sunday_line_a", "cafe_van_gogh_a", "cafe_round_focus_a", "unknown"]) {
    const profile = getOnePageTypographyProfile(key);
    assert.equal(profile.key, "standard");
    assert.equal(getOnePageItemNameCeilingRem("pc"), 1.35);
    assert.equal(getOnePageItemNameCeilingRem("tablet"), 1.3);
  }
});

test("the adaptive renderer exposes the profile and applies its device ceiling without template-specific CSS", () => {
  const source = readCafeTemplateSource();
  const css = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");

  assert.match(source, /data-one-page-typography-profile=\{isAdaptiveFit \? onePageTypographyProfile\.key : undefined\}/);
  assert.match(source, /getOnePageItemNameCeilingRem\(menuCoverRenderDevice\)/);
  assert.match(source, /"--cafe-a-linked-item-name-ceiling": `\$\{itemNameCeilingRem\}rem`/);
  assert.doesNotMatch(css, /data-template-key="fast_food_loop_bagel_a"[^}]*--cafe-a-linked-item-name-ceiling/);
});

test("Loop Bagel uses the same layout-mode gap mapping as the other one-page templates", () => {
  const source = readCafeTemplateSource();
  assert.doesNotMatch(source, /getLoopBagelFitGapScale|usesLoopBagelFitSpacing|isLoopBagelFitSpacing/);
  assert.match(
    source,
    /return layoutMode === "orderedFit"\s*\? getOrderedFitGapScale[\s\S]*?layoutMode === "orderedBalancedFit"\s*\? getOrderedBalancedFitGapScale[\s\S]*?: getBalancedFitGapScale/,
  );
});

test("Loop Bagel's dense preview fixture is development-only and leaves starter data untouched", () => {
  const source = readFileSync(new URL("../app/templates/[templateKey]/preview/page.tsx", import.meta.url), "utf8");
  const fixture = source.slice(source.indexOf("function applyCafeDenseContentQaFixture("), source.indexOf("function applySundayLineCopyQaFixture("));
  assert.ok(fixture.indexOf('process.env.NODE_ENV === "production"') < fixture.indexOf('data.menuSite.template_key === "fast_food_loop_bagel_a"'));
  assert.match(fixture, /normalizeContentQaCase\(contentQa\) !== "dense"/);
  assert.match(fixture, /items: \[\.\.\.data\.items, \.\.\.extraItems\]/);
  assert.doesNotMatch(fixture, /data\.items\.(push|splice)|data\.items\[[^\]]+\]\s*=/);
});
