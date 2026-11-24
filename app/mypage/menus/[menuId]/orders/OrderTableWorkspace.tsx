"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { FloorPlanCanvas, FloorPlanObject } from "@/app/components/ui/floor-plan-canvas";
import { FloorPlanViewport } from "@/app/components/ui/floor-plan-viewport";
import { RoomLabel } from "@/app/components/ui/room-label";
import { FilterFill, Grid2X2, List, PrinterFill } from "@/app/components/ui/site-icon";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import OrderCardSummary, { DEFAULT_ORDER_CARD_FIELDS, ORDER_CARD_FIELDS, type OrderCardField } from "@/components/mypage/OrderCardSummary";
import { FLOOR_PLAN_DISPLAY_ASPECT_RATIO, readableFloorDocument } from "@/lib/menu-floor-plan";
import { getHistoryPlacements, groupOperationHistory, representativeOperationOrder, type OperationHistoryRecord, type OperationsFloorPlan } from "@/lib/operations-history";
import type { OrderDashboardOrder, OrderDashboardPageData } from "@/lib/server/order-management-service";
import OrderPointDetail from "./OrderPointDetail";
import type { OrderManagementActionState } from "./action-state";
import OrderPointOperationDialog, { canPrintPointOrder, isPointOrderOperationAllowed, type PointOrderMutation, type PointOrderOperation } from "./OrderPointOperationDialog";

type Selection = { id: string; label: string };
type Order = OrderDashboardOrder;

export default function OrderTableWorkspace({ menuSiteId, floorPlan, records, orders, permissions, receptionControl, refreshControl, mutateAction, onPrint, list }: {
  menuSiteId: string;
  floorPlan: OperationsFloorPlan;
  records: OperationHistoryRecord[];
  orders: Order[];
  permissions: OrderDashboardPageData["permissions"];
  receptionControl?: ReactNode;
  refreshControl: ReactNode;
  mutateAction: PointOrderMutation;
  onPrint: (orders: Order[]) => void;
  list: ReactNode;
}) {
  const [view, setView] = useState("map");
  const [roomId, setRoomId] = useState("");
  const [selected, setSelected] = useState<ReadonlySet<string>>(() => new Set());
  const [fields, setFields] = useState<ReadonlySet<OrderCardField>>(() => new Set(DEFAULT_ORDER_CARD_FIELDS));
  const [now, setNow] = useState<number | null>(null);
  const [detail, setDetail] = useState<Selection>();
  const [feedback, setFeedback] = useState<OrderManagementActionState>();
  const [operation, setOperation] = useState<(PointOrderOperation & { point: Selection })>();
  const trigger = useRef<HTMLButtonElement>(null);
  const mapTab = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const receptionHelp = useId();
  const trackingElapsed = view === "map" && fields.has("elapsed");

  useEffect(() => {
    if (!trackingElapsed) return;
    const frame = window.requestAnimationFrame(() => setNow(Date.now()));
    const timer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearInterval(timer);
    };
  }, [trackingElapsed]);

  const floor = readableFloorDocument(floorPlan.document);
  const room = floor.rooms.find(room => room.id === roomId) ?? floor.rooms[0];
  const placements = getHistoryPlacements({ ...floorPlan, document: floor });
  const pointsById = new Map(floorPlan.points.map(point => [point.id, point]));
  const roomPoints = placements.flatMap(placement => {
    const point = pointsById.get(placement.pointId);
    return placement.roomId === room?.id && point ? [{ placement, point }] : [];
  });
  const placed = new Set(placements.map(placement => placement.pointId));
  const groups = groupOperationHistory(records);
  const unplaced = [...groups].filter(([id]) => !placed.has(id));
  const selectedPoints = roomPoints.filter(({ point }) => point.status === "active" && selected.has(point.id));
  const availableIds = roomPoints.filter(({ point }) => point.status === "active").map(({ point }) => point.id);
  const allSelected = availableIds.length > 0 && availableIds.length === selectedPoints.length;
  const selectedPointIds = new Set(selectedPoints.map(({ point }) => point.id));
  const selectedOrders = orders.filter(order => selectedPointIds.has(order.tableId));
  const cancelOrder = selectedOrders.length === 1 && isPointOrderOperationAllowed(selectedOrders[0], permissions, "cancel") ? selectedOrders[0] : undefined;
  const canPrintSelection = selectedOrders.length > 0 && selectedOrders.every(canPrintPointOrder);
  const ordersById = new Map(orders.map(order => [order.id, order]));

  function restoreFocus(event: Event) {
    event.preventDefault();
    const button = trigger.current;
    if (button?.isConnected && !button.disabled) button.focus();
    else mapTab.current?.focus();
  }

  function openDetail(point: Selection, button: HTMLButtonElement) {
    trigger.current = button;
    setDetail(point);
  }

  function openOperation(kind: PointOrderOperation["kind"], order: Order, point: Selection, button: HTMLButtonElement) {
    trigger.current = button;
    setOperation({ kind, orderId: order.id, point });
  }

  const shell = (
    <ContentPanel as="section" layout="canvas" data-order-table-workspace aria-label="주문 관리 작업 영역">
      <div className="site-floor-workspace-tools">
        <div className="site-action-row" data-distribution="between">
          <Tabs purpose="section" value={view} onValueChange={setView}>
            <TabsList size="sm" aria-label="주문 보기 방식">
              <TabsTrigger ref={mapTab} value="map" aria-controls={panelId}><Grid2X2 aria-hidden="true" /> 테이블뷰</TabsTrigger>
              <TabsTrigger value="list" aria-controls={panelId}><List aria-hidden="true" /> 리스트뷰</TabsTrigger>
            </TabsList>
          </Tabs>
          <div className="site-action-row site-order-table-switches">
            {receptionControl}
            <label className="site-action-row type-label" data-wrap="nowrap">
              알림톡 <Switch size="sm" disabled checked={false} aria-label="알림톡" aria-describedby={receptionHelp} />
              <span id={receptionHelp} className="sr-only">알림톡 연동 준비 중</span>
            </label>
          </div>
        </div>
        {view === "map" ? (
          <div className="site-content-divider site-stack-block" data-density="compact">
            <div className="site-action-row site-order-map-filters" role="group" aria-label="보기필터">
              <span className="site-action-row type-label" data-wrap="nowrap" aria-hidden="true"><FilterFill /> 보기필터</span>
              {ORDER_CARD_FIELDS.map(({ id, label }) => (
                <label key={id} className="site-action-row type-label" data-wrap="nowrap">
                  <Checkbox shape="circle" checked={fields.has(id)} onCheckedChange={checked => setFields(previous => {
                    const next = new Set(previous);
                    if (checked) next.add(id);
                    else next.delete(id);
                    return next;
                  })} />
                  {label}
                </label>
              ))}
            </div>
            <div className="site-action-row" data-distribution="between">
              <div className="site-action-row">
                <Button variant="outline" size="compact" disabled={!availableIds.length || allSelected}
                  onClick={() => setSelected(new Set(availableIds))}>전체선택</Button>
                <Button variant="secondary" size="compact" disabled={!selectedPoints.length}
                  onClick={() => setSelected(new Set())}>선택해제</Button>
                {selectedPoints.length > 0 && <span className="type-caption site-copy-muted" role="status">{selectedPoints.length}곳 선택</span>}
              </div>
              {refreshControl}
            </div>
          </div>
        ) : <div className="site-action-row" data-distribution="end">{refreshControl}</div>}
      </div>

      <div id={panelId}>
        {view === "list" ? <div className="site-floor-workspace-tools">{list}</div> : !floorPlan.available || !room ? (
          <div className="site-floor-workspace-tools">
            <p role="status" className="type-body-sm">{floorPlan.available ? "저장된 룸 배치도가 없습니다." : floorPlan.unavailableMessage}</p>
          </div>
        ) : (
          <div className="site-floor-workspace-canvas">
            <FloorPlanViewport key={room.id} name={room.name}>
              <FloorPlanCanvas name={room.name} aspectRatio={FLOOR_PLAN_DISPLAY_ASPECT_RATIO}
                data-mobile-cards="true" data-order-table-canvas>
                {roomPoints.map(({ placement, point }) => {
                  const pointRecords = groups.get(point.id) ?? [];
                  const representative = representativeOperationOrder(pointRecords);
                  const current = pointRecords.flatMap(record => {
                    const order = ordersById.get(record.id);
                    return order ? [order] : [];
                  });
                  const printable = current.filter(canPrintPointOrder);
                  const due = current.filter(order => order.paymentStatus === "unpaid");
                  const payable = due.length === 1 && current.every(order => order.status === "served")
                    && isPointOrderOperationAllowed(due[0], permissions, "payment") ? due[0] : undefined;
                  const showPayment = current.length > 0 && current.every(order => order.status === "served") && due.length > 0;
                  const showRefund = current.length > 0 && current.every(order => order.status === "served" && ["paid", "manual_paid"].includes(order.paymentStatus));
                  const checked = selectedPointIds.has(point.id);
                  const label = point.status === "active" ? point.label : `${point.label} · 비활성`;
                  return (
                    <FloorPlanObject key={point.id} rect={placement} label={point.label} disabled={point.status !== "active"}
                      selected={checked} data-order-table-card data-point-kind={point.kind ?? "table"}>
                      <div className="site-order-table-card-choice">
                        <Checkbox shape="circle" aria-label={`${point.label} 선택`} checked={checked} disabled={point.status !== "active"}
                          onCheckedChange={value => setSelected(previous => {
                            const next = new Set(previous);
                            if (value === true) next.add(point.id);
                            else next.delete(point.id);
                            return next;
                          })} />
                      </div>
                      {representative ? (
                        <>
                          <div className="site-floor-object-summary type-caption">
                            <OrderCardSummary pointLabel={label} order={representative} records={pointRecords} fields={fields} now={now} />
                          </div>
                          <div className="site-action-row site-order-table-card-actions" data-wrap="nowrap">
                            {printable.length > 0 && (
                              <Button variant="ghost" size="icon" iconSize="compact" aria-label={`${point.label} 청구서 인쇄`}
                                title="청구서 인쇄" onClick={() => onPrint(printable)}><PrinterFill aria-hidden="true" /></Button>
                            )}
                            {showPayment && (
                              <Button variant="outline" size="compact" disabled={!payable}
                                title={!payable ? "상세 화면에서 결제할 주문을 선택해 주세요." : undefined}
                                onClick={event => { if (payable) openOperation("payment", payable, point, event.currentTarget); }}>결제하기</Button>
                            )}
                            {showRefund && <Button variant="outline" size="compact" disabled title="환불취소 연동 준비 중">환불취소</Button>}
                            <Button variant="outline" size="compact" onClick={event => openDetail(point, event.currentTarget)}>열기</Button>
                          </div>
                        </>
                      ) : <strong className="type-label site-order-table-card-empty">{label}</strong>}
                    </FloorPlanObject>
                  );
                })}
              </FloorPlanCanvas>
            </FloorPlanViewport>
          </div>
        )}
      </div>
      {view === "map" && (
        <div className="site-floor-workspace-footer">
          <div className="site-action-row" data-distribution="center">
            <Button variant="outline" size="compact" disabled title="수동 주문 추가 준비 중">수동 주문 추가</Button>
            <Button variant="outline-danger" size="compact" disabled title="주문 이동 준비 중">주문(테이블) 이동</Button>
            <Button variant="secondary" size="compact" disabled={!cancelOrder}
              title={!cancelOrder ? "조리전 상태의 미결제 주문 한 건을 선택해 주세요." : undefined}
              onClick={event => {
                if (!cancelOrder) return;
                const point = pointsById.get(cancelOrder.tableId);
                if (point) openOperation("cancel", cancelOrder, point, event.currentTarget);
              }}>주문 취소</Button>
            <Button variant="outline" size="compact" disabled={!canPrintSelection}
              title={!canPrintSelection ? "조리가 시작된 주문만 인쇄할 수 있습니다." : undefined}
              onClick={() => onPrint(selectedOrders)}><PrinterFill aria-hidden="true" /> 청구서 인쇄</Button>
          </div>
        </div>
      )}
    </ContentPanel>
  );

  return (
    <section className="site-stack-copy" aria-label="주문 테이블·리스트 보기">
      <ActionFeedbackToast message={feedback?.message} tone="success" eventKey={feedback} />
      {room && floorPlan.available ? (
        <Tabs purpose="section" appearance="rooms" value={room.id} onValueChange={id => {
          setRoomId(id);
          setSelected(new Set());
        }}>
          {view === "map" && <TabsList size="sm" data-active-tone="solid" aria-label="주문 내역 룸">
            {floor.rooms.map(room => <TabsTrigger key={room.id} value={room.id}><RoomLabel name={room.name} emoji={room.emoji} /></TabsTrigger>)}
          </TabsList>}
          <TabsContent value={room.id}>{shell}</TabsContent>
        </Tabs>
      ) : shell}
      {view === "map" && unplaced.length > 0 && (
        <ContentPanel aria-label="배치되지 않은 주문 내역">
          <h3 className="type-content-title">배치되지 않은 주문 내역</h3>
          <div className="site-action-row">
            {unplaced.map(([id, pointOrders]) => (
              <Button key={id} variant="outline" onClick={event => openDetail({ id, label: pointOrders[0].pointLabel }, event.currentTarget)}>
                {pointOrders[0].pointLabel} · {pointOrders.length}건
              </Button>
            ))}
          </div>
        </ContentPanel>
      )}
      <Dialog open={detail !== undefined} onOpenChange={open => { if (!open) setDetail(undefined); }}>
        <DialogContent scrollable data-order-point-detail className="print:hidden" aria-describedby={undefined} onCloseAutoFocus={restoreFocus}>
          {detail && <OrderPointDetail key={detail.id} pointLabel={detail.label} menuSiteId={menuSiteId}
            orders={orders.filter(order => order.tableId === detail.id)} permissions={permissions} onPrint={onPrint} mutateAction={mutateAction} />}
        </DialogContent>
      </Dialog>
      {operation && <OrderPointOperationDialog key={operation.orderId} operation={operation} order={ordersById.get(operation.orderId)}
        pointLabel={operation.point.label} menuSiteId={menuSiteId} permissions={permissions} mutateAction={mutateAction}
        close={() => setOperation(undefined)} onSuccess={setFeedback} onCloseAutoFocus={restoreFocus} />}
    </section>
  );
}
