import "server-only";
import { FloorPlanError, normalizeFloorDocument, retainRegisteredFloorPoints, resolveFloorRoomRemoval, type FloorRoomRemoval } from "@/lib/menu-floor-plan";
import { normalizeMenuTableId } from "@/lib/menu-table-validation";
import { requireMenuTableWriteAccess } from "@/lib/server/menu-table-management-service";
import { saveMenuFloorPlan } from "@/lib/server/menu-floor-plan-service";

export async function removeMenuFloorRoom(menuSiteId: string, revision: number, request: FloorRoomRemoval) {
  const siteId=normalizeMenuTableId(menuSiteId);
  if (!Number.isSafeInteger(revision) || revision<1) throw new FloorPlanError("룸 버전을 확인해 주세요.");
  if(!request || !Array.isArray(request.pointIds) || request.pointIds.length>200)throw new FloorPlanError("정리할 항목을 확인해 주세요.");
  const normalized={...request,roomId:normalizeMenuTableId(request.roomId),targetRoomId:request.targetRoomId?normalizeMenuTableId(request.targetRoomId):undefined,pointIds:request.pointIds.map(normalizeMenuTableId)};
  const {context,supabase}=await requireMenuTableWriteAccess(siteId);
  const stored=await supabase.from("menu_floor_plans").select("document,revision").eq("menu_site_id",siteId).maybeSingle();
  if (stored.error || !stored.data || stored.data.revision!==revision) throw new FloorPlanError("다른 화면에서 룸이 변경되었습니다. 새로고침 후 다시 확인해 주세요.");
  const points=await supabase.from("menu_tables").select("id").eq("menu_site_id",siteId).in("status",["active","disabled"]);
  if (points.error) throw new FloorPlanError("룸의 테이블·키오스크를 확인하지 못했습니다.");
  const ids=(points.data ?? []).map(point=>point.id);
  const document=resolveFloorRoomRemoval(retainRegisteredFloorPoints(normalizeFloorDocument(stored.data.document),points.data ?? []),normalized,ids);
  let archived=false;
  if (normalized.mode==="archive" && normalized.pointIds.length) {
    const result=await supabase.from("menu_tables").update({status:"archived",archived_at:new Date().toISOString(),updated_by:context.actorUserId}).eq("menu_site_id",siteId).in("id",normalized.pointIds).in("status",["active","disabled"]).select("id");
    if (result.error) throw new FloorPlanError("항목을 보관하지 못해 룸을 유지했습니다. 다시 시도해 주세요.");
    archived=true;
    if (result.data?.length!==normalized.pointIds.length) throw new FloorPlanError("항목 상태가 변경되어 룸을 유지했습니다. 새로고침해 보관 상태를 확인한 뒤 다시 시도해 주세요.");
  }
  try { return await saveMenuFloorPlan(siteId,revision,document); }
  catch (error) { if(archived) throw new FloorPlanError("항목은 보관됐지만 룸 삭제를 저장하지 못했습니다. 룸은 유지되며 새로고침 후 다시 삭제할 수 있습니다."); throw error; }
}
