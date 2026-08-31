import assert from "node:assert/strict";
import test from "node:test";

import {
  displayPricing,
  getDisplayMonthlyRefundBasis,
  legacyDisplayPricing,
} from "./display-pricing";
import { getSubscriptionProduct } from "./billing-products";
import {
  businessDisplayMonthlyProduct,
  businessDisplayYearlyProduct,
} from "./payments";

test("디스플레이 이미지·동영상 템플릿은 하나의 통합 가격을 사용한다", () => {
  assert.deepEqual(displayPricing, {
    regularMonthly: 19_900,
    monthly: 14_900,
    regularYearly: 238_800,
    yearly: 160_900,
  });
  assert.equal(displayPricing.regularYearly, displayPricing.regularMonthly * 12);
  assert.equal(displayPricing.yearly, 160_900);
  assert.equal(businessDisplayMonthlyProduct.amount, displayPricing.monthly);
  assert.equal(businessDisplayYearlyProduct.amount, displayPricing.yearly);
  assert.equal(
    getSubscriptionProduct(businessDisplayMonthlyProduct.product_key)?.amount,
    displayPricing.monthly,
  );
  assert.equal(
    getSubscriptionProduct(businessDisplayYearlyProduct.product_key)?.amount,
    displayPricing.yearly,
  );
});

test("기존 연간 결제의 현재 환불 기준은 소급 변경하지 않는다", () => {
  assert.equal(
    getDisplayMonthlyRefundBasis(legacyDisplayPricing.yearly),
    legacyDisplayPricing.monthly,
  );
  assert.equal(getDisplayMonthlyRefundBasis(displayPricing.yearly), displayPricing.monthly);
});
