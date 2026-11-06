"use client";

import { useId } from "react";
import type { OrderPointKind } from "@/lib/order-point-policy";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { LoadingState } from "@/app/components/ui/loading-state";

export default function OrderPointRegistrationForm({ menuSiteId, kind, onKindChange, name, onNameChange, roomReady, roomId = "", blockedReason, pending = false, disabled = false, kioskAvailable, action }: {
  menuSiteId: string; kind: OrderPointKind; onKindChange: (kind: OrderPointKind) => void;
  name: string; onNameChange: (name: string) => void; roomReady: boolean; roomId?: string; blockedReason?: string;
  pending?: boolean; disabled?: boolean; kioskAvailable: boolean; action: (data: FormData) => void | Promise<void>;
}) {
  const reasonId = useId();
  const blocked = pending || disabled || !roomReady;
  const kiosk = kind === "kiosk", registrationNoun = kiosk ? "키오스크" : "테이블";
  return <ContentPanel surface="muted">
    <form data-unsaved-commit action={action} aria-busy={pending} aria-describedby={!roomReady ? reasonId : undefined} className="site-registration-row">
      <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="roomId" value={roomId} />
      <label className="type-label site-registration-kind">종류
        <select name="kind" value={kind} disabled={blocked} onChange={event => onKindChange(event.target.value as OrderPointKind)} className="site-field">
          <option value="table">테이블</option><option value="kiosk" disabled={!kioskAvailable}>키오스크</option>
        </select>
      </label>
      <label className="type-label site-registration-name">이름
        <input name="label" required maxLength={80} disabled={blocked} value={name} onChange={event => onNameChange(event.target.value)} placeholder={kiosk ? "예: 입구 키오스크, 카운터 키오스크" : "예: 1번 테이블, 테라스 1번 테이블, 1번 단체 테이블"} className="site-field" />
      </label>
      <div className="site-action-row" data-wrap="nowrap">
        <button type="submit" disabled={blocked || (kiosk && !kioskAvailable)} className="site-button site-button-primary">{pending ? "생성 중" : "만들기"}</button>
      </div>
    </form>
    {!roomReady ? <p id={reasonId} className="type-footnote site-copy-muted" role="status">{blockedReason ?? "룸을 먼저 추가하면 테이블·키오스크를 만들 수 있습니다."}</p> : null}
    {!kioskAvailable ? <p className="type-footnote site-copy-muted">키오스크 등록 기능을 현재 사용할 수 없습니다. 기존 등록 정보는 계속 확인할 수 있습니다.</p> : null}
    {pending ? <LoadingState inline label={`${registrationNoun}${kiosk ? "를" : "을"} 만들고 있습니다. 잠시만 기다려 주세요.`} /> : null}
  </ContentPanel>;
}
