import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { OverviewCard, OverviewCardResponsiveLabel, OverviewCardGroup } from "@/app/components/ui/overview-card";
import { Button } from "@/app/components/ui/button";
import { getOperationReceptionState } from "@/lib/operation-reception-state";
import OperationFeatureToggle from "./OperationFeatureToggle";

export type OperationStatusCardsProps = {
  menuId: string;
  published: boolean;
  canPublish: boolean;
  canConfigure: boolean;
  permissions: { orders: boolean; calls: boolean; tables: boolean; edit: boolean };
  historyAccess: { orders: boolean; calls: boolean };
  settings: { orderEnabled: boolean | null; callEnabled: boolean | null } | null;
  runtime: { orders: boolean; calls: boolean; tables: boolean };
  activeTablesReady: boolean | null;
  tableCounts: { registered: number; active: number; disabled: number } | null;
  kioskCounts?: { registered: number; active: number } | null;
};

export default function OperationStatusCards(props: OperationStatusCardsProps) {
  const { menuId, published, canPublish, canConfigure, permissions, historyAccess, settings, runtime, activeTablesReady, tableCounts } = props;
  const editHref = `/mypage/menus/${menuId}/edit`;
  const tablesHref = `/mypage/menus/${menuId}/tables`;
  const publicAction = permissions.edit || canPublish
    ? <Button variant="outline" asChild><Link href={`${editHref}?tab=publish`} aria-label="메뉴판 공개 설정"><OverviewCardResponsiveLabel compact="공개 설정">메뉴판 공개 설정</OverviewCardResponsiveLabel><ArrowRight aria-hidden="true" /></Link></Button> : null;

  return <OverviewCardGroup label="매장 운영 요약">
    <OverviewCard label="메뉴판 공개 상태"
      value={published ? "공개 중" : "비공개"}
      detail={published ? "손님이 메뉴판을 볼 수 있습니다." : "메뉴판을 공개하면 주문·호출을 켤 수 있습니다."}
      footer={publicAction ?? <p className="type-footnote site-copy-muted">공개 설정은 사장님에게 요청해 주세요.</p>} />
    <OverviewCard label="테이블·키오스크 상태"
      value={tableCounts ? tableCounts.registered + (props.kioskCounts?.registered ?? 0) === 0 ? "미등록" : `사용 중 ${(tableCounts.active + (props.kioskCounts?.active ?? 0)).toLocaleString("ko-KR")}개` : permissions.tables ? "상태 확인 불가" : "확인 불가"}
      detail={tableCounts ? `테이블 ${tableCounts.registered.toLocaleString("ko-KR")}개 · 키오스크 ${(props.kioskCounts?.registered ?? 0).toLocaleString("ko-KR")}개` : permissions.tables ? "테이블 정보를 불러오지 못했습니다." : "테이블 관리 권한이 필요합니다."}
      footer={permissions.tables ? <div className="site-action-row"><Button variant="outline" asChild><Link href={tablesHref} aria-label="테이블·키오스크 관리"><OverviewCardResponsiveLabel compact="테이블 관리">테이블·키오스크 관리</OverviewCardResponsiveLabel><ArrowRight aria-hidden="true" /></Link></Button></div> : <p className="type-footnote site-copy-muted">테이블 설정은 사장님에게 요청해 주세요.</p>} />
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
      const action = canConfigure
        ? <Button variant="outline" asChild><Link href={`/mypage/menus/${menuId}/${feature}/settings`}>{label} 설정<ArrowRight aria-hidden="true" /></Link></Button>
        : target ? <Button variant="outline" asChild><Link href={target.href}>{target.label}<ArrowRight aria-hidden="true" /></Link></Button> : null;
      return <OverviewCard key={feature}
        label={`전체 ${label} 상태`} value={<OverviewCardResponsiveLabel compact={state.value.startsWith(`${label} `) ? state.value.slice(label.length + 1) : state.value}>{state.value}</OverviewCardResponsiveLabel>} help={state.detail}
        control={canConfigure && typeof flag === "boolean" ? <OperationFeatureToggle menuId={menuId} feature={feature} enabled={flag}
          published={published} canEnable={runtime[feature]} activeTablesReady={activeTablesReady}
          blockedReason={state.next !== "manage" ? state.detail : null} reasonVisible={false} showStateLabel={false} />
          : undefined}
        footer={action} />;
    })}

  </OverviewCardGroup>;
}
