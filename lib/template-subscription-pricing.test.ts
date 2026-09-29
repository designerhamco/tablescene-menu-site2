import assert from "node:assert/strict";
import test from "node:test";

import {
  getEarlyBirdMonthlyPrice,
  templateSubscriptionPricing,
} from "./template-subscription-pricing";

test("템플릿 유형별 정상가와 오픈 얼리버드 월 가격을 고정한다", () => {
  assert.deepEqual(templateSubscriptionPricing, {
    singlePage: { regularMonthly: 5_900, earlyBirdMonthly: 4_900 },
    multiPage: { regularMonthly: 8_900, earlyBirdMonthly: 6_900 },
    display: { regularMonthly: 12_900, earlyBirdMonthly: 10_900 },
  });

  assert.equal(getEarlyBirdMonthlyPrice("business_basic_single_monthly"), 4_900);
  assert.equal(getEarlyBirdMonthlyPrice("business_basic_multi_monthly"), 6_900);
  assert.equal(getEarlyBirdMonthlyPrice("business_display_monthly"), 10_900);
  assert.equal(getEarlyBirdMonthlyPrice("business_basic_single_yearly"), null);
});
