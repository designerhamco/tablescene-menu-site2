"use client";

import { useId, useRef, useState, useTransition } from "react";
import { Switch } from "@/app/components/ui/switch";
import { orderPointPolicyKey, type OrderPointChannel, type OrderPointFeature, type OrderPointPolicy, type OrderPointFeatureUpdate } from "@/lib/order-point-policy";
import OperationActionFeedback from "./OperationActionFeedback";
import type { OperationFeatureUpdateResult } from "@/app/mypage/operations/actions";

export default function OrderPointFeatureControl({ menuSiteId, tableId, label, channel, feature, policy, disabledReason, readOnly = false, pointStatus = "active", inline = false, channelLabel, connectionRequired, onUpdate }: {
  menuSiteId: string; tableId: string; label: string; channel: OrderPointChannel; feature: OrderPointFeature;
  connectionRequired?: { reason: string; onConnect: () => void }; policy: OrderPointPolicy; disabledReason: string | null; readOnly?: boolean; pointStatus?: "active" | "disabled"; inline?: boolean; channelLabel?: string; onUpdate: OrderPointFeatureUpdate;
}) {
  const id = useId(), ref = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<OperationFeatureUpdateResult | null>(null);
  const storedEnabled = policy[orderPointPolicyKey(channel, feature)];
  const enabled = pointStatus === "active" && storedEnabled;
  const featureLabel = feature === "orders" ? "주문" : "호출";
  const accessibleChannelLabel = channel === "terminal" ? "매장 기기" : "손님 휴대폰·QR";
  const toggle = <Switch size={inline ? "sm" : "md"} ref={ref} id={id} checked={!disabledReason && !connectionRequired && enabled} disabled={readOnly || Boolean(disabledReason)} loading={pending}
    aria-label={`${label} ${accessibleChannelLabel} ${featureLabel} 허용`} aria-describedby={disabledReason || connectionRequired ? `${id}-reason` : undefined}
    onCheckedChange={next => {
      if (next && connectionRequired) { setResult(null); connectionRequired.onConnect(); return; }
      startTransition(async () => {
        setResult(null);
        try { setResult(await onUpdate({ menuSiteId, tableId, channel, feature, enabled: next, expectedEnabled: storedEnabled, expectedStatus: pointStatus })); }
        catch { setResult({ status: "error", message: "설정을 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요." }); }
      });
    }} />;
  return <div className="site-stack-copy">
    {inline ? <div className="site-order-point-toggle"><label htmlFor={id} className="type-label">{channelLabel ?? (channel === "terminal" ? "태블릿" : "모바일")}</label>{toggle}</div> : <div className="site-action-row" data-distribution="between"><label htmlFor={id} className="type-label">{featureLabel} 허용</label><div className="site-action-row">{toggle}</div></div>}
    {readOnly && !disabledReason && !inline ? <p className="type-footnote site-copy-muted">허용 설정은 사장님만 변경할 수 있습니다.</p> : null}
    {disabledReason || connectionRequired ? <p id={`${id}-reason`} className={inline ? "sr-only" : "type-footnote site-copy-muted"}>{`확인 필요: ${disabledReason ?? connectionRequired?.reason}`}</p> : null}
    <OperationActionFeedback result={pending ? null : result} title={`${featureLabel} 허용 설정 저장 실패`} triggerRef={ref} onClose={() => setResult(null)} />
  </div>;
}
