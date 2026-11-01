/** Official site only; rem values resolve from the normal 16px site base. */
export const SITE_MOBILE_SPACING = [
  { token: "--site-space-copy", rem: .5, label: "관련 문구", usage: "분류·보조 설명, 연결된 짧은 문구" },
  { token: "--site-space-title-copy", rem: .75, label: "제목과 설명", usage: "페이지·섹션 제목과 바로 아래 설명" },
  { token: "--site-space-block", rem: 1, label: "작은 블록", usage: "썸네일과 카드 정보, 약관과 저작권" },
  { token: "--site-space-group", rem: 1.5, label: "콘텐츠 묶음", usage: "탭 안내의 위아래, 도구와 목록, 카드 내부" },
  { token: "--site-space-content", rem: 2, label: "주요 콘텐츠", usage: "제목 그룹과 첫 콘텐츠, 필터와 결과, 페이지네이션" },
  { token: "--site-space-card", rem: 3, label: "독립 카드 사이", usage: "세로로 이어지는 템플릿 카드" },
  { token: "--site-space-section", rem: 4, label: "새 섹션", usage: "콘텐츠와 별도 상담 영역, 마케팅 섹션" },
  { token: "--site-surface-inset", rem: 1.25, label: "표면 안쪽", usage: "목록 배경·설명 박스의 내부 여백" },
] as const;
export const SITE_MOBILE_MAX_WIDTH = 767;
