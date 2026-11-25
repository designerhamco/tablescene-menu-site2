import Link from "next/link";
import { Globe, LayoutGrid, ShoppingBag, Bell } from "@/app/components/ui/site-icon";
import { ArrowRight } from "@/app/components/ui/site-arrow";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { OverviewCard, OverviewCardGroup, OverviewCardResponsiveLabel } from "@/app/components/ui/overview-card";
import InfoTooltip from "@/components/ui/InfoTooltip";
import OperationMenuTarget from "./OperationMenuTarget";
import OperationFeatureToggle from "./OperationFeatureToggle";
import { operationMenuTargets } from "@/lib/operation-menu-targets";
import { operationOverviewReception, summarizeOperationOverviews, type OperationSiteOverview } from "@/lib/operation-overview";

function Reception({ overview, feature }: { overview: OperationSiteOverview; feature: "orders" | "calls" }) {
  const { site, status } = overview;
  const label = feature === "orders" ? "주문" : "호출";
  const state = operationOverviewReception(status, feature);
  const flag = feature === "orders" ? status.settings?.orderEnabled : status.settings?.callEnabled;
  const settings = operationMenuTargets([site], feature === "orders" ? "order-settings" : "call-settings")[0];
  return <div className="site-stack-copy">
    <div className="site-action-row">
      <span className="type-label">{label}</span>
      <Badge>{state.value}</Badge>
      <InfoTooltip label={`${site.name || "이름 없는 메뉴판"} ${label} 상태 안내`}>{state.detail}</InfoTooltip>
      {status.canConfigure && typeof flag === "boolean" ? <OperationFeatureToggle menuId={site.menuSiteId} menuName={site.name || "이름 없는 메뉴판"} feature={feature} enabled={flag}
        published={status.published} canEnable={status.runtime[feature]} activeTablesReady={status.activeTablesReady}
        blockedReason={state.next !== "manage" ? state.detail : null} showReasonHelp={false}/> : null}
    </div>
    {settings ? <div className="site-action-row"><Button variant="outline" size="compact" asChild><Link href={settings.href} aria-label={`${site.name || "이름 없는 메뉴판"} ${label} 설정`}>{label} 설정<ArrowRight aria-hidden="true"/></Link></Button></div> : null}
  </div>;
}

/** Uses the same four overview cards and order as the individual dashboard. */
export default function AllMenuStatusOverview({ overviews, activity = {} }: { overviews: OperationSiteOverview[]; activity?: { orders?: number | null; calls?: number | null } }) {
  const summary = summarizeOperationOverviews(overviews), sites = overviews.map(item => item.site);
  const publication = operationMenuTargets(sites, "publication"), tables = operationMenuTargets(sites, "tables");
  return <section className="site-stack-block" aria-label="주문·호출 사용 여부">
    <div className="site-action-row"><h3 className="type-subsection-title">주문·호출 사용 여부</h3><InfoTooltip label="전체 메뉴판 운영 안내"><p>요약은 조회 권한이 있는 메뉴판을 기준으로 집계합니다. 아래에서 메뉴판별 상태와 설정을 확인할 수 있습니다.</p><p>공개·등록·주문·호출 설정은 메뉴판별로 적용됩니다.</p></InfoTooltip></div>
    <OverviewCardGroup label="매장 운영 요약">
      <OverviewCard label="메뉴판 공개 상태" icon={<Globe/>} value={summary.total ? `공개 ${summary.published}개` : "대상 없음"}
        detail={summary.total ? `비공개 ${summary.total - summary.published}개 · 전체 ${summary.total}개` : "운영 가능한 베이직·다이닝 메뉴판이 없습니다."}
        footer={publication.length ? <OperationMenuTarget label="메뉴판 공개 설정" items={publication}><OverviewCardResponsiveLabel compact="공개 설정">메뉴판 공개 설정</OverviewCardResponsiveLabel><ArrowRight aria-hidden="true"/></OperationMenuTarget> : summary.total ? <p className="type-footnote site-copy-muted">공개 설정은 사장님에게 요청해 주세요.</p> : undefined}/>
      <OverviewCard label="테이블·키오스크 등록" icon={<LayoutGrid/>}
        value={!summary.total ? "대상 없음" : summary.knownTableSources ? summary.tables + summary.kiosks ? `등록 ${(summary.tables + summary.kiosks).toLocaleString("ko-KR")}개` : "미등록" : "확인 불가"}
        detail={!summary.total ? "운영 가능한 베이직·다이닝 메뉴판이 없습니다." : summary.knownTableSources ? <><span className="block">테이블 {summary.tables}개 · 키오스크 {summary.kiosks}개</span><span className="block">조회 가능한 메뉴판 {summary.knownTableSources}개 기준{summary.tableSources > summary.knownTableSources ? ` · 조회 실패 ${summary.tableSources - summary.knownTableSources}개` : ""}</span></> : summary.tableSources ? "등록 정보를 불러오지 못했습니다." : "테이블·키오스크 관리 권한이 필요합니다."}
        footer={tables.length ? <OperationMenuTarget label="테이블·키오스크 관리" items={tables}><OverviewCardResponsiveLabel compact="등록 관리">테이블·키오스크 관리</OverviewCardResponsiveLabel><ArrowRight aria-hidden="true"/></OperationMenuTarget> : summary.total ? <p className="type-footnote site-copy-muted">등록 설정은 사장님에게 요청해 주세요.</p> : undefined}/>
      {(["orders", "calls"] as const).map(feature => {
        const label = feature === "orders" ? "주문" : "호출", unknown = feature === "orders" ? summary.unknownOrders : summary.unknownCalls;
        const targets = operationMenuTargets(sites, feature === "orders" ? "order-settings" : "call-settings");
        const canRead = overviews.some(item => item.status.permissions[feature]);
        const canManage = overviews.some(item => item.status.historyAccess[feature]);
        return <OverviewCard key={feature} label={`전체 ${label} 상태`} icon={feature === "orders" ? <ShoppingBag/> : <Bell/>}
          value={!summary.total ? "대상 없음" : canRead ? `${summary[feature]}개 접수 중` : "확인 불가"}
          detail={!summary.total ? "운영 가능한 베이직·다이닝 메뉴판이 없습니다." : <><span className="block">{activity[feature] === null ? `${feature === "orders" ? "진행 중 주문" : "대기 중 호출"} 확인 불가` : typeof activity[feature] === "number" ? `${feature === "orders" ? "진행 중 주문" : "대기 중 호출"} ${activity[feature]}건` : `${label} 기능 연결 후 내역을 확인할 수 있습니다.`}</span>{unknown ? <span className="block">상태 확인 필요 {unknown}개</span> : null}</>}
          footer={canManage || targets.length ? <>{canManage ? <Button variant="outline" asChild><Link href={`/mypage/operations/${feature}`}>{label} 관리<ArrowRight aria-hidden="true"/></Link></Button> : null}{targets.length ? <OperationMenuTarget label={`${label} 설정`} items={targets}/> : null}</> : undefined}/>;
      })}
    </OverviewCardGroup>
    <ContentPanel as="section">
      <h3 className="type-content-title">메뉴판별 상태·설정</h3>
      {overviews.length ? <ul className="site-stack-block">{overviews.map(overview => <li key={overview.site.menuSiteId} className="site-stack-block site-content-divider">
        <div className="site-content-heading-row">
          <div className="site-stack-copy"><p className="type-item-title break-words">{overview.site.name || "이름 없는 메뉴판"}</p><div className="site-action-row"><Badge>{overview.status.published ? "공개 중" : "비공개"}</Badge>{overview.status.tableCounts && overview.status.kioskCounts ? <span className="type-body-sm site-copy-muted">테이블 {overview.status.tableCounts.registered}개 · 키오스크 {overview.status.kioskCounts.registered}개</span> : null}</div></div>
          <Button variant="outline" asChild><Link href={`/mypage/operations?site=${encodeURIComponent(overview.site.menuSiteId)}`}>개별 운영</Link></Button>
        </div>
        <div className="site-form-row"><Reception overview={overview} feature="orders"/><Reception overview={overview} feature="calls"/></div>
      </li>)}</ul> : <p role="status" className="type-body-sm site-copy-muted">운영 가능한 베이직·다이닝 메뉴판이 없습니다.</p>}
    </ContentPanel>
  </section>;
}
