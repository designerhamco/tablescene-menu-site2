"use client";

import { useId } from "react";
import type { OrderPointKind } from "@/lib/order-point-policy";
import { Button } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { FieldActionRow } from "@/app/components/ui/field-action-row";
import { LoadingState } from "@/app/components/ui/loading-state";
import HelpTooltip from "@/components/ui/HelpTooltip";

export default function OrderPointRegistrationForm({ embedded = false, floorToolbar = false, menuSiteId, kind, onKindChange, name, onNameChange, suggestedName, roomReady, roomId = "", blockedReason, pending = false, disabled = false, kioskAvailable, action }: {
  embedded?: boolean; floorToolbar?: boolean; menuSiteId: string; kind: OrderPointKind; onKindChange: (kind: OrderPointKind) => void;
  name: string; suggestedName?: string; onNameChange: (name: string) => void; roomReady: boolean; roomId?: string; blockedReason?: string;
  pending?: boolean; disabled?: boolean; kioskAvailable: boolean; action: (data: FormData) => void | Promise<void>;
}) {
  const reasonId = useId();
  const blocked = pending || disabled || !roomReady;
  const kiosk = kind === "kiosk", registrationNoun = kiosk ? "키오스크" : "테이블";
  const roomReason = roomReady ? null : blockedReason ?? "룸을 먼저 추가하면 테이블·키오스크를 만들 수 있습니다.";
  const kioskReason = !kioskAvailable ? "키오스크 등록 기능을 현재 사용할 수 없습니다. 기존 등록 정보는 계속 확인할 수 있습니다." : null;
  const submit = <button type="submit" disabled={blocked || (kiosk && !kioskAvailable)} className="site-button site-button-primary">{pending ? "생성 중" : floorToolbar ? "등록" : "만들기"}</button>;
  const content = <>
    <form data-unsaved-commit action={action} aria-busy={pending} aria-describedby={!roomReady ? reasonId : undefined} className={floorToolbar ? "site-floor-registration" : "site-registration-row"}>
      <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="roomId" value={roomId} />
      {floorToolbar ? <div className="site-action-row" data-wrap="nowrap" role="group" aria-label="등록 종류">
        <input type="hidden" name="kind" value={kind} />
        <Button type="button" size="compact" variant={kiosk ? "outline" : "default"} disabled={blocked} aria-pressed={!kiosk} onClick={() => onKindChange("table")}>
          <span className="site-floor-kind-mark" data-kind="table" aria-hidden="true" />테이블 등록
        </Button>
        <Button type="button" size="compact" variant={kiosk ? "default" : "outline"} disabled={blocked || !kioskAvailable} aria-pressed={kiosk} onClick={() => onKindChange("kiosk")}>
          <span className="site-floor-kind-mark" data-kind="kiosk" aria-hidden="true" />키오스크 등록
        </Button>
      </div> : <label className="type-label site-registration-kind">종류
        <select name="kind" value={kind} disabled={blocked} onChange={event => onKindChange(event.target.value as OrderPointKind)} className="site-field">
          <option value="table">테이블</option><option value="kiosk" disabled={!kioskAvailable}>키오스크</option>
        </select>
      </label>}
      <FieldActionRow field={<label className="type-label site-registration-name">{floorToolbar ? `${registrationNoun} 이름` : "이름"}
        <input name="label" required={!suggestedName} maxLength={80} disabled={blocked} value={name} onChange={event => onNameChange(event.target.value)} placeholder={suggestedName ?? (kiosk ? "예: 입구 키오스크" : "예: 1번 테이블")} className="site-field" />
      </label>} action={floorToolbar && (roomReason || kioskReason) ? <div className="site-action-row" data-wrap="nowrap">
        {submit}
        <HelpTooltip label="테이블·키오스크 등록 도움말" side="bottom" align="end" hover>
          {roomReason && <p>{roomReason}</p>}
          {kioskReason && <p>{kioskReason}</p>}
        </HelpTooltip>
      </div> : submit} />
    </form>
    {roomReason && <p id={reasonId} className={floorToolbar ? "sr-only" : "type-footnote site-copy-muted"}>{roomReason}</p>}
    {!floorToolbar && kioskReason && <p className="type-footnote site-copy-muted">{kioskReason}</p>}
    {pending ? <LoadingState inline label={`${registrationNoun}${kiosk ? "를" : "을"} 만들고 있습니다. 잠시만 기다려 주세요.`} /> : null}
  </>;
  return embedded ? content : <ContentPanel surface="muted" density="controls">{content}</ContentPanel>;
}
