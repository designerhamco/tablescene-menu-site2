"use client";

import { Fragment, useState, type ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from "@/app/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { SearchField } from "@/app/components/ui/search-field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { FilterFill, Link2, PrinterFill } from "@/app/components/ui/site-icon";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import OrderCookingFlag from "@/components/mypage/OrderCookingFlag";
import { formatAmount, PAYMENT_LABELS } from "@/components/mypage/OrderReceipt";
import OrderStage from "@/components/mypage/OrderStage";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { KITCHEN_STAGE_LABELS, getKitchenOptionLabels } from "@/lib/kitchen-order";
import { formatElapsedMinutes, formatKoreanClockTime, formatKoreanDateTime } from "@/lib/korean-date-time";
import { getOrderListGroups, getOrderListPaymentFilter, type OrderListSearchField, type OrderListStatus } from "@/lib/order-management-list";
import type { OrderDashboardOrder, OrderDashboardPageData } from "@/lib/server/order-management-service";
import { canPrintPointOrder, isPointOrderOperationAllowed, type PointOrderOperation } from "./OrderPointOperationDialog";

const searchLabels: Record<OrderListSearchField, string> = { number: "주문번호", menu: "메뉴명", point: "테이블·키오스크" };
const statusLabels: Record<OrderListStatus, string> = { all: "모든 상태", ...KITCHEN_STAGE_LABELS, served: "픽업·서빙 완료" };
import type { OrderMoveSource } from "./OrderMoveDialog";

type Order = OrderDashboardOrder;

function ColumnFilter({ label, options, selected, change }: {
  label: string;
  options: { id: string; label: string }[];
  selected: ReadonlySet<string> | null;
  change: (values: ReadonlySet<string> | null) => void;
}) {
  const picked = selected ? options.filter(option => selected.has(option.id)).length : options.length;
  const all = picked === options.length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" iconSize="compact" aria-label={label} disabled={!options.length} data-order-list-filter-active={!all || undefined}>
          <FilterFill aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" aria-label={label} className="site-order-list-filter">
        <p className="type-label">{label}</p>
        <label className="site-action-row type-label" data-wrap="nowrap">
          <Checkbox shape="circle" checked={all || (picked > 0 ? "indeterminate" : false)}
            onCheckedChange={() => change(all ? new Set() : null)} /> 전체
        </label>
        {options.map(option => (
          <label key={option.id} className="site-action-row type-body-sm" data-wrap="nowrap">
            <Checkbox shape="circle" checked={selected === null || selected.has(option.id)} onCheckedChange={checked => {
              const next = new Set(selected ?? options.map(item => item.id));
              if (checked) next.add(option.id);
              else next.delete(option.id);
              change(next.size === options.length ? null : next);
            }} />
            <span>{option.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function OrderManagementList({ orders, roomNames, menuSiteId, permissions, now, pending, refreshControl, transitionAction, onPrint, openDetail, openOperation, manualPoints, openManualOrder, moveSources, openMoveOrder }: {
  orders: Order[];
  roomNames: ReadonlyMap<string, string>;
  menuSiteId: string;
  permissions: OrderDashboardPageData["permissions"];
  now: number | null;
  pending: boolean;
  refreshControl: ReactNode;
  transitionAction: (form: FormData) => void;
  onPrint: (orders: Order[]) => void;
  openDetail: (order: Order, trigger: HTMLButtonElement) => void;
  manualPoints?: ReadonlyMap<string, { id: string; label: string }>;
  openManualOrder: (point: { id: string; label: string }, trigger: HTMLButtonElement) => void;
  moveSources: ReadonlyMap<string, OrderMoveSource>;
  openMoveOrder: (source: OrderMoveSource, trigger: HTMLButtonElement) => void;
  openOperation: (kind: PointOrderOperation["kind"], order: Order, trigger: HTMLButtonElement) => void;
}) {
  const [searchField, setSearchField] = useState<OrderListSearchField>("number");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<OrderListStatus>("all");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [menus, setMenus] = useState<ReadonlySet<string> | null>(null);
  const [payments, setPayments] = useState<ReadonlySet<string> | null>(null);
  const [selection, setSelection] = useState<ReadonlySet<string>>(() => new Set());
  const groups = getOrderListGroups(orders, { query, searchField, status, oldestFirst, menus, payments });
  const visibleOrders = groups.flatMap(group => group.orders.map(row => row.order));
  const selectedOrders = visibleOrders.filter(order => selection.has(order.id));
  const [pointId, otherPoint] = new Set(selectedOrders.map(order => order.tableId));
  const manualTarget = pointId && !otherPoint ? manualPoints?.get(pointId) : undefined;
  const moveTarget = pointId && !otherPoint ? moveSources.get(pointId) : undefined;
  const all = visibleOrders.length > 0 && visibleOrders.length === selectedOrders.length;
  const cancel = selectedOrders.length === 1 && isPointOrderOperationAllowed(selectedOrders[0], permissions, "cancel") ? selectedOrders[0] : undefined;
  const print = selectedOrders.length > 0 && selectedOrders.every(canPrintPointOrder);
  const menuOptions = [...new Set(orders.flatMap(order => order.items.map(item => item.name)))]
    .sort((a, b) => a.localeCompare(b, "ko")).map(name => ({ id: name, label: name }));
  const paymentOptions = [...new Set(["unpaid", "completed", ...orders.map(order => getOrderListPaymentFilter(order.paymentStatus))])]
    .map(value => ({ id: value, label: value === "completed" ? "결제 완료" : (PAYMENT_LABELS[value] ?? value) }));

  function clearSelection() {
    setSelection(new Set());
  }

  return (
    <>
      <div className="site-floor-workspace-tools">
        <div className="site-action-row" data-distribution="between">
          <div className="site-form-row site-order-list-search-row" data-alignment="center">
            <Select value={searchField} onValueChange={value => {
              setSearchField(value as OrderListSearchField);
              setQuery("");
              clearSelection();
            }}>
              <SelectTrigger size="sm" className="w-auto" aria-label="검색 기준"><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(searchLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="site-order-list-search">
              <SearchField fieldSize="sm" label={`${searchLabels[searchField]} 검색`} placeholder={`${searchLabels[searchField]} 검색`}
                value={query} onValueChange={value => { setQuery(value); clearSelection(); }} />
            </div>
          </div>
          <div className="site-action-row">
            {refreshControl}
            <Select value={oldestFirst ? "oldest" : "latest"} onValueChange={value => setOldestFirst(value === "oldest")}>
              <SelectTrigger size="sm" className="w-auto" aria-label="주문 정렬"><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="latest">최근 주문순</SelectItem><SelectItem value="oldest">오래된 주문순</SelectItem></SelectContent>
            </Select>
          </div>
        </div>
      </div>
      <Table variant="management" appearance="grid" columns="hall-orders" label="현재 주문 리스트" data-hall-order-list>
        <TableHeader>
          <TableRow>
            <TableHead align="center">
              <Checkbox shape="circle" aria-label="표시된 주문 전체 선택" checked={all || (selectedOrders.length ? "indeterminate" : false)}
                disabled={!visibleOrders.length || pending} onCheckedChange={() => setSelection(new Set(all ? [] : visibleOrders.map(order => order.id)))} />
            </TableHead>
            <TableHead>룸</TableHead>
            <TableHead>테이블·키오스크</TableHead>
            <TableHead>주문번호</TableHead>
            <TableHead>주문시각</TableHead>
            <TableHead>경과시간</TableHead>
            <TableHead><div className="site-action-row" data-wrap="nowrap">메뉴명 <ColumnFilter label="메뉴 필터" options={menuOptions} selected={menus}
              change={next => { setMenus(next); clearSelection(); }} /></div></TableHead>
            <TableHead>상품옵션</TableHead>
            <TableHead>가격옵션</TableHead>
            <TableHead align="center" data-nowrap>수량</TableHead>
            <TableHead align="end">가격</TableHead>
            <TableHead align="end">합계</TableHead>
            <TableHead>
              <div className="site-action-row" data-wrap="nowrap">
                상태
                <DropdownMenu modal={false}>
                  <DropdownMenuTrigger asChild>
                    <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label="주문 상태 필터"
                      data-order-list-filter-active={status !== "all" || undefined}>
                      <FilterFill aria-hidden="true" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" aria-label="주문 상태 필터">
                    <DropdownMenuRadioGroup value={status} onValueChange={value => {
                      setStatus(value as OrderListStatus);
                      clearSelection();
                    }}>
                      {Object.entries(statusLabels).map(([value, label]) => (
                        <DropdownMenuRadioItem key={value} value={value}>{label}</DropdownMenuRadioItem>
                      ))}
                    </DropdownMenuRadioGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </TableHead>
            <TableHead><div className="site-action-row" data-wrap="nowrap"><span className="whitespace-nowrap">알림톡</span> <InfoTooltip label="알림톡 안내"><p>알림톡은 연동 준비 중입니다.</p></InfoTooltip></div></TableHead>
            <TableHead><div className="site-action-row" data-wrap="nowrap">결제여부 <ColumnFilter label="결제 필터" options={paymentOptions} selected={payments}
              change={next => { setPayments(next); clearSelection(); }} /></div></TableHead>
          </TableRow>
        </TableHeader>
        {groups.map(group => {
          const first = group.orders[0].order;
          const pointLabel = first.tableLabel;
          const selectionLabel = group.completed ? `완료 주문 #${first.orderNumber} 선택` : `${pointLabel} 주문 선택`;
          const groupCount = group.orders.filter(({ order }) => selection.has(order.id)).length;
          const groupChecked = groupCount === group.orders.length;
          return (
            <TableBody key={group.key} data-hall-order-group>
              {group.orders.map(({ order, items }, orderIndex) => {
                const clock = formatKoreanClockTime(order.createdAt);
                const elapsed = order.status === "served" ? null : formatElapsedMinutes(order.createdAt, now);
                const canPay = isPointOrderOperationAllowed(order, permissions, "payment");
                return (
                  <Fragment key={order.id}>
                    {(items.length ? items : [null]).map((item, index) => {
                      const span = Math.max(items.length, 1);
                      const options = item ? getKitchenOptionLabels(item.options) : null;
                      const printOrder = canPrintPointOrder(order);
                      return (
                        <TableRow key={item?.id ?? order.id} data-first-order-row={!index || undefined}>
                          {orderIndex === 0 && index === 0 && <>
                            <TableCell rowSpan={group.rowCount} align="center">
                              <Checkbox shape="circle" aria-label={selectionLabel} disabled={pending}
                                checked={groupChecked || (groupCount ? "indeterminate" : false)}
                                onCheckedChange={() => setSelection(previous => {
                                  const next = new Set(previous);
                                  for (const { order } of group.orders) {
                                    if (groupChecked) next.delete(order.id);
                                    else next.add(order.id);
                                  }
                                  return next;
                                })} />
                            </TableCell>
                            <TableCell rowSpan={group.rowCount}>{roomNames.get(group.pointId) ?? "–"}</TableCell>
                            <TableCell rowSpan={group.rowCount} primary>{pointLabel}</TableCell>
                          </>}
                          {index === 0 && <>
                            <TableCell rowSpan={span} primary><div className="site-stack-detail">
                              <Button type="button" variant="link" size="compact" aria-label={`주문 #${order.orderNumber} 상세`}
                                onClick={event => openDetail(order, event.currentTarget)}><span>#{order.orderNumber}</span></Button>
                              {printOrder && <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label={`주문 #${order.orderNumber} 청구서 인쇄`}
                                onClick={() => onPrint([order])}><PrinterFill aria-hidden="true" /></Button>}
                            </div></TableCell>
                            <TableCell rowSpan={span} nowrap>{clock ? <time dateTime={order.createdAt} title={formatKoreanDateTime(order.createdAt)}>{clock}</time> : "–"}</TableCell>
                            <TableCell rowSpan={span}>{elapsed ?? "–"}</TableCell>
                          </>}
                          <TableCell>{item ? <div className="site-action-row" data-wrap="nowrap">
                            <span>{item.name}{item.priceNote && <span className="site-copy-muted"> ({item.priceNote})</span>}</span>
                            {printOrder && <span role="img" aria-label={item.cookingDone || order.status === "ready" || order.status === "served" ? "조리 완료" : "조리 미완성"}>
                              <OrderCookingFlag done={Boolean(item.cookingDone || order.status === "ready" || order.status === "served")} />
                            </span>}
                          </div> : "–"}</TableCell>
                          <TableCell>{options?.product || "–"}</TableCell>
                          <TableCell>{options?.price || "–"}</TableCell>
                          <TableCell align="center">{item?.quantity ?? "–"}</TableCell>
                          <TableCell align="end">{item ? formatAmount(item.unitPrice) : "–"}</TableCell>
                          {index === 0 && <>
                            <TableCell rowSpan={span} align="end">
                              <strong>{formatAmount(order.totalAmount)}</strong>
                              {items.length < order.items.length && <p className="type-caption site-copy-muted">{order.items.length}개 중 {items.length}개 표시</p>}
                            </TableCell>
                            <TableCell rowSpan={span}>
                              <div className="site-stack-copy">
                                <OrderStage status={order.status} />
                                {order.nextStatus === "served" && permissions.canManage && (
                                  <form action={transitionAction}>
                                    <input type="hidden" name="menuSiteId" value={menuSiteId} />
                                    <input type="hidden" name="orderId" value={order.id} />
                                    <input type="hidden" name="nextStatus" value="served" />
                                    <Button type="submit" size="compact" name="intent" value="transition" disabled={pending}>픽업·서빙 완료</Button>
                                  </form>
                                )}
                              </div>
                            </TableCell>
                            <TableCell rowSpan={span}><span className="site-copy-muted">사용 불가</span></TableCell>
                            <TableCell rowSpan={span}>
                              <div className="site-stack-copy">
                                <span>{PAYMENT_LABELS[order.paymentStatus] ?? order.paymentStatus}</span>
                                {canPay && <Button variant="outline" size="compact" disabled={pending}
                                  onClick={event => openOperation("payment", order, event.currentTarget)}>결제하기</Button>}
                              </div>
                            </TableCell>
                          </>}
                        </TableRow>
                      );
                    })}
                  </Fragment>
                );
              })}
            </TableBody>
          );
        })}
        {!groups.length && <TableBody><TableRow><TableCell colSpan={15}><p className="type-body-sm site-copy-muted" role="status">조건에 맞는 주문이 없습니다.</p></TableCell></TableRow></TableBody>}
      </Table>
      <div className="site-floor-workspace-footer">
        <div className="site-action-row" data-distribution="center">
          <div className="site-action-row" role="group" aria-label="일반 주문 처리">
            <span className="type-label">일반</span>
            <Button variant="outline" size="compact" disabled={!manualTarget || pending}
              onClick={event => { if (manualTarget) openManualOrder(manualTarget, event.currentTarget); }}>
              수동 주문 추가
            </Button>
            <Button variant="outline" size="compact" disabled={!print || pending} onClick={() => onPrint(selectedOrders)}><PrinterFill aria-hidden="true" /> 청구서 인쇄</Button>
            <Button variant="outline-danger" size="compact" disabled={!moveTarget || pending}
              onClick={event => { if (moveTarget) openMoveOrder(moveTarget, event.currentTarget); }}>주문(테이블) 이동</Button>
            <Button variant="destructive" size="compact" data-order-table-cancel disabled={!cancel || pending}
              onClick={event => { if (cancel) openOperation("cancel", cancel, event.currentTarget); }}>주문 취소</Button>
          </div>
          <div className="site-action-row" role="group" aria-label="단체손님 주문 처리">
            <span className="type-label">단체손님용</span>
            <Button variant="outline" size="compact" disabled title="주문 결합 준비 중">주문결합 <Link2 aria-hidden="true" /></Button>
            <Button variant="secondary" size="compact" disabled title="결합 해제 준비 중">결합해제</Button>
          </div>
        </div>
      </div>
    </>
  );
}
