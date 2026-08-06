import "server-only";

import {
  assertOrderStatusTransition,
  canCancelUnpaidOrder,
  canMarkManualPayment,
  getNextOrderStatus,
  normalizeCancellationReason,
  normalizeManualPaymentMethod,
  normalizeOrderManagementId,
  OrderManagementInputError,
  type ManualPaymentMethod,
  type OrderStatus,
} from "@/lib/order-management";
import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { hasMenuSitePermission } from "@/lib/menu-site-permissions";
import {
  requireMenuSitePermission,
  requireMenuSiteWriteAccess,
} from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/lib/supabase/types";

type OrderRow = Pick<
  Database["public"]["Tables"]["menu_customer_orders"]["Row"],
  | "id"
  | "order_number"
  | "menu_table_id"
  | "status"
  | "payment_status"
  | "payment_method"
  | "request_text"
  | "total_amount"
  | "currency"
  | "status_updated_by"
  | "payment_completed_by"
  | "accepted_at"
  | "cooking_at"
  | "ready_at"
  | "served_at"
  | "cancelled_at"
  | "cancellation_reason"
  | "payment_completed_at"
  | "created_at"
  | "updated_at"
>;

type ItemRow = Pick<
  Database["public"]["Tables"]["menu_customer_order_items"]["Row"],
  | "id"
  | "order_id"
  | "item_name_snapshot"
  | "base_price_snapshot"
  | "option_price_snapshot"
  | "unit_price_snapshot"
  | "quantity"
  | "line_total_snapshot"
  | "display_order"
>;

type OptionRow = Pick<
  Database["public"]["Tables"]["menu_customer_order_item_options"]["Row"],
  | "order_item_id"
  | "group_name_snapshot"
  | "value_name_snapshot"
  | "price_delta_snapshot"
  | "display_order"
>;

export type OrderDashboardItem = {
  id: string;
  name: string;
  basePrice: number;
  optionPrice: number;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  options: Array<{
    groupName: string;
    valueName: string;
    priceDelta: number;
  }>;
};

export type OrderDashboardOrder = {
  id: string;
  orderNumber: number;
  tableLabel: string;
  status: string;
  nextStatus: OrderStatus | null;
  paymentStatus: string;
  paymentMethod: string | null;
  requestText: string | null;
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  statusUpdatedBy: string | null;
  paymentCompletedBy: string | null;
  paymentCompletedAt: string | null;
  cancellationReason: string | null;
  canCancelUnpaid: boolean;
  canMarkManualPayment: boolean;
  items: OrderDashboardItem[];
};

export type OrderDashboardPageData = {
  menuSite: { id: string; name: string };
  permissions: {
    canManage: boolean;
    canCancelUnpaid: boolean;
    canMarkManualPayment: boolean;
  };
  orders: OrderDashboardOrder[];
};

type DatabaseError = { code?: string; message?: string; details?: string; hint?: string };

export class OrderManagementError extends Error {
  constructor(
    public readonly code:
      | "INVALID_INPUT"
      | "DASHBOARD_UNAVAILABLE"
      | "ORDER_NOT_FOUND"
      | "ORDER_CONFLICT"
      | "ORDER_READ_FAILED"
      | "ORDER_UPDATE_FAILED",
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "OrderManagementError";
  }
}

function normalizedId(value: unknown) {
  try {
    return normalizeOrderManagementId(value);
  } catch (error) {
    if (error instanceof OrderManagementInputError) {
      throw new OrderManagementError("INVALID_INPUT", error.message, 400);
    }
    throw error;
  }
}

function normalizedCancellationReason(value: unknown) {
  try {
    return normalizeCancellationReason(value);
  } catch (error) {
    if (error instanceof OrderManagementInputError) {
      throw new OrderManagementError("INVALID_INPUT", error.message, 400);
    }
    throw error;
  }
}

function normalizedPaymentMethod(value: unknown) {
  try {
    return normalizeManualPaymentMethod(value);
  } catch (error) {
    if (error instanceof OrderManagementInputError) {
      throw new OrderManagementError("INVALID_INPUT", error.message, 400);
    }
    throw error;
  }
}

function assertDashboardEnabled(menuSiteId: string) {
  if (!isOrderDashboardRuntimeEnabledForSite(menuSiteId)) {
    throw new OrderManagementError(
      "DASHBOARD_UNAVAILABLE",
      "주문관리는 상품 및 운영 활성화 전까지 안전하게 잠겨 두었습니다.",
      403,
    );
  }
}

function mapReadError(error: DatabaseError | null) {
  console.warn("[order-dashboard] read failed", {
    code: error?.code ?? "unknown",
    message: error?.message ?? "unknown",
  });
  throw new OrderManagementError("ORDER_READ_FAILED", "주문 정보를 불러오지 못했습니다.", 500);
}

function mapUpdateError(error: DatabaseError | null) {
  console.warn("[order-dashboard] update failed", {
    code: error?.code ?? "unknown",
    message: error?.message ?? "unknown",
  });
  throw new OrderManagementError("ORDER_UPDATE_FAILED", "주문 상태를 변경하지 못했습니다.", 500);
}

async function loadOrderForMutation(menuSiteId: string, orderId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("menu_customer_orders")
    .select("id, status, payment_status")
    .eq("menu_site_id", menuSiteId)
    .eq("id", orderId)
    .maybeSingle();
  if (error) mapUpdateError(error);
  if (!data) throw new OrderManagementError("ORDER_NOT_FOUND", "주문을 찾을 수 없습니다.", 404);
  return data;
}

function assertUpdated<T>(data: T | null) {
  if (!data) {
    throw new OrderManagementError(
      "ORDER_CONFLICT",
      "다른 사용자가 주문을 먼저 변경했습니다. 새로고침 후 다시 확인해 주세요.",
      409,
    );
  }
  return data;
}

export async function listOrderDashboard(menuSiteIdValue: unknown): Promise<OrderDashboardPageData> {
  const menuSiteId = normalizedId(menuSiteIdValue);
  assertDashboardEnabled(menuSiteId);
  const context = await requireMenuSitePermission(menuSiteId, "order.read");
  const supabase = createAdminClient();
  const menuSiteResult = await supabase
    .from("menu_sites")
    .select("id, name")
    .eq("id", menuSiteId)
    .maybeSingle();
  if (menuSiteResult.error) mapReadError(menuSiteResult.error);
  if (!menuSiteResult.data) throw new OrderManagementError("ORDER_NOT_FOUND", "메뉴판을 찾을 수 없습니다.", 404);

  const ordersResult = await supabase
    .from("menu_customer_orders")
    .select("id, order_number, menu_table_id, status, payment_status, payment_method, request_text, total_amount, currency, status_updated_by, payment_completed_by, accepted_at, cooking_at, ready_at, served_at, cancelled_at, cancellation_reason, payment_completed_at, created_at, updated_at")
    .eq("menu_site_id", menuSiteId)
    .order("created_at", { ascending: false })
    .limit(100);
  if (ordersResult.error) mapReadError(ordersResult.error);
  const orders = (ordersResult.data ?? []) as OrderRow[];
  const orderIds = orders.map((order) => order.id);
  const tableIds = [...new Set(orders.map((order) => order.menu_table_id))];

  const [tablesResult, itemsResult] = await Promise.all([
    tableIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase.from("menu_tables").select("id, label").eq("menu_site_id", menuSiteId).in("id", tableIds),
    orderIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : supabase
          .from("menu_customer_order_items")
          .select("id, order_id, item_name_snapshot, base_price_snapshot, option_price_snapshot, unit_price_snapshot, quantity, line_total_snapshot, display_order")
          .eq("menu_site_id", menuSiteId)
          .in("order_id", orderIds)
          .order("display_order", { ascending: true }),
  ]);
  if (tablesResult.error) mapReadError(tablesResult.error);
  if (itemsResult.error) mapReadError(itemsResult.error);
  const items = (itemsResult.data ?? []) as ItemRow[];
  const itemIds = items.map((item) => item.id);
  const optionsResult = itemIds.length === 0
    ? { data: [], error: null }
    : await supabase
        .from("menu_customer_order_item_options")
        .select("order_item_id, group_name_snapshot, value_name_snapshot, price_delta_snapshot, display_order")
        .eq("menu_site_id", menuSiteId)
        .in("order_item_id", itemIds)
        .order("display_order", { ascending: true });
  if (optionsResult.error) mapReadError(optionsResult.error);
  const options = (optionsResult.data ?? []) as OptionRow[];

  const tableLabelById = new Map((tablesResult.data ?? []).map((table) => [table.id, table.label]));
  const optionsByItemId = new Map<string, OptionRow[]>();
  for (const option of options) {
    const bucket = optionsByItemId.get(option.order_item_id) ?? [];
    bucket.push(option);
    optionsByItemId.set(option.order_item_id, bucket);
  }
  const itemsByOrderId = new Map<string, ItemRow[]>();
  for (const item of items) {
    const bucket = itemsByOrderId.get(item.order_id) ?? [];
    bucket.push(item);
    itemsByOrderId.set(item.order_id, bucket);
  }

  return {
    menuSite: menuSiteResult.data,
    permissions: {
      canManage: hasMenuSitePermission(context, "order.manage"),
      canCancelUnpaid: hasMenuSitePermission(context, "order.cancel_unpaid"),
      canMarkManualPayment: hasMenuSitePermission(context, "payment.manual"),
    },
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      tableLabel: tableLabelById.get(order.menu_table_id) ?? "알 수 없는 테이블",
      status: order.status,
      nextStatus: getNextOrderStatus(order.status),
      paymentStatus: order.payment_status,
      paymentMethod: order.payment_method,
      requestText: order.request_text,
      totalAmount: order.total_amount,
      currency: order.currency,
      createdAt: order.created_at,
      updatedAt: order.updated_at,
      statusUpdatedBy: order.status_updated_by,
      paymentCompletedBy: order.payment_completed_by,
      paymentCompletedAt: order.payment_completed_at,
      cancellationReason: order.cancellation_reason,
      canCancelUnpaid: canCancelUnpaidOrder(order.status, order.payment_status),
      canMarkManualPayment: canMarkManualPayment(order.status, order.payment_status),
      items: (itemsByOrderId.get(order.id) ?? []).map((item) => ({
        id: item.id,
        name: item.item_name_snapshot,
        basePrice: item.base_price_snapshot,
        optionPrice: item.option_price_snapshot,
        unitPrice: item.unit_price_snapshot,
        quantity: item.quantity,
        lineTotal: item.line_total_snapshot,
        options: (optionsByItemId.get(item.id) ?? []).map((option) => ({
          groupName: option.group_name_snapshot,
          valueName: option.value_name_snapshot,
          priceDelta: option.price_delta_snapshot,
        })),
      })),
    })),
  };
}

export async function transitionOrderStatus({
  menuSiteId: menuSiteIdValue,
  orderId: orderIdValue,
  nextStatus,
}: {
  menuSiteId: unknown;
  orderId: unknown;
  nextStatus: unknown;
}) {
  const menuSiteId = normalizedId(menuSiteIdValue);
  const orderId = normalizedId(orderIdValue);
  assertDashboardEnabled(menuSiteId);
  const { context, supabase } = await requireMenuSiteWriteAccess(
    menuSiteId,
    "order.manage",
    "order_status_management",
  );
  const current = await loadOrderForMutation(menuSiteId, orderId);
  let normalizedNext: OrderStatus;
  try {
    normalizedNext = assertOrderStatusTransition(current.status, nextStatus);
  } catch (error) {
    if (error instanceof OrderManagementInputError) {
      throw new OrderManagementError("INVALID_INPUT", error.message, 400);
    }
    throw error;
  }
  const now = new Date().toISOString();
  const update: Database["public"]["Tables"]["menu_customer_orders"]["Update"] = {
    status: normalizedNext,
    status_updated_by: context.actorUserId,
  };
  if (normalizedNext === "accepted") update.accepted_at = now;
  else if (normalizedNext === "cooking") update.cooking_at = now;
  else if (normalizedNext === "ready") update.ready_at = now;
  else if (normalizedNext === "served") update.served_at = now;
  else throw new OrderManagementError("INVALID_INPUT", "올바른 다음 주문 상태가 필요합니다.", 400);
  const { data, error } = await supabase
    .from("menu_customer_orders")
    .update(update)
    .eq("menu_site_id", menuSiteId)
    .eq("id", orderId)
    .eq("status", current.status)
    .select("id, status")
    .maybeSingle();
  if (error) mapUpdateError(error);
  return assertUpdated(data);
}

export async function cancelUnpaidOrder({
  menuSiteId: menuSiteIdValue,
  orderId: orderIdValue,
  reason,
}: {
  menuSiteId: unknown;
  orderId: unknown;
  reason: unknown;
}) {
  const menuSiteId = normalizedId(menuSiteIdValue);
  const orderId = normalizedId(orderIdValue);
  const cancellationReason = normalizedCancellationReason(reason);
  assertDashboardEnabled(menuSiteId);
  const { context, supabase } = await requireMenuSiteWriteAccess(
    menuSiteId,
    "order.cancel_unpaid",
    "order_unpaid_cancellation",
  );
  const current = await loadOrderForMutation(menuSiteId, orderId);
  if (!canCancelUnpaidOrder(current.status, current.payment_status)) {
    throw new OrderManagementError("ORDER_CONFLICT", "미결제·미제공 주문만 취소할 수 있습니다.", 409);
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("menu_customer_orders")
    .update({
      status: "cancelled",
      status_updated_by: context.actorUserId,
      cancelled_at: now,
      cancellation_reason: cancellationReason,
    })
    .eq("menu_site_id", menuSiteId)
    .eq("id", orderId)
    .eq("status", current.status)
    .eq("payment_status", "unpaid")
    .select("id, status")
    .maybeSingle();
  if (error) mapUpdateError(error);
  return assertUpdated(data);
}

export async function markOrderManualPayment({
  menuSiteId: menuSiteIdValue,
  orderId: orderIdValue,
  method,
}: {
  menuSiteId: unknown;
  orderId: unknown;
  method: ManualPaymentMethod | unknown;
}) {
  const menuSiteId = normalizedId(menuSiteIdValue);
  const orderId = normalizedId(orderIdValue);
  const paymentMethod = normalizedPaymentMethod(method);
  assertDashboardEnabled(menuSiteId);
  const { context, supabase } = await requireMenuSiteWriteAccess(
    menuSiteId,
    "payment.manual",
    "order_manual_payment",
  );
  const current = await loadOrderForMutation(menuSiteId, orderId);
  if (!canMarkManualPayment(current.status, current.payment_status)) {
    throw new OrderManagementError("ORDER_CONFLICT", "취소되지 않은 미결제 주문만 수동 결제 완료로 표시할 수 있습니다.", 409);
  }
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("menu_customer_orders")
    .update({
      payment_status: "manual_paid",
      payment_method: paymentMethod,
      payment_completed_at: now,
      payment_completed_by: context.actorUserId,
    })
    .eq("menu_site_id", menuSiteId)
    .eq("id", orderId)
    .eq("payment_status", "unpaid")
    .neq("status", "cancelled")
    .select("id, payment_status, payment_method")
    .maybeSingle();
  if (error) mapUpdateError(error);
  return assertUpdated(data);
}
