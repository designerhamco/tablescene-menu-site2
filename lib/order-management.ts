export const ORDER_STATUSES = [
  "received",
  "accepted",
  "cooking",
  "ready",
  "served",
  "cancelled",
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];
export type ManualPaymentMethod = "manual_card" | "manual_cash";

const ORDER_STATUS_TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  received: ["accepted"],
  accepted: ["cooking"],
  cooking: ["ready"],
  ready: ["served"],
  served: [],
  cancelled: [],
};

export class OrderManagementInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderManagementInputError";
  }
}

export function normalizeOrderManagementId(value: unknown) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(normalized)) {
    throw new OrderManagementInputError("올바른 주문 정보가 필요합니다.");
  }
  return normalized;
}

export function isOrderStatus(value: unknown): value is OrderStatus {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value);
}

export function assertOrderStatusTransition(current: unknown, next: unknown) {
  if (!isOrderStatus(current) || !isOrderStatus(next) || !ORDER_STATUS_TRANSITIONS[current].includes(next)) {
    throw new OrderManagementInputError("현재 단계에서 요청한 주문 상태로 변경할 수 없습니다.");
  }
  return next;
}

export function normalizeCancellationReason(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (normalized.length < 1 || normalized.length > 500) {
    throw new OrderManagementInputError("취소 사유를 1자 이상 500자 이하로 입력해 주세요.");
  }
  return normalized;
}

export function normalizeManualPaymentMethod(value: unknown): ManualPaymentMethod {
  if (value !== "manual_card" && value !== "manual_cash") {
    throw new OrderManagementInputError("카드 단말기 또는 현금 결제를 선택해 주세요.");
  }
  return value;
}

export function canCancelUnpaidOrder(status: unknown, paymentStatus: unknown) {
  return isOrderStatus(status)
    && status !== "served"
    && status !== "cancelled"
    && paymentStatus === "unpaid";
}

export function canMarkManualPayment(status: unknown, paymentStatus: unknown) {
  return isOrderStatus(status) && status !== "cancelled" && paymentStatus === "unpaid";
}

export function getNextOrderStatus(status: unknown): OrderStatus | null {
  if (!isOrderStatus(status)) return null;
  return ORDER_STATUS_TRANSITIONS[status][0] ?? null;
}
