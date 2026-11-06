"use client";
import { useUnsavedChanges } from "@/components/ui/useUnsavedChanges";

import { useEffect, useId, useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { Armchair, Monitor, LayoutGrid, Plus, Save, Trash2, X, RotateCcw } from "lucide-react";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction } from "@/app/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { FieldActionRow } from "@/app/components/ui/field-action-row";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Button } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsAction } from "@/app/components/ui/tabs";
import { InlineNameEditor, type InlineNameResult } from "@/app/components/ui/inline-name-editor";
import { LoadingState } from "@/app/components/ui/loading-state";
import { EmptyState } from "@/app/components/ui/empty-state";
import { placeNewFloorPoints, constrainFloorRect, normalizeFloorDocument, renameSavedFloorRoom, FLOOR_PLAN_DISPLAY_ASPECT_RATIO, retainRegisteredFloorPoints, type FloorDocument, type FloorPlacement, type FloorPlanSnapshot, type FloorPoint, type FloorSaveResult } from "@/lib/menu-floor-plan";
import { saveRegisteredFloorPoint, mergeRegisteredFloorPoint, type RegisteredFloorPoint } from "@/lib/menu-floor-registration";
import { FloorPlanCanvas, FloorPlanObject, FloorPlanWorkspace } from "@/app/components/ui/floor-plan-canvas";

type Gesture = { pointerId: number; mode: "move" | "resize"; pointId: string; roomId: string; startX: number; startY: number; origin: FloorPlacement; before: FloorDocument };
export default function FloorPlanEditor({ initial, points, onSave, registration, onDocumentChange, renderSelectedPoint, renderSelectedActions, view = "map", renderList, createdPoint, registrationPending = false }: {
  createdPoint?: RegisteredFloorPoint; registrationPending?: boolean;
  view?: "map" | "list"; renderList?: () => ReactNode; initial: FloorPlanSnapshot; points: FloorPoint[]; renderSelectedActions?: (point: FloorPoint, pending: boolean) => ReactNode; renderSelectedPoint?: (point: FloorPoint, pending: boolean) => ReactNode; registration?: (context: { canRegister: boolean; roomId: string; pending: boolean; blockedReason?: string }) => ReactNode; onDocumentChange?: (document: FloorDocument) => void;
  onSave: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
}) {
  const [draft, setDraft] = useState(initial.document);
  const [saved, setSaved] = useState(initial);
  const [roomId, setRoomId] = useState(initial.document.rooms[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState("");
  const [unplacedId, setUnplacedId] = useState("");
  const editing = true;
  const [removeRoom, setRemoveRoom] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string; name?: boolean } | null>(null);
  const [layoutPending, startTransition] = useTransition();
  const [renamePending, setRenamePending] = useState(false);
  const pending = layoutPending || renamePending || registrationPending;
  const gesture = useRef<Gesture | null>(null), boardRef = useRef<HTMLDivElement>(null), roomListRef = useRef<HTMLDivElement>(null);
  const roomAddRef = useRef<HTMLButtonElement>(null);
  const helpId = useId(), placementHelpId = useId(), transferId = useId();
  const placementSelectRef = useRef<HTMLSelectElement>(null);
  const document = retainRegisteredFloorPoints(draft, points);
  const dirty = JSON.stringify(document) !== JSON.stringify(retainRegisteredFloorPoints(saved.document, points));
  const room = document.rooms.find(r => r.id === roomId) ?? document.rooms[0];
  const pointIds = points.map(point => point.id).join("|");
  const [knownPointIds, setKnownPointIds] = useState(pointIds);
  // Registration refreshes props in the same editor for both views. Add only new IDs,
  // so a deliberately removed placement is never silently recreated.
  if (knownPointIds !== pointIds) {
    const known = new Set(knownPointIds.split("|"));
    const added = points.filter(point => !known.has(point.id)).map(point => point.id);
    setKnownPointIds(pointIds);
    if (initial.available && room && added.length) setDraft(previous => placeNewFloorPoints(retainRegisteredFloorPoints(previous, points), added, room.id));
  }
  const visiblePoints = points;
  const unplaced = visiblePoints.filter(p => !document.placements.some(item => item.pointId === p.id));
  const chosen = unplaced.find(p => p.id === unplacedId) ?? unplaced[0];
  const roomPlacements = document.placements.filter(p => p.roomId === room?.id && visiblePoints.some(point => point.id === p.pointId));
  const selected = roomPlacements.find(p => p.pointId === selectedId) ?? roomPlacements[0];
  const selectedPoint = points.find(p => p.id === selected?.pointId);
  const otherRooms = document.rooms.filter(r => r.id !== room?.id);
  const targetRoom = otherRooms.find(r => r.id === targetRoomId) ?? otherRooms[0];
  const noun = "테이블·키오스크";
  const objectParticle = "를";
  const placementReason = !visiblePoints.length
    ? !room ? "‘룸 추가’로 공간을 먼저 만든 뒤 테이블·키오스크를 등록해 주세요." : "상단에서 종류와 이름을 입력하고 ‘만들기’를 눌러 등록해 주세요."
    : !room ? "‘룸 추가’로 공간을 먼저 만들어 주세요. 룸을 만든 뒤 테이블·키오스크를 배치할 수 있습니다."
      : !chosen ? `등록한 ${noun}${objectParticle} 모두 배치했습니다. 기존 테이블·키오스크 영역을 이동·조절하거나 새 ${noun}${objectParticle} 등록해 주세요.`
        : `배치할 ${noun}${objectParticle} 고른 뒤 ‘바로 배치’를 누르세요. 배치한 영역을 끌어 이동하고 오른쪽 아래 화살표로 크기를 조절할 수 있습니다.`;

  useEffect(() => {
    const list = roomListRef.current;
    const item = list?.querySelector('[data-state="active"]')?.parentElement;
    if (!list || !item) return;
    const bounds = list.getBoundingClientRect(), target = item.getBoundingClientRect();
    if (target.left < bounds.left || target.width > bounds.width) list.scrollLeft += target.left - bounds.left;
    else if (target.right > bounds.right) list.scrollLeft += target.right - bounds.right;
  }, [room?.id]);

  useEffect(() => { if (selectedId && !points.some(point => point.id === selectedId)) placementSelectRef.current?.focus(); }, [points, selectedId]);

  const handledRegistration = useRef("");
  useEffect(() => {
    if (!createdPoint || handledRegistration.current === createdPoint.pointId) return;
    handledRegistration.current = createdPoint.pointId;
    startTransition(async () => {
      try {
        const result = await saveRegisteredFloorPoint(saved, createdPoint, onSave);
        if (result.status === "error") { setFeedback({ error: true, message: `항목은 등록됐지만 배치를 저장하지 못했습니다. ${result.message} 아래 저장 버튼으로 배치를 다시 저장해 주세요.` }); return; }
        setSaved({ available: true, revision: result.revision, document: result.document });
        setDraft(previous => mergeRegisteredFloorPoint(previous, result.document, createdPoint.pointId));
        setFeedback({ error: false, message: "등록한 항목을 선택한 룸에 배치하고 저장했습니다.", name: true });
      } catch { setFeedback({ error: true, message: "항목은 등록됐지만 배치를 저장하지 못했습니다. 연결 상태를 확인하고 아래 저장 버튼으로 배치를 다시 저장해 주세요." }); }
    });
  }, [createdPoint, onSave, saved]);

  useEffect(() => { onDocumentChange?.(retainRegisteredFloorPoints(draft, points)); }, [draft, points, onDocumentChange]);

  useUnsavedChanges({ dirty, pending, discard: () => { setDraft(saved.document); setSelectedId(""); setRemoveRoom(false); } });

  function changePlacement(pointId: string, rect: Pick<FloorPlacement, "x" | "y" | "width" | "height">) {
    setDraft(previous => ({ ...previous, placements: previous.placements.map(p => p.pointId === pointId ? { ...p, ...constrainFloorRect(rect) } : p) }));
  }
  function position(event: PointerEvent) {
    const bounds = boardRef.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)) };
  }
  function begin(event: PointerEvent<HTMLDivElement>, placement: FloorPlacement) {
    if (gesture.current || !editing || pending || event.button !== 0 || !room) return;
    event.preventDefault(); event.stopPropagation();
    const start = position(event), mode = event.target instanceof Element && event.target.closest("[data-resize-handle]") ? "resize" : "move";
    const origin = placement;
    gesture.current = { pointerId: event.pointerId, mode, pointId: origin.pointId, roomId: room.id, startX: start.x, startY: start.y, origin, before: draft };
    boardRef.current!.setPointerCapture(event.pointerId);
    setSelectedId(origin.pointId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const pos = position(event), dx = pos.x - g.startX, dy = pos.y - g.startY;
    const rect = g.mode === "move" ? { ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy }
      : { ...g.origin, width: Math.min(100 - g.origin.x, g.origin.width + dx), height: Math.min(100 - g.origin.y, g.origin.height + dy) };
    changePlacement(g.pointId, rect);
  }
  function end(event: PointerEvent<HTMLDivElement>, cancel = false) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    if (cancel) setDraft(g.before);
    gesture.current = null;
    if (boardRef.current?.hasPointerCapture(event.pointerId)) boardRef.current.releasePointerCapture(event.pointerId);
  }
  function addRoom() {
    if (pending) return;
    let number = document.rooms.length + 1;
    while (document.rooms.some(r => r.name === `룸 ${number}`)) number++;
    const next = { id: crypto.randomUUID(), name: `룸 ${number}`, aspectRatio: FLOOR_PLAN_DISPLAY_ASPECT_RATIO };
    // The first room is the registration prerequisite, so persist it with the add action.
    if (saved.document.rooms.length === 0 && document.rooms.length === 0) {
      startTransition(async () => {
        try {
          const result = await onSave(saved.revision, placeNewFloorPoints({ rooms: [next], placements: [] }, points.map(point => point.id), next.id));
          if (result.status === "error") { setFeedback({ error: true, message: result.message }); return; }
          setDraft(result.document); setSaved({ available: true, revision: result.revision, document: result.document });
          setRoomId(next.id); setSelectedId(""); setRemoveRoom(false);
          setFeedback({ error: false, message: "룸을 추가했습니다. 테이블·키오스크를 만들 수 있습니다." });
        } catch { setFeedback({ error: true, message: "룸을 추가하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요." }); }
      });
      return;
    }
    setDraft(previous => ({ ...previous, rooms: [...previous.rooms, next] })); setRoomId(next.id); setSelectedId(""); setRemoveRoom(false);
  }
  function addPoint() {
    if (!room || !chosen) return;
    setDraft(previous => placeNewFloorPoints(previous, [chosen.id], room.id)); setSelectedId(chosen.id);
  }

  function save() {
    let normalized: FloorDocument;
    try { normalized = normalizeFloorDocument(document); } catch (error) { setFeedback({ error: true, message: (error as Error).message }); return; }
    startTransition(async () => {
      try {
        const result = await onSave(saved.revision, normalized);
        if (result.status === "error") { setFeedback({ error: true, message: result.message }); return; }
        setDraft(result.document); setSaved({ available: true, revision: result.revision, document: result.document }); setFeedback({ error: false, message: view === "list" ? "저장했습니다." : "배치도를 저장했습니다." });
      } catch { setFeedback({ error: true, message: `${view === "list" ? "저장하지" : "배치도를 저장하지"} 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요.` }); }
    });
  }
  async function renameRoom(id: string, name: string): Promise<InlineNameResult> {
    const target = document.rooms.find(item => item.id === id);
    if (!target || pending) return { status: "error", message: "룸 정보를 확인한 뒤 다시 시도해 주세요." };
    let candidate: FloorDocument;
    try {
      normalizeFloorDocument({ ...document, rooms: document.rooms.map(item => item.id === id ? { ...item, name } : item) });
      candidate = renameSavedFloorRoom(retainRegisteredFloorPoints(saved.document, points), target, name);
    } catch (error) { return { status: "error", message: (error as Error).message }; }
    setRenamePending(true);
    try {
      const result = await onSave(saved.revision, candidate);
      if (result.status === "error") return result;
      const updated = result.document.rooms.find(item => item.id === id)!;
      setSaved({ available: true, revision: result.revision, document: result.document });
      setDraft(previous => ({ ...previous, rooms: previous.rooms.map(item => item.id === id ? { ...item, name: updated.name, aspectRatio: updated.aspectRatio } : item) }));
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
  const roomAction = <AlertDialog open={removeRoom} onOpenChange={setRemoveRoom}>
    <Tooltip><TooltipTrigger asChild><AlertDialogTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={pending || !room || !initial.available} aria-label="선택한 룸 삭제"><Trash2 aria-hidden="true" /></Button></AlertDialogTrigger></TooltipTrigger><TooltipContent>선택한 룸 삭제</TooltipContent></Tooltip>
    <AlertDialogContent onCloseAutoFocus={event => { if (!room) { event.preventDefault(); roomAddRef.current?.focus(); } }}>
      <AlertDialogHeader>
        <AlertDialogTitle>‘{room?.name}’ 룸을 삭제할까요?</AlertDialogTitle>
        <AlertDialogDescription>룸과 그 안의 배치만 삭제됩니다. 등록된 테이블·키오스크와 주문 기록은 유지됩니다. ‘{view === "list" ? "저장" : "배치도 저장"}’을 눌러야 반영되며 저장 전에는 실제 룸이 삭제되지 않습니다.</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>취소</AlertDialogCancel>
        <AlertDialogAction disabled={pending || !room} onClick={() => { if (!room) return; setDraft(previous => ({ rooms: previous.rooms.filter(r => r.id !== room.id), placements: previous.placements.filter(p => p.roomId !== room.id) })); setSelectedId(""); }}>룸만 삭제</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
  const canRegister = initial.available && Boolean(room && saved.document.rooms.some(savedRoom => savedRoom.id === room.id));
  const registrationContent = registration?.({ canRegister, roomId: room?.id ?? "", pending, blockedReason: !initial.available ? "룸 정보를 확인할 수 없어 등록할 수 없습니다. 새로고침 후 다시 확인해 주세요." : document.rooms.length ? "룸을 먼저 저장하면 테이블·키오스크를 만들 수 있습니다." : "룸을 먼저 추가하면 테이블·키오스크를 만들 수 있습니다." });
  const resetAction = <Tooltip><TooltipTrigger asChild><Button type="button" variant="outline" size="icon" disabled={pending || !dirty} onClick={() => { setDraft(saved.document); setSelectedId(""); setRemoveRoom(false); }} aria-label="처음으로 되돌리기" title="마지막으로 저장한 배치로 되돌립니다"><RotateCcw aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>마지막으로 저장한 배치로 되돌리기</TooltipContent></Tooltip>;
  const saveAction = <button type="button" className="site-button site-button-primary" onClick={save} disabled={pending || !dirty}><Save aria-hidden="true" />{pending ? "저장 중" : view === "list" ? "저장" : "배치도 저장"}</button>;
  if (!initial.available) return <div className="site-stack-group">{registrationContent}{view === "list" ? renderList?.() : null}<ContentPanel surface="notice" density="compact"><p className="type-body-sm">{initial.unavailableMessage ?? "룸 정보를 확인할 수 없습니다. 리스트형에서는 기존 테이블·키오스크를 계속 관리할 수 있습니다."}</p></ContentPanel></div>;
  return <Tabs purpose="section" appearance="document" value={room?.id ?? ""} onValueChange={value => { setRoomId(value); setSelectedId(""); setRemoveRoom(false); }}>
    <div className="site-stack-group">
      <TabsList ref={roomListRef} size="sm" aria-label="매장 공간" tools={roomAction} action={<TabsAction ref={roomAddRef} onClick={addRoom} disabled={pending || document.rooms.length >= 30}><Plus aria-hidden="true" />룸 추가</TabsAction>}>
        {document.rooms.map(r => <TabsTrigger key={r.id} value={r.id} disabled={layoutPending} accessory={<InlineNameEditor protectNavigation iconOnly value={r.name} label={`${r.name || "룸"} 이름 수정`} disabled={pending} onSave={name => renameRoom(r.id, name)} />}>{r.name || "이름 없는 룸"}</TabsTrigger>)}
      </TabsList>
    <TabsContent value={room?.id ?? ""}>
    <div className="site-stack-group">
    {registrationContent}
    {view === "list" ? <>
      {renderList?.()}
      <div className="site-action-row" data-distribution="end">{saveAction}</div>
    </> : <FloorPlanWorkspace canvasActions={resetAction} tools={<>
      <div className="site-action-row" data-wrap="nowrap"><h3 className="type-content-title">미배치 {unplaced.length}개 · 현재 룸 {roomPlacements.length}개</h3><InfoTooltip label="테이블·키오스크 배치 안내"><p>{placementReason}</p><p>새로 등록한 항목은 선택한 룸에 자동으로 배치하고 저장합니다. ‘바로 배치’로 기존 미배치 항목을 넣을 수 있습니다. 배치한 영역을 끌어 위치를 바꾸고 오른쪽 아래 화살표로 크기를 조절해 주세요.</p><p>위치·크기·룸 구성은 ‘배치도 저장’으로 반영합니다. ‘처음으로 되돌리기’는 마지막 저장 배치로 돌아갑니다. 등록·보관·주문·호출 허용과 기기 연결은 즉시 반영됩니다.</p></InfoTooltip></div>
      {placementTools}
    </>} selection={renderSelectedPoint ? selectedPoint ? renderSelectedPoint(selectedPoint, pending) : <p className="type-body-sm site-copy-muted">테이블·키오스크 영역을 선택하면 기기별 주문·호출 허용과 연결 정보를 확인하고 변경할 수 있습니다.</p> : undefined} footer={<>
      <div className="site-action-row" data-distribution="between">
        <fieldset disabled={pending || !selected || !targetRoom} className="site-floor-workspace-transfer" aria-describedby={helpId}>
          <legend className="sr-only">선택한 항목을 다른 룸으로 이동</legend>
          <label className="type-label" htmlFor={transferId}>다른 룸으로 이동</label>
          <FieldActionRow field={<select id={transferId} className="site-field w-full" value={targetRoom?.id ?? ""} onChange={e => setTargetRoomId(e.target.value)}>{!targetRoom ? <option value="">이동할 다른 룸이 없습니다</option> : null}{otherRooms.map(r => <option key={r.id} value={r.id}>{r.name || "이름 없는 룸"}</option>)}</select>} action={<button type="button" className="site-button site-button-outline" onClick={() => { if (!selected || !targetRoom) return; setDraft(previous => ({ ...previous, placements: previous.placements.map(p => p.pointId === selected.pointId ? { ...p, roomId: targetRoom.id } : p) })); setRoomId(targetRoom.id); setTargetRoomId(""); }}>이동</button>} />
        </fieldset>
        <div className="site-action-row site-floor-workspace-actions">{saveAction}</div>
      </div>
      <p id={helpId} className="type-footnote site-copy-muted" role="status">{selectedPoint ? `${selectedPoint.label} 선택됨 · 테이블·키오스크 영역을 끌어 이동하고 오른쪽 아래 화살표로 크기를 조절하세요. 방향키로도 이동할 수 있습니다.` : "이동할 테이블·키오스크 영역을 선택해 주세요. 영역 안의 X는 배치만 해제하며 등록 정보는 유지됩니다."}</p>
    </>}>
      {!room ? <EmptyState headingLevel={3} icon={<LayoutGrid />} title="배치할 공간을 만들어 주세요" description="‘룸 추가’로 공간을 만들면 등록된 테이블·키오스크의 영역을 배치할 수 있습니다." /> : <FloorPlanCanvas ref={boardRef} name={room.name} aspectRatio={FLOOR_PLAN_DISPLAY_ASPECT_RATIO} editing={editing} aria-describedby={helpId} onPointerMove={move} onPointerUp={e => end(e)} onPointerCancel={e => end(e, true)} onLostPointerCapture={e => end(e, true)} onKeyDown={event => { if (event.key !== "Escape") return; const g = gesture.current; if (!g) return; setDraft(g.before); gesture.current = null; if (boardRef.current?.hasPointerCapture(g.pointerId)) boardRef.current.releasePointerCapture(g.pointerId); }}>
        {roomPlacements.map(p => {
          const point = visiblePoints.find(point => point.id === p.pointId)!;
          return <FloorPlanObject key={p.pointId} rect={p} label={point.label} typeLabel={point.kind === "kiosk" ? "키오스크" : "테이블"} icon={point.kind === "kiosk" ? <Monitor /> : <Armchair />} selected={selected?.pointId === p.pointId} editing={editing} managementActions={selected?.pointId === p.pointId ? renderSelectedActions?.(point, pending) : null} actions={<Tooltip><TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" disabled={pending} aria-label={`${point.label} 배치 해제`} onClick={() => { setDraft(previous => ({ ...previous, placements: previous.placements.filter(item => item.pointId !== p.pointId) })); setSelectedId(current => current === p.pointId ? "" : current); requestAnimationFrame(() => placementSelectRef.current?.focus()); }}><X aria-hidden="true" /></Button></TooltipTrigger><TooltipContent>배치 해제 · 등록 정보는 유지됩니다</TooltipContent></Tooltip>} aria-describedby={helpId} onClick={() => setSelectedId(p.pointId)} onPointerDown={e => begin(e, p)} onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(p.pointId); }
            if (!editing || pending || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.preventDefault(); setSelectedId(p.pointId); const step = e.shiftKey ? 10 : 1;
            changePlacement(p.pointId, { ...p, x: p.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0), y: p.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0) });
          }} />;
        })}
      </FloorPlanCanvas>}
    </FloorPlanWorkspace>}
    <div className="site-stack-block">
      {feedback && (feedback.name || !dirty || feedback.error) ? <p className={`type-body-sm ${feedback.error ? "text-destructive" : "site-copy-muted"}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
      {pending ? <LoadingState inline label={renamePending ? "룸 이름을 저장하고 있습니다." : view === "list" ? "저장하고 있습니다." : "배치도를 저장하고 있습니다."} /> : null}
    </div>
    </div>
    </TabsContent>
  </div>
  </Tabs>;
}
