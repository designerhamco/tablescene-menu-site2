"use client";

import { useEffect, useEffectEvent, useState } from "react";
import type { OperationRecordSources } from "@/lib/all-menu-operations";
import { applyOrderStatusUpdate, compareOrderUpdateTimes, subscribeOrderStatusUpdates, type OrderStatusUpdate } from "@/lib/order-status-update";
import type { OrderDashboardOrder } from "@/lib/server/order-management-service";

export function useLiveOrderStatuses(
  orders: OrderDashboardOrder[],
  menuSiteId: string,
  recordSources: OperationRecordSources | undefined,
  history: boolean,
) {
  const [updates, setUpdates] = useState<ReadonlyMap<string, OrderStatusUpdate>>(() => new Map());
  const orderSite = (orderId: string) => recordSources ? recordSources[orderId]?.menuSiteId : menuSiteId;
  const receive = useEffectEvent((update: OrderStatusUpdate) => {
    if (history || orderSite(update.orderId) !== update.menuSiteId) return;
    const order = orders.find(order => order.id === update.orderId);
    if (!order || compareOrderUpdateTimes(update.updatedAt, order.updatedAt) <= 0) return;
    setUpdates(previous => {
      const latest = previous.get(update.orderId);
      if (latest && latest.menuSiteId === update.menuSiteId
        && compareOrderUpdateTimes(update.updatedAt, latest.updatedAt) <= 0) return previous;
      const next = new Map(orders.flatMap(order => {
        const saved = previous.get(order.id);
        return saved && compareOrderUpdateTimes(saved.updatedAt, order.updatedAt) > 0 ? [[order.id, saved] as const] : [];
      }));
      next.set(update.orderId, update);
      return next;
    });
  });
  useEffect(() => subscribeOrderStatusUpdates(update => receive(update)), []);

  if (history) return orders;
  // Keep the open order visible while the server reconciles the current list.
  return orders.map(order => {
    const update = updates.get(order.id);
    return update && orderSite(order.id) === update.menuSiteId ? applyOrderStatusUpdate(order, update) : order;
  });
}
