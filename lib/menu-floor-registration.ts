import { readableFloorDocument, floorRectsOverlap, floorMemberships, placeNewFloorPoints, removeFloorPlacement, snapFloorRect, type FloorDocument, type FloorPlanSnapshot, type FloorSaveResult } from "./menu-floor-plan";

export type RegisteredFloorPoint = { pointId: string; roomId: string; operationId?:string };

/** Persist only an explicit restoration; ordinary creations use the draft-only helper below. */
export async function saveRegisteredFloorPoint(saved: FloorPlanSnapshot, point: RegisteredFloorPoint, save: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>): Promise<FloorSaveResult> {
  if (!saved.available || !saved.document.rooms.some(room => room.id === point.roomId)) return { status: "error", message: "등록할 룸을 확인하지 못했습니다. 룸을 저장한 뒤 다시 시도해 주세요." };
  const existing = saved.document.placements.find(placement => placement.pointId === point.pointId);
  const placementBase = existing && existing.roomId !== point.roomId ? removeFloorPlacement(saved.document, point.pointId) : saved.document;
  const document = placeNewFloorPoints(readableFloorDocument(placementBase), [point.pointId], point.roomId);
  if (!document.placements.some(item => item.pointId === point.pointId)) return { status: "error", message: "배치할 수 있는 항목 수를 초과했습니다." };
  if (document === saved.document) return { status: "success", document, revision: saved.revision };
  return save(saved.revision, document);
}

/** Bring the committed new rectangle into the editor without saving or discarding other drafts. */
export function mergeRegisteredFloorPoint(draft: FloorDocument, committed: FloorDocument, pointId: string): FloorDocument {
  const projection=readableFloorDocument(committed),base=readableFloorDocument(draft);
  const committedPlacement = projection.placements.find(item => item.pointId === pointId);
  const target = draft.rooms.find(room => room.id === committedPlacement?.roomId);
  if (!committedPlacement || !target) return draft;
  const committedRoom = committed.rooms.find(room => room.id === target.id);
  const placement = target.gridSize === committedRoom?.gridSize
    ? committedPlacement
    : { ...committedPlacement, ...snapFloorRect(committedPlacement, target.gridSize) };
  const next={...base,placements:base.placements.filter(item=>item.pointId!==pointId),memberships:[...floorMemberships(base).filter(item=>item.pointId!==pointId),{pointId,roomId:placement.roomId}]};
  if(next.placements.some(item=>item.roomId===placement.roomId&&floorRectsOverlap(item,placement))){
    try{return placeNewFloorPoints(next,[pointId],placement.roomId);}catch{return next;}
  }
  return {...next,placements:base.placements.some(p=>p.pointId===pointId)?base.placements.map(p=>p.pointId===pointId?placement:p):[...next.placements,placement]};
}

/** Ordinary new registrations remain in the draft until the footer save. */
export function placeRegisteredFloorPoint(draft:FloorDocument,point:RegisteredFloorPoint):FloorDocument {return placeNewFloorPoints(draft,[point.pointId],point.roomId);}
