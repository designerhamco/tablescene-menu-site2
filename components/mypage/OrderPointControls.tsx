"use client";

import type { MenuTableListItem } from "@/lib/menu-table-validation";
import { formatTerminalDevice } from "@/lib/terminal-device-info";
import InfoTooltip from "@/components/ui/InfoTooltip";
import { orderPointTerminalConnectionReason, orderPointConnectionLabel, type OrderPointConnectionState } from "@/lib/order-point-connection";
import { DEFAULT_ORDER_POINT_POLICY, type OrderPointFeature, type OrderPointFeatureUpdate } from "@/lib/order-point-policy";
import OrderPointFeatureControl from "./OrderPointFeatureControl";

export type ManagedOrderPoint = Pick<MenuTableListItem, "id" | "label" | "status" | "kind" | "policy" | "policyAvailable">;

export function OrderPointFeatureControls({ menuSiteId, point, feature, connectionState, onUpdate, readOnly = false, disabled = false }: { connectionState?: OrderPointConnectionState; menuSiteId: string; point: ManagedOrderPoint; feature: OrderPointFeature; onUpdate: OrderPointFeatureUpdate; readOnly?: boolean; disabled?: boolean }) {
  const reason = !point.policyAvailable || !point.policy ? "허용 설정을 불러오지 못했습니다. 새로고침해 주세요." : disabled ? "다른 작업을 처리하고 있습니다." : null;
  return <div className="site-order-point-toggles" role="group" aria-label={`${point.label} ${feature === "orders" ? "주문" : "호출"} 기기별 허용`}>
    <OrderPointFeatureControl inline menuSiteId={menuSiteId} tableId={point.id} label={point.label} channel="terminal" feature={feature} policy={point.policy ?? DEFAULT_ORDER_POINT_POLICY} pointStatus={point.status} disabledReason={reason ?? orderPointTerminalConnectionReason(point.id, connectionState)} readOnly={readOnly} channelLabel={point.kind === "kiosk" ? "키오스크" : "태블릿"} onUpdate={onUpdate} />
    {point.kind !== "kiosk" ? <OrderPointFeatureControl inline menuSiteId={menuSiteId} tableId={point.id} label={point.label} channel="customer" feature={feature} policy={point.policy ?? DEFAULT_ORDER_POINT_POLICY} pointStatus={point.status} disabledReason={reason} readOnly={readOnly} channelLabel="모바일" onUpdate={onUpdate} /> : null}
  </div>;
}

export function OrderPointConnectionControl({ point, state, onConnect }: { point: ManagedOrderPoint; state?: OrderPointConnectionState; onConnect: (id: string) => void }) {
  const available = Boolean(state?.available), kiosk = point.kind === "kiosk";
  const devices = available ? state!.connections.filter(item => item.tableId === point.id) : [];
  const connected = devices.length > 0;
  const connectionLabel = orderPointConnectionLabel(point.id, state);
  const actionLabel = !available ? "연결 확인" : connected ? "연결 관리" : "연결하기";
  return <div className="site-action-row" data-wrap="nowrap">
    <InfoTooltip label={`${point.label} 기기 연결 안내`}>
      {!available ? <p>연결 정보를 불러오지 못했습니다. 테이블·키오스크 관리에서 연결 상태를 다시 확인해 주세요.</p>
        : connected ? <div className="site-stack-copy"><p>연결된 매장 기기의 주문·호출 사용 여부는 각 스위치에서 설정할 수 있습니다.</p><ul className="site-stack-copy">{devices.map((item, index) => <li key={index}>{item.device ? formatTerminalDevice(item.device) : "기기 정보가 없는 이전 연결입니다."}</li>)}</ul></div>
          : <p>{kiosk ? "키오스크의 주문·호출을 켜려면 먼저 사용할 기기를 연결해 주세요. 손님마다 다시 연결할 필요는 없습니다." : "고객 휴대폰의 모바일·QR 주문·호출에는 매장 기기 연결이 필요하지 않습니다. 태블릿도 사용하려면 ‘연결하기’에서 사용할 매장 기기를 먼저 연결해 주세요."}</p>}
    </InfoTooltip>
    <span className="type-label">{connectionLabel}</span>
    <button type="button" className="site-button site-button-outline site-button-compact" aria-label={`${point.label} ${actionLabel}`} onClick={() => onConnect(point.id)}>{actionLabel}</button>
  </div>;
}

export function OrderPointArchiveControl({ menuSiteId, point, action, disabled = false }: { menuSiteId: string; point: ManagedOrderPoint; action: (data: FormData) => void; disabled?: boolean }) {
  return <form action={action} aria-busy={disabled}><input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} /><button name="intent" value="archive" disabled={disabled} aria-label={`${point.label} 보관`} className="site-button site-button-outline site-button-compact">보관</button></form>;
}

export function OrderPointSelectionDetails({ menuSiteId, point, connectionState, disabled, readOnly, onUpdate, onConnect }: {
  menuSiteId: string; point: ManagedOrderPoint; connectionState?: OrderPointConnectionState; disabled: boolean; readOnly?: boolean; onUpdate: OrderPointFeatureUpdate; onConnect: (id: string) => void;
}) {
  return <div className="site-floor-selection-details" role="group" aria-label={`${point.label} 운영 정보`}>
    <h3 className="type-content-title site-floor-selection-name">{point.label}</h3>
    <div className="site-floor-selection-feature"><h4 className="type-label">주문</h4><OrderPointFeatureControls menuSiteId={menuSiteId} point={point} feature="orders" connectionState={connectionState} onUpdate={onUpdate} readOnly={readOnly} disabled={disabled} /></div>
    <div className="site-floor-selection-feature"><h4 className="type-label">호출</h4><OrderPointFeatureControls menuSiteId={menuSiteId} point={point} feature="calls" connectionState={connectionState} onUpdate={onUpdate} readOnly={readOnly} disabled={disabled} /></div>
    <div className="site-floor-selection-feature"><h4 className="type-label">매장 기기 연결</h4><OrderPointConnectionControl point={point} state={connectionState} onConnect={onConnect} /></div>
  </div>;
}
