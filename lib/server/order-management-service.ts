import "server-only";
import {defaultOrderHistoryFilters, normalizeOrderHistory, orderHistoryBounds, orderCursorPredicate, encodeOrderCursor, ORDER_HISTORY_PAGE_SIZE, OrderHistoryInputError, type OrderHistoryFilters, type OrderHistorySearch, type OrderCursor} from "@/lib/order-history-query";
import { hasPaidTableOperationsAccess } from "@/lib/server/table-operations-eligibility-service";

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
  tableId: string;
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

export type OrderDashboardView = {
  kind: "current" | "history"; filters: OrderHistoryFilters; error?: string;
  totalCount: number | null; olderCursor: string | null; newerCursor: string | null;
  tables: Array<{id:string;label:string;archived:boolean}>;
};
export type OrderDashboardPageData = {
  view?: OrderDashboardView;
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

async function assertDashboardEnabled(menuSiteId: string) {
  if (!isOrderDashboardRuntimeEnabledForSite(menuSiteId) || !await hasPaidTableOperationsAccess(menuSiteId)) {
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

export async function listOrderDashboard(menuSiteIdValue: unknown, search: OrderHistorySearch = {}): Promise<OrderDashboardPageData> {
  const menuSiteId = normalizedId(menuSiteIdValue);
  const context = await requireMenuSitePermission(menuSiteId, "order.read");
  await assertDashboardEnabled(menuSiteId);
  const supabase = createAdminClient();
  const menuSiteResult = await supabase
    .from("menu_sites")
    .select("id, name")
    .eq("id", menuSiteId)
    .maybeSingle();
  if (menuSiteResult.error) mapReadError(menuSiteResult.error);
  if (!menuSiteResult.data) throw new OrderManagementError("ORDER_NOT_FOUND", "메뉴판을 찾을 수 없습니다.", 404);

  const history = search.tab === "history";
  let request: ReturnType<typeof normalizeOrderHistory> | undefined, queryError: string | undefined;
  if (history) try {request = normalizeOrderHistory(search);} catch (error) {if (!(error instanceof OrderHistoryInputError)) throw error;queryError=error.message;}
  const view: OrderDashboardView = {kind:history?"history":"current", filters:request?.filters??defaultOrderHistoryFilters(), error:queryError, totalCount:0, olderCursor:null, newerCursor:null, tables:[]};
  const columns = "id, order_number, menu_table_id, status, payment_status, payment_method, request_text, total_amount, currency, status_updated_by, payment_completed_by, accepted_at, cooking_at, ready_at, served_at, cancelled_at, cancellation_reason, payment_completed_at, created_at, updated_at";
  let orders: OrderRow[] = [];
  if (history) {
    for(let offset=0;;offset+=500){
      const choices=await supabase.from("menu_tables").select("id,label,point_kind,status").eq("menu_site_id",menuSiteId).order("id",{ascending:true}).range(offset,offset+499);
      if(choices.error)mapReadError(choices.error);
      const batch=choices.data??[];view.tables.push(...batch.map(point=>({id:point.id,label:point.point_kind==="kiosk"&&!point.label.startsWith("키오스크")?`키오스크 · ${point.label}`:point.label,archived:point.status==="archived"})));
      if(batch.length<500)break;
    }
    view.tables.sort((a,b)=>a.label.localeCompare(b.label,"ko-KR"));
    if(request&&!queryError){
      const {filters,cursor,direction}=request,bounds=orderHistoryBounds(filters);
      const filtered = () => {
        let query=supabase.from("menu_customer_orders").select(columns,{count:"exact"}).eq("menu_site_id",menuSiteId).gte("created_at",bounds.from).lt("created_at",bounds.until);
        if(filters.status!=="all")query=query.eq("status",filters.status);
        if(filters.paymentStatus!=="all")query=query.eq("payment_status",filters.paymentStatus);
        if(filters.tableId)query=query.eq("menu_table_id",filters.tableId);
        if(filters.orderNumber)query=query.eq("order_number",Number(filters.orderNumber));
        return query;
      };
      let pageQuery=filtered();
      if(cursor)pageQuery=pageQuery.or(orderCursorPredicate(cursor,direction));
      const [page,count] = await Promise.all([
        pageQuery.order("created_at",{ascending:direction==="newer"}).order("id",{ascending:direction==="newer"}).limit(ORDER_HISTORY_PAGE_SIZE+1),
        // Count the complete filtered range, not only the current cursor page.
        cursor?filtered().limit(0):Promise.resolve(null),
      ]);
      if(page.error)mapReadError(page.error);if(count?.error)mapReadError(count.error);
      view.totalCount=count?.count??page.count;
      const rows=(page.data??[]) as unknown as OrderRow[], extra=rows.length>ORDER_HISTORY_PAGE_SIZE;
      orders=rows.slice(0,ORDER_HISTORY_PAGE_SIZE);if(direction==="newer")orders.reverse();
      if(orders.length){
        if(direction==="older"?extra:Boolean(cursor))view.olderCursor=encodeOrderCursor(orders[orders.length-1]);
        if(direction==="newer"?extra:Boolean(cursor))view.newerCursor=encodeOrderCursor(orders[0]);
      }
    }
  } else {
    // Stable keyset batches include every outstanding order, regardless of age.
    const asOf=new Date().toISOString();let cursor:OrderCursor|null=null;
    for(;;){
      let query=supabase.from("menu_customer_orders").select(columns).eq("menu_site_id",menuSiteId).neq("status","cancelled").lte("created_at",asOf);
      const active="or(status.neq.served,payment_status.eq.unpaid)";
      query=query.or(cursor?`and(${active},or(${orderCursorPredicate(cursor,"newer")}))`:`status.neq.served,payment_status.eq.unpaid`);
      const result=await query.order("created_at",{ascending:true}).order("id",{ascending:true}).limit(200);
      if(result.error)mapReadError(result.error);
      const batch=(result.data??[]) as unknown as OrderRow[];orders.push(...batch);
      if(batch.length<200)break;
      const last=batch[batch.length-1];cursor={createdAt:last.created_at,id:last.id};
    }
    view.totalCount=orders.length;
  }
  const orderIds = orders.map((order) => order.id);
  const tableIds = [...new Set(orders.map((order) => order.menu_table_id))];

  const chunks = (ids:string[]) => Array.from({length:Math.ceil(ids.length/100)},(_,index)=>ids.slice(index*100,index*100+100));
  const [tables,items] = await Promise.all([
    (async()=>{const rows:Array<{id:string;label:string;point_kind:string}>=[];for(const ids of chunks(tableIds)){
      const result=await supabase.from("menu_tables").select("id,label,point_kind").eq("menu_site_id",menuSiteId).in("id",ids);
      if(result.error)mapReadError(result.error);rows.push(...(result.data??[]));
    }return rows;})(),
    (async()=>{const rows:ItemRow[]=[];for(const ids of chunks(orderIds))for(let offset=0;;offset+=500){
      const result=await supabase.from("menu_customer_order_items").select("id, order_id, item_name_snapshot, base_price_snapshot, option_price_snapshot, unit_price_snapshot, quantity, line_total_snapshot, display_order").eq("menu_site_id",menuSiteId).in("order_id",ids).order("display_order",{ascending:true}).order("id",{ascending:true}).range(offset,offset+499);
      if(result.error)mapReadError(result.error);const batch=result.data??[];rows.push(...batch);if(batch.length<500)break;
    }return rows;})(),
  ]);
  const options:OptionRow[]=[];
  for(const ids of chunks(items.map(item=>item.id)))for(let offset=0;;offset+=500){
    const result=await supabase.from("menu_customer_order_item_options").select("order_item_id, group_name_snapshot, value_name_snapshot, price_delta_snapshot, display_order").eq("menu_site_id",menuSiteId).in("order_item_id",ids).order("display_order",{ascending:true}).order("id",{ascending:true}).range(offset,offset+499);
    if(result.error)mapReadError(result.error);const batch=result.data??[];options.push(...batch);if(batch.length<500)break;
  }
  const tableLabelById = new Map(tables.map(table=>[table.id,table.point_kind==="kiosk"&&!table.label.startsWith("키오스크")?`키오스크 · ${table.label}`:table.label]));
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
    view,
    menuSite: menuSiteResult.data,
    permissions: {
      canManage: hasMenuSitePermission(context, "order.manage"),
      canCancelUnpaid: hasMenuSitePermission(context, "order.cancel_unpaid"),
      canMarkManualPayment: hasMenuSitePermission(context, "payment.manual"),
    },
    orders: orders.map((order) => ({
      id: order.id,
      orderNumber: order.order_number,
      tableId: order.menu_table_id,
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
  const { context, supabase } = await requireMenuSiteWriteAccess(
    menuSiteId,
    "order.manage",
    "order_status_management",
  );
  await assertDashboardEnabled(menuSiteId);
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
  const { context, supabase } = await requireMenuSiteWriteAccess(
    menuSiteId,
    "order.cancel_unpaid",
    "order_unpaid_cancellation",
  );
  await assertDashboardEnabled(menuSiteId);
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
  const { context, supabase } = await requireMenuSiteWriteAccess(
    menuSiteId,
    "payment.manual",
    "order_manual_payment",
  );
  await assertDashboardEnabled(menuSiteId);
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
