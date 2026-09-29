import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  getOpenPromotionSnapshot,
  getPromotionApplyResult,
  getPromotionAwareChargeAmount,
} from "./promotions";

const ACTIVE_PROMOTION_DATE = new Date("2026-10-01T00:00:00.000Z");

test("one OPEN code resolves product-specific early-bird monthly prices", () => {
  const singleMonthly = getPromotionApplyResult("business_basic_single_monthly", "OPEN", ACTIVE_PROMOTION_DATE);
  const singleYearly = getPromotionApplyResult("business_basic_single_yearly", "OPEN", ACTIVE_PROMOTION_DATE);
  const multiMonthly = getPromotionApplyResult("business_basic_multi_monthly", "OPEN", ACTIVE_PROMOTION_DATE);
  const multiYearly = getPromotionApplyResult("business_basic_multi_yearly", "OPEN", ACTIVE_PROMOTION_DATE);
  const displayMonthly = getPromotionApplyResult("business_display_monthly", "OPEN", ACTIVE_PROMOTION_DATE);

  assert.equal(singleMonthly.promotion?.finalAmount, 4_900);
  assert.equal(singleYearly.ok, false);
  assert.equal(multiMonthly.promotion?.finalAmount, 6_900);
  assert.equal(multiYearly.ok, false);
  assert.equal(displayMonthly.promotion?.finalAmount, 10_900);
});

test("removing OPEN restores each product regular price", () => {
  assert.equal(getPromotionAwareChargeAmount("business_basic_single_monthly", null), 5_900);
  assert.equal(getPromotionAwareChargeAmount("business_basic_single_yearly", null), 63_700);
  assert.equal(getPromotionAwareChargeAmount("business_basic_multi_monthly", null), 8_900);
  assert.equal(getPromotionAwareChargeAmount("business_basic_multi_yearly", null), 106_900);
  assert.equal(getPromotionAwareChargeAmount("business_display_monthly", null), 12_900);
});

test("applying OPEN uses the matching product promotion snapshot", () => {
  const singlePromotion = getOpenPromotionSnapshot("business_basic_single_monthly", ACTIVE_PROMOTION_DATE);
  const multiPromotion = getOpenPromotionSnapshot("business_basic_multi_monthly", ACTIVE_PROMOTION_DATE);

  assert.equal(getPromotionAwareChargeAmount("business_basic_single_monthly", singlePromotion), 4_900);
  assert.equal(getPromotionAwareChargeAmount("business_basic_multi_monthly", multiPromotion), 6_900);
});

test("OPEN is accepted only during the announced KST launch window", () => {
  assert.equal(
    getOpenPromotionSnapshot("business_basic_single_monthly", new Date("2026-09-30T14:59:59.999Z")),
    null,
  );
  assert.equal(
    getOpenPromotionSnapshot("business_basic_single_monthly", new Date("2026-09-30T15:00:00.000Z"))?.finalAmount,
    4_900,
  );
  assert.equal(
    getOpenPromotionSnapshot("business_basic_single_monthly", new Date("2026-12-31T15:00:00.000Z")),
    null,
  );
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
