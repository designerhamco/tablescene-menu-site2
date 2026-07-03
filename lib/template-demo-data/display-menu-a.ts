import type { MenuPageData } from "@/lib/menu-page-data";
import { DEFAULT_ENABLED_LOCALES, DEFAULT_LOCALE } from "@/lib/locales";
import {
  DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
  DEFAULT_PROMOTION_PAGE_DISPLAY_SETTINGS,
  serializeMenuPageDisplaySettings,
} from "@/lib/display-page-settings";
import { getDefaultPageSettings } from "@/types/menu";

const now = "2026-06-03T00:00:00.000Z";
const siteId = "template-preview-display-menu-a";
const summerBlueSeasonPromoImageUrl = "/menu-templates/display_menu_a/summer-blue-season-promo.png";
const summerBlueSignatureImageUrl = "/menu-templates/display_menu_a/summer-blue-signature.png";
const summerBlueDessertPromoVideoUrl = "/menu-templates/display_menu_a/summer-blue-dessert-promo.mp4";

function pageId(index: number) {
  return `${siteId}-page-${index}`;
}

function menuPageIdForDemoIndex(index: number) {
  if (index === 0) return pageId(2);
  if (index === 1) return pageId(1);
  return pageId(index);
}

function categoryId(pageIndex: number, categoryIndex: number) {
  return `${siteId}-category-${pageIndex}-${categoryIndex}`;
}

function itemId(pageIndex: number, categoryIndex: number, itemIndex: number) {
  return `${siteId}-item-${pageIndex}-${categoryIndex}-${itemIndex}`;
}

function priceOptionId(pageIndex: number, categoryIndex: number, itemIndex: number, optionIndex: number) {
  return `${itemId(pageIndex, categoryIndex, itemIndex)}-price-option-${optionIndex}`;
}

type DemoCategory = {
  pageIndex: number;
  categoryIndex: number;
  name: string;
  sortOrder: number;
};

type DemoOption = {
  label: string;
  priceLabel: string;
  sortOrder: number;
};

type DemoItem = {
  pageIndex: number;
  categoryIndex: number;
  itemIndex: number;
  name: string;
  setName: string;
  priceLabel: string;
  sortOrder: number;
  badge?: "SIGNATURE" | "BEST" | "NEW";
  recommended?: boolean;
  options?: DemoOption[];
};

export type DisplayMenuAQaCase =
  | "sparse_1"
  | "sparse_2"
  | "sparse"
  | "sparse_2cat"
  | "recommended"
  | "filled"
  | "dense"
  | "autoSplit"
  | "capacity_warning"
  | "capacity_strong"
  | "category_heavy"
  | "extreme_fit"
  | "longSecondary"
  | "unbalanced_left"
  | "unbalanced_right";

const DISPLAY_MENU_A_QA_CASES = new Set<DisplayMenuAQaCase>([
  "sparse_1",
  "sparse_2",
  "sparse",
  "sparse_2cat",
  "recommended",
  "filled",
  "dense",
  "autoSplit",
  "capacity_warning",
  "capacity_strong",
  "category_heavy",
  "extreme_fit",
  "longSecondary",
  "unbalanced_left",
  "unbalanced_right",
]);

const fullCategories: DemoCategory[] = [
  { pageIndex: 0, categoryIndex: 0, name: "SIGNATURE COFFEE", sortOrder: 1 },
  { pageIndex: 0, categoryIndex: 1, name: "CLASSIC COFFEE", sortOrder: 2 },
  { pageIndex: 0, categoryIndex: 2, name: "NON-COFFEE", sortOrder: 3 },
  { pageIndex: 0, categoryIndex: 3, name: "BAKERY", sortOrder: 4 },
];

const splitCategories: DemoCategory[] = [
  { pageIndex: 1, categoryIndex: 0, name: "FRESH ADE & JUICE", sortOrder: 1 },
  { pageIndex: 1, categoryIndex: 1, name: "SUMMER TEA", sortOrder: 2 },
];

function hotIce(hot: string, ice: string): DemoOption[] {
  return [
    { label: "HOT", priceLabel: hot, sortOrder: 1 },
    { label: "ICE", priceLabel: ice, sortOrder: 2 },
  ];
}

function hotIceLarge(hot: string, ice: string, large: string): DemoOption[] {
  return [
    { label: "HOT", priceLabel: hot, sortOrder: 1 },
    { label: "ICE", priceLabel: ice, sortOrder: 2 },
    { label: "LARGE", priceLabel: large, sortOrder: 3 },
  ];
}

function iceOnly(ice: string): DemoOption[] {
  return [{ label: "ICE", priceLabel: ice, sortOrder: 2 }];
}

function priceFromLabel(priceLabel: string) {
  const parsed = Number.parseFloat(priceLabel.replace(/,/g, ""));
  return Number.isFinite(parsed) ? Math.round(parsed * 1000) : 0;
}

export function normalizeDisplayMenuAQaCase(value: string | null | undefined): DisplayMenuAQaCase | null {
  return value && DISPLAY_MENU_A_QA_CASES.has(value as DisplayMenuAQaCase) ? (value as DisplayMenuAQaCase) : null;
}

const fullItems: DemoItem[] = [
  {
    pageIndex: 0,
    categoryIndex: 0,
    itemIndex: 0,
    name: "바질 크림 라떼",
    setName: "BASIL CREAM LATTE",
    priceLabel: "6.5",
    sortOrder: 1,
    badge: "SIGNATURE",
    recommended: true,
    options: iceOnly("6.5"),
  },
  {
    pageIndex: 0,
    categoryIndex: 0,
    itemIndex: 1,
    name: "오트 너티 라떼",
    setName: "OAT NUTTY LATTE",
    priceLabel: "6.5",
    sortOrder: 2,
    badge: "BEST",
    recommended: true,
    options: hotIce("6.5", "6.5"),
  },
  {
    pageIndex: 0,
    categoryIndex: 0,
    itemIndex: 2,
    name: "바닐라빈 슈페너",
    setName: "VANILLA BEAN EINSPANNER",
    priceLabel: "6.4",
    sortOrder: 3,
    badge: "BEST",
    recommended: true,
    options: iceOnly("6.4"),
  },
  {
    pageIndex: 0,
    categoryIndex: 0,
    itemIndex: 3,
    name: "솔티드 카라멜 라떼",
    setName: "SALTED CARAMEL LATTE",
    priceLabel: "6.0",
    sortOrder: 4,
    options: hotIce("6.0", "6.0"),
  },
  {
    pageIndex: 0,
    categoryIndex: 0,
    itemIndex: 4,
    name: "콜드브루 크림",
    setName: "COLD BREW CREAM",
    priceLabel: "6.2",
    sortOrder: 5,
    options: iceOnly("6.2"),
  },
  {
    pageIndex: 0,
    categoryIndex: 0,
    itemIndex: 5,
    name: "흑임자 아인슈페너",
    setName: "BLACK SESAME EINSPANNER",
    priceLabel: "6.7",
    sortOrder: 6,
    badge: "NEW",
    options: iceOnly("6.7"),
  },
  {
    pageIndex: 0,
    categoryIndex: 1,
    itemIndex: 0,
    name: "아메리카노",
    setName: "AMERICANO",
    priceLabel: "4.5",
    sortOrder: 1,
    options: hotIce("4.5", "4.5"),
  },
  {
    pageIndex: 0,
    categoryIndex: 1,
    itemIndex: 1,
    name: "카페 라떼",
    setName: "CAFE LATTE",
    priceLabel: "5.0",
    sortOrder: 2,
    options: hotIce("5.0", "5.0"),
  },
  {
    pageIndex: 0,
    categoryIndex: 1,
    itemIndex: 2,
    name: "플랫 화이트",
    setName: "FLAT WHITE",
    priceLabel: "5.0",
    sortOrder: 3,
    options: hotIce("5.0", "5.0"),
  },
  {
    pageIndex: 0,
    categoryIndex: 1,
    itemIndex: 3,
    name: "바닐라 빈 라떼",
    setName: "VANILLA BEAN LATTE",
    priceLabel: "5.5",
    sortOrder: 4,
    options: hotIce("5.5", "5.5"),
  },
  {
    pageIndex: 0,
    categoryIndex: 1,
    itemIndex: 4,
    name: "카푸치노",
    setName: "CAPPUCCINO",
    priceLabel: "5.0",
    sortOrder: 5,
    options: [{ label: "HOT", priceLabel: "5.0", sortOrder: 1 }],
  },
  {
    pageIndex: 0,
    categoryIndex: 1,
    itemIndex: 5,
    name: "콜드브루",
    setName: "COLD BREW",
    priceLabel: "5.0",
    sortOrder: 6,
    options: iceOnly("5.0"),
  },
  {
    pageIndex: 0,
    categoryIndex: 2,
    itemIndex: 0,
    name: "제주 말차 라떼",
    setName: "JEJU MATCHA LATTE",
    priceLabel: "6.0",
    sortOrder: 1,
    badge: "BEST",
    recommended: true,
    options: hotIce("6.0", "6.0"),
  },
  {
    pageIndex: 0,
    categoryIndex: 2,
    itemIndex: 1,
    name: "말차 에스프레소",
    setName: "MATCHA ESPRESSO",
    priceLabel: "6.3",
    sortOrder: 2,
    options: iceOnly("6.3"),
  },
  {
    pageIndex: 0,
    categoryIndex: 2,
    itemIndex: 2,
    name: "발로나 초코 라떼",
    setName: "VALRHONA CHOCO LATTE",
    priceLabel: "6.0",
    sortOrder: 3,
    options: hotIce("6.0", "6.0"),
  },
  {
    pageIndex: 0,
    categoryIndex: 2,
    itemIndex: 3,
    name: "딸기 라떼",
    setName: "STRAWBERRY LATTE",
    priceLabel: "6.5",
    sortOrder: 4,
    badge: "NEW",
    options: iceOnly("6.5"),
  },
  {
    pageIndex: 0,
    categoryIndex: 2,
    itemIndex: 4,
    name: "흑임자 크림 라떼",
    setName: "BLACK SESAME LATTE",
    priceLabel: "6.5",
    sortOrder: 5,
    options: iceOnly("6.5"),
  },
  {
    pageIndex: 0,
    categoryIndex: 2,
    itemIndex: 5,
    name: "초당옥수수 라떼",
    setName: "SWEET CORN LATTE",
    priceLabel: "6.4",
    sortOrder: 6,
    badge: "NEW",
    options: iceOnly("6.4"),
  },
  {
    pageIndex: 0,
    categoryIndex: 2,
    itemIndex: 6,
    name: "로얄 밀크티",
    setName: "ROYAL MILK TEA",
    priceLabel: "5.8",
    sortOrder: 7,
    options: hotIce("5.8", "5.8"),
  },
  {
    pageIndex: 0,
    categoryIndex: 2,
    itemIndex: 7,
    name: "밀크티 보틀",
    setName: "MILK TEA BOTTLE",
    priceLabel: "6.5",
    sortOrder: 8,
    options: iceOnly("6.5"),
  },
  {
    pageIndex: 0,
    categoryIndex: 3,
    itemIndex: 0,
    name: "클래식 버터 스콘",
    setName: "CLASSIC BUTTER SCONE",
    priceLabel: "4.5",
    sortOrder: 1,
  },
  {
    pageIndex: 0,
    categoryIndex: 3,
    itemIndex: 1,
    name: "무화과 휘낭시에",
    setName: "FIG FINANCIER",
    priceLabel: "3.5",
    sortOrder: 2,
  },
  {
    pageIndex: 0,
    categoryIndex: 3,
    itemIndex: 2,
    name: "솔티 초코 휘낭시에",
    setName: "SALTY CHOCO FINANCIER",
    priceLabel: "3.8",
    sortOrder: 3,
    badge: "NEW",
  },
  {
    pageIndex: 0,
    categoryIndex: 3,
    itemIndex: 3,
    name: "바스크 치즈케이크",
    setName: "BASQUE CHEESECAKE",
    priceLabel: "7.2",
    sortOrder: 4,
    badge: "BEST",
    recommended: true,
  },
];

const splitItems: DemoItem[] = [
  {
    pageIndex: 1,
    categoryIndex: 0,
    itemIndex: 0,
    name: "자몽 허니 에이드",
    setName: "GRAPEFRUIT HONEY ADE",
    priceLabel: "6.2",
    sortOrder: 1,
    badge: "BEST",
    recommended: true,
  },
  {
    pageIndex: 1,
    categoryIndex: 0,
    itemIndex: 1,
    name: "청포도 라임 에이드",
    setName: "GREEN GRAPE LIME ADE",
    priceLabel: "6.3",
    sortOrder: 2,
    badge: "NEW",
    recommended: true,
  },
  {
    pageIndex: 1,
    categoryIndex: 0,
    itemIndex: 2,
    name: "레몬 바질 에이드",
    setName: "LEMON BASIL ADE",
    priceLabel: "6.0",
    sortOrder: 3,
    badge: "SIGNATURE",
    recommended: true,
  },
  {
    pageIndex: 1,
    categoryIndex: 0,
    itemIndex: 3,
    name: "제주 한라봉 주스",
    setName: "JEJU HALLABONG JUICE",
    priceLabel: "6.5",
    sortOrder: 4,
  },
  {
    pageIndex: 1,
    categoryIndex: 0,
    itemIndex: 4,
    name: "수박 민트 주스",
    setName: "WATERMELON MINT JUICE",
    priceLabel: "6.4",
    sortOrder: 5,
    badge: "NEW",
    recommended: true,
  },
  {
    pageIndex: 1,
    categoryIndex: 0,
    itemIndex: 5,
    name: "블루베리 요거트 스무디",
    setName: "BLUEBERRY YOGURT SMOOTHIE",
    priceLabel: "6.8",
    sortOrder: 6,
  },
  {
    pageIndex: 1,
    categoryIndex: 0,
    itemIndex: 6,
    name: "망고 패션 스무디",
    setName: "MANGO PASSION SMOOTHIE",
    priceLabel: "6.8",
    sortOrder: 7,
  },
  {
    pageIndex: 1,
    categoryIndex: 1,
    itemIndex: 0,
    name: "복숭아 아이스티",
    setName: "PEACH ICED TEA",
    priceLabel: "5.8",
    sortOrder: 1,
  },
  {
    pageIndex: 1,
    categoryIndex: 1,
    itemIndex: 1,
    name: "애플 히비스커스 티",
    setName: "APPLE HIBISCUS TEA",
    priceLabel: "5.9",
    sortOrder: 2,
  },
  {
    pageIndex: 1,
    categoryIndex: 1,
    itemIndex: 2,
    name: "유자 캐모마일 티",
    setName: "YUJA CHAMOMILE TEA",
    priceLabel: "5.8",
    sortOrder: 3,
  },
  {
    pageIndex: 1,
    categoryIndex: 1,
    itemIndex: 3,
    name: "패션후르츠 블랙티",
    setName: "PASSION FRUIT BLACK TEA",
    priceLabel: "6.1",
    sortOrder: 4,
    badge: "BEST",
    recommended: true,
  },
  {
    pageIndex: 1,
    categoryIndex: 1,
    itemIndex: 4,
    name: "자두 얼그레이 티",
    setName: "PLUM EARL GREY TEA",
    priceLabel: "6.2",
    sortOrder: 5,
    badge: "NEW",
  },
];

function buildCategory(category: DemoCategory) {
  return {
    id: categoryId(category.pageIndex, category.categoryIndex),
    menu_page_id: menuPageIdForDemoIndex(category.pageIndex),
    name: category.name,
    description: null,
    description_visible: false,
    sort_order: category.sortOrder,
    visible: true,
  };
}

function buildItem(item: DemoItem) {
  return {
    id: itemId(item.pageIndex, item.categoryIndex, item.itemIndex),
    category_id: categoryId(item.pageIndex, item.categoryIndex),
    name: item.name,
    set_name: item.setName,
    description: null,
    price: priceFromLabel(item.priceLabel),
    price_label: item.priceLabel,
    price_visible: true,
    portion_label: null,
    portion_visible: false,
    image_url: null,
    badge: item.badge ?? null,
    badge_label: item.badge ?? null,
    badge_type: null,
    recommended: item.recommended ?? false,
    origin_info: null,
    is_best: item.badge === "BEST",
    is_sold_out: false,
    traits_visible: true,
    visible: true,
    sort_order: item.sortOrder,
  };
}

function buildPriceOptions(items: DemoItem[]) {
  return items.flatMap((item) =>
    (item.options ?? []).map((option, optionIndex) => ({
      id: priceOptionId(item.pageIndex, item.categoryIndex, item.itemIndex, optionIndex),
      menu_item_id: itemId(item.pageIndex, item.categoryIndex, item.itemIndex),
      label: option.label,
      price: priceFromLabel(option.priceLabel),
      price_label: option.priceLabel,
      visible: true,
      sort_order: option.sortOrder,
    }))
  );
}

const qaMenuNames = [
  ["바질 크림 라떼", "BASIL CREAM LATTE"],
  ["오트 너티 라떼", "OAT NUTTY LATTE"],
  ["흑임자 크림 라떼", "BLACK SESAME LATTE"],
  ["솔티드 카라멜 라떼", "SALTED CARAMEL LATTE"],
  ["피스타치오 슈페너", "PISTACHIO EINSPANNER"],
  ["바닐라빈 슈페너", "VANILLA BEAN EINSPANNER"],
  ["메이플 오트 라떼", "MAPLE OAT LATTE"],
  ["제주 말차 라떼", "JEJU MATCHA LATTE"],
  ["발로나 초코 라떼", "VALRHONA CHOCO LATTE"],
  ["레몬 바질 에이드", "LEMON BASIL ADE"],
  ["자몽 블랙티 에이드", "GRAPEFRUIT BLACK TEA ADE"],
  ["클래식 버터 스콘", "CLASSIC BUTTER SCONE"],
  ["무화과 휘낭시에", "FIG FINANCIER"],
  ["솔티 초코 휘낭시에", "SALTY CHOCO FINANCIER"],
  ["레몬 파운드 케이크", "LEMON POUND CAKE"],
  ["티라미수 컵", "TIRAMISU CUP"],
  ["얼그레이 쉬폰", "EARL GREY CHIFFON"],
  ["디카페인 아메리카노", "DECAF AMERICANO"],
  ["로얄 밀크티", "ROYAL MILK TEA"],
  ["오트 고구마 라떼", "OAT SWEET POTATO LATTE"],
] as const;

const fullQaCategoryNames = [
  "SIGNATURE COFFEE",
  "CLASSIC COFFEE",
  "NON-COFFEE",
  "TEA & BAKERY",
  "SEASONAL PICK",
  "DESSERT BAR",
  "DECAF & TEA",
  "LIMITED",
];

const splitQaCategoryNames = ["RECOMMENDED", "BAKERY PICK", "NON-COFFEE", "SEASONAL"];

function getQaCounts(qaCase: DisplayMenuAQaCase, pageIndex: number) {
  const split = pageIndex === 1;

  switch (qaCase) {
    case "sparse_1":
      return [1];
    case "sparse_2":
      return [2];
    case "sparse":
      return split ? [5] : [6];
    case "sparse_2cat":
      return split ? [3, 2] : [4, 4];
    case "recommended":
      return split ? [6, 4] : [5, 5, 5, 5];
    case "filled":
      return split ? [9, 7] : [8, 7, 8, 7];
    case "dense":
      return split ? [7, 6, 5, 4] : [5, 5, 5, 5, 5, 5, 5, 5];
    case "autoSplit":
      return split ? [24, 24, 18] : [12, 12, 12, 12, 12, 12];
    case "capacity_warning":
      return split ? [7, 6] : [7, 6, 6, 6];
    case "capacity_strong":
      return split ? [9, 8] : [9, 8, 8, 8];
    case "category_heavy":
      return split ? [13] : [13, 4, 4, 4];
    case "extreme_fit":
      return split ? [100] : [25, 25, 25, 25];
    case "longSecondary":
      return split ? [5, 4] : [4, 4, 4, 4];
    case "unbalanced_left":
      return split ? [10, 4] : [16, 3, 3, 2];
    case "unbalanced_right":
      return split ? [4, 10] : [2, 3, 3, 16];
  }
}

function buildQaCategories(qaCase: DisplayMenuAQaCase, pageIndex: number): DemoCategory[] {
  const names = pageIndex === 1 ? splitQaCategoryNames : fullQaCategoryNames;

  return getQaCounts(qaCase, pageIndex).map((_, categoryIndex) => ({
    pageIndex,
    categoryIndex,
    name: names[categoryIndex] ?? `CATEGORY ${categoryIndex + 1}`,
    sortOrder: categoryIndex + 1,
  }));
}

function buildQaItem({
  pageIndex,
  categoryIndex,
  itemIndex,
  globalIndex,
  dense,
  longSecondary,
}: {
  pageIndex: number;
  categoryIndex: number;
  itemIndex: number;
  globalIndex: number;
  dense: boolean;
  longSecondary: boolean;
}): DemoItem {
  if (longSecondary && categoryIndex === 0 && itemIndex === 0) {
    return {
      pageIndex,
      categoryIndex,
      itemIndex,
      name: "흑임자 바스크 치즈케이크",
      setName: "BLACK SESAME BASQUE CHEESECAKE",
      priceLabel: "7.8",
      sortOrder: itemIndex + 1,
      badge: "NEW",
      recommended: true,
      options: hotIceLarge("7.8", "7.8", "8.8"),
    };
  }

  const [name, setName] = qaMenuNames[globalIndex % qaMenuNames.length];
  const price = (4.5 + (globalIndex % 9) * 0.3).toFixed(1);
  const longSetName = dense && globalIndex % 7 === 0
    ? `${setName} HOUSE SEASONAL RESERVE`
    : setName;
  const badge = globalIndex % 11 === 0 ? "SIGNATURE" : globalIndex % 5 === 0 ? "BEST" : globalIndex % 7 === 0 ? "NEW" : undefined;
  const options = globalIndex % 6 === 0
    ? hotIceLarge(price, price, (Number(price) + 0.7).toFixed(1))
    : globalIndex % 3 === 0
      ? hotIce(price, price)
      : globalIndex % 4 === 0
        ? iceOnly(price)
        : undefined;

  return {
    pageIndex,
    categoryIndex,
    itemIndex,
    name,
    setName: longSetName,
    priceLabel: price,
    sortOrder: itemIndex + 1,
    badge,
    recommended: badge === "BEST" || badge === "SIGNATURE",
    options,
  };
}

function buildQaItems(qaCase: DisplayMenuAQaCase, pageIndex: number): DemoItem[] {
  const counts = getQaCounts(qaCase, pageIndex);
  const dense = qaCase === "dense";
  const longSecondary = qaCase === "longSecondary";
  let globalIndex = 0;

  return counts.flatMap((count, categoryIndex) =>
    Array.from({ length: count }, (_, itemIndex) => {
      const item = buildQaItem({ pageIndex, categoryIndex, itemIndex, globalIndex, dense, longSecondary });
      globalIndex += 1;
      return item;
    })
  );
}

function buildDisplayMenuAQaFixture(qaCase: DisplayMenuAQaCase) {
  const categories = [
    ...buildQaCategories(qaCase, 0),
    ...buildQaCategories(qaCase, 1),
  ];
  const items = [
    ...buildQaItems(qaCase, 0),
    ...buildQaItems(qaCase, 1),
  ];

  return { categories, items };
}

export function buildDisplayMenuAPreviewData(qaCase: DisplayMenuAQaCase | null = null): MenuPageData {
  const pageSettings = getDefaultPageSettings();
  const fixture = qaCase ? buildDisplayMenuAQaFixture(qaCase) : null;
  const categories = fixture?.categories ?? [...fullCategories, ...splitCategories];
  const items = fixture?.items ?? [...fullItems, ...splitItems];

  return {
    locale: DEFAULT_LOCALE,
    enabledLocales: [...DEFAULT_ENABLED_LOCALES],
    publicServiceType: "screen",
    menuSite: {
      id: siteId,
      user_id: "template-preview",
      name: "썸머 블루",
      slug: "preview-display-menu-a",
      template_key: "display_menu_a",
      template_category: "display",
      status: "published",
      description: "디스플레이 메뉴보드 미리보기",
      logo_url: null,
      cover_image_url: null,
      intro_image_url: null,
      brand_color: "#101513",
      business_name: "AUBE COFFEE",
      business_address: "서울시 예시구 오브로 12",
      business_phone: "02-0000-0000",
      restaurant_name: "AUBE COFFEE",
      restaurant_category: "카페",
      restaurant_type: "cafe",
      restaurant_address: "서울시 예시구 오브로 12",
      restaurant_phone: "02-0000-0000",
      intro_title: null,
      intro_description: null,
      brand_description: "좋은 원두와 정성스러운 디저트로 일상에 작은 여유를 더하는 카페입니다.",
      menu_cover_label: null,
      menu_cover_title: null,
      menu_cover_description: null,
      about_description: null,
      opening_hours: "매일 10:00 - 21:00",
      map_url: null,
      page_settings: pageSettings,
      settings: {},
    },
    pageSettings,
    pages: [
      {
        id: pageId(0),
        title: "시즌 프로모션",
        description: null,
        description_visible: false,
        display_settings: serializeMenuPageDisplaySettings({
          ...DEFAULT_PROMOTION_PAGE_DISPLAY_SETTINGS,
          promotion: {
            ...DEFAULT_PROMOTION_PAGE_DISPLAY_SETTINGS.promotion,
            title: null,
            description: null,
            mediaType: "image",
            mediaUrl: summerBlueSeasonPromoImageUrl,
            mediaPath: null,
            videoUrl: null,
            videoPath: null,
            videoSource: null,
          },
        }),
        legacy_section_key: null,
        visible: true,
        sort_order: 0,
        created_at: now,
      },
      {
        id: pageId(1),
        title: "시그니처 추천",
        description: null,
        description_visible: false,
        display_settings: serializeMenuPageDisplaySettings({
          ...DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
          menuLayoutType: "split_image_menu",
          splitImagePosition: "left",
          splitImage: {
            url: summerBlueSignatureImageUrl,
            path: null,
            title: null,
            description: null,
            position: "left",
          },
        }),
        legacy_section_key: null,
        visible: true,
        sort_order: 1,
        created_at: now,
      },
      {
        id: pageId(2),
        title: "전체 메뉴",
        description: null,
        description_visible: false,
        display_settings: serializeMenuPageDisplaySettings(DEFAULT_MENU_PAGE_DISPLAY_SETTINGS),
        legacy_section_key: null,
        visible: true,
        sort_order: 2,
        created_at: now,
      },
      {
        id: pageId(3),
        title: "디저트 프로모션",
        description: null,
        description_visible: false,
        display_settings: serializeMenuPageDisplaySettings({
          ...DEFAULT_PROMOTION_PAGE_DISPLAY_SETTINGS,
          promotion: {
            ...DEFAULT_PROMOTION_PAGE_DISPLAY_SETTINGS.promotion,
            title: null,
            description: null,
            mediaType: "video",
            mediaUrl: null,
            mediaPath: null,
            videoUrl: summerBlueDessertPromoVideoUrl,
            videoPath: null,
            videoSource: "url",
          },
        }),
        legacy_section_key: null,
        visible: true,
        sort_order: 3,
        created_at: now,
      },
    ],
    categories: categories.map(buildCategory),
    items: items.map(buildItem),
    priceOptions: buildPriceOptions(items),
    traits: [],
    events: [],
    chefs: [],
    socialLinks: [],
  };
}
