import type { createClient } from "@/lib/supabase/server";
import { BASIC_DEFAULT_LAYOUT_MODE } from "@/lib/menu-layout-modes";
import type { Database, Json, MenuSectionKey } from "@/lib/supabase/types";
import type { SocialLinkType } from "@/lib/social-links";
import { CAFE_DESIGN_A_STITCH_SAMPLE } from "@/lib/template-demo-data/cafe-design-a";
import { buildDisplayMenuAPreviewData } from "@/lib/template-demo-data/display-menu-a";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import {
  getTemplateCategoryFromKey,
  isTemplateCategoryKey,
  type TemplateCategoryKey,
} from "@/lib/templates";
import { MENU_LIMITS } from "@/lib/menu-limits";

export { MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";

export type StarterPresetKey = TemplateCategoryKey;

type StarterItem = {
  name: string;
  set_name?: string;
  price: number;
  price_label?: string | null;
  portion_label?: string;
  description: string;
  image_url?: string | null;
  badge_label?: string | null;
  recommended?: boolean;
  price_options?: StarterPriceOption[];
};

type StarterPriceOption = {
  label: string;
  price?: number;
  price_label?: string;
};

type StarterCategory = {
  name: string;
  section_key?: MenuSectionKey;
  items: StarterItem[];
};

type StarterPage = {
  title: string;
  legacy_section_key: MenuSectionKey;
  categories: StarterCategory[];
};

type StarterSiteDefaults = {
  restaurant_name: string;
  restaurant_category: string;
  restaurant_type: string;
  menu_cover_label: string;
  intro_title: string;
  intro_description: string;
  brand_description: string;
  menu_cover_title: string;
  menu_cover_description: string;
  about_description: string;
  opening_hours: string;
  restaurant_address: string;
  restaurant_phone: string;
  cover_image_url: string;
  settings?: Record<string, Json>;
};

type StarterChef = {
  chef_name: string;
  chef_role: string;
  chef_description: string;
};

type StarterEvent = {
  event_title: string;
  event_subtitle: string;
  event_description: string;
  event_period: string;
  event_benefit: string;
  event_detail: string;
  event_regular_price_label: string;
  event_sale_price_label: string;
};

type StarterSocialLink = {
  type: SocialLinkType;
  label: string;
  display_name: string;
  url: string;
};

export type StarterPreset = {
  key: StarterPresetKey;
  site: StarterSiteDefaults;
  featured_item_name?: string;
  sample_items_visible?: boolean;
  chefs: StarterChef[];
  events: StarterEvent[];
  socialLinks: StarterSocialLink[];
  pages: StarterPage[];
};

type CreateStarterMenuDataOptions = {
  force?: boolean;
  applySiteDefaults?: boolean;
  includeAuxiliaryContent?: boolean;
};

type StarterServiceType = "menu" | "screen" | "legacy";
type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type MenuSiteUpdate = Database["public"]["Tables"]["menu_sites"]["Update"];
type MenuPageInsert = Database["public"]["Tables"]["menu_pages"]["Insert"];
type MenuCategoryInsert = Database["public"]["Tables"]["menu_categories"]["Insert"];
type MenuItemInsert = Database["public"]["Tables"]["menu_items"]["Insert"];
type MenuItemPriceOptionInsert = Database["public"]["Tables"]["menu_item_price_options"]["Insert"];
type MenuChefInsert = Database["public"]["Tables"]["menu_chefs"]["Insert"];
type MenuEventInsert = Database["public"]["Tables"]["menu_events"]["Insert"];
type MenuSocialLinkInsert = Database["public"]["Tables"]["menu_social_links"]["Insert"];

const STARTER_PLACEHOLDERS = {
  logo: "/placeholders/starter/logo.svg",
  item: "/placeholders/starter/menu-item.svg",
  chef: "/placeholders/starter/chef.svg",
  event: "/placeholders/starter/event.svg",
} as const;

const STARTER_PAGE_SETTINGS = {
  intro_enabled: true,
  menu_cover_enabled: true,
  set_menu_enabled: true,
  main_menu_enabled: true,
  dessert_drink_enabled: true,
  about_enabled: true,
  chefs_enabled: true,
  events_enabled: true,
  social_links_enabled: true,
  featured_item_enabled: false,
  featured_item_id: null,
  design: {
    pcTabletLayoutMode: BASIC_DEFAULT_LAYOUT_MODE,
  },
} as const;

const MENU_SCREEN_STARTER_PAGE_SETTINGS = {
  intro_enabled: false,
  menu_cover_enabled: true,
  set_menu_enabled: true,
  main_menu_enabled: true,
  dessert_drink_enabled: true,
  about_enabled: false,
  chefs_enabled: false,
  events_enabled: false,
  social_links_enabled: false,
  featured_item_enabled: false,
  featured_item_id: null,
  design: {
    pcTabletLayoutMode: BASIC_DEFAULT_LAYOUT_MODE,
  },
} as const;

function getStarterServiceType(productKey?: string | null): StarterServiceType {
  if (productKey === "basic") return "menu";
  if (productKey === "large_screen") return "screen";
  if (productKey === "business_display_monthly" || productKey === "business_display_yearly") return "screen";

  return "legacy";
}

function isDisplayMenuATemplateKey(templateKey?: string | null) {
  return templateKey === "display_menu_a";
}

function shouldUseLeanStarterPreset(serviceType: StarterServiceType) {
  return serviceType === "menu" || serviceType === "screen";
}

function item(
  name: string,
  price: number,
  description: string,
  options: { portion_label?: string; recommended?: boolean; price_options?: StarterPriceOption[] } = {}
): StarterItem {
  return { name, price, description, ...options };
}

function isCafeDesignATemplateKey(templateKey?: string | null) {
  return templateKey?.trim().toLowerCase() === "cafe_design_a";
}

function shouldApplyLeanStoreDescription(preset: StarterPreset, serviceType: StarterServiceType) {
  return !shouldUseLeanStarterPreset(serviceType) || preset === cafeDesignAStarterPreset;
}

function cloneStarterPriceOptions(value: unknown): StarterPriceOption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((option) => ({ ...(option as StarterPriceOption) }));
}

function getStarterFeaturedItemNames(preset: StarterPreset) {
  const names = [
    preset.featured_item_name,
    ...preset.pages.flatMap((page) =>
      page.categories.flatMap((category) =>
        category.items
          .filter((menuItem) => menuItem.recommended === true)
          .map((menuItem) => menuItem.name)
      )
    ),
  ].filter((name): name is string => Boolean(name));

  return Array.from(new Set(names));
}

const cafeDesignAStarterPreset: StarterPreset = {
  key: "cafe",
  site: CAFE_DESIGN_A_STITCH_SAMPLE.site,
  featured_item_name: "바질 크림 라떼",
  sample_items_visible: true,
  chefs: [],
  events: [],
  socialLinks: [],
  pages: [
    {
      title: "메뉴 페이지 1",
      legacy_section_key: "main_menu",
      categories: CAFE_DESIGN_A_STITCH_SAMPLE.pages.flatMap((page) =>
        page.categories.map((category) => ({
          name: category.name,
          section_key: "section_key" in category ? (category.section_key as MenuSectionKey) : (page.legacy_section_key as MenuSectionKey),
          items: category.items.map((menuItem) => ({
            name: menuItem.name,
            set_name: menuItem.set_name,
            price: menuItem.price,
            price_label: menuItem.price_label,
            portion_label: "portion_label" in menuItem ? menuItem.portion_label : undefined,
            description: menuItem.description,
            image_url: "image_url" in menuItem ? menuItem.image_url : undefined,
            badge_label: "badge_label" in menuItem ? menuItem.badge_label : undefined,
            recommended: "recommended" in menuItem ? menuItem.recommended : undefined,
            price_options: "price_options" in menuItem ? cloneStarterPriceOptions(menuItem.price_options) : undefined,
          })),
        }))
      ),
    },
  ],
};

const templateStarterPresets: Partial<Record<string, StarterPreset>> = {
  cafe_design_a: cafeDesignAStarterPreset,
};

const starterPresets: Partial<Record<StarterPresetKey, StarterPreset>> & { cafe: StarterPreset } = {
  cafe: {
    key: "cafe",
    site: {
      restaurant_name: "메뉴링크 카페",
      restaurant_category: "카페",
      restaurant_type: "cafe",
      menu_cover_label: "SPECIALTY COFFEE",
      intro_title: "따뜻한 커피와 디저트가 있는 공간",
      intro_description: "하루의 여유를 채워주는 커피와 디저트를 준비했습니다.",
      brand_description: "메뉴링크 카페는 편안한 분위기 속에서 커피와 디저트를 즐길 수 있는 공간입니다.",
      menu_cover_title: "Cafe Menu",
      menu_cover_description: "시그니처 음료부터 디저트까지, 오늘의 취향에 맞는 메뉴를 골라보세요.",
      about_description: "커피 한 잔의 여유와 함께 머물기 좋은 공간을 지향합니다.",
      opening_hours: "매일 10:00 - 21:00",
      restaurant_address: "서울시 예시구 메뉴링크로 1",
      restaurant_phone: "02-0000-0000",
      cover_image_url: "/placeholders/starter/cafe-cover.svg",
    },
    chefs: [
      {
        chef_name: "메뉴링크 바리스타",
        chef_role: "Head Barista",
        chef_description: "매일 균형 잡힌 커피와 음료를 준비합니다.",
      },
    ],
    events: [
      {
        event_title: "시그니처 음료 프로모션",
        event_subtitle: "처음 방문한 고객을 위한 추천 메뉴",
        event_description: "시그니처 음료와 디저트를 함께 즐겨보세요.",
        event_period: "상시 진행",
        event_benefit: "추천 세트 이용 시 할인 혜택",
        event_detail: "매장 상황에 따라 구성은 달라질 수 있습니다.",
        event_regular_price_label: "12,000원",
        event_sale_price_label: "10,000원",
      },
    ],
    socialLinks: [
      { type: "instagram", label: "인스타그램", display_name: "@menulink_cafe", url: "https://instagram.com/example" },
      { type: "blog", label: "블로그", display_name: "메뉴링크 카페 블로그", url: "https://example.com/blog" },
    ],
    pages: [
      {
        title: "시그니처",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "시그니처 메뉴",
            items: [
              item("시그니처 크림 라떼", 6500, "부드러운 크림과 에스프레소가 어우러진 대표 메뉴", {
                portion_label: "HOT / ICE",
                recommended: true,
                price_options: [
                  { label: "HOT", price: 6500, price_label: "6,500원" },
                  { label: "ICE", price: 6800, price_label: "6,800원" },
                ],
              }),
              item("아인슈페너", 6500, "진한 커피 위에 부드러운 크림을 올린 시그니처 음료", { portion_label: "ICE", recommended: true }),
            ],
          },
        ],
      },
      {
        title: "커피",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "에스프레소",
            items: [
              item("아메리카노", 4500, "깔끔한 산미와 고소한 밸런스의 기본 커피", {
                portion_label: "HOT / ICE",
                price_options: [
                  { label: "HOT", price: 4000, price_label: "4,000원" },
                  { label: "ICE", price: 4500, price_label: "4,500원" },
                ],
              }),
              item("에스프레소", 4000, "진한 커피의 향을 짧고 강하게 즐기는 메뉴"),
              item("콜드브루", 5500, "천천히 추출해 부드럽게 즐기는 콜드브루", { portion_label: "ICE" }),
            ],
          },
          {
            name: "라떼",
            items: [
              item("카페라떼", 5500, "부드러운 우유와 에스프레소가 어우러진 라떼", {
                portion_label: "HOT / ICE",
                price_options: [
                  { label: "HOT", price: 4800, price_label: "4,800원" },
                  { label: "ICE", price: 5300, price_label: "5,300원" },
                ],
              }),
              item("바닐라라떼", 6000, "달콤한 바닐라 향을 더한 라떼", { portion_label: "HOT / ICE" }),
              item("오트 라떼", 6500, "오트 밀크로 만든 부드러운 라떼", { portion_label: "HOT / ICE" }),
            ],
          },
        ],
      },
      {
        title: "논커피",
        legacy_section_key: "dessert_drink",
        categories: [
          {
            name: "논커피",
            items: [
              item("말차 라떼", 6000, "진한 말차와 우유가 어우러진 음료", { portion_label: "HOT / ICE" }),
              item("초코 라떼", 5800, "달콤한 초콜릿 풍미의 음료", { portion_label: "HOT / ICE" }),
              item("딸기 라떼", 6500, "딸기와 우유가 어우러진 시즌 음료", { portion_label: "ICE" }),
            ],
          },
          {
            name: "티 / 에이드",
            items: [
              item("레몬 에이드", 6000, "상큼한 레몬으로 만든 에이드", { portion_label: "ICE" }),
              item("자몽 에이드", 6200, "자몽의 산뜻함을 담은 에이드", { portion_label: "ICE" }),
            ],
          },
        ],
      },
      {
        title: "디저트",
        legacy_section_key: "dessert_drink",
        categories: [
          {
            name: "디저트",
            items: [
              item("바스크 치즈케이크", 7500, "진한 치즈 풍미의 부드러운 디저트", { recommended: true }),
              item("티라미수", 7800, "커피 향과 크림이 어우러진 디저트"),
              item("소금빵", 3800, "겉은 바삭하고 속은 촉촉한 베이커리 메뉴"),
              item("휘낭시에", 3500, "고소한 버터 향의 구움과자"),
            ],
          },
        ],
      },
    ],
  },
  brunch: {
    key: "brunch",
    site: {
      restaurant_name: "메뉴링크 브런치",
      restaurant_category: "브런치",
      restaurant_type: "brunch",
      menu_cover_label: "BRUNCH CAFE",
      intro_title: "여유로운 하루를 여는 브런치",
      intro_description: "브런치 플레이트와 음료, 디저트를 함께 즐겨보세요.",
      brand_description: "메뉴링크 브런치는 편안한 공간에서 여유로운 식사를 제안합니다.",
      menu_cover_title: "Brunch Menu",
      menu_cover_description: "브런치 메뉴와 샐러드, 음료를 확인해보세요.",
      about_description: "여유로운 식사와 대화를 위한 브런치 공간입니다.",
      opening_hours: "매일 09:00 - 16:00",
      restaurant_address: "서울시 예시구 브런치로 8",
      restaurant_phone: "02-0000-0000",
      cover_image_url: "/placeholders/starter/brunch-cover.svg",
    },
    chefs: [
      {
        chef_name: "메뉴링크 브런치팀",
        chef_role: "Brunch Team",
        chef_description: "신선한 재료로 브런치 메뉴를 준비합니다.",
      },
    ],
    events: [
      {
        event_title: "브런치 세트 추천",
        event_subtitle: "음료와 함께 즐기는 구성",
        event_description: "브런치 메뉴와 음료를 함께 즐길 수 있는 구성을 준비했습니다.",
        event_period: "상시 진행",
        event_benefit: "세트 이용 시 음료 할인",
        event_detail: "세트 구성은 매장 상황에 따라 달라질 수 있습니다.",
        event_regular_price_label: "19,000원",
        event_sale_price_label: "16,000원",
      },
    ],
    socialLinks: [
      { type: "instagram", label: "인스타그램", display_name: "@menulink_brunch", url: "https://instagram.com/example" },
      { type: "threads", label: "스레드", display_name: "@menulink_brunch", url: "https://threads.net/@example" },
    ],
    pages: [
      {
        title: "브런치",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "브런치 플레이트",
            items: [
              item("에그 베네딕트", 14500, "수란과 홀랜다이즈 소스를 곁들인 브런치 메뉴", { recommended: true }),
              item("아보카도 플레이트", 15500, "아보카도와 신선한 채소를 곁들인 플레이트", { recommended: true }),
            ],
          },
          {
            name: "토스트",
            items: [
              item("프렌치 토스트", 12000, "부드러운 식감과 달콤한 풍미의 토스트", { recommended: true }),
              item("아보카도 오픈 샌드위치", 13500, "아보카도와 신선한 채소를 올린 오픈 샌드위치"),
              item("햄치즈 토스트", 11000, "햄과 치즈를 따뜻하게 구운 토스트"),
            ],
          },
        ],
      },
      {
        title: "샐러드 / 사이드",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "샐러드",
            items: [
              item("아보카도 샐러드", 13500, "신선한 채소와 아보카도를 곁들인 샐러드"),
              item("리코타 치즈 샐러드", 14000, "리코타 치즈와 채소가 어우러진 샐러드"),
            ],
          },
          {
            name: "사이드",
            items: [
              item("오늘의 수프", 6500, "브런치와 함께 곁들이기 좋은 따뜻한 수프"),
              item("감자튀김", 7000, "바삭하게 튀긴 사이드 메뉴"),
            ],
          },
        ],
      },
      {
        title: "디저트",
        legacy_section_key: "dessert_drink",
        categories: [
          {
            name: "디저트",
            items: [
              item("팬케이크", 11500, "부드럽고 달콤한 팬케이크"),
              item("그래놀라 요거트", 9000, "그래놀라와 요거트를 곁들인 디저트"),
              item("스콘", 4500, "담백하게 즐기기 좋은 베이커리"),
            ],
          },
        ],
      },
      {
        title: "음료",
        legacy_section_key: "dessert_drink",
        categories: [
          {
            name: "커피 / 음료",
            items: [
              item("아메리카노", 4500, "브런치와 함께 즐기기 좋은 커피", { portion_label: "HOT / ICE" }),
              item("카페라떼", 5500, "부드러운 라떼", { portion_label: "HOT / ICE" }),
              item("오렌지 주스", 6000, "상큼한 과일 주스"),
              item("레몬 에이드", 6500, "상큼한 에이드"),
            ],
          },
        ],
      },
    ],
  },
  fine_dining: {
    key: "fine_dining",
    site: {
      restaurant_name: "메뉴링크 다이닝",
      restaurant_category: "파인다이닝",
      restaurant_type: "fine_dining",
      menu_cover_label: "FINE DINING",
      intro_title: "계절의 흐름을 담은 다이닝",
      intro_description: "정성스럽게 준비한 코스와 페어링을 경험해보세요.",
      brand_description: "메뉴링크 다이닝은 재료의 계절감과 섬세한 서비스를 중요하게 생각합니다.",
      menu_cover_title: "Dining Course",
      menu_cover_description: "런치와 디너 코스, 페어링 메뉴를 확인해보세요.",
      about_description: "셰프의 해석이 담긴 메뉴와 편안한 서비스를 제공하는 다이닝 공간입니다.",
      opening_hours: "Lunch 12:00 - 15:00 / Dinner 18:00 - 22:00",
      restaurant_address: "서울시 예시구 다이닝로 10",
      restaurant_phone: "02-0000-0000",
      cover_image_url: "/placeholders/starter/fine-dining-cover.svg",
    },
    chefs: [
      {
        chef_name: "김테이블",
        chef_role: "Executive Chef",
        chef_description: "계절 재료를 바탕으로 코스 메뉴를 구성합니다.",
      },
      {
        chef_name: "이씬",
        chef_role: "Sommelier",
        chef_description: "메뉴와 어울리는 와인 및 논알콜 페어링을 제안합니다.",
      },
    ],
    events: [
      {
        event_title: "시즌 테이스팅 코스",
        event_subtitle: "계절 한정 코스",
        event_description: "제철 재료를 활용한 시즌 테이스팅 코스를 선보입니다.",
        event_period: "시즌 한정",
        event_benefit: "예약 고객 한정 페어링 옵션 제공",
        event_detail: "자세한 구성은 매장 상황에 따라 달라질 수 있습니다.",
        event_regular_price_label: "159,000원",
        event_sale_price_label: "129,000원",
      },
    ],
    socialLinks: [
      { type: "instagram", label: "인스타그램", display_name: "@menulink_dining", url: "https://instagram.com/example" },
    ],
    pages: [
      {
        title: "코스 메뉴",
        legacy_section_key: "set_menu",
        categories: [
          {
            name: "런치 코스",
            section_key: "set_menu",
            items: [
              item("런치 코스", 69000, "계절 재료를 활용한 가벼운 코스 구성", { recommended: true }),
              item("런치 테이스팅", 89000, "시그니처 구성을 가볍게 경험할 수 있는 런치 코스"),
            ],
          },
          {
            name: "디너 코스",
            section_key: "set_menu",
            items: [
              item("디너 코스", 129000, "셰프의 시그니처 메뉴를 중심으로 구성한 디너 코스", { recommended: true }),
              item("시그니처 디너 코스", 159000, "계절 재료와 셰프의 해석을 담은 시그니처 코스", { recommended: true }),
            ],
          },
        ],
      },
      {
        title: "단품 메뉴",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "시그니처 단품",
            items: [
              item("오늘의 생선 요리", 42000, "계절 생선과 소스를 곁들인 단품 메뉴"),
              item("한우 스테이크", 68000, "한우를 사용한 메인 스테이크", { portion_label: "180g", recommended: true }),
              item("계절 리조또", 32000, "계절 재료를 활용한 리조또"),
            ],
          },
        ],
      },
      {
        title: "와인 / 페어링",
        legacy_section_key: "dessert_drink",
        categories: [
          {
            name: "페어링",
            items: [
              item("와인 페어링 3잔", 45000, "코스와 어울리는 와인 3잔 구성"),
              item("와인 페어링 5잔", 70000, "디너 코스와 함께 즐기는 와인 5잔 구성"),
              item("논알콜 페어링", 38000, "차와 주스를 활용한 논알콜 페어링"),
            ],
          },
          {
            name: "음료",
            items: [
              item("스파클링 워터", 9000, "식사와 함께 즐기기 좋은 음료"),
              item("하우스 티", 8000, "식후에 즐기기 좋은 티"),
            ],
          },
        ],
      },
      {
        title: "디저트 / 음료",
        legacy_section_key: "dessert_drink",
        categories: [
          {
            name: "디저트",
            items: [
              item("오늘의 디저트", 18000, "셰프가 준비한 계절 디저트"),
              item("초콜릿 무스", 16000, "진한 초콜릿 풍미의 디저트"),
            ],
          },
        ],
      },
    ],
  },
  casual_dining: {
    key: "casual_dining",
    site: {
      restaurant_name: "메뉴링크 키친",
      restaurant_category: "캐주얼다이닝",
      restaurant_type: "casual_dining",
      menu_cover_label: "CASUAL DINING",
      intro_title: "편안하게 즐기는 다이닝 메뉴",
      intro_description: "스테이크, 파스타, 피자와 함께하는 캐주얼한 식사 공간입니다.",
      brand_description: "메뉴링크 키친은 누구나 편하게 즐길 수 있는 다이닝 메뉴를 제공합니다.",
      menu_cover_title: "Casual Dining Menu",
      menu_cover_description: "대표 메뉴와 메인 메뉴, 사이드와 음료를 확인해보세요.",
      about_description: "편안한 분위기에서 다양한 메뉴를 즐길 수 있는 캐주얼 다이닝 공간입니다.",
      opening_hours: "매일 11:30 - 22:00",
      restaurant_address: "서울시 예시구 키친로 15",
      restaurant_phone: "02-0000-0000",
      cover_image_url: "/placeholders/starter/casual-dining-cover.svg",
    },
    chefs: [
      {
        chef_name: "박테이블",
        chef_role: "Kitchen Manager",
        chef_description: "편안하게 즐길 수 있는 메인 메뉴를 준비합니다.",
      },
    ],
    events: [
      {
        event_title: "런치 스페셜",
        event_subtitle: "평일 점심 추천 메뉴",
        event_description: "평일 점심 시간에 즐기기 좋은 런치 구성을 준비했습니다.",
        event_period: "평일 점심",
        event_benefit: "런치 메뉴 할인",
        event_detail: "매장 운영 상황에 따라 제공 시간이 달라질 수 있습니다.",
        event_regular_price_label: "19,000원",
        event_sale_price_label: "15,000원",
      },
    ],
    socialLinks: [
      { type: "instagram", label: "인스타그램", display_name: "@menulink_kitchen", url: "https://instagram.com/example" },
      { type: "blog", label: "블로그", display_name: "메뉴링크 키친 소식", url: "https://example.com/blog" },
    ],
    pages: [
      {
        title: "대표 메뉴",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "추천 메뉴",
            items: [
              item("트러플 크림 파스타", 19000, "진한 크림 소스와 트러플 향이 어우러진 대표 메뉴", { recommended: true }),
              item("하우스 스테이크", 32000, "메뉴링크 하우스 스타일 스테이크", { portion_label: "200g", recommended: true }),
            ],
          },
        ],
      },
      {
        title: "메인 메뉴",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "스테이크",
            items: [
              item("채끝 스테이크", 32000, "부드러운 식감의 채끝 스테이크", { portion_label: "200g", recommended: true }),
              item("치킨 스테이크", 22000, "담백한 닭고기와 소스를 곁들인 메인 메뉴"),
            ],
          },
          {
            name: "라이스 / 플레이트",
            items: [
              item("갈릭 쉬림프 라이스", 16000, "갈릭 향이 살아있는 쉬림프 라이스"),
              item("비프 필라프", 15000, "고소하게 볶아낸 비프 필라프"),
            ],
          },
        ],
      },
      {
        title: "파스타 / 피자",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "파스타",
            items: [
              item("토마토 해산물 파스타", 18000, "신선한 해산물과 토마토 소스를 곁들인 파스타"),
              item("알리오 올리오", 15000, "마늘과 올리브오일의 풍미를 살린 파스타"),
              item("로제 파스타", 17000, "부드러운 로제 소스의 파스타"),
              item("봉골레 파스타", 18000, "조개 육수와 올리브오일의 깔끔한 파스타"),
            ],
          },
          {
            name: "피자",
            items: [
              item("마르게리타 피자", 19000, "토마토와 바질, 치즈가 어우러진 피자"),
              item("페퍼로니 피자", 21000, "페퍼로니를 듬뿍 올린 피자"),
              item("고르곤졸라 피자", 20000, "치즈 풍미와 꿀을 곁들이는 피자"),
            ],
          },
        ],
      },
      {
        title: "사이드 / 음료",
        legacy_section_key: "dessert_drink",
        categories: [
          {
            name: "샐러드",
            items: [
              item("리코타 치즈 샐러드", 14000, "신선한 채소와 리코타 치즈를 곁들인 샐러드"),
              item("시저 샐러드", 13000, "클래식하게 즐기는 시저 샐러드"),
            ],
          },
          {
            name: "사이드",
            items: [
              item("감자튀김", 7000, "바삭하게 튀긴 사이드 메뉴"),
              item("갈릭 브레드", 6500, "마늘 향이 풍부한 브레드"),
            ],
          },
          {
            name: "음료",
            items: [
              item("하우스 에이드", 6500, "상큼하게 즐기는 에이드"),
              item("탄산음료", 3500, "콜라, 사이다 중 선택"),
              item("아이스티", 4000, "가볍게 즐기기 좋은 음료"),
            ],
          },
        ],
      },
    ],
  },
  fast_food: {
    key: "fast_food",
    site: {
      restaurant_name: "메뉴링크 버거",
      restaurant_category: "패스트푸드",
      restaurant_type: "fast_food",
      menu_cover_label: "FAST & CASUAL",
      intro_title: "빠르고 맛있게 즐기는 메뉴",
      intro_description: "버거, 치킨, 사이드와 음료를 간편하게 확인해보세요.",
      brand_description: "메뉴링크 버거는 빠르고 간편하게 즐길 수 있는 메뉴를 제공합니다.",
      menu_cover_title: "Fast Food Menu",
      menu_cover_description: "세트 메뉴부터 단품, 사이드와 음료까지 한눈에 확인하세요.",
      about_description: "간편하고 빠르게 즐길 수 있는 패스트푸드 메뉴를 제공합니다.",
      opening_hours: "매일 10:00 - 22:00",
      restaurant_address: "서울시 예시구 버거로 20",
      restaurant_phone: "02-0000-0000",
      cover_image_url: "/placeholders/starter/fast-food-cover.svg",
    },
    chefs: [
      {
        chef_name: "메뉴링크 크루",
        chef_role: "Store Crew",
        chef_description: "빠르고 맛있는 메뉴 제공을 위해 준비합니다.",
      },
    ],
    events: [
      {
        event_title: "세트 메뉴 프로모션",
        event_subtitle: "인기 세트 추천",
        event_description: "인기 세트 메뉴를 더 합리적으로 즐겨보세요.",
        event_period: "상시 진행",
        event_benefit: "세트 메뉴 할인",
        event_detail: "구성은 매장 상황에 따라 달라질 수 있습니다.",
        event_regular_price_label: "11,900원",
        event_sale_price_label: "9,900원",
      },
    ],
    socialLinks: [
      { type: "instagram", label: "인스타그램", display_name: "@menulink_burger", url: "https://instagram.com/example" },
    ],
    pages: [
      {
        title: "세트 메뉴",
        legacy_section_key: "set_menu",
        categories: [
          {
            name: "버거 세트",
            section_key: "set_menu",
            items: [
              item("클래식 버거 세트", 8900, "버거, 감자튀김, 음료가 포함된 기본 세트", { recommended: true }),
              item("치즈 버거 세트", 9900, "치즈 버거와 사이드가 포함된 세트"),
              item("시그니처 버거 세트", 11900, "대표 버거와 사이드가 포함된 세트", { recommended: true }),
            ],
          },
          {
            name: "치킨 세트",
            section_key: "set_menu",
            items: [
              item("치킨 박스 세트", 12900, "치킨과 사이드가 함께 구성된 세트"),
              item("텐더 세트", 10900, "치킨 텐더와 음료가 포함된 세트"),
            ],
          },
        ],
      },
      {
        title: "버거 / 샌드위치",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "버거",
            items: [
              item("클래식 버거", 5900, "기본에 충실한 클래식 버거"),
              item("치즈 버거", 6900, "고소한 치즈를 더한 버거"),
              item("베이컨 버거", 7900, "베이컨을 더한 풍성한 버거"),
              item("시그니처 버거", 8900, "매장의 대표 소스를 더한 버거", { recommended: true }),
            ],
          },
          {
            name: "샌드위치",
            items: [
              item("치킨 샌드위치", 7500, "바삭한 치킨을 넣은 샌드위치"),
              item("불고기 샌드위치", 7800, "불고기 풍미를 담은 샌드위치"),
            ],
          },
        ],
      },
      {
        title: "치킨 / 스낵",
        legacy_section_key: "main_menu",
        categories: [
          {
            name: "치킨",
            items: [
              item("크리스피 치킨", 7900, "바삭한 식감의 치킨 메뉴", { recommended: true }),
              item("치킨 텐더", 6900, "가볍게 즐기기 좋은 텐더"),
              item("치킨 윙", 8500, "매콤하게 즐기는 윙 메뉴"),
            ],
          },
          {
            name: "스낵",
            items: [
              item("치즈스틱", 3500, "치즈가 들어간 스낵"),
              item("너겟", 4500, "한입 크기의 치킨 너겟"),
            ],
          },
        ],
      },
      {
        title: "사이드 / 음료",
        legacy_section_key: "dessert_drink",
        categories: [
          {
            name: "사이드",
            items: [
              item("감자튀김", 3500, "바삭하게 튀긴 기본 사이드"),
              item("어니언링", 4000, "양파를 바삭하게 튀긴 사이드"),
              item("콘샐러드", 3000, "가볍게 곁들이기 좋은 사이드"),
            ],
          },
          {
            name: "음료",
            items: [
              item("탄산음료", 2500, "콜라, 사이다 중 선택"),
              item("아이스티", 3000, "시원하게 즐기는 음료"),
              item("오렌지 주스", 3500, "상큼한 과일 주스"),
            ],
          },
          {
            name: "디저트",
            items: [
              item("소프트 아이스크림", 2500, "부드러운 아이스크림"),
              item("애플파이", 3000, "따뜻한 사과 필링이 들어간 디저트"),
            ],
          },
        ],
      },
    ],
  },
};

export function getStarterPreset(templateKey?: string | null, restaurantCategory?: string | null, templateCategory?: string | null): StarterPreset {
  if (isCafeDesignATemplateKey(templateKey)) {
    return cafeDesignAStarterPreset;
  }

  const normalizedTemplateKey = templateKey?.trim().toLowerCase() ?? "";
  const templatePreset = normalizedTemplateKey ? templateStarterPresets[normalizedTemplateKey] : null;
  if (templatePreset) {
    return templatePreset;
  }

  if (isTemplateCategoryKey(templateCategory ?? "")) {
    return starterPresets[templateCategory as TemplateCategoryKey] ?? starterPresets.cafe;
  }

  const categoryFromTemplateKey = getTemplateCategoryFromKey(templateKey);
  if (categoryFromTemplateKey) {
    return starterPresets[categoryFromTemplateKey] ?? starterPresets.cafe;
  }

  const source = `${templateKey ?? ""} ${restaurantCategory ?? ""}`.toLowerCase();

  if (source.includes("cafe") || source.includes("카페")) return starterPresets.cafe;
  if (source.includes("casual_dining") || source.includes("casual") || source.includes("캐주얼다이닝") || source.includes("캐주얼")) {
    return starterPresets.casual_dining ?? starterPresets.cafe;
  }
  if (source.includes("fast_food") || source.includes("fastfood") || source.includes("패스트푸드")) return starterPresets.fast_food ?? starterPresets.cafe;
  if (source.includes("brunch") || source.includes("브런치")) return starterPresets.brunch ?? starterPresets.cafe;
  if (source.includes("fine_dining") || source.includes("fine") || source.includes("dining") || source.includes("파인다이닝")) {
    return starterPresets.fine_dining ?? starterPresets.cafe;
  }

  return starterPresets.cafe;
}

function hasValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function valueOrDefault(value: string | null | undefined, defaultValue: string) {
  return hasValue(value) ? value : defaultValue;
}

function pageSettingsAreEmpty(settings: Json | null | undefined) {
  return !settings || (typeof settings === "object" && !Array.isArray(settings) && Object.keys(settings).length === 0);
}

function getJsonRecord(value: Json | null | undefined): Record<string, Json> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, Json>) } : {};
}

async function applyStarterSiteDefaults(
  supabase: SupabaseClient,
  menuSiteId: string,
  preset: StarterPreset,
  serviceType: StarterServiceType
) {
  const useLeanPreset = shouldUseLeanStarterPreset(serviceType);
  const starterPageSettings = useLeanPreset ? MENU_SCREEN_STARTER_PAGE_SETTINGS : STARTER_PAGE_SETTINGS;
  const presetSettings = getJsonRecord((preset.site.settings ?? null) as Json | null);
  const siteSelect =
    "restaurant_name, restaurant_category, restaurant_type, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_label, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, logo_url, logo_path, cover_image_url, cover_image_path, page_settings, settings";
  const legacySiteSelect =
    "restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, logo_url, logo_path, cover_image_url, cover_image_path, page_settings, settings";

  const primaryResult = await supabase
    .from("menu_sites")
    .select(siteSelect)
    .eq("id", menuSiteId)
    .maybeSingle();
  let site = primaryResult.data as Partial<MenuSiteUpdate> | null;
  let error = primaryResult.error;

  const siteErrorMessage = error?.message.toLowerCase() ?? "";
  if (error && ["restaurant_type", "menu_cover_label"].some((column) => siteErrorMessage.includes(column))) {
    const fallbackResult = await supabase.from("menu_sites").select(legacySiteSelect).eq("id", menuSiteId).maybeSingle();
    site = fallbackResult.data as Partial<MenuSiteUpdate> | null;
    error = fallbackResult.error;
  }

  if (error) {
    throw new Error(`기본 메뉴판 정보 확인에 실패했습니다: ${error?.message ?? "알 수 없는 오류"}`);
  }

  const existingSettings = getJsonRecord(site?.settings as Json | null | undefined);
  const nextSettings = { ...presetSettings, ...existingSettings };

  const payload: MenuSiteUpdate = {
    restaurant_name: valueOrDefault(site?.restaurant_name, preset.site.restaurant_name),
    restaurant_category: valueOrDefault(site?.restaurant_category, preset.site.restaurant_category),
    restaurant_type: valueOrDefault(site?.restaurant_type, preset.site.restaurant_type),
    menu_cover_label: valueOrDefault(site?.menu_cover_label, preset.site.menu_cover_label),
    intro_title: useLeanPreset ? (site?.intro_title ?? null) : valueOrDefault(site?.intro_title, preset.site.intro_title),
    intro_description: useLeanPreset ? (site?.intro_description ?? null) : valueOrDefault(site?.intro_description, preset.site.intro_description),
    brand_description: shouldApplyLeanStoreDescription(preset, serviceType)
      ? valueOrDefault(site?.brand_description, preset.site.brand_description)
      : (site?.brand_description ?? null),
    menu_cover_title: valueOrDefault(site?.menu_cover_title, preset.site.menu_cover_title),
    menu_cover_description: valueOrDefault(site?.menu_cover_description, preset.site.menu_cover_description),
    about_description: useLeanPreset ? (site?.about_description ?? null) : valueOrDefault(site?.about_description, preset.site.about_description),
    opening_hours: valueOrDefault(site?.opening_hours, preset.site.opening_hours),
    restaurant_address: valueOrDefault(site?.restaurant_address, preset.site.restaurant_address),
    restaurant_phone: valueOrDefault(site?.restaurant_phone, preset.site.restaurant_phone),
    map_url: site?.map_url ?? null,
    logo_url: valueOrDefault(site?.logo_url, STARTER_PLACEHOLDERS.logo),
    logo_path: site?.logo_path ?? null,
    cover_image_url: valueOrDefault(site?.cover_image_url, preset.site.cover_image_url),
    cover_image_path: site?.cover_image_path ?? null,
    page_settings: pageSettingsAreEmpty(site?.page_settings) ? (starterPageSettings as unknown as Json) : site?.page_settings,
    ...(Object.keys(nextSettings).length > 0 ? { settings: nextSettings } : {}),
    updated_at: new Date().toISOString(),
  };

  let { error: updateError } = await supabase.from("menu_sites").update(payload).eq("id", menuSiteId);

  const updateErrorMessage = updateError?.message.toLowerCase() ?? "";
  if (updateError && ["restaurant_type", "menu_cover_label"].some((column) => updateErrorMessage.includes(column))) {
    const legacyPayload: MenuSiteUpdate = { ...payload };
    delete legacyPayload.restaurant_type;
    delete legacyPayload.menu_cover_label;
    const fallbackResult = await supabase.from("menu_sites").update(legacyPayload).eq("id", menuSiteId);
    updateError = fallbackResult.error;
  }

  if (updateError) {
    throw new Error(`기본 메뉴판 정보 저장에 실패했습니다: ${updateError?.message ?? "알 수 없는 오류"}`);
  }
}

async function createDisplayMenuAStarterData(
  supabase: SupabaseClient,
  menuSiteId: string,
  options: CreateStarterMenuDataOptions = {}
) {
  const previewData = buildDisplayMenuAPreviewData();
  const { count, error: countError } = await supabase
    .from("menu_pages")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuSiteId);

  if (countError) {
    throw new Error(`Display 기본 메뉴 중복 확인에 실패했습니다: ${countError.message}`);
  }

  if ((count ?? 0) > 0 && !options.force) {
    return { created: false, presetKey: "display", pageCount: 0, categoryCount: 0, itemCount: 0, chefCount: 0, eventCount: 0, socialLinkCount: 0 };
  }

  if (options.applySiteDefaults !== false) {
    const { data: site, error: siteError } = await supabase
      .from("menu_sites")
      .select("restaurant_name, restaurant_category, restaurant_type, restaurant_address, restaurant_phone, page_settings")
      .eq("id", menuSiteId)
      .maybeSingle();

    if (siteError) {
      throw new Error(`Display 기본 메뉴판 정보 확인에 실패했습니다: ${siteError.message}`);
    }

    const sitePayload: MenuSiteUpdate = {
      restaurant_name: valueOrDefault(site?.restaurant_name, previewData.menuSite.restaurant_name ?? "MenuLink Display Cafe"),
      restaurant_category: valueOrDefault(site?.restaurant_category, "디스플레이"),
      restaurant_type: valueOrDefault(site?.restaurant_type, "cafe"),
      restaurant_address: site?.restaurant_address ?? "",
      restaurant_phone: site?.restaurant_phone ?? "",
      page_settings: pageSettingsAreEmpty(site?.page_settings) ? (previewData.menuSite.page_settings as Json) : site?.page_settings,
      updated_at: new Date().toISOString(),
    };

    const { error: updateError } = await supabase.from("menu_sites").update(sitePayload).eq("id", menuSiteId);
    if (updateError) {
      throw new Error(`Display 기본 메뉴판 정보 저장에 실패했습니다: ${updateError.message}`);
    }
  }

  const pageInserts: MenuPageInsert[] = previewData.pages.map((page) => ({
    menu_site_id: menuSiteId,
    title: page.title,
    description: page.description,
    description_visible: page.description_visible,
    display_settings: page.display_settings as Json,
    legacy_section_key: page.legacy_section_key,
    visible: page.visible,
    sort_order: page.sort_order,
  }));

  const { data: insertedPages, error: pagesError } = await supabase
    .from("menu_pages")
    .insert(pageInserts)
    .select("id, title, sort_order");

  if (pagesError) {
    throw new Error(`Display 기본 페이지 생성에 실패했습니다: ${pagesError.message}`);
  }

  const pageIdByPreviewId = new Map(
    previewData.pages.flatMap((page) => {
      const insertedPage = (insertedPages ?? []).find((row) => row.title === page.title && row.sort_order === page.sort_order);
      return insertedPage ? [[page.id, insertedPage.id]] : [];
    })
  );

  const categoryInserts: MenuCategoryInsert[] = previewData.categories.map((category) => ({
    menu_site_id: menuSiteId,
    menu_page_id: category.menu_page_id ? pageIdByPreviewId.get(category.menu_page_id) ?? null : null,
    name: category.name,
    description: null,
    description_visible: false,
    section_key: "main_menu",
    visible: category.visible,
    sort_order: category.sort_order,
  }));

  const { data: insertedCategories, error: categoriesError } = await supabase
    .from("menu_categories")
    .insert(categoryInserts)
    .select("id, name, menu_page_id, sort_order");

  if (categoriesError) {
    throw new Error(`Display 기본 카테고리 생성에 실패했습니다: ${categoriesError.message}`);
  }

  const categoryIdByPreviewId = new Map(
    previewData.categories.flatMap((category) => {
      const menuPageId = category.menu_page_id ? pageIdByPreviewId.get(category.menu_page_id) ?? null : null;
      const insertedCategory = (insertedCategories ?? []).find((row) => (
        row.name === category.name &&
        row.menu_page_id === menuPageId &&
        row.sort_order === category.sort_order
      ));
      return insertedCategory ? [[category.id, insertedCategory.id]] : [];
    })
  );

  const itemInserts: MenuItemInsert[] = previewData.items.map((item) => ({
    menu_site_id: menuSiteId,
    category_id: item.category_id ? categoryIdByPreviewId.get(item.category_id) ?? null : null,
    name: item.name,
    set_name: item.set_name ?? null,
    description: null,
    price: item.price,
    price_label: item.price_label,
    portion_label: null,
    image_url: null,
    image_path: null,
    badge_label: item.badge_label,
    recommended: item.recommended,
    price_visible: item.price_visible,
    portion_visible: false,
    traits_visible: false,
    visible: item.visible,
    sort_order: item.sort_order,
  }));

  let { data: insertedItems, error: itemsError } = await supabase
    .from("menu_items")
    .insert(itemInserts)
    .select("id, name, category_id, sort_order");

  if (
    itemsError &&
    (itemsError.message.toLowerCase().includes("badge_label") ||
      itemsError.message.toLowerCase().includes("could not find") ||
      itemsError.code === "42703")
  ) {
    const fallbackItemInserts = itemInserts.map((menuItem) => {
      const fallbackMenuItem = { ...menuItem };
      delete fallbackMenuItem.badge_label;
      return fallbackMenuItem;
    });
    const fallbackResult = await supabase.from("menu_items").insert(fallbackItemInserts).select("id, name, category_id, sort_order");
    insertedItems = fallbackResult.data;
    itemsError = fallbackResult.error;
  }

  if (itemsError) {
    throw new Error(`Display 기본 아이템 생성에 실패했습니다: ${itemsError.message}`);
  }

  const itemIdByPreviewId = new Map(
    previewData.items.flatMap((item) => {
      const categoryId = item.category_id ? categoryIdByPreviewId.get(item.category_id) ?? null : null;
      const insertedItem = (insertedItems ?? []).find((row) => (
        row.name === item.name &&
        row.category_id === categoryId &&
        row.sort_order === item.sort_order
      ));
      return insertedItem ? [[item.id, insertedItem.id]] : [];
    })
  );

  const priceOptionInserts: MenuItemPriceOptionInsert[] = previewData.priceOptions.flatMap((option) => {
    const menuItemId = itemIdByPreviewId.get(option.menu_item_id);
    if (!menuItemId) return [];

    return [{
      menu_site_id: menuSiteId,
      menu_item_id: menuItemId,
      label: option.label,
      price: option.price,
      price_label: option.price_label,
      visible: option.visible,
      sort_order: option.sort_order,
    }];
  });

  if (priceOptionInserts.length > 0) {
    const { error: priceOptionsError } = await supabase.from("menu_item_price_options").insert(priceOptionInserts);

    if (
      priceOptionsError &&
      !priceOptionsError.message.toLowerCase().includes("menu_item_price_options") &&
      !priceOptionsError.message.toLowerCase().includes("does not exist") &&
      priceOptionsError.code !== "42P01"
    ) {
      throw new Error(`Display 기본 가격 옵션 생성에 실패했습니다: ${priceOptionsError.message}`);
    }
  }

  return {
    created: true,
    presetKey: "display",
    pageCount: pageInserts.length,
    categoryCount: categoryInserts.length,
    itemCount: itemInserts.length,
    chefCount: 0,
    eventCount: 0,
    socialLinkCount: 0,
  };
}

export async function createStarterMenuData(
  supabase: SupabaseClient,
  menuSiteId: string,
  templateKey?: string | null,
  restaurantCategory?: string | null,
  templateCategory?: string | null,
  productKey?: string | null,
  options: CreateStarterMenuDataOptions = {}
) {
  if (isDisplayMenuATemplateKey(templateKey)) {
    return createDisplayMenuAStarterData(supabase, menuSiteId, options);
  }

  const preset = getStarterPreset(templateKey, restaurantCategory, templateCategory);
  if (isCafeDesignATemplateKey(templateKey) && preset.pages.length !== 1) {
    throw new Error("cafe_design_a 기본 메뉴는 메뉴 페이지 1개로만 생성되어야 합니다.");
  }

  const serviceType = getStarterServiceType(productKey);
  const useLeanPreset = shouldUseLeanStarterPreset(serviceType);
  const starterMenuItemsVisible = preset.sample_items_visible ?? !useLeanPreset;
  const maxPriceOptionsPerItem = getTemplateCapabilities(templateKey).maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
  const { count, error: countError } = await supabase
    .from("menu_pages")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuSiteId);

  if (countError) {
    throw new Error(`기본 메뉴 중복 확인에 실패했습니다: ${countError.message}`);
  }

  if ((count ?? 0) > 0 && !options.force) {
    return { created: false, presetKey: preset.key, pageCount: 0, categoryCount: 0, itemCount: 0, chefCount: 0, eventCount: 0, socialLinkCount: 0 };
  }

  if (options.applySiteDefaults !== false) {
    await applyStarterSiteDefaults(supabase, menuSiteId, preset, serviceType);
  }

  const pageInserts: MenuPageInsert[] = preset.pages.map((page, index) => ({
    menu_site_id: menuSiteId,
    title: page.title,
    description: null,
    description_visible: true,
    legacy_section_key: page.legacy_section_key,
    visible: true,
    sort_order: index,
  }));

  const { data: pages, error: pagesError } = await supabase.from("menu_pages").insert(pageInserts).select("id, title");

  if (pagesError) {
    throw new Error(`기본 메뉴 페이지 생성에 실패했습니다: ${pagesError.message}`);
  }

  const pageIdByTitle = new Map((pages ?? []).map((page) => [page.title, page.id]));
  const categoryInserts: MenuCategoryInsert[] = preset.pages.flatMap((page) => {
    const pageId = pageIdByTitle.get(page.title);
    return page.categories.map((category, index) => ({
      menu_site_id: menuSiteId,
      menu_page_id: pageId ?? null,
      name: category.name,
      description: null,
      description_visible: true,
      section_key: category.section_key ?? page.legacy_section_key,
      visible: true,
      sort_order: index + 1,
    }));
  });

  const { data: categories, error: categoriesError } = await supabase
    .from("menu_categories")
    .insert(categoryInserts)
    .select("id, name, menu_page_id");

  if (categoriesError) {
    throw new Error(`기본 메뉴 카테고리 생성에 실패했습니다: ${categoriesError.message}`);
  }

  const categoryIdByKey = new Map((categories ?? []).map((category) => [`${category.menu_page_id ?? ""}:${category.name}`, category.id]));
  const itemInserts: MenuItemInsert[] = preset.pages.flatMap((page) => {
    const pageId = pageIdByTitle.get(page.title) ?? "";
    return page.categories.flatMap((category) => {
      const categoryId = categoryIdByKey.get(`${pageId}:${category.name}`) ?? null;
      return category.items.map((menuItem, index) => ({
        menu_site_id: menuSiteId,
        category_id: categoryId,
        name: menuItem.name,
        set_name: menuItem.set_name ?? null,
        description: menuItem.description,
        price: menuItem.price,
        price_label: menuItem.price_label ?? null,
        portion_label: menuItem.portion_label ?? null,
        image_url: menuItem.image_url ?? STARTER_PLACEHOLDERS.item,
        image_path: null,
        badge_label: menuItem.badge_label ?? (menuItem.recommended ? "추천" : null),
        recommended: menuItem.recommended ?? false,
        price_visible: true,
        portion_visible: true,
        traits_visible: true,
        visible: starterMenuItemsVisible,
        sort_order: index + 1,
      }));
    });
  });

  let { data: insertedItems, error: itemsError } = await supabase.from("menu_items").insert(itemInserts).select("id, name, category_id");

  if (
    itemsError &&
    (itemsError.message.toLowerCase().includes("badge_label") ||
      itemsError.message.toLowerCase().includes("could not find") ||
      itemsError.code === "42703")
  ) {
    const fallbackItemInserts = itemInserts.map((menuItem) => {
      const fallbackMenuItem = { ...menuItem };
      delete fallbackMenuItem.badge_label;
      return fallbackMenuItem;
    });
    const fallbackResult = await supabase.from("menu_items").insert(fallbackItemInserts).select("id, name, category_id");
    insertedItems = fallbackResult.data;
    itemsError = fallbackResult.error;
  }

  if (itemsError) {
    throw new Error(`기본 메뉴 아이템 생성에 실패했습니다: ${itemsError.message}`);
  }

  const itemIdByKey = new Map((insertedItems ?? []).map((menuItem) => [`${menuItem.category_id ?? ""}:${menuItem.name}`, menuItem.id]));

  const starterFeaturedItemNames = getStarterFeaturedItemNames(preset);
  if (starterFeaturedItemNames.length > 0) {
    const featuredItem = starterFeaturedItemNames
      .map((name) => (insertedItems ?? []).find((menuItem) => menuItem.name === name))
      .find((menuItem) => Boolean(menuItem?.id));

    if (featuredItem?.id) {
      const { data: siteSettings, error: siteSettingsError } = await supabase
        .from("menu_sites")
        .select("page_settings")
        .eq("id", menuSiteId)
        .maybeSingle();

      if (siteSettingsError) {
        throw new Error(`대표 추천 메뉴 기본값 확인에 실패했습니다: ${siteSettingsError.message}`);
      }

      const nextPageSettings = {
        ...getJsonRecord(siteSettings?.page_settings),
        featured_item_enabled: true,
        featured_item_id: featuredItem.id,
      } satisfies Record<string, Json>;

      const { error: featuredSettingsError } = await supabase
        .from("menu_sites")
        .update({
          page_settings: nextPageSettings as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", menuSiteId);

      if (featuredSettingsError) {
        throw new Error(`대표 추천 메뉴 기본값 저장에 실패했습니다: ${featuredSettingsError.message}`);
      }
    }
  }

  const priceOptionInserts: MenuItemPriceOptionInsert[] = preset.pages.flatMap((page) => {
    const pageId = pageIdByTitle.get(page.title) ?? "";
    return page.categories.flatMap((category) => {
      const categoryId = categoryIdByKey.get(`${pageId}:${category.name}`) ?? "";
      return category.items.flatMap((menuItem) => {
        const menuItemId = itemIdByKey.get(`${categoryId}:${menuItem.name}`);
        if (!menuItemId || !menuItem.price_options?.length) return [];

        return menuItem.price_options.slice(0, maxPriceOptionsPerItem).map((option, index) => ({
          menu_site_id: menuSiteId,
          menu_item_id: menuItemId,
          label: option.label,
          price: option.price ?? null,
          price_label: option.price_label ?? null,
          visible: true,
          sort_order: index + 1,
        }));
      });
    });
  });

  if (priceOptionInserts.length > 0) {
    const { error: priceOptionsError } = await supabase.from("menu_item_price_options").insert(priceOptionInserts);

    if (
      priceOptionsError &&
      !priceOptionsError.message.toLowerCase().includes("menu_item_price_options") &&
      !priceOptionsError.message.toLowerCase().includes("does not exist") &&
      priceOptionsError.code !== "42P01"
    ) {
      throw new Error(`기본 가격 옵션 생성에 실패했습니다: ${priceOptionsError.message}`);
    }
  }

  const includeAuxiliaryContent = options.includeAuxiliaryContent !== false;
  const chefInserts: MenuChefInsert[] = useLeanPreset || !includeAuxiliaryContent
    ? []
    : preset.chefs.slice(0, MENU_LIMITS.maxChefsPerSite).map((chef, index) => ({
        menu_site_id: menuSiteId,
        chef_name: chef.chef_name,
        chef_role: chef.chef_role,
        chef_description: chef.chef_description,
        chef_image_url: STARTER_PLACEHOLDERS.chef,
        chef_image_path: null,
        visible: true,
        sort_order: index + 1,
      }));

  if (chefInserts.length > 0) {
    const { error: chefsError } = await supabase.from("menu_chefs").insert(chefInserts);

    if (chefsError) {
      throw new Error(`기본 셰프/인물 정보 생성에 실패했습니다: ${chefsError.message}`);
    }
  }

  const eventInserts: MenuEventInsert[] = useLeanPreset || !includeAuxiliaryContent
    ? []
    : preset.events.slice(0, MENU_LIMITS.maxEventsPerSite).map((event, index) => ({
        menu_site_id: menuSiteId,
        event_title: event.event_title,
        event_subtitle: event.event_subtitle,
        event_description: event.event_description,
        event_period: event.event_period,
        event_image_url: STARTER_PLACEHOLDERS.event,
        event_image_path: null,
        event_benefit: event.event_benefit,
        event_detail: event.event_detail,
        event_regular_price_label: event.event_regular_price_label,
        event_sale_price_label: event.event_sale_price_label,
        event_price_visible: true,
        visible: true,
        sort_order: index + 1,
      }));

  if (eventInserts.length > 0) {
    const { error: eventsError } = await supabase.from("menu_events").insert(eventInserts);

    if (eventsError) {
      throw new Error(`기본 이벤트 생성에 실패했습니다: ${eventsError.message}`);
    }
  }

  const socialLinkInserts: MenuSocialLinkInsert[] = useLeanPreset || !includeAuxiliaryContent
    ? []
    : preset.socialLinks.slice(0, MENU_LIMITS.maxSocialLinksPerSite).map((link, index) => ({
        menu_site_id: menuSiteId,
        type: link.type,
        label: link.label,
        display_name: link.display_name,
        url: link.url,
        visible: true,
        sort_order: index,
      }));

  if (socialLinkInserts.length > 0) {
    const { error: socialLinksError } = await supabase.from("menu_social_links").insert(socialLinkInserts);

    if (socialLinksError) {
      throw new Error(`기본 SNS 링크 생성에 실패했습니다: ${socialLinksError.message}`);
    }
  }

  return {
    created: true,
    presetKey: preset.key,
    pageCount: pageInserts.length,
    categoryCount: categoryInserts.length,
    itemCount: itemInserts.length,
    chefCount: chefInserts.length,
    eventCount: eventInserts.length,
    socialLinkCount: socialLinkInserts.length,
  };
}
