import type { OrderPointKind } from "./order-point-policy";

export class FloorPlanError extends Error {}

export type FloorRoom = { id: string; name: string; aspectRatio: number };
export type FloorPlacement = { pointId: string; roomId: string; x: number; y: number; width: number; height: number };
export type FloorMembership = { pointId: string; roomId: string };
export type FloorDocument = { rooms: FloorRoom[]; placements: FloorPlacement[]; memberships?: FloorMembership[] };
export type FloorRoomRemoval = { roomId: string; mode: "move" | "archive"; targetRoomId?: string; pointIds: readonly string[] };
export type FloorRoomRemovalResult = FloorSaveResult & { message?: string };
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
  if (value.memberships === undefined) return { rooms, placements };
  if (!Array.isArray(value.memberships) || value.memberships.length > 200) throw new FloorPlanError("룸 소속 정보를 확인해 주세요.");
  const assigned = new Set<string>();
  const memberships = value.memberships.map(raw => {
    const member = record(raw), pointId = id(member.pointId), roomId = id(member.roomId);
    if (!roomIds.has(roomId) || assigned.has(pointId)) throw new FloorPlanError("항목은 존재하는 룸 한 곳에만 소속될 수 있습니다.");
    assigned.add(pointId); return {pointId, roomId};
  });
  return { rooms, placements, memberships: floorMemberships({rooms, placements, memberships}) };
}
export function retainRegisteredFloorPoints(document: FloorDocument, points: Pick<FloorPoint, "id">[]): FloorDocument {
  const ids = new Set(points.map(p => p.id));
  return { ...document, placements: document.placements.filter(p => ids.has(p.pointId)), ...(document.memberships ? {memberships: document.memberships.filter(p => ids.has(p.pointId))} : {}) };
}
export function constrainFloorRect(rect: Pick<FloorPlacement, "x" | "y" | "width" | "height">) {
  const width = Math.min(100, Math.max(8, rect.width)), height = Math.min(100, Math.max(8, rect.height));
  return { x: Math.min(100 - width, Math.max(0, rect.x)), y: Math.min(100 - height, Math.max(0, rect.y)), width, height };
}

export const FLOOR_PLAN_DISPLAY_ASPECT_RATIO = 4 / 3;
/** A name commit must not accidentally persist other unsaved rooms/placements. */
export function renameSavedFloorRoom(saved: FloorDocument, room: FloorRoom, name: string): FloorDocument {
  const existing = saved.rooms.find(item => item.id === room.id);
  return normalizeFloorDocument({
    ...saved,
    rooms: existing ? saved.rooms.map(item => item.id === room.id ? { ...item, name } : item) : [...saved.rooms, { ...room, name }],
    placements: saved.placements,
  });
}

/** Initial placement for new registrations; saved and hand-edited rectangles stay intact. */
export function placeNewFloorPoints(document: FloorDocument, pointIds: readonly string[], roomId: string): FloorDocument {
  if (!document.rooms.some(room => room.id === roomId)) return document;
  const placed = new Set(document.placements.map(item => item.pointId));
  const placements = [...document.placements];
  for (const pointId of pointIds) {
    if (placed.has(pointId) || placements.length >= 200) continue;
    const occupied = placements.filter(item => item.roomId === roomId);
    const candidates: Array<Pick<FloorPlacement, "x" | "y" | "width" | "height">> = [];
    for (let row = 0; row < 5; row++) for (let column = 0; column < 4; column++) candidates.push({x:4+column*24,y:4+row*19,width:20,height:16});
    for (let row = 0; row < 12; row++) for (let column = 0; column < 12; column++) candidates.push({x:column*8,y:row*8,width:8,height:8});
    const free = candidates.find(rect => !occupied.some(item => rect.x < item.x + item.width && rect.x + rect.width > item.x && rect.y < item.y + item.height && rect.y + rect.height > item.y));
    const rect = free ?? {x:4+(occupied.length%10)*8,y:4+(Math.floor(occupied.length/10)%10)*8,width:8,height:8};
    placements.push({pointId,roomId,...constrainFloorRect(rect)}); placed.add(pointId);
  }
  return placements.length === document.placements.length ? document : {...document,placements,memberships:floorMemberships({...document,placements})};
}

/** Legacy documents derive room membership from their rectangles without data migration. */
export function floorMemberships(document: FloorDocument): FloorMembership[] {
  const members = new Map((document.memberships ?? []).map(member => [member.pointId, member]));
  for (const {pointId, roomId} of document.placements) members.set(pointId, {pointId, roomId});
  return [...members.values()];
}
export function removeFloorPlacement(document: FloorDocument, pointId: string): FloorDocument {
  return {...document, memberships:floorMemberships(document), placements:document.placements.filter(item=>item.pointId!==pointId)};
}
export function moveFloorPoint(document: FloorDocument, pointId: string, roomId: string): FloorDocument {
  return {...document, memberships:floorMemberships(document).map(item=>item.pointId===pointId?{...item,roomId}:item), placements:document.placements.map(item=>item.pointId===pointId?{...item,roomId}:item)};
}
export function resolveFloorRoomRemoval(document: FloorDocument, request: FloorRoomRemoval, activeIds: readonly string[]): FloorDocument {
  if (!document.rooms.some(room=>room.id===request.roomId)) throw new FloorPlanError("삭제할 룸을 확인해 주세요.");
  if (!["move","archive"].includes(request.mode)) throw new FloorPlanError("룸의 항목을 이동하거나 보관해 주세요.");
  const active = new Set(activeIds), memberships = floorMemberships(document).filter(item=>active.has(item.pointId));
  const members = memberships.filter(item=>item.roomId===request.roomId);
  const expected = [...new Set(request.pointIds)].sort(), actual = members.map(item=>item.pointId).sort();
  if (expected.length!==request.pointIds.length || JSON.stringify(expected)!==JSON.stringify(actual)) throw new FloorPlanError("룸의 항목이 변경되었습니다. 목록을 새로고침한 뒤 다시 확인해 주세요.");
  if (document.rooms.length===1 && activeIds.some(pointId=>!memberships.some(item=>item.pointId===pointId))) throw new FloorPlanError("소속 룸이 없는 항목이 있습니다. 먼저 룸에 배치한 뒤 정리해 주세요.");
  const affected = new Set(actual);
  const next: FloorDocument = {rooms:document.rooms.filter(room=>room.id!==request.roomId), placements:document.placements.filter(item=>!affected.has(item.pointId)), memberships:memberships.filter(item=>!affected.has(item.pointId))};
  if (request.mode==="move") {
    const target = request.targetRoomId;
    if (!target || target===request.roomId || !next.rooms.some(room=>room.id===target)) throw new FloorPlanError("이동할 다른 룸을 선택해 주세요.");
    next.memberships!.push(...members.map(item=>({...item,roomId:target})));
    return normalizeFloorDocument(placeNewFloorPoints(next,document.placements.filter(item=>affected.has(item.pointId)).map(item=>item.pointId),target));
  }
  return normalizeFloorDocument(next);
}
/** Geometry removal must never silently remove an operating point's room ownership. */
export function assertFloorMembershipsPreserved(previous: FloorDocument, next: FloorDocument, activeIds: readonly string[]) {
  const current = new Map(floorMemberships(next).map(item=>[item.pointId,item.roomId]));
  for (const member of floorMemberships(previous)) if (activeIds.includes(member.pointId) && !current.has(member.pointId)) throw new FloorPlanError("룸의 테이블·키오스크를 다른 룸으로 이동하거나 보관한 뒤 룸을 삭제해 주세요.");
  if (previous.rooms.length && !next.rooms.length && activeIds.length) throw new FloorPlanError("테이블·키오스크를 모두 보관한 뒤 마지막 룸을 삭제해 주세요.");
}
