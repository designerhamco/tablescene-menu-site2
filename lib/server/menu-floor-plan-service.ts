import "server-only";
import type { Json } from "@/lib/supabase/types";
import { assertFloorMembershipsPreserved, FloorPlanError, emptyFloorDocument, normalizeFloorDocument, retainRegisteredFloorPoints, type FloorPlanSnapshot } from "@/lib/menu-floor-plan";
import { normalizeMenuTableId } from "@/lib/menu-table-validation";
import { requireMenuTableReadAccess, requireMenuTableWriteAccess } from "@/lib/server/menu-table-management-service";

export async function loadMenuFloorPlan(menuSiteId: string): Promise<FloorPlanSnapshot> {
  const siteId = normalizeMenuTableId(menuSiteId);
  const { supabase } = await requireMenuTableReadAccess(siteId);
  const result = await supabase.from("menu_floor_plans").select("document, revision").eq("menu_site_id", siteId).maybeSingle();
  if (result.error) {
    if (["42P01", "PGRST205"].includes(result.error.code)) return { available: false, revision: 0, document: emptyFloorDocument() };
    return { available: false, revision: 0, document: emptyFloorDocument(), unavailableMessage: "배치도를 불러오지 못했습니다. 잠시 후 페이지를 새로고침해 주세요." };
  }
  try {
    return { available: true, revision: result.data?.revision ?? 0, document: result.data ? normalizeFloorDocument(result.data.document) : emptyFloorDocument() };
  } catch {
    return { available: false, revision: 0, document: emptyFloorDocument(), unavailableMessage: "저장된 배치도를 확인하지 못했습니다. 관리자에게 문의해 주세요. 리스트형 관리는 계속 사용할 수 있습니다." };
  }
}
export async function saveMenuFloorPlan(menuSiteId: string, revision: unknown, input: unknown) {
  const siteId = normalizeMenuTableId(menuSiteId);
  if (!Number.isSafeInteger(revision) || (revision as number) < 0 || (revision as number) >= 2147483647) throw new FloorPlanError("배치도 버전을 확인해 주세요.");
  const document = normalizeFloorDocument(input);
  const { context, supabase } = await requireMenuTableWriteAccess(siteId);
  const points = await supabase.from("menu_tables").select("id").eq("menu_site_id", siteId).in("status", ["active", "disabled"]);
  if (points.error) throw new FloorPlanError("등록된 테이블 정보를 확인하지 못했습니다.");
  if (retainRegisteredFloorPoints(document, points.data ?? []).placements.length !== document.placements.length || (document.memberships && retainRegisteredFloorPoints(document,points.data ?? []).memberships?.length !== document.memberships.length)) throw new FloorPlanError("삭제·보관되었거나 다른 메뉴판의 테이블이 포함되어 있습니다. 목록을 새로고침해 주세요.");
  const previous = await supabase.from("menu_floor_plans").select("document, revision").eq("menu_site_id",siteId).maybeSingle();
  if (previous.error) throw new FloorPlanError("기존 룸 정보를 확인하지 못했습니다.");
  if (previous.data) assertFloorMembershipsPreserved(normalizeFloorDocument(previous.data.document), document, (points.data ?? []).map(point=>point.id));
  const nextRevision = (revision as number) + 1;
  const values = { document: document as unknown as Json, revision: nextRevision, updated_by: context.actorUserId, updated_at: new Date().toISOString() };
  const result = revision === 0
    ? await supabase.from("menu_floor_plans").insert({ menu_site_id: siteId, ...values }).select("revision").maybeSingle()
    : await supabase.from("menu_floor_plans").update(values).eq("menu_site_id", siteId).eq("revision", revision as number).select("revision").maybeSingle();
  if (result.error?.code === "23505" || (!result.error && !result.data)) throw new FloorPlanError("다른 화면에서 배치도가 변경되었습니다. 새로고침해 최신 배치도를 확인한 뒤 다시 편집해 주세요.");
  if (result.error) throw new FloorPlanError("배치도를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  return { revision: nextRevision, document };
}
