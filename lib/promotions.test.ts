import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getOpenPromotionSnapshot,
  getPromotionApplyResult,
  getPromotionAwareChargeAmount,
} from "./promotions";

test("one OPEN code resolves product-specific monthly and yearly prices", () => {
  const singleMonthly = getPromotionApplyResult("business_basic_single_monthly", "OPEN");
  const singleYearly = getPromotionApplyResult("business_basic_single_yearly", "OPEN");
  const multiMonthly = getPromotionApplyResult("business_basic_multi_monthly", "OPEN");
  const multiYearly = getPromotionApplyResult("business_basic_multi_yearly", "OPEN");

  assert.equal(singleMonthly.promotion?.finalAmount, 5_900);
  assert.equal(singleYearly.promotion?.finalAmount, 63_700);
  assert.equal(multiMonthly.promotion?.finalAmount, 9_900);
  assert.equal(multiYearly.promotion?.finalAmount, 106_900);
});

test("removing OPEN restores each product regular price", () => {
  assert.equal(getPromotionAwareChargeAmount("business_basic_single_monthly", null), 8_900);
  assert.equal(getPromotionAwareChargeAmount("business_basic_single_yearly", null), 106_800);
  assert.equal(getPromotionAwareChargeAmount("business_basic_multi_monthly", null), 12_900);
  assert.equal(getPromotionAwareChargeAmount("business_basic_multi_yearly", null), 154_800);
});

test("applying OPEN uses the matching product promotion snapshot", () => {
  const singlePromotion = getOpenPromotionSnapshot("business_basic_single_monthly");
  const multiPromotion = getOpenPromotionSnapshot("business_basic_multi_monthly");

  assert.equal(getPromotionAwareChargeAmount("business_basic_single_monthly", singlePromotion), 5_900);
  assert.equal(getPromotionAwareChargeAmount("business_basic_multi_monthly", multiPromotion), 9_900);
});

test("checkout validation, billing, storage, and renewal use the resolved charge amount", () => {
  const applyFormSource = readFileSync(new URL("../components/apply/ApplyOrderForm.tsx", import.meta.url), "utf8");
  const preflightSource = readFileSync(new URL("../app/api/payment/preflight/route.ts", import.meta.url), "utf8");
  const startSource = readFileSync(new URL("../app/api/business-subscriptions/start/route.ts", import.meta.url), "utf8");
  const renewalSource = readFileSync(new URL("../app/api/cron/process-subscriptions/route.ts", import.meta.url), "utf8");

  assert.match(applyFormSource, /totalAmount: checkoutAmount/);
  assert.match(preflightSource, /amount !== expectedAmount/);
  assert.match(startSource, /amount: chargeAmount/);
  assert.match(renewalSource, /amount: renewalAmount/);
  assert.doesNotMatch(renewalSource, /amount: product\.amount/);
});
