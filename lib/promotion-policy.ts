import { PROMOTION_END_DATE, PROMOTION_PERIOD_LABEL, PROMOTION_START_DATE } from "@/lib/policy-dates";

export const openDiscountPolicy = {
  enabled: true,
  label: "오픈 할인",
  durationMonths: 12,
  durationLabel: PROMOTION_PERIOD_LABEL,
  note: "프로모션 종료 후 다음 결제일부터 정상가가 적용될 수 있습니다.",
  // TODO: 공식 오픈일이 확정되면 startDate/endDate를 운영 설정 또는 환경변수 기반으로 연결합니다.
  // 오픈 할인 시작일/종료일은 아직 미확정이므로 화면이나 결제 로직에 날짜를 하드코딩하지 않습니다.
  startDate: PROMOTION_START_DATE,
  endDate: PROMOTION_END_DATE,
} as const;
