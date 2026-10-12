import assert from "node:assert/strict";
import test from "node:test";
// JS intentionally shares a DOM-free checker with browser QA.
import { compareMobileRhythmViewports, getOnePageMobileRhythmFailures } from "../scripts/lib/one-page-mobile-rhythm.mjs";

const valid = {
  mobileStyle: "true", contract: "mobile-reading", copyAware: null, itemGap: 18, sectionGap: 61.2,
  upperGap: 61.2, blockGaps: [61.2, 61.2], overflow: 0,
  categories: [{ title: "Menu", itemGaps: [18, 18], lastMargin: 0 }],
  fonts: { name: 16, brand: 44, category: 22, description: 13 },
};

test("rendered mobile gap assertions reject the original zero-gap bug and device-policy leaks", () => {
  assert.deepEqual(getOnePageMobileRhythmFailures(valid), []);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, categories: [{ ...valid.categories[0], itemGaps: [0, 0] }] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, copyAware: "true" }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, upperGap: 24 }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, blockGaps: [24] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, sectionGap: NaN }).length);
});

test("mobile width/height changes must not auto-scale reading fonts or spacing", () => {
  assert.deepEqual(compareMobileRhythmViewports(valid, { ...valid, viewport: [430, 932] }), []);
  assert.ok(compareMobileRhythmViewports(valid, { ...valid, fonts: { ...valid.fonts, name: 14 } }).length);
  assert.ok(compareMobileRhythmViewports(valid, { ...valid, itemGap: 10 }).length);
});
