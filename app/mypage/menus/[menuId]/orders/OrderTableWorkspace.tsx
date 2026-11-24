"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Dialog, DialogContent } from "@/app/components/ui/dialog";
import { FloorPlanCanvas, FloorPlanObject } from "@/app/components/ui/floor-plan-canvas";
import { FloorPlanViewport } from "@/app/components/ui/floor-plan-viewport";
import { RoomLabel } from "@/app/components/ui/room-label";
import { FilterFill, Grid2X2, Link2, List, PrinterFill } from "@/app/components/ui/site-icon";
import { Switch } from "@/app/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import OrderCardSummary, { DEFAULT_ORDER_CARD_FIELDS, ORDER_CARD_FIELDS, type OrderCardField } from "@/components/mypage/OrderCardSummary";
import { FLOOR_PLAN_DISPLAY_ASPECT_RATIO, floorMemberships, readableFloorDocument } from "@/lib/menu-floor-plan";
import { isCurrentOrder } from "@/lib/order-history-query";
import { getHistoryPlacements, groupOperationHistory, representativeOperationOrder, type OperationHistoryRecord, type OperationsFloorPlan } from "@/lib/operations-history";
import type { OrderDashboardOrder, OrderDashboardPageData } from "@/lib/server/order-management-service";
import type { ManualOrderActions } from "@/lib/manual-order";
import ManualOrderDialog from "./ManualOrderDialog";
import OrderManagementList from "./OrderManagementList";
import OrderMoveDialog, { type OrderMoveSource } from "./OrderMoveDialog";
import type { OrderSettlementGroup, OrderSettlementIntent } from "@/lib/order-settlement";
import OrderSettlementDialog, { SettlementButtons } from "./OrderSettlementDialog";
import OrderPointDetail from "./OrderPointDetail";
import type { OrderManagementActionState } from "./action-state";
import OrderPointOperationDialog, { canPrintPointOrder, isPointOrderOperationAllowed, type PointOrderMutation, type PointOrderOperation } from "./OrderPointOperationDialog";

type Point = { id: string; label: string };
type TableSelection = { kind: "single"; id: string } | { kind: "checked"; ids: ReadonlySet<string> };
type Order = OrderDashboardOrder;

export default function OrderTableWorkspace({ menuSiteId, floorPlan, records, orders, permissions, receptionControl, refreshControl, mutateAction, transitionAction, pending, onPrint, manualOrderActions, moveAction, settlementGroups, settlementAction }: {
  menuSiteId: string;
  floorPlan: OperationsFloorPlan;
  records: OperationHistoryRecord[];
  orders: Order[];
  permissions: OrderDashboardPageData["permissions"];
  receptionControl?: ReactNode;
  refreshControl: ReactNode;
  mutateAction: PointOrderMutation;
  settlementGroups: OrderSettlementGroup[];
  settlementAction?: PointOrderMutation;
  moveAction?: PointOrderMutation;
  manualOrderActions?: ManualOrderActions;
  onPrint: (orders: Order[]) => void;
  transitionAction: (form: FormData) => void;
  pending: boolean;
}) {
  const [view, setView] = useState("map");
  const [roomId, setRoomId] = useState("");
  const [listRoomId, setListRoomId] = useState("all");
  const [selection, setSelection] = useState<TableSelection>();
  const [fields, setFields] = useState<ReadonlySet<OrderCardField>>(() => new Set(DEFAULT_ORDER_CARD_FIELDS));
  const [now, setNow] = useState<number | null>(null);
  const [detail, setDetail] = useState<Point & { orderId?: string; groupId?: string }>();
  const [feedback, setFeedback] = useState<OrderManagementActionState>();
  const [settlement, setSettlement] = useState<OrderSettlementIntent>();
  const [moveOrder, setMoveOrder] = useState<OrderMoveSource>();
  const [manualOrder, setManualOrder] = useState<Point>();
  const [operation, setOperation] = useState<(PointOrderOperation & { point: Point })>();
  const trigger = useRef<HTMLButtonElement>(null);
  const mapTab = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const receptionHelp = useId();
  const trackingElapsed = view === "list" || fields.has("elapsed");

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
  const activeListRoom = floorPlan.available && floor.rooms.some(room => room.id === listRoomId) ? listRoomId : "all";
  const roomsById = new Map(floor.rooms.map(room => [room.id, room.name]));
  const roomByPoint = new Map(floorPlan.available ? floorMemberships(floor).map(member => [member.pointId, member.roomId]) : []);
  const listRoomNames = new Map([...roomByPoint].flatMap(([pointId, id]) => {
    const name = roomsById.get(id);
    return name ? [[pointId, name] as const] : [];
  }));
  const pointsById = new Map(floorPlan.points.map(point => [point.id, point]));
  const settlementByTable = new Map(settlementGroups.flatMap(group => group.tableIds.map(id => [id, group] as const)));
  const tableLabel = (id: string) => pointsById.get(id)?.label ?? orders.find(order => order.tableId === id)?.tableLabel ?? "테이블";
  const settlementNumbers = new Map(settlementGroups.map((group, index) => [group.id, index + 1]));
  const groupsInRoom = new Set(settlementGroups.filter(group => group.tableIds.some(id => roomByPoint.get(id) === activeListRoom)).map(group => group.id));
  const listOrders = activeListRoom === "all" ? orders : orders.filter(order =>
    roomByPoint.get(order.tableId) === activeListRoom || Boolean(order.settlementGroupId && groupsInRoom.has(order.settlementGroupId)));

  const placements = getHistoryPlacements({ ...floorPlan, document: floor });
  const activePoints = permissions.canManage
    ? new Map(floorPlan.points.filter(point => point.status === "active").map(point => {
        const roomName = listRoomNames.get(point.id);
        return [point.id, { id: point.id, label: roomName ? `${roomName} · ${point.label}` : point.label }];
      }))
    : undefined;
  const manualPoints = manualOrderActions ? activePoints : undefined;
  const roomPoints = placements.flatMap(placement => {
    const point = pointsById.get(placement.pointId);
    return placement.roomId === room?.id && point ? [{ placement, point }] : [];
  });
  const placed = new Set(placements.map(placement => placement.pointId));
  const activeOrders = orders.filter(isCurrentOrder);
  const groups = groupOperationHistory(records.filter(record => record.attention));
  const ordersById = new Map(orders.map(order => [order.id, order]));
  const combineSources = new Map<string, Order[]>();
  const moveSources = new Map<string, OrderMoveSource>();
  const moveDestinations: Point[] = [];
  for (const [id, point] of activePoints ?? []) {
    if (pointsById.get(id)?.kind === "kiosk" || settlementByTable.has(id)) continue;
    const pointRecords = groups.get(id) ?? [];
    const pointOrders = pointRecords.flatMap(record => ordersById.get(record.id) ?? []);
    if (!pointOrders.length) {
      if (moveAction) moveDestinations.push(point);
    } else if (pointOrders.every(order => order.paymentStatus === "unpaid")) {
      if (settlementAction) combineSources.set(id, pointOrders);
      if (moveAction) {
        const representative = representativeOperationOrder(pointRecords);
        moveSources.set(id, { ...point, orderIds: pointOrders.map(order => order.id),
          status: representative?.orderStatus ?? pointOrders[0].status });
      }
    }
  }
  const unplaced = [...groups].filter(([id]) => !placed.has(id));
  const availableIds = roomPoints.filter(({ point }) => point.status === "active").map(({ point }) => point.id);
  const selectedHere = availableIds.filter(id => selection?.kind === "single" ? selection.id === id : selection?.ids.has(id));
  const selectedPointIds = new Set(selectedHere.flatMap(id => settlementByTable.get(id)?.tableIds ?? [id]));
  const manualTarget = selection?.kind === "single" && selectedPointIds.has(selection.id)
    ? manualPoints?.get(selection.id)
    : undefined;
  const moveTarget = selection?.kind === "single" && selectedPointIds.has(selection.id)
    ? moveSources.get(selection.id)
    : undefined;
  const detailGroup = detail?.groupId ? settlementGroups.find(group => group.id === detail.groupId) : undefined;
  const allChecked = selection?.kind === "checked" && availableIds.length > 0 && selectedHere.length === availableIds.length;
  const selectedOrders = activeOrders.filter(order => selectedPointIds.has(order.tableId));
  const cancelOrder = selectedOrders.length === 1 && isPointOrderOperationAllowed(selectedOrders[0], permissions, "cancel") ? selectedOrders[0] : undefined;
  const canPrintSelection = selectedOrders.length > 0 && selectedOrders.every(canPrintPointOrder);

  function settlementIntent(ids: ReadonlySet<string>): OrderSettlementIntent | undefined {
    if (!permissions.canManage || !settlementAction || !ids.size) return;
    const tableIds = [...ids];
    const group = settlementByTable.get(tableIds[0]);
    if (group && tableIds.every(id => group.tableIds.includes(id))) {
      return { action: "release", groupId: group.id, tableIds: group.tableIds,
        tableLabels: group.tableIds.map(tableLabel),
        orderIds: [], total: 0 };
    }
    if (tableIds.length < 2 || !tableIds.every(id => combineSources.has(id))) return;
    const members = tableIds.flatMap(id => combineSources.get(id) ?? []);
    return { action: "combine", tableIds, tableLabels: tableIds.map(id => activePoints?.get(id)?.label ?? "테이블"),
      orderIds: members.map(order => order.id), total: members.reduce((sum, order) => sum + order.totalAmount, 0) };
  }

  function selectSingle(id: string) {
    setSelection(previous => previous?.kind === "single" && selectedPointIds.has(id) ? undefined : { kind: "single", id });
  }

  function checkPoint(id: string, checked: boolean) {
    setSelection(previous => {
      const ids = new Set(previous?.kind === "checked" ? previous.ids : []);
      for (const member of settlementByTable.get(id)?.tableIds ?? [id]) {
        if (checked) ids.add(member);
        else ids.delete(member);
      }
      return ids.size > 0 ? { kind: "checked", ids } : undefined;
    });
  }

  function restoreFocus(event: Event) {
    event.preventDefault();
    const button = trigger.current;
    if (button?.isConnected && !button.disabled) button.focus();
    else mapTab.current?.focus();
  }

  function openDetail(point: Point, button: HTMLButtonElement, orderId?: string) {
    trigger.current = button;
    const groupId = orderId ? ordersById.get(orderId)?.settlementGroupId : settlementByTable.get(point.id)?.id;
    setDetail({ ...point, orderId, groupId });
  }

  function openOperation(kind: PointOrderOperation["kind"], order: Order, point: Point, button: HTMLButtonElement) {
    trigger.current = button;
    setOperation({ kind, orderId: order.id, point });
  }

  function openManualOrder(point: Point, button: HTMLButtonElement) {
    trigger.current = button;
    setManualOrder(point);
  }

  function openSettlement(intent: OrderSettlementIntent, button: HTMLButtonElement) {
    trigger.current = button;
    setSettlement(intent);
  }

  function openMoveOrder(source: OrderMoveSource, button: HTMLButtonElement) {
    trigger.current = button;
    setMoveOrder(source);
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
                <Button variant="outline" size="compact" disabled={!availableIds.length || allChecked}
                  onClick={() => setSelection({ kind: "checked", ids: new Set(availableIds) })}>전체선택</Button>
                <Button variant="secondary" size="compact" disabled={!selectedPointIds.size}
                  onClick={() => setSelection(undefined)}>선택해제</Button>
                {selectedPointIds.size > 0 && <span className="type-caption site-copy-muted" role="status">{selectedPointIds.size}곳 선택</span>}
              </div>
              {refreshControl}
            </div>
          </div>
        ) : null}
      </div>

      <div id={panelId}>
        {view === "list" ? (
          <OrderManagementList key={activeListRoom} orders={listOrders} roomNames={listRoomNames} menuSiteId={menuSiteId}
            permissions={permissions} now={now} pending={pending} refreshControl={refreshControl} transitionAction={transitionAction}
            onPrint={onPrint} manualPoints={manualPoints} openManualOrder={openManualOrder}
            moveSources={moveSources} openMoveOrder={openMoveOrder}
            settlementNumbers={settlementNumbers} settlementIntent={settlementIntent} openSettlement={openSettlement}
            openDetail={(order, button) => openDetail({ id: order.tableId, label: order.tableLabel }, button, order.id)}
            openOperation={(kind, order, button) => openOperation(kind, order, { id: order.tableId, label: order.tableLabel }, button)} />
        ) : !floorPlan.available || !room ? (
          <div className="site-floor-workspace-tools">
            <p role="status" className="type-body-sm">{floorPlan.available ? "저장된 룸 배치도가 없습니다." : floorPlan.unavailableMessage}</p>
          </div>
        ) : (
          <div className="site-floor-workspace-canvas">
            <FloorPlanViewport key={room.id} name={room.name}>
              <FloorPlanCanvas name={room.name} gridSize={room.gridSize} aspectRatio={FLOOR_PLAN_DISPLAY_ASPECT_RATIO}
                data-mobile-cards="true" data-order-table-canvas
                onClick={event => {
                  if (event.target === event.currentTarget) {
                    setSelection(previous => previous?.kind === "single" ? undefined : previous);
                  }
                }}>
                {roomPoints.map(({ placement, point }) => {
                  const pointRecords = groups.get(point.id) ?? [];
                  const representative = representativeOperationOrder(pointRecords);
                  const current = pointRecords.flatMap(record => {
                    const order = ordersById.get(record.id);
                    return order ? [order] : [];
                  });
                  const group = settlementByTable.get(point.id);
                  const groupNumber = group && settlementNumbers.get(group.id);
                  const combined = group ? activeOrders.filter(order => order.settlementGroupId === group.id) : [];
                  const printable = (group ? combined : current).filter(canPrintPointOrder);
                  const canPayCombined = group && settlementAction && permissions.canMarkManualPayment && combined.length > 0
                    && combined.every(order => order.status === "served" && order.paymentStatus === "unpaid");
                  const due = current.filter(order => order.paymentStatus === "unpaid");
                  const payable = due.length === 1 && current.every(order => order.status === "served")
                    && isPointOrderOperationAllowed(due[0], permissions, "payment") ? due[0] : undefined;
                  const showPayment = !group && current.length > 0 && current.every(order => order.status === "served") && due.length > 0;
                  const showRefund = current.length > 0 && current.every(order => order.status === "served" && ["paid", "manual_paid"].includes(order.paymentStatus));
                  const disabled = point.status !== "active";
                  const selected = selection?.kind === "single" && selectedPointIds.has(point.id);
                  const checked = selection?.kind === "checked" && selectedPointIds.has(point.id);
                  const label = disabled ? `${point.label} · 비활성` : point.label;
                  return (
                    <FloorPlanObject key={point.id} rect={placement} label={point.label} disabled={disabled}
                      selected={selected} data-checked={checked || undefined} data-order-settlement={groupNumber || undefined}
                      data-order-table-card data-point-kind={point.kind ?? "table"}>
                      <button type="button" className="site-order-table-card-select" disabled={disabled}
                        aria-label={`${point.label} 개별 선택`} aria-pressed={selected} onClick={() => selectSingle(point.id)} />
                      <div className="site-order-table-card-choice">
                        <Checkbox shape="circle" aria-label={`${point.label} 선택`} checked={checked} disabled={disabled}
                          onCheckedChange={value => checkPoint(point.id, value === true)} />
                        {groupNumber && <span className="site-action-row type-caption"><Link2 size={16} aria-hidden="true" /> 결합 {groupNumber}</span>}
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
                            {canPayCombined && (
                              <Button variant="outline" size="compact" disabled={pending}
                                onClick={event => openSettlement({ action: "pay", groupId: group.id, tableIds: group.tableIds,
                                  tableLabels: group.tableIds.map(tableLabel), orderIds: combined.map(order => order.id),
                                  total: combined.reduce((sum, order) => sum + order.totalAmount, 0) }, event.currentTarget)}>결제하기</Button>
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
                      ) : <>
                        <strong className="type-label site-order-table-card-empty">{label}</strong>
                        {group && <div className="site-action-row site-order-table-card-actions">
                          <Button variant="outline" size="compact" onClick={event => openDetail(point, event.currentTarget)}>열기</Button>
                        </div>}
                      </>}
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
            <Button variant="outline" size="compact" disabled={!manualTarget || pending}
              onClick={event => { if (manualTarget) openManualOrder(manualTarget, event.currentTarget); }}>
              수동 주문 추가
            </Button>
            <Button variant="outline-danger" size="compact" disabled={!moveTarget || pending}
              onClick={event => { if (moveTarget) openMoveOrder(moveTarget, event.currentTarget); }}>주문(테이블) 이동</Button>
            <Button variant="destructive" size="compact" disabled={!cancelOrder} data-order-table-cancel
              title={!cancelOrder ? "조리전 상태의 미결제 주문 한 건을 선택해 주세요." : undefined}
              onClick={event => {
                if (!cancelOrder) return;
                const point = pointsById.get(cancelOrder.tableId);
                if (point) openOperation("cancel", cancelOrder, point, event.currentTarget);
              }}>주문 취소</Button>
            <Button variant="outline" size="compact" disabled={!canPrintSelection}
              title={!canPrintSelection ? "조리가 시작된 주문만 인쇄할 수 있습니다." : undefined}
              onClick={() => onPrint(selectedOrders)}><PrinterFill aria-hidden="true" /> 청구서 인쇄</Button>
            <SettlementButtons disabled={pending} intent={settlementIntent(selectedPointIds)} open={openSettlement} />
          </div>
        </div>
      )}
    </ContentPanel>
  );

  return (
    <section className="site-stack-copy" aria-label="주문 테이블·리스트 보기">
      <ActionFeedbackToast message={feedback?.message} tone="success" eventKey={feedback} />
      {room && floorPlan.available ? (
        <Tabs purpose="section" appearance="rooms" value={view === "list" ? activeListRoom : room.id} onValueChange={id => {
          if (view === "list") {
            setListRoomId(id);
            return;
          }
          setRoomId(id);
          setSelection(undefined);
        }}>
          <TabsList size="sm" data-active-tone="solid" aria-label="주문 내역 룸">
            {view === "list" && <TabsTrigger value="all">모든 룸</TabsTrigger>}
            {floor.rooms.map(room => <TabsTrigger key={room.id} value={room.id}><RoomLabel name={room.name} emoji={room.emoji} /></TabsTrigger>)}
          </TabsList>
          <TabsContent value={view === "list" ? activeListRoom : room.id}>{shell}</TabsContent>
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
          {detail && <OrderPointDetail key={detail.groupId ?? detail.id} pointLabel={detail.label} menuSiteId={menuSiteId}
            group={detailGroup}
            groupTableLabels={detailGroup?.tableIds.map(tableLabel)}
            settlementAction={settlementAction}
            onGroupPaid={result => { setDetail(undefined); setSelection(undefined); setFeedback(result); }}
            openOtherOrders={detailGroup && activeOrders.some(order => order.tableId === detail.id && !order.settlementGroupId)
              ? () => setDetail({ id: detail.id, label: detail.label }) : undefined}
            orders={detail.groupId ? activeOrders.filter(order => order.settlementGroupId === detail.groupId)
              : detail.orderId ? orders.filter(order => order.id === detail.orderId)
                : activeOrders.filter(order => order.tableId === detail.id && !order.settlementGroupId)}
            permissions={permissions} onPrint={onPrint} mutateAction={mutateAction} />}
        </DialogContent>
      </Dialog>
      {settlement && settlementAction && <OrderSettlementDialog intent={settlement} menuSiteId={menuSiteId}
        mutateAction={settlementAction} close={() => setSettlement(undefined)} onCloseAutoFocus={restoreFocus}
        onSuccess={result => { setSettlement(undefined); setSelection(undefined); setFeedback(result); }} />}
      {moveOrder && moveAction && <OrderMoveDialog source={moveOrder} destinations={moveDestinations} menuSiteId={menuSiteId}
        mutateAction={moveAction} close={() => setMoveOrder(undefined)} onCloseAutoFocus={restoreFocus}
        onSuccess={result => {
          setMoveOrder(undefined);
          setSelection(undefined);
          setFeedback(result);
        }} />}
      {manualOrder && manualOrderActions && (
        <ManualOrderDialog actions={manualOrderActions} point={manualOrder}
          close={() => setManualOrder(undefined)} onCloseAutoFocus={restoreFocus}
          onSuccess={orderId => {
            setManualOrder(undefined);
            setFeedback({ status: "success", orderId, message: "후불 주문을 추가했습니다." });
          }} />
      )}
      {operation && <OrderPointOperationDialog key={operation.orderId} operation={operation} order={ordersById.get(operation.orderId)}
        pointLabel={operation.point.label} menuSiteId={menuSiteId} permissions={permissions} mutateAction={mutateAction}
        close={() => setOperation(undefined)} onSuccess={setFeedback} onCloseAutoFocus={restoreFocus} />}
    </section>
  );
}
