import assert from "node:assert/strict";
import test from "node:test";

import {
  POLICY_EFFECTIVE_DATE,
  POLICY_EFFECTIVE_DATE_LABEL,
  PROMOTION_END_AT_EXCLUSIVE,
  PROMOTION_END_DATE,
  PROMOTION_PERIOD_LABEL,
  PROMOTION_START_AT,
  PROMOTION_START_DATE,
} from "./policy-dates";
import { openDiscountPolicy } from "./promotion-policy";

test("약관과 개인정보 처리방침 시행일을 공개 일정으로 고정한다", () => {
  assert.equal(POLICY_EFFECTIVE_DATE, "2026년 10월 1일");
  assert.equal(POLICY_EFFECTIVE_DATE_LABEL, POLICY_EFFECTIVE_DATE);
});

test("오픈 얼리버드는 2026년 10월 1일부터 3개월간 가입받는다", () => {
  assert.equal(PROMOTION_START_DATE, "2026년 10월 1일");
  assert.equal(PROMOTION_END_DATE, "2026년 12월 31일");
  assert.equal(PROMOTION_START_AT, "2026-09-30T15:00:00.000Z");
  assert.equal(PROMOTION_END_AT_EXCLUSIVE, "2026-12-31T15:00:00.000Z");
  assert.equal(PROMOTION_PERIOD_LABEL, "2026년 10월 1일 ~ 2026년 12월 31일");
  assert.equal(openDiscountPolicy.startDate, PROMOTION_START_DATE);
  assert.equal(openDiscountPolicy.endDate, PROMOTION_END_DATE);
  assert.equal(openDiscountPolicy.durationMonths, 3);
});
