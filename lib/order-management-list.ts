import { isCurrentOrder } from "./order-history-query";
import { ORDER_PAID_PAYMENT_STATUSES } from "./order-management";
import type { OrderDashboardOrder } from "./server/order-management-service";

export type OrderListSearchField = "number" | "menu" | "point";
export type OrderListStatus = "all" | "before" | "cooking" | "ready" | "served";

export function getOrderListPaymentFilter(paymentStatus: string) {
  return ORDER_PAID_PAYMENT_STATUSES.some(status => status === paymentStatus) ? "completed" : paymentStatus;
}

export function getOrderListGroups(orders: readonly OrderDashboardOrder[], {
  query, searchField, status, menus, payments, oldestFirst,
}: {
  query: string;
  searchField: OrderListSearchField;
  status: OrderListStatus;
  menus: ReadonlySet<string> | null;
  payments: ReadonlySet<string> | null;
  oldestFirst: boolean;
}) {
  const search = query.trim().toLocaleLowerCase("ko");
  const orderNumber = search.replace(/^#\s*/, "");
  const sorted = [...orders].sort((a, b) => {
    const comparison = Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.orderNumber - b.orderNumber || a.id.localeCompare(b.id);
    return oldestFirst ? comparison : -comparison;
  });
  const groups = new Map<string, { order: OrderDashboardOrder; items: OrderDashboardOrder["items"] }[]>();
  for (const order of sorted) {
    const stage = order.status === "received" || order.status === "accepted" ? "before" : order.status;
    if (status !== "all" && stage !== status) continue;
    if (payments && !payments.has(getOrderListPaymentFilter(order.paymentStatus))) continue;
    if (search) {
      const matches = searchField === "number" ? String(order.orderNumber).includes(orderNumber)
        : searchField === "point" ? order.tableLabel.toLocaleLowerCase("ko").includes(search)
          : order.items.some(item => item.name.toLocaleLowerCase("ko").includes(search));
      if (!matches) continue;
    }
    const items = menus ? order.items.filter(item => menus.has(item.name)) : order.items;
    if (menus && !items.length) continue;
    const key = !isCurrentOrder(order) ? `completed:${order.id}`
      : order.settlementGroupId ? `settlement:${order.settlementGroupId}` : `table:${order.tableId}`;
    const group = groups.get(key);
    const row = { order, items };
    if (group) group.push(row);
    else groups.set(key, [row]);
  }
  return [...groups].map(([key, orders]) => ({
    key,
    pointId: orders[0].order.tableId,
    settlementGroupId: key.startsWith("settlement:") ? orders[0].order.settlementGroupId : undefined,
    completed: !isCurrentOrder(orders[0].order),
    orders,
    rowCount: orders.reduce((total, row) => total + Math.max(1, row.items.length), 0),
  }));
}
