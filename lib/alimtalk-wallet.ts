export const ALIMTALK_TOPUP_AMOUNTS = [10000, 30000, 50000] as const;
export type AlimtalkTopupAmount = typeof ALIMTALK_TOPUP_AMOUNTS[number];
export function isAlimtalkTopupAmount(value: unknown): value is AlimtalkTopupAmount {
  return typeof value === "number" && ALIMTALK_TOPUP_AMOUNTS.some(amount => amount === value);
}
export function isAlimtalkPaymentId(value: unknown): value is string {
  return typeof value === "string" && /^alimtalk_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
}
export type AlimtalkWalletEntry = {
  id: string; kind: "topup" | "hold" | "charge" | "release" | "refund_hold" | "refund_release" | "refund"; amount: number;
  balance: number; reserved: number; createdAt: string; menuName: string; orderNumber: number | null;
};
export type AlimtalkWalletView = {
  balance: number; reserved: number; frozen: boolean; unitPrice: number | null;
  checkoutEnabled: boolean; entries: AlimtalkWalletEntry[];
  pendingTopups: { paymentId: string; amount: number; createdAt: string }[];
  termsVersion?: string;
  refunds?: AlimtalkRefundView[];
  message?: string;
};
export type AlimtalkCheckout = { paymentId: string; amount: number; storeId: string; channelKey: string; ownerId: string };
export type AlimtalkRefundView = { id: string; amount: number; refundedAmount: number; state: "requested" | "processing" | "completed" | "cancelled" | "review"; createdAt: string };
export type AlimtalkWalletInput = { intent: "refresh" } | { intent: "topup"; amount: number; termsVersion: string; unitPrice: number }
  | { intent: "complete"; paymentId: string }
  | { intent: "refund-request"; requestId: string; amount: number; termsVersion: string }
  | { intent: "refund-cancel"; requestId: string };
export type AlimtalkWalletResult = { wallet?: AlimtalkWalletView; checkout?: AlimtalkCheckout; notice?: string; error?: string };
export type AlimtalkWalletAction = (input: AlimtalkWalletInput) => Promise<AlimtalkWalletResult>;
export const ALIMTALK_ENTRY_LABELS = { topup: "잔액 충전", hold: "발송 금액 확보", charge: "발송 성공", release: "발송 실패 · 금액 반환", refund_hold: "환불 금액 보류", refund_release: "환불 신청 취소", refund: "충전금 환불" } as const;
export const ALIMTALK_REFUND_LABELS = { requested: "환불 신청 접수", processing: "환불 처리 중", completed: "환불 완료", cancelled: "환불 신청 취소", review: "환불 내역 확인 필요" } as const;
