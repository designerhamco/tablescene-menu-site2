import SiteSystemRules from "./SiteSystemRules";
import WideScreenRules from "./WideScreenRules";
import styles from "./SiteComponentGallery.module.css";
import {
  SITE_CONTROL_TYPE_STEPS,
  SITE_EMPHASIS_TYPE_STEPS,
  SITE_MANAGEMENT_TYPE_ROLES,
  SITE_READING_TYPE_STEPS,
  SITE_TYPE_ROLES,
  SITE_TYPE_STEPS,
} from "@/lib/site-typography";

const colors = [
  ["본문·제목", "--ui-text"], ["보조 설명", "--ui-text-muted"], ["날짜·메타", "--ui-text-subtle"], ["비선택 탭", "--ui-tab-inactive-text"],
  ["흰 콘텐츠", "--ui-surface"], ["페이지 배경", "--ui-surface-muted"], ["구분 영역·푸터", "--ui-surface-soft"],
  ["흰 표면 경계", "--ui-border"], ["브랜드 강조", "--site-accent"], ["안내 배경", "--ui-notice-surface"],
  ["정보·포커스", "--ui-info-text"], ["성공", "--ui-success-text"], ["주의", "--ui-warning-text"], ["오류", "--ui-error-text"],
];
export default function DesignFoundations() {
  return <div>
    <SiteSystemRules />
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">색상과 표면</h2><p className="type-body text-zinc-600">기본 화면은 같은 계열의 흰색·회색과 진한 글자로 구성합니다. 노랑은 브랜드·안내에, 파랑·초록·주황·빨강은 정보·성공·주의·오류 의미가 있을 때 사용합니다. AI 실행은 기존 공통 그라데이션을 유지합니다.</p></div>
      <div className={styles.tokenGrid}>{colors.map(([label, token]) => <div className={styles.token} key={token}><span className={styles.swatch} data-white={token === "--ui-surface" || undefined} style={{ backgroundColor: `var(${token})` }} /><strong className="type-label">{label}</strong><code className="type-caption text-zinc-600">{token}</code></div>)}</div>
      <p className="type-footnote text-zinc-600">외곽 테두리는 흰 표면에만 사용합니다. 회색·유색 박스는 면색과 여백으로 구분합니다. 상품 종류마다 서로 다른 색을 배정하지 않습니다.</p>
    </section>
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title" id="site-type-scale">최종 폰트 기준</h2><p className="type-body text-zinc-600">홈 플랜 화면의 비율을 기본값으로 사용합니다. 페이지 제목은 PC 36px, 큰 구역 제목은 28px, 대표 가격은 44px입니다. 카드·팝업·안내는 역할에 맞는 작은 단계를 사용하며 같은 역할은 모든 페이지에서 같은 크기와 굵기를 사용합니다.</p></div>
      <p className="type-footnote text-zinc-600">허용 단계: {SITE_TYPE_STEPS.join(" · ")}px. 모바일 768px 미만 / 태블릿 768–1023px / PC 1024px 이상. 표의 px는 기본값입니다. 실제 브라우저 너비 1,600px부터 공통 글자 토큰만 완만하게 커지며 2,600px에서 최대 12.5%로 제한합니다. rem 기준과 브라우저 글자 확대를 존중하며 고객 메뉴판은 별도입니다.</p>
      <div className="site-collection mt-5"><p className="type-content-title">숫자가 많아 보여도 읽는 글자는 다섯 단계만 사용합니다</p><p className="type-body mt-2 text-zinc-600">읽기 {SITE_READING_TYPE_STEPS.join(" · ")}px / 탭·버튼·탐색 {SITE_CONTROL_TYPE_STEPS.join(" · ")}px / 큰 제목·가격·수치 {SITE_EMPHASIS_TYPE_STEPS.join(" · ")}px입니다. 15px은 컨트롤에만 사용하고, 24px 이상은 큰 구역 제목이나 핵심 수치에만 사용합니다.</p></div>
      <div className={styles.usageTable}><table aria-label="글자 역할 기준"><thead><tr><th>역할</th><th>클래스</th><th>모바일 / 태블릿 / PC</th><th>굵기 / 줄높이</th><th>사용 문맥</th></tr></thead><tbody>{SITE_TYPE_ROLES.map(role => <tr key={role.key}><td>{role.label}</td><td><code>{role.className}</code></td><td>{role.mobile} / {role.tablet} / {role.desktop}px</td><td>{role.weight} / {role.lineHeight}</td><td>{role.usage}</td></tr>)}</tbody></table></div>
      <div className={styles.typeSamples}><p className="type-page-title">고르고, 만들고, 바로 보여주세요</p><p className="type-page-description text-zinc-600">페이지 제목 바로 아래의 설명은 로그인·서비스·고객센터·신청 화면에서 모두 같은 역할과 크기를 사용합니다.</p><p className="type-section-title">페이지 안의 큰 콘텐츠 구역</p><p className="type-body text-zinc-600">섹션 제목 아래의 설명과 일반 상세 문장은 기본 본문입니다.</p><p className="type-body-lg text-zinc-600">기본 본문보다 한 단계 강조해야 하는 짧은 문장만 강조 본문을 사용합니다.</p><p className="type-body-sm text-zinc-600">폼 도움말과 카드의 부가 설명은 보조 본문입니다.</p><p className="type-price">4,900<span className="type-body-sm"> 원 / 월</span></p><article className="site-card p-5"><h3 className="type-card-title">카드 안에서는 정보가 먼저 보여야 합니다</h3><p className="type-card-body mt-2 text-zinc-600">설명은 14px로 간결하게 읽고, 중요한 이름과 수치는 따로 강조합니다.</p><p className="type-card-detail mt-3 text-zinc-600">분류 · 날짜 · 보충 정보 13px</p></article><p className="type-footnote text-zinc-600">작은 안내는 페이지와 카드 어디에서나 13px·보통 굵기입니다.</p></div>
      <div className="site-management-scope mt-8">
        <h3 className="type-subsection-title">관리 화면 내부 계층</h3>
        <p className="type-body mt-2 text-zinc-600">마이페이지와 편집·운영 화면의 페이지 제목과 페이지 설명은 다른 일반 페이지와 같습니다. 정보가 많은 카드·폼·내역만 아래의 조밀한 단계를 사용합니다.</p>
        <div className={`${styles.usageTable} mt-5`}><table aria-label="관리 화면 글자 역할 기준"><thead><tr><th>역할</th><th>크기</th><th>굵기</th><th>사용 문맥</th></tr></thead><tbody>{SITE_MANAGEMENT_TYPE_ROLES.map(role => <tr key={role.key}><td>{role.label}</td><td>{role.size}px</td><td>{role.weight}</td><td>{role.usage}</td></tr>)}</tbody></table></div>
        <div className={styles.typeSamples}><p className="type-page-title">마이페이지</p><p className="type-page-description text-zinc-600">메뉴판 디자인과 공개 상태, 고객지원, 결제 정보를 한곳에서 확인합니다.</p><p className="type-section-title">메뉴판 관리</p><p className="type-subsection-title">이용 중인 서비스</p><p className="type-content-title">QA 베이직 페이지형 주문</p><p className="type-body text-zinc-600">생성한 메뉴판을 편집하고 공개 상태를 확인할 수 있습니다.</p><p className="type-body-sm text-zinc-600">최근 업데이트와 이용 상태를 같은 크기와 굵기로 안내합니다.</p><p className="type-caption text-zinc-600">업데이트 2026.10.26</p></div>
      </div>
    </section>
    <section className={styles.section} aria-labelledby="site-page-rhythm-title"><div className={styles.heading}><h2 id="site-page-rhythm-title" className="type-section-title">일반 페이지 제목과 간격</h2><p className="type-body text-zinc-600">일반 목록·신청·도움말 페이지는 SitePageHeader를 공유합니다. 공개 페이지는 가운데, 관리 화면은 시작 정렬이며 같은 폭에서 제목의 시작 높이와 설명 간격은 같습니다.</p></div><div className={styles.usageTable}><table aria-label="페이지 제목 간격 기준"><thead><tr><th>구간</th><th>공통 기준</th><th>토큰</th></tr></thead><tbody><tr><td>헤더 아래에서 제목 시작</td><td>공통 페이지 상단 여백, 기본40–64px</td><td>--site-page-heading-top</td></tr><tr><td>제목 → 설명</td><td>12px</td><td>--site-page-title-description-gap</td></tr><tr><td>제목 영역 → 첫 콘텐츠</td><td>모바일32px / 태블릿·PC40px</td><td>--site-page-intro-content-gap</td></tr><tr><td>일반 영역 탭</td><td>높이52px / 상하12px / 좌우24px</td><td>site-area-tabs size=md</td></tr></tbody></table></div><p className="type-footnote text-zinc-600">설명이 여러 줄이 되면 첫 콘텐츠가 자연스럽게 내려갑니다. 홍보 히어로·인증 폼·상세 정보 화면은 별도 구성 역할을 유지하며 고객 메뉴판은 이 규칙과 분리합니다.</p></section>
    <WideScreenRules id="wide-screen-foundations" />
    <section className={styles.section}><h2 className="type-section-title">탭·세그먼트 사용 기준</h2><div className={styles.usageTable}><table><thead><tr><th>역할</th><th>형태</th><th>적용</th></tr></thead><tbody>
      <tr><td>주요 화면 전환</td><td>텍스트와 문구 너비의 선택 밑줄</td><td>서비스별 목록, 가이드, 편집·운영 설정</td></tr>
      <tr><td>독립 콘텐츠 영역 전환</td><td>화이트 콘텐츠에 연결된 영역형 탭</td><td>디자인 / 기본 템플릿, 결제 / AI 내역, 미리보기 기능 / 디자인</td></tr>
      <tr><td>목록 주제 분류</td><td>밑줄형</td><td>고객센터 주제, 전체 / 읽지 않은 알림</td></tr>
      <tr><td>현재 화면의 상태·보기 값 변경</td><td>회색 레일 안의 흰 선택 세그먼트</td><td>이용 중 / 보관 중 / 종료됨, 언어, 이미지 / 목록</td></tr>
      <tr><td>목록 조건·본문 이동</td><td>작은 필터·링크</td><td>업종·화면 구성·문서 위치</td></tr>
    </tbody></table></div><p className="type-body-sm text-zinc-600">탭 문구는 본문이 아니라 컨트롤 라벨입니다. 주요 화면 탭은 lg 18px·md 16px, 독립 영역 탭은 md 16px, 일반 md는 15px, 조밀한 sm은 14px을 사용합니다. 주요 화면은 선택 600·비선택 500 굵기와 공통 비선택 회색을 사용하며, 같은 역할과 크기는 모든 페이지에서 동일합니다.</p><p className="type-footnote text-zinc-600">영역형은 하나의 기능 영역 안에서만 사용하고 다른 역할의 탭으로 일괄 적용하지 않습니다. 고객이 제작하는 메뉴판의 서체·색·배치는 별도 규칙입니다.</p></section>
  </div>;
}
