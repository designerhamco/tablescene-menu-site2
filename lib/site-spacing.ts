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

/** Base px values are documentation data; CSS resolves rem and owns the layout. */
export const SITE_CONTENT_COMPOSITION = [
  { role: "작업 박스 안쪽", mobile: 20, wide: 24, owner: "ContentPanel", usage: "흰 작업 박스·회색 보조 영역" },
  { role: "조밀한 안내 안쪽", mobile: 16, wide: 16, owner: 'ContentPanel density="compact"', usage: "짧은 안내와 상태 피드백" },
  { role: "박스 안의 콘텐츠 묶음", mobile: 24, wide: 24, owner: "ContentPanel / site-stack-group", usage: "제목 그룹 → 폼 → 별도 행동 묶음" },
  { role: "제목과 설명", mobile: 12, wide: 12, owner: "site-stack-title", usage: "페이지 내부 섹션·박스 제목과 설명" },
  { role: "필드·작은 블록 사이", mobile: 16, wide: 16, owner: "site-form-row / site-stack-block", usage: "연결된 입력 필드·폼과 도움말 · 컨트롤만 나란히 놓으면 data-alignment=center" },
  { role: "라벨과 입력·관련 문구", mobile: 8, wide: 8, owner: "site-field-stack / site-stack-copy", usage: "라벨 → 입력, 이름 → 날짜, 연결된 짧은 문구" },
  { role: "정보 필드 사이", mobile: 24, wide: 24, owner: "DetailGrid / DetailField", usage: "정보 값은 본문16px, 라벨14px. 개별 정보 필드에 박스를 중첩하지 않음" },
  { role: "선택 항목 사이", mobile: 8, wide: 8, owner: "CheckboxFieldGroup / CheckboxField", usage: "네이티브 체크박스·14px 라벨·13px 메타, 기본 컨트롤 높이 이상" },
  { role: "버튼 사이", mobile: 8, wide: 8, owner: "site-action-row", usage: "문구 너비, 시작 정렬, 좁으면 순서대로 줄바꿈" },
] as const;
