import { placeNewFloorPoints, type FloorDocument } from "./menu-floor-plan";
export type RegisteredFloorPoint = { pointId: string; roomId: string };
/** A new table is visible in the shared draft but never persisted by this helper. */
export function placeRegisteredFloorPoint(draft: FloorDocument, point: RegisteredFloorPoint): FloorDocument {
  return placeNewFloorPoints(draft, [point.pointId], point.roomId);
}
