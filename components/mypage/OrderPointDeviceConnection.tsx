"use client";

import type { OrderPointConnectRequest } from "@/lib/order-point-connection";
import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { mutateMenuTableAction } from "@/app/mypage/menus/[menuId]/tables/actions";
import { initialMenuTableActionState } from "@/app/mypage/menus/[menuId]/tables/action-state";
import type { OrderPointDeviceSettings } from "@/lib/terminal-device-info";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { useCurrentDeviceInfo } from "./useCurrentDeviceInfo";
import TableTerminalConnections from "./TableTerminalConnections";

export default function OrderPointDeviceConnection({ menuSiteId, point, published, setup, embedded = false, enableRequest, mutateAction = mutateMenuTableAction }: {
  menuSiteId: string; point: { id: string; label: string; status: string; kind?: "table" | "kiosk" };
  enableRequest?: OrderPointConnectRequest; published: boolean; setup: OrderPointDeviceSettings; embedded?: boolean; mutateAction?: typeof mutateMenuTableAction;
}) {
  const [requestApplied, setRequestApplied] = useState(false);
  const [state, action, pending] = useActionState(async (previous: typeof initialMenuTableActionState, data: FormData) => {
    const result = await mutateAction(previous, data);
    if (result.status === "success" && data.get("intent") === "register-terminal") setRequestApplied(true);
    return result;
  }, initialMenuTableActionState);
  const router = useRouter(), [refreshing, refresh] = useTransition();
  const { device, os, setOs, model, setModel } = useCurrentDeviceInfo(setup.currentDevice);
  const activeEnableRequest = requestApplied ? undefined : enableRequest;
  const editor = <details className="site-stack-block">
    <summary className="type-label">기기 정보 확인·수정</summary>
    <div className="site-form-row">
      <label className="site-field-stack type-label">운영체제 (선택)<input className="site-field w-full" value={os} disabled={pending} maxLength={100} onChange={event => setOs(event.target.value)} placeholder={device.os} /></label>
      <label className="site-field-stack type-label">모델명 (선택)<input className="site-field w-full" value={model} disabled={pending} maxLength={100} onChange={event => setModel(event.target.value)} placeholder="예: iPad Pro 11, SM-X900" /></label>
    </div>
    <p className="type-footnote site-copy-muted">브라우저의 실제 OS·모델·브라우저 정보를 표시합니다. 상세 모델이 없거나 표시가 다르면 직접 입력한 정보를 연결할 때 저장할 수 있습니다.</p>
  </details>;
  return <div className={embedded ? "site-stack-group" : "site-stack-group site-content-divider"}>
    <ActionFeedbackToast message={state.message} tone={state.status === "success" ? "success" : "error"} eventKey={state} />
    {activeEnableRequest || setup.currentTableId !== point.id ? <p className="type-body-sm site-copy-muted">{activeEnableRequest ? `설정 저장 시 이 기기를 연결하고 ${activeEnableRequest.feature === "orders" ? "주문" : "호출"}을 켭니다.` : "사용할 기기에서 연결해 주세요. 연결 후에도 관리자 화면이 유지됩니다."}</p> : null}
    {state.status === "success" ? <p className="type-body-sm" role="status">{state.message}</p> : null}
    <TableTerminalConnections menuSiteId={menuSiteId} table={point} connections={setup.connections.filter(connection => connection.tableId === point.id)}
      available={setup.connectionsAvailable} currentTableId={setup.currentTableId} currentKnown={setup.connectionStatusAvailable}
      published={published} showMenuOpen={!embedded} enableRequest={activeEnableRequest} device={device} pending={pending} action={action} deviceEditor={editor}
      refreshing={refreshing} onRefresh={() => refresh(() => router.refresh())} />
  </div>;
}
