import type { OrderPointKind } from "./order-point-policy";

export class FloorPlanError extends Error {}
/** Logical pixels at 100%: one fixed rectangle for every kind and every amount of content. */
export const FLOOR_GEOMETRY = {width:6144,height:3456,objectWidth:280,objectHeight:256,gap:8} as const;
const percentUp=(pixels:number,total:number)=>Math.ceil(pixels/total*10000)/100;
export const FLOOR_RECT_SIZE={width:percentUp(FLOOR_GEOMETRY.objectWidth,FLOOR_GEOMETRY.width),height:percentUp(FLOOR_GEOMETRY.objectHeight,FLOOR_GEOMETRY.height)};
// Read compatibility only: version 2 previously allowed larger rectangles.
const legacyLimits={minWidth:4.56,minHeight:7.41,maxWidth:9.11,maxHeight:14.81};
export function floorRectsOverlap(a:Pick<FloorPlacement,"x"|"y"|"width"|"height">,b:Pick<FloorPlacement,"x"|"y"|"width"|"height">){return a.x < b.x+b.width-.005 && a.x+a.width > b.x+.005 && a.y < b.y+b.height-.005 && a.y+a.height > b.y+.005;}


export type FloorRoom = { id: string; name: string; aspectRatio: number };
export type FloorPlacement = { pointId: string; roomId: string; x: number; y: number; width: number; height: number };
export type FloorMembership = { pointId: string; roomId: string };
export type FloorDocument = { layoutVersion?: 2 | 3; rooms: FloorRoom[]; placements: FloorPlacement[]; memberships?: FloorMembership[] };
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
  if(value.layoutVersion!==undefined&&value.layoutVersion!==2&&value.layoutVersion!==3)throw new FloorPlanError("배치도 크기 규칙을 확인해 주세요.");
  const version:Pick<FloorDocument,"layoutVersion">=value.layoutVersion===2||value.layoutVersion===3?{layoutVersion:value.layoutVersion}:{};
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
    const bounded=value.layoutVersion!==undefined, fixed=value.layoutVersion===3;
    const x = number(p.x, 0, bounded?100:92), y = number(p.y, 0, bounded?100:92), width = number(p.width, fixed?FLOOR_RECT_SIZE.width:bounded?legacyLimits.minWidth:8, fixed?FLOOR_RECT_SIZE.width:bounded?legacyLimits.maxWidth:100), height = number(p.height, fixed?FLOOR_RECT_SIZE.height:bounded?legacyLimits.minHeight:8, fixed?FLOOR_RECT_SIZE.height:bounded?legacyLimits.maxHeight:100);
    if (!roomIds.has(roomId) || pointIds.has(pointId) || x + width > 100.01 || y + height > 100.01) throw new FloorPlanError("테이블은 한 곳에만 배치하고 룸 안에 들어오도록 조절해 주세요.");
    pointIds.add(pointId);
    return { pointId, roomId, x, y, width, height };
  });
  if(value.layoutVersion!==undefined)for(let i=0;i<placements.length;i++)for(let j=i+1;j<placements.length;j++)if(placements[i].roomId===placements[j].roomId&&floorRectsOverlap(placements[i],placements[j]))throw new FloorPlanError("테이블·키오스크 영역은 서로 겹칠 수 없습니다.");
  if (value.memberships === undefined) return { ...version, rooms, placements };
  if (!Array.isArray(value.memberships) || value.memberships.length > 200) throw new FloorPlanError("룸 소속 정보를 확인해 주세요.");
  const assigned = new Set<string>();
  const memberships = value.memberships.map(raw => {
    const member = record(raw), pointId = id(member.pointId), roomId = id(member.roomId);
    if (!roomIds.has(roomId) || assigned.has(pointId)) throw new FloorPlanError("항목은 존재하는 룸 한 곳에만 소속될 수 있습니다.");
    assigned.add(pointId); return {pointId, roomId};
  });
  return { ...version, rooms, placements, memberships: floorMemberships({rooms, placements, memberships}) };
}
export function retainRegisteredFloorPoints(document: FloorDocument, points: Pick<FloorPoint, "id">[]): FloorDocument {
  const ids = new Set(points.map(p => p.id));
  return { ...document, placements: document.placements.filter(p => ids.has(p.pointId)), ...(document.memberships ? {memberships: document.memberships.filter(p => ids.has(p.pointId))} : {}) };
}
export function constrainFloorRect(rect: Pick<FloorPlacement, "x" | "y" | "width" | "height">) {
  const {width,height}=FLOOR_RECT_SIZE;
  return { x: Math.min(100 - width, Math.max(0, rect.x)), y: Math.min(100 - height, Math.max(0, rect.y)), width, height };
}

export const FLOOR_PLAN_DISPLAY_ASPECT_RATIO = 16 / 9;

function freeFloorRect(occupied:FloorPlacement[],rect:Pick<FloorPlacement,"x"|"y"|"width"|"height">){
  const candidate=constrainFloorRect(rect);
  if(!occupied.some(item=>floorRectsOverlap(candidate,item)))return candidate;
  const gapX=FLOOR_GEOMETRY.gap/FLOOR_GEOMETRY.width*100,gapY=FLOOR_GEOMETRY.gap/FLOOR_GEOMETRY.height*100;
  const xs=[...new Set([0,...occupied.map(item=>Math.round((item.x+item.width+gapX)*100)/100)])],ys=[...new Set([0,...occupied.map(item=>Math.round((item.y+item.height+gapY)*100)/100)])];
  const candidates=ys.flatMap(y=>xs.map(x=>({...candidate,x:Math.round(x*100)/100,y:Math.round(y*100)/100}))).filter(p=>p.x+p.width<=100&&p.y+p.height<=100);
  candidates.sort((a,b)=>Math.abs(a.x-candidate.x)+Math.abs(a.y-candidate.y)-Math.abs(b.x-candidate.x)-Math.abs(b.y-candidate.y)||a.y-b.y||a.x-b.x);
  return candidates.find(p=>!occupied.some(item=>floorRectsOverlap(p,item)));
}
/** Read projection only: never writes a legacy layout or creates an unsaved change on opening. */
export function readableFloorDocument(document:FloorDocument):FloorDocument{
  if(document.layoutVersion===3)return document;
  const placements:FloorPlacement[]=[];
  for(const room of document.rooms){
    const original=document.placements.filter(p=>p.roomId===room.id),roomPlacements:FloorPlacement[]=[];
    let fits=true;
    for(const p of original){
      const position=document.layoutVersion===2?p:{...p,x:p.x*1280/FLOOR_GEOMETRY.width,y:p.y*(1280/room.aspectRatio)/FLOOR_GEOMETRY.height};
      const rect=freeFloorRect(roomPlacements,position);
      if(!rect){fits=false;break;}
      roomPlacements.push({...p,...rect});
    }
    // Dense legacy rooms retain every ID, using the same fixed size in rows.
    if(!fits){roomPlacements.length=0;for(const p of original){const rect=freeFloorRect(roomPlacements,{x:0,y:0,...FLOOR_RECT_SIZE});if(!rect)throw new FloorPlanError("배치 공간을 확인해 주세요.");roomPlacements.push({...p,...rect});}}
    placements.push(...roomPlacements);
  }
  return {...document,layoutVersion:3,placements};
}
export function canPlaceFloorPoint(document:FloorDocument,roomId:string){const view=readableFloorDocument(document);return Boolean(freeFloorRect(view.placements.filter(p=>p.roomId===roomId),{x:0,y:0,...FLOOR_RECT_SIZE}));}

/** A name commit must not accidentally persist other unsaved rooms/placements. */
export function renameSavedFloorRoom(saved: FloorDocument, room: FloorRoom, name: string): FloorDocument {
  const existing = saved.rooms.find(item => item.id === room.id);
  return normalizeFloorDocument({
    ...saved,
    rooms: existing ? saved.rooms.map(item => item.id === room.id ? { ...item, name } : item) : [...saved.rooms, { ...room, name }],
    placements: saved.placements,
  });
}

/** Only merge the server-confirmed room; canonical precision must not create a false draft. */
export function mergeSavedFloorRoom(draft: FloorDocument, savedRoom: FloorRoom): FloorDocument {
  return {...draft, rooms: draft.rooms.some(room=>room.id===savedRoom.id)
    ? draft.rooms.map(room=>room.id===savedRoom.id?savedRoom:room)
    : [...draft.rooms,savedRoom]};
}

/** Initial placement for new registrations; existing positions stay intact after fixed-size projection. */
export function placeNewFloorPoints(document: FloorDocument, pointIds: readonly string[], roomId: string): FloorDocument {
  if (!document.rooms.some(room => room.id === roomId)) return document;
  const ids=pointIds.filter(id=>!document.placements.some(p=>p.pointId===id));
  if(!ids.length)return document;
  const next=readableFloorDocument(document),placements=[...next.placements];
  for(const pointId of new Set(ids)){
    if(placements.length>=200)break;
    const rect=freeFloorRect(placements.filter(p=>p.roomId===roomId),{x:0,y:0,...FLOOR_RECT_SIZE});
    if(!rect)throw new FloorPlanError("룸의 빈 배치 공간이 부족합니다. 다른 룸을 선택해 주세요.");
    placements.push({pointId,roomId,...rect});
  }
  return {...next,placements,memberships:floorMemberships({...next,placements})};
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
  const placed=document.placements.some(p=>p.pointId===pointId);
  const next={...document,memberships:floorMemberships(document).map(item=>item.pointId===pointId?{...item,roomId}:item),placements:document.placements.filter(p=>p.pointId!==pointId)};
  return placed?placeNewFloorPoints(next,[pointId],roomId):next;
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
  const next: FloorDocument = {...(document.layoutVersion?{layoutVersion:document.layoutVersion}:{}),rooms:document.rooms.filter(room=>room.id!==request.roomId), placements:document.placements.filter(item=>!affected.has(item.pointId)), memberships:memberships.filter(item=>!affected.has(item.pointId))};
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

/** Compare persisted meaning, not object key insertion order or sub-persistence precision. */
export function sameFloorDocument(a:FloorDocument,b:FloorDocument){
  const signature=(d:FloorDocument)=>JSON.stringify({version:d.layoutVersion??1,rooms:d.rooms.map(r=>({id:r.id,name:r.name,aspectRatio:Math.round(r.aspectRatio*100)/100})),placements:d.placements.map(p=>({pointId:p.pointId,roomId:p.roomId,...Object.fromEntries((["x","y","width","height"] as const).map(k=>[k,Math.round(p[k]*100)/100]))})),memberships:floorMemberships(d).sort((x,y)=>x.pointId.localeCompare(y.pointId))});
  return signature(a)===signature(b);
}
