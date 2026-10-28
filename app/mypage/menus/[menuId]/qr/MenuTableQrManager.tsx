"use client";

import { useActionState } from "react";
import { QrCode } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import QrAddressActions from "@/components/mypage/QrAddressActions";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { MenuTableListItem } from "@/lib/menu-table-management";
import { initialMenuTableActionState } from "../tables/action-state";
import { mutateMenuTableAction } from "../tables/actions";

export default function MenuTableQrManager({ menuSiteId, menuSlug, publicBaseUrl, tables }: {
  menuSiteId: string; menuSlug: string; publicBaseUrl: string | null; tables: MenuTableListItem[];
}) {
  const [state, action, pending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);
  return <section className="space-y-4">
    <ActionFeedbackToast message={state.message} tone={state.status === "success" ? "success" : "error"} eventKey={state} />
    <div><h3 className="type-subsection-title">테이블별 QR</h3><p className="type-body-sm mt-2 text-zinc-500">테이블 관리에서 등록한 같은 테이블을 사용합니다. 활성 테이블의 QR을 다운로드해 각 좌석에 놓아 주세요.</p></div>
    {state.message ? <p role="status" className="site-notice p-4">{state.message}</p> : null}
    {tables.length === 0 ? <EmptyState headingLevel={4} icon={<QrCode />} title="등록된 테이블이 없습니다." description="테이블 관리에서 테이블을 먼저 등록해 주세요." /> : tables.map(table => <article key={table.id} className="site-section p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3"><div><h4 className="type-content-title">{table.label}</h4><p className="type-footnote mt-1 text-zinc-500">마지막 QR 교체 {formatKoreanDateTime(table.tokenRotatedAt)}</p></div><Badge>{table.status === "active" ? "사용 중" : "비활성"}</Badge></div>
      <QrAddressActions copyKey={table.id} feedbackLabel={table.label} fileName={`arti-menu-${menuSlug}-${table.label.replace(/[^0-9A-Za-z가-힣_-]+/g, "-")}-qr.png`} path={table.qrPath} publicBaseUrl={publicBaseUrl} disabled={table.status !== "active"} disabledReason="테이블 관리에서 활성화한 뒤 QR을 사용할 수 있습니다." />
      {table.status === "active" ? <a className="site-button site-button-secondary mt-4" href={table.qrPath + "?mode=terminal"} target="_blank" rel="noopener noreferrer">매장 PC·태블릿에서 열기</a> : null}
      <form action={action} className="mt-4 border-t border-zinc-100 pt-4">
        <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={table.id} />
        <button name="intent" value="rotate-token" disabled={pending} className="site-button site-button-outline">QR 교체</button>
        <p className="type-footnote mt-2 text-zinc-500">교체하면 이전에 인쇄한 QR과 방문 세션은 즉시 무효화됩니다.</p>
      </form>
    </article>)}
  </section>;
}
