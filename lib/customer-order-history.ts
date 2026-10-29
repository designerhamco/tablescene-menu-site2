import type { OrderStatus } from "./order-management";

export const CUSTOMER_ORDER_STEPS = ["received", "accepted", "cooking", "ready", "served"] as const;
export const CUSTOMER_ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  received: "주문 접수", accepted: "조리 준비", cooking: "조리 중",
  ready: "서빙 준비", served: "서빙 완료", cancelled: "주문 취소",
};
export type CustomerOrderSnapshot = {
  cartSignature?: string;
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
// The visit-scoped cancellation RPC rechecks this under the saved order lock.
export function canCustomerCancelOrder(status: unknown, paymentStatus: unknown) {
  return status === "received" && paymentStatus === "unpaid";
}
export function getCustomerPaymentLabel(status: string) {
  switch (status) {
    case "unpaid": return "결제 전";
    case "paid": case "manual_paid": return "결제 완료";
    case "cancelled": return "결제 취소";
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

/** Fail closed for live data; preview storage retains its tolerant legacy parser. */
export function parseCustomerOrderHistory(value: unknown): {orders: CustomerOrderSnapshot[]; hasMore: boolean} {
  if (!value || typeof value !== "object" || !("orders" in value) || !("hasMore" in value)
    || !Array.isArray(value.orders) || value.orders.length > 100 || typeof value.hasMore !== "boolean") throw new Error("Invalid order history");
  const orders = parsePreviewOrderHistory(JSON.stringify(value.orders));
  if (orders.length !== value.orders.length || new Set(orders.map(order => order.id)).size !== orders.length
    || orders.some(order => !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(order.id) || !Number.isSafeInteger(order.orderNumber) || order.orderNumber < 1
      || order.example || order.lines.length > 20 || order.lines.some(line => line.quantity > 20 || line.options.length > 20))) throw new Error("Invalid order history");
  return {orders: orders.map(order => ({id: order.id, orderNumber: order.orderNumber, tableLabel: order.tableLabel,
    createdAt: order.createdAt, status: order.status, paymentStatus: order.paymentStatus, totalAmount: order.totalAmount,
    lines: order.lines.map(line => ({name: line.name, quantity: line.quantity, unitPrice: line.unitPrice, options: [...line.options]})),
  })), hasMore: value.hasMore};
}
