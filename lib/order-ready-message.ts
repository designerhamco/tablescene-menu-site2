/** Fixed information-only copy, confirmed against the approved NHN template. */
export const ORDER_READY_TEMPLATE_CODE = "cooking_ready_v1";
export const ORDER_READY_TEMPLATE_NAME = "주문 메뉴 조리완료 안내";
export const ORDER_READY_TEMPLATE_CATEGORY = "002001";
export const ORDER_READY_TEMPLATE_CONTENT = `[#{매장명}] 조리완료 안내

주문하신 메뉴가 준비되었습니다.

룸: #{룸명}
테이블·키오스크: #{테이블명}
주문번호: #{주문번호}

매장 직원의 안내에 따라 음식을 받아주세요.`;

export type MerchantTemplateStatus = "unregistered" | "checking" | "pending" | "approved" | "rejected" | "blocked" | "conflict" | "unknown" | "failed";
export const MERCHANT_TEMPLATE_LABELS: Record<MerchantTemplateStatus, string> = {
  unregistered: "메시지 준비 전", checking: "확인 중", pending: "심사 중", approved: "승인 완료",
  rejected: "심사 반려", blocked: "사용 중지", conflict: "문구 확인 필요", unknown: "등록 결과 확인 필요", failed: "연결 확인 필요",
};
export function isOrderReadyTemplateContent(value: unknown) {
  return typeof value === "string" && value.replace(/\r\n/g, "\n").trim() === ORDER_READY_TEMPLATE_CONTENT;
}
