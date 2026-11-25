"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Switch } from "@/app/components/ui/switch";
import { updateOperationFeature, type OperationFeatureUpdateResult } from "@/app/mypage/operations/actions";
import type { MenuOrderSettingsSection } from "@/lib/menu-order-settings";
import HelpTooltip from "@/components/ui/HelpTooltip";
import OperationActionFeedback from "./OperationActionFeedback";

export default function OperationFeatureToggle({ menuId, feature, enabled, canEnable, activeTablesReady, published = true, toolbarLabel, blockedReason, showReasonHelp = true, menuName }: {
  menuId: string;
  menuName?: string;
  feature: MenuOrderSettingsSection;
  enabled: boolean;
  canEnable: boolean;
  activeTablesReady: boolean | null;
  published?: boolean;
  toolbarLabel?: string;
  blockedReason?: string | null;
  showReasonHelp?: boolean;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<OperationFeatureUpdateResult | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const displayedEnabled = published && activeTablesReady === true && canEnable && enabled;
  const disabled = pending || !published || activeTablesReady !== true || !canEnable;
  const featureLabel = feature === "orders" ? "주문" : "호출";
  const reason = blockedReason ?? (!published ? "메뉴판을 공개한 뒤 켤 수 있습니다." : activeTablesReady !== true
    ? activeTablesReady === null ? "테이블·키오스크 상태를 확인해 주세요." : "테이블 또는 키오스크를 등록·복원한 뒤 켤 수 있습니다."
    : !canEnable ? "현재 기능 연결을 확인해 주세요." : null);

  return <div className="site-action-row" data-wrap="nowrap" data-distribution={toolbarLabel ? undefined : "end"}>
    {toolbarLabel && <label htmlFor={id} className="type-label whitespace-nowrap">{toolbarLabel}</label>}
    <span className="sr-only" aria-live="polite">{pending ? "저장 중…" : activeTablesReady === null ? "확인 필요" : displayedEnabled ? "ON" : "OFF"}</span>
    <Switch ref={triggerRef} id={id} size={toolbarLabel ? "sm" : "md"} checked={displayedEnabled} loading={pending} disabled={disabled} aria-busy={pending}
        aria-label={`${menuName ? `${menuName} ` : ""}전체 ${featureLabel} 기능 사용`}
        aria-describedby={reason ? `${id}-reason` : undefined}
        onCheckedChange={(nextEnabled) => startTransition(async () => {
          setNotice(null);
          try {
            setNotice(await updateOperationFeature({ menuId, feature, enabled: nextEnabled, expectedEnabled: enabled }));
          } catch {
            setNotice({ status: "error", message: "사용 설정을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요." });
          }
        })} />
    {reason && <span id={`${id}-reason`} className="sr-only">{reason}</span>}
    {showReasonHelp && reason && <HelpTooltip label={`${toolbarLabel ?? `전체 ${featureLabel}`} 도움말`} side="bottom" align="end" hover><p>{reason}</p></HelpTooltip>}
    <OperationActionFeedback result={pending ? null : notice} title={`${featureLabel} 설정 저장 실패`}
      onClose={() => setNotice(null)} triggerRef={triggerRef} />
  </div>;
}
