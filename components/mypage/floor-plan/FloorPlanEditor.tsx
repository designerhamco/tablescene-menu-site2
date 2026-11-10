"use client";
import {FloorPlanViewport} from "@/app/components/ui/floor-plan-viewport";
import {useIsMobile} from "@/app/components/ui/use-mobile";
import { useUnsavedChanges } from "@/components/ui/useUnsavedChanges";

import { useEffect, useMemo, useId, useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { Armchair, Monitor, LayoutGrid, Plus, Save, X, RotateCcw } from "lucide-react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import RoomRemovalDialog from "./RoomRemovalDialog";
import RoomNameForm from "./RoomNameForm";
import {RoomLabel} from "@/app/components/ui/room-label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { FieldActionRow } from "@/app/components/ui/field-action-row";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { type InlineNameResult } from "@/app/components/ui/inline-name-editor";
import { LoadingState } from "@/app/components/ui/loading-state";
import { EmptyState } from "@/app/components/ui/empty-state";
import { sameFloorDocument, FLOOR_GEOMETRY, readableFloorDocument, canPlaceFloorPoint, floorRectsOverlap, mergeSavedFloorRoom, floorMemberships, removeFloorPlacement, moveFloorPoint, resolveFloorRoomRemoval, placeNewFloorPoints, constrainFloorRect, normalizeFloorDocument, renameSavedFloorRoom, FLOOR_PLAN_DISPLAY_ASPECT_RATIO, retainRegisteredFloorPoints, type FloorDocument, type FloorPlacement, type FloorPlanSnapshot, type FloorPoint, type FloorSaveResult, type FloorRoomRemoval, type FloorRoomRemovalResult, type FloorRoom } from "@/lib/menu-floor-plan";
import { placeRegisteredFloorPoint, saveRegisteredFloorPoint, mergeRegisteredFloorPoint, type RegisteredFloorPoint } from "@/lib/menu-floor-registration";
import { FloorPlanCanvas, FloorPlanObject, FloorPlanWorkspace } from "@/app/components/ui/floor-plan-canvas";

type Gesture = { pointerId: number; pointId: string; roomId: string; startX: number; startY: number; origin: FloorPlacement; before: FloorDocument };
export default function FloorPlanEditor({ initial, points, onSave, registration, onDocumentChange, renderSelectedPoint, renderSelectedActions, view = "map", renderList, createdPoint, onRemoveRoom, onRoomChange, restoredPoint, registrationPending = false, externalDirty=false, onSaveEdits, onDiscardEdits }: {
  externalDirty?:boolean;onSaveEdits?:(revision:number,document:FloorDocument)=>Promise<FloorSaveResult>;onDiscardEdits?:()=>void;restoredPoint?:RegisteredFloorPoint;
  onRoomChange?: (roomId:string, savedRooms:FloorRoom[])=>void; onRemoveRoom?: (revision:number,request:FloorRoomRemoval)=>Promise<FloorRoomRemovalResult>;
  createdPoint?: RegisteredFloorPoint; registrationPending?: boolean;
  view?: "map" | "list"; renderList?: (context: { pointIds: string[]; unassignedPointIds: string[]; rooms: FloorRoom[]; roomId: string; pending: boolean; onMovePoint: (pointId: string, roomId: string) => void }) => ReactNode; initial: FloorPlanSnapshot; points: FloorPoint[]; renderSelectedActions?: (point: FloorPoint, pending: boolean) => ReactNode; renderSelectedPoint?: (point: FloorPoint, pending: boolean) => ReactNode; registration?: (context: { canRegister: boolean; roomId: string; pending: boolean; blockedReason?: string }) => ReactNode; onDocumentChange?: (document: FloorDocument) => void;
  onSave: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
}) {
  const [draft, setDraft] = useState(initial.document);
  const [saved, setSaved] = useState(initial);
  const [roomId, setRoomId] = useState(initial.document.rooms[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState("");
  const [unplacedId, setUnplacedId] = useState("");
  const mobile=useIsMobile();
  const editing = !mobile;
  const geometryBlocked=useRef(false);
  const [removeRoom, setRemoveRoom] = useState(false);
  const [removeError,setRemoveError]=useState<string|null>(null);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string; name?: boolean } | null>(null);
  const [layoutPending, startTransition] = useTransition();
  const [renamePending, setRenamePending] = useState(false);
  const [roomAddPending, setRoomAddPending] = useState(false);
  const [focusRoomNameId,setFocusRoomNameId]=useState("");
  const pending = layoutPending || renamePending || registrationPending;
  const gesture = useRef<Gesture | null>(null), boardRef = useRef<HTMLDivElement>(null), roomListRef = useRef<HTMLDivElement>(null);
  const roomAddRef = useRef<HTMLButtonElement>(null);
  const helpId = useId(), placementHelpId = useId(), transferId = useId();
  const placementSelectRef = useRef<HTMLSelectElement>(null);
  const document = useMemo(()=>retainRegisteredFloorPoints(draft, points),[draft,points]);
  const geometryDocument=useMemo(()=>readableFloorDocument(document),[document]);
  const layoutDirty = !sameFloorDocument(document,retainRegisteredFloorPoints(saved.document,points));
  const dirty=layoutDirty||externalDirty;
  const room = document.rooms.find(r => r.id === roomId) ?? document.rooms[0];
  const visiblePoints = points;
  const memberships=floorMemberships(document);
  const roomPoints=points.filter(point=>memberships.some(member=>member.pointId===point.id&&member.roomId===room?.id));
  const unplaced = visiblePoints.filter(p => !document.placements.some(item => item.pointId === p.id) && (!memberships.some(member=>member.pointId===p.id)||memberships.some(member=>member.pointId===p.id&&member.roomId===room?.id)));
  const chosen = unplaced.find(p => p.id === unplacedId) ?? unplaced[0];
  const roomPlacements = geometryDocument.placements.filter(p => p.roomId === room?.id && visiblePoints.some(point => point.id === p.pointId));
  const selected = roomPlacements.find(p => p.pointId === selectedId) ?? roomPlacements[0];
  const selectedPoint = points.find(p => p.id === selected?.pointId);
  const otherRooms = document.rooms.filter(r => r.id !== room?.id);
  const targetRoom = otherRooms.find(r => r.id === targetRoomId) ?? otherRooms[0];
  const noun = "테이블·키오스크";
  const objectParticle = "를";
  const placementReason = !visiblePoints.length
    ? !room ? "‘룸 추가’로 공간을 먼저 만든 뒤 테이블·키오스크를 등록해 주세요." : "상단에서 종류와 이름을 입력하고 ‘만들기’를 눌러 등록해 주세요."
    : !room ? "‘룸 추가’로 공간을 먼저 만들어 주세요. 룸을 만든 뒤 테이블·키오스크를 배치할 수 있습니다."
      : !chosen ? `등록한 ${noun}${objectParticle} 모두 배치했습니다. 새 ${noun}${objectParticle} 등록하거나 PC에서 기존 영역을 이동해 주세요.`
        : `배치할 ${noun}${objectParticle} 고른 뒤 ‘바로 배치’를 누르세요. 위치 편집은 PC에서 할 수 있으며 모바일에서는 같은 크기의 카드로 확인합니다.`;

  useEffect(() => {
    const list = roomListRef.current;
    const item = list?.querySelector('[data-state="active"]');
    if (!list || !item) return;
    const bounds = list.getBoundingClientRect(), target = item.getBoundingClientRect();
    if (target.left < bounds.left || target.width > bounds.width) list.scrollLeft += target.left - bounds.left;
    else if (target.right > bounds.right) list.scrollLeft += target.right - bounds.right;
  }, [room?.id]);

  useEffect(() => { if (selectedId && !points.some(point => point.id === selectedId)) placementSelectRef.current?.focus(); }, [points, selectedId]);

  const handledRegistration=useRef("");
  useEffect(()=>{
    if(!createdPoint || handledRegistration.current===createdPoint.pointId)return;
    handledRegistration.current=createdPoint.pointId;
    startTransition(async()=>{try{setDraft(placeRegisteredFloorPoint(draft,createdPoint));setRoomId(createdPoint.roomId);setSelectedId(createdPoint.pointId);}catch(error){setFeedback({error:true,message:(error as Error).message});}});
  },[createdPoint,draft]);
  const handledRestore=useRef("");
  useEffect(()=>{
    if(!restoredPoint || handledRestore.current===`${restoredPoint.pointId}:${restoredPoint.operationId??""}`)return;
    handledRestore.current=`${restoredPoint.pointId}:${restoredPoint.operationId??""}`;
    startTransition(async()=>{
      try{
        try{setDraft(placeRegisteredFloorPoint(draft,restoredPoint));}catch(error){setFeedback({error:true,message:(error as Error).message});}setRoomId(restoredPoint.roomId);setSelectedId(restoredPoint.pointId);
        const result=await saveRegisteredFloorPoint(saved,restoredPoint,onSave);
        if(result.status==="error"){setFeedback({error:true,message:`항목은 복원됐지만 배치를 저장하지 못했습니다. ${result.message}`});return;}
        setSaved({available:true,revision:result.revision,document:result.document});setDraft(previous=>mergeRegisteredFloorPoint(previous,result.document,restoredPoint.pointId));
      }catch{setFeedback({error:true,message:"복원한 항목의 배치를 저장하지 못했습니다. 아래 저장 버튼으로 다시 저장해 주세요."});}
    });
  },[restoredPoint,onSave,saved,draft]);

  useEffect(()=>{onRoomChange?.(room?.id??"",initial.available?saved.document.rooms:[]);},[room?.id,saved.document.rooms,initial.available,onRoomChange]);

  useEffect(() => { onDocumentChange?.(retainRegisteredFloorPoints(draft, points)); }, [draft, points, onDocumentChange]);

  useUnsavedChanges({ dirty, pending, discard: () => { setDraft(saved.document); setSelectedId(""); setRemoveRoom(false); } });

  function changePlacement(pointId: string, rect: Pick<FloorPlacement, "x" | "y" | "width" | "height">) {
    const next=constrainFloorRect(rect), current=geometryDocument.placements.find(p=>p.pointId===pointId);
    if(!current||geometryDocument.placements.some(p=>p.roomId===current.roomId&&p.pointId!==pointId&&floorRectsOverlap(p,next))){geometryBlocked.current=true;return false;}
    if((["x","y","width","height"] as const).every(key=>Math.abs(current[key]-next[key])<.005))return true;
    setDraft(previous => {const view=readableFloorDocument(previous);return {...view,placements:view.placements.map(p=>p.pointId===pointId?{...p,...next}:p)};});return true;
  }
  function position(event: PointerEvent) {
    const bounds = boardRef.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)) };
  }
  function begin(event: PointerEvent<HTMLDivElement>, placement: FloorPlacement) {
    if (gesture.current || !editing || pending || event.button !== 0 || !room) return;
    event.preventDefault(); event.stopPropagation();
    const start = position(event);
    geometryBlocked.current=false;
    const origin = placement;
    gesture.current = { pointerId: event.pointerId, pointId: origin.pointId, roomId: room.id, startX: start.x, startY: start.y, origin, before: draft };
    boardRef.current!.setPointerCapture(event.pointerId);
    setSelectedId(origin.pointId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const pos = position(event), dx = pos.x - g.startX, dy = pos.y - g.startY;
    const rect = { ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy };
    changePlacement(g.pointId, rect);
  }
  function end(event: PointerEvent<HTMLDivElement>, cancel = false) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    if (cancel) setDraft(g.before);
    else if(geometryBlocked.current)setFeedback({error:true,message:"다른 테이블·키오스크 영역과 겹칠 수 없습니다. 빈 위치로 이동해 주세요."});
    gesture.current = null;
    if (boardRef.current?.hasPointerCapture(event.pointerId)) boardRef.current.releasePointerCapture(event.pointerId);
  }
  function movePointToRoom(pointId: string, targetId: string) {
    if (pending || !document.rooms.some(item => item.id === targetId) || !points.some(item => item.id === pointId)) return;
    try{setDraft(floorMemberships(document).some(item => item.pointId === pointId)
      ? moveFloorPoint(document, pointId, targetId)
      : placeNewFloorPoints(document, [pointId], targetId));}catch(error){setFeedback({error:true,message:(error as Error).message});return;}
    setRoomId(targetId); setSelectedId(pointId); setTargetRoomId("");
  }
  const listContent = () => renderList?.({pointIds: initial.available ? roomPoints.map(point => point.id) : points.map(point => point.id), unassignedPointIds: initial.available ? points.filter(point => !memberships.some(member => member.pointId === point.id)).map(point => point.id) : [], rooms: initial.available ? document.rooms : [], roomId: room?.id ?? "", pending, onMovePoint: movePointToRoom});
  function addRoom() {
    if (pending) return;
    let number = document.rooms.length + 1;
    while ([...document.rooms,...saved.document.rooms].some(r => r.name === `룸 ${number}`)) number++;
    const next = { id: crypto.randomUUID(), name: `룸 ${number}`, aspectRatio: FLOOR_PLAN_DISPLAY_ASPECT_RATIO };
    setRoomAddPending(true);
    // Rooms are saved independently; never commit the current layout/registration draft.
    startTransition(async () => {
      try {
        const result = await onSave(saved.revision, { ...saved.document, rooms: [...saved.document.rooms, next] });
        if (result.status === "error") { setFeedback({ error: true, message: result.message }); return; }
        setSaved({ available: true, revision: result.revision, document: result.document });
        const savedRoom = result.document.rooms.find(room => room.id === next.id);
        if (!savedRoom) { setFeedback({error:true,message:"룸 저장 결과를 확인하지 못했습니다. 새로고침 후 확인해 주세요."}); return; }
        setDraft(previous => mergeSavedFloorRoom(previous, savedRoom));
        setRoomId(next.id); setFocusRoomNameId(next.id); setSelectedId(""); setRemoveRoom(false);
        setFeedback({ error: false, message: "룸을 추가했습니다." });
      } catch { setFeedback({ error: true, message: "룸을 추가하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요." }); } finally { setRoomAddPending(false); }
    });
  }
  function addPoint() {
    if (!room || !chosen) return;
    try{setDraft(placeNewFloorPoints(document,[chosen.id],room.id));setSelectedId(chosen.id);}catch(error){setFeedback({error:true,message:(error as Error).message});}
  }

  function save() {
    let normalized: FloorDocument;
    try { normalized = normalizeFloorDocument(readableFloorDocument(document)); } catch (error) { setFeedback({ error: true, message: (error as Error).message }); return; }
    startTransition(async () => {
      try {
        const result = await (onSaveEdits??onSave)(saved.revision, normalized);
        if (result.status === "error") { if(removeRoom)setRemoveError(result.message); setFeedback({ error: true, message: result.message }); return; }
        setDraft(result.document); setSaved({ available: true, revision: result.revision, document: result.document }); setFeedback({ error: false, message: view === "list" ? "저장했습니다." : "배치도를 저장했습니다." });
      } catch { if(removeRoom)setRemoveError("배치 변경을 저장하지 못했습니다. 다시 시도해 주세요."); setFeedback({ error: true, message: `${view === "list" ? "저장하지" : "배치도를 저장하지"} 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.` }); }
    });
  }
  async function renameRoom(id: string, name: string, emoji?: string): Promise<InlineNameResult> {
    const target = document.rooms.find(item => item.id === id);
    if (!target || pending) return { status: "error", message: "룸 정보를 확인한 뒤 다시 시도해 주세요." };
    let candidate: FloorDocument;
    try {
      normalizeFloorDocument({ ...document, rooms: document.rooms.map(item => item.id === id ? { ...item, name, ...(emoji!==undefined?{emoji}:{}) } : item) });
      candidate = renameSavedFloorRoom(retainRegisteredFloorPoints(saved.document, points), target, name, emoji);
    } catch (error) { return { status: "error", message: (error as Error).message }; }
    setRenamePending(true);
    try {
      const result = await onSave(saved.revision, candidate);
      if (result.status === "error") return result;
      const updated = result.document.rooms.find(item => item.id === id)!;
      setSaved({ available: true, revision: result.revision, document: result.document });
      setDraft(previous => ({ ...previous, rooms: previous.rooms.map(item => item.id === id ? { ...item, name: updated.name, emoji: updated.emoji, aspectRatio: updated.aspectRatio } : item) }));
      setFeedback({ error: false, message: "룸 이름을 저장했습니다.", name: true });
      return { status: "success", value: updated.name };
    } finally { setRenamePending(false); }
  }
  const placementTools = <fieldset disabled={pending} className="site-stack-block" aria-describedby={placementHelpId}>
    <legend className="sr-only">테이블·키오스크 배치 도구</legend>
    <div className="site-action-row">
      <div className="site-floor-workspace-placement"><FieldActionRow field={
        <label className="site-field-stack type-label"><span className="sr-only">배치할 {noun}</span>
          <select ref={placementSelectRef} className="site-field w-full" value={chosen?.id ?? ""} disabled={!room || !chosen} onChange={e => { setUnplacedId(e.target.value); }}>
            {!chosen ? <option value="">배치할 {noun} 없음</option> : null}
            {unplaced.map(point => <option key={point.id} value={point.id}>{point.kind === "kiosk" ? "키오스크" : "테이블"} · {point.label}</option>)}
          </select>
        </label>
        } action={<button type="button" className="site-button site-button-outline" disabled={!room || !chosen} onClick={addPoint}>바로 배치</button>} />
      </div>
    </div>
    <p id={placementHelpId} className="sr-only">{placementReason}</p>
  </fieldset>;
  function removeRoomWithPoints(mode:FloorRoomRemoval["mode"],targetRoomId?:string) {
    if(!room||pending)return;
    const request={roomId:room.id,mode,targetRoomId,pointIds:roomPoints.map(point=>point.id)};
    if(!saved.document.rooms.some(item=>item.id===room.id)) {
      setDraft(previous=>resolveFloorRoomRemoval(previous,request,points.map(point=>point.id)));setRemoveRoom(false);setSelectedId("");return;
    }
    if(dirty)return;
    setRemoveError(null);
    startTransition(async()=>{
      try {
        if(!onRemoveRoom) {setRemoveError("룸 정리 기능을 사용할 수 없습니다. 새로고침해 주세요.");return;}
        const result=await onRemoveRoom(saved.revision,request);
        if(result.status==="error"){setRemoveError(result.message);return;}
        setSaved({available:true,revision:result.revision,document:result.document});setDraft(result.document);setRoomId(result.document.rooms[0]?.id??"");setSelectedId("");setRemoveRoom(false);setFeedback({error:false,message:result.message??"룸을 정리했습니다.",name:true});
      } catch {setRemoveError("룸을 정리하지 못했습니다. 새로고침 후 상태를 확인해 주세요.");}
    });
  }
  const roomAction=<RoomRemovalDialog open={removeRoom} onOpenChange={open=>{setRemoveError(null);setRemoveRoom(open);}} room={room} rooms={document.rooms} points={roomPoints} pending={pending} disabled={pending||!room||!initial.available} dirty={dirty&&saved.document.rooms.some(item=>item.id===room?.id)} saved={saved.document.rooms.some(item=>item.id===room?.id)} error={removeError} onSave={save} onRemove={removeRoomWithPoints} returnFocusRef={roomAddRef}/>;
  const hasSpace=Boolean(room&&document.placements.length<200&&canPlaceFloorPoint(document,room.id));
  const canRegister = initial.available && hasSpace && Boolean(room && saved.document.rooms.some(savedRoom => savedRoom.id === room.id));
  const registrationContent = registration?.({ canRegister, roomId: room?.id ?? "", pending, blockedReason: !hasSpace&&room ? "룸에 빈 배치 공간이 부족합니다. 다른 룸을 선택해 주세요." : !initial.available ? "룸 정보를 확인할 수 없어 등록할 수 없습니다. 새로고침 후 다시 확인해 주세요." : document.rooms.length ? "룸을 먼저 저장하면 테이블·키오스크를 만들 수 있습니다." : "룸을 먼저 추가하면 테이블·키오스크를 만들 수 있습니다." });
  const resetAction = <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={pending || !dirty} onClick={() => { setDraft(saved.document); onDiscardEdits?.(); setSelectedId(""); setRemoveRoom(false); }} aria-label="처음으로 되돌리기" title="마지막으로 저장한 배치로 되돌립니다"><RotateCcw aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>마지막으로 저장한 배치로 되돌리기</TooltipContent></Tooltip>;
  const saveAction = <div className="site-field-stack">{dirty ? <span className="type-footnote site-copy-muted">저장하지 않은 변경사항이 있습니다.</span> : null}<button type="button" className="site-button site-button-primary" onClick={save} disabled={pending || !dirty}><Save aria-hidden="true" />{pending ? "저장 중" : view === "list" ? "저장" : "배치도 저장"}</button></div>;
  const registrationPanel=<ContentPanel surface="muted" density="controls">{room?<RoomNameForm room={room} rooms={document.rooms} pending={pending} saving={renamePending} focusRoomId={focusRoomNameId} onSave={renameRoom} deleteAction={roomAction}/>:null}{room&&registrationContent?<div className="site-content-divider">{registrationContent}</div>:registrationContent}</ContentPanel>;
  if (!initial.available) return <div className="site-stack-group">{registrationPanel}{view === "list" ? listContent() : null}<ContentPanel surface="notice" density="compact"><p className="type-body-sm">{initial.unavailableMessage ?? "룸 정보를 확인할 수 없습니다. 리스트형에서는 기존 테이블·키오스크를 계속 관리할 수 있습니다."}</p></ContentPanel></div>;
  return <Tabs purpose="section" appearance="rooms" value={room?.id ?? ""} onValueChange={value => { setRoomId(value); setSelectedId(""); setRemoveRoom(false); }}>
    <div className="site-stack-group">
      <TabsList ref={roomListRef} size="sm" aria-label="매장 공간" action={<Tooltip><TooltipTrigger asChild><Button className="site-room-add" ref={roomAddRef} type="button" variant="outline" shape="rounded" size="icon" onClick={addRoom} disabled={pending || document.rooms.length >= 30} aria-label={roomAddPending?"룸 추가 중":"룸 추가"} aria-busy={roomAddPending}>{roomAddPending ? <LoadingSpinner /> : <Plus aria-hidden="true" />}</Button></TooltipTrigger><TooltipContent>룸 추가</TooltipContent></Tooltip>}>
        {document.rooms.map(r => <TabsTrigger key={r.id} value={r.id} disabled={pending} aria-busy={renamePending&&room?.id===r.id}>{<RoomLabel name={r.name || "이름 없는 룸"} emoji={r.emoji}/>}
        {renamePending&&room?.id===r.id?<LoadingSpinner/>:null}</TabsTrigger>)}
      </TabsList>
    <TabsContent value={room?.id ?? ""}>
    <div className="site-stack-group">
    {registrationPanel}
    {view === "list" ? <>
      {listContent()}
      <div className="site-action-row" data-distribution="end">{saveAction}</div>
    </> : <FloorPlanWorkspace canvasActions={resetAction} tools={<>
      <div className="site-action-row" data-wrap="nowrap"><h3 className="type-content-title">미배치 {unplaced.length}개 · 현재 룸 {roomPlacements.length}개</h3><InfoTooltip label="테이블·키오스크 배치 안내"><p>{placementReason}</p><p>새로 추가한 항목은 선택한 룸의 초안에 배치되며 하단 저장으로 확정합니다. ‘바로 배치’로 기존 미배치 항목을 넣을 수 있습니다. PC에서 위치를 편집할 수 있으며 영역끼리 겹칠 수 없습니다. 모바일에서는 같은 크기의 카드로 확인하고 바로 배치할 수 있습니다.</p><p>위치·룸 구성은 ‘배치도 저장’으로 반영합니다. ‘처음으로 되돌리기’는 마지막 저장 배치로 돌아갑니다. 테이블·키오스크 추가와 이름·배치는 하단 저장으로 확정합니다. 룸 생성·이름 변경·정리와 보관·복원, 주문·호출 허용과 기기 연결은 즉시 반영됩니다.</p></InfoTooltip></div>
      {placementTools}
    </>} selection={renderSelectedPoint ? selectedPoint ? renderSelectedPoint(selectedPoint, pending) : <p className="type-body-sm site-copy-muted">테이블·키오스크 영역을 선택하면 기기별 주문·호출 허용과 연결 정보를 확인하고 변경할 수 있습니다.</p> : undefined} footer={<>
      <div className="site-action-row" data-distribution="between">
        <fieldset disabled={pending || !selected || !targetRoom} className="site-floor-workspace-transfer" aria-describedby={helpId}>
          <legend className="sr-only">선택한 항목을 다른 룸으로 이동</legend>
          <label className="type-label" htmlFor={transferId}>다른 룸으로 이동</label>
          <FieldActionRow field={<select id={transferId} className="site-field w-full" value={targetRoom?.id ?? ""} onChange={e => setTargetRoomId(e.target.value)}>{!targetRoom ? <option value="">이동할 다른 룸이 없습니다</option> : null}{otherRooms.map(r => <option key={r.id} value={r.id}>{r.name || "이름 없는 룸"}</option>)}</select>} action={<button type="button" className="site-button site-button-outline" onClick={() => { if (!selected || !targetRoom) return; movePointToRoom(selected.pointId,targetRoom.id); }}>이동</button>} />
        </fieldset>
        <div className="site-action-row site-floor-workspace-actions">{saveAction}</div>
      </div>
      <p id={helpId} className="type-footnote site-copy-muted" role="status">{selectedPoint ? `${selectedPoint.label} 선택됨 · ${mobile ? "모바일에서는 위치를 편집할 수 없습니다." : "영역을 끌거나 방향키로 이동할 수 있습니다. 크기는 모든 테이블·키오스크가 같습니다."}` : "이동할 테이블·키오스크 영역을 선택해 주세요. 영역 안의 X는 배치만 해제하며 등록 정보는 유지됩니다."}</p>
    </>}>
      {!room ? <EmptyState headingLevel={3} icon={<LayoutGrid />} title="배치할 공간을 만들어 주세요" description="‘룸 추가’로 공간을 만들면 등록된 테이블·키오스크의 영역을 배치할 수 있습니다." /> : <FloorPlanViewport name={room.name}><FloorPlanCanvas ref={boardRef} data-mobile-cards="true" name={room.name} aspectRatio={FLOOR_PLAN_DISPLAY_ASPECT_RATIO} editing={editing} aria-describedby={helpId} onPointerMove={move} onPointerUp={e => end(e)} onPointerCancel={e => end(e, true)} onLostPointerCapture={e => end(e, true)} onKeyDown={event => { if (event.key !== "Escape") return; const g = gesture.current; if (!g) return; setDraft(g.before); gesture.current = null; if (boardRef.current?.hasPointerCapture(g.pointerId)) boardRef.current.releasePointerCapture(g.pointerId); }}>
        {roomPlacements.map(p => {
          const point = visiblePoints.find(point => point.id === p.pointId)!;
          return <FloorPlanObject key={p.pointId} rect={p} label={point.label} typeLabel={point.kind === "kiosk" ? "키오스크" : "테이블"} icon={point.kind === "kiosk" ? <Monitor /> : <Armchair />} selected={selected?.pointId === p.pointId} managementActions={selected?.pointId === p.pointId ? renderSelectedActions?.(point, pending) : null} actions={editing ? <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={pending} aria-label={`${point.label} 배치 해제`} onClick={() => { setDraft(previous => removeFloorPlacement(previous,p.pointId)); setSelectedId(current => current === p.pointId ? "" : current); requestAnimationFrame(() => placementSelectRef.current?.focus()); }}><X aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>배치 해제 · 등록 정보는 유지됩니다</TooltipContent></Tooltip> : undefined} aria-describedby={helpId} onClick={() => setSelectedId(p.pointId)} onPointerDown={e => begin(e, p)} onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(p.pointId); }
            if (!editing || pending || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.preventDefault(); setSelectedId(p.pointId); const step = e.shiftKey ? 32 : 8, stepX=step/FLOOR_GEOMETRY.width*100,stepY=step/FLOOR_GEOMETRY.height*100;
            if(!changePlacement(p.pointId, { ...p, x: p.x + (e.key === "ArrowRight" ? stepX : e.key === "ArrowLeft" ? -stepX : 0), y: p.y + (e.key === "ArrowDown" ? stepY : e.key === "ArrowUp" ? -stepY : 0) }))setFeedback({error:true,message:"다른 영역과 겹칠 수 없습니다."});
          }} />;
        })}
      </FloorPlanCanvas></FloorPlanViewport>}
    </FloorPlanWorkspace>}
    <div className="site-stack-block">
      {feedback && (feedback.name || !dirty || feedback.error) ? <p className={`type-body-sm ${feedback.error ? "text-destructive" : "site-copy-muted"}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
      {pending ? <LoadingState inline label={roomAddPending ? "룸을 추가하고 있습니다." : renamePending ? "룸 이름을 저장하고 있습니다." : view === "list" ? "저장하고 있습니다." : "배치도를 저장하고 있습니다."} /> : null}
    </div>
    </div>
    </TabsContent>
  </div>
  </Tabs>;
}
