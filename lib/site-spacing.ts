/** Official site only; rem values resolve from the normal 16px site base. */
export const SITE_MOBILE_SPACING = [
  { token: "--site-space-detail", rem: .25, label: "밀접한 세부 정보", usage: "카드 분류와 제목, 구조와 해시태그 등 같은 정보 묶음 내부. 일반 본문·필드 간격과 구분" },
  { token: "--site-space-copy", rem: .5, label: "관련 문구", usage: "분류·보조 설명, 연결된 짧은 문구" },
  { token: "--site-space-title-copy", rem: .75, label: "제목과 설명", usage: "페이지·섹션 제목과 바로 아래 설명" },
  { token: "--site-space-block", rem: 1, label: "작은 블록", usage: "썸네일과 카드 정보, 약관과 저작권" },
  { token: "--site-space-group", rem: 1.5, label: "콘텐츠 묶음", usage: "탭 안내의 위아래, 도구와 목록, 카드 내부" },
  { token: "--site-space-content", rem: 2, label: "주요 콘텐츠", usage: "제목 그룹과 첫 콘텐츠, 필터와 결과, 페이지네이션" },
  { token: "--site-space-card", rem: 3, label: "독립 카드 사이", usage: "독립 카드. 모바일 템플릿 목록은 가로12px·세로32px" },
  { token: "--site-space-section", rem: 4, label: "새 섹션", usage: "콘텐츠와 별도 상담 영역, 마케팅 섹션" },
  { token: "--site-surface-inset", rem: 1.25, label: "표면 안쪽", usage: "실제로 필요한 관리 패널·안내 표면의 내부 여백. 열린 목록/상세에는 추가하지 않음" },
] as const;
export const SITE_MOBILE_MAX_WIDTH = 767;

/** Base px values are documentation data; CSS resolves rem and owns the layout. */
export const SITE_CONTENT_COMPOSITION = [
  { role: "작업 박스 안쪽", mobile: 20, wide: 24, owner: "ContentPanel", usage: "관리 문맥에서 필요한 독립 작업·정보 패널" },
  { role: "조밀한 안내 안쪽", mobile: 16, wide: 16, owner: 'ContentPanel density="compact"', usage: "짧은 안내와 상태 피드백" },
  { role: "박스 안의 콘텐츠 묶음", mobile: 24, wide: 24, owner: "ContentPanel / site-stack-group", usage: "제목 그룹 → 폼 → 별도 행동 묶음" },
  { role: "제목과 설명", mobile: 12, wide: 12, owner: "site-stack-title", usage: "페이지 내부 섹션·박스 제목과 설명" },
  { role: "필드·작은 블록 사이", mobile: 16, wide: 16, owner: "site-form-row / site-stack-block", usage: "연결된 입력 필드·폼과 도움말 · 컨트롤만 나란히 놓으면 data-alignment=center" },
  { role: "라벨과 입력·관련 문구", mobile: 8, wide: 8, owner: "site-field-stack / site-stack-copy", usage: "라벨 → 입력, 이름 → 날짜, 연결된 짧은 문구" },
  { role: "정보 필드 사이", mobile: 24, wide: 24, owner: "DetailGrid / DetailField", usage: "정보 값은 본문16px, 라벨14px. 개별 정보 필드에 박스를 중첩하지 않음" },
  { role: "선택 항목 사이", mobile: 8, wide: 8, owner: "CheckboxFieldGroup / CheckboxField", usage: "네이티브 체크박스·14px 라벨·13px 메타, 기본 컨트롤 높이 이상" },
  { role: "버튼 사이", mobile: 8, wide: 8, owner: "site-action-row", usage: "문구 너비, 시작 정렬, 좁으면 순서대로 줄바꿈" },
] as const;

/** Compact control internals; never reuse content-panel gaps for menu rows. */
export const SITE_CONTROL_DENSITY = [
  { role: "검색창 기본 경계", value: "1px · #b5bac3", token: "--ui-search-boundary", rule: "공통 검색만 일반 필드보다 진하게 구분. 캡슐과 기존 hover/focus/error/disabled 상태 유지" },
  { role: "일반 입력·선택 모서리", value: "12px", token: "--ui-radius-field", rule: "일반 입력·셀렉트·텍스트 영역은 이전 모서리 유지. 검색은 별도 캡슐형" },
  { role: "검색창 모서리", value: "캡슐형", token: "SearchField / --ui-radius-control", rule: "작은 검색·대표 검색 모두 유지. 일반 필드 모서리 변경에 포함하지 않음" },
  { role: "선택 라벨·개수 / 화살표 최소 여유", value: "PC·태블릿8 / 8px", token: "--ui-multiselect-count-gap / --site-select-trailing-space", rule: "768px 이상에서만 축소. 모바일 기존16 / 12px와 아코디언8px 유지" },
  { role: "대표 검색 글자", value: "모바일16 / 태블릿·PC18px", token: "SearchField fieldSize=search / --site-type-16/18", rule: "FAQ 같은 대표 검색. 일반 도구 입력14px·터치16px와 구분" },
  { role: "검색·필터 도구 너비", value: "PC 검색 최대288px / 선택은 내용 기준", token: "FilterToolbar / --ui-filter-search-width", rule: "동일 그룹은 가장 넓은 컨트롤에 맞춘 같은 너비. 남는 폭을 채우지 않고 공간이 부족하면 줄바꿈" },
  { role: "일반 조작 글자", value: "14px", token: "--type-control-size", rule: "버튼·필드 라벨·드롭다운 내부 전용. 사이트 탐색·제목·본문은 제외하며 공통 와이드 보정 유지" },
  { role: "입력 글자", value: "14px / 터치16px", token: "--ui-field-font-size", rule: "본문 크기와 분리. 터치 환경은 입력 가독성 유지" },
  { role: "입력 높이", value: "32 / 40 / 44 / 48px", token: "--ui-field-height-sm/md/lg/search", rule: "조밀한 필터·일반 입력·주요 폼·큰 검색. 터치 필터40·일반44px. 보조 행동이 있는 복합 입력은 최소40px" },
  { role: "드롭다운 항목", value: "32px / 터치40px", token: "--ui-menu-row-height", rule: "글자가 길면 자연스럽게 늘어나며 항목 간 gap은0" },
  { role: "드롭다운 안쪽", value: "8px", token: "--ui-menu-inset", rule: "옵션 행에 페이지/패널의16·24px 여백을 재사용하지 않음" },
  { role: "목록 구획 사이", value: "4px", token: "--ui-menu-section-gap", rule: "전체 선택·구분선·옵션 목록 사이" },
  { role: "아이콘·문구 / 버튼 사이", value: "8px", token: "--ui-control-gap", rule: "버튼·필드 내부와 관련 행동 간 공통 간격" },
  { role: "입력·버튼 좌우", value: "12px / 큰 행동16px", token: "--ui-control-padding-inline/lg", rule: "일반 컨트롤 내부. 검색의 원형 실행은 높이에서 여백을 계산" },
  { role: "체크박스·라디오", value: "16px", token: "--ui-choice-size", rule: "시각 크기. 클릭은 라벨 행 전체로 확장" },
  { role: "일반 탭 높이", value: "32 / 36 / 40px", token: "--site-tab-height", rule: "sm·md14px, lg16px. 영역형·문서형·룸 선택은40·44·48px" },
  { role: "탭 선택 밑줄", value: "3px", token: "--site-tab-indicator-width", rule: "주요 화면·분류·알림 공통. 높이·여백·선택선 너비와 위치는 유지" },
  { role: "알림 분류 탭", value: "최소48px · 상하8px · 글자14px", token: "--ui-control-height-lg / --site-space-copy", rule: "NotificationPanel 공통 규격. 팝업·알림 이력·컴포넌트 예시에 동일 적용" },
  { role: "룸 선택·추가", value: "40 / 44 / 48px · 글자16px", token: "--site-room-control-height / --site-type-16", rule: "sm·md·lg. 같은 묶음의 추가와 선택이 한 크기 설정을 공유. 너비는 정사각 아이콘/내용 기준 텍스트로 구분" },
] as const;
