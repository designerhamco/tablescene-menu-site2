import { ShoppingBag } from "@/app/components/ui/site-icon";
import { SITE_COPY_RULES } from "@/lib/site-copy-policy";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Button } from "@/app/components/ui/button";
import InfoTooltip from "@/components/ui/InfoTooltip";
import styles from "./SiteComponentGallery.module.css";

export default function SiteCopyRules() {
  return <section id="site-copy-rules" className={styles.section}>
    <div className={styles.heading}><h2 className="type-section-title">설명은 필요한 순간에</h2></div>
    <div className={styles.usageTable}><table aria-label="설명과 도움말 기준"><thead><tr><th>역할</th><th>규칙</th></tr></thead><tbody>{SITE_COPY_RULES.map(item => <tr key={item.role}><th scope="row">{item.role}</th><td>{item.rule}</td></tr>)}</tbody></table></div>
    <div className="site-card-grid">
      <ContentPanel><h3 className="type-content-title">제목·동작만으로 이해되는 경우</h3><div className="site-action-row"><h4 className="type-item-title">메뉴판 관리</h4><Button variant="outline" type="button">메뉴판 추가</Button></div></ContentPanel>
      <ContentPanel><h3 className="type-content-title">조건이 필요한 경우</h3><div className="site-action-row"><h4 className="type-item-title">주문 허용</h4><InfoTooltip label="주문 허용 안내"><p>전체 주문이 켜져 있을 때 기기별 허용이 적용됩니다.</p></InfoTooltip></div></ContentPanel>
      <ContentPanel><h3 className="type-content-title">계속 보여야 하는 정보</h3><EmptyState icon={<ShoppingBag />} headingLevel={4} title="표시할 주문 내역이 없습니다." /><p className="type-caption site-copy-muted">전체 주문 0건</p><p className="type-body-sm">유지하기로 한 박스 안 설명과 사용자가 요청한 안내는 유지합니다. 삭제한 설명은 다시 넣지 않습니다.</p></ContentPanel>
    </div>
  </section>;
}
