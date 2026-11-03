"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Switch } from "@/app/components/ui/switch";
import { updateOrderPointFeature } from "@/app/mypage/menus/[menuId]/tables/actions";
import { orderPointPolicyKey, type OrderPointChannel, type OrderPointFeature, type OrderPointPolicy } from "@/lib/order-point-policy";
import OperationActionFeedback from "./OperationActionFeedback";
import type { OperationFeatureUpdateResult } from "@/app/mypage/operations/actions";

export default function OrderPointFeatureToggle({ menuSiteId, tableId, label, channel, feature, policy, disabledReason, readOnly = false }: {
  menuSiteId: string; tableId: string; label: string; channel: OrderPointChannel; feature: OrderPointFeature;
  policy: OrderPointPolicy; disabledReason: string | null; readOnly?: boolean;
}) {
  const id = useId(), ref = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<OperationFeatureUpdateResult | null>(null);
  const enabled = policy[orderPointPolicyKey(channel, feature)];
  const featureLabel = feature === "orders" ? "주문" : "호출";
  const channelLabel = channel === "terminal" ? "매장 기기" : "손님 휴대폰·QR";
  return <div className="site-stack-copy">
    <div className="site-action-row" data-distribution="between">
      <label htmlFor={id} className="type-label">{featureLabel} 허용</label>
      <div className="site-action-row">
        <span className="type-caption" aria-live="polite">{pending ? "저장 중…" : disabledReason ? "사용 불가" : enabled ? "ON" : "OFF"}</span>
        <Switch ref={ref} id={id} checked={!disabledReason && enabled} disabled={readOnly || Boolean(disabledReason)} loading={pending}
          aria-label={`${label} ${channelLabel} ${featureLabel} 허용`} aria-describedby={disabledReason ? `${id}-reason` : undefined}
          onCheckedChange={next => startTransition(async () => {
            setResult(null);
            try { setResult(await updateOrderPointFeature({ menuSiteId, tableId, channel, feature, enabled: next, expectedEnabled: enabled })); }
            catch { setResult({ status: "error", message: "설정을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요." }); }
          })} />
      </div>
    </div>
    {readOnly && !disabledReason ? <p className="type-footnote site-copy-muted">허용 설정은 사장님만 변경할 수 있습니다.</p> : null}
    {disabledReason ? <p id={`${id}-reason`} className="type-footnote site-copy-muted">{disabledReason}</p> : null}
    <OperationActionFeedback result={pending ? null : result} title={`${featureLabel} 허용 설정 저장 실패`} triggerRef={ref} onClose={() => setResult(null)} />
  </div>;
}
