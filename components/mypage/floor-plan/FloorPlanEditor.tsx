"use client";

import { useEffect, useId, useRef, useState, useTransition, type PointerEvent, type ReactNode } from "react";
import { ChevronDown, LayoutGrid, Pencil, Plus, Save } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/app/components/ui/collapsible";
import { Button } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/app/components/ui/tabs";
import { LoadingState } from "@/app/components/ui/loading-state";
import { EmptyState } from "@/app/components/ui/empty-state";
import { constrainFloorRect, normalizeFloorDocument, retainRegisteredFloorPoints, type FloorDocument, type FloorPlacement, type FloorPlanSnapshot, type FloorPoint, type FloorSaveResult } from "@/lib/menu-floor-plan";
import type { OrderPointKind } from "@/lib/order-point-policy";
import { FloorPlanCanvas, FloorPlanObject } from "@/app/components/ui/floor-plan-canvas";

type Gesture = { pointerId: number; mode: "draw" | "move" | "resize"; pointId: string; roomId: string; startX: number; startY: number; origin: FloorPlacement; before: FloorDocument };
export default function FloorPlanEditor({ initial, points, kind, onSave, registrationForm }: {
  registrationForm?: ReactNode;
  initial: FloorPlanSnapshot; points: FloorPoint[]; kind: OrderPointKind;
  onSave: (revision: number, document: FloorDocument) => Promise<FloorSaveResult>;
}) {
  const [draft, setDraft] = useState(initial.document);
  const [saved, setSaved] = useState(initial);
  const [roomId, setRoomId] = useState(initial.document.rooms[0]?.id ?? "");
  const [selectedId, setSelectedId] = useState("");
  const [unplacedId, setUnplacedId] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [registrationOpen, setRegistrationOpen] = useState(false);
  const [drawing, setDrawing] = useState(false);
  const [drawingPointId, setDrawingPointId] = useState("");
  const [removeRoom, setRemoveRoom] = useState(false);
  const [feedback, setFeedback] = useState<{ error: boolean; message: string } | null>(null);
  const [pending, startTransition] = useTransition();
  const gesture = useRef<Gesture | null>(null), boardRef = useRef<HTMLDivElement>(null);
  const helpId = useId(), labelId = useId(), placementHelpId = useId(), registrationId = useId();
  const document = retainRegisteredFloorPoints(draft, points);
  const dirty = JSON.stringify(document) !== JSON.stringify(retainRegisteredFloorPoints(saved.document, points));
  const room = document.rooms.find(r => r.id === roomId) ?? document.rooms[0];
  const visiblePoints = points.filter(p => (p.kind ?? "table") === kind);
  const unplaced = visiblePoints.filter(p => !document.placements.some(item => item.pointId === p.id));
  // Keep the active draw target in the toolbar until pointer release. Removing it
  // on pointer-down can resize the toolbar and move the drawing canvas mid-gesture.
  const drawingPoint = visiblePoints.find(p => p.id === drawingPointId);
  const placementOptions = drawingPoint ? [drawingPoint, ...unplaced] : unplaced;
  const chosen = drawingPoint ?? unplaced.find(p => p.id === unplacedId) ?? unplaced[0];
  const selected = document.placements.find(p => p.pointId === selectedId && p.roomId === room?.id && visiblePoints.some(point => point.id === p.pointId));
  const selectedPoint = points.find(p => p.id === selected?.pointId);
  const noun = kind === "kiosk" ? "키오스크" : "테이블";
  const objectParticle = kind === "kiosk" ? "를" : "을";
  const placementReason = !visiblePoints.length
    ? `‘${noun} 추가’에서 ${noun}${objectParticle} 먼저 등록해 주세요.${!room ? " ‘룸 추가’로 공간도 만들어 주세요." : ""}`
    : !room ? "‘룸 추가’로 공간을 먼저 만들어 주세요. 룸을 만든 뒤 사각형을 그릴 수 있습니다."
      : !chosen ? `등록한 ${noun}${objectParticle} 모두 배치했습니다. 기존 사각형을 이동·조절하거나 새 ${noun}${objectParticle} 등록해 주세요.`
        : `배치할 ${noun}${objectParticle} 고른 뒤 ‘사각형 그리기’를 누르고 룸 안을 드래그하세요. ‘바로 배치’로 추가할 수도 있습니다.`;

  useEffect(() => {
    if (!dirty) return;
    const unload = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    const navigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const target = new URL(anchor.href, window.location.href);
      if (target.pathname === window.location.pathname && target.search === window.location.search) return;
      if (!window.confirm("저장하지 않은 배치도 변경 사항이 있습니다. 저장하지 않고 이동할까요?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", unload);
    window.document.addEventListener("click", navigation, true);
    return () => { window.removeEventListener("beforeunload", unload); window.document.removeEventListener("click", navigation, true); };
  }, [dirty]);

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
    const next = { id: crypto.randomUUID(), name: `룸 ${number}`, aspectRatio: 1.33 };
    setDraft(previous => ({ ...previous, rooms: [...previous.rooms, next] })); setRoomId(next.id); setEditing(true); setSelectedId(""); setRemoveRoom(false);
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
  const placementTools = <fieldset disabled={pending} className="site-stack-block" aria-describedby={placementHelpId}>
    <legend className="type-item-title">{noun} 배치 편집</legend>
    <div className="site-form-row">
      <label className="site-field-stack type-label">배치할 {noun}
        <select className="site-field w-full" value={chosen?.id ?? ""} disabled={!room || !chosen} onChange={e => { setUnplacedId(e.target.value); setDrawing(false); }}>
          {!chosen ? <option value="">배치할 {noun} 없음</option> : null}
          {placementOptions.map(point => <option key={point.id} value={point.id}>{point.label}</option>)}
        </select>
      </label>
      <button type="button" className="site-button site-button-outline" disabled={!room || !chosen} onClick={addPoint}>바로 배치</button>
      <button type="button" className={drawing ? "site-button site-button-primary" : "site-button site-button-outline"} disabled={!room || !chosen} aria-pressed={drawing} onClick={() => setDrawing(!drawing)}>{drawing ? "그리기 취소" : "사각형 그리기"}</button>
    </div>
    <p id={placementHelpId} className="type-body-sm site-copy-muted">{placementReason}</p>
  </fieldset>;
  if (!initial.available) return <div className="site-stack-group"><ContentPanel surface="notice" density="compact"><p className="type-body-sm">{initial.unavailableMessage ?? "배치도 저장 기능을 준비 중입니다. 리스트형에서는 기존 테이블·키오스크를 계속 관리할 수 있습니다."}</p></ContentPanel>{registrationForm ? <ContentPanel>{registrationForm}</ContentPanel> : null}</div>;
  return <ContentPanel>
    <div className="site-content-heading-row">
      <div className="site-stack-title"><h3 className="type-content-title">매장 배치도</h3><p className="type-body-sm site-copy-muted">테이블·키오스크 관리에서 같은 룸을 사용합니다. 현재 화면의 {noun} 위치를 표시합니다.</p></div>
      <div className="site-action-row">
        <button type="button" className={editing ? "site-button site-button-primary" : "site-button site-button-outline"} onClick={() => { setEditing(!editing); setDrawing(false); }} disabled={pending} aria-pressed={editing}><Pencil aria-hidden="true" />{editing ? "편집 접기" : "배치 편집"}</button>
        <button type="button" className="site-button site-button-primary" onClick={save} disabled={pending || !dirty}><Save aria-hidden="true" />{pending ? "저장 중" : "배치도 저장"}</button>
      </div>
    </div>
    <div className="site-action-row" data-distribution="between">
      <div className="site-action-row">
        <button type="button" className="site-button site-button-outline" onClick={addRoom} disabled={pending || document.rooms.length >= 30}><Plus aria-hidden="true" />룸 추가</button>
        {registrationForm ? <button type="button" className="site-button site-button-outline" disabled={pending} aria-expanded={registrationOpen} aria-controls={registrationOpen ? registrationId : undefined} onClick={() => { setRegistrationOpen(!registrationOpen); if (!registrationOpen) setEditing(true); }}><Plus aria-hidden="true" />{noun} 추가</button> : null}
      </div>
      <button type="button" className="site-button site-button-ghost" disabled={pending || !dirty} onClick={() => { setDraft(saved.document); setSelectedId(""); setRemoveRoom(false); }}>변경 취소</button>
    </div>
    {registrationForm && registrationOpen ? <div id={registrationId}><ContentPanel surface="muted">{registrationForm}</ContentPanel></div> : null}
    <p className="type-caption site-copy-muted" role="status">{dirty ? "저장하지 않은 변경이 있습니다." : "변경사항이 없습니다."}</p>
    {feedback ? <p className={`type-body-sm ${feedback.error ? "text-destructive" : "site-copy-muted"}`} role={feedback.error ? "alert" : "status"}>{feedback.message}</p> : null}
    {pending ? <LoadingState inline label="배치도를 저장하고 있습니다." /> : null}
    {!room ? <div className="site-stack-group">
      {editing ? placementTools : null}
      <EmptyState headingLevel={4} icon={<LayoutGrid />} title="첫 번째 룸을 추가해 주세요" description="룸은 지도에 배치할 때만 필요합니다. ‘룸 추가’로 홀, 룸 1, 테라스 같은 공간을 만들고, 편집을 마친 뒤 ‘배치도 저장’을 눌러 주세요." />
    </div> : <Tabs purpose="category" value={room.id} onValueChange={value => { setRoomId(value); setSelectedId(""); setDrawing(false); setRemoveRoom(false); }}>
      <TabsList aria-label="매장 공간">{document.rooms.map(r => <TabsTrigger key={r.id} value={r.id}>{r.name || "이름 없는 룸"}</TabsTrigger>)}</TabsList>
      <TabsContent value={room.id}>
        <div className="site-stack-group">
          {editing ? <fieldset disabled={pending} className="site-stack-block">
            <legend className="sr-only">룸과 {noun} 배치 편집</legend>
            <div className="site-form-row">
              <label className="site-field-stack type-label">룸 이름<input className="site-field w-full" value={room.name} maxLength={40} onChange={e => setDraft(previous => ({ ...previous, rooms: previous.rooms.map(r => r.id === room.id ? { ...r, name: e.target.value } : r) }))} /></label>
              <label className="site-field-stack type-label">룸 모양<select className="site-field w-full" value={room.aspectRatio} onChange={e => setDraft(previous => ({ ...previous, rooms: previous.rooms.map(r => r.id === room.id ? { ...r, aspectRatio: Number(e.target.value) } : r) }))}><option value={1.33}>기본 가로형 (4:3)</option><option value={1.78}>넓은 가로형 (16:9)</option><option value={1}>정사각형 (1:1)</option><option value={3 / 4}>세로형 (3:4)</option></select></label>
              <button type="button" className="site-button site-button-ghost" onClick={() => setRemoveRoom(true)}>룸 삭제</button>
            </div>
            {removeRoom ? <ContentPanel surface="notice" density="compact"><p className="type-body-sm">‘{room.name}’ 룸과 그 안의 배치를 지울까요? 등록된 테이블·키오스크와 주문 기록은 유지됩니다. 저장 전에는 ‘변경 취소’로 되돌릴 수 있습니다.</p><div className="site-action-row"><button type="button" className="site-button site-button-outline" onClick={() => { setDraft(previous => ({ rooms: previous.rooms.filter(r => r.id !== room.id), placements: previous.placements.filter(p => p.roomId !== room.id) })); setRemoveRoom(false); setSelectedId(""); }}>룸만 삭제</button><button type="button" className="site-button site-button-ghost" onClick={() => setRemoveRoom(false)}>취소</button></div></ContentPanel> : null}

          </fieldset> : null}
          {editing ? placementTools : null}
          <p id={helpId} className="type-footnote site-copy-muted">{drawing ? `빈 영역을 드래그해 ‘${chosen?.label}’의 사각형을 그려 주세요.` : editing ? "사각형을 끌어 이동하고 오른쪽 아래 모서리로 크기를 조절하세요. 방향키로 이동하거나 ‘상세 조정’의 위치·크기 입력란을 사용할 수도 있습니다. Shift+방향키는 크게 이동합니다." : "‘배치 편집’을 누르면 위치와 크기를 바꿀 수 있습니다. 룸 크기에 맞춘 상대 위치로 저장됩니다."}</p>
          <FloorPlanCanvas ref={boardRef} name={room.name} aspectRatio={room.aspectRatio} editing={editing} drawing={drawing} aria-describedby={helpId} onPointerDown={e => begin(e)} onPointerMove={move} onPointerUp={e => end(e)} onPointerCancel={e => end(e, true)} onLostPointerCapture={e => end(e, true)} onKeyDown={event => { if (event.key !== "Escape") return; setDrawing(false); setDrawingPointId(""); const g = gesture.current; if (!g) return; setDraft(g.before); gesture.current = null; if (boardRef.current?.hasPointerCapture(g.pointerId)) boardRef.current.releasePointerCapture(g.pointerId); }}>
            {document.placements.filter(p => p.roomId === room.id && visiblePoints.some(point => point.id === p.pointId)).map(p => {
              const point = visiblePoints.find(point => point.id === p.pointId)!;
              return <FloorPlanObject key={p.pointId} rect={p} label={point.label} selected={selected?.pointId === p.pointId} disabled={point.status === "disabled"} editing={editing} aria-describedby={helpId} onClick={() => setSelectedId(p.pointId)} onPointerDown={e => begin(e, p)} onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelectedId(p.pointId); }
                if (!editing || pending || !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return;
                e.preventDefault(); setSelectedId(p.pointId); const step = e.shiftKey ? 10 : 1;
                changePlacement(p.pointId, { ...p, x: p.x + (e.key === "ArrowRight" ? step : e.key === "ArrowLeft" ? -step : 0), y: p.y + (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0) });
              }} />;
            })}
          </FloorPlanCanvas>
          {editing ? <fieldset disabled={pending || !selected} className="site-stack-block" aria-labelledby={labelId}>
            <legend id={labelId} className="type-item-title">선택한 {noun} 관리</legend>
            <p className="type-body-sm truncate" role="status" title={selectedPoint?.label}>{selectedPoint ? `${selectedPoint.label} 선택됨` : `지도에서 ${noun}${objectParticle} 선택해 주세요.`}</p>
            <Collapsible open={detailsOpen} onOpenChange={setDetailsOpen} className="site-stack-block">
              <CollapsibleTrigger asChild><Button variant="ghost">상세 조정<ChevronDown aria-hidden="true" /></Button></CollapsibleTrigger>
              <CollapsibleContent><div className="site-form-row">{([ ["x", "왼쪽 위치 (%)"], ["y", "위쪽 위치 (%)"], ["width", "가로 크기 (%)"], ["height", "세로 크기 (%)"] ] as const).map(([key, label]) => <label className="site-field-stack type-label" data-field-width="short" key={key}>{label}<input className="site-field w-full" type="number" min={key === "x" || key === "y" ? 0 : 8} max={100} step={1} value={selected ? Math.round(selected[key] * 100) / 100 : ""} onChange={e => { const value = e.target.valueAsNumber; if (selected && Number.isFinite(value)) changePlacement(selected.pointId, { ...selected, [key]: value }); }} /></label>)}</div></CollapsibleContent>
            </Collapsible>
            <div className="site-form-row"><label className="site-field-stack type-label">다른 룸으로 이동<select className="site-field w-full" value={selected?.roomId ?? room.id} onChange={e => { if (!selected) return; const target = e.target.value; setDraft(previous => ({ ...previous, placements: previous.placements.map(p => p.pointId === selected.pointId ? { ...p, roomId: target } : p) })); setRoomId(target); }}>{document.rooms.map(r => <option key={r.id} value={r.id}>{r.name || "이름 없는 룸"}</option>)}</select></label><button type="button" className="site-button site-button-outline" onClick={() => { if (!selected) return; setDraft(previous => ({ ...previous, placements: previous.placements.filter(p => p.pointId !== selected.pointId) })); setSelectedId(""); }}>배치만 해제</button></div>
          </fieldset> : null}
          <p className="type-footnote site-copy-muted">배치되지 않은 {noun} {unplaced.length}개 · 현재 룸 {document.placements.filter(p => p.roomId === room.id && visiblePoints.some(point => point.id === p.pointId)).length}개</p>
        </div>
      </TabsContent>
    </Tabs>}
    {editing || dirty ? <div className="site-stack-block site-content-divider">
      <p className="type-body-sm site-copy-muted">룸 추가·이름·모양과 {noun}의 위치·크기는 ‘배치도 저장’을 눌러야 반영됩니다.</p>
      <div className="site-action-row"><button type="button" className="site-button site-button-primary" onClick={save} disabled={pending || !dirty}><Save aria-hidden="true" />{pending ? "저장 중" : "배치도 저장"}</button></div>
    </div> : null}
  </ContentPanel>;
}
