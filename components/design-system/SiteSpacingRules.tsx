import { SITE_MOBILE_MAX_WIDTH, SITE_MOBILE_SPACING } from "@/lib/site-spacing";
import styles from "./SiteComponentGallery.module.css";

export default function SiteSpacingRules() {
  return <section className={styles.section} id="mobile-spacing">
    <div className={styles.heading}>
      <h2 className="type-section-title">모바일 간격과 여백</h2>
      <p className="type-body text-zinc-600">{SITE_MOBILE_MAX_WIDTH}px 이하에서 같은 역할은 같은 간격을 사용합니다. 안쪽 여백과 바깥 간격을 중복으로 더하지 않습니다.</p>
    </div>
    <div className={styles.usageTable}><table aria-label="모바일 공통 간격"><thead><tr><th>역할</th><th>간격</th><th>사용 위치</th><th>공통 토큰</th></tr></thead><tbody>
      {SITE_MOBILE_SPACING.map(item => <tr key={item.token}><td>{item.label}</td><td>{item.rem * 16}px</td><td>{item.usage}</td><td><code>{item.token}</code></td></tr>)}
    </tbody></table></div>
    <p className="type-body-sm text-zinc-600">SitePage가 제목 위40px·제목과 설명12px·첫 콘텐츠32px를 자동 적용합니다. 본문은 site-stack-copy/block/group/content/section으로 구성합니다. 모바일 푸터는 위32px·좌우24px, 소개에서 접이식 메뉴까지32px입니다. 태블릿·PC와 고객 메뉴판의 간격은 각각의 기존 계약을 유지합니다.</p>
  </section>;
}
