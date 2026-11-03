"use client";

import { useActionState } from "react";
import { QrCode } from "lucide-react";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Badge } from "@/app/components/ui/badge";
import { EmptyState } from "@/app/components/ui/empty-state";
import QrAddressActions from "@/components/mypage/QrAddressActions";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { formatKoreanDateTime } from "@/lib/korean-date-time";
import type { MenuTableListItem } from "@/lib/menu-table-management";
import { initialMenuTableActionState } from "../tables/action-state";
import { mutateMenuTableAction } from "../tables/actions";
import Link from "next/link";

export default function MenuTableQrManager({ menuSiteId, menuSlug, publicBaseUrl, tables, canConnectDevices = false }: {
  menuSiteId: string; menuSlug: string; publicBaseUrl: string | null; tables: MenuTableListItem[]; canConnectDevices?: boolean;
}) {
  const [state, action, pending] = useActionState(mutateMenuTableAction, initialMenuTableActionState);
  return <section className="site-stack-group">
    <ActionFeedbackToast message={state.message} tone={state.status === "success" ? "success" : "error"} eventKey={state} />
    <div className="site-stack-title"><h3 className="type-subsection-title">테이블별 QR</h3><p className="type-body-sm site-copy-muted">테이블 관리에서 등록한 같은 테이블을 사용합니다. 활성 테이블의 QR을 다운로드해 각 좌석에 놓아 주세요.</p></div>
    {state.message ? <ContentPanel as="aside" surface="notice" density="compact"><p role="status" className="type-body-sm">{state.message}</p></ContentPanel> : null}
    {tables.length === 0 ? <EmptyState headingLevel={4} icon={<QrCode />} title="등록된 테이블이 없습니다." description="테이블 관리에서 테이블을 먼저 등록해 주세요." /> : tables.map(table => <ContentPanel as="article" id={`table-${table.id}`} key={table.id}>
      <div className="site-content-heading-row"><div className="site-stack-copy"><h4 className="type-content-title">{table.label}</h4><p className="type-caption site-copy-muted">마지막 QR 교체 {formatKoreanDateTime(table.tokenRotatedAt)}</p></div><Badge>{table.status === "active" ? "사용 중" : "비활성"}</Badge></div>
      <QrAddressActions copyKey={table.id} feedbackLabel={table.label} fileName={`arti-menu-${menuSlug}-${table.label.replace(/[^0-9A-Za-z가-힣_-]+/g, "-")}-qr.png`} path={table.qrPath} publicBaseUrl={publicBaseUrl} disabled={table.status !== "active"} disabledReason="테이블 관리에서 활성화한 뒤 QR을 사용할 수 있습니다." />
      {canConnectDevices && table.status === "active" ? <div className="site-action-row"><Link className="site-button site-button-outline" href={`/mypage/menus/${menuSiteId}/orders/settings?tab=devices#point-${table.id}`}>태블릿 연결 설정</Link></div> : null}
      <form action={action} className="site-stack-block site-content-divider">
        <input type="hidden" name="menuSiteId" value={menuSiteId} /><input type="hidden" name="tableId" value={table.id} />
        <button name="intent" value="rotate-token" disabled={pending} className="site-button site-button-outline">QR 교체</button>
        <p className="type-footnote site-copy-muted">교체하면 이전에 인쇄한 QR과 방문 세션은 즉시 무효화됩니다.</p>
      </form>
    </ContentPanel>)}
  </section>;
}
