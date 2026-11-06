"use client";

import type { OrderPointKind } from "@/lib/order-point-policy";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { LoadingState } from "@/app/components/ui/loading-state";

export default function OrderPointRegistrationForm({ menuSiteId, kind, onKindChange, name, onNameChange, onCancel, pending = false, kioskAvailable, action }: {
  menuSiteId: string; kind: OrderPointKind; onKindChange: (kind: OrderPointKind) => void;
  name: string; onNameChange: (name: string) => void; onCancel: () => void;
  pending?: boolean; kioskAvailable: boolean; action: (data: FormData) => void | Promise<void>;
}) {
  const kiosk = kind === "kiosk", registrationNoun = kiosk ? "키오스크" : "테이블";
  return <ContentPanel surface="muted">
    <form data-unsaved-commit action={action} aria-busy={pending} className="site-registration-row">
      <input type="hidden" name="menuSiteId" value={menuSiteId} />
      <label className="type-label site-registration-kind">종류
        <select name="kind" value={kind} disabled={pending} onChange={event => onKindChange(event.target.value as OrderPointKind)} className="site-field">
          <option value="table">테이블</option><option value="kiosk" disabled={!kioskAvailable}>키오스크</option>
        </select>
      </label>
      <label className="type-label site-registration-name">이름
        <input name="label" required maxLength={80} disabled={pending} value={name} onChange={event => onNameChange(event.target.value)} placeholder={kiosk ? "예: 입구 키오스크, 카운터 키오스크" : "예: 1번 테이블, 테라스 1번 테이블, 1번 단체 테이블"} className="site-field" />
      </label>
      <div className="site-action-row" data-wrap="nowrap">
        <button type="submit" disabled={pending || (kiosk && !kioskAvailable)} className="site-button site-button-primary">{pending ? "생성 중" : "만들기"}</button>
        <button type="button" className="site-button site-button-outline" disabled={pending || !name} onClick={() => onCancel()}>취소</button>
      </div>
    </form>
    {!kioskAvailable ? <p className="type-footnote site-copy-muted">키오스크 등록 기능을 현재 사용할 수 없습니다. 기존 등록 정보는 계속 확인할 수 있습니다.</p> : null}
    {pending ? <LoadingState inline label={`${registrationNoun}${kiosk ? "를" : "을"} 만들고 있습니다. 잠시만 기다려 주세요.`} /> : null}
  </ContentPanel>;
}
