"use client";

import type { OrderPointConnectRequest } from "@/lib/order-point-connection";
import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutateMenuTableAction } from "@/app/mypage/menus/[menuId]/tables/actions";
import { initialMenuTableActionState } from "@/app/mypage/menus/[menuId]/tables/action-state";
import type { OrderPointDeviceSettings } from "@/lib/terminal-device-info";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { useCurrentDeviceInfo } from "./useCurrentDeviceInfo";
import TableTerminalConnections from "./TableTerminalConnections";

export default function OrderPointDeviceConnection({ menuSiteId, point, published, setup, embedded = false, expandedDeviceEditor = false, enableRequest, mutateAction = mutateMenuTableAction }: {
  menuSiteId: string; point: { id: string; label: string; status: string; kind?: "table" | "kiosk" };
  enableRequest?: OrderPointConnectRequest; published: boolean; setup: OrderPointDeviceSettings; embedded?: boolean; expandedDeviceEditor?: boolean; mutateAction?: typeof mutateMenuTableAction;
}) {
  const [state, action, pending] = useActionState(mutateAction, initialMenuTableActionState);
  const router = useRouter(), [refreshing, refresh] = useTransition();
  const { device, os, setOs, model, setModel } = useCurrentDeviceInfo(setup.currentDevice);
  const editor = <details className="site-stack-block" open={expandedDeviceEditor || undefined}>
    <summary className="type-label">기기 정보 확인·수정</summary>
    <div className="site-form-row">
      <label className="site-field-stack type-label">운영체제 (선택)<input className="site-field w-full" value={os} maxLength={100} onChange={event => setOs(event.target.value)} placeholder={device.os} /></label>
      <label className="site-field-stack type-label">모델명 (선택)<input className="site-field w-full" value={model} maxLength={100} onChange={event => setModel(event.target.value)} placeholder="예: iPad Pro 11, SM-X900" /></label>
    </div>
    <p className="type-footnote site-copy-muted">브라우저의 실제 OS·모델·브라우저 정보를 표시합니다. 상세 모델이 없거나 표시가 다르면 직접 입력한 정보를 연결할 때 저장할 수 있습니다.</p>
  </details>;
  return <div className={embedded ? "site-stack-group" : "site-stack-group site-content-divider"}>
    <ActionFeedbackToast message={state.message} tone={state.status === "success" ? "success" : "error"} eventKey={state} />
    <p className="type-body-sm site-copy-muted">{enableRequest ? `설정 저장 시 이 기기를 연결하고 ${enableRequest.feature === "orders" ? "주문" : "호출"}을 켭니다. ` : "사용할 기기에서 연결해 주세요. "}연결하면 이 브라우저의 관리자 로그인이 종료되고 손님용 메뉴판이 자동으로 열립니다.{!enableRequest ? " 주문·호출 허용은 별도로 관리됩니다." : ""}</p>
    <TableTerminalConnections menuSiteId={menuSiteId} table={point} connections={setup.connections.filter(connection => connection.tableId === point.id)}
      available={setup.connectionsAvailable} currentTableId={setup.currentTableId} currentKnown={setup.connectionStatusAvailable}
      published={published} enableRequest={enableRequest} device={device} pending={pending} action={action} deviceEditor={editor}
      refreshing={refreshing} onRefresh={() => refresh(() => router.refresh())} />
  </div>;
}
