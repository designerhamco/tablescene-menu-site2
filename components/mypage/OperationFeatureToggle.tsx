"use client";

import { useId, useState, useTransition } from "react";
import { Switch } from "@/app/components/ui/switch";
import { updateOperationFeature, type OperationFeatureUpdateResult } from "@/app/mypage/operations/actions";
import type { MenuOrderSettingsSection } from "@/lib/menu-order-settings";

export default function OperationFeatureToggle({ menuId, feature, enabled, canEnable, activeTablesReady }: {
  menuId: string;
  feature: MenuOrderSettingsSection;
  enabled: boolean;
  canEnable: boolean;
  activeTablesReady: boolean | null;
}) {
  const id = useId();
  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<OperationFeatureUpdateResult | null>(null);
  const disabled = pending || (!enabled && (!canEnable || activeTablesReady !== true));
  const reason = !enabled && activeTablesReady !== true
    ? activeTablesReady === null ? "테이블 상태 확인 필요" : "활성 테이블 등록 후 ON 가능"
    : !canEnable ? "현재 기능 연결을 확인해 주세요." : null;

  return <div className="site-stack-copy">
    <label htmlFor={id} className="flex min-h-11 items-center justify-between gap-3">
      <span className="type-label" aria-live="polite">{pending ? "저장 중…" : enabled ? "ON" : "OFF"}</span>
      <Switch id={id} checked={enabled} disabled={disabled} aria-busy={pending}
        aria-label={`${feature === "orders" ? "주문" : "호출"} 기능 사용`}
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
    {reason ? <p id={`${id}-reason`} className="type-body-sm text-zinc-600">{reason}</p> : null}
    {notice ? <p role={notice.status === "error" ? "alert" : "status"}
      className={`type-body-sm ${notice.status === "error" ? "text-red-700" : "text-emerald-700"}`}>{notice.message}</p> : null}
  </div>;
}
