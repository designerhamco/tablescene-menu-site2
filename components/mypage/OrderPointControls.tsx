"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { MenuTableListItem } from "@/lib/menu-table-validation";
import { formatTerminalDevice } from "@/lib/terminal-device-info";
import InfoTooltip from "@/components/ui/InfoTooltip";
import type { OrderPointConnectionState } from "./OrderPointConnectionSummary";

export type ManagedOrderPoint = Pick<MenuTableListItem, "id" | "label" | "status" | "kind" | "policy" | "policyAvailable">;

/** Both management views show the same per-channel permissions, without another master switch. */
export function OrderPointReceptionSummary({ menuSiteId, point }: { menuSiteId: string; point: ManagedOrderPoint }) {
  return <div className="site-order-point-reception-summary">
    {(["orders", "calls"] as const).map(feature => {
      const label = feature === "orders" ? "주문" : "호출";
      const terminal = feature === "orders" ? point.policy?.terminalOrderEnabled : point.policy?.terminalCallEnabled;
      const customer = feature === "orders" ? point.policy?.customerOrderEnabled : point.policy?.customerCallEnabled;
      const known = point.policyAvailable && point.policy;
      const detail = !known ? "확인 불가" : point.status === "disabled" ? "이전 설정으로 중지됨" : point.kind === "kiosk" ? `기기 ${terminal ? "ON" : "OFF"}` : `태블릿 ${terminal ? "ON" : "OFF"} · QR ${customer ? "ON" : "OFF"}`;
      return <div key={feature} className="site-action-row" data-wrap="nowrap"><span className="type-label">{label}</span><span className="type-body-sm">{detail}</span><Link className="site-button site-button-outline site-button-compact" href={`/mypage/menus/${menuSiteId}/${feature}/settings#point-${point.id}`} aria-label={`${point.label} ${label} 설정`}>설정</Link></div>;
    })}
    <div className="site-order-point-reception-help"><InfoTooltip label={`${point.label} 주문·호출 허용 안내`}><p>표시는 이 테이블·키오스크의 개별 허용 설정입니다. 실제로 주문·호출을 받으려면 전체 기능이 켜져 있고 메뉴판 공개와 해당 기기 연결 등 이용 조건도 충족되어야 합니다.</p><p>잠깐 멈추려면 주문·호출 설정에서 각각 OFF로 바꾸세요. 운영 목록에서 제외하려면 보관을 사용해 주세요.</p></InfoTooltip></div>
  </div>;
}

export function OrderPointConnectionControl({ menuSiteId, point, state }: { menuSiteId: string; point: ManagedOrderPoint; state?: OrderPointConnectionState }) {
  const available = Boolean(state?.available), kiosk = point.kind === "kiosk";
  const devices = available ? state!.connections.filter(item => item.tableId === point.id) : [];
  const connected = devices.length > 0;
  const connectionLabel = !available ? "확인 불가" : connected ? `기기 연결됨${devices.length > 1 ? ` · ${devices.length}대` : ""}` : kiosk ? "연결 필요" : "미사용";
  const actionLabel = !available ? "연결 확인" : connected ? "연결 관리" : "연결하기";
  return <div className="site-action-row" data-wrap="nowrap">
    <InfoTooltip label={`${point.label} 기기 연결 안내`}>
      {!available ? <p>연결 정보를 불러오지 못했습니다. 기기별 설정에서 다시 확인해 주세요.</p>
        : connected ? <ul className="site-stack-copy">{devices.map((item, index) => <li key={index}>{item.device ? formatTerminalDevice(item.device) : "기기 정보가 없는 이전 연결입니다."}</li>)}</ul>
          : <p>{kiosk ? "키오스크로 주문을 받으려면 이 번호에 사용할 기기를 연결해 주세요. 손님마다 다시 연결할 필요는 없습니다." : "손님 휴대폰·QR 주문은 기기를 연결하지 않아도 됩니다. 테이블에 비치한 태블릿으로 주문을 받으려면 해당 태블릿에서 연결해 주세요."}</p>}
    </InfoTooltip>
    <span className="type-label">{connectionLabel}</span>
    <Link className="site-button site-button-outline site-button-compact" aria-label={`${point.label} ${actionLabel}`} href={`/mypage/menus/${menuSiteId}/orders/settings?tab=devices#point-${point.id}`}>{actionLabel}</Link>
  </div>;
}

export function OrderPointLegacyResume({ menuSiteId, point, action, disabled = false }: { menuSiteId: string; point: ManagedOrderPoint; action: (data: FormData) => void; disabled?: boolean }) {
  if (point.status !== "disabled") return null;
  return <div className="site-action-row" data-wrap="nowrap"><span className="type-body-sm site-copy-muted">기존 사용 중지</span><InfoTooltip label={`${point.label} 기존 중지 설정 안내`}><p>이전 사용 중지 설정을 유지하고 있습니다. 재개하면 주문·호출을 모두 OFF로 시작하며, 필요한 기능만 각 설정에서 켤 수 있습니다.</p></InfoTooltip><form action={action}><input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} /><button name="intent" value="resume" disabled={disabled} className="site-button site-button-outline site-button-compact" aria-label={`${point.label} 운영 재개`}>운영 재개</button></form></div>;
}

export function OrderPointArchiveControl({ menuSiteId, point, action, disabled = false }: { menuSiteId: string; point: ManagedOrderPoint; action: (data: FormData) => void; disabled?: boolean }) {
  return <form action={action} aria-busy={disabled}><input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} /><button name="intent" value="archive" disabled={disabled} aria-label={`${point.label} 보관`} className="site-button site-button-outline site-button-compact">보관</button></form>;
}

export function OrderPointSelectionDetails({ menuSiteId, point, connectionState, disabled, action, children }: {
  menuSiteId: string; point: ManagedOrderPoint; connectionState?: OrderPointConnectionState; disabled: boolean; action: (data: FormData) => void; children?: ReactNode;
}) {
  return <div className="site-floor-selection-details" role="group" aria-label={`${point.label} 운영 정보`}>
    <h3 className="type-content-title site-floor-selection-name">{point.label}</h3>
    <OrderPointReceptionSummary menuSiteId={menuSiteId} point={point} />
    <div className="site-action-row" data-wrap="nowrap"><span className="type-label">{point.kind === "kiosk" ? "기기 연결 여부" : "공용 태블릿 연결 여부"}</span><OrderPointConnectionControl menuSiteId={menuSiteId} point={point} state={connectionState} /></div>
    <OrderPointLegacyResume menuSiteId={menuSiteId} point={point} action={action} disabled={disabled} />
    <div className="site-action-row site-floor-workspace-actions" data-wrap="nowrap"><OrderPointArchiveControl menuSiteId={menuSiteId} point={point} action={action} disabled={disabled} /><InfoTooltip label={`${point.label} 보관 안내`}><p>운영 목록과 배치도에서 제외하고 연결을 종료합니다. 기존 주문·호출 기록과 등록 정보는 유지되며 보관 목록에서 복원할 수 있습니다. 사각형 안 X는 배치만 해제합니다.</p></InfoTooltip>{children}</div>
  </div>;
}
