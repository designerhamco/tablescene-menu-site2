import { placeNewFloorPoints, type FloorDocument, type FloorPlanSnapshot, type FloorSaveResult } from "./menu-floor-plan";

export type RegisteredFloorPoint = { pointId: string; roomId: string };

/** Persist only the new registration; other hand-edited layout drafts stay unsaved. */
export async function saveRegisteredFloorPoint(saved: FloorPlanSnapshot, point: RegisteredFloorPoint, save: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>): Promise<FloorSaveResult> {
  if (!saved.available || !saved.document.rooms.some(room => room.id === point.roomId)) return { status: "error", message: "등록할 룸을 확인하지 못했습니다. 룸을 저장한 뒤 다시 시도해 주세요." };
  const document = placeNewFloorPoints(saved.document, [point.pointId], point.roomId);
  if (!document.placements.some(item => item.pointId === point.pointId)) return { status: "error", message: "배치할 수 있는 항목 수를 초과했습니다." };
  if (document === saved.document) return { status: "success", document, revision: saved.revision };
  return save(saved.revision, document);
}

/** Bring the committed new rectangle into the editor without saving or discarding other drafts. */
export function mergeRegisteredFloorPoint(draft: FloorDocument, committed: FloorDocument, pointId: string): FloorDocument {
  const placement = committed.placements.find(item => item.pointId === pointId);
  if (!placement || !draft.rooms.some(room => room.id === placement.roomId)) return draft;
  return { ...draft, placements: [...draft.placements.filter(item => item.pointId !== pointId), placement] };
}
