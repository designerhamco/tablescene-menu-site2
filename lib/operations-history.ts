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
  orderStatusLabel?:string;paymentStatusLabel?:string;orderNumber?:number;createdAt?:string;amount?:string;processing?:boolean;unpaid?:boolean;
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

/** Registered points stay visible even when the current result has no records.
 * Historical records whose point was removed remain accessible by their ID. */
export function getOperationHistoryRows<T extends { id: string; tableId: string; tableLabel: string }>(floor: OperationsFloorPlan, records: readonly T[]) {
  const roomNames = new Map(floor.document.rooms.map(room => [room.id, room.name]));
  const roomByPoint = new Map(getHistoryPlacements(floor).map(placement => [placement.pointId, roomNames.get(placement.roomId)]));
  const pointNames = new Map(floor.points.map(point => [point.id, point.label]));
  const roomName = (id: string) => floor.available ? roomByPoint.get(id) ?? "미연동" : "확인 불가";
  const rows: { key: string; pointId: string; pointLabel: string; roomName: string; record: T | null }[] = records.map(record => ({
    key: `record:${record.id}`, pointId: record.tableId, pointLabel: pointNames.get(record.tableId) ?? record.tableLabel, roomName: roomName(record.tableId), record,
  }));
  const recorded = new Set(records.map(record => record.tableId));
  for (const point of floor.points) if (!recorded.has(point.id)) rows.push({ key: `point:${point.id}`, pointId: point.id, pointLabel: point.label, roomName: roomName(point.id), record: null });
  return rows;
}

/** Keep one order's time, status, items and amount together on a table card. */
export function representativeOperationOrder(records:readonly OperationHistoryRecord[]){
  const ascending=[...records].sort((a,b)=>(a.createdAt??"").localeCompare(b.createdAt??"")||a.id.localeCompare(b.id));
  return ascending.find(record=>record.processing)??ascending.find(record=>record.unpaid)??ascending[ascending.length-1];
}
