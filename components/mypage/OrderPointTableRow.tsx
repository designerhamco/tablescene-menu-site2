"use client";

import Link from "next/link";
import { useActionState, useId, useState, useTransition } from "react";
import { Pencil } from "lucide-react";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/app/components/ui/dialog";
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

export default function OrderPointTableRow({ menuSiteId, point, connectionState, canDelete, disabled, archiveAction }: {
  menuSiteId: string; point: ManagedPoint; connectionState?: OrderPointConnectionState; canDelete: boolean; disabled: boolean;
  archiveAction: (data: FormData) => void;
}) {
  const [editOpen, setEditOpen] = useState(false), [name, setName] = useState(point.label);
  const [statusPending, changeStatus] = useTransition();
  const [statusResult, setStatusResult] = useState<{ status: "success" | "error"; message: string } | null>(null);
  const [editState, editAction, editPending] = useActionState(async (previous: typeof initialMenuTableActionState, data: FormData) => {
    const result = await mutateMenuTableAction(previous, data);
    if (result.status === "success") setEditOpen(false);
    return result;
  }, initialMenuTableActionState);
  const id = useId(), kiosk = point.kind === "kiosk";
  const noun = kiosk ? "키오스크" : "테이블";
  const busy = disabled || statusPending || editPending;
  const available = Boolean(connectionState?.available);
  const devices = available ? connectionState!.connections.filter(item => item.tableId === point.id) : [];
  const connected = devices.length > 0;
  const connectionLabel = !available ? "확인 불가" : connected ? `기기 연결됨${devices.length > 1 ? ` · ${devices.length}대` : ""}` : kiosk ? "연결 필요" : "미사용";

  return <TableRow>
    <TableCell data-column="kind">{noun}</TableCell>
    <TableCell data-column="name">
      <ActionFeedbackToast message={editState.message} tone={editState.status === "success" ? "success" : "error"} eventKey={editState} />
      <ActionFeedbackToast message={statusResult?.message} tone={statusResult?.status === "success" ? "success" : "error"} eventKey={statusResult} />
      <Dialog open={editOpen} onOpenChange={next => { if (!editPending) setEditOpen(next); }}>
        <DialogTrigger asChild><Button variant="link" size="compact" disabled={busy} aria-label={`${point.label} 이름 수정`}><span className="min-w-0 break-words">{point.label}</span><Pencil aria-hidden="true" /></Button></DialogTrigger>
        <DialogContent onEscapeKeyDown={event => { if (editPending) event.preventDefault(); }} onInteractOutside={event => { if (editPending) event.preventDefault(); }}>
          <DialogHeader reserveCloseButton><DialogTitle>{noun} 이름 수정</DialogTitle><DialogDescription>매장에서 알아보기 쉬운 번호 또는 이름을 입력해 주세요.</DialogDescription></DialogHeader>
          <form action={editAction} className="site-stack-group" aria-busy={editPending}>
            <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} />
            <label className="site-field-stack type-label">이름<input name="label" className="site-field w-full" required maxLength={80} value={name} onChange={event => setName(event.target.value)} disabled={editPending} /></label>
            <DialogFooter><Button type="button" variant="outline" disabled={editPending} onClick={() => setEditOpen(false)}>취소</Button><Button name="intent" value="rename" disabled={editPending}>{editPending ? "저장 중…" : "저장"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TableCell>
    <TableCell data-column="connection">
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
    <TableCell data-column="status">
      <div className="site-action-row">
        <label htmlFor={id} className="type-label" aria-live="polite">{statusPending ? "저장 중…" : point.status === "active" ? "사용 중" : "일시정지"}</label>
        <Switch id={id} checked={point.status === "active"} loading={statusPending} disabled={busy} aria-label={`${point.label} 사용`} onCheckedChange={checked => changeStatus(async () => {
          setStatusResult(null);
          try { setStatusResult(await updateOrderPointStatus({ menuSiteId, tableId: point.id, status: checked ? "active" : "disabled", expectedStatus: point.status })); }
          catch { setStatusResult({ status: "error", message: "상태를 저장하지 못했습니다. 연결을 확인하고 다시 시도해 주세요." }); }
        })} />
      </div>
    </TableCell>
    <TableCell data-column="actions">
      <div className="site-action-row">
        <form action={archiveAction} aria-busy={disabled}>
          <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={point.id} />
          <button name="intent" value="archive" disabled={busy} aria-label={`${point.label} 미사용(보관)`} className="site-button site-button-outline site-button-compact">보관</button>
        </form>
        {canDelete ? <DeleteOrderPoint menuSiteId={menuSiteId} point={point} disabled={busy} compact /> : null}
      </div>
    </TableCell>
  </TableRow>;
}
