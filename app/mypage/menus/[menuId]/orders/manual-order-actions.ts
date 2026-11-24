"use server";

import { revalidatePath } from "next/cache";
import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";
import { getPublicMenuDataBySlug } from "@/lib/menu-page-data";
import type { ManualOrderActions, ManualOrderSubmission } from "@/lib/manual-order";
import { normalizeOrderManagementId } from "@/lib/order-management";
import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { normalizeOrderPhone } from "@/lib/order-session-policy";
import { isPostpayOrderRuntimeEnabledForSite } from "@/lib/postpay-order-runtime";
import { InvalidPostpayOrderPayloadError, parsePostpayOrderPayload } from "@/lib/postpay-order-payload";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { requireMenuSitePermission, requireMenuSiteWriteAccess } from "@/lib/server/menu-site-access-service";
import { getPostpayOrderCatalog } from "@/lib/server/postpay-order-catalog-service";
import { hasPaidTableOperationsAccess } from "@/lib/server/table-operations-eligibility-service";
import { createAdminClient } from "@/lib/supabase/admin";

async function canCreateOrders(menuSiteId: string) {
  return isOrderDashboardRuntimeEnabledForSite(menuSiteId) && isPostpayOrderRuntimeEnabledForSite(menuSiteId)
    && await hasPaidTableOperationsAccess(menuSiteId);
}

export async function loadManualOrderCatalog(siteId: string): ReturnType<ManualOrderActions["load"]> {
  try {
    const menuSiteId = normalizeOrderManagementId(siteId);
    await requireMenuSitePermission(menuSiteId, "order.manage");
    if (!await canCreateOrders(menuSiteId)) return { error: "이 메뉴판에서는 수동 주문을 등록할 수 없습니다." };
    const { data: site } = await createAdminClient().from("menu_sites").select("slug, template_key, status").eq("id", menuSiteId).single();
    if (!site || site.status !== "published" || !getDiningTemplateFeatures(site.template_key).order) {
      return { error: "주문 가능한 공개 메뉴판을 확인해 주세요." };
    }

    const data = await getPublicMenuDataBySlug(site.slug);
    if (!data || data.menuSite.id !== menuSiteId) return { error: "메뉴판을 불러오지 못했습니다." };
    const categoryIds = new Map<string, string | null>();
    const items = await getPostpayOrderCatalog(menuSiteId, data, categoryIds);
    const categories = data.categories.map(category => ({
      id: category.id, name: category.name, items: items.filter(item => categoryIds.get(item.id) === category.id),
    })).filter(category => category.items.length > 0);
    const uncategorized = items.filter(item => categoryIds.get(item.id) == null);
    if (uncategorized.length) categories.push({ id: "uncategorized", name: "기타 메뉴", items: uncategorized });
    return { catalog: categories };
  } catch (error) {
    return { error: error instanceof MenuSiteAccessError ? error.message : "메뉴 목록을 불러오지 못했습니다." };
  }
}

export async function submitManualOrderAction(siteId: string, input: ManualOrderSubmission): ReturnType<ManualOrderActions["submit"]> {
  try {
    const menuSiteId = normalizeOrderManagementId(siteId);
    const tableId = normalizeOrderManagementId(input.tableId);
    const payload = parsePostpayOrderPayload({
      menuSiteId, clientRequestId: input.clientRequestId, lines: input.lines, notificationPhone: input.notificationPhone,
    });
    if (!Number.isInteger(input.expectedTotal) || input.expectedTotal < 0 || input.expectedTotal > 100_000_000) {
      return { error: "주문 금액을 확인해 주세요." };
    }
    let phone: string | null;
    try {
      phone = normalizeOrderPhone(payload.notificationPhone?.trim());
    } catch {
      return { error: "휴대폰 번호를 확인해 주세요." };
    }
    const { supabase, context } = await requireMenuSiteWriteAccess(menuSiteId, "order.manage", "order_status_management");
    if (!await canCreateOrders(menuSiteId)) return { error: "이 메뉴판에서는 수동 주문을 등록할 수 없습니다." };
    const { data, error } = await supabase.rpc("submit_manual_staff_order", {
      p_menu_site_id: menuSiteId, p_table_id: tableId, p_actor_user_id: context.actorUserId,
      p_client_request_id: payload.clientRequestId, p_lines: payload.lines, p_notification_phone: phone,
      p_expected_total: input.expectedTotal,
    });
    if (error?.message === "ORDER_POINT_INACTIVE") return { error: "등록할 테이블·키오스크가 비활성 상태입니다." };
    if (error?.code === "22023") return { error: "메뉴의 판매 상태, 가격 또는 옵션이 변경됐습니다. 메뉴를 다시 선택해 주세요.", refreshCatalog: true };
    if (error || !data?.[0]) return { error: "주문을 등록하지 못했습니다. 다시 시도해 주세요." };

    revalidatePath(`/mypage/menus/${menuSiteId}/orders`);
    revalidatePath(`/mypage/menus/${menuSiteId}/kitchen`);
    revalidatePath("/mypage/operations/orders");
    return { orderId: data[0].order_id };
  } catch (error) {
    return { error: error instanceof MenuSiteAccessError || error instanceof InvalidPostpayOrderPayloadError
      ? error.message : "주문을 등록하지 못했습니다. 입력한 내용을 확인해 주세요." };
  }
}
