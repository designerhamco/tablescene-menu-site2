import type { ReactNode } from "react";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { getKitchenOptionLabels, getKitchenStage, kitchenMenuKey, KITCHEN_STAGE_LABELS, type KitchenOrder } from "@/lib/kitchen-order";
import { KitchenItemFlag } from "./KitchenFlag";
import { KitchenOrderActions, KitchenOrderClock, KitchenOrderElapsed, KitchenOrderPrint, type KitchenOrderControls } from "./KitchenOrderCard";
import styles from "./KitchenDashboard.module.css";

function KitchenOrderRows({ actions, now, room, selectionFull, menuFilter, print }: {
  actions: KitchenOrderControls;
  now: number | null;
  room?: string;
  selectionFull: boolean;
  menuFilter: ReadonlySet<string> | null;
  print: (order: KitchenOrder) => void;
}) {
  const { order, selected, busy, select, check, canManage } = actions;
  const stage = getKitchenStage(order.status);
  const items = order.items.map((item, index) => ({ item, index }))
    .filter(({ item }) => !menuFilter || menuFilter.has(kitchenMenuKey(item)));
  const rows = items.length ? items : [{ item: null, index: 0 }];
  return (
    <TableBody data-kitchen-order={order.id}>
      {rows.map(({ item, index }, rowIndex) => {
        const first = rowIndex === 0;
        const span = rows.length;
        const options = item ? getKitchenOptionLabels(item.options) : null;
        return (
          <TableRow key={item?.id ?? order.id}>
            {first && (
              <>
                <TableCell rowSpan={span} align="center">
                  <Checkbox shape="circle" aria-label={`주문 #${order.orderNumber} 선택`} checked={selected}
                    disabled={busy || (!selected && selectionFull)} onCheckedChange={value => select(value === true)} />
                </TableCell>
                <TableCell rowSpan={span}>{room ?? "–"}</TableCell>
                <TableCell rowSpan={span}>{order.tableLabel}</TableCell>
                <TableCell rowSpan={span}>
                  <div className="site-action-row">
                    <strong className="type-caption">#{order.orderNumber}</strong>
                    <KitchenOrderPrint order={order} print={print} />
                  </div>
                </TableCell>
                <TableCell rowSpan={span}><KitchenOrderClock createdAt={order.createdAt} /></TableCell>
                <TableCell rowSpan={span}><KitchenOrderElapsed order={order} now={now} /></TableCell>
              </>
            )}
            <TableCell>
              {item ? (
                <div className="site-action-row" data-distribution="between" data-wrap="nowrap">
                  <span className="min-w-0 break-words">{menuFilter ? `${index + 1}) ` : null}{item.name}{item.priceNote ? ` (${item.priceNote})` : ""}</span>
                  {stage !== "before" && <KitchenItemFlag name={item.name} done={item.done} busy={busy}
                    change={canManage && stage === "cooking" ? done => check(item.id, done) : undefined} />}
                </div>
              ) : "–"}
            </TableCell>
            <TableCell>{options?.product || "–"}</TableCell>
            <TableCell>{options?.price || "–"}</TableCell>
            <TableCell align="center">{item?.quantity ?? "–"}</TableCell>
            {first && (
              <>
                <TableCell rowSpan={span}>
                  <span className={styles.stageName} data-stage={stage}>
                    <span className={styles.stageDot} aria-hidden="true" />{KITCHEN_STAGE_LABELS[stage]}
                  </span>
                </TableCell>
                <TableCell rowSpan={span}><KitchenOrderActions {...actions} /></TableCell>
              </>
            )}
          </TableRow>
        );
      })}
    </TableBody>
  );
}

export default function KitchenOrderList({ orders, controls, now, roomName, menuFilter, menuFilterControl, stageFilterControl,
  selectedCount, selectionFull, busy, selectAll, print }: {
  orders: KitchenOrder[];
  controls: (order: KitchenOrder) => KitchenOrderControls;
  now: number | null;
  roomName: (order: KitchenOrder) => string | undefined;
  menuFilter: ReadonlySet<string> | null;
  menuFilterControl: ReactNode;
  stageFilterControl: ReactNode;
  selectedCount: number;
  selectionFull: boolean;
  busy: boolean;
  selectAll: (checked: boolean) => void;
  print: (order: KitchenOrder) => void;
}) {
  const allSelected = orders.length > 0 && selectedCount === orders.length;
  return (
    <Table variant="management" appearance="grid" columns="kitchen-orders" label="주방 주문 리스트">
      <TableHeader>
        <TableRow>
          <TableHead align="center">
            <Checkbox shape="circle" aria-label="리스트 주문 전체 선택" disabled={busy || !orders.length}
              checked={allSelected || (selectedCount > 0 ? "indeterminate" : false)}
              onCheckedChange={() => selectAll(!allSelected && !selectionFull)} />
          </TableHead>
          <TableHead>룸</TableHead>
          <TableHead>테이블/키오스크</TableHead>
          <TableHead>주문번호</TableHead>
          <TableHead>주문시각</TableHead>
          <TableHead>경과시간</TableHead>
          <TableHead><div className="site-action-row" data-wrap="nowrap">메뉴명 {menuFilterControl}</div></TableHead>
          <TableHead>상품옵션</TableHead>
          <TableHead>가격옵션</TableHead>
          <TableHead align="center" data-nowrap>수량</TableHead>
          <TableHead><div className="site-action-row" data-wrap="nowrap"><span className="whitespace-nowrap">상태</span> {stageFilterControl}</div></TableHead>
          <TableHead align="center">처리</TableHead>
        </TableRow>
      </TableHeader>
      {orders.map(order => (
        <KitchenOrderRows key={order.id} actions={controls(order)} now={now} room={roomName(order)}
          menuFilter={menuFilter} selectionFull={selectionFull} print={print} />
      ))}
      {!orders.length && <TableBody><TableRow><TableCell colSpan={12}>주문이 없습니다.</TableCell></TableRow></TableBody>}
    </Table>
  );
}
