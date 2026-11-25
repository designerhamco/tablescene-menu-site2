"use client";
import {FloorPlanViewport} from "@/app/components/ui/floor-plan-viewport";
import {useIsMobile} from "@/app/components/ui/use-mobile";
import { useUnsavedChanges } from "@/components/ui/useUnsavedChanges";

import { useCallback, useEffect, useMemo, useId, useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { Armchair, Monitor, CheckCircle2, LayoutGrid, Minus, Plus, Save, X } from "@/app/components/ui/site-icon";
import { RotateCcw } from "@/app/components/ui/site-arrow";
import InfoTooltip from "@/components/ui/InfoTooltip";
import RoomRemovalDialog from "./RoomRemovalDialog";
import RoomNameForm from "./RoomNameForm";
import FloorPlanDesktopNotice from "./FloorPlanDesktopNotice";
import {RoomLabel} from "@/app/components/ui/room-label";
import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { FieldActionRow } from "@/app/components/ui/field-action-row";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/app/components/ui/alert-dialog";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { type InlineNameResult } from "@/app/components/ui/inline-name-editor";
import { LoadingState } from "@/app/components/ui/loading-state";
import { EmptyState } from "@/app/components/ui/empty-state";
import { sameFloorDocument, FLOOR_GEOMETRY, gridFloorDocument, readableFloorDocument, canPlaceFloorPoint, floorRectsOverlap, mergeSavedFloorRoom, floorMemberships, removeFloorPlacement, moveFloorPoint, resolveFloorRoomRemoval, placeNewFloorPoints, snapFloorRect, setFloorRoomGrid, FLOOR_GRID, normalizeFloorDocument, renameSavedFloorRoom, FLOOR_PLAN_DISPLAY_ASPECT_RATIO, retainRegisteredFloorPoints, type FloorDocument, type FloorPlacement, type FloorPlanSnapshot, type FloorPoint, type FloorSaveResult, type FloorRoomRemoval, type FloorRoomRemovalResult, type FloorRoom } from "@/lib/menu-floor-plan";
import { placeRegisteredFloorPoint, saveRegisteredFloorPoint, mergeRegisteredFloorPoint, type RegisteredFloorPoint } from "@/lib/menu-floor-registration";
import { FloorPlanCanvas, FloorPlanObject, FloorPlanWorkspace } from "@/app/components/ui/floor-plan-canvas";

type Gesture = { pointerId: number; pointId: string; roomId: string; startX: number; startY: number; origin: FloorPlacement; before: FloorDocument; moved: boolean };
export default function FloorPlanEditor({ initial, points, onSave, registration, onDocumentChange, renderSelectedPoint, renderSelectedActions, renderSelectedEditor, createdPoint, onRemoveRoom, onRoomChange, restoredPoint, registrationPending = false, externalDirty=false, onSaveEdits, onDiscardEdits, requireEdit = false, layoutLock, onArchivePoints, canArchivePoints }: {
  requireEdit?: boolean;
  renderSelectedEditor?: (point: FloorPoint, disabled: boolean, actions: ReactNode) => ReactNode;
  onArchivePoints?: (ids: readonly string[]) => Promise<{ status: "success" | "error"; message: string }>;
  canArchivePoints?: (ids: readonly string[]) => boolean;
  layoutLock?: string;
  externalDirty?:boolean;onSaveEdits?:(revision:number,document:FloorDocument)=>Promise<FloorSaveResult>;onDiscardEdits?:()=>void;restoredPoint?:RegisteredFloorPoint;
  onRoomChange?: (roomId:string, savedRooms:FloorRoom[])=>void; onRemoveRoom?: (revision:number,request:FloorRoomRemoval)=>Promise<FloorRoomRemovalResult>;
  createdPoint?: RegisteredFloorPoint; registrationPending?: boolean;
  initial: FloorPlanSnapshot; points: FloorPoint[]; renderSelectedActions?: (point: FloorPoint, pending: boolean) => ReactNode; renderSelectedPoint?: (point: FloorPoint, pending: boolean) => ReactNode; registration?: (context: { canRegister: boolean; roomId: string; pending: boolean; blockedReason?: string }) => ReactNode; onDocumentChange?: (document: FloorDocument) => void;
  onSave: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
}) {
  const [draft, setDraft] = useState(initial.document);
  const [saved, setSaved] = useState(initial);
  const [roomId, setRoomId] = useState(initial.document.rooms[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState("");
  const [checkedIds, setCheckedIds] = useState<ReadonlySet<string>>(() => new Set());
  const [editMode, setEditMode] = useState(false);
  const [archiveSelection, setArchiveSelection] = useState<string[]>();
  const [archiveError, setArchiveError] = useState("");
  const [unplacedId, setUnplacedId] = useState("");
  const registrationToolbarRef = useRef<HTMLDivElement>(null);
  const mobile=useIsMobile();
  const editing = !mobile && !layoutLock && (!requireEdit || editMode);
  const geometryBlocked=useRef(false);
  const [removeRoom, setRemoveRoom] = useState(false);
  const [removeError,setRemoveError]=useState<string|null>(null);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [moveError, setMoveError] = useState("");
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
  const pendingCreateId = createdPoint?.pointId;
  const pendingRestoreId = restoredPoint?.pointId;
  const project = useCallback((layout: FloorDocument) => {
    if (!requireEdit) return retainRegisteredFloorPoints(layout, points);
    const placed = new Set(layout.placements.map(point => point.pointId));
    const registered = points.filter(point => placed.has(point.id) || (point.id !== pendingCreateId && point.id !== pendingRestoreId));
    return gridFloorDocument(layout, registered);
  }, [points, requireEdit, pendingCreateId, pendingRestoreId]);
  const document = useMemo(() => project(draft), [project, draft]);
  const geometryDocument = useMemo(() => readableFloorDocument(document), [document]);
  const savedLayout = useMemo(() => project(saved.document), [project, saved.document]);
  const layoutDirty = !sameFloorDocument(document, savedLayout);
  const dirty=layoutDirty||externalDirty;
  const room = document.rooms.find(r => r.id === roomId) ?? document.rooms[0];
  const visiblePoints = points;
  const memberships=floorMemberships(document);
  const roomPoints=points.filter(point=>memberships.some(member=>member.pointId===point.id&&member.roomId===room?.id));
  const placedIds = new Set(document.placements.map(placement => placement.pointId));
  const unplaced = requireEdit ? [] : visiblePoints.filter(point => !initial.available || !placedIds.has(point.id));
  const chosen = unplaced.find(p => p.id === unplacedId) ?? unplaced[0];
  const roomPlacements = geometryDocument.placements.filter(p => p.roomId === room?.id && visiblePoints.some(point => point.id === p.pointId));
  const checked = roomPlacements.filter(p => checkedIds.has(p.pointId));
  const selected = checked.length ? undefined : roomPlacements.find(p => p.pointId === selectedId)
    ?? (requireEdit ? undefined : roomPlacements[0]);
  const selectedForMove = checked.length ? checked.map(p => p.pointId) : selected ? [selected.pointId] : [];
  const canChangeLayout = !layoutLock && (!requireEdit || editMode || mobile);
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
    startTransition(async()=>{try{setDraft(placeRegisteredFloorPoint(document,createdPoint));setRoomId(createdPoint.roomId);setSelectedId(createdPoint.pointId);setCheckedIds(new Set());setEditMode(true);}catch(error){setFeedback({error:true,message:(error as Error).message});}});
  },[createdPoint,document]);
  const handledRestore=useRef("");
  useEffect(()=>{
    if(!restoredPoint || handledRestore.current===`${restoredPoint.pointId}:${restoredPoint.operationId??""}`)return;
    handledRestore.current=`${restoredPoint.pointId}:${restoredPoint.operationId??""}`;
    startTransition(async()=>{
      try{
        try{setDraft(placeRegisteredFloorPoint(document,restoredPoint));}catch(error){setFeedback({error:true,message:(error as Error).message});}setRoomId(restoredPoint.roomId);setSelectedId(restoredPoint.pointId);
        const result=await saveRegisteredFloorPoint({...saved, document: savedLayout},restoredPoint,onSave);
        if(result.status==="error"){setFeedback({error:true,message:`항목은 복원됐지만 배치를 저장하지 못했습니다. ${result.message}`});return;}
        setSaved({available:true,revision:result.revision,document:result.document});setDraft(previous=>mergeRegisteredFloorPoint(project(previous),result.document,restoredPoint.pointId));
      }catch{setFeedback({error:true,message:"복원한 항목의 배치를 저장하지 못했습니다. 아래 저장 버튼으로 다시 저장해 주세요."});}
    });
  },[restoredPoint,onSave,saved,savedLayout,document,project]);

  useEffect(()=>{onRoomChange?.(room?.id??"",initial.available?saved.document.rooms:[]);},[room?.id,saved.document.rooms,initial.available,onRoomChange]);

  useEffect(() => { onDocumentChange?.(retainRegisteredFloorPoints(draft, points)); }, [draft, points, onDocumentChange]);

  useUnsavedChanges({ dirty, pending, discard: () => { setDraft(saved.document); setSelectedId(""); setRemoveRoom(false); } });

  function clearSelection() {
    setSelectedId("");
    setCheckedIds(new Set());
  }

  function selectPoint(pointId: string) {
    setCheckedIds(new Set());
    setSelectedId(current => requireEdit && current === pointId ? "" : pointId);
  }

  function resizeGrid(size: number) {
    if (!room || !editing || pending) return;
    try {
      setDraft(setFloorRoomGrid(document, room.id, size));
      setFeedback(null);
    } catch (error) {
      setFeedback({ error: true, message: (error as Error).message });
    }
  }

  function changePlacement(pointId: string, rect: Pick<FloorPlacement, "x" | "y" | "width" | "height">) {
    const current=geometryDocument.placements.find(p=>p.pointId===pointId);
    const next=snapFloorRect(rect, room?.gridSize);
    if(!current||geometryDocument.placements.some(p=>p.roomId===current.roomId&&p.pointId!==pointId&&floorRectsOverlap(p,next))){geometryBlocked.current=true;return false;}
    geometryBlocked.current=false;
    if((["x","y","width","height"] as const).every(key=>Math.abs(current[key]-next[key])<.005))return true;
    setDraft({ ...geometryDocument, placements: geometryDocument.placements.map(p => p.pointId === pointId ? { ...p, ...next } : p) });
    return true;
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
    gesture.current = { pointerId: event.pointerId, pointId: origin.pointId, roomId: room.id, startX: start.x, startY: start.y, origin, before: draft, moved: false };
    boardRef.current!.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const pos = position(event), dx = pos.x - g.startX, dy = pos.y - g.startY;
    if (!g.moved) {
      const bounds = boardRef.current!.getBoundingClientRect();
      if (Math.hypot(dx * bounds.width / 100, dy * bounds.height / 100) < 3) return;
      g.moved = true;
      setSelectedId(g.pointId);
      setCheckedIds(new Set());
    }
    const rect = { ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy };
    changePlacement(g.pointId, rect);
  }
  function end(event: PointerEvent<HTMLDivElement>, cancel = false) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    if (cancel) setDraft(g.before);
    else if (!g.moved) selectPoint(g.pointId);
    else if(geometryBlocked.current)setFeedback({error:true,message:"다른 테이블·키오스크 영역과 겹칠 수 없습니다. 빈 위치로 이동해 주세요."});
    gesture.current = null;
    if (boardRef.current?.hasPointerCapture(event.pointerId)) boardRef.current.releasePointerCapture(event.pointerId);
  }
  function moveSelection(targetId: string) {
    if (!canChangeLayout || pending || !selectedForMove.length) return;
    try {
      const next = selectedForMove.reduce((current, id) => moveFloorPoint(current, id, targetId), document);
      setDraft(next);
      setRoomId(targetId);
      setTargetRoomId("");
      setFeedback(null);
      setMoveDialogOpen(false);
      clearSelection();
    } catch (error) {
      if (moveDialogOpen) setMoveError((error as Error).message);
      else setFeedback({ error: true, message: (error as Error).message });
    }
  }

  function addRoom() {
    if (layoutLock || pending) return;
    let number = document.rooms.length + 1;
    while ([...document.rooms,...saved.document.rooms].some(r => r.name === `룸 ${number}`)) number++;
    const next = { id: crypto.randomUUID(), name: `룸 ${number}`, aspectRatio: FLOOR_PLAN_DISPLAY_ASPECT_RATIO, ...(requireEdit ? { gridSize: FLOOR_GRID.initial } : {}) };
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
    if (layoutLock || pending || !initial.available || !room || !chosen) return;
    try {
      setDraft(placeNewFloorPoints(document, [chosen.id], room.id));
      setSelectedId(chosen.id);
      setCheckedIds(new Set());
    } catch (error) {
      setFeedback({ error: true, message: (error as Error).message });
    }
  }

  function save() {
    if (layoutLock) return;
    let normalized: FloorDocument;
    try { normalized = normalizeFloorDocument(readableFloorDocument(document)); } catch (error) { setFeedback({ error: true, message: (error as Error).message }); return; }
    startTransition(async () => {
      try {
        const result = await (onSaveEdits??onSave)(saved.revision, normalized);
        if (result.status === "error") { if(removeRoom)setRemoveError(result.message); setFeedback({ error: true, message: result.message }); return; }
        setDraft(result.document); setSaved({ available: true, revision: result.revision, document: result.document }); setEditMode(false); setFeedback({ error: false, message: "배치도를 저장했습니다." });
      } catch { if(removeRoom)setRemoveError("배치 변경을 저장하지 못했습니다. 다시 시도해 주세요."); setFeedback({ error: true, message: "배치도를 저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요." }); }
    });
  }
  async function renameRoom(id: string, name: string, emoji?: string): Promise<InlineNameResult> {
    const target = document.rooms.find(item => item.id === id);
    if (layoutLock) return { status: "error", message: layoutLock };
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
  const placementTools = <fieldset disabled={pending || !canChangeLayout} className="site-stack-block" aria-describedby={placementHelpId}>
    <legend className="sr-only">테이블·키오스크 배치 도구</legend>
    <div className="site-action-row">
      <div className="site-floor-workspace-placement"><FieldActionRow field={
        <label className="site-field-stack type-label"><span className="sr-only">배치할 {noun}</span>
          <select ref={placementSelectRef} className="site-field w-full" value={chosen?.id ?? ""} disabled={!room || !chosen} onChange={e => { setUnplacedId(e.target.value); }}>
            {!chosen ? <option value="">배치할 {noun} 없음</option> : null}
            {unplaced.map(point => <option key={point.id} value={point.id}>{point.kind === "kiosk" ? "키오스크" : "테이블"} · {point.label}</option>)}
          </select>
        </label>
        } action={<button type="button" className="site-button site-button-outline" disabled={!room || !chosen} onClick={() => addPoint()}>바로 배치</button>} />
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
  const roomAction=<RoomRemovalDialog open={removeRoom} onOpenChange={open=>{setRemoveError(null);setRemoveRoom(open);}} room={room} rooms={document.rooms} points={roomPoints} pending={pending} disabled={pending||Boolean(layoutLock)||!room||!initial.available||Boolean(room.gridSize && roomPoints.length)} dirty={dirty&&saved.document.rooms.some(item=>item.id===room?.id)} saved={saved.document.rooms.some(item=>item.id===room?.id)} error={removeError} onSave={save} onRemove={removeRoomWithPoints} returnFocusRef={roomAddRef}/>;
  const hasSpace=Boolean(room&&document.placements.length<200&&canPlaceFloorPoint(document,room.id));
  const canRegister = !layoutLock && initial.available && hasSpace && Boolean(room && saved.document.rooms.some(savedRoom => savedRoom.id === room.id));
  const registrationContent = registration?.({ canRegister, roomId: room?.id ?? "", pending, blockedReason: layoutLock ?? (!hasSpace&&room ? "룸에 빈 배치 공간이 부족합니다. 다른 룸을 선택해 주세요." : !initial.available ? "룸 정보를 확인할 수 없어 등록할 수 없습니다. 새로고침 후 다시 확인해 주세요." : document.rooms.length ? "룸을 먼저 저장하면 테이블·키오스크를 만들 수 있습니다." : "룸을 먼저 추가하면 테이블·키오스크를 만들 수 있습니다.") });
  const checkedPoints = checked.map(point => point.pointId);
  function archiveCheckedPoints() {
    if (!archiveSelection || !onArchivePoints || layoutLock) return;
    setArchiveError("");
    startTransition(async () => {
      try {
        const result = await onArchivePoints(archiveSelection);
        if (result.status === "error") { setArchiveError(result.message); return; }
        setArchiveSelection(undefined);
        setDraft(previous => retainRegisteredFloorPoints(previous, points.filter(point => !archiveSelection.includes(point.id))));
        clearSelection();
        setFeedback({ error: false, message: result.message, name: true });
      } catch {
        setArchiveError("보관 결과를 확인하지 못했습니다. 새로고침 후 다시 확인해 주세요.");
      }
    });
  }

  function resetLayout() {
    setDraft(saved.document);
    onDiscardEdits?.();
    clearSelection();
    setRemoveRoom(false);
  }

  const roomManagement = requireEdit;
  const resetAction = <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={pending || !dirty} onClick={resetLayout} aria-label="처음으로 되돌리기" title="마지막으로 저장한 배치로 되돌립니다"><RotateCcw aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>마지막으로 저장한 배치로 되돌리기</TooltipContent></Tooltip>;
  const saveLabel = pending ? "저장 중" : roomManagement && saved.revision > 0 && !dirty && !editing ? "저장 완료" : "배치도 저장";
  const saveAction = <div className="site-field-stack">{dirty ? <span className="type-footnote site-copy-muted">저장하지 않은 변경사항이 있습니다.</span> : null}<button type="button" className="site-button site-button-primary" onClick={save} disabled={pending || !dirty || Boolean(layoutLock)}><Save aria-hidden="true" />{saveLabel}</button></div>;
  const roomForm = room ? <RoomNameForm room={room} rooms={document.rooms} pending={pending || Boolean(layoutLock)} saving={renamePending} focusRoomId={focusRoomNameId} onSave={renameRoom} deleteAction={roomAction}/> : null;
  const registrationPanel = <ContentPanel surface="muted" density="controls">{roomForm}{room && registrationContent ? <div className="site-content-divider">{registrationContent}</div> : registrationContent}</ContentPanel>;

  const gridSize = room?.gridSize;
  const gridControls = !mobile && gridSize ? (
    <div className="site-floor-grid-control site-action-row" data-wrap="nowrap" role="group" aria-label="룸 격자 크기">
      <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label="격자 줄이기"
        disabled={!editing || pending || gridSize <= FLOOR_GRID.min || roomPlacements.length > (gridSize - 1) ** 2}
        onClick={() => resizeGrid(gridSize - 1)}><Minus aria-hidden="true" /></Button>
      <output className="type-label" aria-label="격자 크기">{gridSize}×{gridSize}</output>
      <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label="격자 늘리기"
        disabled={!editing || pending || gridSize >= FLOOR_GRID.max}
        onClick={() => resizeGrid(gridSize + 1)}><Plus aria-hidden="true" /></Button>
    </div>
  ) : null;

  const selectionButtons = <>
    <Button variant="outline" size="compact" disabled={pending || !roomPlacements.length || checked.length === roomPlacements.length}
      onClick={() => { setSelectedId(""); setCheckedIds(new Set(roomPlacements.map(point => point.pointId))); }}>전체 선택 <CheckCircle2 aria-hidden="true" /></Button>
    <Button variant="secondary" size="compact" disabled={pending || !selectedForMove.length}
      onClick={clearSelection}>선택 해제</Button>
    {!roomManagement && <Button variant="outline" size="compact" disabled={!editing || pending || !checked.length}
      onClick={() => { setDraft(checked.reduce((draft, placement) => removeFloorPlacement(draft, placement.pointId), document)); clearSelection(); }}>배치 해제</Button>}
    {onArchivePoints && <Button variant="outline" size="compact" disabled={!canChangeLayout || pending || !checked.length || canArchivePoints?.(checkedPoints) === false}
      onClick={() => { setArchiveError(""); setArchiveSelection(checkedPoints); }}>보관</Button>}
    {checked.length > 0 && <span className="type-caption site-copy-muted" role="status">{checked.length}개 선택</span>}
  </>;

  const pointActions = selectedPoint ? <>
    {renderSelectedActions?.(selectedPoint, pending || !canChangeLayout)}
  </> : null;

  const pointEditor = selectedPoint
    ? renderSelectedEditor?.(selectedPoint, pending || !canChangeLayout, pointActions)
    : null;
  const pointSettings = selectedPoint && renderSelectedPoint ? renderSelectedPoint(selectedPoint, pending) : null;
  if (!initial.available) return <div className="site-stack-group">{registrationPanel}<ContentPanel surface="notice" density="compact"><p className="type-body-sm">{initial.unavailableMessage ?? "배치도를 불러오지 못했습니다. 새로고침 후 다시 확인해 주세요."}</p></ContentPanel></div>;
  return <Tabs purpose="section" appearance="rooms" value={room?.id ?? ""} onValueChange={value => { setRoomId(value); setTargetRoomId(""); clearSelection(); setEditMode(false); setRemoveRoom(false); }}>
    <div className={roomManagement ? "site-floor-room-tabs" : "site-stack-group"}>
      <TabsList ref={roomListRef} size="sm" aria-label="매장 공간" action={<Tooltip><TooltipTrigger asChild><Button iconAppearance="framed" ref={roomAddRef} type="button" variant="outline" shape="rounded" size="icon" onClick={addRoom} disabled={pending || Boolean(layoutLock) || document.rooms.length >= 30} aria-label={roomAddPending?"룸 추가 중":"룸 추가"} aria-busy={roomAddPending}>{roomAddPending ? <LoadingSpinner /> : <Plus aria-hidden="true" />}</Button></TooltipTrigger><TooltipContent>룸 추가</TooltipContent></Tooltip>}>
        {document.rooms.map(r => <TabsTrigger key={r.id} value={r.id} disabled={pending} aria-busy={renamePending&&room?.id===r.id}>{<RoomLabel name={r.name || "이름 없는 룸"} emoji={r.emoji}/>}
        {renamePending&&room?.id===r.id?<LoadingSpinner/>:null}</TabsTrigger>)}
      </TabsList>
    <TabsContent value={room?.id ?? ""}>
    <div className="site-stack-group">
    {layoutLock && !registrationContent && <p className="type-body-sm site-copy-muted" role="status">{layoutLock}</p>}
    {!roomManagement && registrationPanel}
    <FloorPlanWorkspace roomManagement={roomManagement} canvasActions={roomManagement ? undefined : resetAction} tools={<>
      {roomManagement && <>
        {roomForm && <div className="site-floor-room-name">{roomForm}</div>}
        <FloorPlanDesktopNotice returnFocusRef={registrationToolbarRef} />
        <div ref={registrationToolbarRef} tabIndex={-1} className="site-floor-room-registration" role="group" aria-label="테이블·키오스크 등록 도구">
          <div className="site-field-stack">{registrationContent}</div>
          {gridControls}
        </div>
        {room && <div className="site-floor-room-actions">
          <div className="site-action-row">{pointEditor ?? selectionButtons}</div>
          <Tooltip><TooltipTrigger asChild>
            <Button type="button" variant="outline" size="compact" disabled={pending || !dirty} onClick={resetLayout}>되돌리기</Button>
          </TooltipTrigger><TooltipContent>마지막으로 저장한 배치로 되돌립니다</TooltipContent></Tooltip>
        </div>}
      </>}
      {!roomManagement && <>
        <div className="site-action-row" data-wrap="nowrap"><h3 className="type-content-title">미배치 {unplaced.length}개 · 현재 룸 {roomPlacements.length}개</h3><InfoTooltip label="테이블·키오스크 배치 안내"><p>{placementReason}</p><p>테이블·키오스크 추가와 이름·배치는 하단 저장으로 확정합니다. 룸 생성·이름 변경과 보관·복원은 즉시 반영됩니다.</p><p>‘되돌리기’를 누르면 마지막 저장 배치로 돌아갑니다.</p></InfoTooltip></div>
        {placementTools}
      </>}
    </>} selection={!roomManagement ? pointSettings ?? (renderSelectedPoint ? <p className="type-body-sm site-copy-muted">테이블·키오스크 영역을 선택하면 기기별 주문·호출 허용과 연결 정보를 확인하고 변경할 수 있습니다.</p> : undefined) : undefined} footer={<>
      <div className="site-action-row" data-distribution="between">
        <fieldset disabled={pending || !canChangeLayout || !selectedForMove.length || !targetRoom} className="site-floor-workspace-transfer" aria-describedby={helpId}>
          <legend className="sr-only">선택한 항목을 다른 룸으로 이동</legend>
          <label className="type-label" htmlFor={transferId}>{roomManagement ? "룸 이동" : "다른 룸으로 이동"}</label>
          <FieldActionRow field={<select id={transferId} className="site-field w-full" value={roomManagement ? targetRoomId : targetRoom?.id ?? ""} onChange={e => setTargetRoomId(e.target.value)}>{roomManagement || !targetRoom ? <option value="">{otherRooms.length ? "이동할 룸을 선택하세요" : "이동할 다른 룸이 없습니다"}</option> : null}{otherRooms.map(r => <option key={r.id} value={r.id}>{r.name || "이름 없는 룸"}</option>)}</select>} action={<button type="button" className="site-button site-button-outline" disabled={roomManagement && !targetRoomId} onClick={() => {
            if (!targetRoom) return;
            if (roomManagement) {
              setMoveError("");
              setMoveDialogOpen(true);
            } else {
              moveSelection(targetRoom.id);
            }
          }}>이동</button>} />
        </fieldset>
        <div className="site-action-row site-floor-workspace-actions">
          {roomManagement && !mobile && room && <Button variant={editing ? "default" : "outline"} aria-pressed={editing}
            disabled={pending || Boolean(layoutLock)} onClick={() => setEditMode(value => !value)}>배치도 수정</Button>}
          {saveAction}
        </div>
      </div>
      <p id={helpId} className={roomManagement ? "sr-only" : "type-footnote site-copy-muted"} role="status">{selectedPoint ? `${selectedPoint.label} 선택됨 · ${mobile ? "모바일에서는 위치를 편집할 수 없습니다." : "영역을 끌거나 방향키로 이동할 수 있습니다. 크기는 모든 테이블·키오스크가 같습니다."}` : "이동할 테이블·키오스크 영역을 선택해 주세요."}</p>
    </>}>
      {!room ? <EmptyState headingLevel={3} icon={<LayoutGrid />} title="배치할 공간을 만들어 주세요" description="‘룸 추가’로 공간을 만들면 등록된 테이블·키오스크의 영역을 배치할 수 있습니다." /> : <FloorPlanViewport name={room.name} inlineTools={roomManagement && Boolean(room.gridSize)}><FloorPlanCanvas ref={boardRef} data-mobile-cards="true" name={room.name} gridSize={room.gridSize} aspectRatio={roomManagement && room.gridSize ? 6 / 5 : FLOOR_PLAN_DISPLAY_ASPECT_RATIO} editing={editing} onPointerDown={event => { if (event.target === event.currentTarget) clearSelection(); }} aria-describedby={helpId} onPointerMove={move} onPointerUp={e => end(e)} onPointerCancel={e => end(e, true)} onLostPointerCapture={e => end(e, true)} onKeyDown={event => { if (event.key !== "Escape") return; const g = gesture.current; if (!g) return; setDraft(g.before); gesture.current = null; if (boardRef.current?.hasPointerCapture(g.pointerId)) boardRef.current.releasePointerCapture(g.pointerId); }}>
        {roomPlacements.map(p => {
          const point = visiblePoints.find(point => point.id === p.pointId)!;
          return <FloorPlanObject key={p.pointId} rect={p} label={point.label} typeLabel={point.kind === "kiosk" ? "키오스크" : "테이블"} labelRole={roomManagement ? "item-title" : undefined} icon={roomManagement ? undefined : point.kind === "kiosk" ? <Monitor /> : <Armchair />} pointKind={point.kind ?? "table"}
            selectedSettings={roomManagement && selected?.pointId === p.pointId ? pointSettings : undefined}
            onDismissSettings={clearSelection}
            checked={checkedIds.has(p.pointId)}
            selectionControl={requireEdit ? <Checkbox shape="circle" showUncheckedMark={roomManagement} aria-label={`${point.label} 선택`} checked={checkedIds.has(p.pointId)}
              disabled={pending} onCheckedChange={checked => {
                setSelectedId("");
                setCheckedIds(previous => {
                  const next = new Set(previous);
                  if (checked) next.add(p.pointId);
                  else next.delete(p.pointId);
                  return next;
                });
              }} /> : undefined}
            selected={selected?.pointId === p.pointId} managementActions={!roomManagement && selected?.pointId === p.pointId ? renderSelectedActions?.(point, pending) : null} actions={editing && !roomManagement ? <Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={pending} aria-label={`${point.label} 배치 해제`} onClick={() => { setDraft(previous => removeFloorPlacement(previous,p.pointId)); setSelectedId(current => current === p.pointId ? "" : current); requestAnimationFrame(() => placementSelectRef.current?.focus()); }}><X aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>배치 해제 · 등록 정보는 유지됩니다</TooltipContent></Tooltip> : undefined} aria-describedby={helpId} onClick={() => { if (!editing) selectPoint(p.pointId); }} onPointerDown={e => begin(e, p)} onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectPoint(p.pointId); }
            if (!editing || pending || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.preventDefault(); setSelectedId(p.pointId); const step = e.shiftKey ? 32 : 8, stepX=room.gridSize ? 100/room.gridSize : step/FLOOR_GEOMETRY.width*100, stepY=room.gridSize ? 100/room.gridSize : step/FLOOR_GEOMETRY.height*100;
            if(!changePlacement(p.pointId, { ...p, x: p.x + (e.key === "ArrowRight" ? stepX : e.key === "ArrowLeft" ? -stepX : 0), y: p.y + (e.key === "ArrowDown" ? stepY : e.key === "ArrowUp" ? -stepY : 0) }))setFeedback({error:true,message:"다른 영역과 겹칠 수 없습니다."});
          }} />;
        })}
      </FloorPlanCanvas></FloorPlanViewport>}
    </FloorPlanWorkspace>
    <AlertDialog open={moveDialogOpen} onOpenChange={setMoveDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>선택한 항목을 이동할까요?</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedForMove.map(id => points.find(point => point.id === id)?.label).filter(Boolean).join(", ")} → {targetRoom?.name}
          </AlertDialogDescription>
        </AlertDialogHeader>
        {moveError && <p role="alert" className="type-body-sm text-destructive">{moveError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel>취소</AlertDialogCancel>
          <Button type="button" disabled={pending || !canChangeLayout || !targetRoom}
            onClick={() => { if (targetRoom) moveSelection(targetRoom.id); }}>이동</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={Boolean(archiveSelection)} onOpenChange={open => { if (!open && !pending) setArchiveSelection(undefined); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>선택한 {archiveSelection?.length}개 항목을 보관할까요?</AlertDialogTitle>
          <AlertDialogDescription>운영 목록에서는 빠지며, 기존 주문·호출 기록은 유지됩니다.</AlertDialogDescription>
        </AlertDialogHeader>
        {archiveError && <p role="alert" className="type-body-sm text-destructive">{archiveError}</p>}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
          <Button type="button" disabled={pending || Boolean(layoutLock)} onClick={archiveCheckedPoints}>보관하기</Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    <div className="site-stack-block">
      {feedback && (feedback.name || !dirty || feedback.error) ? <p className={`type-body-sm ${feedback.error ? "text-destructive" : "site-copy-muted"}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
      {pending ? <LoadingState inline label={roomAddPending ? "룸을 추가하고 있습니다." : renamePending ? "룸 이름을 저장하고 있습니다." : "배치도를 저장하고 있습니다."} /> : null}
    </div>
    </div>
    </TabsContent>
  </div>
  </Tabs>;
}
