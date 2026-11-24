import type { OrderDashboardOrder } from "./server/order-management-service";

export type OrderListSearchField = "number" | "menu" | "point";
export type OrderListStatus = "all" | "before" | "cooking" | "ready" | "served";

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
    if (payments && !payments.has(order.paymentStatus)) continue;
    if (search) {
      const matches = searchField === "number" ? String(order.orderNumber).includes(orderNumber)
        : searchField === "point" ? order.tableLabel.toLocaleLowerCase("ko").includes(search)
          : order.items.some(item => item.name.toLocaleLowerCase("ko").includes(search));
      if (!matches) continue;
    }
    const items = menus ? order.items.filter(item => menus.has(item.name)) : order.items;
    if (menus && !items.length) continue;
    const group = groups.get(order.tableId);
    const row = { order, items };
    if (group) group.push(row);
    else groups.set(order.tableId, [row]);
  }
  return [...groups].map(([pointId, orders]) => ({
    pointId, orders, rowCount: orders.reduce((total, row) => total + Math.max(1, row.items.length), 0),
  }));
}
