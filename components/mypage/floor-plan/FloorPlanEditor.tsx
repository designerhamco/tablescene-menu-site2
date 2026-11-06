"use client";
import { useUnsavedChanges } from "@/components/ui/useUnsavedChanges";

import { useEffect, useId, useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { Armchair, Monitor, LayoutGrid, Plus, Save, Square, Trash2 } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/app/components/ui/tooltip";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { ButtonGroupDivider } from "@/app/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent, TabsAction } from "@/app/components/ui/tabs";
import { InlineNameEditor, type InlineNameResult } from "@/app/components/ui/inline-name-editor";
import { LoadingState } from "@/app/components/ui/loading-state";
import { EmptyState } from "@/app/components/ui/empty-state";
import { constrainFloorRect, normalizeFloorDocument, renameSavedFloorRoom, FLOOR_PLAN_DISPLAY_ASPECT_RATIO, retainRegisteredFloorPoints, type FloorDocument, type FloorPlacement, type FloorPlanSnapshot, type FloorPoint, type FloorSaveResult } from "@/lib/menu-floor-plan";
import { FloorPlanCanvas, FloorPlanObject } from "@/app/components/ui/floor-plan-canvas";

type Gesture = { pointerId: number; mode: "draw" | "move" | "resize"; pointId: string; roomId: string; startX: number; startY: number; origin: FloorPlacement; before: FloorDocument };
export default function FloorPlanEditor({ initial, points, onSave, registration, onDocumentChange }: {
  initial: FloorPlanSnapshot; points: FloorPoint[]; registration?: (roomAction: ReactNode) => ReactNode; onDocumentChange?: (document: FloorDocument) => void;
  onSave: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
}) {
  const [draft, setDraft] = useState(initial.document);
  const [saved, setSaved] = useState(initial);
  const [roomId, setRoomId] = useState(initial.document.rooms[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState("");
  const [unplacedId, setUnplacedId] = useState("");
  const editing = true;
  const [drawing, setDrawing] = useState(false);
  const [drawingPointId, setDrawingPointId] = useState("");
  const [removeRoom, setRemoveRoom] = useState(false);
  const [targetRoomId, setTargetRoomId] = useState("");
  const [feedback, setFeedback] = useState<{ error: boolean; message: string; name?: boolean } | null>(null);
  const [layoutPending, startTransition] = useTransition();
  const [renamePending, setRenamePending] = useState(false);
  const pending = layoutPending || renamePending;
  const gesture = useRef<Gesture | null>(null), boardRef = useRef<HTMLDivElement>(null), roomListRef = useRef<HTMLDivElement>(null);
  const helpId = useId(), placementHelpId = useId();
  const document = retainRegisteredFloorPoints(draft, points);
  const dirty = JSON.stringify(document) !== JSON.stringify(retainRegisteredFloorPoints(saved.document, points));
  const room = document.rooms.find(r => r.id === roomId) ?? document.rooms[0];
  const visiblePoints = points;
  const unplaced = visiblePoints.filter(p => !document.placements.some(item => item.pointId === p.id));
  // Keep the active draw target in the toolbar until pointer release. Removing it
  // on pointer-down can resize the toolbar and move the drawing canvas mid-gesture.
  const drawingPoint = visiblePoints.find(p => p.id === drawingPointId);
  const placementOptions = drawingPoint ? [drawingPoint, ...unplaced] : unplaced;
  const chosen = drawingPoint ?? unplaced.find(p => p.id === unplacedId) ?? unplaced[0];
  const selected = document.placements.find(p => p.pointId === selectedId && p.roomId === room?.id && visiblePoints.some(point => point.id === p.pointId));
  const selectedPoint = points.find(p => p.id === selected?.pointId);
  const otherRooms = document.rooms.filter(r => r.id !== room?.id);
  const targetRoom = otherRooms.find(r => r.id === targetRoomId) ?? otherRooms[0];
  const noun = "테이블·키오스크";
  const objectParticle = "를";
  const placementReason = !visiblePoints.length
    ? `상단의 ‘테이블 추가’ 또는 ‘키오스크 추가’로 먼저 등록해 주세요.${!room ? " ‘룸 추가’로 공간도 만들어 주세요." : ""}`
    : !room ? "‘룸 추가’로 공간을 먼저 만들어 주세요. 룸을 만든 뒤 사각형을 그릴 수 있습니다."
      : !chosen ? `등록한 ${noun}${objectParticle} 모두 배치했습니다. 기존 사각형을 이동·조절하거나 새 ${noun}${objectParticle} 등록해 주세요.`
        : `배치할 ${noun}${objectParticle} 고른 뒤 ‘사각형 그리기’를 누르고 룸 안을 드래그하세요. ‘바로 배치’로 추가할 수도 있습니다.`;

  useEffect(() => {
    const list = roomListRef.current;
    const item = list?.querySelector('[data-state="active"]')?.parentElement;
    if (!list || !item) return;
    const bounds = list.getBoundingClientRect(), target = item.getBoundingClientRect();
    if (target.left < bounds.left || target.width > bounds.width) list.scrollLeft += target.left - bounds.left;
    else if (target.right > bounds.right) list.scrollLeft += target.right - bounds.right;
  }, [room?.id]);

  useEffect(() => { onDocumentChange?.(retainRegisteredFloorPoints(draft, points)); }, [draft, points, onDocumentChange]);

  useUnsavedChanges({ dirty, pending, discard: () => { setDraft(saved.document); setSelectedId(""); setRemoveRoom(false); setDrawing(false); } });

  function changePlacement(pointId: string, rect: Pick<FloorPlacement, "x" | "y" | "width" | "height">) {
    setDraft(previous => ({ ...previous, placements: previous.placements.map(p => p.pointId === pointId ? { ...p, ...constrainFloorRect(rect) } : p) }));
  }
  function position(event: PointerEvent) {
    const bounds = boardRef.current!.getBoundingClientRect();
    return { x: Math.max(0, Math.min(100, (event.clientX - bounds.left) / bounds.width * 100)), y: Math.max(0, Math.min(100, (event.clientY - bounds.top) / bounds.height * 100)) };
  }
  function begin(event: PointerEvent<HTMLDivElement>, placement?: FloorPlacement) {
    if (gesture.current || !editing || pending || event.button !== 0 || !room) return;
    if (!placement && (!drawing || !chosen || event.target !== event.currentTarget)) return;
    event.preventDefault(); event.stopPropagation();
    const start = position(event), mode = placement ? (event.target instanceof Element && event.target.closest("[data-resize-handle]") ? "resize" : "move") : "draw";
    const origin = placement ?? { pointId: chosen!.id, roomId: room.id, ...constrainFloorRect({ x: start.x, y: start.y, width: 8, height: 8 }) };
    gesture.current = { pointerId: event.pointerId, mode, pointId: origin.pointId, roomId: room.id, startX: start.x, startY: start.y, origin, before: draft };
    boardRef.current!.setPointerCapture(event.pointerId);
    setSelectedId(origin.pointId);
    if (mode === "draw") { setDrawingPointId(origin.pointId); setDraft(previous => ({ ...previous, placements: [...previous.placements, origin] })); }
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    const pos = position(event), dx = pos.x - g.startX, dy = pos.y - g.startY;
    const rect = g.mode === "move" ? { ...g.origin, x: g.origin.x + dx, y: g.origin.y + dy }
      : g.mode === "resize" ? { ...g.origin, width: Math.min(100 - g.origin.x, g.origin.width + dx), height: Math.min(100 - g.origin.y, g.origin.height + dy) }
      : { x: Math.min(g.startX, pos.x, 92), y: Math.min(g.startY, pos.y, 92), width: Math.max(8, Math.abs(dx)), height: Math.max(8, Math.abs(dy)) };
    changePlacement(g.pointId, rect);
  }
  function end(event: PointerEvent<HTMLDivElement>, cancel = false) {
    const g = gesture.current;
    if (!g || g.pointerId !== event.pointerId) return;
    if (cancel) setDraft(g.before);
    gesture.current = null; setDrawing(false); setDrawingPointId("");
    if (boardRef.current?.hasPointerCapture(event.pointerId)) boardRef.current.releasePointerCapture(event.pointerId);
  }
  function addRoom() {
    let number = document.rooms.length + 1;
    while (document.rooms.some(r => r.name === `룸 ${number}`)) number++;
    const next = { id: crypto.randomUUID(), name: `룸 ${number}`, aspectRatio: FLOOR_PLAN_DISPLAY_ASPECT_RATIO };
    setDraft(previous => ({ ...previous, rooms: [...previous.rooms, next] })); setRoomId(next.id); setSelectedId(""); setRemoveRoom(false);
  }
  function addPoint() {
    if (!room || !chosen) return;
    const occupied = document.placements.filter(p => p.roomId === room.id);
    let rect = { x: 4, y: 4, width: 20, height: 16 };
    for (let i = 0; i < 20; i++) {
      const candidate = { ...rect, x: 4 + (i % 4) * 24, y: 4 + Math.floor(i / 4) * 19 };
      if (!occupied.some(p => candidate.x < p.x + p.width && candidate.x + candidate.width > p.x && candidate.y < p.y + p.height && candidate.y + candidate.height > p.y)) { rect = candidate; break; }
    }
    setDraft(previous => ({ ...previous, placements: [...previous.placements, { pointId: chosen.id, roomId: room.id, ...rect }] })); setSelectedId(chosen.id); setDrawing(false);
  }
  function save() {
    let normalized: FloorDocument;
    try { normalized = normalizeFloorDocument(document); } catch (error) { setFeedback({ error: true, message: (error as Error).message }); return; }
    startTransition(async () => {
      try {
        const result = await onSave(saved.revision, normalized);
        if (result.status === "error") { setFeedback({ error: true, message: result.message }); return; }
        setDraft(result.document); setSaved({ available: true, revision: result.revision, document: result.document }); setFeedback({ error: false, message: "배치도를 저장했습니다." });
      } catch { setFeedback({ error: true, message: "배치도를 저장하지 못했습니다. 연결 상태를 확인한 뒤 다시 시도해 주세요." }); }
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
    <div className="site-action-row" data-distribution="between">
      <div className="site-form-row flex-1" data-alignment="center">
        <label className="site-field-stack type-label"><span className="sr-only">배치할 {noun}</span>
          <select className="site-field w-full" value={chosen?.id ?? ""} disabled={!room || !chosen} onChange={e => { setUnplacedId(e.target.value); setDrawing(false); }}>
            {!chosen ? <option value="">배치할 {noun} 없음</option> : null}
            {placementOptions.map(point => <option key={point.id} value={point.id}>{point.kind === "kiosk" ? "키오스크" : "테이블"} · {point.label}</option>)}
          </select>
        </label>
        <Tooltip><TooltipTrigger asChild><span className="inline-flex" tabIndex={!room || !chosen ? 0 : undefined} aria-label={!room || !chosen ? "바로 배치 안내" : undefined}>
          <button type="button" className="site-button site-button-outline" disabled={!room || !chosen} onClick={addPoint}>바로 배치</button>
        </span></TooltipTrigger><TooltipContent>배치되지 않은 테이블·키오스크를 선택한 룸에 배치해 주세요.</TooltipContent></Tooltip>
      </div>
      <div className="site-action-row" data-wrap="nowrap">
        <ButtonGroupDivider />
        <button type="button" className={drawing ? "site-button site-button-primary site-button-icon" : "site-button site-button-outline site-button-icon"} disabled={!room || !chosen} aria-label={drawing ? "그리기 취소" : "사각형 그리기"} title={drawing ? "그리기 취소" : "사각형 그리기"} aria-pressed={drawing} onClick={() => setDrawing(!drawing)}><Square aria-hidden="true" /></button>
        <button type="button" className="site-button site-button-outline site-button-icon" disabled={!selected} aria-label="선택한 항목 배치만 해제" title="배치만 해제 · 등록 정보는 유지됩니다" onClick={() => { setDraft(previous => ({ ...previous, placements: previous.placements.filter(p => p.pointId !== selected?.pointId) })); setSelectedId(""); }}><Trash2 aria-hidden="true" /></button>
      </div>
    </div>
    <p id={placementHelpId} className="type-footnote site-copy-muted">{drawing ? `빈 영역을 드래그해 ‘${chosen?.label}’의 사각형을 그려 주세요.` : placementReason}</p>
  </fieldset>;
  const roomAction = <button type="button" className="site-button site-button-outline" disabled={pending || !room || !initial.available} aria-label="선택한 룸 삭제" onClick={() => setRemoveRoom(true)}><Trash2 aria-hidden="true" />룸 삭제</button>;
  const registrationContent = registration ? registration(roomAction) : <div className="site-action-row">{roomAction}</div>;
  if (!initial.available) return <div className="site-stack-group">{registrationContent}<ContentPanel surface="notice" density="compact"><p className="type-body-sm">{initial.unavailableMessage ?? "배치도 저장 기능을 준비 중입니다. 리스트형에서는 기존 테이블·키오스크를 계속 관리할 수 있습니다."}</p></ContentPanel></div>;
  return <Tabs purpose="section" appearance="document" value={room?.id ?? ""} onValueChange={value => { setRoomId(value); setSelectedId(""); setDrawing(false); setRemoveRoom(false); }}>
    <div className="site-stack-group">
      <TabsList ref={roomListRef} size="sm" aria-label="매장 공간" action={<TabsAction onClick={addRoom} disabled={pending || document.rooms.length >= 30}><Plus aria-hidden="true" />룸 추가</TabsAction>}>
        {document.rooms.map(r => <TabsTrigger key={r.id} value={r.id} disabled={layoutPending} accessory={<InlineNameEditor protectNavigation iconOnly value={r.name} label={`${r.name || "룸"} 이름 수정`} disabled={pending} onSave={name => renameRoom(r.id, name)} />}>{r.name || "이름 없는 룸"}</TabsTrigger>)}
      </TabsList>
    <TabsContent value={room?.id ?? ""}>
    <div className="site-stack-group">
    {removeRoom && room ? <ContentPanel surface="notice" density="compact"><p className="type-body-sm">‘{room.name}’ 룸과 그 안의 배치를 지울까요? 등록된 테이블·키오스크와 주문 기록은 유지됩니다. 배치도 저장 전에는 ‘변경 취소’로 되돌릴 수 있습니다.</p><div className="site-action-row"><button type="button" className="site-button site-button-outline" disabled={pending} onClick={() => { setDraft(previous => ({ rooms: previous.rooms.filter(r => r.id !== room.id), placements: previous.placements.filter(p => p.roomId !== room.id) })); setRemoveRoom(false); setSelectedId(""); }}>룸만 삭제</button><button type="button" className="site-button site-button-outline" onClick={() => setRemoveRoom(false)}>취소</button></div></ContentPanel> : null}
    {registrationContent}
    <p className="type-body-sm site-copy-muted">배치되지 않은 {noun} {unplaced.length}개 · 현재 룸 {document.placements.filter(p => p.roomId === room?.id && visiblePoints.some(point => point.id === p.pointId)).length}개</p>
    <section className="site-stack-group" aria-label="매장 배치 편집">
      {placementTools}
      {!room ? <EmptyState headingLevel={3} icon={<LayoutGrid />} title="배치할 공간을 만들어 주세요" description="‘룸 추가’로 공간을 만들면 등록된 테이블·키오스크의 사각형을 놓을 수 있습니다." /> : <FloorPlanCanvas ref={boardRef} name={room.name} aspectRatio={FLOOR_PLAN_DISPLAY_ASPECT_RATIO} editing={editing} drawing={drawing} aria-describedby={helpId} onPointerDown={e => begin(e)} onPointerMove={move} onPointerUp={e => end(e)} onPointerCancel={e => end(e, true)} onLostPointerCapture={e => end(e, true)} onKeyDown={event => { if (event.key !== "Escape") return; setDrawing(false); setDrawingPointId(""); const g = gesture.current; if (!g) return; setDraft(g.before); gesture.current = null; if (boardRef.current?.hasPointerCapture(g.pointerId)) boardRef.current.releasePointerCapture(g.pointerId); }}>
        {document.placements.filter(p => p.roomId === room.id && visiblePoints.some(point => point.id === p.pointId)).map(p => {
          const point = visiblePoints.find(point => point.id === p.pointId)!;
          return <FloorPlanObject key={p.pointId} rect={p} label={point.label} typeLabel={point.kind === "kiosk" ? "키오스크" : "테이블"} icon={point.kind === "kiosk" ? <Monitor /> : <Armchair />} selected={selected?.pointId === p.pointId} disabled={point.status === "disabled"} editing={editing} aria-describedby={helpId} onClick={() => setSelectedId(p.pointId)} onPointerDown={e => begin(e, p)} onKeyDown={e => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(p.pointId); }
            if (!editing || pending || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
            e.preventDefault(); setSelectedId(p.pointId); const step = e.shiftKey ? 10 : 1;
            changePlacement(p.pointId, { ...p, x: p.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0), y: p.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0) });
          }} />;
        })}
      </FloorPlanCanvas>}
      <ContentPanel surface="muted" density="compact">
        <fieldset disabled={pending || !selected || !targetRoom} className="site-form-row" aria-describedby={helpId}>
          <legend className="sr-only">선택한 항목을 다른 룸으로 이동</legend>
          <label className="site-field-stack type-label">다른 룸으로 이동<select className="site-field w-full" value={targetRoom?.id ?? ""} onChange={e => setTargetRoomId(e.target.value)}>{!targetRoom ? <option value="">이동할 다른 룸이 없습니다</option> : null}{otherRooms.map(r => <option key={r.id} value={r.id}>{r.name || "이름 없는 룸"}</option>)}</select></label>
          <button type="button" className="site-button site-button-outline" onClick={() => { if (!selected || !targetRoom) return; setDraft(previous => ({ ...previous, placements: previous.placements.map(p => p.pointId === selected.pointId ? { ...p, roomId: targetRoom.id } : p) })); setRoomId(targetRoom.id); setTargetRoomId(""); }}>이동</button>
        </fieldset>
        <p id={helpId} className="type-footnote site-copy-muted" role="status">{selectedPoint ? `${selectedPoint.label} 선택됨 · 사각형을 끌어 이동하고 오른쪽 아래 모서리로 크기를 조절하세요. 방향키로도 이동할 수 있습니다.` : "이동하거나 배치를 해제할 사각형을 선택해 주세요. 사각형을 끌어 이동하고 모서리로 크기를 조절할 수 있습니다."}</p>
      </ContentPanel>
    </section>
    <div className="site-stack-block">
      <div className="site-action-row">
        <button type="button" className="site-button site-button-primary" onClick={save} disabled={pending || !dirty}><Save aria-hidden="true" />{pending ? "저장 중" : "배치도 저장"}</button>
        <button type="button" className="site-button site-button-outline" disabled={pending || !dirty} onClick={() => { setDraft(saved.document); setSelectedId(""); setRemoveRoom(false); setDrawing(false); }}>변경 취소</button>
      </div>
      <p className="type-footnote site-copy-muted">룸과 사각형의 변경사항은 ‘배치도 저장’을 눌러야 반영됩니다. 항목 등록은 즉시 저장됩니다.</p>
      {feedback && (feedback.name || !dirty || feedback.error) ? <p className={`type-body-sm ${feedback.error ? "text-destructive" : "site-copy-muted"}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
      {pending ? <LoadingState inline label={renamePending ? "룸 이름을 저장하고 있습니다." : "배치도를 저장하고 있습니다."} /> : null}
    </div>
    </div>
    </TabsContent>
  </div>
  </Tabs>;
}
