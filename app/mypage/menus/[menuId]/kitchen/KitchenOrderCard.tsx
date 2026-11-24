"use client";

import { useId } from "react";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import { canChangeKitchenStage, getKitchenStage, KITCHEN_ACTION_LABELS, type KitchenOrder, type KitchenStageAction } from "@/lib/kitchen-order";
import styles from "./KitchenDashboard.module.css";

export type KitchenOrderControls = {
  order: KitchenOrder;
  canManage: boolean;
  busy: boolean;
  selected: boolean;
  select: (checked: boolean) => void;
  check: (itemId: string, checked: boolean) => void;
  move: (action: KitchenStageAction) => void;
};

export function KitchenOrderNumber({ order, selected, select, disabled }: {
  order: KitchenOrder;
  selected: boolean;
  select: (checked: boolean) => void;
  disabled: boolean;
}) {
  return (
    <label className="site-action-row" data-wrap="nowrap">
      <Checkbox aria-label={`주문 #${order.orderNumber} 선택`} checked={selected} disabled={disabled}
        onCheckedChange={value => select(value === true)} />
      <span className="type-item-title">#{order.orderNumber}</span>
    </label>
  );
}

export function KitchenOrderTime({ order, now }: { order: KitchenOrder; now: number | null }) {
  const minutes = now === null ? NaN : Math.max(0, Math.floor((now - Date.parse(order.createdAt)) / 60_000));
  const elapsed = minutes >= 60 ? `${Math.floor(minutes / 60)}시간 ${minutes % 60}분` : `${minutes}분`;
  return (
    <div className="site-stack-detail site-copy-muted">
      <time className="type-caption" dateTime={order.createdAt}>{formatKoreanDateTime(order.createdAt)}</time>
      {Number.isFinite(minutes) ? <p className="type-caption">주문 후 {elapsed}</p> : null}
    </div>
  );
}

export function KitchenOrderItems({ order, canManage, busy, check }: Pick<KitchenOrderControls, "order" | "canManage" | "busy" | "check">) {
  const id = useId();
  return (
    <div className="site-stack-copy">
      <ul className={styles.itemList}>
        {order.items.map(item => (
          <li key={item.id} className="site-action-row" data-wrap="nowrap">
            {order.status === "cooking" || order.status === "ready" ? (
              <Checkbox id={`${id}-${item.id}`} aria-label={`${item.name} 조리 체크`} className="shrink-0" checked={item.done}
                disabled={!canManage || order.status !== "cooking"} aria-disabled={busy || undefined}
                onCheckedChange={value => { if (!busy && typeof value === "boolean") check(item.id, value); }} />
            ) : null}
            <div className="site-stack-detail min-w-0">
              <p className="type-label break-words">{item.name} × {item.quantity}</p>
              {item.options.map(({ groupName, valueName }, index) => (
                <p key={index} className="type-caption site-copy-muted break-words">{groupName} · {valueName}</p>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {order.requestText && <p className="type-body-sm break-words">요청사항 · {order.requestText}</p>}
    </div>
  );
}

export function KitchenOrderActions({ order, canManage, busy, move }: Pick<KitchenOrderControls, "order" | "canManage" | "busy" | "move">) {
  const stage = getKitchenStage(order.status);
  if (stage === "ready") return <Badge tone="pending">픽업·서빙 대기</Badge>;
  if (!canManage) return null;
  return (
    <div className="site-action-row">
      {stage === "before" ? (
        <Button size="compact" disabled={busy} onClick={() => move("start")}>{KITCHEN_ACTION_LABELS.start}</Button>
      ) : (
        <>
          <Button size="compact" disabled={busy || !canChangeKitchenStage(order, "finish")} onClick={() => move("finish")}>{KITCHEN_ACTION_LABELS.finish}</Button>
          <Button size="compact" variant="outline" disabled={busy || !canChangeKitchenStage(order, "return")} onClick={() => move("return")}>{KITCHEN_ACTION_LABELS.return}</Button>
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
    <ContentPanel as="article" aria-label={`주문 #${order.orderNumber}`} density="compact" draggable={draggable}
      data-kitchen-order={order.id} data-kitchen-draggable={draggable || undefined}
      onDragStart={event => {
        if (!draggable) return;
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", String(order.orderNumber));
        onDrag(order.id);
      }}
      onDragEnd={onDragEnd}>
      <div className="site-stack-block">
        <div className="site-stack-detail">
          <KitchenOrderNumber order={order} selected={selected} select={select} disabled={busy || (!selected && selectionFull)} />
          <p className="type-label break-words">{[roomName, order.tableLabel].filter(Boolean).join(" · ")}</p>
          <KitchenOrderTime order={order} now={now} />
        </div>
        <div className="site-content-divider site-stack-copy">
          <p className="type-caption site-copy-muted">주문내역 {order.items.length}종</p>
          <KitchenOrderItems {...controls} />
        </div>
        <KitchenOrderActions {...controls} />
      </div>
    </ContentPanel>
  );
}
