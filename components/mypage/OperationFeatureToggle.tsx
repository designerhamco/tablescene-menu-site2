"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Switch } from "@/app/components/ui/switch";
import { updateOperationFeature, type OperationFeatureUpdateResult } from "@/app/mypage/operations/actions";
import type { MenuOrderSettingsSection } from "@/lib/menu-order-settings";
import type { ReactNode } from "react";
import OperationActionFeedback from "./OperationActionFeedback";

export default function OperationFeatureToggle({ menuId, feature, enabled, canEnable, activeTablesReady, published = true, action, blockedReason, reasonVisible = true, showStateLabel = true }: {
  menuId: string;
  feature: MenuOrderSettingsSection;
  enabled: boolean;
  canEnable: boolean;
  activeTablesReady: boolean | null;
  published?: boolean;
  action?: ReactNode;
  blockedReason?: string | null;
  reasonVisible?: boolean;
  showStateLabel?: boolean;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<OperationFeatureUpdateResult | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const displayedEnabled = published && activeTablesReady === true && canEnable && enabled;
  const disabled = pending || !published || activeTablesReady !== true || !canEnable;
  const reason = blockedReason ?? (!published ? "메뉴판 공개 후 ON 가능" : !enabled && activeTablesReady !== true
    ? activeTablesReady === null ? "테이블 상태 확인 필요" : "테이블 또는 키오스크 등록·복원 후 ON 가능"
    : !canEnable ? "현재 기능 연결을 확인해 주세요." : null);

  return <div className="site-stack-copy">
    <div className="site-action-row" data-distribution={action ? "between" : "end"}>
    {action}
    <label htmlFor={id} className="site-action-row">
      <span className={showStateLabel ? "type-caption" : "sr-only"} aria-live="polite">{pending ? "저장 중…" : activeTablesReady === null ? "확인 필요" : displayedEnabled ? "ON" : "OFF"}</span>
      <Switch ref={triggerRef} id={id} checked={displayedEnabled} loading={pending} disabled={disabled} aria-busy={pending}
        aria-label={`전체 ${feature === "orders" ? "주문" : "호출"} 기능 사용`}
        aria-describedby={reason ? `${id}-reason` : undefined}
        onCheckedChange={(nextEnabled) => startTransition(async () => {
          setNotice(null);
          try {
            setNotice(await updateOperationFeature({ menuId, feature, enabled: nextEnabled, expectedEnabled: enabled }));
          } catch {
            setNotice({ status: "error", message: "사용 설정을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요." });
          }
        })} />
    </label>
    </div>
    {reason ? <p id={`${id}-reason`} className={reasonVisible ? "type-body-sm site-copy-muted" : "sr-only"}>{reason}</p> : null}
    <OperationActionFeedback result={pending ? null : notice} title={`${feature === "orders" ? "주문" : "호출"} 설정 저장 실패`}
      onClose={() => setNotice(null)} triggerRef={triggerRef} />
  </div>;
}
