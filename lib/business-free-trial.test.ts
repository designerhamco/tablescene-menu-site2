import assert from "node:assert/strict";
import test from "node:test";

import {
  isActiveBusinessFreeTrial,
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
  assert.equal(isBusinessFreeTrialEnabled({ BUSINESS_MONTHLY_FREE_TRIAL_ENABLED: "true" }), true);
});

test("free trial applies once across all newly sold monthly template products", () => {
  assert.equal(isBusinessFreeTrialProduct("business_basic_single_monthly"), true);
  assert.equal(isBusinessFreeTrialProduct("business_basic_single_yearly"), false);
  assert.equal(isBusinessFreeTrialProduct("business_basic_multi_monthly"), true);
  assert.equal(isBusinessFreeTrialProduct("business_display_monthly"), true);
  assert.equal(isBusinessFreeTrialProduct("business_display_yearly"), false);
});

test("free trial lasts exactly 30 days", () => {
  const period = getBusinessFreeTrialPeriod(new Date("2026-09-01T00:00:00.000Z"));

  assert.equal(BUSINESS_FREE_TRIAL_DAYS, 30);
  assert.equal(period.startsAt, "2026-09-01T00:00:00.000Z");
  assert.equal(period.endsAt, "2026-10-01T00:00:00.000Z");
  assert.equal(formatBusinessFreeTrialFirstBillingDate(period.endsAt), "2026년 10월 1일");
});


test("active trial display covers eligible monthly services and never labels paid or yearly subscriptions as free", () => {
  const pending = {status: "active", last_paid_at: null, portone_payment_id: null, next_billing_at: "2026-12-25T00:00:00Z"};
  for (const product_key of ["business_basic_single_monthly", "business_basic_multi_monthly", "business_display_monthly"]) {
    assert.equal(isActiveBusinessFreeTrial({...pending,product_key}), true);
    assert.equal(isActiveBusinessFreeTrial({...pending,product_key,last_paid_at:"2026-11-25T00:00:00Z"}), false);
    assert.equal(isActiveBusinessFreeTrial({...pending,product_key,portone_payment_id:"paid-payment"}), false);
    assert.equal(isActiveBusinessFreeTrial({...pending,product_key,status:"canceled"}), false);
  }
  assert.equal(isActiveBusinessFreeTrial({...pending,product_key:"business_display_yearly"}), false);
  assert.equal(isActiveBusinessFreeTrial(null), false);
});
