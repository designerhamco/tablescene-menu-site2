"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";

import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import {
  canFinishKitchenOrder,
  getKitchenStage,
  KITCHEN_STAGE_LABELS,
  KITCHEN_STAGES,
  type KitchenAction,
  type KitchenOrder,
} from "@/lib/kitchen-order";
import { mutateKitchenOrderAction } from "./actions";

type KitchenStage = (typeof KITCHEN_STAGES)[number];
type MutateKitchenOrder = typeof mutateKitchenOrderAction;

function KitchenOrderCard({ order, menuSiteId, canManage, mutateAction, onStageChange }: {
  order: KitchenOrder;
  menuSiteId: string;
  canManage: boolean;
  mutateAction: MutateKitchenOrder;
  onStageChange: (stage: KitchenStage) => void;
}) {
  const titleId = useId();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();
  const stage = getKitchenStage(order.status);
  const canCheck = canManage && stage === "cooking";

  function submit(action: KitchenAction, itemId?: string, checked?: boolean) {
    setError(undefined);
    startTransition(async () => {
      try {
        const result = await mutateAction({ menuSiteId, orderId: order.id, action, itemId, checked });
        if (result.error) {
          setError(result.error);
          router.refresh();
          return;
        }
        if (action === "start") onStageChange("cooking");
        if (action === "finish") onStageChange("ready");
      } catch {
        setError("조리 상태를 저장하지 못했습니다. 다시 시도해 주세요.");
        router.refresh();
      }
    });
  }

  return (
    <ContentPanel as="article" aria-labelledby={titleId} aria-busy={pending}>
      <div className="site-stack-block">
        <div className="site-stack-copy">
          <h4 id={titleId} className="type-content-title break-words">{order.tableLabel} · 주문 #{order.orderNumber}</h4>
          <time className="type-caption site-copy-muted" dateTime={order.createdAt}>{formatKoreanDateTime(order.createdAt)}</time>
        </div>
        <ul className="site-stack-copy">
          {order.items.map(item => {
            const itemId = `${titleId}-${item.id}`;
            return (
              <li key={item.id} className="site-action-row" data-wrap="nowrap">
                {stage !== "before" && (
                  <Checkbox
                    id={itemId}
                    className="shrink-0"
                    checked={item.done}
                    disabled={!canCheck}
                    aria-disabled={pending || undefined}
                    onCheckedChange={checked => {
                      if (!pending && typeof checked === "boolean") submit("check", item.id, checked);
                    }}
                  />
                )}
                <div className="site-stack-copy min-w-0">
                  {stage === "before" ? (
                    <p className="type-label break-words">{item.name} × {item.quantity}</p>
                  ) : (
                    <label className="type-label break-words" htmlFor={itemId}>{item.name} × {item.quantity}</label>
                  )}
                  {item.options.map(({ groupName, valueName }, index) => (
                    <p key={index} className="type-body-sm site-copy-muted break-words">{groupName} · {valueName}</p>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {order.requestText && <p className="type-body-sm break-words">요청사항 · {order.requestText}</p>}
        {error && <p role="alert" className="type-body-sm text-destructive">{error}</p>}
        {stage === "ready" ? (
          <div className="site-action-row"><Badge tone="pending">픽업·서빙 대기</Badge></div>
        ) : canManage && (
          <div className="site-action-row">
            {stage === "before" ? (
              <Button disabled={pending} onClick={() => submit("start")}>조리 시작</Button>
            ) : (
              <Button disabled={pending || !canFinishKitchenOrder(order)} onClick={() => submit("finish")}>조리완료 처리</Button>
            )}
          </div>
        )}
      </div>
    </ContentPanel>
  );
}

export default function KitchenDashboard({ menuSiteId, orders, canManage, mutateAction = mutateKitchenOrderAction }: {
  menuSiteId: string;
  orders: KitchenOrder[];
  canManage: boolean;
  mutateAction?: MutateKitchenOrder;
}) {
  const boardId = useId();
  const [selectedStage, setSelectedStage] = useState<KitchenStage>("before");
  const ordersByStage: Record<KitchenStage, KitchenOrder[]> = { before: [], cooking: [], ready: [] };
  for (const order of orders) ordersByStage[getKitchenStage(order.status)].push(order);

  return (
    <div className="site-stack-group">
      <div className="lg:hidden">
        <Select value={selectedStage} onValueChange={value => {
          const stage = KITCHEN_STAGES.find(stage => stage === value);
          if (stage) setSelectedStage(stage);
        }}>
          <SelectTrigger aria-label="조리 상태 보기"><SelectValue /></SelectTrigger>
          <SelectContent>
            {KITCHEN_STAGES.map(stage => (
              <SelectItem key={stage} value={stage}>{KITCHEN_STAGE_LABELS[stage]} {ordersByStage[stage].length}건</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="site-card-grid items-start lg:grid-cols-3">
        {KITCHEN_STAGES.map(stage => {
          const headingId = `${boardId}-${stage}`;
          const stageOrders = ordersByStage[stage];
          return (
            <div key={stage} className={selectedStage === stage ? "min-w-0" : "hidden min-w-0 lg:block"}>
              <ContentPanel surface="muted" aria-labelledby={headingId}>
                <div className="site-stack-block">
                  <h3 id={headingId} className="type-content-title">{KITCHEN_STAGE_LABELS[stage]} <span className="type-label site-copy-muted">{stageOrders.length}건</span></h3>
                  {stageOrders.length === 0 && <p className="type-body-sm site-copy-muted">주문이 없습니다.</p>}
                  {stageOrders.map(order => (
                    <KitchenOrderCard key={order.id} order={order} menuSiteId={menuSiteId} canManage={canManage} mutateAction={mutateAction} onStageChange={setSelectedStage} />
                  ))}
                </div>
              </ContentPanel>
            </div>
          );
        })}
      </div>
    </div>
  );
}
