import "server-only";
import {
  emptyFloorDocument,
  normalizeFloorDocument,
} from "@/lib/menu-floor-plan";
import { normalizeMenuTableId } from "@/lib/menu-table-validation";
import type { OperationsFloorPlan } from "@/lib/operations-history";
import { requireMenuSitePermission } from "@/lib/server/menu-site-access-service";
import { hasPaidTableOperationsAccess } from "@/lib/server/table-operations-eligibility-service";
import { isOrderDashboardRuntimeEnabledForSite } from "@/lib/order-dashboard-runtime";
import { isCallRuntimeEnabledForSite } from "@/lib/call-runtime";
import { createAdminClient } from "@/lib/supabase/admin";

/** Read-only operational projection. Does not grant table.manage or expose QR/device secrets. */
export async function loadOperationsFloorPlan(
  value: string,
  feature: "orders" | "calls",
): Promise<OperationsFloorPlan> {
  const menuSiteId = normalizeMenuTableId(value);
  await requireMenuSitePermission(
    menuSiteId,
    feature === "orders" ? "order.read" : "call.manage",
  );
  const unavailable: OperationsFloorPlan = {
    available: false,
    revision: 0,
    document: emptyFloorDocument(),
    points: [],
    unavailableMessage:
      "배치도를 불러오지 못했습니다. 리스트형에서 내역을 확인하거나 새로고침해 주세요.",
  };
  if (
    !(feature === "orders"
      ? isOrderDashboardRuntimeEnabledForSite(menuSiteId)
      : isCallRuntimeEnabledForSite(menuSiteId)) ||
    !(await hasPaidTableOperationsAccess(menuSiteId))
  )
    return unavailable;
  const supabase = createAdminClient();
  try {
    const [floor, points] = await Promise.all([
      supabase
        .from("menu_floor_plans")
        .select("document, revision")
        .eq("menu_site_id", menuSiteId)
        .maybeSingle(),
      supabase
        .from("menu_tables")
        .select("id, label, point_kind, status")
        .eq("menu_site_id", menuSiteId)
        .in("status", ["active", "disabled"]),
    ]);
    if (floor.error || points.error) return unavailable;
    return {
      available: true,
      revision: floor.data?.revision ?? 0,
      document: floor.data
        ? normalizeFloorDocument(floor.data.document)
        : emptyFloorDocument(),
      points: (points.data ?? []).map((point) => ({
        id: point.id,
        label: point.label,
        kind: point.point_kind === "kiosk" ? "kiosk" : "table",
        status: point.status,
      })),
    };
  } catch {
    return unavailable;
  }
}
