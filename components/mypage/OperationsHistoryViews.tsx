"use client";
import {FloorPlanViewport} from "@/app/components/ui/floor-plan-viewport";
import {readableFloorDocument} from "@/lib/menu-floor-plan";
import OrderCardSummary, { DEFAULT_ORDER_CARD_FIELDS, ORDER_CARD_FIELDS, type OrderCardField } from "./OrderCardSummary";
import { Checkbox } from "@/app/components/ui/checkbox";
import InfoTooltip from "@/components/ui/InfoTooltip";
import {SectionHeader} from "@/app/components/ui/section-header";
import {ViewStyleSelect} from "@/app/components/ui/view-style-select";
import {RoomLabel} from "@/app/components/ui/room-label";
import {useOperationsView} from "./OperationsViewLayout";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Armchair, FilterFill, Monitor } from "@/app/components/ui/site-icon";
import { ContentPanel } from "@/app/components/ui/content-panel";
import {
  FloorPlanCanvas,
  FloorPlanObject,
} from "@/app/components/ui/floor-plan-canvas";
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
} from "@/app/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/app/components/ui/dialog";
import { FLOOR_PLAN_DISPLAY_ASPECT_RATIO } from "@/lib/menu-floor-plan";
import {
  groupOperationHistory, representativeOperationOrder,
  getHistoryPlacements,
  type OperationHistoryRecord,
  type OperationsFloorPlan,
} from "@/lib/operations-history";

export default function OperationsHistoryViews({
  noun,
  records,
  floorPlan,
  renderList,
  renderDetail, renderPointDetail, listOnly = false,
}: {
  noun: "주문" | "호출";
  listOnly?: boolean;
  records: OperationHistoryRecord[];
  floorPlan: OperationsFloorPlan;
  renderList: (open: (recordId: string) => void) => ReactNode;
  renderDetail: (recordIds: string[]) => ReactNode;
  renderPointDetail?: (point: { id: string; label: string }, recordIds: string[]) => ReactNode;
}) {
  const sharedView=useOperationsView();
  const [localView, setLocalView] = useState("map"),
    [roomId, setRoomId] = useState("");
  const view=sharedView?.view??localView,setView=sharedView?.setView??setLocalView;
  const [selection, setSelection] = useState<
    { pointId: string; label: string } | { recordId: string; label: string } | null
  >(null);
  const orderMap = noun === "주문" && !listOnly;
  const [cardFields, setCardFields] = useState<ReadonlySet<OrderCardField>>(() => new Set(DEFAULT_ORDER_CARD_FIELDS));
  const [now, setNow] = useState<number | null>(null);
  const trackElapsed = orderMap && view === "map" && cardFields.has("elapsed");
  useEffect(() => {
    if (!trackElapsed) return;
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const interval = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(interval);
    };
  }, [trackElapsed]);

  function setCardField(field: OrderCardField, checked: boolean) {
    setCardFields(previous => {
      const next = new Set(previous);
      if (checked) next.add(field);
      else next.delete(field);
      return next;
    });
  }

  const groups = groupOperationHistory(records),
    placements = getHistoryPlacements({...floorPlan,document:readableFloorDocument(floorPlan.document)});
  const room =
    floorPlan.document.rooms.find((item) => item.id === roomId) ??
    floorPlan.document.rooms[0];
  const placedIds = new Set(placements.map((item) => item.pointId));
  const unplaced = [...groups].filter(([id]) => !placedIds.has(id));
  const selected = selection
    ? "pointId" in selection
      ? (groups.get(selection.pointId) ?? [])
      : records.filter((item) => item.id === selection.recordId)
    : [];
  const pointTrigger = useRef<HTMLElement | null>(null);
  const openPoint = (pointId: string, trigger: HTMLElement) => {
    pointTrigger.current = trigger;
    setSelection({
      pointId,
      label: floorPlan.points.find(point => point.id === pointId)?.label ?? groups.get(pointId)?.[0]?.pointLabel ?? "테이블·키오스크",
    });
  };
  const openRecord = (recordId: string) => {
    setSelection({ recordId, label: records.find(record => record.id === recordId)?.pointLabel ?? "테이블·키오스크" });
  };
  const pointDetail = renderPointDetail && selection && "pointId" in selection ? selection : null;
  const recordIds = selected.map(item => item.id);
  const detailDialog = (
    <Dialog open={selection !== null} onOpenChange={open => { if (!open) setSelection(null); }}>
      <DialogContent scrollable data-order-point-detail={Boolean(pointDetail) || undefined} className="print:hidden"
        aria-describedby={undefined} onCloseAutoFocus={event => {
          const trigger = pointTrigger.current;
          pointTrigger.current = null;
          if (trigger?.isConnected) {
            event.preventDefault();
            trigger.focus();
          }
        }}>
        {pointDetail && renderPointDetail
          ? renderPointDetail({ id: pointDetail.pointId, label: pointDetail.label }, recordIds)
          : <>
              <DialogHeader reserveCloseButton>
                <div className="site-action-row">
                  <DialogTitle>{selected[0]?.pointLabel ?? selection?.label ?? "테이블·키오스크"} {noun} 내역</DialogTitle>
                  <InfoTooltip label="내역 갱신 안내"><p>{listOnly ? "현재 조회 조건의 내역을 표시합니다. 새 내역은 다시 조회하면 반영됩니다." : "현재 조회 조건의 내역을 표시하며 15초마다 갱신합니다."}</p></InfoTooltip>
                </div>
              </DialogHeader>
              {selected.length ? renderDetail(recordIds) : (
                <p className="type-body-sm site-copy-muted">현재 조건에 맞는 내역이 없습니다.</p>
              )}
            </>}
      </DialogContent>
    </Dialog>
  );
  if(listOnly)return <div className="site-stack-group">{renderList(openRecord)}{detailDialog}</div>;
  return (
    <div className="site-stack-group">
      {!sharedView?<SectionHeader title={`${noun} 관리`} actions={<ViewStyleSelect label={`${noun} 내역 보기 유형`} value={view} onValueChange={setView}/>}/>:null}
      {view==="list"?renderList(openRecord):<div className="site-stack-group">
            {!floorPlan.available ? (
              <ContentPanel surface="notice" density="compact">
                <p role="status" className="type-body-sm">
                  {floorPlan.unavailableMessage}
                </p>
              </ContentPanel>
            ) : !room ? (
              <ContentPanel surface="muted">
                <div className="site-stack-title">
                  <h3 className="type-content-title">
                    저장된 룸 배치도가 없습니다.
                  </h3>
                  <p className="type-body-sm site-copy-muted">
                    테이블·키오스크 관리에서 룸과 배치를 저장하면 같은 배치도가
                    표시됩니다. 현재 내역은 아래에서 바로 확인할 수 있습니다.
                  </p>
                </div>
              </ContentPanel>
            ) : (
              <Tabs
                purpose="section"
                appearance="rooms"
                value={room.id}
                onValueChange={setRoomId}
              >
                <div className="site-stack-group">
                <TabsList size="sm" aria-label={`${noun} 내역 룸`}>
                  {floorPlan.document.rooms.map((item) => (
                    <TabsTrigger key={item.id} value={item.id}>
                      <RoomLabel name={item.name} emoji={item.emoji}/>
                    </TabsTrigger>
                  ))}
                </TabsList>
                <TabsContent value={room.id}>
                  <section className="site-stack-group" aria-label={`${room.name} ${noun} 배치도`}>
                    {orderMap && (
                      <div className="site-action-row site-order-map-filters" role="group" aria-label="보기필터">
                        <span className="site-action-row type-label" data-wrap="nowrap" aria-hidden="true"><FilterFill /> 보기필터</span>
                        {ORDER_CARD_FIELDS.map(({ id, label }) => (
                          <label key={id} className="site-action-row type-label" data-wrap="nowrap">
                            <Checkbox shape="circle" checked={cardFields.has(id)}
                              onCheckedChange={checked => setCardField(id, checked === true)} />
                            {label}
                          </label>
                        ))}
                      </div>
                    )}
                    <FloorPlanViewport name={room.name}><FloorPlanCanvas
                      data-mobile-cards="true"
                      name={room.name}
                      data-order-cards={noun === "주문" || undefined}
                      aspectRatio={FLOOR_PLAN_DISPLAY_ASPECT_RATIO}
                    >
                      {placements
                        .filter((item) => item.roomId === room.id)
                        .map((placement) => {
                          const point = floorPlan.points.find(
                            (item) => item.id === placement.pointId,
                          )!;
                          const history = groups.get(point.id) ?? [],
                            latest =
                              noun === "주문" && history.some(item=>item.orderNumber!==undefined) ? representativeOperationOrder(history) : history.find((item) => item.attention) ?? history[0];
                          const count = history.filter(
                            (item) => item.attention,
                          ).length;
                          const orderCard = Boolean(orderMap && latest?.orderNumber !== undefined);
                          const summary = latest ? orderCard ? (
                            <OrderCardSummary pointLabel={point.status === "active" ? point.label : `${point.label} · 비활성`}
                              order={latest} records={history} fields={cardFields} now={now} />
                          ) : (
                            <>
                              <span>
                                {count
                                  ? `처리할 ${noun} ${count}건`
                                  : `${noun} ${history.length}건`}
                              </span>
                              <span>{latest.status}</span>
                              <span>{latest.summary}</span>
                              {latest.options ? (
                                <span>{latest.options}</span>
                              ) : null}
                              <span>{latest.time}</span>
                              {history.length > 1 ? (
                                <span>
                                  외 {history.length - 1}건 · 눌러서 전체 보기
                                </span>
                              ) : null}
                            </>
                          ) : orderMap ? null : <span>표시 내역 없음</span>;
                          return (
                            <FloorPlanObject
                              key={point.id}
                              rect={placement}
                              label={point.label}
                              showLabel={!orderCard}
                              data-order-map-card={orderCard || undefined}
                              typeLabel={
                                point.kind === "kiosk" ? "키오스크" : "테이블"
                              }
                              icon={
                                point.kind === "kiosk" ? (
                                  <Monitor />
                                ) : (
                                  <Armchair />
                                )
                              }
                              disabled={point.status !== "active"}
                              selected={Boolean(
                                selection &&
                                  "pointId" in selection &&
                                  selection.pointId === point.id,
                              )}
                              summary={summary}
                              onClick={event => openPoint(point.id, event.currentTarget)}
                              onKeyDown={(event) => {
                                if (
                                  event.key === "Enter" ||
                                  event.key === " "
                                ) {
                                  event.preventDefault();
                                  openPoint(point.id, event.currentTarget);
                                }
                              }}
                            />
                          );
                        })}
                    </FloorPlanCanvas></FloorPlanViewport>
                  </section>
                </TabsContent>
                </div>
              </Tabs>
            )}
            {unplaced.length ? (
              <ContentPanel aria-label={`배치되지 않은 ${noun} 내역`}>
                <div className="site-stack-title">
                  <h3 className="type-content-title">
                    {floorPlan.available
                      ? "배치도에 없는 테이블·키오스크 내역"
                      : "테이블·키오스크별 내역"}
                  </h3>
                  <p className="type-body-sm site-copy-muted">
                    룸에 배치하지 않았거나 보관된 항목의 내역도 확인할 수
                    있습니다.
                  </p>
                </div>
                <div className="site-action-row">
                  {unplaced.map(([pointId, history]) => (
                    <button
                      type="button"
                      key={pointId}
                      className="site-button site-button-outline"
                      onClick={event => openPoint(pointId, event.currentTarget)}
                    >
                      {history[0].pointLabel} · {history.length}건
                    </button>
                  ))}
                </div>
              </ContentPanel>
            ) : null}
            {!records.length ? (
              <p className="type-body-sm site-copy-muted" role="status">
                표시할 {noun} 내역이 없습니다.
              </p>
            ) : null}
      </div>}
      {detailDialog}
    </div>
  );
}
