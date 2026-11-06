"use client";

import type { OrderPointConnectRequest } from "@/lib/order-point-connection";
import type { ReactNode } from "react";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { LoadingState } from "@/app/components/ui/loading-state";
import { Badge } from "@/app/components/ui/badge";
import { formatTerminalDevice, type TableTerminalConnection, type TerminalDeviceInfo } from "@/lib/terminal-device-info";
import { formatKoreanDateTime } from "@/lib/korean-date-time";

export default function TableTerminalConnections({ menuSiteId, table, connections, available, currentTableId, currentKnown, published, device, pending, action, showMenuOpen = true, deviceEditor, onRefresh, refreshing = false, enableRequest }: {
  menuSiteId: string; table: { id: string; label: string; status: string; kind?: "table" | "kiosk" }; connections: TableTerminalConnection[];
  available: boolean; currentTableId: string | null; currentKnown: boolean; published: boolean;
  device: TerminalDeviceInfo; pending: boolean; action: (formData: FormData) => void;
  enableRequest?: OrderPointConnectRequest; showMenuOpen?: boolean; deviceEditor?: ReactNode; onRefresh?: () => void; refreshing?: boolean;
}) {
  const kiosk = table.kind === "kiosk", pointLabel = kiosk ? "키오스크" : "테이블";
  return <div className="site-stack-group" aria-label={`${table.label} 기기 연결`}>
    <div className="site-stack-block" aria-busy={pending}>
      <div className="site-content-heading-row">
        <div className="site-stack-copy min-w-0">
          <h4 className="type-item-title">현재 접속한 기기</h4>
          <p className="type-body break-words">{formatTerminalDevice(device)}</p>
          <p className="type-body-sm site-copy-muted">{!currentKnown ? "현재 기기의 연결 상태를 확인하지 못했습니다." : currentTableId === table.id ? `${table.label}에 연결되어 있습니다.` : currentTableId ? "현재 기기는 다른 테이블 또는 키오스크에 연결되어 있습니다. 연결하면 이 기기의 기존 연결이 변경됩니다." : `현재 기기는 이 ${pointLabel}에 연결되어 있지 않습니다.`}</p>
        </div>
        {onRefresh ? <RefreshButton label="연결 상태 새로고침" onClick={onRefresh} disabled={pending} loading={refreshing} /> : null}
      </div>
      {deviceEditor}
      {pending ? <LoadingState inline indicator="bar" label="기기 연결 설정을 처리하고 있습니다. 잠시만 기다려 주세요." /> : null}
      <div className="site-action-row">
        {currentTableId !== table.id || enableRequest ? <form data-unsaved-commit action={action} aria-busy={pending} onSubmit={event => {
          // Toggle activation is confirmed by the shared connection dialog and its Save action.
          if (enableRequest) return;
          if (!window.confirm(`현재 기기를 ${table.label}에 연결할까요?${currentTableId ? " 이 기기의 기존 연결은 해제됩니다." : ""} 관리자 화면은 유지되며 다른 기기의 연결에도 영향을 주지 않습니다.`)) event.preventDefault();
        }}>
          {enableRequest ? <><input type="hidden" name="enableFeature" value={enableRequest.feature} /><input type="hidden" name="enableExpectedEnabled" value={String(enableRequest.expectedEnabled)} /></> : null}
          <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={table.id} /><input type="hidden" name="pointStatus" value={enableRequest?.expectedStatus ?? table.status} /><input type="hidden" name="deviceInfo" value={JSON.stringify(device)} />
          <button name="intent" value="register-terminal" disabled={pending || !available || !currentKnown || !published || table.status === "archived" || (currentTableId === table.id && !enableRequest)} className={enableRequest ? "site-button site-button-primary" : "site-button site-button-outline"}>{enableRequest ? "설정 저장" : kiosk ? "현재 기기를 키오스크에 연결" : "현재 태블릿을 테이블에 연결"}</button>
        </form> : null}
        {showMenuOpen && currentKnown && currentTableId === table.id ? <form action={action} aria-busy={pending} onSubmit={event => { if (!window.confirm("손님용 메뉴판을 열까요? 이 브라우저의 관리자 로그인이 종료됩니다.")) event.preventDefault(); }}>
          <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={table.id} />
          <button name="intent" value="open-terminal-menu" disabled={pending || !published || table.status !== "active"} className="site-button site-button-outline">메뉴판 열기</button>
        </form> : null}
      </div>
    </div>
    <div className="site-stack-block site-content-divider">
      <div className="site-content-heading-row">
        <h4 className="type-item-title">연결된 기기{available && connections.length ? ` · ${connections.length}대` : ""}</h4>
        {available ? <Badge tone={connections.length ? "active" : "neutral"}>{connections.length ? "기기 연결됨" : "미연결"}</Badge> : null}
      </div>
      {!available ? <p className="type-body-sm" role="alert">연결 상태를 불러오지 못했습니다. 새로고침 버튼을 눌러 주세요.</p>
        : !connections.length ? <p className="type-body-sm site-copy-muted">이 {pointLabel}에 연결된 매장 기기가 없습니다.</p>
          : <ul className="site-stack-block">{connections.map(connection => <li key={connection.id} className="site-content-heading-row">
            <div className="site-stack-copy min-w-0">
              <p className="type-body break-words">{connection.device ? formatTerminalDevice(connection.device) : connection.current ? formatTerminalDevice(device) : "기기 정보가 없는 이전 연결입니다."}</p>
              <div className="site-action-row"><Badge tone="neutral">{connection.current ? "현재 기기" : "다른 기기"}</Badge><span className="type-caption site-copy-muted">연결일 {formatKoreanDateTime(connection.createdAt)}</span></div>
            </div>
            <form data-unsaved-commit action={action} aria-busy={pending} onSubmit={event => {
              if (!window.confirm(`${table.label}의 ${connection.current ? "현재 기기" : connection.device ? formatTerminalDevice(connection.device) : "선택한 기기"} 연결을 해제할까요? 이 기기의 주문·호출이 중단되며 기존 주문과 다른 기기의 연결은 유지됩니다.`)) event.preventDefault();
            }}>
              <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={table.id} /><input type="hidden" name="connectionId" value={connection.id} />
              <button name="intent" value="revoke-terminal-connection" disabled={pending} className="site-button site-button-outline">기기 연결 해제</button>
            </form>
          </li>)}</ul>}
    </div>
  </div>;
}
