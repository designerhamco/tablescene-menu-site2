export const ALIMTALK_TOPUP_AMOUNTS = [10000, 30000, 50000] as const;
export type AlimtalkTopupAmount = typeof ALIMTALK_TOPUP_AMOUNTS[number];
export function isAlimtalkTopupAmount(value: unknown): value is AlimtalkTopupAmount {
  return typeof value === "number" && ALIMTALK_TOPUP_AMOUNTS.some(amount => amount === value);
}
export function isAlimtalkPaymentId(value: unknown): value is string {
  return typeof value === "string" && /^alimtalk_[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(value);
}
export type AlimtalkWalletEntry = {
  id: string; kind: "topup" | "hold" | "charge" | "release"; amount: number;
  balance: number; reserved: number; createdAt: string; menuName: string; orderNumber: number | null;
};
export type AlimtalkWalletView = {
  balance: number; reserved: number; frozen: boolean; unitPrice: number | null;
  checkoutEnabled: boolean; entries: AlimtalkWalletEntry[];
  pendingTopups: { paymentId: string; amount: number; createdAt: string }[];
  message?: string;
};
export type AlimtalkCheckout = { paymentId: string; amount: number; storeId: string; channelKey: string; ownerId: string };
export type AlimtalkWalletInput = { intent: "refresh" } | { intent: "topup"; amount: number } | { intent: "complete"; paymentId: string };
export type AlimtalkWalletResult = { wallet?: AlimtalkWalletView; checkout?: AlimtalkCheckout; notice?: string; error?: string };
export type AlimtalkWalletAction = (input: AlimtalkWalletInput) => Promise<AlimtalkWalletResult>;
export const ALIMTALK_ENTRY_LABELS = { topup: "잔액 충전", hold: "발송 금액 확보", charge: "발송 성공", release: "발송 실패 · 금액 반환" } as const;
