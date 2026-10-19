import type { OrderStatus } from "./order-management";

export const CUSTOMER_ORDER_STEPS = ["received", "accepted", "cooking", "ready", "served"] as const;
export const CUSTOMER_ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "주문 접수", accepted: "조리 준비", cooking: "조리 중",
  ready: "서빙 준비", served: "서빙 완료", cancelled: "주문 취소",
};
export type CustomerOrderSnapshot = {
  id: string;
  orderNumber: number;
  tableLabel: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: string;
  totalAmount: number;
  example?: boolean;
  lines: { name: string; quantity: number; options: string[]; unitPrice: number }[];
};

// Customer self-cancellation is stricter than the staff cancellation policy.
// A future public endpoint must recheck this atomically against the saved order.
export function canCustomerCancelOrder(status: unknown, paymentStatus: unknown) {
  return status === "received" && paymentStatus === "unpaid";
}
export function getCustomerPaymentLabel(status: string) {
  switch (status) {
    case "unpaid": return "결제 전";
    case "paid": case "manual_paid": return "결제 완료";
    case "refunded": return "환불 완료";
    case "partially_refunded": return "부분 환불";
    default: return "결제 상태 확인 필요";
  }
}

export function parsePreviewOrderHistory(raw: string | null): CustomerOrderSnapshot[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value.filter((order): order is CustomerOrderSnapshot => {
      if (!order || typeof order !== "object") return false;
      return typeof order.id === "string" && Number.isInteger(order.orderNumber)
        && typeof order.tableLabel === "string" && typeof order.createdAt === "string"
        && Number.isFinite(Date.parse(order.createdAt))
        && Object.hasOwn(CUSTOMER_ORDER_STATUS_LABELS, order.status)
        && typeof order.paymentStatus === "string"
        && Number.isFinite(order.totalAmount) && order.totalAmount >= 0
        && Array.isArray(order.lines) && order.lines.length > 0
        && order.lines.every((line: CustomerOrderSnapshot["lines"][number]) => line
          && typeof line.name === "string" && Number.isInteger(line.quantity) && line.quantity > 0
          && Number.isFinite(line.unitPrice) && line.unitPrice >= 0
          && Array.isArray(line.options) && line.options.every(option => typeof option === "string"));
    });
  } catch { return []; }
}
