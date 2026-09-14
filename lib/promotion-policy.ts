import { PROMOTION_END_DATE, PROMOTION_PERIOD_LABEL, PROMOTION_START_DATE } from "@/lib/policy-dates";

export const openDiscountPolicy = {
  enabled: true,
  label: "오픈 할인",
  durationMonths: 12,
  durationLabel: PROMOTION_PERIOD_LABEL,
  note: "프로모션 종료 후 다음 결제일부터 정상가가 적용될 수 있습니다.",
  startDate: PROMOTION_START_DATE,
  endDate: PROMOTION_END_DATE,
} as const;
