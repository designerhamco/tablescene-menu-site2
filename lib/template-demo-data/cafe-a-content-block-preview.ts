import type { CafeAContentBlock, CafeACategoryPreviewBlock } from "@/components/menu-templates/cafe-a-content-blocks";
import {
  CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES,
  CAFE_A_WIDGET_RATIO_FIXTURES,
  CAFE_A_WIDGET_TEXT_FIXTURES,
} from "@/lib/template-demo-data/cafe-a-widget-preview";

const SIGNATURE_CATEGORY: CafeACategoryPreviewBlock["category"] = {
  id: "preview-category-signature",
  name: "SIGNATURE COFFEE",
  items: [
    {
      id: "preview-item-matcha",
      name: "제주 말차 크림 라떼",
      secondaryName: "JEJU MATCHA CREAM LATTE",
      description: "진한 제주 말차와 부드러운 크림을 올린 시그니처 라떼",
      priceLabel: "5.8",
    },
    {
      id: "preview-item-nutty",
      name: "너티 크림 라떼",
      secondaryName: "NUTTY CREAM LATTE",
      description: "고소한 견과류 크림과 에스프레소가 어우러진 라떼",
      priceLabel: "5.5",
    },
  ],
};

const CLASSIC_CATEGORY: CafeACategoryPreviewBlock["category"] = {
  id: "preview-category-classic",
  name: "CLASSIC COFFEE",
  description: "원두 선택: 고소한 블렌드 / 산뜻한 싱글오리진",
  items: [
    {
      id: "preview-item-americano",
      name: "아메리카노",
      secondaryName: "AMERICANO",
      description: "깔끔한 산미와 고소한 밸런스",
      priceLabel: "3.5",
    },
    {
      id: "preview-item-latte",
      name: "카페 라떼",
      secondaryName: "CAFE LATTE",
      description: "부드러운 우유와 에스프레소",
      priceLabel: "4.0",
    },
  ],
};

const ADE_CATEGORY: CafeACategoryPreviewBlock["category"] = {
  id: "preview-category-ade",
  name: "ADE",
  items: [
    {
      id: "preview-item-lemon-basil",
      name: "레몬 바질 에이드",
      secondaryName: "LEMON BASIL ADE",
      description: "생레몬즙과 바질의 청량함",
      priceLabel: "5.5",
    },
    {
      id: "preview-item-grapefruit",
      name: "자몽 에이드",
      secondaryName: "GRAPEFRUIT ADE",
      description: "자몽 과육과 탄산의 산뜻한 조화",
      priceLabel: "5.3",
    },
  ],
};

const DESSERT_CATEGORY: CafeACategoryPreviewBlock["category"] = {
  id: "preview-category-dessert",
  name: "DESSERT",
  items: [
    {
      id: "preview-item-cheesecake",
      name: "흑임자 바스크 치즈케이크",
      secondaryName: "BLACK SESAME BASQUE CHEESECAKE",
      description: "진한 흑임자 크림치즈 케이크",
      priceLabel: "6.2",
    },
    {
      id: "preview-item-tiramisu",
      name: "티라미수",
      secondaryName: "TIRAMISU",
      description: "마스카포네 크림과 커피 향",
      priceLabel: "5.8",
    },
  ],
};

function categoryBlock(id: string, sortOrder: number, category: CafeACategoryPreviewBlock["category"], visible = true): CafeAContentBlock {
  return {
    id,
    blockType: "category",
    sortOrder,
    visible,
    category,
  };
}

function widgetBlock(id: string, sortOrder: number, widgetIndex: number, visible = true): CafeAContentBlock {
  return {
    id,
    blockType: "widget",
    sortOrder,
    visible,
    widget: [
      CAFE_A_WIDGET_RATIO_FIXTURES[0],
      CAFE_A_WIDGET_TEXT_FIXTURES[2],
      CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES[0],
      CAFE_A_WIDGET_RATIO_FIXTURES[3],
    ][widgetIndex],
  };
}

export const CAFE_A_CONTENT_BLOCK_MIXED_FIXTURE: CafeAContentBlock[] = [
  categoryBlock("mixed-signature", 10, SIGNATURE_CATEGORY),
  widgetBlock("mixed-image-widget", 20, 0),
  categoryBlock("mixed-classic", 30, CLASSIC_CATEGORY),
  widgetBlock("mixed-text-widget", 40, 1),
  categoryBlock("mixed-ade", 50, ADE_CATEGORY),
  widgetBlock("mixed-image-text-widget", 60, 2),
  categoryBlock("mixed-dessert", 70, DESSERT_CATEGORY),
];

export const CAFE_A_CONTENT_BLOCK_WIDGET_FIRST_FIXTURE: CafeAContentBlock[] = [
  widgetBlock("widget-first-image", 10, 0),
  categoryBlock("widget-first-signature", 20, SIGNATURE_CATEGORY),
  categoryBlock("widget-first-classic", 30, CLASSIC_CATEGORY),
];

export const CAFE_A_CONTENT_BLOCK_WIDGET_LAST_FIXTURE: CafeAContentBlock[] = [
  categoryBlock("widget-last-signature", 10, SIGNATURE_CATEGORY),
  categoryBlock("widget-last-classic", 20, CLASSIC_CATEGORY),
  widgetBlock("widget-last-image-text", 30, 2),
];

export const CAFE_A_CONTENT_BLOCK_CONSECUTIVE_WIDGET_FIXTURE: CafeAContentBlock[] = [
  categoryBlock("consecutive-signature", 10, SIGNATURE_CATEGORY),
  widgetBlock("consecutive-image", 20, 0),
  widgetBlock("consecutive-text", 30, 1),
  widgetBlock("consecutive-image-text", 40, 2),
  categoryBlock("consecutive-dessert", 50, DESSERT_CATEGORY),
];

export const CAFE_A_CONTENT_BLOCK_CATEGORY_LAST_FIXTURE: CafeAContentBlock[] = [
  widgetBlock("category-last-image", 10, 0),
  categoryBlock("category-last-signature", 20, SIGNATURE_CATEGORY),
  categoryBlock("category-last-dessert", 30, DESSERT_CATEGORY),
];

export const CAFE_A_CONTENT_BLOCK_HIDDEN_AND_TIE_FIXTURE: CafeAContentBlock[] = [
  categoryBlock("hidden-category", 5, ADE_CATEGORY, false),
  widgetBlock("hidden-widget", 6, 1, false),
  categoryBlock("tie-category-first", 10, SIGNATURE_CATEGORY),
  widgetBlock("tie-widget-second", 10, 0),
  categoryBlock("tie-category-third", 10, DESSERT_CATEGORY),
];

export const CAFE_A_CONTENT_BLOCK_VERTICAL_EMPHASIS_FIXTURE: CafeAContentBlock[] = [
  categoryBlock("vertical-signature", 10, SIGNATURE_CATEGORY),
  widgetBlock("vertical-image", 20, 3),
  categoryBlock("vertical-dessert", 30, DESSERT_CATEGORY),
];

export const CAFE_A_CONTENT_BLOCK_TERMINAL_DIVIDER_NOTICE =
  "모바일 정책 검토용: 마지막 카테고리에도 divider를 표시했을 때 footer와 이어지는 리듬을 확인합니다.";

export const CAFE_A_CONTENT_BLOCK_VERTICAL_NOTICE =
  "3:4 세로 위젯은 메뉴 열에서 높은 비중을 차지하므로 강조 콘텐츠에 제한적으로 사용하는 비율입니다.";
