import { Bell, LayoutGrid } from "lucide-react";
import { EmptyState } from "@/app/components/ui/empty-state";
import { MetricCard } from "@/app/components/ui/data-display";
import styles from "./SiteComponentGallery.module.css";

export default function IndicatorSurfaceExamples() {
  return <section className={styles.section} aria-labelledby="indicator-surface-title">
    <div className={styles.heading}>
      <h2 id="indicator-surface-title" className="type-section-title">표시 아이콘과 주변 배경</h2>
      <p className="type-body text-zinc-600">아이콘 바로 뒤 영역을 기준으로 판단합니다. 흰색에서는 구분을 위한 옅은 바탕을 사용할 수 있고, 회색·유색에서는 별도 바탕 없이 아이콘만 표시합니다.</p>
    </div>
    <div className={styles.indicatorGrid}>
      {([
        ["white", "흰색 영역", "구분을 돕는 옅은 아이콘 바탕 유지", "white"],
        ["muted", "회색 영역", "주변 영역이 구분되므로 아이콘만 표시", "colored"],
        ["brand", "유색 영역", "흰 사각형·원형을 겹치지 않고 아이콘만 표시", "colored"],
      ] as const).map(([background, title, description, surface]) => <article key={background} className={styles.indicatorSurface} data-indicator-example={background}>
        <span className="site-metric-icon site-indicator-icon" data-icon-surface={surface} aria-hidden="true"><Bell /></span>
        <h3 className="type-content-title">{title}</h3>
        <p className="type-body-sm">{description}</p>
      </article>)}
    </div>
    <EmptyState icon={<LayoutGrid />} title="아직 등록된 테이블이 없습니다." description="회색 빈 상태 영역에서는 흰 아이콘 바탕을 추가하지 않습니다." />
    <div className={styles.heading}>
      <h3 className="type-content-title">회색 영역 안의 흰 카드</h3>
      <p className="type-body-sm text-zinc-600">페이지가 회색이어도 아이콘이 놓인 카드가 흰색이면 흰 영역 기준을 적용합니다. 아래 두 카드는 같은 현황 컴포넌트입니다.</p>
    </div>
    <div className={`site-dashboard ${styles.indicatorNested}`}>
      <MetricCard label="흰 카드의 현황" value="예시" icon={<LayoutGrid />} tone="green" />
      <MetricCard label="회색 카드의 현황" value="예시" icon={<LayoutGrid />} tone="green" surface="muted" />
    </div>
    <p className="type-footnote text-zinc-600">표시 아이콘의 배경 규칙입니다. 아이콘 버튼의 클릭 영역·포커스·hover, 알림의 읽지 않은 점, 아이콘 자체의 색상·크기와 로고는 각 역할을 유지합니다.</p>
  </section>;
}
