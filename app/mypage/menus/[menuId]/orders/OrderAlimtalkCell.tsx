"use client";

import { useEffect, useEffectEvent, useState, useTransition } from "react";
import { Button } from "@/app/components/ui/button";
import { MessageCircle } from "@/app/components/ui/site-icon";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import type { OrderAlimtalkAction, OrderAlimtalkDetails, OrderAlimtalkRequest } from "@/lib/order-ready-alimtalk";

const labels = { pending: "발송 결과 확인 중", sent: "발송 완료", failed: "발송 실패" };

export default function OrderAlimtalkCell({ details, orderId, orderNumber, orderStatus, action, inOrderDetail = false, autoCheck = true }: {
  details?: OrderAlimtalkDetails;
  orderId: string;
  orderNumber: number;
  orderStatus: string;
  action?: OrderAlimtalkAction;
  inOrderDetail?: boolean;
  autoCheck?: boolean;
}) {
  const [error, setError] = useState<string>();
  const [confirm, setConfirm] = useState(false);
  const [working, start] = useTransition();
  const attempt = details?.attempt;
  const pendingId = attempt?.status === "pending" ? attempt.id : undefined;

  function update(intent: OrderAlimtalkRequest["intent"]) {
    if (!action || working) return;
    setError(undefined);
    start(async () => {
      try {
        const result = await action({ orderId, intent, expectedAttemptId: attempt?.id ?? null });
        if (result.error) {
          setError(result.error);
        } else if (intent === "send") {
          setConfirm(false);
        }
      } catch {
        setError("알림톡 결과를 불러오지 못했습니다. 다시 시도해 주세요.");
      }
    });
  }

  const checkResult = useEffectEvent(() => update("check"));
  const canCheck = Boolean(action && pendingId);
  useEffect(() => {
    if (!canCheck || !autoCheck || working || error) return;
    const timer = window.setTimeout(checkResult, 3_000);
    return () => window.clearTimeout(timer);
  }, [autoCheck, canCheck, pendingId, working, error]);

  if (!details && !inOrderDetail) return <span className="site-copy-muted">사용 불가</span>;

  const canSend = Boolean(action && details?.sendingEnabled && details.maskedPhone && orderStatus === "ready" && !pendingId);
  const sendLabel = attempt ? "재발송" : "발송";
  const unavailableReason = !details || !details.sendingEnabled ? "알림톡 발송 설정이 필요해요."
    : !details.maskedPhone ? "연락처 없음"
    : orderStatus !== "ready" ? "조리완료 주문만 발송할 수 있어요."
    : "알림톡 발송 권한이 필요해요.";

  return (
    <div className={inOrderDetail ? "site-action-row" : "site-stack-copy"}>
      {(!inOrderDetail || attempt) && (
        <span role="status" className={inOrderDetail ? "type-caption" : attempt ? undefined : "site-copy-muted"}>
          {attempt ? labels[attempt.status]
            : !details?.sendingEnabled ? "사용 불가"
            : !details?.maskedPhone ? "연락처 없음"
            : orderStatus === "ready" ? "발송 전" : "—"}
        </span>
      )}
      {inOrderDetail && !attempt && !canSend && (
        <Button type="button" variant="outline" size="compact" disabled title={unavailableReason}
          aria-label={`알림톡 · ${unavailableReason}`}><MessageCircle /> 알림톡</Button>
      )}
      {canCheck && (
        <Button type="button" variant="outline" size="compact" disabled={working}
          aria-label={`주문 #${orderNumber} 알림톡 결과 확인`} onClick={() => update("check")}>결과 확인</Button>
      )}
      {canSend && (
        <Dialog open={confirm} onOpenChange={open => { if (!working) { setError(undefined); setConfirm(open); } }}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="compact" aria-label={`주문 #${orderNumber} 알림톡 ${sendLabel}`}>
              {inOrderDetail && <MessageCircle />}
              {inOrderDetail && !attempt ? "알림톡" : sendLabel}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>조리완료 알림톡 {sendLabel}</DialogTitle>
              <DialogDescription>주문 #{orderNumber} · {details?.maskedPhone}{attempt ? ` · 이전 ${labels[attempt.status]}` : ""}</DialogDescription>
            </DialogHeader>
            {error && <p className="type-body-sm" role="alert">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" disabled={working} onClick={() => setConfirm(false)}>닫기</Button>
              <Button type="button" disabled={working} aria-busy={working} onClick={() => update("send")}>{working ? "발송 요청 중" : sendLabel}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      {error && !confirm && <span className="type-body-sm" role="alert">{error}</span>}
    </div>
  );
}
