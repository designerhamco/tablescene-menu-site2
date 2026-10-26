/** Approved from the home plan reference. Menu renderer foundations remain independent. */
export const SITE_READING_TYPE_STEPS = [13,14,16,18,20] as const;
export const SITE_CONTROL_TYPE_STEPS = [14,15,16] as const;
export const SITE_EMPHASIS_TYPE_STEPS = [24,28,32,36,44] as const;
export const SITE_TYPE_STEPS = [13,14,15,16,18,20,24,28,32,36,44] as const;
export const SITE_MANAGEMENT_TYPE_ROLES = [
  { key: "section-title", label: "큰 구역 제목", size: 24, weight: 700, usage: "메뉴판 관리·결제 내역 등 주 콘텐츠 구역" },
  { key: "subsection-title", label: "폼·패널 제목", size: 20, weight: 700, usage: "새 문의·운영 패널·편집 구역" },
  { key: "content-title", label: "콘텐츠 제목", size: 18, weight: 600, usage: "카드·내역·설정 묶음 제목" },
  { key: "item-title", label: "항목 제목", size: 16, weight: 600, usage: "메뉴판·결제·주문 항목 이름" },
  { key: "body", label: "일반 본문", size: 16, weight: 400, usage: "화면과 카드의 읽는 설명" },
  { key: "body-sm", label: "보조 설명", size: 14, weight: 400, usage: "상태 설명·폼 도움말" },
  { key: "label", label: "라벨·조작 문구", size: 14, weight: 600, usage: "필드명·필터·작은 조작" },
  { key: "caption", label: "메타·작은 안내", size: 13, weight: 500, usage: "날짜·분류·보충 정보" },
  { key: "metric", label: "통계·작은 결제 수치", size: 24, weight: 700, usage: "운영 지표·결제 요약" },
] as const;
export const SITE_TYPE_ROLES = [
  {
    "key": "display",
    "label": "대표 문구",
    "mobile": 28,
    "tablet": 32,
    "desktop": 36,
    "weight": 700,
    "lineHeight": 1.25,
    "className": "type-display",
    "usage": "메인·서비스 대표 문구"
  },
  {
    "key": "page-title",
    "label": "페이지 제목",
    "mobile": 28,
    "tablet": 32,
    "desktop": 36,
    "weight": 700,
    "lineHeight": 1.3125,
    "className": "type-page-title",
    "usage": "로그인·마이페이지·신청 등 화면의 주제"
  },
  {
    "key": "page-description",
    "label": "페이지 설명",
    "mobile": 16,
    "tablet": 16,
    "desktop": 16,
    "weight": 400,
    "lineHeight": 1.625,
    "className": "type-page-description",
    "usage": "모든 일반 페이지에서 H1 바로 아래에 오는 한두 문장"
  },
  {
    "key": "section-title",
    "label": "큰 구역 제목",
    "mobile": 24,
    "tablet": 28,
    "desktop": 28,
    "weight": 700,
    "lineHeight": 1.3125,
    "className": "type-section-title",
    "usage": "페이지 안의 큰 콘텐츠 구획"
  },
  {
    "key": "subsection-title",
    "label": "서비스·구역 제목",
    "mobile": 20,
    "tablet": 20,
    "desktop": 24,
    "weight": 700,
    "lineHeight": 1.3,
    "className": "type-subsection-title",
    "usage": "서비스 카드명·폼 구역 제목"
  },
  {
    "key": "content-title",
    "label": "콘텐츠 제목",
    "mobile": 18,
    "tablet": 18,
    "desktop": 20,
    "weight": 600,
    "lineHeight": 1.5,
    "className": "type-content-title",
    "usage": "콘텐츠의 하위 제목"
  },
  {
    "key": "item-title",
    "label": "항목 제목",
    "mobile": 18,
    "tablet": 18,
    "desktop": 18,
    "weight": 600,
    "lineHeight": 1.5,
    "className": "type-item-title",
    "usage": "내역·항목 이름"
  },
  {
    "key": "body-lg",
    "label": "강조 본문",
    "mobile": 18,
    "tablet": 18,
    "desktop": 20,
    "weight": 400,
    "lineHeight": 1.625,
    "className": "type-body-lg",
    "usage": "섹션 안에서 기본 본문보다 강조할 짧은 문장"
  },
  {
    "key": "body",
    "label": "일반 본문",
    "mobile": 16,
    "tablet": 16,
    "desktop": 16,
    "weight": 400,
    "lineHeight": 1.625,
    "className": "type-body",
    "usage": "읽는 설명·상세 본문"
  },
  {
    "key": "body-sm",
    "label": "보조 설명",
    "mobile": 14,
    "tablet": 14,
    "desktop": 14,
    "weight": 400,
    "lineHeight": 1.625,
    "className": "type-body-sm",
    "usage": "카드·폼의 보조 설명"
  },
  {
    "key": "label",
    "label": "폼 라벨",
    "mobile": 15,
    "tablet": 15,
    "desktop": 16,
    "weight": 600,
    "lineHeight": 1.4,
    "className": "type-label",
    "usage": "항목 이름"
  },
  {
    "key": "nav",
    "label": "탐색 문구",
    "mobile": 15,
    "tablet": 15,
    "desktop": 16,
    "weight": 600,
    "lineHeight": 1.4,
    "className": "type-nav",
    "usage": "헤더·탐색"
  },
  {
    "key": "caption",
    "label": "날짜·분류",
    "mobile": 13,
    "tablet": 13,
    "desktop": 13,
    "weight": 500,
    "lineHeight": 1.45,
    "className": "type-caption",
    "usage": "작은 날짜·메타"
  },
  {
    "key": "control",
    "label": "버튼 문구",
    "mobile": 15,
    "tablet": 15,
    "desktop": 16,
    "weight": 600,
    "lineHeight": 1.375,
    "className": "type-control",
    "usage": "버튼·선택 요소"
  },
  {
    "key": "footnote",
    "label": "작은 안내",
    "mobile": 13,
    "tablet": 13,
    "desktop": 13,
    "weight": 400,
    "lineHeight": 1.6,
    "className": "type-footnote",
    "usage": "도움말·하단 주의·보안 안내"
  },
  {
    "key": "card-title",
    "label": "작은 카드 제목",
    "mobile": 18,
    "tablet": 18,
    "desktop": 18,
    "weight": 600,
    "lineHeight": 1.5,
    "className": "type-card-title",
    "usage": "템플릿·작은 정보 카드 이름"
  },
  {
    "key": "card-body",
    "label": "작은 카드 본문",
    "mobile": 14,
    "tablet": 14,
    "desktop": 14,
    "weight": 400,
    "lineHeight": 1.65,
    "className": "type-card-body",
    "usage": "좁은 카드 안 요약"
  },
  {
    "key": "card-detail",
    "label": "카드 보충 정보",
    "mobile": 13,
    "tablet": 13,
    "desktop": 13,
    "weight": 400,
    "lineHeight": 1.6,
    "className": "type-card-detail",
    "usage": "카드 날짜·보충 정보"
  },
  {
    "key": "dialog-title",
    "label": "팝업 제목",
    "mobile": 18,
    "tablet": 18,
    "desktop": 18,
    "weight": 700,
    "lineHeight": 1.3,
    "className": "site-dialog-title",
    "usage": "알림·상담·확인창"
  },
  {
    "key": "dialog-body",
    "label": "팝업 본문",
    "mobile": 14,
    "tablet": 14,
    "desktop": 14,
    "weight": 400,
    "lineHeight": 1.6,
    "className": "site-dialog-description",
    "usage": "대화·알림 내용"
  },
  {
    "key": "price",
    "label": "대표 가격",
    "mobile": 32,
    "tablet": 44,
    "desktop": 44,
    "weight": 900,
    "lineHeight": 1.1,
    "className": "type-price",
    "usage": "첨부 화면의 월 이용료 숫자"
  },
  {
    "key": "price-compact",
    "label": "작은 가격",
    "mobile": 28,
    "tablet": 32,
    "desktop": 32,
    "weight": 700,
    "lineHeight": 1.25,
    "className": "type-price-compact",
    "usage": "신청 요약·작은 요금 카드"
  },
  {
    "key": "metric",
    "label": "통계 수치",
    "mobile": 24,
    "tablet": 24,
    "desktop": 32,
    "weight": 700,
    "lineHeight": 1.25,
    "className": "type-metric",
    "usage": "관리 화면의 핵심 수치"
  }
] as const;

export function siteTypeSizeCss(pixels: number): string {
  const nearest = SITE_TYPE_STEPS.reduce<number>((best, size) => Math.abs(size - pixels) < Math.abs(best - pixels) ? size : best, SITE_TYPE_STEPS[0]);
  return `var(--site-type-${nearest})`;
}
