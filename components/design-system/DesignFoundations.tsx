import styles from "./SiteComponentGallery.module.css";

const colors = [
  ["본문·제목", "--ui-text"], ["보조 설명", "--ui-text-muted"], ["날짜·메타", "--ui-text-subtle"],
  ["흰 콘텐츠", "--ui-surface"], ["페이지 배경", "--ui-surface-muted"], ["구분 영역·푸터", "--ui-surface-soft"],
  ["흰 표면 경계", "--ui-border"], ["브랜드 강조", "--site-accent"], ["안내 배경", "--ui-notice-surface"],
  ["정보·포커스", "--ui-info-text"], ["성공", "--ui-success-text"], ["주의", "--ui-warning-text"], ["오류", "--ui-error-text"],
];
const roles = [
  ["마케팅 대표 문구", "type-display", "모바일 36 / 태블릿 48 / PC 60", "메인·서비스 소개의 대표 메시지"],
  ["페이지 제목", "type-page-title", "30–40 · 700", "로그인·회원가입·마이페이지 등 한 화면의 주제"],
  ["본문 섹션 제목", "type-section-title", "26–36 · 700", "페이지 안 큰 정보 묶음"],
  ["본문", "type-body", "모바일 16 / PC 17 · 400", "긴 설명·소개·읽는 콘텐츠"],
  ["카드 제목", "type-card-title", "18 · 600", "템플릿·내역·요금 카드의 이름"],
  ["카드 안 설명", "type-card-body", "14 · 400", "카드의 요약 설명, 좁은 영역의 본문"],
  ["카드 메타", "type-card-detail", "13 · 400", "날짜·분류·보충 정보"],
  ["팝업 제목", "site-dialog-title", "18 · 700", "알림·상담·확인창의 제목"],
  ["팝업 본문", "site-dialog-description", "14 · 400", "알림 내용·상담 대화·선택 설명"],
  ["작은 안내", "type-footnote", "13 · 400", "폼 도움말·하단 주의·보안 안내"],
  ["입력값 / 폼 라벨", "site-field / type-label", "16 이상 / 15–16", "입력값과 항목 이름은 도움말보다 크게"],
];
export default function DesignFoundations() {
  return <div>
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">색상과 표면</h2><p className="type-body text-zinc-600">기본 화면은 같은 계열의 흰색·회색과 진한 글자로 구성합니다. 노랑은 브랜드·안내에, 파랑·초록·주황·빨강은 정보·성공·주의·오류 의미가 있을 때 사용합니다. AI 실행은 기존 공통 그라데이션을 유지합니다.</p></div>
      <div className={styles.tokenGrid}>{colors.map(([label, token]) => <div className={styles.token} key={token}><span className={styles.swatch} data-white={token === "--ui-surface" || undefined} style={{ backgroundColor: `var(${token})` }} /><strong className="type-label">{label}</strong><code className="type-caption text-zinc-600">{token}</code></div>)}</div>
      <p className="type-footnote text-zinc-600">외곽 테두리는 흰 표면에만 사용합니다. 회색·유색 박스는 면색과 여백으로 구분합니다. 상품 종류마다 서로 다른 색을 배정하지 않습니다.</p>
    </section>
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">읽는 문맥에 따른 글자</h2><p className="type-body text-zinc-600">같은 역할을 같은 기준으로 표시합니다. 본문이라고 모두 크게 만들지 않고, 카드·팝업·작은 안내는 각각 별도의 읽기 크기를 사용합니다.</p></div>
      <div className={styles.usageTable}><table aria-label="글자 역할 기준"><thead><tr><th>역할</th><th>클래스</th><th>크기 px / 굵기</th><th>사용 문맥</th></tr></thead><tbody>{roles.map(([role, cls, size, usage]) => <tr key={role}><td>{role}</td><td><code>{cls}</code></td><td>{size}</td><td>{usage}</td></tr>)}</tbody></table></div>
      <div className={styles.typeSamples}><p className="type-page-title">로그인</p><p className="type-body">페이지 본문은 편안하게 읽히는 크기를 유지합니다.</p><article className="site-card p-5"><h3 className="type-card-title">카드 안에서는 정보가 먼저 보여야 합니다</h3><p className="type-card-body mt-2 text-zinc-600">설명은 14px로 간결하게 읽고, 중요한 이름과 수치는 따로 강조합니다.</p><p className="type-card-detail mt-3 text-zinc-600">분류 · 날짜 · 보충 정보 13px</p></article><p className="type-footnote text-zinc-600">작은 안내는 페이지와 카드 어디에서나 13px·보통 굵기입니다.</p></div>
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
