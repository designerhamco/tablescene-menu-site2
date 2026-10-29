import styles from "./SiteComponentGallery.module.css";

export default function SiteSystemRules() {
  return <section className={styles.section} id="site-system-enforcement">
    <div className={styles.heading}><h2 className="type-section-title">새 페이지의 기본값과 자동 검사</h2><p className="type-body text-zinc-600">새 일반 페이지는 SitePage로 시작합니다. 제목·설명·첫 콘텐츠 간격과 헤더·푸터를 상속하며, 페이지별 스타일을 다시 만들지 않습니다.</p></div>
    <div className={styles.usageTable}><table aria-label="공통 디자인 시스템 자동 적용"><thead><tr><th>역할</th><th>사용 방법</th><th>검사에서 차단하는 변경</th></tr></thead><tbody>
      <tr><td>페이지 제목과 간격</td><td>SitePage · SitePageHeader</td><td>별도 h1, 제목 바깥의 임의 여백·인라인 위치 보정</td></tr>
      <tr><td>탭</td><td>Tabs · NavigationTabs의 purpose와 size</td><td>페이지별 색·두께·높이·패딩·모서리 덮어쓰기</td></tr>
      <tr><td>버튼과 입력</td><td>Button · Input · Select의 variant와 size</td><td>개별 외형 재정의와 폐기된 크기·모양</td></tr>
      <tr><td>글자·색상·표면</td><td>의미 기반 type-*와 공통 토큰</td><td>임의 글자 크기와 지역별 공통 토큰 재정의</td></tr>
    </tbody></table></div>
    <p className="type-body-sm text-zinc-600">검사는 새 경로·컴포넌트·CSS를 자동으로 찾고 모든 Production 빌드 전에 실행합니다. 기존 특수 화면의 고정 기록은 새 페이지나 추가 예외에 재사용할 수 없습니다. 고객 메뉴판은 별도 시스템을 유지합니다.</p>
  </section>;
}
