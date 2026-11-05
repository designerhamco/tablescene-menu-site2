import type { FloorPlanSnapshot, FloorPoint } from "./menu-floor-plan";
export type OperationsFloorPlan = FloorPlanSnapshot & { points: FloorPoint[] };
export type OperationHistoryRecord = {
  id: string;
  pointId: string;
  pointLabel: string;
  summary: string;
  options?: string;
  time: string;
  status: string;
  attention: boolean;
};
/** Identity joins deliberately use IDs, never mutable/duplicate display names. */
export function groupOperationHistory(records: OperationHistoryRecord[]) {
  const groups = new Map<string, OperationHistoryRecord[]>();
  for (const record of records)
    groups.set(record.pointId, [...(groups.get(record.pointId) ?? []), record]);
  return groups;
}
export function getHistoryPlacements(floor: OperationsFloorPlan) {
  if (!floor.available) return [];
  const rooms = new Set(floor.document.rooms.map((room) => room.id));
  const points = new Set(floor.points.map((point) => point.id));
  return floor.document.placements.filter(
    (placement) => rooms.has(placement.roomId) && points.has(placement.pointId),
  );
}
