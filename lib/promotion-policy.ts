import {
  PROMOTION_END_AT_EXCLUSIVE,
  PROMOTION_END_DATE,
  PROMOTION_PERIOD_LABEL,
  PROMOTION_START_AT,
  PROMOTION_START_DATE,
} from "@/lib/policy-dates";

export const openDiscountPolicy = {
  enabled: true,
  label: "오픈 얼리버드 할인",
  durationMonths: 3,
  durationLabel: PROMOTION_PERIOD_LABEL,
  note: "오픈 기간에 시작한 구독은 해지 전까지 할인 가격이 유지됩니다. 해지 후 다시 구독하면 정상가가 적용됩니다.",
  startDate: PROMOTION_START_DATE,
  endDate: PROMOTION_END_DATE,
} as const;

export function isOpenDiscountPeriod(now = new Date()) {
  const timestamp = now.getTime();
  return openDiscountPolicy.enabled
    && timestamp >= Date.parse(PROMOTION_START_AT)
    && timestamp < Date.parse(PROMOTION_END_AT_EXCLUSIVE);
}
