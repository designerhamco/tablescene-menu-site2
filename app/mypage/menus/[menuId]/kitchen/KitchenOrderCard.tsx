"use client";

import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { PrinterFill } from "@/app/components/ui/site-icon";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { canChangeKitchenStage, getKitchenOptionLabels, getKitchenStage, kitchenMenuKey, KITCHEN_ACTION_LABELS, type KitchenOrder, type KitchenStageAction } from "@/lib/kitchen-order";
import { KitchenItemFlag } from "./KitchenFlag";

export const kitchenActionVariants = { return: "destructive", start: "warning", finish: "success" } as const;

export type KitchenOrderControls = {
  order: KitchenOrder;
  canManage: boolean;
  busy: boolean;
  selected: boolean;
  select: (checked: boolean) => void;
  check: (itemId: string, checked: boolean) => void;
  move: (action: KitchenStageAction) => void;
};

const orderClock = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export function KitchenOrderClock({ createdAt }: { createdAt: string }) {
  const date = formatKoreanDateTime(createdAt);
  return <time dateTime={createdAt} title={date}>{date === "-" ? date : orderClock.format(new Date(createdAt))}</time>;
}

export function KitchenOrderElapsed({ order, now }: { order: KitchenOrder; now: number | null }) {
  if (getKitchenStage(order.status) === "ready" || now === null) return "–";
  const minutes = Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60_000));
  if (!Number.isFinite(minutes)) return "–";
  return minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
}

export function KitchenOrderPrint({ order, print }: { order: KitchenOrder; print: (order: KitchenOrder) => void }) {
  if (getKitchenStage(order.status) === "before") return null;
  return (
    <Button type="button" variant="ghost" size="icon" iconSize="compact" aria-label={`주문 #${order.orderNumber} 청구서 인쇄`}
      title="청구서 인쇄" onClick={() => print(order)}><PrinterFill /></Button>
  );
}

export function KitchenOrderActions({ order, canManage, busy, move }: Pick<KitchenOrderControls, "order" | "canManage" | "busy" | "move">) {
  const stage = getKitchenStage(order.status);
  if (stage === "ready") return <p className="type-label text-center">{order.status === "served" ? "픽업·서빙 완료" : "픽업·서빙 대기"}</p>;
  if (!canManage) return null;
  const canFinish = canChangeKitchenStage(order, "finish");
  return (
    <div className="site-action-row" data-distribution="center">
      {stage === "before" ? (
        <Button size="compact" variant={kitchenActionVariants.start} disabled={busy} onClick={() => move("start")}>{KITCHEN_ACTION_LABELS.start}</Button>
      ) : (
        <>
          <Button size="compact" variant={kitchenActionVariants.finish} disabled={busy || !canFinish} onClick={() => move("finish")}>{KITCHEN_ACTION_LABELS.finish}</Button>
          {!canFinish && <Button size="compact" variant={kitchenActionVariants.return} disabled={busy || !canChangeKitchenStage(order, "return")} onClick={() => move("return")}>{KITCHEN_ACTION_LABELS.return}</Button>}
        </>
      )}
    </div>
  );
}

export default function KitchenOrderCard({ controls, now, roomName, onDrag, onDragEnd, selectionFull, menuFilter, print }: {
  controls: KitchenOrderControls;
  now: number | null;
  roomName?: string;
  onDrag: (orderId: string) => void;
  onDragEnd: () => void;
  selectionFull: boolean;
  menuFilter: ReadonlySet<string> | null;
  print: (order: KitchenOrder) => void;
}) {
  const { order, selected, select, canManage, busy, check } = controls;
  const stage = getKitchenStage(order.status);
  const draggable = canManage && !busy && stage !== "ready";
  return (
    <ContentPanel as="article" aria-label={`주문 #${order.orderNumber}`} density="compact" layout="card" draggable={draggable}
      data-kitchen-order={order.id} data-kitchen-draggable={draggable || undefined}
      onDragStart={event => {
        if (!draggable) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(order.orderNumber));
        onDrag(order.id);
      }}
      onDragEnd={onDragEnd}>
      <div className="site-stack-block">
        <div className="site-stack-copy">
          <div className="site-action-row" data-distribution="between">
            <div className="site-action-row">
              <label className="site-action-row" data-wrap="nowrap">
                <Checkbox shape="circle" aria-label={`주문 #${order.orderNumber} 선택`} checked={selected} disabled={busy || (!selected && selectionFull)}
                  onCheckedChange={value => select(value === true)} />
                <strong className="type-caption">#{order.orderNumber}</strong>
              </label>
              <KitchenOrderPrint order={order} print={print} />
            </div>
            <p className="type-caption break-words">{[roomName, order.tableLabel].filter(Boolean).join(" · ")}</p>
          </div>
          <dl className="site-stack-detail type-caption">
            <div className="site-action-row" data-distribution="between">
              <dt className="whitespace-nowrap">주문시각</dt><dd><KitchenOrderClock createdAt={order.createdAt} /></dd>
            </div>
            <div className="site-action-row" data-distribution="between">
              <dt className="whitespace-nowrap">경과시간</dt><dd><KitchenOrderElapsed order={order} now={now} /></dd>
            </div>
          </dl>
        </div>
        <div className="site-content-divider site-stack-copy">
          <p className="type-label">주문내역 ({order.items.length})</p>
          <ul className="site-stack-copy">
            {order.items.map((item, index) => {
              if (menuFilter && !menuFilter.has(kitchenMenuKey(item))) return null;
              const options = getKitchenOptionLabels(item.options);
              return (
                <li key={item.id} className="site-item-divider">
                  <div className="site-action-row" data-wrap="nowrap" data-distribution="between">
                    <div className="site-stack-detail min-w-0">
                      <p className="type-label break-words">{menuFilter ? `${index + 1}) ` : null}{item.name}{item.priceNote ? ` (${item.priceNote})` : ""} × {item.quantity}</p>
                      {options.price && <p className="type-caption site-copy-muted break-words">가격옵션 · {options.price}</p>}
                      {options.product && <p className="type-caption site-copy-muted break-words">상품옵션 · {options.product}</p>}
                    </div>
                    {stage !== "before" && <KitchenItemFlag name={item.name} done={item.done} busy={busy}
                      change={canManage && stage === "cooking" ? done => check(item.id, done) : undefined} />}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
        <KitchenOrderActions {...controls} />
      </div>
    </ContentPanel>
  );
}
