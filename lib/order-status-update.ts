import { canCancelUnpaidOrder, canMarkManualPayment, getNextOrderStatus, isOrderStatus, type OrderStatus } from "@/lib/order-management";
import type { OrderDashboardOrder } from "@/lib/server/order-management-service";

const eventName = "artimenu:order-status-update";

export type OrderStatusUpdate = {
  menuSiteId: string;
  orderId: string;
  status: OrderStatus;
  updatedAt: string;
};

export function readOrderStatusUpdate(payload: unknown): OrderStatusUpdate | null {
  if (!payload || typeof payload !== "object" || !("orderUpdate" in payload)) return null;
  const { orderUpdate } = payload;
  if (!("menuSiteId" in payload) || typeof payload.menuSiteId !== "string"
    || !orderUpdate || typeof orderUpdate !== "object"
    || !("orderId" in orderUpdate) || typeof orderUpdate.orderId !== "string"
    || !("status" in orderUpdate) || !isOrderStatus(orderUpdate.status)
    || !("updatedAt" in orderUpdate) || typeof orderUpdate.updatedAt !== "string"
    || !Number.isFinite(Date.parse(orderUpdate.updatedAt))) return null;
  return { menuSiteId: payload.menuSiteId, orderId: orderUpdate.orderId, status: orderUpdate.status, updatedAt: orderUpdate.updatedAt };
}

export function compareOrderUpdateTimes(left: string, right: string) {
  const milliseconds = Date.parse(left) - Date.parse(right);
  if (milliseconds) return milliseconds;
  // PostgreSQL timestamps can differ within the same JavaScript millisecond.
  const fraction = (value: string) => Number((value.match(/\.(\d+)/)?.[1] ?? "").padEnd(6, "0"));
  return fraction(left) - fraction(right);
}

export function applyOrderStatusUpdate(order: OrderDashboardOrder, update: OrderStatusUpdate): OrderDashboardOrder {
  if (compareOrderUpdateTimes(update.updatedAt, order.updatedAt) <= 0) return order;
  return {
    ...order,
    status: update.status,
    updatedAt: update.updatedAt,
    nextStatus: update.status === "cooking" ? null : getNextOrderStatus(update.status),
    canCancelUnpaid: canCancelUnpaidOrder(update.status, order.paymentStatus),
    canMarkManualPayment: !order.settlementGroupId && canMarkManualPayment(update.status, order.paymentStatus),
  };
}

export function publishOrderStatusUpdate(update: OrderStatusUpdate) {
  window.dispatchEvent(new CustomEvent<OrderStatusUpdate>(eventName, { detail: update }));
}

export function subscribeOrderStatusUpdates(receive: (update: OrderStatusUpdate) => void) {
  const listener = (event: Event) => receive((event as CustomEvent<OrderStatusUpdate>).detail);
  window.addEventListener(eventName, listener);
  return () => window.removeEventListener(eventName, listener);
}
