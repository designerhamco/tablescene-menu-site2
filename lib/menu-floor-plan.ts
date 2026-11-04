import type { OrderPointKind } from "./order-point-policy";

export class FloorPlanError extends Error {}

export type FloorRoom = { id: string; name: string; aspectRatio: number };
export type FloorPlacement = { pointId: string; roomId: string; x: number; y: number; width: number; height: number };
export type FloorDocument = { rooms: FloorRoom[]; placements: FloorPlacement[] };
export type FloorPlanSnapshot = { available: boolean; unavailableMessage?: string; revision: number; document: FloorDocument };
export type FloorPoint = { id: string; label: string; kind?: OrderPointKind; status: string };
export type FloorSaveResult = { status: "success"; revision: number; document: FloorDocument } | { status: "error"; message: string };
export const emptyFloorDocument = (): FloorDocument => ({ rooms: [], placements: [] });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const record = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new FloorPlanError("배치도 형식을 확인해 주세요.");
  return value as Record<string, unknown>;
};
const id = (value: unknown) => {
  if (typeof value !== "string" || !uuid.test(value)) throw new FloorPlanError("룸과 테이블 정보를 확인해 주세요.");
  return value.toLowerCase();
};
const number = (value: unknown, min: number, max: number) => {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new FloorPlanError("배치 위치와 크기가 허용 범위를 벗어났습니다.");
  return Math.round(value * 100) / 100;
};
export function normalizeFloorDocument(input: unknown): FloorDocument {
  const value = record(input);
  if (!Array.isArray(value.rooms) || !Array.isArray(value.placements) || value.rooms.length > 30 || value.placements.length > 200) throw new FloorPlanError("배치도는 룸 30개, 테이블·키오스크 합계 200개까지 저장할 수 있습니다.");
  const roomIds = new Set<string>(), names = new Set<string>(), pointIds = new Set<string>();
  const rooms = value.rooms.map(raw => {
    const room = record(raw), roomId = id(room.id);
    const name = typeof room.name === "string" ? room.name.trim() : "";
    if (!name || name.length > 40 || /[\u0000-\u001f\u007f]/.test(name) || roomIds.has(roomId) || names.has(name.toLocaleLowerCase("ko-KR"))) throw new FloorPlanError("룸 이름은 중복 없이 1~40자로 입력해 주세요.");
    roomIds.add(roomId); names.add(name.toLocaleLowerCase("ko-KR"));
    return { id: roomId, name, aspectRatio: number(room.aspectRatio, 0.5, 2) };
  });
  const placements = value.placements.map(raw => {
    const p = record(raw), pointId = id(p.pointId), roomId = id(p.roomId);
    const x = number(p.x, 0, 92), y = number(p.y, 0, 92), width = number(p.width, 8, 100), height = number(p.height, 8, 100);
    if (!roomIds.has(roomId) || pointIds.has(pointId) || x + width > 100.01 || y + height > 100.01) throw new FloorPlanError("테이블은 한 곳에만 배치하고 룸 안에 들어오도록 조절해 주세요.");
    pointIds.add(pointId);
    return { pointId, roomId, x, y, width, height };
  });
  return { rooms, placements };
}
export function retainRegisteredFloorPoints(document: FloorDocument, points: Pick<FloorPoint, "id">[]): FloorDocument {
  const ids = new Set(points.map(p => p.id));
  return { ...document, placements: document.placements.filter(p => ids.has(p.pointId)) };
}
export function constrainFloorRect(rect: Pick<FloorPlacement, "x" | "y" | "width" | "height">) {
  const width = Math.min(100, Math.max(8, rect.width)), height = Math.min(100, Math.max(8, rect.height));
  return { x: Math.min(100 - width, Math.max(0, rect.x)), y: Math.min(100 - height, Math.max(0, rect.y)), width, height };
}
