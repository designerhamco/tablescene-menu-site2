import { SITE_CONTENT_COMPOSITION, SITE_MOBILE_MAX_WIDTH, SITE_MOBILE_SPACING } from "@/lib/site-spacing";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Button } from "@/app/components/ui/button";
import styles from "./SiteComponentGallery.module.css";

export default function SiteSpacingRules() {
  return <><section className={styles.section} id="content-composition">
    <div className={styles.heading}>
      <h2 className="type-section-title">박스·폼·간격·정렬</h2>
      <p className="type-body site-copy-muted">공식 사이트의 작업 영역은 같은 구성 규칙을 사용합니다. 외곽 여백, 박스 안쪽, 제목과 설명, 입력과 버튼 간격을 서로 다른 역할로 정하고 한 곳에서 관리합니다.</p>
    </div>
    <div className={styles.usageTable}><table aria-label="작업 영역 구성 기준"><thead><tr><th>역할</th><th>모바일 / 768px 이상</th><th>공통 구현</th><th>사용 위치</th></tr></thead><tbody>
      {SITE_CONTENT_COMPOSITION.map(item => <tr key={item.role}><td>{item.role}</td><td>{item.mobile} / {item.wide}px</td><td><code>{item.owner}</code></td><td>{item.usage}</td></tr>)}
    </tbody></table></div>
    <div className="site-management-scope site-stack-group" data-layout-example="composition">
      <ContentPanel aria-label="작업 박스 예시">
        <div className="site-stack-title"><h3 className="type-subsection-title">테이블 설정</h3><p className="type-body-sm site-copy-muted">제목과 설명은 12px, 이 제목 묶음과 폼은 24px로 구분합니다.</p></div>
        <div className="site-form-row">
          <label className="site-field-stack type-label">테이블 이름<input className="site-field" placeholder="예: 창가 테이블" /></label>
          <div className="site-action-row"><Button type="button">저장 예시</Button><Button type="button" variant="outline">취소 예시</Button></div>
        </div>
      </ContentPanel>
      <ContentPanel surface="muted" aria-label="회색 작업 박스 예시"><div className="site-stack-title"><h3 className="type-content-title">회색 보조 영역</h3><p className="type-body-sm site-copy-muted">테두리와 그림자 없이 같은 안쪽 여백을 사용합니다. 버튼은 문구 너비를 따릅니다.</p></div><div className="site-action-row"><Button variant="outline">보조 실행 예시</Button></div></ContentPanel>
      <ContentPanel surface="notice" density="compact" as="aside" aria-label="안내 박스 예시"><div className="site-stack-title"><h3 className="type-content-title">다음 행동을 알려주는 안내</h3><p className="type-body-sm site-copy-muted">밝은 노랑·무테·6px 모서리, 안쪽 16px입니다. 일반 작업 박스의 12px 모서리와 역할을 구분합니다.</p></div></ContentPanel>
    </div>
    <p className="type-body-sm site-copy-muted">관리 화면은 시작 정렬, 입력과 실행은 넓으면 하단 정렬하고 640px 미만에서는 기존 순서대로 쌓습니다. 제목 20px/700, 콘텐츠 제목 18px/600, 보조 설명 14px/400, 라벨 14px/600, 입력 16px/400입니다. 공통 버튼·입력의 자체 높이와 포커스는 유지합니다.</p>
  </section><section className={styles.section} id="mobile-spacing">
    <div className={styles.heading}>
      <h2 className="type-section-title">모바일 간격과 여백</h2>
      <p className="type-body text-zinc-600">{SITE_MOBILE_MAX_WIDTH}px 이하에서 같은 역할은 같은 간격을 사용합니다. 안쪽 여백과 바깥 간격을 중복으로 더하지 않습니다.</p>
    </div>
    <div className={styles.usageTable}><table aria-label="모바일 공통 간격"><thead><tr><th>역할</th><th>간격</th><th>사용 위치</th><th>공통 토큰</th></tr></thead><tbody>
      {SITE_MOBILE_SPACING.map(item => <tr key={item.token}><td>{item.label}</td><td>{item.rem * 16}px</td><td>{item.usage}</td><td><code>{item.token}</code></td></tr>)}
    </tbody></table></div>
    <p className="type-body-sm text-zinc-600">SitePage가 제목 위40px·제목과 설명12px·첫 콘텐츠32px를 자동 적용합니다. 본문은 site-stack-copy/block/group/content/section으로 구성합니다. 모바일 푸터는 위32px·좌우24px, 소개에서 접이식 메뉴까지32px입니다. 태블릿·PC와 고객 메뉴판의 간격은 각각의 기존 계약을 유지합니다.</p>
  </section></>;
}
