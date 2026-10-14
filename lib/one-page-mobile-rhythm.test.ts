import assert from "node:assert/strict";
import test from "node:test";
// JS intentionally shares a DOM-free checker with browser QA.
import { compareMobileRhythmViewports, getOnePageMobileRhythmFailures } from "../scripts/lib/one-page-mobile-rhythm.mjs";

const valid = {
  mobileStyle: "true", contract: "mobile-reading", copyAware: null, itemGap: 20, sectionGap: 48,
  upperGap: 48, blockGaps: [48, 48], overflow: 0,
  categories: [{ title: "Menu", itemGaps: [20, 20], lastMargin: 0 }],
  fonts: { name: 16, brand: 48, category: 26, description: 14 },
};

test("rendered mobile gap assertions reject the original zero-gap bug and device-policy leaks", () => {
  assert.deepEqual(getOnePageMobileRhythmFailures(valid), []);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, categories: [{ ...valid.categories[0], itemGaps: [0, 0] }] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, copyAware: "true" }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, upperGap: 24 }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, blockGaps: [24] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, sectionGap: NaN }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, fonts: { ...valid.fonts, name: 14 } }).length);
  assert.deepEqual(getOnePageMobileRhythmFailures({ ...valid, noticeGaps: [0, 0] }), []);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, noticeGaps: [6, 6] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, noticeSizes: [12] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, noticeLineHeights: [19.32] }).length);
  assert.deepEqual(getOnePageMobileRhythmFailures({ ...valid, noticeSizes: [14], noticeLineHeights: [21] }), []);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, autoBrand: true, brandState: "pending" }).length);
  assert.deepEqual(getOnePageMobileRhythmFailures({ ...valid, autoBrand: true, brandState: "ready" }), []);
  assert.deepEqual(getOnePageMobileRhythmFailures({ ...valid, fonts: { ...valid.fonts, brand: 44 } }), []);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, fonts: { ...valid.fonts, brand: 43 } }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, upperContentGaps: [8] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, categoryCopyGaps: [3] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, copyGaps: [6] }).length);
  assert.ok(getOnePageMobileRhythmFailures({ ...valid, supportingLineHeights: [19.32] }).length);
  assert.deepEqual(getOnePageMobileRhythmFailures({ ...valid, upperContentGaps: [24], categoryCopyGaps: [8], copyGaps: [2], supportingLineHeights: [21] }), []);
});

test("mobile width/height changes must not auto-scale reading fonts or spacing", () => {
  assert.deepEqual(compareMobileRhythmViewports(valid, { ...valid, viewport: [430, 932] }), []);
  assert.ok(compareMobileRhythmViewports(valid, { ...valid, fonts: { ...valid.fonts, name: 14 } }).length);
  assert.ok(compareMobileRhythmViewports(valid, { ...valid, itemGap: 10 }).length);
  assert.ok(compareMobileRhythmViewports(valid, { ...valid, fonts: { ...valid.fonts, brand: 90 } }).length);
  assert.deepEqual(compareMobileRhythmViewports({ ...valid, autoBrand: true }, { ...valid, autoBrand: true, fonts: { ...valid.fonts, brand: 90 } }), []);
});

test("KOHI mobile QA validates its approved type and split rule spacing", () => {
  const kohi = {
    ...valid,
    key: "cafe_kohi_a",
    upperGap: 33,
    blockGaps: [33, 33, 48],
    categories: [{ ...valid.categories[0], headingGap: 25 }],
    autoBrand: true,
    brandState: "ready",
    brandInnerWidth: 342,
    brandLineCount: 1,
    categoryCopyGaps: [4],
    kohiLineGaps: [{ kind: "category", after: 16 }, { kind: "heading", after: 12 }],
    fonts: { ...valid.fonts, brand: 84, category: 31.2 },
  };
  assert.deepEqual(getOnePageMobileRhythmFailures(kohi), []);
  assert.ok(getOnePageMobileRhythmFailures({ ...kohi, kohiLineGaps: [{ kind: "heading", after: 24 }] }).length);
});
