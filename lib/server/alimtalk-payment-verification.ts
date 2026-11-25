// Pure verification, also used by checkout completion and webhook reconciliation.
export type AlimtalkPayment = {
  id?: unknown; status?: unknown; storeId?: unknown; currency?: unknown;
  amount?: { total?: unknown; paid?: unknown; cancelled?: unknown };
  channel?: { id?: unknown; key?: unknown; type?:unknown }; customer?: { id?: unknown }; customData?: unknown;
};
export type AlimtalkPaymentIntent = { payment_id: string; owner_id: string; menu_site_id: string; amount: number; store_id: string; channel_key: string };
export function verifyAlimtalkPayment(payment: AlimtalkPayment, intent: AlimtalkPaymentIntent): "paid" | "pending" | "review" {
  if (payment.id !== intent.payment_id || payment.storeId !== intent.store_id) throw new Error("결제 대상이 일치하지 않습니다.");
  if(payment.channel?.type!=="LIVE")throw new Error("테스트 결제는 운영 알림톡 잔액으로 충전할 수 없습니다.");
  const custom = typeof payment.customData === "string" ? JSON.parse(payment.customData) : payment.customData;
  if (!custom || typeof custom !== "object" || custom.purpose !== "alimtalk_topup" || custom.owner_id !== intent.owner_id || custom.menu_site_id !== intent.menu_site_id) {
    throw new Error("알림톡 충전 결제 정보를 확인할 수 없습니다.");
  }
  if (payment.channel?.key !== intent.channel_key || payment.currency !== "KRW" || payment.amount?.total !== intent.amount) {
    throw new Error("결제 금액 또는 결제 수단이 일치하지 않습니다.");
  }
  if (typeof payment.amount.cancelled !== "number" || !Number.isSafeInteger(payment.amount.cancelled) || payment.amount.cancelled < 0 || payment.amount.cancelled>intent.amount) throw new Error("취소 금액을 확인할 수 없습니다.");
  if ((payment.status==="CANCELLED" && payment.amount.cancelled!==intent.amount) || (payment.status==="PARTIAL_CANCELLED" && payment.amount.cancelled<=0)) throw new Error("취소 상태와 취소 금액이 일치하지 않습니다.");
  if (payment.amount.cancelled > 0 || ["CANCELLED", "PARTIAL_CANCELLED"].includes(String(payment.status))) return "review";
  if (payment.status !== "PAID") return "pending";
  if (payment.amount.paid !== intent.amount) throw new Error("실제 결제 금액이 일치하지 않습니다.");
  return "paid";
}
