import assert from "node:assert/strict";
import test from "node:test";

import {
  businessBasicMonthlyProduct,
  businessBasicMultiMonthlyProduct,
  businessBasicMultiYearlyProduct,
  businessBasicYearlyProduct,
  legacyBusinessBasicMonthlyProduct,
} from "./payments";
import { getSubscriptionProduct } from "./billing-products";
import {
  getDiningProductTier,
  getDiningTemplateTier,
  isDiningProductCompatibleWithTemplate,
} from "./dining-product-tiers";

test("단일·멀티페이지 상품은 같은 페이지 등급 템플릿에만 연결한다", () => {
  assert.equal(getDiningTemplateTier("cafe_design_a"), "single");
  assert.equal(getDiningTemplateTier("cafe_brew_chapter_a"), "multi");
  assert.equal(getDiningProductTier(businessBasicMonthlyProduct.product_key), "single");
  assert.equal(getDiningProductTier(businessBasicMultiMonthlyProduct.product_key), "multi");

  assert.equal(
    isDiningProductCompatibleWithTemplate(businessBasicMonthlyProduct.product_key, "cafe_design_a"),
    true,
  );
  assert.equal(
    isDiningProductCompatibleWithTemplate(businessBasicMonthlyProduct.product_key, "cafe_brew_chapter_a"),
    false,
  );
  assert.equal(
    isDiningProductCompatibleWithTemplate(businessBasicMultiMonthlyProduct.product_key, "cafe_brew_chapter_a"),
    true,
  );
  assert.equal(
    isDiningProductCompatibleWithTemplate(businessBasicMultiMonthlyProduct.product_key, "cafe_design_a"),
    false,
  );
});

test("기존 고객의 레거시 상품은 페이지 등급을 강제로 바꾸지 않는다", () => {
  assert.equal(
    isDiningProductCompatibleWithTemplate(legacyBusinessBasicMonthlyProduct.product_key, "cafe_design_a"),
    true,
  );
  assert.equal(
    isDiningProductCompatibleWithTemplate(legacyBusinessBasicMonthlyProduct.product_key, "cafe_brew_chapter_a"),
    true,
  );
  assert.equal(getSubscriptionProduct(legacyBusinessBasicMonthlyProduct.product_key)?.allowNewMenuSiteCreation, false);
  assert.equal(getSubscriptionProduct(businessBasicMonthlyProduct.product_key)?.allowNewMenuSiteCreation, true);
});

test("오픈 할인 월 가격과 연간 10% 추가 할인 금액을 고정한다", () => {
  assert.deepEqual(
    {
      singleRegularMonthly: businessBasicMonthlyProduct.regular_amount,
      singleMonthly: businessBasicMonthlyProduct.amount,
      singleYearly: businessBasicYearlyProduct.amount,
      multiRegularMonthly: businessBasicMultiMonthlyProduct.regular_amount,
      multiMonthly: businessBasicMultiMonthlyProduct.amount,
      multiYearly: businessBasicMultiYearlyProduct.amount,
    },
    {
      singleRegularMonthly: 8_900,
      singleMonthly: 5_900,
      singleYearly: 63_720,
      multiRegularMonthly: 12_900,
      multiMonthly: 9_900,
      multiYearly: 106_920,
    },
  );
  assert.equal(businessBasicYearlyProduct.amount, businessBasicMonthlyProduct.amount * 12 * 0.9);
  assert.equal(businessBasicMultiYearlyProduct.amount, businessBasicMultiMonthlyProduct.amount * 12 * 0.9);
});
