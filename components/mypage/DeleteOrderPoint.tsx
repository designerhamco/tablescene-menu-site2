"use client";

import { useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { LoadingState } from "@/app/components/ui/loading-state";
import { Checkbox } from "@/app/components/ui/checkbox";
import { orderPointDeletionBlock, type OrderPointDeletionSummary } from "@/lib/order-point-deletion";
import { previewOrderPointDeletionAction, deleteOrderPointAction } from "@/app/mypage/menus/[menuId]/tables/actions";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";

export default function DeleteOrderPoint({ menuSiteId, point, withHistory = false, disabled = false }: {
  menuSiteId: string; point: { id: string; label: string; kind?: "table" | "kiosk" }; withHistory?: boolean; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false), [summary, setSummary] = useState<OrderPointDeletionSummary | null>(null);
  const [error, setError] = useState(""), [label, setLabel] = useState(""), [accepted, setAccepted] = useState(false);
  const [feedback, setFeedback] = useState<{ message: string; tone: "success" | "error" } | null>(null);
  const [loading, load] = useTransition(), [pending, remove] = useTransition();
  const router = useRouter(), generation = useRef(0), id = useId();
  const noun = point.kind === "kiosk" ? "키오스크" : "테이블";
  const block = summary ? orderPointDeletionBlock(summary, withHistory) : null;
  function preview() {
    const current = ++generation.current;
    setSummary(null); setError(""); setLabel(""); setAccepted(false);
    load(async () => {
      const result = await previewOrderPointDeletionAction({ menuSiteId, tableId: point.id });
      if (current !== generation.current) return;
      if (result.status === "success") setSummary(result.summary);
      else setError(result.message);
    });
  }
  function confirm() {
    if (!summary || block || pending || (withHistory && (!accepted || label !== summary.label))) return;
    setError("");
    remove(async () => {
      const result = await deleteOrderPointAction({ menuSiteId, tableId: point.id, fingerprint: summary.fingerprint,
        confirmationLabel: withHistory ? label : summary.label, withHistory });
      if (result.status === "success") { setFeedback({ message: result.message, tone: "success" }); setOpen(false); router.refresh(); }
      else { setError(result.message); setSummary(null); }
    });
  }
  return <>
    <ActionFeedbackToast message={feedback?.message} tone={feedback?.tone} eventKey={feedback} />
    <Dialog open={open} onOpenChange={next => { if (pending) return; setOpen(next); if (next) preview(); else generation.current++; }}>
      <DialogTrigger asChild><button type="button" disabled={disabled} className={withHistory ? "site-button site-button-danger-ghost" : "site-button site-button-outline-danger"}>{withHistory ? "관련 데이터까지 영구 삭제" : `${noun} 삭제`}</button></DialogTrigger>
      <DialogContent scrollable onEscapeKeyDown={event => { if (pending) event.preventDefault(); }} onInteractOutside={event => { if (pending) event.preventDefault(); }}>
        <DialogHeader reserveCloseButton><DialogTitle>{point.label}{withHistory ? " 및 관련 데이터를 영구 삭제할까요?" : " 등록을 삭제할까요?"}</DialogTitle><DialogDescription>{withHistory ? "아래 범위의 데이터와 등록을 실제로 삭제하며 복원할 수 없습니다. 매출 집계에서도 제외됩니다." : "사용 이력이 없는 테이블·키오스크 등록만 삭제합니다. 사용 이력이 있으면 보관해 주세요."}</DialogDescription></DialogHeader>
        <div className="site-stack-group" aria-busy={loading || pending}>
          {loading ? <LoadingState label="삭제할 데이터와 매출 영향을 확인하고 있습니다." /> : null}
          {error ? <p role="alert" className="type-body-sm">{error}</p> : null}
          {summary ? <>
            <ContentPanel surface="muted" density="compact"><dl className="site-stack-copy">
              {[["주문 내역", `${summary.orderCount}건`], ["호출 내역", `${summary.callCount}건`], ["주문 상품·옵션 기록", `${summary.itemCount}개 · ${summary.optionCount}개`], ["방문·기기 연결 기록", `${summary.visitCount}건 (매장 기기 ${summary.connectionCount}건 포함)`]].map(([term, detail]) => <div className="site-content-heading-row" key={term}><dt className="type-label">{term}</dt><dd className="type-body-sm">{detail}</dd></div>)}
            </dl></ContentPanel>
            {withHistory ? <ContentPanel surface="notice" density="compact"><div className="site-stack-copy"><p className="type-label">매출 집계에서 제외되는 결제 완료액</p><p className="type-body">전체 {summary.collectedAmount.toLocaleString("ko-KR")}원 · 이번 달 {summary.monthCollectedAmount.toLocaleString("ko-KR")}원 · 오늘 {summary.todayCollectedAmount.toLocaleString("ko-KR")}원</p><p className="type-footnote">주문 상품·옵션 기록과 방문·기기 연결, 테이블 QR 주소도 함께 사라집니다. 결제 취소·환불은 실행하지 않습니다. 삭제 실행자·시각과 집계 건수는 관리 기록으로 남습니다.</p></div></ContentPanel> : null}
            {block ? <p className="type-body-sm" role="status">{block}</p> : withHistory ? <fieldset className="site-stack-block" disabled={pending}><label className="site-field-stack type-label" htmlFor={id}>확인을 위해 ‘{summary.label}’을 입력해 주세요.<input id={id} className="site-field w-full" value={label} autoComplete="off" onChange={event => setLabel(event.target.value)} /></label><label className="site-action-row type-body-sm"><Checkbox checked={accepted} onCheckedChange={checked => setAccepted(checked === true)} />표시된 데이터와 매출 집계에서 삭제되며 복원할 수 없음을 확인했습니다.</label></fieldset> : null}
          </> : null}
        </div>
        <DialogFooter><button type="button" className="site-button site-button-outline" disabled={pending} onClick={() => { generation.current++; setOpen(false); }}>취소</button>{error ? <button type="button" className="site-button site-button-outline" disabled={loading || pending} onClick={preview}>삭제 범위 다시 확인</button> : null}<button type="button" className="site-button site-button-danger" disabled={!summary || !!block || loading || pending || (withHistory && (!accepted || label !== summary.label))} onClick={confirm}>{pending ? "삭제 중" : withHistory ? "영구 삭제" : "삭제"}</button></DialogFooter>
      </DialogContent>
    </Dialog>
  </>;
}
