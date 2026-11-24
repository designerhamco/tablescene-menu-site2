"use client";

import { useRef, useState, useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { FieldMessage } from "@/app/components/ui/field-message";
import { Link2 } from "@/app/components/ui/site-icon";
import { formatAmount } from "@/components/mypage/OrderReceipt";
import type { OrderSettlementIntent } from "@/lib/order-settlement";
import { initialOrderManagementActionState, type OrderManagementActionState } from "./action-state";
import type { PointOrderMutation } from "./OrderPointOperationDialog";

export function SettlementButtons({ intent, disabled, open }: {
  intent: OrderSettlementIntent | undefined; disabled: boolean;
  open: (intent: OrderSettlementIntent, button: HTMLButtonElement) => void;
}) {
  return (
    <>
      <Button variant="outline" size="compact" disabled={disabled || intent?.action !== "combine"}
        onClick={event => { if (intent) open(intent, event.currentTarget); }}>주문 결합 <Link2 aria-hidden="true" /></Button>
      <Button variant="secondary" size="compact" disabled={disabled || intent?.action !== "release"}
        onClick={event => { if (intent) open(intent, event.currentTarget); }}>결합 해제</Button>
    </>
  );
}

const titles = { combine: "주문 결합", release: "결합 해제", pay: "결합 결제하기" };

export default function OrderSettlementDialog({ intent, menuSiteId, mutateAction, close, onSuccess, onCloseAutoFocus }: {
  intent: OrderSettlementIntent;
  menuSiteId: string;
  mutateAction: PointOrderMutation;
  close: () => void;
  onSuccess: (result: OrderManagementActionState) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const request = useRef("");
  const paying = intent.action === "pay";

  function submit(input: FormData) {
    if (pending) return;
    setError("");
    request.current ||= crypto.randomUUID();
    input.set("requestId", request.current);
    input.set("intent", intent.action);
    input.set("menuSiteId", menuSiteId);
    input.set("expectedTotal", String(intent.total));
    if (intent.groupId) input.set("groupId", intent.groupId);
    intent.tableIds.forEach(id => input.append("tableIds", id));
    intent.orderIds.forEach(id => input.append("orderIds", id));
    startTransition(async () => {
      try {
        const result = await mutateAction(initialOrderManagementActionState, input);
        if (result.status === "success") onSuccess(result);
        else setError(result.message);
      } catch {
        setError("저장 결과를 확인하지 못했어요. 같은 내용으로 다시 시도해 주세요.");
      }
    });
  }
  return (
    <Dialog open onOpenChange={open => { if (!open && !pending) close(); }}>
      <DialogContent scrollable data-order-settlement-dialog className="print:hidden" aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus} onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}
        onInteractOutside={event => { if (pending) event.preventDefault(); }}>
        <DialogHeader reserveCloseButton><DialogTitle>{titles[intent.action]}</DialogTitle></DialogHeader>
        <form action={submit} className="site-stack-block" aria-busy={pending}>
          <ul className="site-stack-copy" aria-label="선택한 테이블">
            {intent.tableLabels.map((label, index) => <li key={intent.tableIds[index]} className="type-body-sm">{label}</li>)}
          </ul>
          {intent.action !== "release" && <div className="site-action-row type-label" data-distribution="between">
            <span>합계 · 주문 {intent.orderIds.length}건</span><strong>{formatAmount(intent.total)}</strong>
          </div>}
          {paying && <label className="site-field-stack">
            <span className="type-label">외부에서 결제한 방법</span>
            <select name="method" className="site-field" disabled={pending}>
              <option value="manual_card">기존 카드 단말기</option>
              <option value="manual_cash">현금</option>
            </select>
          </label>}
          {error && <FieldMessage role="alert">{error}</FieldMessage>}
          <div className="site-action-row" data-distribution="end">
            <Button type="button" variant="outline" disabled={pending} onClick={close}>취소</Button>
            <Button type="submit" disabled={pending}>{paying ? "결제 완료 기록" : titles[intent.action]}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
