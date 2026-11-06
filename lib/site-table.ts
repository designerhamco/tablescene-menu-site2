/** Shared table column budgets include the cell's inline padding. */
export const SITE_TABLE_COLUMNS = {
  compact: { rem: 6, label: "짧은 분류", usage: "종류·짧은 구분" },
  text: { rem: 12, label: "이름·본문", usage: "길면 줄바꿈하는 이름·일반 내용" },
  detail: { rem: 18, label: "상세·연결 정보", usage: "상태 설명과 이동 행동이 함께 있는 정보" },
  control: { rem: 10, label: "상태 조작", usage: "라벨과 공통 Switch" },
  toggles: { rem: 14, label: "기기별 허용", usage: "태블릿·모바일 각각 라벨·ON/OFF·Switch를 두 행으로 표시" },
  actions: { rem: 10, label: "행 작업", usage: "공통 compact 버튼 2개" },
} as const;
export type SiteTableColumn = keyof typeof SITE_TABLE_COLUMNS;

export function getSiteTableLayout(columns: readonly SiteTableColumn[]) {
  const minWidthRem = columns.reduce((total, kind) => total + SITE_TABLE_COLUMNS[kind].rem, 0);
  return { minWidthRem, widths: columns.map(kind => SITE_TABLE_COLUMNS[kind].rem / minWidthRem * 100) };
}

export const SITE_TABLE_RULES = [
  { label: "헤더 셀 안쪽", token: "--site-table-head-inset-block", pixels: 12, detail: "위아래 12px · 좌우는 공통 16px" },
  { label: "본문 셀 안쪽", token: "--site-table-cell-inset", pixels: 16, detail: "모든 기기에서 상하좌우 16px" },
  { label: "헤더 최소 높이", token: "--site-table-head-height", pixels: 56, detail: "기본 56px · 내용과 조작이 크면 자연스럽게 확장" },
  { label: "본문 행 최소 높이", token: "--site-table-row-height", pixels: 64, detail: "기본 64px · 44px Switch가 있으면 76px 이상" },
  { label: "행 안의 조작 간격", token: "--site-space-copy", pixels: 8, detail: "공통 site-action-row · 버튼 크기와 조작 영역 유지" },
  { label: "작업 묶음 사이", token: "--site-space-group", pixels: 24, detail: "보기 전환 → 추가 버튼 → 목록 묶음" },
  { label: "목록 제목과 표 사이", token: "--site-space-block", pixels: 16, detail: "공통 site-stack-block · 자식 margin을 중복하지 않음" },
] as const;
