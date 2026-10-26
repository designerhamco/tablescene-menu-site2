import styles from "./SiteComponentGallery.module.css";
import { SITE_MANAGEMENT_TYPE_ROLES, SITE_TYPE_ROLES, SITE_TYPE_STEPS } from "@/lib/site-typography";

const colors = [
  ["본문·제목", "--ui-text"], ["보조 설명", "--ui-text-muted"], ["날짜·메타", "--ui-text-subtle"],
  ["흰 콘텐츠", "--ui-surface"], ["페이지 배경", "--ui-surface-muted"], ["구분 영역·푸터", "--ui-surface-soft"],
  ["흰 표면 경계", "--ui-border"], ["브랜드 강조", "--site-accent"], ["안내 배경", "--ui-notice-surface"],
  ["정보·포커스", "--ui-info-text"], ["성공", "--ui-success-text"], ["주의", "--ui-warning-text"], ["오류", "--ui-error-text"],
];
export default function DesignFoundations() {
  return <div>
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">색상과 표면</h2><p className="type-body text-zinc-600">기본 화면은 같은 계열의 흰색·회색과 진한 글자로 구성합니다. 노랑은 브랜드·안내에, 파랑·초록·주황·빨강은 정보·성공·주의·오류 의미가 있을 때 사용합니다. AI 실행은 기존 공통 그라데이션을 유지합니다.</p></div>
      <div className={styles.tokenGrid}>{colors.map(([label, token]) => <div className={styles.token} key={token}><span className={styles.swatch} data-white={token === "--ui-surface" || undefined} style={{ backgroundColor: `var(${token})` }} /><strong className="type-label">{label}</strong><code className="type-caption text-zinc-600">{token}</code></div>)}</div>
      <p className="type-footnote text-zinc-600">외곽 테두리는 흰 표면에만 사용합니다. 회색·유색 박스는 면색과 여백으로 구분합니다. 상품 종류마다 서로 다른 색을 배정하지 않습니다.</p>
    </section>
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title" id="site-type-scale">최종 폰트 기준</h2><p className="type-body text-zinc-600">홈 플랜 화면의 비율을 기준으로 고정합니다. 큰 제목은 PC 36px, 서비스 카드명은 26px, 대표 가격은 44px입니다. 카드·팝업·안내는 역할에 맞는 작은 단계를 사용하며 기기 사이에서 임의의 중간 크기를 만들지 않습니다.</p></div>
      <p className="type-footnote text-zinc-600">허용 단계: {SITE_TYPE_STEPS.join(" · ")}px. 모바일 768px 미만 / 태블릿 768–1023px / PC 1024px 이상. 기준은 rem으로 적용되어 브라우저 글자 확대를 존중합니다.</p>
      <div className={styles.usageTable}><table aria-label="글자 역할 기준"><thead><tr><th>역할</th><th>클래스</th><th>모바일 / 태블릿 / PC</th><th>굵기 / 줄높이</th><th>사용 문맥</th></tr></thead><tbody>{SITE_TYPE_ROLES.map(role => <tr key={role.key}><td>{role.label}</td><td><code>{role.className}</code></td><td>{role.mobile} / {role.tablet} / {role.desktop}px</td><td>{role.weight} / {role.lineHeight}</td><td>{role.usage}</td></tr>)}</tbody></table></div>
      <div className={styles.typeSamples}><p className="type-page-title">고르고, 만들고, 바로 보여주세요</p><p className="type-body-lg text-zinc-600">서비스의 가치와 분위기를 소개하는 큰 도입 설명입니다.</p><p className="type-page-description text-zinc-600">로그인·마이페이지 같은 기능 화면의 설명입니다.</p><p className="type-body text-zinc-600">페이지 본문은 편안하게 읽히는 크기를 유지합니다.</p><p className="type-body-sm text-zinc-600">폼 도움말과 보조 이동은 한 단계 작게 표시합니다.</p><p className="type-price">4,900<span className="type-body-sm"> 원 / 월</span></p><article className="site-card p-5"><h3 className="type-card-title">카드 안에서는 정보가 먼저 보여야 합니다</h3><p className="type-card-body mt-2 text-zinc-600">설명은 14px로 간결하게 읽고, 중요한 이름과 수치는 따로 강조합니다.</p><p className="type-card-detail mt-3 text-zinc-600">분류 · 날짜 · 보충 정보 13px</p></article><p className="type-footnote text-zinc-600">작은 안내는 페이지와 카드 어디에서나 13px·보통 굵기입니다.</p></div>
      <div className="site-management-scope mt-8">
        <h3 className="type-subsection-title">관리 화면 내부 계층</h3>
        <p className="type-body mt-2 text-zinc-600">마이페이지와 편집·운영 화면의 페이지 제목은 일반 페이지와 같고, 기능 설명은 일반 본문 크기를 사용합니다. 정보가 많은 카드·폼·내역만 아래의 조밀한 단계를 사용합니다.</p>
        <div className={`${styles.usageTable} mt-5`}><table aria-label="관리 화면 글자 역할 기준"><thead><tr><th>역할</th><th>크기</th><th>굵기</th><th>사용 문맥</th></tr></thead><tbody>{SITE_MANAGEMENT_TYPE_ROLES.map(role => <tr key={role.key}><td>{role.label}</td><td>{role.size}px</td><td>{role.weight}</td><td>{role.usage}</td></tr>)}</tbody></table></div>
        <div className={styles.typeSamples}><p className="type-page-title">마이페이지</p><p className="type-page-description text-zinc-600">메뉴판 디자인과 공개 상태, 고객지원, 결제 정보를 한곳에서 확인합니다.</p><p className="type-section-title">메뉴판 관리</p><p className="type-subsection-title">이용 중인 서비스</p><p className="type-content-title">QA 베이직 페이지형 주문</p><p className="type-body text-zinc-600">생성한 메뉴판을 편집하고 공개 상태를 확인할 수 있습니다.</p><p className="type-body-sm text-zinc-600">최근 업데이트와 이용 상태를 같은 크기와 굵기로 안내합니다.</p><p className="type-caption text-zinc-600">업데이트 2026.10.26</p></div>
      </div>
    </section>
    <section className={styles.section}><h2 className="type-section-title">탭·세그먼트 사용 기준</h2><div className={styles.usageTable}><table><thead><tr><th>역할</th><th>형태</th><th>적용</th></tr></thead><tbody>
      <tr><td>상위 탐색·상태 분류</td><td>기존 밑줄형</td><td>베이직·다이닝·디스플레이, 가이드, 마이페이지·편집·운영</td></tr>
      <tr><td>알림·요금 카드 분류</td><td>기존 밑줄형</td><td>알림창과 요금 패널의 원래 구조 유지</td></tr>
      <tr><td>아래 목록 영역과 연결</td><td>파일형 연결 탭</td><td>디자인 / 기본 템플릿, 공지 / FAQ. 왼쪽에 문구 폭만큼 모아서 표시</td></tr>
      <tr><td>보기·설정 방식 전환</td><td>Outline 세그먼트</td><td>이미지 / 목록, 기능 / 디자인</td></tr>
      <tr><td>목록 조건</td><td>작은 필터</td><td>업종·주제·서체 분류</td></tr>
    </tbody></table></div><p className="type-footnote text-zinc-600">추가 형태 예시는 선택 가능한 시안입니다. 라이브러리에 추가했다고 다른 역할의 탭으로 일괄 적용하지 않습니다. 고객이 제작하는 메뉴판의 서체·색·배치는 별도 규칙입니다.</p></section>
  </div>;
}
