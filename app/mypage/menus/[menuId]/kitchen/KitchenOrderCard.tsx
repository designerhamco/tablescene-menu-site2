"use client";

import { useId } from "react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { canChangeKitchenStage, getKitchenStage, KITCHEN_ACTION_LABELS, type KitchenOrder, type KitchenStageAction } from "@/lib/kitchen-order";
import styles from "./KitchenDashboard.module.css";

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

export function KitchenOrderNumber({ order, selected, select, disabled, compact = false }: {
  order: KitchenOrder;
  selected: boolean;
  select: (checked: boolean) => void;
  disabled: boolean;
  compact?: boolean;
}) {
  return (
    <label className="site-action-row" data-wrap="nowrap">
      <Checkbox aria-label={`주문 #${order.orderNumber} 선택`} checked={selected} disabled={disabled}
        onCheckedChange={value => select(value === true)} />
      <span className={compact ? "type-caption font-semibold" : "type-item-title"}>#{order.orderNumber}</span>
    </label>
  );
}

const orderClock = new Intl.DateTimeFormat("ko-KR", {
  timeZone: "Asia/Seoul", hourCycle: "h23", hour: "2-digit", minute: "2-digit", second: "2-digit",
});

export function KitchenOrderTime({ order, now, compact = false }: { order: KitchenOrder; now: number | null; compact?: boolean }) {
  const minutes = now === null ? NaN : Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60_000));
  const elapsed = minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
  const fullDate = formatKoreanDateTime(order.createdAt);
  if (compact) {
    return (
      <dl className={`${styles.orderTimes} type-caption`}>
        <dt>주문시각</dt>
        <dd><time dateTime={order.createdAt} title={fullDate}>{fullDate === "-" ? fullDate : orderClock.format(new Date(order.createdAt))}</time></dd>
        <dt>경과시간</dt>
        <dd>{Number.isFinite(minutes) ? elapsed : "–"}</dd>
      </dl>
    );
  }
  return (
    <div className="site-stack-detail site-copy-muted">
      <time className="type-caption" dateTime={order.createdAt}>{fullDate}</time>
      {Number.isFinite(minutes) ? <p className="type-caption">주문 후 {elapsed}</p> : null}
    </div>
  );
}

export function KitchenOrderItems({ order, canManage, busy, check, compact = false }: Pick<KitchenOrderControls, "order" | "canManage" | "busy" | "check"> & { compact?: boolean }) {
  const id = useId();
  return (
    <div className="site-stack-copy">
      <ul className="site-stack-copy">
        {order.items.map(item => (
          <li key={item.id} className={compact ? styles.cardItem : undefined}>
            <div className="site-action-row" data-wrap="nowrap" data-distribution={compact ? "between" : undefined}>
              <div className="site-stack-detail min-w-0">
                <p className="type-label break-words">{item.name} × {item.quantity}</p>
                {item.options.map(({ groupName, valueName }, index) => (
                  <p key={index} className="type-caption site-copy-muted break-words">{groupName} · {valueName}</p>
                ))}
              </div>
              {order.status === "cooking" || order.status === "ready" ? (
                <Checkbox id={`${id}-${item.id}`} aria-label={`${item.name} 조리 체크`} className="shrink-0" checked={item.done}
                  disabled={!canManage || order.status !== "cooking"} aria-disabled={busy || undefined}
                  onCheckedChange={value => { if (!busy && typeof value === "boolean") check(item.id, value); }} />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
      {order.requestText && <p className="type-body-sm break-words">요청사항 · {order.requestText}</p>}
    </div>
  );
}

export function KitchenOrderActions({ order, canManage, busy, move, compact = false }: Pick<KitchenOrderControls, "order" | "canManage" | "busy" | "move"> & { compact?: boolean }) {
  const stage = getKitchenStage(order.status);
  if (stage === "ready") return compact ? <p className="type-label text-center">픽업·서빙 대기</p> : <Badge tone="pending">픽업·서빙 대기</Badge>;
  if (!canManage) return null;
  return (
    <div className="site-action-row" data-distribution={compact ? "center" : undefined}>
      {stage === "before" ? (
        <Button size="compact" variant={compact ? kitchenActionVariants.start : "default"} disabled={busy} onClick={() => move("start")}>{KITCHEN_ACTION_LABELS.start}</Button>
      ) : (
        <>
          <Button size="compact" variant={compact ? kitchenActionVariants.finish : "default"} disabled={busy || !canChangeKitchenStage(order, "finish")} onClick={() => move("finish")}>{KITCHEN_ACTION_LABELS.finish}</Button>
          <Button size="compact" variant={compact ? kitchenActionVariants.return : "outline"} disabled={busy || !canChangeKitchenStage(order, "return")} onClick={() => move("return")}>{KITCHEN_ACTION_LABELS.return}</Button>
        </>
      )}
    </div>
  );
}

export default function KitchenOrderCard({ controls, now, roomName, onDrag, onDragEnd, selectionFull }: {
  controls: KitchenOrderControls;
  now: number | null;
  roomName?: string;
  onDrag: (orderId: string) => void;
  onDragEnd: () => void;
  selectionFull: boolean;
}) {
  const { order, selected, select, canManage, busy } = controls;
  const draggable = canManage && !busy && getKitchenStage(order.status) !== "ready";
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
            <KitchenOrderNumber order={order} selected={selected} select={select} disabled={busy || (!selected && selectionFull)} compact />
            <p className="type-caption break-words">{[roomName, order.tableLabel].filter(Boolean).join(" · ")}</p>
          </div>
          <KitchenOrderTime order={order} now={now} compact />
        </div>
        <div className="site-content-divider site-stack-copy">
          <p className="type-label">주문내역 ({order.items.length})</p>
          <KitchenOrderItems {...controls} compact />
        </div>
        <KitchenOrderActions {...controls} compact />
      </div>
    </ContentPanel>
  );
}
