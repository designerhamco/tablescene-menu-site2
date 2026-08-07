import "server-only";

import { normalizeOrderManagementId, OrderManagementInputError } from "@/lib/order-management";
import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import {
  buildSalesMonthSummary,
  getKstMonthWindow,
  type SalesMonthSummary,
  type SalesSummaryItemEvent,
  type SalesSummaryOrderEvent,
} from "@/lib/sales-summary";
import { requireMenuSitePermission } from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type OrderRow = Pick<
  Database["public"]["Tables"]["menu_customer_orders"]["Row"],
  "id" | "status" | "payment_status" | "payment_method" | "created_at" | "payment_completed_at" | "total_amount"
>;

type ItemRow = Pick<
  Database["public"]["Tables"]["menu_customer_order_items"]["Row"],
  "id" | "order_id" | "item_name_snapshot" | "quantity" | "line_total_snapshot"
>;

type DatabaseError = { code?: string; message?: string };
const PAGE_SIZE = 1000;
const MAX_ROWS = 100_000;

export type SalesSummaryPageData = {
  menuSite: { id: string; name: string };
  summary: SalesMonthSummary;
};

export class SalesSummaryError extends Error {
  constructor(
    public readonly code: "INVALID_INPUT" | "DASHBOARD_UNAVAILABLE" | "MENU_SITE_NOT_FOUND" | "READ_FAILED",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "SalesSummaryError";
  }
}

function normalizeMenuSiteId(value: unknown) {
  try {
    return normalizeOrderManagementId(value);
  } catch (error) {
    if (error instanceof OrderManagementInputError) {
      throw new SalesSummaryError("INVALID_INPUT", error.message, 400);
    }
    throw error;
  }
}

function readFailed(error: DatabaseError | null) {
  console.warn("[sales-summary] read failed", {
    code: error?.code ?? "unknown",
    message: error?.message ?? "unknown",
  });
  throw new SalesSummaryError("READ_FAILED", "매출 요약을 불러오지 못했습니다.", 500);
}

async function collectPages<T>(
  loadPage: (from: number, to: number) => Promise<{ data: T[] | null; error: DatabaseError | null }>,
) {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE_SIZE) {
    const result = await loadPage(from, from + PAGE_SIZE - 1);
    if (result.error) readFailed(result.error);
    const page = result.data ?? [];
    rows.push(...page);
    if (page.length < PAGE_SIZE) return rows;
  }
  throw new SalesSummaryError("READ_FAILED", "조회 범위가 너무 큽니다. 기간을 나누어 다시 시도해 주세요.", 500);
}

async function loadPaidOrderItems({
  menuSiteId,
  orderIds,
}: {
  menuSiteId: string;
  orderIds: readonly string[];
}) {
  const supabase = createAdminClient();
  const items: ItemRow[] = [];
  const batchSize = 100;
  for (let index = 0; index < orderIds.length; index += batchSize) {
    const orderIdBatch = orderIds.slice(index, index + batchSize);
    const batch = await collectPages<ItemRow>(async (from, to) => {
      const result = await supabase
        .from("menu_customer_order_items")
        .select("id, order_id, item_name_snapshot, quantity, line_total_snapshot")
        .eq("menu_site_id", menuSiteId)
        .in("order_id", orderIdBatch)
        .order("order_id", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data: result.data as ItemRow[] | null, error: result.error };
    });
    items.push(...batch);
    if (items.length > MAX_ROWS) {
      throw new SalesSummaryError("READ_FAILED", "메뉴 판매량 조회 범위가 너무 큽니다.", 500);
    }
  }
  return items;
}

export async function getSalesSummaryDashboard(
  menuSiteIdValue: unknown,
  now = new Date(),
): Promise<SalesSummaryPageData> {
  const menuSiteId = normalizeMenuSiteId(menuSiteIdValue);
  if (!isOrderDashboardRuntimeEnabledForSite(menuSiteId)) {
    throw new SalesSummaryError(
      "DASHBOARD_UNAVAILABLE",
      "매출 요약은 주문관리 상품과 운영 활성화 전까지 안전하게 잠겨 있습니다.",
      403,
    );
  }

  await requireMenuSitePermission(menuSiteId, "sales.read");
  const supabase = createAdminClient();
  const menuSiteResult = await supabase
    .from("menu_sites")
    .select("id, name")
    .eq("id", menuSiteId)
    .maybeSingle();
  if (menuSiteResult.error) readFailed(menuSiteResult.error);
  if (!menuSiteResult.data) {
    throw new SalesSummaryError("MENU_SITE_NOT_FOUND", "메뉴판을 찾을 수 없습니다.", 404);
  }

  const window = getKstMonthWindow(now);
  const [createdRows, paidRows] = await Promise.all([
    collectPages<OrderRow>(async (from, to) => {
      const result = await supabase
        .from("menu_customer_orders")
        .select("id, status, payment_status, payment_method, created_at, payment_completed_at, total_amount")
        .eq("menu_site_id", menuSiteId)
        .gte("created_at", window.startIso)
        .lt("created_at", window.endIso)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data: result.data as OrderRow[] | null, error: result.error };
    }),
    collectPages<OrderRow>(async (from, to) => {
      const result = await supabase
        .from("menu_customer_orders")
        .select("id, status, payment_status, payment_method, created_at, payment_completed_at, total_amount")
        .eq("menu_site_id", menuSiteId)
        .in("payment_status", ["manual_paid", "paid"])
        .gte("payment_completed_at", window.startIso)
        .lt("payment_completed_at", window.endIso)
        .order("payment_completed_at", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
      return { data: result.data as OrderRow[] | null, error: result.error };
    }),
  ]);

  const paidItemRows = await loadPaidOrderItems({
    menuSiteId,
    orderIds: paidRows.map((order) => order.id),
  });

  const createdOrders: SalesSummaryOrderEvent[] = createdRows.map((order) => ({
    id: order.id,
    occurredAt: order.created_at,
    totalAmount: order.total_amount,
    status: order.status,
    paymentStatus: order.payment_status,
    paymentMethod: order.payment_method,
  }));
  const paidOrders: SalesSummaryOrderEvent[] = paidRows.flatMap((order) => (
    order.payment_completed_at
      ? [{
          id: order.id,
          occurredAt: order.payment_completed_at,
          totalAmount: order.total_amount,
          status: order.status,
          paymentStatus: order.payment_status,
          paymentMethod: order.payment_method,
        }]
      : []
  ));
  const paidOrderItems: SalesSummaryItemEvent[] = paidItemRows.map((item) => ({
    orderId: item.order_id,
    name: item.item_name_snapshot,
    quantity: item.quantity,
    lineTotal: item.line_total_snapshot,
  }));

  return {
    menuSite: menuSiteResult.data,
    summary: buildSalesMonthSummary({ now, createdOrders, paidOrders, paidOrderItems }),
  };
}
