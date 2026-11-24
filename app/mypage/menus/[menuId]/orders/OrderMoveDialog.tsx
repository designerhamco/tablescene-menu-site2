"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { FieldMessage } from "@/app/components/ui/field-message";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { STATUS_LABELS } from "@/components/mypage/OrderReceipt";
import { initialOrderManagementActionState, type OrderManagementActionState } from "./action-state";
import type { PointOrderMutation } from "./OrderPointOperationDialog";

type Point = { id: string; label: string };
export type OrderMoveSource = Point & { orderIds: string[]; status: string };

export default function OrderMoveDialog({ source, destinations, menuSiteId, mutateAction, close, onSuccess, onCloseAutoFocus }: {
  source: OrderMoveSource;
  destinations: Point[];
  menuSiteId: string;
  mutateAction: PointOrderMutation;
  close: () => void;
  onSuccess: (result: OrderManagementActionState) => void;
  onCloseAutoFocus: (event: Event) => void;
}) {
  const [destinationId, setDestinationId] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const requestId = useRef("");
  const selectId = useId();
  const destination = destinations.find(point => point.id === destinationId);
  const showConfirmation = confirming && destination !== undefined;

  function handleMove() {
    if (!destination || pending) return;
    if (!confirming) {
      setConfirming(true);
      return;
    }
    requestId.current ||= crypto.randomUUID();
    const input = new FormData();
    input.set("intent", "move-table");
    input.set("menuSiteId", menuSiteId);
    input.set("sourceTableId", source.id);
    input.set("destinationTableId", destination.id);
    input.set("requestId", requestId.current);
    source.orderIds.forEach(id => input.append("orderIds", id));
    startTransition(async () => {
      setError("");
      try {
        const result = await mutateAction(initialOrderManagementActionState, input);
        if (result.status === "success") onSuccess(result);
        else setError(result.message);
      } catch {
        setError("이동 결과를 확인하지 못했어요. 같은 내용으로 다시 시도해 주세요.");
      }
    });
  }

  return (
    <Dialog open onOpenChange={open => { if (!open && !pending) close(); }}>
      <DialogContent scrollable className="print:hidden" data-order-move
        aria-describedby={undefined}
        onCloseAutoFocus={onCloseAutoFocus}
        onEscapeKeyDown={event => { if (pending) event.preventDefault(); }}
        onInteractOutside={event => { if (pending) event.preventDefault(); }}>
        <DialogHeader reserveCloseButton>
          <DialogTitle>{showConfirmation && destination ? `${destination.label}이 비어 있는지 확인하셨나요?` : "주문(테이블) 이동"}</DialogTitle>
        </DialogHeader>
        <div className="site-stack-group" aria-busy={pending}>
          {showConfirmation && destination ? (
            <p className="type-body-sm">{source.label}에서 {destination.label}까지 현재 주문 {source.orderIds.length}건을 이동합니다.</p>
          ) : (
            <div className="site-stack-block">
              <div className="site-action-row" data-distribution="between">
                <span className="type-body-sm site-copy-muted">선택한 테이블</span>
                <strong className="type-label">{source.label} ({STATUS_LABELS[source.status] ?? source.status})</strong>
              </div>
              <div className="site-field-stack">
                <label className="type-label" htmlFor={selectId}>이동할 테이블</label>
                <Select value={destination?.id ?? ""} disabled={!destinations.length} onValueChange={value => {
                  setDestinationId(value);
                  setConfirming(false);
                  setError("");
                  requestId.current = "";
                }}>
                  <SelectTrigger id={selectId}><SelectValue placeholder={destinations.length ? "이동할 테이블을 선택하세요" : "이동 가능한 테이블이 없습니다"} /></SelectTrigger>
                  <SelectContent>{destinations.map(point => <SelectItem key={point.id} value={point.id}>{point.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          )}
          {error ? <FieldMessage role="alert">{error}</FieldMessage>
            : destinationId && !destination && <FieldMessage role="alert">선택한 테이블로 이동할 수 없어요. 다른 테이블을 선택해 주세요.</FieldMessage>}
          <div className="site-action-row" data-distribution="end">
            <Button variant="outline" disabled={pending} onClick={() => {
              if (showConfirmation) { setConfirming(false); setError(""); }
              else close();
            }}>{showConfirmation ? "다시 선택" : "취소"}</Button>
            <Button disabled={!destination || pending} onClick={handleMove}>
              {pending ? "이동 중…" : showConfirmation ? "확인하고 이동" : "이동"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
