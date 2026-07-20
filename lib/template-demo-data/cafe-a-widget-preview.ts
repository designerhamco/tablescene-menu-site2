import type { CafeAWidgetPreview } from "@/components/menu-templates/CafeAWidgetBlock";

const MATCHA_IMAGE = "/menu-templates/cafe_design_a/malcha.jpg";
const MATCHA_PRESENT_IMAGE = "/menu-templates/cafe_design_a/malcha_present.jpg";
const NUTTY_IMAGE = "/menu-templates/cafe_design_a/nutty-cream.jpeg";
const BLACK_SESAME_IMAGE = "/menu-templates/cafe_design_a/black-sesame.jpeg";
const NUTTY_FEATURED_IMAGE = "/menu-templates/cafe_design_a/nutty-cream-featured.jpg";

export const CAFE_A_WIDGET_TYPE_FIXTURES: CafeAWidgetPreview[] = [
  {
    id: "widget-type-image",
    type: "image",
    visible: true,
    imageUrl: MATCHA_IMAGE,
    altText: "제주 말차 크림 라떼",
    aspectRatio: "4:3",
    objectFit: "cover",
  },
  {
    id: "widget-type-text",
    type: "text",
    visible: true,
    title: "오늘의 원두",
    body: "고소한 블렌드와 산뜻한 싱글오리진을 준비했습니다.",
    textAlign: "left",
  },
  {
    id: "widget-type-image-text",
    type: "image_text",
    visible: true,
    imageUrl: NUTTY_IMAGE,
    altText: "너티 크림 라떼",
    title: "모닝 크림 라떼",
    body: "오전 시간에는 부드러운 크림 라떼를 조금 더 가볍게 즐겨보세요.",
    aspectRatio: "4:3",
    objectFit: "cover",
    textAlign: "left",
  },
];

export const CAFE_A_WIDGET_RATIO_FIXTURES: CafeAWidgetPreview[] = [
  {
    id: "widget-ratio-2-1-cover",
    type: "image",
    visible: true,
    imageUrl: MATCHA_PRESENT_IMAGE,
    altText: "말차 라떼 대표 이미지",
    aspectRatio: "2:1",
    objectFit: "cover",
  },
  {
    id: "widget-ratio-3-2-contain",
    type: "image",
    visible: true,
    imageUrl: BLACK_SESAME_IMAGE,
    altText: "흑임자 크림 라떼",
    aspectRatio: "3:2",
    objectFit: "contain",
  },
  {
    id: "widget-ratio-1-1",
    type: "image",
    visible: true,
    imageUrl: NUTTY_IMAGE,
    altText: "너티 크림 라떼",
    aspectRatio: "1:1",
    objectFit: "cover",
  },
  {
    id: "widget-ratio-3-4",
    type: "image",
    visible: true,
    imageUrl: NUTTY_FEATURED_IMAGE,
    altText: "너티 크림 라떼 세로 이미지",
    aspectRatio: "3:4",
    objectFit: "cover",
  },
];

export const CAFE_A_WIDGET_TEXT_FIXTURES: CafeAWidgetPreview[] = [
  {
    id: "widget-text-short",
    type: "text",
    visible: true,
    title: "매장 이용 안내",
    body: "외부 음식 반입은 어렵습니다. 사용하신 트레이는 반납대에 놓아주세요.",
    textAlign: "left",
  },
  {
    id: "widget-text-titleless",
    type: "text",
    visible: true,
    title: "",
    body: "오전 8시부터 10시까지 아메리카노 모닝딜을 운영합니다.",
    textAlign: "left",
  },
  {
    id: "widget-text-long",
    type: "text",
    visible: true,
    title: "원두 선택",
    body: "기본 블렌드는 고소한 견과류 향이 중심입니다. 산뜻한 싱글오리진이나 디카페인 변경도 가능하며, 원두 재고에 따라 제공 구성이 달라질 수 있습니다.",
    textAlign: "left",
  },
  {
    id: "widget-text-center",
    type: "text",
    visible: true,
    title: "AUBE COFFEE",
    body: "Fresh cream latte · Signature tea · Daily bakery",
    textAlign: "center",
  },
];

export const CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES: CafeAWidgetPreview[] = [
  {
    id: "widget-image-text-4-3",
    type: "image_text",
    visible: true,
    imageUrl: BLACK_SESAME_IMAGE,
    altText: "흑임자 크림 라떼",
    title: "흑임자 크림 라떼",
    body: "깊고 고소한 흑임자 크림을 더한 부드러운 라떼입니다.",
    aspectRatio: "4:3",
    objectFit: "cover",
    textAlign: "left",
  },
  {
    id: "widget-image-text-3-4",
    type: "image_text",
    visible: true,
    imageUrl: MATCHA_PRESENT_IMAGE,
    altText: "제주 말차 크림 라떼",
    title: "시그니처 말차",
    body: "진한 제주 말차와 부드러운 크림을 올린 시즌 추천 메뉴입니다.",
    aspectRatio: "3:4",
    objectFit: "cover",
    textAlign: "left",
  },
  {
    id: "widget-image-text-missing",
    type: "image_text",
    visible: true,
    imageUrl: null,
    altText: "이미지 준비 중",
    title: "이미지 없는 안내",
    body: "이미지가 없어도 위젯 높이와 텍스트 흐름이 안정적으로 유지됩니다.",
    aspectRatio: "4:3",
    objectFit: "cover",
    textAlign: "center",
  },
];

export const CAFE_A_WIDGET_CONSECUTIVE_FIXTURES: CafeAWidgetPreview[] = [
  CAFE_A_WIDGET_TEXT_FIXTURES[0],
  CAFE_A_WIDGET_RATIO_FIXTURES[0],
  CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES[0],
];

export const CAFE_A_WIDGET_ALL_FIXTURES: CafeAWidgetPreview[] = [
  ...CAFE_A_WIDGET_TYPE_FIXTURES,
  ...CAFE_A_WIDGET_RATIO_FIXTURES,
  ...CAFE_A_WIDGET_TEXT_FIXTURES,
  ...CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES,
  {
    id: "widget-hidden",
    type: "text",
    visible: false,
    title: "숨김 위젯",
    body: "이 위젯은 렌더링되면 안 됩니다.",
    textAlign: "left",
  },
];
