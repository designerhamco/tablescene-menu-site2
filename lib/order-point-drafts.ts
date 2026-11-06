import type { FloorDocument, FloorSaveResult } from "./menu-floor-plan";
import type { OrderPointKind } from "./order-point-policy";

export type DraftOrderPoint = { id: string; label: string; kind: OrderPointKind; roomId: string };
/** Called only by the explicit footer save; successful creations survive a retry. */
export async function saveOrderPointDrafts({ revision, document, added, names, committedIds, create, rename, saveLayout, onCreated }: {
  revision: number; document: FloorDocument; added: DraftOrderPoint[]; names: Record<string, string>; committedIds: Record<string, string>;
  create: (point: DraftOrderPoint) => Promise<{ status: string; tableId: string | null; message: string }>;
  rename: (id: string, name: string) => Promise<{ status: string; message: string }>;
  saveLayout: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
  onCreated: (draftId: string, id: string) => void;
}): Promise<FloorSaveResult> {
  const ids = { ...committedIds };
  let wrote = Object.keys(ids).length > 0;
  try {
    for (const point of added) {
      if (ids[point.id]) continue;
      const result = await create(point);
      if (result.status !== "success" || !result.tableId) throw new Error(result.message || "테이블·키오스크를 저장하지 못했습니다.");
      ids[point.id] = result.tableId; wrote = true; onCreated(point.id, result.tableId);
    }
    for (const [id, name] of Object.entries(names)) {
      const result = await rename(ids[id] ?? id, name);
      if (result.status !== "success") throw new Error(result.message);
      wrote = true;
    }
    const result = await saveLayout(revision, { ...document, placements: document.placements.map(p => ({ ...p, pointId: ids[p.pointId] ?? p.pointId })), ...(document.memberships?{memberships:document.memberships.map(member=>({...member,pointId:ids[member.pointId]??member.pointId}))}:{}) });
    if (result.status === "error") throw new Error(result.message);
    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : "연결을 확인하고 다시 시도해 주세요.";
    return { status: "error", message: `${wrote ? "일부 등록·이름 변경은 저장됐지만 전체 저장을 완료하지 못했습니다. 초안은 유지됩니다. 다시 저장해 주세요. " : "저장하지 못했습니다. 초안은 유지됩니다. "}${message}` };
  }
}
