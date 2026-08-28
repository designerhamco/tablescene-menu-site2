import assert from "node:assert/strict";
import test from "node:test";

import {
  BUSINESS_FREE_TRIAL_DAYS,
  formatBusinessFreeTrialFirstBillingDate,
  getBusinessFreeTrialPeriod,
  isBusinessFreeTrialEnabled,
  isBusinessFreeTrialProduct,
} from "./business-free-trial";

test("free trial is fail-closed unless the server feature flag is explicitly true", () => {
  assert.equal(isBusinessFreeTrialEnabled({}), false);
  assert.equal(isBusinessFreeTrialEnabled({ BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED: "false" }), false);
  assert.equal(isBusinessFreeTrialEnabled({ BUSINESS_SINGLE_MONTHLY_FREE_TRIAL_ENABLED: " TRUE " }), true);
});

test("free trial only applies to the dining single-page monthly product", () => {
  assert.equal(isBusinessFreeTrialProduct("business_basic_single_monthly"), true);
  assert.equal(isBusinessFreeTrialProduct("business_basic_single_yearly"), false);
  assert.equal(isBusinessFreeTrialProduct("business_basic_multi_monthly"), false);
  assert.equal(isBusinessFreeTrialProduct("business_display_monthly"), false);
});

test("free trial lasts exactly 30 days", () => {
  const period = getBusinessFreeTrialPeriod(new Date("2026-09-01T00:00:00.000Z"));

  assert.equal(BUSINESS_FREE_TRIAL_DAYS, 30);
  assert.equal(period.startsAt, "2026-09-01T00:00:00.000Z");
  assert.equal(period.endsAt, "2026-10-01T00:00:00.000Z");
  assert.equal(formatBusinessFreeTrialFirstBillingDate(period.endsAt), "2026년 10월 1일");
});
