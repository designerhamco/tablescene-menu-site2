"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { InlineNameEditor } from "@/app/components/ui/inline-name-editor";
import { Switch } from "@/app/components/ui/switch";
import { TableCell, TableRow } from "@/app/components/ui/table";
import { initialMenuTableActionState } from "@/app/mypage/menus/[menuId]/tables/action-state";
import { mutateMenuTableAction, updateOrderPointStatus } from "@/app/mypage/menus/[menuId]/tables/actions";
import type { MenuTableListItem } from "@/lib/menu-table-management";
import { formatTerminalDevice } from "@/lib/terminal-device-info";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import InfoTooltip from "@/components/ui/InfoTooltip";
import DeleteOrderPoint from "./DeleteOrderPoint";
import type { OrderPointConnectionState } from "./OrderPointConnectionSummary";

type ManagedPoint = Pick<MenuTableListItem, "id" | "label" | "status" | "kind">;

export default function OrderPointTableRow({ menuSiteId, point, roomName, roomAvailable = true, connectionState, canDelete, disabled, archiveAction }: {
  menuSiteId: string; point: ManagedPoint; roomName?: string; roomAvailable?: boolean; connectionState?: OrderPointConnectionState; canDelete: boolean; disabled: boolean;
  archiveAction: (data: FormData) => void;
}) {
  const [editPending, setEditPending] = useState(false);
  const [editState, setEditState] = useState(initialMenuTableActionState);
  const [statusPending, changeStatus] = useTransition();
  const [statusResult, setStatusResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const id = useId(), kiosk = point.kind === "kiosk";
  const noun = kiosk ? "키오스크" : "테이블";
  const busy = disabled || statusPending || editPending;
  const available = Boolean(connectionState?.available);
  const devices = available ? connectionState!.connections.filter(item => item.tableId === point.id) : [];
  const connected = devices.length > 0;
  const connectionLabel = !available ? "확인 불가" : connected ? `기기 연결됨${devices.length > 1 ? ` · ${devices.length}대` : ""}` : kiosk ? "연결 필요" : "미사용";

  return <TableRow>
    <TableCell nowrap>{noun}</TableCell>
    <TableCell primary>
      <ActionFeedbackToast message={editState.message} tone={editState.status === "success" ? "success" : "error"} eventKey={editState} />
      <ActionFeedbackToast message={statusResult?.message} tone={statusResult?.status === "success" ? "success" : "error"} eventKey={statusResult} />
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
    <TableCell nowrap>
      <div className="site-action-row" data-wrap="nowrap">
        <label htmlFor={id} className="type-label" aria-live="polite">{statusPending ? "저장 중…" : point.status === "active" ? "사용 중" : "일시정지"}</label>
        <Switch id={id} checked={point.status === "active"} loading={statusPending} disabled={busy} aria-label={`${point.label} 사용`} onCheckedChange={checked => changeStatus(async () => {
          setStatusResult(null);
          try { setStatusResult(await updateOrderPointStatus({ menuSiteId, tableId: point.id, status: checked ? "active" : "disabled", expectedStatus: point.status })); }
          catch { setStatusResult({ status: "error", message: "상태를 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요." }); }
        })} />
      </div>
    </TableCell>
    <TableCell>
      <div className="site-action-row">
        <InfoTooltip label={`${point.label} 기기 연결 안내`}>
          {!available ? <p>연결 정보를 불러오지 못했습니다. 기기별 설정에서 다시 확인해 주세요.</p>
            : connected ? <ul className="site-stack-copy">{devices.map((item, index) => <li key={index}>{item.device ? formatTerminalDevice(item.device) : "기기 정보가 없는 이전 연결입니다."}</li>)}</ul>
              : <p>{kiosk ? "키오스크로 주문을 받으려면 이 번호에 사용할 기기를 연결해 주세요. 손님마다 다시 연결할 필요는 없습니다." : "손님 휴대폰·QR 주문은 기기를 연결하지 않아도 됩니다. 테이블에 비치한 태블릿으로 주문을 받으려면 해당 태블릿에서 연결해 주세요."}</p>}
        </InfoTooltip>
        <span className="type-label">{connectionLabel}</span>
        <Link className="site-button site-button-outline site-button-compact" aria-label={`${point.label} ${!available ? "연결 확인" : connected ? "연결 관리" : "연결하기"}`} href={`/mypage/menus/${menuSiteId}/orders/settings?tab=devices#point-${point.id}`}>{!available ? "연결 확인" : connected ? "연결 관리" : "연결하기"}</Link>
      </div>
    </TableCell>
    <TableCell nowrap>
      <div className="site-action-row" data-wrap="nowrap">
        <form action={archiveAction} aria-busy={disabled}>
          <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} />
          <button name="intent" value="archive" disabled={busy} aria-label={`${point.label} 미사용(보관)`} className="site-button site-button-outline site-button-compact">보관</button>
        </form>
        {canDelete ? <DeleteOrderPoint menuSiteId={menuSiteId} point={point} disabled={busy} compact /> : null}
      </div>
    </TableCell>
  </TableRow>;
}
