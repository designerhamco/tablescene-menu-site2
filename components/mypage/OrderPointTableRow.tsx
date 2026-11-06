"use client";

import { useState } from "react";
import { InlineNameEditor } from "@/app/components/ui/inline-name-editor";
import { TableCell, TableRow } from "@/app/components/ui/table";
import { initialMenuTableActionState } from "@/app/mypage/menus/[menuId]/tables/action-state";
import { mutateMenuTableAction } from "@/app/mypage/menus/[menuId]/tables/actions";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import InfoTooltip from "@/components/ui/InfoTooltip";
import DeleteOrderPoint from "./DeleteOrderPoint";
import type { OrderPointFeatureUpdate } from "@/lib/order-point-policy";
import type { OrderPointConnectionState } from "./OrderPointConnectionSummary";
import { OrderPointArchiveControl, OrderPointConnectionControl, OrderPointFeatureControls, type ManagedOrderPoint } from "./OrderPointControls";

type ManagedPoint = ManagedOrderPoint;

export default function OrderPointTableRow({ menuSiteId, point, roomName, roomAvailable = true, connectionState, canDelete, disabled, archiveAction, readOnly = false, onUpdate, onConnect }: {
  menuSiteId: string; point: ManagedPoint; roomName?: string; roomAvailable?: boolean; connectionState?: OrderPointConnectionState; canDelete: boolean; disabled: boolean;
  archiveAction: (data: FormData) => void; readOnly?: boolean; onUpdate: OrderPointFeatureUpdate; onConnect: (id: string) => void;
}) {
  const [editPending, setEditPending] = useState(false);
  const [editState, setEditState] = useState(initialMenuTableActionState);
  const noun = point.kind === "kiosk" ? "키오스크" : "테이블";
  const busy = disabled || editPending;

  return <TableRow>
    <TableCell>{noun}</TableCell>
    <TableCell primary>
      <ActionFeedbackToast message={editState.message} tone={editState.status === "success" ? "success" : "error"} eventKey={editState} />
      <InlineNameEditor protectNavigation value={point.label} label={`${point.label} 이름 수정`} maxLength={80} disabled={busy} onSave={async name => {
        setEditPending(true);
        try {
          const data = new FormData(); data.set("menuSiteId", menuSiteId); data.set("tableId", point.id); data.set("intent", "rename"); data.set("label", name);
          const result = await mutateMenuTableAction(initialMenuTableActionState, data); setEditState(result);
          return result.status === "success" ? { status: "success", value: name } : { status: "error", message: result.message };
        } finally { setEditPending(false); }
      }} />
    </TableCell>
    <TableCell>
      {roomAvailable && roomName ? <span className="break-words">{roomName}</span> : <div className="site-action-row" data-wrap="nowrap"><span>{roomAvailable ? "미연동" : "확인 불가"}</span><InfoTooltip label={`${point.label} 룸 ${roomAvailable ? "미연동" : "정보"} 안내`}><p>{roomAvailable ? "배치도형에서 ‘룸 추가’로 공간을 만든 뒤, 이 테이블·키오스크를 선택해 배치하고 ‘배치도 저장’을 눌러 주세요. QR만 사용할 때는 룸 없이도 이용할 수 있습니다." : "배치도 정보를 불러오지 못했습니다. 페이지를 새로고침해 다시 확인해 주세요."}</p></InfoTooltip></div>}
    </TableCell>
    <TableCell><OrderPointFeatureControls menuSiteId={menuSiteId} point={point} feature="orders" onUpdate={onUpdate} readOnly={readOnly} disabled={busy} /></TableCell>
    <TableCell><OrderPointFeatureControls menuSiteId={menuSiteId} point={point} feature="calls" onUpdate={onUpdate} readOnly={readOnly} disabled={busy} /></TableCell>
    <TableCell><OrderPointConnectionControl point={point} state={connectionState} onConnect={onConnect} /></TableCell>
    <TableCell nowrap>
      <div className="site-action-row" data-wrap="nowrap">
        <OrderPointArchiveControl menuSiteId={menuSiteId} point={point} action={archiveAction} disabled={busy} />
        {canDelete ? <DeleteOrderPoint menuSiteId={menuSiteId} point={point} disabled={busy} compact /> : null}
      </div>
    </TableCell>
  </TableRow>;
}
