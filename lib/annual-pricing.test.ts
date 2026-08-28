import assert from "node:assert/strict";
import test from "node:test";

import { getTenPercentDiscountedAnnualPrice } from "./annual-pricing";

test("월 금액 12개월 합계의 10% 할인값을 100원 단위로 내림한다", () => {
  assert.equal(getTenPercentDiscountedAnnualPrice(5_900), 63_700);
  assert.equal(getTenPercentDiscountedAnnualPrice(9_900), 106_900);
  assert.equal(getTenPercentDiscountedAnnualPrice(14_900), 160_900);
});

test("유효하지 않은 월 금액을 거부한다", () => {
  assert.throws(() => getTenPercentDiscountedAnnualPrice(-1));
  assert.throws(() => getTenPercentDiscountedAnnualPrice(1.5));
});
