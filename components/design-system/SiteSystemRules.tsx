import SiteSpacingRules from "./SiteSpacingRules";
import MenuShapeRules from "./MenuShapeRules";
import styles from "./SiteComponentGallery.module.css";

export default function SiteSystemRules() {
  return <><SiteSpacingRules /><MenuShapeRules /><section className={styles.section} id="site-system-enforcement">
    <div className={styles.heading}><h2 className="type-section-title">새 페이지의 기본값과 자동 검사</h2><p className="type-body text-zinc-600">새 일반 페이지는 SitePage로 시작합니다. 제목·첫 콘텐츠 간격과 헤더·푸터를 상속하며, 페이지별 스타일을 다시 만들지 않습니다.</p></div>
    <div className={styles.usageTable}><table aria-label="공통 디자인 시스템 자동 적용"><thead><tr><th>역할</th><th>사용 방법</th><th>검사에서 차단하는 변경</th></tr></thead><tbody>
      <tr><td>공통 헤더</td><td>OfficialSiteNavbar · 처음 투명 · 스크롤24px 이후 흰색 · 다이닝 첫 화면은 흰색 글자</td><td>스크롤 시 로고·액션 숨김, 축소·글래스 형태 및 임의 배치 변경</td></tr>
      <tr><td>설명·도움말</td><td>제목만 기본 · 필요한 조건은 InfoTooltip · 소개 예외는 descriptionPurpose 명시</td><td>제목을 반복하는 설명, 사용자 요청·박스 설명·상태·데이터·필수 주의사항의 일괄 삭제</td></tr>
      <tr><td>페이지 제목과 간격</td><td>SitePage · SitePageHeader</td><td>별도 h1, 제목 바깥의 임의 여백·인라인 위치 보정</td></tr>
      <tr><td>탭</td><td>Tabs · NavigationTabs의 purpose와 size · 아이콘은 각 역할의 기본 크기</td><td>페이지별 색·두께·높이·패딩·모서리 덮어쓰기</td></tr>
      <tr><td>편집 연필</td><td>EditIcon · SVG16px · 클릭 영역은 공통 아이콘 크기와 분리</td><td>탭의 모든 아이콘을 일괄 축소하거나 아이콘 뒤에 임의 도형·패딩 추가</td></tr>
      <tr><td>아이콘 버튼</td><td>불필요한 장식 생략 · 식별 경계 유지 · 표현과 조작 영역 분리. bare/framed · 일반40px/밀집32px</td><td>배경 제거와 함께 클릭 영역·중앙 정렬 제거, 페이지별 크기·배경 덮어쓰기</td></tr>
      <tr><td>버튼과 입력</td><td>Button · Input · Select의 variant와 size · 모양이 다른 버튼 묶음 경계는 ButtonGroupDivider · 입력 옆 버튼은 공통 중앙 정렬 행 · 회색/비활성 실행 버튼은 기능적 경계 유지</td><td>개별 외형 재정의와 폐기된 크기·모양</td></tr>
      <tr><td>고객지원 액션 행</td><td>site-support-actions · 내용 너비 · 가운데 정렬 · 좁으면 줄바꿈</td><td>버튼 묶음을 카드용 균등 분할 그리드로 확장</td></tr>
      <tr><td>새 창 링크</td><td>NewWindowIndicator · 대각선 화살표 · 새 창 안내</td><td>같은 창 링크에 새 창 표시를 붙이거나 새 창 안내를 생략</td></tr>
      <tr><td>글자·색상·표면</td><td>의미 기반 type-* · 공통 굵기·행간·자간 토큰</td><td>임의 글자 크기와 지역별 공통 토큰 재정의</td></tr>
    </tbody></table></div>
    <p className="type-body-sm text-zinc-600">검사는 새 경로·컴포넌트·CSS를 자동으로 찾고 모든 Production 빌드 전에 실행합니다. 기존 특수 화면의 고정 기록은 새 페이지나 추가 예외에 재사용할 수 없습니다. 고객 메뉴판은 별도 시스템을 유지합니다.</p>
  </section></>;
}
