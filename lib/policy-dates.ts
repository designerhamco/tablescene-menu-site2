export const POLICY_EFFECTIVE_DATE = null; // TODO: 오픈일 확정 후 입력
export const PROMOTION_START_DATE = null; // TODO: 오픈일 확정 후 입력
export const PROMOTION_END_DATE = null; // TODO: 시작일 기준 1년 후 입력

export const POLICY_EFFECTIVE_DATE_LABEL = POLICY_EFFECTIVE_DATE ?? "오픈일 기준 적용";
export const PROMOTION_PERIOD_LABEL =
  PROMOTION_START_DATE && PROMOTION_END_DATE
    ? `${PROMOTION_START_DATE} ~ ${PROMOTION_END_DATE}`
    : "오픈일로부터 1년";
