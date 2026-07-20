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

function customWidgetBlock(
  id: string,
  sortOrder: number,
  widget: Extract<CafeAContentBlock, { blockType: "widget" }>["widget"],
  visible = true,
): CafeAContentBlock {
  return {
    id,
    blockType: "widget",
    sortOrder,
    visible,
    widget,
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

export type CafeABalancedContentBlockLabFixture = {
  id: string;
  title: string;
  description: string;
  blocks: readonly CafeAContentBlock[];
  columns?: number;
};

export type CafeAOrderedContentBlockLabFixture = CafeABalancedContentBlockLabFixture & {
  heightPx?: number;
};

export const CAFE_A_BALANCED_CONTENT_BLOCK_LAB_FIXTURES: CafeABalancedContentBlockLabFixture[] = [
  {
    id: "balanced-mixed-three-column",
    title: "기본 3열 혼합",
    description: "SIGNATURE, 2:1 이미지, CLASSIC, 긴 text, ADE, 4:3 image+text, DESSERT 순서를 유지합니다.",
    blocks: CAFE_A_CONTENT_BLOCK_MIXED_FIXTURE,
    columns: 3,
  },
  {
    id: "balanced-vertical-widget",
    title: "3:4 위젯 포함",
    description: "세로형 이미지 위젯을 높은 atomic block으로 계산해 category와 함께 배치합니다.",
    blocks: CAFE_A_CONTENT_BLOCK_VERTICAL_EMPHASIS_FIXTURE,
    columns: 3,
  },
  {
    id: "balanced-long-text-widget",
    title: "긴 text 위젯",
    description: "긴 본문 text widget이 단순 고정 weight가 아니라 실제 높이 후보로 반영되는지 확인합니다.",
    blocks: [
      categoryBlock("long-text-signature", 10, SIGNATURE_CATEGORY),
      widgetBlock("long-text-widget", 20, 1),
      categoryBlock("long-text-classic", 30, CLASSIC_CATEGORY),
      categoryBlock("long-text-ade", 40, ADE_CATEGORY),
      categoryBlock("long-text-dessert", 50, DESSERT_CATEGORY),
    ],
    columns: 3,
  },
  {
    id: "balanced-consecutive-widgets",
    title: "연속 widget 3개",
    description: "연속 위젯도 source 순서를 섞지 않고 column break만 선택합니다.",
    blocks: CAFE_A_CONTENT_BLOCK_CONSECUTIVE_WIDGET_FIXTURE,
    columns: 3,
  },
  {
    id: "balanced-widget-first",
    title: "widget first",
    description: "첫 block이 widget이어도 다음 category와 같은 atomic flow로 배치합니다.",
    blocks: CAFE_A_CONTENT_BLOCK_WIDGET_FIRST_FIXTURE,
    columns: 3,
  },
  {
    id: "balanced-widget-last",
    title: "widget last",
    description: "마지막 block이 widget이면 widget 자체 border만 유지하고 category divider를 만들지 않습니다.",
    blocks: CAFE_A_CONTENT_BLOCK_WIDGET_LAST_FIXTURE,
    columns: 3,
  },
  {
    id: "balanced-category-last",
    title: "category last",
    description: "column 마지막 category 아래 divider가 제거되는지 확인합니다.",
    blocks: CAFE_A_CONTENT_BLOCK_CATEGORY_LAST_FIXTURE,
    columns: 3,
  },
  {
    id: "balanced-footer-near-image-text",
    title: "footer 근처 image_text",
    description: "image_text widget과 하단 안내 영역의 no-go 충돌 여부를 진단합니다.",
    blocks: [
      categoryBlock("footer-signature", 10, SIGNATURE_CATEGORY),
      categoryBlock("footer-classic", 20, CLASSIC_CATEGORY),
      widgetBlock("footer-image-text", 30, 2),
      categoryBlock("footer-ade", 40, ADE_CATEGORY),
      categoryBlock("footer-dessert", 50, DESSERT_CATEGORY),
    ],
    columns: 3,
  },
  {
    id: "balanced-hidden-and-tie",
    title: "visible=false + 동일 sortOrder",
    description: "숨김 block은 제외하고 같은 sortOrder는 원본 배열 순서를 유지합니다.",
    blocks: CAFE_A_CONTENT_BLOCK_HIDDEN_AND_TIE_FIXTURE,
    columns: 3,
  },
];

export const CAFE_A_ORDERED_CONTENT_BLOCK_LAB_FIXTURES: CafeAOrderedContentBlockLabFixture[] = [
  {
    id: "ordered-mixed-basic",
    title: "A. 기본 혼합",
    description: "SIGNATURE, 2:1 이미지, CLASSIC, text, ADE, 4:3 image+text, DESSERT 순서로 CSS multi-column에 흘립니다.",
    blocks: CAFE_A_CONTENT_BLOCK_MIXED_FIXTURE,
    columns: 3,
  },
  {
    id: "ordered-widget-first",
    title: "B. widget first",
    description: "첫 block이 widget이어도 source order와 다음 category divider가 유지됩니다.",
    blocks: CAFE_A_CONTENT_BLOCK_WIDGET_FIRST_FIXTURE,
    columns: 3,
  },
  {
    id: "ordered-widget-last",
    title: "C. widget last",
    description: "마지막 block이 widget이면 widget 자체 border만 유지하고 category divider는 추가하지 않습니다.",
    blocks: CAFE_A_CONTENT_BLOCK_WIDGET_LAST_FIXTURE,
    columns: 3,
  },
  {
    id: "ordered-consecutive-widgets",
    title: "D. 연속 widget 3개",
    description: "연속 widget이 각각 atomic block으로 다음 column으로 이동 가능한지 확인합니다.",
    blocks: CAFE_A_CONTENT_BLOCK_CONSECUTIVE_WIDGET_FIXTURE,
    columns: 3,
  },
  {
    id: "ordered-category-widget-category",
    title: "E. category → widget → category",
    description: "category 종료 divider 뒤에 widget이 오고, widget 뒤에는 별도 divider 없이 다음 category가 이어집니다.",
    blocks: [
      categoryBlock("ordered-cwc-signature", 10, SIGNATURE_CATEGORY),
      widgetBlock("ordered-cwc-image", 20, 0),
      categoryBlock("ordered-cwc-classic", 30, CLASSIC_CATEGORY),
    ],
    columns: 3,
  },
  {
    id: "ordered-long-text-widget",
    title: "F. 긴 text widget",
    description: "긴 text widget도 쪼개지지 않고 하나의 atomic block으로 유지되는지 확인합니다.",
    blocks: [
      categoryBlock("ordered-long-signature", 10, SIGNATURE_CATEGORY),
      widgetBlock("ordered-long-text", 20, 1),
      categoryBlock("ordered-long-classic", 30, CLASSIC_CATEGORY),
      categoryBlock("ordered-long-ade", 40, ADE_CATEGORY),
      categoryBlock("ordered-long-dessert", 50, DESSERT_CATEGORY),
    ],
    columns: 3,
  },
  {
    id: "ordered-image-3-4",
    title: "G. 3:4 image widget",
    description: "세로형 이미지 widget이 column 중간에서 분할되지 않고 통째로 이동하는지 확인합니다.",
    blocks: CAFE_A_CONTENT_BLOCK_VERTICAL_EMPHASIS_FIXTURE,
    columns: 3,
  },
  {
    id: "ordered-image-text-3-4",
    title: "H. image_text 3:4",
    description: "3:4 media와 텍스트 copy가 서로 다른 column으로 갈라지지 않는지 확인합니다.",
    blocks: [
      categoryBlock("ordered-image-text-signature", 10, SIGNATURE_CATEGORY),
      customWidgetBlock("ordered-image-text-vertical", 20, CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES[1]),
      categoryBlock("ordered-image-text-classic", 30, CLASSIC_CATEGORY),
    ],
    columns: 3,
  },
  {
    id: "ordered-missing-image",
    title: "I. 이미지 누락 fallback",
    description: "이미지가 없는 image_text fallback도 고정 ratio 영역과 copy를 유지합니다.",
    blocks: [
      categoryBlock("ordered-missing-signature", 10, SIGNATURE_CATEGORY),
      customWidgetBlock("ordered-missing-widget", 20, CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES[2]),
      categoryBlock("ordered-missing-dessert", 30, DESSERT_CATEGORY),
    ],
    columns: 3,
  },
  {
    id: "ordered-footer-near-widget",
    title: "J. footer 근처 widget",
    description: "하단 안내 영역 근처에 widget이 놓여도 visible leaf가 no-go에 들어가지 않는지 진단합니다.",
    blocks: [
      categoryBlock("ordered-footer-signature", 10, SIGNATURE_CATEGORY),
      categoryBlock("ordered-footer-classic", 20, CLASSIC_CATEGORY),
      categoryBlock("ordered-footer-ade", 30, ADE_CATEGORY),
      customWidgetBlock("ordered-footer-image-text", 40, CAFE_A_WIDGET_IMAGE_TEXT_FIXTURES[0]),
      categoryBlock("ordered-footer-dessert", 50, DESSERT_CATEGORY),
    ],
    columns: 3,
  },
  {
    id: "ordered-hidden-block",
    title: "K. hidden block",
    description: "visible=false category/widget은 orderedFit source flow에서 제외됩니다.",
    blocks: CAFE_A_CONTENT_BLOCK_HIDDEN_AND_TIE_FIXTURE,
    columns: 3,
  },
  {
    id: "ordered-same-sort-order",
    title: "L. same sortOrder",
    description: "동일 sortOrder에서는 원본 배열 순서를 안정적으로 유지합니다.",
    blocks: [
      categoryBlock("ordered-tie-category-first", 10, SIGNATURE_CATEGORY),
      widgetBlock("ordered-tie-widget-second", 10, 0),
      categoryBlock("ordered-tie-category-third", 10, DESSERT_CATEGORY),
    ],
    columns: 3,
  },
];
