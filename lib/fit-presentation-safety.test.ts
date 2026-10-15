import assert from "node:assert/strict";
import test from "node:test";

import {
  FIT_PRESENTATION_MIN_SAFETY_SCALE,
  findHighestSafeFitPresentationScale,
} from "../components/menu-templates/one-page/pc-tablet/cafe-fit-engine";

test("final presentation safety finds the largest measured safe scale instead of taking a coarse step", () => {
  let probes = 0;
  const scale = findHighestSafeFitPresentationScale({
    minimumScale: FIT_PRESENTATION_MIN_SAFETY_SCALE,
    maximumScale: 1,
    isSafe: (candidate) => {
      probes += 1;
      return candidate <= 0.963;
    },
  });

  assert.ok(scale >= 0.961 && scale <= 0.963);
  assert.ok(probes <= 10);
});

test("현재 배율도 안전하면 불필요하게 축소하지 않는다", () => {
  const scale = findHighestSafeFitPresentationScale({
    minimumScale: FIT_PRESENTATION_MIN_SAFETY_SCALE,
    maximumScale: 1,
    isSafe: () => true,
  });

  assert.equal(scale, 1);
});

test("final presentation safety preserves the existing minimum when even it still crops", () => {
  const scale = findHighestSafeFitPresentationScale({
    minimumScale: FIT_PRESENTATION_MIN_SAFETY_SCALE,
    maximumScale: 1,
    isSafe: () => false,
  });

  assert.equal(scale, FIT_PRESENTATION_MIN_SAFETY_SCALE);
});
