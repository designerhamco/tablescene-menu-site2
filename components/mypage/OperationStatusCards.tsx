import Link from "next/link";
import { Bell, LayoutGrid, ShoppingBag } from "lucide-react";
import { MetricCard } from "@/app/components/ui/data-display";
import { Badge } from "@/app/components/ui/badge";
import { NewWindowIndicator } from "@/app/components/ui/new-window-indicator";
import { getOperationReceptionState } from "@/lib/operation-reception-state";
import OperationFeatureToggle from "./OperationFeatureToggle";
import OperationPublicationToggle from "./OperationPublicationToggle";

export type OperationStatusCardsProps = {
  menuId: string;
  published: boolean;
  publicUrl: string | null;
  canPublish: boolean;
  canConfigure: boolean;
  permissions: { orders: boolean; calls: boolean; tables: boolean; edit: boolean };
  historyAccess: { orders: boolean; calls: boolean };
  settings: { orderEnabled: boolean | null; callEnabled: boolean | null } | null;
  runtime: { orders: boolean; calls: boolean; tables: boolean };
  activeTablesReady: boolean | null;
  tableCounts: { registered: number; active: number; disabled: number } | null;
  kioskCounts?: { registered: number; active: number } | null;
  openOrders: number | null;
  pendingCalls: number | null;
};

export default function OperationStatusCards(props: OperationStatusCardsProps) {
  const { menuId, published, publicUrl, canPublish, canConfigure, permissions, historyAccess, settings, runtime, activeTablesReady, tableCounts } = props;
  const editHref = `/mypage/menus/${menuId}/edit`;
  const tablesHref = `/mypage/menus/${menuId}/tables`;
  const publicAction = published && publicUrl
    ? <Link href={publicUrl} target="_blank" rel="noopener noreferrer" className="site-button site-button-outline">메뉴판 열기<NewWindowIndicator /></Link>
    : permissions.edit ? <Link href={editHref} className="site-button site-button-outline">메뉴판 편집</Link> : null;

  return <section className="site-metric-grid" data-content="status" aria-label="매장 운영 요약">
    <MetricCard variant="status" surface="muted" icon={<LayoutGrid />} tone="green" label="메뉴판 공개 상태"
      value={published ? "공개 중" : "비공개"}
      detail={published ? "손님이 메뉴판을 볼 수 있습니다." : "메뉴판을 공개하면 주문·호출을 켤 수 있습니다."}
      footer={<OperationPublicationToggle menuId={menuId} published={published} canPublish={canPublish} action={publicAction} editHref={permissions.edit ? `${editHref}?tab=publish` : undefined} />} />
    {(["orders", "calls"] as const).map(feature => {
      const label = feature === "orders" ? "주문" : "호출";
      const flag = feature === "orders" ? settings?.orderEnabled : settings?.callEnabled;
      const state = getOperationReceptionState({ feature, published, enabled: flag === true,
        settingsKnown: typeof flag === "boolean", runtimeEnabled: runtime[feature], activeTablesReady,
        registeredTables: tableCounts ? tableCounts.registered + (props.kioskCounts?.registered ?? 0) : null, canRead: permissions[feature] });
      const target = state.next === "publish" && canPublish ? { href: `${editHref}?tab=publish`, label: "메뉴판 공개" }
        : state.next === "tables" && permissions.tables ? { href: tablesHref, label: "테이블 관리" }
          : historyAccess[feature] ? { href: `/mypage/menus/${menuId}/${feature}`, label: `${label} 관리` }
            : canConfigure ? { href: `/mypage/menus/${menuId}/${feature}/settings`, label: `${label} 설정` } : null;
      const action = target ? <Link href={target.href} className="site-button site-button-outline">{target.label}</Link> : null;
      const count = feature === "orders" ? props.openOrders : props.pendingCalls;
      return <MetricCard key={feature} variant="status" surface="muted" icon={feature === "orders" ? <ShoppingBag /> : <Bell />} tone={feature === "orders" ? "blue" : "brand"}
        label={`전체 ${label} 상태`} value={state.value} status={state.reason ? <Badge tone={state.reason === "조회 실패" ? "error" : "neutral"}>{state.reason}</Badge> : undefined}
        detail={<>{state.detail}{count !== null ? <><br />{feature === "orders" ? "진행 중 주문" : "대기 중 호출"} {count.toLocaleString("ko-KR")}건</> : null}</>}
        footer={canConfigure && typeof flag === "boolean" ? <OperationFeatureToggle menuId={menuId} feature={feature} enabled={flag}
          published={published} canEnable={runtime[feature]} activeTablesReady={activeTablesReady} action={action}
          blockedReason={state.next !== "manage" ? state.detail : null} reasonVisible={false} showStateLabel={false} />
          : <div className="site-action-row">{action}</div>} />;
    })}
    <MetricCard variant="status" surface="muted" icon={<LayoutGrid />} tone="green" label="테이블·키오스크 상태"
      value={tableCounts ? tableCounts.registered + (props.kioskCounts?.registered ?? 0) === 0 ? "미등록" : `사용 중 ${(tableCounts.active + (props.kioskCounts?.active ?? 0)).toLocaleString("ko-KR")}개` : permissions.tables ? "상태 확인 불가" : "확인 불가"}
      detail={tableCounts ? `테이블 ${tableCounts.registered.toLocaleString("ko-KR")}개 · 키오스크 ${(props.kioskCounts?.registered ?? 0).toLocaleString("ko-KR")}개` : permissions.tables ? "테이블 정보를 불러오지 못했습니다." : "테이블 관리 권한이 필요합니다."}
      footer={permissions.tables ? <div className="site-action-row"><Link href={tablesHref} className="site-button site-button-outline">테이블·키오스크 관리</Link></div> : <p className="type-footnote site-copy-muted">테이블 설정은 사장님에게 요청해 주세요.</p>} />
  </section>;
}
