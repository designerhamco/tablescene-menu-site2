import styles from "./SiteComponentGallery.module.css";

const colors=[
  ["브랜드 노랑","--site-accent"],["기본 문구","--ui-text"],["보조 문구","--ui-text-muted"],
  ["기본 표면","--ui-surface"],["구분 표면","--ui-surface-muted"],["입력·경계","--ui-border"],
];
export default function DesignFoundations() {
  return <div>
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">색상과 표면</h2><p className="type-body text-zinc-600">브랜드 색은 강조에, 밝은 회색은 영역 구분에 사용합니다. 텍스트칩과 상태 색상은 기존 의미를 유지합니다.</p></div><div className={styles.tokenGrid}>{colors.map(([label,token])=><div className={styles.token} key={token}><span className={styles.swatch} style={{backgroundColor:`var(${token})`}} /><strong className="type-label">{label}</strong><code className="type-caption text-zinc-600">{token}</code></div>)}</div></section>
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">크기와 굵기로 구분하는 글자</h2><p className="type-body text-zinc-600">제목은 700, 콘텐츠 제목·탐색은 600–700, 설명은 400을 기본으로 사용합니다. 헤더 탐색은 14px를 유지합니다.</p></div><div className={styles.typeSamples}><p className="type-page-title">매장의 첫인상을 만드는 메뉴판</p><p className="type-section-title">매장에 어울리는 디자인을 찾아보세요</p><p className="type-content-title">디자인 이름과 주요 콘텐츠 제목</p><p className="site-body">소개 본문은 16–18px, 일반 본문은 14–16px로 읽힙니다.</p><p className="type-body-sm text-zinc-600">보조 설명 14px · 캡션 12px</p></div></section>
    <section className={styles.section}><div className={styles.heading}><h2 className="type-section-title">간격·크기·모서리</h2><p className="type-body text-zinc-600">같은 역할은 같은 규격으로 사용하고, 콘텐츠보다 제어 요소가 과하게 커지지 않도록 합니다.</p></div><div className={styles.ruleGrid}>
      <div className="site-card-surface p-5"><h3 className="type-content-title">간격</h3><p className="type-body-sm mt-3">반복 행동 8px · 정보 묶음 16px · 구역 내부 24px</p></div>
      <div className="site-card-surface p-5"><h3 className="type-content-title">버튼</h3><p className="type-body-sm mt-3">기본 40px / 강조 48px / 주요 시작 56px</p><p className="type-caption mt-2 text-zinc-600">좌우 패딩 16 / 20 / 24px, 문구에 맞는 폭</p></div>
      <div className="site-card-surface p-5"><h3 className="type-content-title">모서리</h3><p className="type-body-sm mt-3">작은 버튼 6px · 일반 버튼 8px · 패널 12px · 입력 16px</p></div>
    </div></section>
    <section className={styles.section}><h2 className="type-section-title">사용 기준</h2><div className={styles.usageTable}><table><thead><tr><th>역할</th><th>공통 요소</th><th>표현</th></tr></thead><tbody>
      <tr><td>목록·페이지 탐색</td><td>밑줄 탭</td><td>4px 밑줄과 글자 굵기로 선택 표시</td></tr><tr><td>목록 종류 전환</td><td>연결형 탭</td><td>흰 선택 탭과 흰 패널, 이어지는 경계</td></tr><tr><td>업종 등 하위 필터</td><td>이모지 선택 버튼</td><td>작은 아이콘과 짧은 문구</td></tr><tr><td>저장·시작</td><td>Primary 버튼</td><td>검정 바탕과 흰 문구</td></tr><tr><td>미리보기·취소·로그아웃</td><td>Outline 버튼</td><td>흰 바탕, 회색 경계, hover·active 구분</td></tr><tr><td>운영 현황</td><td>현황 카드</td><td>회색 영역 안 흰 표면, 작은 라벨과 큰 숫자</td></tr>
    </tbody></table></div><p className="type-body-sm text-zinc-600">이 기준은 공식 사이트와 관리 화면에 적용합니다. 고객이 만드는 메뉴판의 서체·색상·배치는 별도 규칙을 따릅니다.</p></section>
  </div>;
}
