import "server-only";
import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";
import { isUuid, isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";
import { parseCustomerOrderHistory } from "@/lib/customer-order-history";
import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import type { ResolvedTableVisitSession } from "@/lib/server/table-visit-session-service";
import { createAdminClient } from "@/lib/supabase/admin";

type Visit = ResolvedTableVisitSession;
export class CustomerOrderHistoryError extends Error {
  constructor(public readonly code: "INVALID_INPUT" | "UNAVAILABLE" | "SESSION_EXPIRED" | "NOT_FOUND" | "CONFLICT" | "READ_FAILED" | "UPDATE_FAILED", message: string, public readonly status: number) {
    super(message); this.name = "CustomerOrderHistoryError";
  }
}
function normalizedId(value: unknown) {
  if (!isUuid(value)) throw new CustomerOrderHistoryError("INVALID_INPUT", "주문 정보를 다시 확인해 주세요.", 400);
  return value.toLowerCase();
}
async function requireVisitAccess(menuSiteId: string, visit: Visit) {
  if (menuSiteId !== visit.menuSiteId || !isPostpayOrderRuntimeEnabledForSite(menuSiteId)) {
    throw new CustomerOrderHistoryError("UNAVAILABLE", "현재 주문내역을 이용할 수 없습니다.", 403);
  }
  const access = await getMenuSiteAccessStateForMenuSite({ menuSiteId });
  if (!access?.canViewPublic || access.planType !== "business_basic") throw new CustomerOrderHistoryError("UNAVAILABLE", "현재 주문내역을 이용할 수 없습니다.", 403);
  const db = createAdminClient();
  const {data:site,error} = await db.from("menu_sites").select("status,template_key").eq("id",menuSiteId).maybeSingle();
  if (error || !site || site.status !== "published" || !getDiningTemplateFeatures(site.template_key).order) {
    throw new CustomerOrderHistoryError("UNAVAILABLE", "현재 주문내역을 이용할 수 없습니다.", 403);
  }
  // Turning off new ordering does not erase already received orders or prevent a pending cancellation.
  return db;
}
function rpcError(error: {message?: string; code?: string}, mutation: boolean): never {
  if (error.message?.includes("ORDER_VISIT_INACTIVE")) throw new CustomerOrderHistoryError("SESSION_EXPIRED", "테이블 방문 세션이 만료되었습니다.", 401);
  if (error.message?.includes("ORDER_VISIT_NOT_FOUND")) throw new CustomerOrderHistoryError("NOT_FOUND", "주문을 찾을 수 없습니다.", 404);
  if (error.message?.includes("ORDER_VISIT_NOT_CANCELLABLE")) throw new CustomerOrderHistoryError("CONFLICT", "이미 접수되었거나 결제된 주문은 취소할 수 없습니다. 직원에게 문의해 주세요.", 409);
  throw new CustomerOrderHistoryError(mutation ? "UPDATE_FAILED" : "READ_FAILED", mutation ? "주문을 취소하지 못했습니다." : "주문내역을 불러오지 못했습니다.", 503);
}
export async function listCustomerVisitOrders({menuSiteId: value, tableSession}: {menuSiteId: unknown; tableSession: Visit}) {
  const menuSiteId = normalizedId(value), db = await requireVisitAccess(menuSiteId, tableSession);
  const {data,error} = await db.rpc("list_visit_customer_orders", {p_menu_site_id: menuSiteId, p_table_visit_session_id: tableSession.id});
  if (error) rpcError(error, false);
  try { return parseCustomerOrderHistory(data); } catch { throw new CustomerOrderHistoryError("READ_FAILED", "주문내역을 불러오지 못했습니다.", 503); }
}
export async function cancelCustomerVisitOrder({menuSiteId: value, orderId: orderValue, tableSession}: {menuSiteId: unknown; orderId: unknown; tableSession: Visit}) {
  const menuSiteId = normalizedId(value), orderId = normalizedId(orderValue), db = await requireVisitAccess(menuSiteId, tableSession);
  const {data,error} = await db.rpc("cancel_visit_customer_order", {p_menu_site_id: menuSiteId, p_table_visit_session_id: tableSession.id, p_order_id: orderId});
  if (error) rpcError(error, true);
  if (!data || typeof data !== "object" || Array.isArray(data) || data.id !== orderId || data.status !== "cancelled") {
    throw new CustomerOrderHistoryError("UPDATE_FAILED", "주문을 취소하지 못했습니다.", 503);
  }
  return {id: orderId, status: "cancelled" as const};
}
