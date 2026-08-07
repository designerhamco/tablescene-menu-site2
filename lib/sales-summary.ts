const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

export type SalesSummaryOrderEvent = {
  id: string;
  occurredAt: string;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string | null;
};

export type SalesSummaryItemEvent = {
  orderId: string;
  name: string;
  quantity: number;
  lineTotal: number;
};

export type SalesSummaryDay = {
  date: string;
  orderCount: number;
  paidOrderCount: number;
  collectedAmount: number;
};

export type SalesMonthSummary = {
  year: number;
  month: number;
  startIso: string;
  endIso: string;
  today: SalesSummaryDay;
  monthTotals: {
    orderCount: number;
    paidOrderCount: number;
    collectedAmount: number;
  };
  paymentMethods: Array<{
    method: "manual_card" | "manual_cash" | "pg" | "other";
    orderCount: number;
    collectedAmount: number;
  }>;
  orderStates: {
    cancelledOrderCount: number;
    cancelledOrderAmount: number;
    unpaidOrderCount: number;
    unpaidOrderAmount: number;
  };
  topItems: Array<{
    name: string;
    quantity: number;
    collectedAmount: number;
  }>;
  days: SalesSummaryDay[];
};

function getKstParts(value: Date) {
  const shifted = new Date(value.getTime() + KST_OFFSET_MS);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function toDateKey(year: number, month: number, day: number) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getKstDateKey(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const parts = getKstParts(date);
  return toDateKey(parts.year, parts.month, parts.day);
}

export function getKstMonthWindow(now = new Date()) {
  const { year, month, day } = getKstParts(now);
  const startMs = Date.UTC(year, month - 1, 1) - KST_OFFSET_MS;
  const endMs = Date.UTC(year, month, 1) - KST_OFFSET_MS;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    year,
    month,
    day,
    startIso: new Date(startMs).toISOString(),
    endIso: new Date(endMs).toISOString(),
    daysInMonth,
  };
}

export function buildSalesMonthSummary({
  now = new Date(),
  createdOrders,
  paidOrders,
  paidOrderItems = [],
}: {
  now?: Date;
  createdOrders: readonly SalesSummaryOrderEvent[];
  paidOrders: readonly SalesSummaryOrderEvent[];
  paidOrderItems?: readonly SalesSummaryItemEvent[];
}): SalesMonthSummary {
  const window = getKstMonthWindow(now);
  const dayByKey = new Map<string, SalesSummaryDay>();

  for (let day = 1; day <= window.daysInMonth; day += 1) {
    const date = toDateKey(window.year, window.month, day);
    dayByKey.set(date, { date, orderCount: 0, paidOrderCount: 0, collectedAmount: 0 });
  }

  for (const order of createdOrders) {
    const date = getKstDateKey(order.occurredAt);
    const bucket = date ? dayByKey.get(date) : null;
    if (bucket) bucket.orderCount += 1;
  }

  const validPaidOrders: SalesSummaryOrderEvent[] = [];
  for (const order of paidOrders) {
    const date = getKstDateKey(order.occurredAt);
    const bucket = date ? dayByKey.get(date) : null;
    if (!bucket || !Number.isSafeInteger(order.totalAmount) || order.totalAmount < 0) continue;
    validPaidOrders.push(order);
    bucket.paidOrderCount += 1;
    bucket.collectedAmount += order.totalAmount;
  }

  const paidOrderIds = new Set(validPaidOrders.map((order) => order.id));
  const paymentMethodByKey = new Map<SalesMonthSummary["paymentMethods"][number]["method"], {
    orderCount: number;
    collectedAmount: number;
  }>();
  for (const order of validPaidOrders) {
    const method = order.paymentMethod === "manual_card"
      || order.paymentMethod === "manual_cash"
      || order.paymentMethod === "pg"
      ? order.paymentMethod
      : "other";
    const bucket = paymentMethodByKey.get(method) ?? { orderCount: 0, collectedAmount: 0 };
    bucket.orderCount += 1;
    bucket.collectedAmount += order.totalAmount;
    paymentMethodByKey.set(method, bucket);
  }

  const topItemByName = new Map<string, { quantity: number; collectedAmount: number }>();
  for (const item of paidOrderItems) {
    if (
      !paidOrderIds.has(item.orderId)
      || !Number.isSafeInteger(item.quantity)
      || item.quantity < 1
      || !Number.isSafeInteger(item.lineTotal)
      || item.lineTotal < 0
    ) continue;
    const name = item.name.trim() || "이름 없는 메뉴";
    const bucket = topItemByName.get(name) ?? { quantity: 0, collectedAmount: 0 };
    bucket.quantity += item.quantity;
    bucket.collectedAmount += item.lineTotal;
    topItemByName.set(name, bucket);
  }

  const days = [...dayByKey.values()];
  const todayKey = toDateKey(window.year, window.month, window.day);
  const today = dayByKey.get(todayKey) ?? {
    date: todayKey,
    orderCount: 0,
    paidOrderCount: 0,
    collectedAmount: 0,
  };

  return {
    year: window.year,
    month: window.month,
    startIso: window.startIso,
    endIso: window.endIso,
    today,
    monthTotals: days.reduce(
      (totals, item) => ({
        orderCount: totals.orderCount + item.orderCount,
        paidOrderCount: totals.paidOrderCount + item.paidOrderCount,
        collectedAmount: totals.collectedAmount + item.collectedAmount,
      }),
      { orderCount: 0, paidOrderCount: 0, collectedAmount: 0 },
    ),
    paymentMethods: (["manual_card", "manual_cash", "pg", "other"] as const).flatMap((method) => {
      const bucket = paymentMethodByKey.get(method);
      return bucket ? [{ method, ...bucket }] : [];
    }),
    orderStates: createdOrders.reduce(
      (states, order) => {
        const date = getKstDateKey(order.occurredAt);
        if (!date || !dayByKey.has(date) || !Number.isSafeInteger(order.totalAmount) || order.totalAmount < 0) return states;
        if (order.status === "cancelled") {
          states.cancelledOrderCount += 1;
          states.cancelledOrderAmount += order.totalAmount;
        } else if (order.paymentStatus === "unpaid") {
          states.unpaidOrderCount += 1;
          states.unpaidOrderAmount += order.totalAmount;
        }
        return states;
      },
      { cancelledOrderCount: 0, cancelledOrderAmount: 0, unpaidOrderCount: 0, unpaidOrderAmount: 0 },
    ),
    topItems: [...topItemByName.entries()]
      .map(([name, totals]) => ({ name, ...totals }))
      .sort((left, right) => right.quantity - left.quantity || right.collectedAmount - left.collectedAmount || left.name.localeCompare(right.name, "ko"))
      .slice(0, 10),
    days,
  };
}
