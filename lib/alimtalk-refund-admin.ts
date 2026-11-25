export type AlimtalkRefundAdminIntent = "approve" | "process" | "check";
export type AlimtalkRefundAdminAction = (id: string, intent: AlimtalkRefundAdminIntent, paymentPage: number, amount?: number) => Promise<{ notice?: string; error?: string }>;
export const ALIMTALK_REFUND_JOB_LABELS: Record<string, string> = {
  queued: "처리 대기", submitting: "결제사 확인 중", pending: "결과 확인 중", completed: "환불 확인", review: "관리자 확인 필요",
};
