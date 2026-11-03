"use client";

import { useId, useRef, useState, useTransition, type ReactNode } from "react";
import { Switch } from "@/app/components/ui/switch";
import { updateOperationPublication, type OperationFeatureUpdateResult } from "@/app/mypage/operations/actions";
import OperationActionFeedback from "./OperationActionFeedback";

export default function OperationPublicationToggle({ menuId, published, canPublish, action, editHref }: { menuId: string; published: boolean; canPublish: boolean; action?: ReactNode; editHref?: string }) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<OperationFeatureUpdateResult | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  return <div className="site-stack-copy">
    <div className="site-action-row" data-distribution={action ? "between" : "end"}>
      {action}
      {canPublish ? <label htmlFor={id} className="site-action-row">
        <span className="sr-only" aria-live="polite">{pending ? "저장 중…" : published ? "ON" : "OFF"}</span>
        <Switch ref={triggerRef} id={id} checked={published} loading={pending} disabled={pending} aria-busy={pending} aria-label="메뉴판 공개"
          onCheckedChange={next => {
            if (!next && !window.confirm("메뉴판을 비공개로 바꾸면 주문·호출도 OFF로 저장됩니다. 기존 주문·호출 내역은 유지됩니다. 비공개로 바꿀까요?")) return;
            startTransition(async () => {
              setNotice(null);
              try { setNotice(await updateOperationPublication({ menuId, published: next, expectedPublished: published })); }
              catch { setNotice({ status: "error", message: "공개 상태를 저장하지 못했습니다. 다시 시도해 주세요." }); }
            });
          }} />
      </label> : <p className="type-footnote site-copy-muted">공개 상태를 변경할 권한이 없습니다.</p>}
    </div>
    <OperationActionFeedback result={pending ? null : notice} title="공개 설정 저장 실패" onClose={() => setNotice(null)} triggerRef={triggerRef}
      recovery={editHref ? { href: editHref, label: "메뉴판 편집으로 이동" } : undefined} />
  </div>;
}
