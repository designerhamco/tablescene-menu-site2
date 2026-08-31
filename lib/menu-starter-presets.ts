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
import {
  getAubeTableDefaultCoverBackgroundColor,
  isAubeTableTemplate,
} from "@/lib/aube-table";
import {
  DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
  DEFAULT_TIME_SALE_BADGE_TEXT,
  DEFAULT_TIME_SALE_DISPLAY_MODE,
  TIME_SALE_TIMEZONE,
  TIME_SALE_TYPE,
  type TimeSaleDisplayMode,
} from "@/lib/menu-time-sales";
import type { TimeSaleScheduleType } from "@/lib/menu-time-sale-schedule";
import type {
  MenuWidgetAspectRatio,
  MenuWidgetObjectFit,
  MenuWidgetTextAlign,
  MenuWidgetType,
} from "@/lib/menu-widgets";

export { MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";

export type StarterPresetKey = TemplateCategoryKey;

export type StarterItem = {
  key?: string;
  name: string;
  set_name?: string;
  price: number;
  price_label?: string | null;
  price_visible?: boolean;
  price_note?: string | null;
  portion_label?: string;
  description: string;
  image_url?: string | null;
  badge_label?: string | null;
  recommended?: boolean;
  is_sold_out?: boolean;
  price_options?: StarterPriceOption[];
  price_column_values?: StarterItemPriceColumnValue[];
};

export type StarterPriceOption = {
  label: string;
  price?: number;
  price_label?: string;
};

export type StarterCategoryPriceColumn = {
  key: string;
  label: string;
  visible?: boolean;
};

export type StarterItemPriceColumnValue = {
  key: string;
  price?: number | null;
  price_label?: string | null;
  visible?: boolean;
};

export type StarterCategory = {
  key?: string;
  name: string;
  section_key?: MenuSectionKey;
  description?: string | null;
  description_visible?: boolean;
  course_price?: number | null;
  course_price_label?: string | null;
  course_price_visible?: boolean;
  course_price_description?: string | null;
  course_price_description_visible?: boolean;
  price_columns?: StarterCategoryPriceColumn[];
  items: StarterItem[];
};

export type StarterPage = {
  key?: string;
  title: string;
  description?: string | null;
  description_visible?: boolean;
  layout_columns?: 1 | 2;
  text_alignment?: "left" | "center";
  legacy_section_key: MenuSectionKey;
  categories: StarterCategory[];
  direct_items?: StarterItem[];
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
  logo_url?: string | null;
  logo_path?: string | null;
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

export type StarterFeaturedSlide = {
  id: string;
  image_url: string;
  image_path?: string | null;
  featured_item_key?: string;
  featured_item_name: string;
  sort_order: number;
};

export type StarterTimeSale = {
  key?: string;
  name: string;
  targets?: StarterTimeSaleTarget[];
  schedule_type?: TimeSaleScheduleType;
  duration_minutes?: number;
  daily_start_time?: string | null;
  daily_end_time?: string | null;
  badge_text?: string;
  badge_background_color?: string;
  time_display_mode?: TimeSaleDisplayMode;
  time_display_text?: string | null;
};

export type StarterTimeSaleTarget = {
  target_item_key?: string;
  target_item_name: string;
  target_price_column_key?: string | null;
  sale_price: number;
  sale_price_label?: string | null;
};

export type StarterWidget = {
  key: string;
  page_key?: string;
  type: MenuWidgetType;
  title?: string | null;
  description?: string | null;
  image_url?: string | null;
  image_path?: string | null;
  sort_order?: number;
  visible?: boolean;
  settings?: {
    aspectRatio?: MenuWidgetAspectRatio;
    objectFit?: MenuWidgetObjectFit;
    textAlign?: MenuWidgetTextAlign;
    altText?: string;
  };
};

export type StarterMixedContentBlock =
  | {
      block_type: "category";
      page_key?: string;
      category_key: string;
      sort_order?: number;
      visible?: boolean;
    }
  | {
      block_type: "widget";
      page_key?: string;
      widget_key: string;
      sort_order?: number;
      visible?: boolean;
    };

export type ResolvedStarterFeaturedSlide = {
  id: string;
  image_url: string | null;
  image_path: string | null;
  featured_item_id: string | null;
  sort_order: number;
};

export type StarterPreset = {
  key: StarterPresetKey;
  site: StarterSiteDefaults;
  template_key?: string;
  featured_item_name?: string;
  featured_item_key?: string;
  featured_slides?: StarterFeaturedSlide[];
  time_sales?: StarterTimeSale[];
  widgets?: StarterWidget[];
  mixed_content_order?: StarterMixedContentBlock[];
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
type MenuCategoryPriceColumnInsert = Database["public"]["Tables"]["menu_category_price_columns"]["Insert"];
type MenuItemInsert = Database["public"]["Tables"]["menu_items"]["Insert"];
type MenuItemPriceColumnValueInsert = Database["public"]["Tables"]["menu_item_price_column_values"]["Insert"];
type MenuItemPriceOptionInsert = Database["public"]["Tables"]["menu_item_price_options"]["Insert"];
type MenuPromotionInsert = Database["public"]["Tables"]["menu_promotions"]["Insert"];
type MenuPromotionItemInsert = Database["public"]["Tables"]["menu_promotion_items"]["Insert"];
type MenuChefInsert = Database["public"]["Tables"]["menu_chefs"]["Insert"];
type MenuEventInsert = Database["public"]["Tables"]["menu_events"]["Insert"];
type MenuSocialLinkInsert = Database["public"]["Tables"]["menu_social_links"]["Insert"];
type AubeTableMenuPageInsert = MenuPageInsert & {
  layout_columns?: 1 | 2;
  text_alignment?: "left" | "center";
};
type AubeTableMenuCategoryInsert = MenuCategoryInsert & {
  course_price?: number | null;
  course_price_label?: string | null;
  course_price_visible?: boolean;
  course_price_description?: string | null;
  course_price_description_visible?: boolean;
};
type AubeTableMenuItemInsert = MenuItemInsert & {
  menu_page_id?: string | null;
};

const STARTER_PLACEHOLDERS = {
  logo: "/placeholders/starter/logo.svg",
  item: "/placeholders/starter/menu-item.svg",
  chef: "/placeholders/starter/chef.svg",
  event: "/placeholders/starter/event.svg",
} as const;

const BREW_CHAPTER_COVER_IMAGE = "/menu-templates/cafe_design_a/nutty-cream-featured.jpg";
const AUBE_TABLE_COVER_IMAGE = "/menu-templates/dining_aube_table_a/aube-table-cover.png";
const BREW_CHAPTER_SIGNATURE_ITEM_IMAGE = "/menu-templates/cafe_design_a/malcha_present.jpg";
const BREW_CHAPTER_STARTER_ITEM_IMAGE = "/menu-templates/cafe_design_a/black-sesame.jpeg";
const BREW_CHAPTER_MAIN_ITEM_IMAGE = "/menu-templates/cafe_design_a/nutty-cream.jpeg";

const STARTER_PAGE_SETTINGS = {
  intro_enabled: true,
  menu_cover_enabled: true,
  cover_image_visible: true,
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
  cover_image_visible: true,
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
  if (productKey === "personal_trial_basic_1month" || productKey?.startsWith("business_basic")) return "menu";
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
  options: {
    key?: string;
    set_name?: string;
    price_label?: string | null;
    price_visible?: boolean;
    portion_label?: string;
    badge_label?: string | null;
    recommended?: boolean;
    is_sold_out?: boolean;
    image_url?: string | null;
    price_options?: StarterPriceOption[];
    price_column_values?: StarterItemPriceColumnValue[];
  } = {}
): StarterItem {
  return { name, price, description, ...options };
}

function isCafeAStarterTemplateKey(templateKey?: string | null) {
  const normalizedTemplateKey = templateKey?.trim().toLowerCase();
  return (
    normalizedTemplateKey === "cafe_design_a" ||
    normalizedTemplateKey === "cafe_mocha_forest_a" ||
    normalizedTemplateKey === "cafe_sunday_line_a" ||
    normalizedTemplateKey === "cafe_round_focus_a" ||
    normalizedTemplateKey === "cafe_brew_chapter_a"
  );
}

function shouldApplyLeanStoreDescription(preset: StarterPreset, serviceType: StarterServiceType) {
  return (
    !shouldUseLeanStarterPreset(serviceType) ||
    preset === cafeDesignAStarterPreset ||
    preset === cafeMochaForestStarterPreset ||
    preset === cafeSundayLineStarterPreset ||
    preset === cafeRoundFocusStarterPreset ||
    preset === cafeBrewChapterStarterPreset ||
    preset === cafeNoirAStarterPreset
  );
}

function cloneStarterPriceOptions(value: unknown): StarterPriceOption[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((option) => ({ ...(option as StarterPriceOption) }));
}

function cloneStarterPriceColumns(value: unknown): StarterCategoryPriceColumn[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((column) => ({ ...(column as StarterCategoryPriceColumn) }));
}

function cloneStarterPriceColumnValues(value: unknown): StarterItemPriceColumnValue[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((columnValue) => ({ ...(columnValue as StarterItemPriceColumnValue) }));
}

function cloneStarterTimeSales(value: unknown): StarterTimeSale[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((timeSale) => ({ ...(timeSale as StarterTimeSale) }));
}

function cloneStarterWidgets(value: unknown): StarterWidget[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((widget) => ({
    ...(widget as StarterWidget),
    settings: (widget as StarterWidget).settings ? { ...(widget as StarterWidget).settings } : undefined,
  }));
}

function cloneStarterMixedContentOrder(value: unknown): StarterMixedContentBlock[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.map((block) => ({ ...(block as StarterMixedContentBlock) }));
}

function cloneStarterPresetForTemplate(preset: StarterPreset, templateKey: string): StarterPreset {
  return {
    ...preset,
    template_key: templateKey,
    site: {
      ...preset.site,
      settings: preset.site.settings ? { ...preset.site.settings } : undefined,
    },
    featured_slides: preset.featured_slides?.map((slide) => ({ ...slide })),
    time_sales: cloneStarterTimeSales(preset.time_sales),
    widgets: cloneStarterWidgets(preset.widgets),
    mixed_content_order: cloneStarterMixedContentOrder(preset.mixed_content_order),
    chefs: preset.chefs.map((chef) => ({ ...chef })),
    events: preset.events.map((event) => ({ ...event })),
    socialLinks: preset.socialLinks.map((link) => ({ ...link })),
    pages: preset.pages.map((page) => ({
      ...page,
      direct_items: page.direct_items?.map((menuItem) => ({
        ...menuItem,
        price_options: cloneStarterPriceOptions(menuItem.price_options),
        price_column_values: cloneStarterPriceColumnValues(menuItem.price_column_values),
      })),
      categories: page.categories.map((category) => ({
        ...category,
        price_columns: cloneStarterPriceColumns(category.price_columns),
        items: category.items.map((menuItem) => ({
          ...menuItem,
          price_options: cloneStarterPriceOptions(menuItem.price_options),
          price_column_values: cloneStarterPriceColumnValues(menuItem.price_column_values),
        })),
      })),
    })),
  };
}

function getStarterTimeSaleCampaignWindow(timeSale?: StarterTimeSale, now = new Date()) {
  const start = Number.isFinite(now.getTime()) ? now : new Date();
  const end = new Date(start.getTime());
  const durationMinutes = timeSale?.duration_minutes;
  if (typeof durationMinutes === "number" && Number.isFinite(durationMinutes) && durationMinutes > 0) {
    end.setMinutes(end.getMinutes() + durationMinutes);
  } else {
    end.setDate(end.getDate() + 30);
  }
  return {
    startsAt: start.toISOString(),
    endsAt: end.toISOString(),
  };
}

function getStarterFeaturedItemNames(preset: StarterPreset) {
  const names = [
    preset.featured_item_name,
    ...(preset.featured_slides ?? []).map((slide) => slide.featured_item_name),
    ...preset.pages.flatMap((page) =>
      [
        ...(page.direct_items ?? []),
        ...page.categories.flatMap((category) => category.items),
      ]
        .filter((menuItem) => menuItem.recommended === true)
        .map((menuItem) => menuItem.name)
    ),
  ].filter((name): name is string => Boolean(name));

  return Array.from(new Set(names));
}

export function getStarterFeaturedSlides(preset: StarterPreset): StarterFeaturedSlide[] {
  return [...(preset.featured_slides ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
}

export function resolveStarterFeaturedSlides<T extends { id: string; name: string; visible?: boolean | null }>(
  preset: StarterPreset,
  items: T[]
): ResolvedStarterFeaturedSlide[] {
  const itemByName = new Map(items.filter((item) => item.visible !== false).map((item) => [item.name, item.id]));

  return getStarterFeaturedSlides(preset).map((slide, index) => ({
    id: slide.id,
    image_url: slide.image_url,
    image_path: slide.image_path ?? null,
    featured_item_id: itemByName.get(slide.featured_item_name) ?? null,
    sort_order: index,
  }));
}

function resolveStarterFeaturedSlidesByKey(
  preset: StarterPreset,
  itemIdByStarterKey: ReadonlyMap<string, string>,
  itemIdByName: ReadonlyMap<string, string>
): ResolvedStarterFeaturedSlide[] {
  return getStarterFeaturedSlides(preset).map((slide, index) => ({
    id: slide.id,
    image_url: slide.image_url,
    image_path: slide.image_path ?? null,
    featured_item_id:
      (slide.featured_item_key ? itemIdByStarterKey.get(slide.featured_item_key) ?? null : null) ??
      itemIdByName.get(slide.featured_item_name) ??
      null,
    sort_order: index,
  }));
}

export function getFirstCompleteStarterFeaturedSlide(slides: ResolvedStarterFeaturedSlide[]) {
  return slides.find((slide) => Boolean(slide.image_url && slide.featured_item_id)) ?? null;
}

const cafeDesignAStarterPreset: StarterPreset = {
  key: "cafe",
  template_key: "cafe_design_a",
  site: CAFE_DESIGN_A_STITCH_SAMPLE.site,
  featured_item_name: "제주 말차 크림 라떼",
  featured_item_key: "jeju-matcha-cream-latte",
  featured_slides: CAFE_DESIGN_A_STITCH_SAMPLE.featured_slides.map((slide) => ({ ...slide })),
  time_sales: cloneStarterTimeSales(CAFE_DESIGN_A_STITCH_SAMPLE.time_sales),
  widgets: cloneStarterWidgets(CAFE_DESIGN_A_STITCH_SAMPLE.widgets),
  mixed_content_order: cloneStarterMixedContentOrder(CAFE_DESIGN_A_STITCH_SAMPLE.mixed_content_order),
  sample_items_visible: true,
  chefs: [],
  events: [],
  socialLinks: [],
  pages: [
    {
      key: "main-menu",
      title: "메뉴 페이지 1",
      legacy_section_key: "main_menu",
      categories: CAFE_DESIGN_A_STITCH_SAMPLE.pages.flatMap((page) =>
        page.categories.map((category) => ({
          key: "key" in category ? category.key : undefined,
          name: category.name,
          section_key: "section_key" in category ? (category.section_key as MenuSectionKey) : (page.legacy_section_key as MenuSectionKey),
          description: "description" in category ? category.description : undefined,
          description_visible: "description_visible" in category ? category.description_visible : undefined,
          price_columns: "price_columns" in category ? cloneStarterPriceColumns(category.price_columns) : undefined,
          items: category.items.map((menuItem) => {
            const sourceItem = menuItem as Partial<StarterItem> & Pick<StarterItem, "name" | "price" | "description">;
            return {
              key: sourceItem.key,
              name: sourceItem.name,
              set_name: sourceItem.set_name,
              price: sourceItem.price,
              price_label: sourceItem.price_label,
              price_note: sourceItem.price_note,
              portion_label: sourceItem.portion_label,
              description: sourceItem.description,
              image_url: sourceItem.image_url,
              badge_label: sourceItem.badge_label,
              recommended: sourceItem.recommended,
              is_sold_out: sourceItem.is_sold_out ?? false,
              price_options: cloneStarterPriceOptions(sourceItem.price_options),
              price_column_values: cloneStarterPriceColumnValues(sourceItem.price_column_values),
            };
          }),
        }))
      ),
    },
  ],
};

const cafeMochaForestStarterPreset: StarterPreset = cloneStarterPresetForTemplate(cafeDesignAStarterPreset, "cafe_mocha_forest_a");
const cafeSundayLineStarterPreset: StarterPreset = cloneStarterPresetForTemplate(cafeDesignAStarterPreset, "cafe_sunday_line_a");
const cafeRoundFocusStarterPreset: StarterPreset = cloneStarterPresetForTemplate(cafeDesignAStarterPreset, "cafe_round_focus_a");

const cafeBrewChapterStarterPreset: StarterPreset = {
  key: "cafe",
  template_key: "cafe_brew_chapter_a",
  site: {
    ...CAFE_DESIGN_A_STITCH_SAMPLE.site,
    restaurant_name: "MAISON ECLAT",
    intro_title: "MAISON ECLAT",
    menu_cover_title: "MAISON ECLAT",
    brand_description: "계절의 흐름과 식재료의 결을 한 접시씩 섬세하게 풀어내는 컨템포러리 다이닝입니다.",
    intro_description: "계절의 흐름과 식재료의 결을 한 접시씩 섬세하게 풀어내는 컨템포러리 다이닝입니다.",
    menu_cover_description: "계절의 흐름과 식재료의 결을 한 접시씩 섬세하게 풀어내는 컨템포러리 다이닝입니다.",
    cover_image_url: BREW_CHAPTER_COVER_IMAGE,
    settings: {
      ...(CAFE_DESIGN_A_STITCH_SAMPLE.site.settings ?? {}),
      footer_notice_1: "DINNER · 17:30–22:00",
      footer_notice_2: "Reservation · @maison.eclat",
      footer_notice_3: "알레르기 및 식이 제한은 주문 전 직원에게 알려주세요.",
    },
  },
  featured_item_name: "에클라 시그니처 코스",
  featured_item_key: "eclat-signature-course",
  featured_slides: [
    {
      id: "brew-chapter-featured-eclat-signature-course",
      image_url: BREW_CHAPTER_COVER_IMAGE,
      image_path: null,
      featured_item_key: "eclat-signature-course",
      featured_item_name: "에클라 시그니처 코스",
      sort_order: 0,
    },
  ],
  time_sales: [
    {
      key: "season-dinner-course-early-dining",
      name: "시즌 디너 코스 EARLY DINING",
      schedule_type: "daily_window",
      daily_start_time: "17:30:00",
      daily_end_time: "18:30:00",
      badge_text: "EARLY DINING",
      badge_background_color: "#263A31",
      time_display_mode: "message_and_countdown",
      time_display_text: "18:30 이전 주문 시 적용",
      targets: [
        { target_item_key: "season-dinner-course", target_item_name: "시즌 디너 코스", sale_price: 98000 },
      ],
    },
  ],
  mixed_content_order: [
    { block_type: "category", page_key: "menu-book", category_key: "tasting-course", sort_order: 0, visible: true },
    { block_type: "category", page_key: "menu-book", category_key: "starter", sort_order: 1, visible: true },
    { block_type: "category", page_key: "menu-book", category_key: "main", sort_order: 2, visible: true },
    { block_type: "category", page_key: "menu-book", category_key: "dessert", sort_order: 3, visible: true },
    { block_type: "category", page_key: "menu-book", category_key: "pairing", sort_order: 4, visible: true },
  ],
  sample_items_visible: true,
  chefs: [],
  events: [],
  socialLinks: [],
  pages: [
    {
      key: "menu-book",
      title: "MENU",
      legacy_section_key: "main_menu",
      categories: [
        {
          key: "tasting-course",
          name: "TASTING COURSE",
          section_key: "main_menu",
          items: [
            item("에클라 시그니처 코스", 145000, "계절의 흐름을 담은 여섯 가지 코스와 메인, 디저트 구성", {
              key: "eclat-signature-course",
              set_name: "ÉCLAT SIGNATURE COURSE",
              badge_label: "SIGNATURE",
              recommended: true,
              image_url: BREW_CHAPTER_SIGNATURE_ITEM_IMAGE,
            }),
            item("시즌 디너 코스", 118000, "제철 식재료의 질감과 온도를 차분하게 풀어낸 디너 코스", {
              key: "season-dinner-course",
              set_name: "SEASONAL DINNER COURSE",
              badge_label: "BEST",
            }),
            item("베지터블 테이스팅", 105000, "채소와 허브, 곡물의 풍미를 중심으로 구성한 테이스팅 코스", {
              key: "vegetable-tasting",
              set_name: "VEGETABLE TASTING",
            }),
          ],
        },
        {
          key: "starter",
          name: "STARTER",
          section_key: "main_menu",
          items: [
            item("숙성 방어와 유자", 28000, "숙성한 방어와 유자 향, 무 피클을 곁들인 스타터", {
              key: "aged-yellowtail-yuzu",
              set_name: "AGED YELLOWTAIL & YUZU",
              badge_label: "NEW",
              image_url: BREW_CHAPTER_STARTER_ITEM_IMAGE,
            }),
            item("화이트 아스파라거스", 26000, "화이트 아스파라거스와 헤이즐넛, 가벼운 버터 소스", {
              key: "white-asparagus",
              set_name: "WHITE ASPARAGUS",
              is_sold_out: true,
            }),
            item("랍스터 비스크", 32000, "랍스터 향을 진하게 우려낸 비스크와 허브 오일", {
              key: "lobster-bisque",
              set_name: "LOBSTER BISQUE",
            }),
          ],
        },
        {
          key: "main",
          name: "MAIN",
          section_key: "main_menu",
          items: [
            item("오리 가슴살과 체리", 46000, "천천히 익힌 오리 가슴살과 체리 소스, 구운 비트", {
              key: "duck-breast-cherry",
              set_name: "DUCK BREAST & CHERRY",
            }),
            item("한우 채끝과 셀러리악", 58000, "숯불에 구운 한우 채끝과 셀러리악 퓌레", {
              key: "hanwoo-striploin-celeriac",
              set_name: "HANWOO STRIPLOIN & CELERIAC",
              image_url: BREW_CHAPTER_MAIN_ITEM_IMAGE,
            }),
            item("제철 생선과 샤프란", 44000, "제철 생선과 샤프란 소스, 펜넬", {
              key: "seasonal-fish-saffron",
              set_name: "MARKET FISH & SAFFRON",
              price_label: "MARKET PRICE",
            }),
          ],
        },
        {
          key: "dessert",
          name: "DESSERT",
          section_key: "dessert_drink",
          items: [
            item("바닐라 밀푀유", 16000, "바닐라 크림과 캐러멜라이즈드 페이스트리", {
              key: "vanilla-mille-feuille",
              set_name: "VANILLA MILLE-FEUILLE",
            }),
            item("다크 초콜릿 테린", 18000, "카카오의 깊은 풍미와 올리브 오일, 소금", {
              key: "dark-chocolate-terrine",
              set_name: "DARK CHOCOLATE TERRINE",
            }),
            item("제철 과일 파블로바", 17000, "제철 과일과 머랭, 가벼운 허브 크림", {
              key: "seasonal-fruit-pavlova",
              set_name: "SEASONAL FRUIT PAVLOVA",
            }),
          ],
        },
        {
          key: "pairing",
          name: "PAIRING",
          section_key: "dessert_drink",
          price_columns: [
            { key: "three-glasses", label: "3 GLASSES" },
            { key: "five-glasses", label: "5 GLASSES" },
          ],
          items: [
            item("와인 페어링", 68000, "코스 흐름에 맞춘 다섯 잔의 와인 페어링", {
              key: "wine-pairing-five-glasses",
              set_name: "WINE PAIRING",
              price_column_values: [
                { key: "three-glasses", price: 42000 },
                { key: "five-glasses", price: 68000 },
              ],
            }),
            item("논알코올 페어링", 38000, "발효 음료와 차, 허브로 구성한 논알코올 페어링", {
              key: "non-alcohol-pairing",
              set_name: "ZERO-PROOF PAIRING",
              price_column_values: [
                { key: "three-glasses", price: 24000 },
                { key: "five-glasses", price: 38000 },
              ],
            }),
            item("티 페어링", 28000, "메뉴의 향과 온도에 맞춘 세 가지 티 페어링", {
              key: "tea-pairing",
              set_name: "TEA PAIRING",
              price_column_values: [
                { key: "three-glasses", price: 18000 },
                { key: "five-glasses", price: 28000 },
              ],
            }),
          ],
        },
      ],
    },
  ],
};

cafeSundayLineStarterPreset.site = {
  ...cafeSundayLineStarterPreset.site,
  restaurant_name: "SUNDAY ROASTERS",
  intro_title: "SUNDAY ROASTERS",
  menu_cover_title: "SUNDAY ROASTERS",
  brand_description: "좋은 원두와 담백한 디저트를 천천히 즐길 수 있도록, 매일 균형 잡힌 커피와 편안한 한 잔을 준비하는 동네 로스터리입니다.",
  intro_description: "좋은 원두와 담백한 디저트를 천천히 즐기는 동네 로스터리입니다.",
  menu_cover_description: "좋은 원두와 담백한 디저트를 천천히 즐기는 동네 로스터리입니다.",
  settings: {
    ...(cafeSundayLineStarterPreset.site.settings ?? {}),
    footer_notice_1: "Wi-Fi · SUNDAY_GUEST",
    footer_notice_2: "Instagram · @sunday.roasters",
    footer_notice_3: "반려동물은 야외 좌석만 이용 가능합니다.",
  },
};
cafeSundayLineStarterPreset.featured_item_name = "선데이 크림 라떼";
cafeSundayLineStarterPreset.featured_item_key = "sunday-cream-latte";
cafeSundayLineStarterPreset.featured_slides = cafeSundayLineStarterPreset.featured_slides?.map((slide) => ({
  ...slide,
  featured_item_key: "sunday-cream-latte",
  featured_item_name: "선데이 크림 라떼",
}));
cafeSundayLineStarterPreset.time_sales = [
  {
    key: "americano-morning-deal",
    name: "아메리카노 모닝딜",
    schedule_type: "once",
    badge_text: "모닝딜",
    badge_background_color: "#A30000",
    time_display_mode: "message",
    time_display_text: "매일 오전 8시부터 10시까지",
    targets: [
      { target_item_key: "americano", target_item_name: "아메리카노", target_price_column_key: "hot", sale_price: 3500 },
      { target_item_key: "americano", target_item_name: "아메리카노", target_price_column_key: "ice", sale_price: 4000 },
    ],
  },
  {
    key: "brown-butter-scone-closeout",
    name: "브라운 버터 스콘 재고 마감",
    schedule_type: "once",
    duration_minutes: 60,
    badge_text: "재고 마감",
    badge_background_color: "#A30000",
    time_display_mode: "countdown",
    targets: [
      { target_item_key: "brown-butter-scone", target_item_name: "브라운 버터 스콘", sale_price: 3800 },
    ],
  },
];
cafeSundayLineStarterPreset.mixed_content_order = [
  { block_type: "category", page_key: "main-menu", category_key: "signature", sort_order: 0, visible: true },
  { block_type: "category", page_key: "main-menu", category_key: "coffee", sort_order: 1, visible: true },
  { block_type: "category", page_key: "main-menu", category_key: "non-coffee", sort_order: 2, visible: true },
  { block_type: "category", page_key: "main-menu", category_key: "tea-ade", sort_order: 3, visible: true },
  { block_type: "category", page_key: "main-menu", category_key: "bakery-dessert", sort_order: 4, visible: true },
];
cafeSundayLineStarterPreset.pages = [
  {
    key: "main-menu",
    title: "메뉴 페이지 1",
    legacy_section_key: "main_menu",
    categories: [
      {
        key: "signature",
        name: "SIGNATURE COFFEE",
        section_key: "main_menu",
        items: [
          item("선데이 크림 라떼", 6500, "고소한 크림과 에스프레소를 부드럽게 즐기는 시그니처 라떼", {
            key: "sunday-cream-latte",
            badge_label: "SIGNATURE",
            recommended: true,
            image_url: "/menu-templates/cafe_design_a/malcha.jpg",
          }),
          item("솔티드 메이플 라떼", 6800, "메이플의 은은한 단맛과 소금 크림을 더한 라떼", {
            key: "salted-maple-latte",
            badge_label: "BEST",
            image_url: "/menu-templates/cafe_design_a/nutty-cream.jpeg",
          }),
          item("오렌지 바닐라 콜드브루", 6800, "오렌지 향과 바닐라 크림을 더한 부드러운 콜드브루", {
            key: "orange-vanilla-cold-brew",
            badge_label: "NEW",
          }),
        ],
      },
      {
        key: "coffee",
        name: "COFFEE",
        section_key: "main_menu",
        price_columns: [
          { key: "hot", label: "HOT" },
          { key: "ice", label: "ICE" },
        ],
        items: [
          item("아메리카노", 4500, "균형 잡힌 고소함과 깔끔한 끝맛", {
            key: "americano",
            price_column_values: [
              { key: "hot", price: 4500 },
              { key: "ice", price: 5000 },
            ],
          }),
          item("카페 라떼", 5500, "진한 에스프레소와 부드러운 우유", {
            key: "cafe-latte",
            price_column_values: [
              { key: "hot", price: 5500 },
              { key: "ice", price: 6000 },
            ],
          }),
          item("플랫화이트", 5300, "진한 에스프레소와 촘촘한 밀크폼의 조화", {
            key: "flat-white",
          }),
        ],
      },
      {
        key: "non-coffee",
        name: "NON-COFFEE",
        section_key: "main_menu",
        price_columns: [
          { key: "hot", label: "HOT" },
          { key: "ice", label: "ICE" },
        ],
        items: [
          item("말차 크림 라떼", 6500, "제주 말차와 담백한 크림의 조화", {
            key: "matcha-cream-latte",
            badge_label: "NEW",
            price_column_values: [
              { key: "hot", price: 6500 },
              { key: "ice", price: 7000 },
            ],
          }),
          item("다크 초콜릿 밀크", 6000, "진한 다크 초콜릿과 부드러운 우유를 담은 음료", {
            key: "dark-chocolate-milk",
          }),
        ],
      },
      {
        key: "tea-ade",
        name: "TEA & ADE",
        section_key: "dessert_drink",
        items: [
          item("자몽 로즈마리 에이드", 6300, "생자몽과 로즈마리 향이 산뜻한 에이드", {
            key: "grapefruit-rosemary-ade",
          }),
          item("캐모마일 시트러스 티", 5800, "캐모마일과 감귤 향을 담은 블렌드 티", {
            key: "chamomile-citrus-tea",
          }),
          item("얼그레이 피치 티", 5800, "얼그레이 향과 복숭아의 은은한 단맛", {
            key: "earl-grey-peach-tea",
          }),
        ],
      },
      {
        key: "bakery-dessert",
        name: "BAKERY & DESSERT",
        section_key: "dessert_drink",
        items: [
          item("브라운 버터 스콘", 4800, "고소한 브라운 버터 풍미의 바삭한 스콘", {
            key: "brown-butter-scone",
          }),
          item("레몬 마들렌", 3800, "레몬 향을 담아 촉촉하게 구운 마들렌", {
            key: "lemon-madeleine",
          }),
        ],
      },
    ],
  },
];

cafeRoundFocusStarterPreset.site = {
  ...cafeRoundFocusStarterPreset.site,
  restaurant_name: "ROUND ROASTERS",
  intro_title: "ROUND ROASTERS",
  menu_cover_title: "ROUND ROASTERS",
  brand_description: "둥근 향과 편안한 맛을 담아 매일의 커피를 만듭니다.",
  intro_description: "둥근 향과 편안한 맛을 담아 매일의 커피를 만듭니다.",
  menu_cover_description: "둥근 향과 편안한 맛을 담아 매일의 커피를 만듭니다.",
  settings: {
    ...(cafeRoundFocusStarterPreset.site.settings ?? {}),
    footer_notice_1: "Wi-Fi · ROUND_GUEST",
    footer_notice_2: "Instagram · @round.roasters",
    footer_notice_3: "디카페인 원두로 변경 가능합니다.",
  },
};
cafeRoundFocusStarterPreset.featured_item_name = "라운드 크림 커피";
cafeRoundFocusStarterPreset.featured_item_key = "round-cream-coffee";
cafeRoundFocusStarterPreset.featured_slides = [{
  id: "round-focus-featured-round-cream-coffee",
  image_url: "/menu-templates/cafe_design_a/nutty-cream.jpeg",
  image_path: null,
  featured_item_key: "round-cream-coffee",
  featured_item_name: "라운드 크림 커피",
  sort_order: 0,
}];
cafeRoundFocusStarterPreset.time_sales = [
  {
    key: "americano-morning-deal",
    name: "아메리카노 모닝딜",
    schedule_type: "once",
    badge_text: "모닝딜",
    badge_background_color: "#9B4F33",
    time_display_mode: "message",
    time_display_text: "매일 오전 8시부터 10시까지",
    targets: [
      { target_item_key: "americano", target_item_name: "아메리카노", sale_price: 3900 },
    ],
  },
];
cafeRoundFocusStarterPreset.mixed_content_order = [
  { block_type: "category", page_key: "main-menu", category_key: "house-special", sort_order: 0, visible: true },
  { block_type: "category", page_key: "main-menu", category_key: "espresso", sort_order: 1, visible: true },
  { block_type: "category", page_key: "main-menu", category_key: "milk-cream", sort_order: 2, visible: true },
  { block_type: "category", page_key: "main-menu", category_key: "tea-ade", sort_order: 3, visible: true },
  { block_type: "category", page_key: "main-menu", category_key: "bake", sort_order: 4, visible: true },
];
cafeRoundFocusStarterPreset.pages = [
  {
    key: "main-menu",
    title: "메뉴 페이지 1",
    legacy_section_key: "main_menu",
    categories: [
      {
        key: "house-special",
        name: "HOUSE SPECIALS",
        section_key: "main_menu",
        items: [
          item("라운드 크림 커피", 6500, "부드러운 크림과 고소한 에스프레소의 시그니처 커피", {
            key: "round-cream-coffee",
            badge_label: "SIGNATURE",
            recommended: true,
            image_url: "/menu-templates/cafe_design_a/nutty-cream.jpeg",
          }),
          item("브라운 슈가 플랫화이트", 6200, "브라운 슈가의 은은한 단맛을 담은 플랫화이트", {
            key: "brown-sugar-flat-white",
            badge_label: "BEST",
            image_url: "/menu-templates/cafe_design_a/malcha.jpg",
          }),
          item("오렌지 크림 콜드브루", 6800, "오렌지 향과 부드러운 크림을 더한 콜드브루", {
            key: "orange-cream-coldbrew",
            badge_label: "NEW",
          }),
        ],
      },
      {
        key: "espresso",
        name: "ESPRESSO",
        section_key: "main_menu",
        items: [
          item("에스프레소", 3500, "진한 향과 깔끔한 단맛", {
            key: "espresso",
          }),
          item("아메리카노", 4500, "견과류의 고소함과 균형 잡힌 끝맛", {
            key: "americano",
          }),
          item("카푸치노", 5500, "풍성한 우유 거품과 진한 에스프레소", {
            key: "cappuccino",
          }),
        ],
      },
      {
        key: "milk-cream",
        name: "MILK & CREAM",
        section_key: "main_menu",
        items: [
          item("카페 라떼", 5500, "에스프레소와 부드러운 우유의 조화", {
            key: "cafe-latte",
          }),
          item("바닐라 빈 밀크", 6000, "바닐라 빈과 우유를 담은 달콤한 음료", {
            key: "vanilla-bean-milk",
            badge_label: "NEW",
          }),
          item("말차 오트 밀크", 6200, "제주 말차와 고소한 오트 밀크의 조화", {
            key: "matcha-oat-milk",
          }),
        ],
      },
      {
        key: "tea-ade",
        name: "TEA & ADE",
        section_key: "dessert_drink",
        items: [
          item("시트러스 민트 에이드", 6200, "감귤과 민트 향이 산뜻한 에이드", {
            key: "citrus-mint-ade",
          }),
          item("얼그레이 피치 티", 5800, "얼그레이 향과 복숭아의 은은한 단맛", {
            key: "earl-grey-peach-tea",
          }),
        ],
      },
      {
        key: "bake",
        name: "BAKE",
        section_key: "dessert_drink",
        items: [
          item("무화과 버터 스콘", 4800, "무화과와 발효 버터를 넣어 구운 스콘", {
            key: "fig-butter-scone",
          }),
          item("레몬 마들렌", 3800, "레몬 향을 담아 촉촉하게 구운 마들렌", {
            key: "lemon-madeleine",
          }),
        ],
      },
    ],
  },
];

const cafeNoirAStarterPreset: StarterPreset = {
  key: "cafe",
  site: {
    restaurant_name: "NOIR CAFE",
    restaurant_category: "카페",
    restaurant_type: "cafe",
    menu_cover_label: "",
    intro_title: "NOIR CAFE",
    intro_description: "cold desserts & coffee",
    brand_description: "cold desserts & coffee",
    menu_cover_title: "",
    menu_cover_description: "",
    about_description: "차분한 온도의 커피와 디저트를 전하는 미니멀 카페입니다.",
    opening_hours: "Everyday 10:00 - 21:00",
    restaurant_address: "14, Artimenu-ro, Seoul",
    restaurant_phone: "02-0000-0000",
    cover_image_url: "",
    logo_url: "/menu-templates/cafe_noir_a/noir-logo2.png",
    logo_path: null,
    settings: {
      logo_replaces_name: true,
      footer_notice_1: "차분한 온도의 커피와 디저트를 전하는 미니멀 카페입니다.",
      footer_notice_2: "Address · 14, Artimenu-ro, Seoul",
      footer_notice_3: "QUIET SIPS. SOFT FINISH.",
    },
  },
  featured_item_name: "Vanilla Pudding",
  sample_items_visible: true,
  chefs: [],
  events: [],
  socialLinks: [],
  pages: [
    {
      title: "MENU",
      legacy_section_key: "main_menu",
      categories: [
        {
          name: "HOT COFFEE",
          section_key: "main_menu",
          items: [
            item("Espresso", 3800, "짙고 선명한 첫 모금", { price_label: "3.8" }),
            item("Americano", 4500, "깔끔한 산미와 고소한 밸런스", { price_label: "4.5" }),
            item("Flat White", 5200, "부드러운 우유와 에스프레소", { price_label: "5.2" }),
            item("Vanilla Latte", 5800, "바닐라빈의 은은한 단맛", { price_label: "5.8" }),
          ],
        },
        {
          name: "ICED COFFEE",
          section_key: "main_menu",
          items: [
            item("Iced Americano", 4500, "차갑고 산뜻한 데일리 커피", { price_label: "4.5" }),
            item("Iced Latte", 5200, "고소한 우유와 에스프레소", { price_label: "5.2" }),
            item("Cold Brew", 5500, "천천히 추출한 부드러운 커피", { price_label: "5.5" }),
            item("Cream Cold Brew", 6200, "차가운 크림과 콜드브루", { price_label: "6.2" }),
          ],
        },
        {
          name: "DESSERT",
          section_key: "dessert_drink",
          items: [
            item("Vanilla Pudding", 5800, "부드러운 바닐라 커스터드", { price_label: "5.8", recommended: true }),
            item("Caramel Financier", 4200, "짭조름한 캐러멜 풍미", { price_label: "4.2", badge_label: "인기", recommended: true }),
            item("Lemon Pound", 4800, "상큼한 레몬 아이싱", { price_label: "4.8" }),
            item("Tiramisu Roll", 6500, "마스카포네 크림과 커피 향", { price_label: "6.5" }),
            item("Seasonal Tart", 7200, "제철 과일과 바삭한 타르트지", { price_label: "7.2" }),
            item("Butter Scone", 4600, "담백한 버터와 크림", { price_label: "4.6" }),
          ],
        },
        {
          name: "ADD ONS",
          section_key: "dessert_drink",
          items: [
            item("Oat Milk", 800, "고소한 식물성 우유", { price_label: "+0.8" }),
            item("Almond Milk", 800, "은은한 견과 향", { price_label: "+0.8" }),
            item("Extra Shot", 700, "진한 한 샷 추가", { price_label: "+0.7" }),
            item("Vanilla Syrup", 600, "바닐라 단맛", { price_label: "+0.6" }),
            item("Ice Cream", 1500, "차가운 바닐라", { price_label: "+1.5" }),
            item("Cream Topping", 1200, "가벼운 수제 크림", { price_label: "+1.2" }),
          ],
        },
      ],
    },
  ],
};

const diningAubeTableStarterPreset: StarterPreset = {
  key: "fine_dining",
  template_key: "dining_aube_table_a",
  site: {
    ...CAFE_DESIGN_A_STITCH_SAMPLE.site,
    restaurant_name: "오브 테이블",
    restaurant_category: "파인다이닝",
    restaurant_type: "fine_dining",
    menu_cover_label: "",
    intro_title: "오브 테이블",
    intro_description: "계절의 온도와 식재료의 결을 한 접시씩 섬세하게 풀어냅니다.",
    brand_description: "제철 산지의 식재료를 절제된 조리와 섬세한 서비스로 완성하는 컨템포러리 다이닝입니다.",
    menu_cover_title: "THE MENU",
    menu_cover_description: "오브 테이블 스페셜 코스 & 셰프 셀렉션",
    about_description: "한 접시에서 다음 접시로 이어지는 계절의 흐름을 소개합니다.",
    opening_hours: "Dinner 17:30–22:00",
    restaurant_address: "서울시 예시구 아티메뉴로 10",
    restaurant_phone: "02-0000-0000",
    cover_image_url: AUBE_TABLE_COVER_IMAGE,
    logo_url: null,
    logo_path: null,
    settings: {
      footer_notice_1: "Dinner · 17:30–22:00",
      footer_notice_2: "Reservation only",
      footer_notice_3: "알레르기 및 식이 제한은 예약 시 알려주세요.",
    },
  },
  featured_item_name: undefined,
  sample_items_visible: true,
  chefs: [],
  events: [],
  socialLinks: [],
  pages: [
    {
      key: "signature-menu",
      title: "Signature Course",
      description: "오브 테이블의 계절을 가장 온전히 경험하는 시그니처 코스",
      description_visible: true,
      layout_columns: 1,
      text_alignment: "center",
      legacy_section_key: "main_menu",
      categories: [
        {
          key: "aube-signature-course",
          name: "Aube signature",
          description: "제철 산지의 식재료를 여덟 장면으로 풀어낸 디너 코스",
          description_visible: true,
          course_price: 185000,
          course_price_label: "₩185,000",
          course_price_visible: true,
          course_price_description: "1인 기준 · 와인 페어링 + ₩120,000",
          course_price_description_visible: true,
          items: [
            item("Amuse-bouche", 0, "제주 성게 · 감태 · 유자"),
            item("Cold starter", 0, "숙성 방어 · 무 · 캐비아"),
            item("Warm starter", 0, "화이트 아스파라거스 · 헤이즐넛"),
            item("Fish", 0, "제주 옥돔 · 조개 · 샤프란"),
            item("Main", 0, "한우 안심 · 셀러리악 · 트러플"),
            item("Dessert", 0, "금귤 · 바닐라 · 올리브 오일"),
          ],
        },
      ],
    },
    {
      key: "a-la-carte-menu",
      title: "A La Carte Menu",
      description: "오늘의 식재료를 취향에 따라 선택하는 단품 메뉴",
      description_visible: true,
      layout_columns: 2,
      text_alignment: "left",
      legacy_section_key: "main_menu",
      categories: [
        {
          key: "starter-course",
          name: "Starter",
          description: "식사의 시작을 여는 가벼운 접시",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("관자와 시금치", 32000, "가리비 관자 · 시금치 퓌레 · 레몬 버터"),
            item("랍스터 비스크", 28000, "랍스터 · 코냑 · 펜넬"),
          ],
        },
        {
          key: "main-course",
          name: "Main",
          description: "제철 식재료의 풍미를 깊게 담은 메인",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("제주 옥돔", 52000, "조개 육수 · 샤프란 · 제철 채소"),
            item("한우 안심", 78000, "셀러리악 · 트러플 · 레드 와인 소스"),
          ],
        },
        {
          key: "dessert-course",
          name: "Dessert",
          description: "계절의 여운을 남기는 디저트",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("금귤과 바닐라", 18000, "금귤 · 마다가스카르 바닐라 · 올리브 오일"),
            item("초콜릿과 헤이즐넛", 19000, "다크 초콜릿 · 헤이즐넛 · 에스프레소"),
          ],
        },
      ],
    },
    {
      key: "beverage-menu",
      title: "Drink Menu",
      description: "요리의 흐름을 이어주는 와인과 논알코올 셀렉션",
      description_visible: true,
      layout_columns: 2,
      text_alignment: "left",
      legacy_section_key: "dessert_drink",
      categories: [
        {
          key: "wine-selection",
          name: "Wine",
          description: "소믈리에가 고른 글라스와 보틀 셀렉션",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("Champagne", 35000, "Brut NV · France", { price_options: [
              { label: "Glass", price: 35000 },
              { label: "Bottle", price: 210000 },
            ] }),
            item("Chardonnay", 28000, "Bourgogne · France", { price_options: [
              { label: "Glass", price: 28000 },
              { label: "Bottle", price: 165000 },
            ] }),
            item("Pinot noir", 30000, "Bourgogne · France", { price_options: [
              { label: "Glass", price: 30000 },
              { label: "Bottle", price: 180000 },
            ] }),
          ],
        },
        {
          key: "non-alcohol-selection",
          name: "Non-alcohol",
          description: "차와 발효 음료로 구성한 페어링",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("Seasonal mocktail", 18000, "제철 과실과 허브로 완성한 논알코올 칵테일"),
            item("Sparkling tea", 16000, "제철 허브와 차를 발효한 스파클링 티"),
            item("Mineral water", 9000, "Still / Sparkling"),
          ],
        },
      ],
      direct_items: [
        item("Wine pairing", 120000, "시그니처 코스를 위한 6잔 구성"),
        item("Non-alcohol pairing", 65000, "차와 발효 음료를 중심으로 한 6잔 구성"),
      ],
    },
  ],
};

const diningAubeTableBStarterPreset: StarterPreset = {
  key: "fine_dining",
  template_key: "dining_aube_table_b",
  site: {
    ...CAFE_DESIGN_A_STITCH_SAMPLE.site,
    restaurant_name: "메종 마레",
    restaurant_category: "파인다이닝",
    restaurant_type: "fine_dining",
    menu_cover_label: "",
    intro_title: "메종 마레",
    intro_description: "불과 숲, 제철의 풍경을 한 접시마다 현대적인 감각으로 풀어냅니다.",
    brand_description: "프렌치 조리의 섬세함에 한국의 계절감을 더한 컨템포러리 다이닝입니다.",
    menu_cover_title: "MAISON MARAIS",
    menu_cover_description: "계절의 풍경을 담은 모던 프렌치 다이닝",
    about_description: "정교한 소스와 제철 식재료가 만드는 저녁의 흐름을 소개합니다.",
    opening_hours: "Dinner 18:00–22:30",
    restaurant_address: "서울시 예시구 마레길 12",
    restaurant_phone: "02-0000-0000",
    cover_image_url: AUBE_TABLE_COVER_IMAGE,
    logo_url: null,
    logo_path: null,
    settings: {
      footer_notice_1: "Dinner · 18:00–22:30",
      footer_notice_2: "Reservation only",
      footer_notice_3: "알레르기 및 식이 제한은 예약 시 알려주세요.",
    },
  },
  featured_item_name: undefined,
  sample_items_visible: true,
  chefs: [],
  events: [],
  socialLinks: [],
  pages: [
    {
      key: "chefs-tasting",
      title: "Chef's Tasting",
      description: "메종 마레의 계절을 여섯 장면으로 경험하는 디너 코스",
      description_visible: true,
      layout_columns: 1,
      text_alignment: "center",
      legacy_section_key: "main_menu",
      categories: [
        {
          key: "marais-evening-course",
          name: "Marais evening",
          description: "숲과 바다, 불의 온도를 따라 이어지는 셰프 테이스팅",
          description_visible: true,
          course_price: 178000,
          course_price_label: "₩178,000",
          course_price_visible: true,
          course_price_description: "1인 기준 · 와인 페어링 + ₩95,000",
          course_price_description_visible: true,
          items: [
            item("첫 인사", 0, "참돔 · 청사과 · 딜"),
            item("차가운 전채", 0, "대게 · 콜라비 · 캐비아"),
            item("따뜻한 전채", 0, "아티초크 · 모렐 · 콩테"),
            item("바다", 0, "제주 옥돔 · 홍합 · 샤프란"),
            item("불", 0, "한우 채끝 · 셀러리악 · 마데이라"),
            item("마무리", 0, "딸기 · 루바브 · 바질"),
          ],
        },
      ],
    },
    {
      key: "seasonal-plates",
      title: "Seasonal Plates",
      description: "오늘의 재료와 취향에 맞춰 고르는 메종 마레의 단품 요리",
      description_visible: true,
      layout_columns: 2,
      text_alignment: "left",
      legacy_section_key: "main_menu",
      categories: [
        {
          key: "from-the-garden",
          name: "From the garden",
          description: "계절 채소의 질감과 향을 살린 가벼운 접시",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("화이트 아스파라거스", 31000, "헤이즐넛 · 레몬 버베나 · 브라운 버터"),
            item("비트와 염소 치즈", 26000, "라즈베리 · 월넛 · 레드 와인 비네거"),
          ],
        },
        {
          key: "from-the-sea",
          name: "From the sea",
          description: "제철 해산물과 섬세한 소스의 조화",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("제주 옥돔과 뵈르 블랑", 54000, "홍합 · 펜넬 · 사프란 오일"),
            item("가리비와 샴페인 소스", 48000, "콜리플라워 · 캐비아 · 차이브"),
          ],
        },
        {
          key: "from-the-land",
          name: "From the land",
          description: "불의 온도로 풍미를 완성한 메인 요리",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("오리 가슴살", 58000, "무화과 · 엔다이브 · 주니퍼 주"),
            item("한우 채끝", 76000, "셀러리악 · 트러플 · 마데이라 소스"),
          ],
        },
      ],
    },
    {
      key: "wine-and-pairing",
      title: "Wine & Pairing",
      description: "요리의 여운을 이어주는 와인과 논알코올 페어링",
      description_visible: true,
      layout_columns: 2,
      text_alignment: "left",
      legacy_section_key: "dessert_drink",
      categories: [
        {
          key: "champagne-and-white",
          name: "Champagne & White",
          description: "섬세한 산도와 향을 중심으로 고른 셀렉션",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("Pierre Gimonnet Brut", 32000, "Cuis · Champagne", { price_options: [
              { label: "Glass", price: 32000 },
              { label: "Bottle", price: 190000 },
            ] }),
            item("Chablis Premier Cru", 27000, "Burgundy · France", { price_options: [
              { label: "Glass", price: 27000 },
              { label: "Bottle", price: 158000 },
            ] }),
          ],
        },
        {
          key: "red-wine",
          name: "Red Wine",
          description: "우아한 질감과 긴 여운을 지닌 레드 와인",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("Pinot Noir Vieilles Vignes", 29000, "Burgundy · France", { price_options: [
              { label: "Glass", price: 29000 },
              { label: "Bottle", price: 172000 },
            ] }),
            item("Saint-Émilion Grand Cru", 31000, "Bordeaux · France", { price_options: [
              { label: "Glass", price: 31000 },
              { label: "Bottle", price: 185000 },
            ] }),
          ],
        },
        {
          key: "zero-proof",
          name: "Zero Proof",
          description: "차와 허브, 제철 과실을 활용한 논알코올 셀렉션",
          description_visible: false,
          course_price: null,
          course_price_label: null,
          course_price_visible: false,
          course_price_description: null,
          course_price_description_visible: false,
          items: [
            item("Pear & verbena", 17000, "배 · 레몬 버베나 · 토닉"),
            item("Fermented tea", 15000, "우롱차 · 살구 · 자스민"),
          ],
        },
      ],
      direct_items: [
        item("Wine pairing", 95000, "테이스팅 코스를 위한 5잔 구성"),
        item("Zero-proof pairing", 58000, "차와 발효 음료를 중심으로 한 5잔 구성"),
      ],
    },
  ],
};

const templateStarterPresets: Partial<Record<string, StarterPreset>> = {
  cafe_design_a: cafeDesignAStarterPreset,
  cafe_mocha_forest_a: cafeMochaForestStarterPreset,
  cafe_sunday_line_a: cafeSundayLineStarterPreset,
  cafe_round_focus_a: cafeRoundFocusStarterPreset,
  cafe_brew_chapter_a: cafeBrewChapterStarterPreset,
  dining_aube_table_a: diningAubeTableStarterPreset,
  dining_aube_table_b: diningAubeTableBStarterPreset,
  cafe_noir_a: cafeNoirAStarterPreset,
};

const starterPresets: Partial<Record<StarterPresetKey, StarterPreset>> & { cafe: StarterPreset } = {
  cafe: {
    key: "cafe",
    site: {
      restaurant_name: "아티메뉴 카페",
      restaurant_category: "카페",
      restaurant_type: "cafe",
      menu_cover_label: "SPECIALTY COFFEE",
      intro_title: "따뜻한 커피와 디저트가 있는 공간",
      intro_description: "하루의 여유를 채워주는 커피와 디저트를 준비했습니다.",
      brand_description: "아티메뉴 카페는 편안한 분위기 속에서 커피와 디저트를 즐길 수 있는 공간입니다.",
      menu_cover_title: "Cafe Menu",
      menu_cover_description: "시그니처 음료부터 디저트까지, 오늘의 취향에 맞는 메뉴를 골라보세요.",
      about_description: "커피 한 잔의 여유와 함께 머물기 좋은 공간을 지향합니다.",
      opening_hours: "매일 10:00 - 21:00",
      restaurant_address: "서울시 예시구 아티메뉴로 1",
      restaurant_phone: "02-0000-0000",
      cover_image_url: "/placeholders/starter/cafe-cover.svg",
    },
    chefs: [
      {
        chef_name: "아티메뉴 바리스타",
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
      { type: "instagram", label: "인스타그램", display_name: "@artimenu_cafe", url: "https://instagram.com/example" },
      { type: "blog", label: "블로그", display_name: "아티메뉴 카페 블로그", url: "https://example.com/blog" },
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
      restaurant_name: "아티메뉴 브런치",
      restaurant_category: "브런치",
      restaurant_type: "brunch",
      menu_cover_label: "BRUNCH CAFE",
      intro_title: "여유로운 하루를 여는 브런치",
      intro_description: "브런치 플레이트와 음료, 디저트를 함께 즐겨보세요.",
      brand_description: "아티메뉴 브런치는 편안한 공간에서 여유로운 식사를 제안합니다.",
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
        chef_name: "아티메뉴 브런치팀",
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
      { type: "instagram", label: "인스타그램", display_name: "@artimenu_brunch", url: "https://instagram.com/example" },
      { type: "threads", label: "스레드", display_name: "@artimenu_brunch", url: "https://threads.net/@example" },
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
      restaurant_name: "아티메뉴 다이닝",
      restaurant_category: "파인다이닝",
      restaurant_type: "fine_dining",
      menu_cover_label: "FINE DINING",
      intro_title: "계절의 흐름을 담은 다이닝",
      intro_description: "정성스럽게 준비한 코스와 페어링을 경험해보세요.",
      brand_description: "아티메뉴 다이닝은 재료의 계절감과 섬세한 서비스를 중요하게 생각합니다.",
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
      { type: "instagram", label: "인스타그램", display_name: "@artimenu_dining", url: "https://instagram.com/example" },
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
      restaurant_name: "아티메뉴 키친",
      restaurant_category: "캐주얼다이닝",
      restaurant_type: "casual_dining",
      menu_cover_label: "CASUAL DINING",
      intro_title: "편안하게 즐기는 다이닝 메뉴",
      intro_description: "스테이크, 파스타, 피자와 함께하는 캐주얼한 식사 공간입니다.",
      brand_description: "아티메뉴 키친은 누구나 편하게 즐길 수 있는 다이닝 메뉴를 제공합니다.",
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
      { type: "instagram", label: "인스타그램", display_name: "@artimenu_kitchen", url: "https://instagram.com/example" },
      { type: "blog", label: "블로그", display_name: "아티메뉴 키친 소식", url: "https://example.com/blog" },
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
              item("하우스 스테이크", 32000, "아티메뉴 하우스 스타일 스테이크", { portion_label: "200g", recommended: true }),
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
      restaurant_name: "아티메뉴 버거",
      restaurant_category: "패스트푸드",
      restaurant_type: "fast_food",
      menu_cover_label: "FAST & CASUAL",
      intro_title: "빠르고 맛있게 즐기는 메뉴",
      intro_description: "버거, 치킨, 사이드와 음료를 간편하게 확인해보세요.",
      brand_description: "아티메뉴 버거는 빠르고 간편하게 즐길 수 있는 메뉴를 제공합니다.",
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
        chef_name: "아티메뉴 크루",
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
      { type: "instagram", label: "인스타그램", display_name: "@artimenu_burger", url: "https://instagram.com/example" },
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

function valueOrNullableDefault(value: string | null | undefined, defaultValue: string | null) {
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
  const resolvedStarterPageSettings = isAubeTableTemplate(preset.template_key)
    ? { ...starterPageSettings, multi_page_cover_background_color: getAubeTableDefaultCoverBackgroundColor(preset.template_key) }
    : starterPageSettings;
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
  const hasPresetLogoUrl = Object.prototype.hasOwnProperty.call(preset.site, "logo_url");
  const hasPresetLogoPath = Object.prototype.hasOwnProperty.call(preset.site, "logo_path");
  const presetLogoUrl = hasPresetLogoUrl ? (preset.site.logo_url ?? null) : STARTER_PLACEHOLDERS.logo;
  const presetLogoPath = hasPresetLogoPath ? (preset.site.logo_path ?? null) : null;

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
    logo_url: valueOrNullableDefault(site?.logo_url, presetLogoUrl),
    logo_path: valueOrNullableDefault(site?.logo_path, presetLogoPath),
    cover_image_url: valueOrDefault(site?.cover_image_url, preset.site.cover_image_url),
    cover_image_path: site?.cover_image_path ?? null,
    page_settings: pageSettingsAreEmpty(site?.page_settings) ? (resolvedStarterPageSettings as unknown as Json) : site?.page_settings,
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
      restaurant_name: valueOrDefault(site?.restaurant_name, previewData.menuSite.restaurant_name ?? "ArtiMenu Display Cafe"),
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
  if (isCafeAStarterTemplateKey(templateKey) && preset.pages.length !== 1) {
    throw new Error("CafeA starter family 기본 메뉴는 메뉴 페이지 1개로만 생성되어야 합니다.");
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

  const pageInserts: AubeTableMenuPageInsert[] = preset.pages.map((page, index) => ({
    menu_site_id: menuSiteId,
    title: page.title,
    description: page.description ?? null,
    description_visible: page.description_visible ?? Boolean(page.description),
    legacy_section_key: page.legacy_section_key,
    visible: true,
    sort_order: index,
    ...(isAubeTableTemplate(templateKey)
      ? {
          layout_columns: page.layout_columns ?? 1,
          text_alignment: page.text_alignment ?? "left",
        }
      : {}),
  }));

  const { data: pages, error: pagesError } = await supabase.from("menu_pages").insert(pageInserts as never).select("id, title");

  if (pagesError) {
    throw new Error(`기본 메뉴 페이지 생성에 실패했습니다: ${pagesError.message}`);
  }

  const pageIdByTitle = new Map((pages ?? []).map((page) => [page.title, page.id]));
  const categoryInserts: AubeTableMenuCategoryInsert[] = preset.pages.flatMap((page) => {
    const pageId = pageIdByTitle.get(page.title);
    return page.categories.map((category, index) => ({
      menu_site_id: menuSiteId,
      menu_page_id: pageId ?? null,
      name: category.name,
      description: category.description ?? null,
      description_visible: category.description_visible ?? Boolean(category.description),
      section_key: category.section_key ?? page.legacy_section_key,
      visible: true,
      sort_order: index + 1,
      ...(isAubeTableTemplate(templateKey)
        ? {
            course_price: category.course_price ?? null,
            course_price_label: category.course_price_label ?? null,
            course_price_visible: category.course_price_visible ?? true,
            course_price_description: category.course_price_description ?? null,
            course_price_description_visible: category.course_price_description_visible ?? true,
          }
        : {}),
    }));
  });

  const { data: categories, error: categoriesError } = await supabase
    .from("menu_categories")
    .insert(categoryInserts as never)
    .select("id, name, menu_page_id");

  if (categoriesError) {
    throw new Error(`기본 메뉴 카테고리 생성에 실패했습니다: ${categoriesError.message}`);
  }

  const categoryIdByKey = new Map((categories ?? []).map((category) => [`${category.menu_page_id ?? ""}:${category.name}`, category.id]));
  const categoryPriceColumnInserts: MenuCategoryPriceColumnInsert[] = preset.pages.flatMap((page) => {
    const pageId = pageIdByTitle.get(page.title) ?? "";
    return page.categories.flatMap((category) => {
      const categoryId = categoryIdByKey.get(`${pageId}:${category.name}`);
      if (!categoryId || !category.price_columns?.length) return [];

      return category.price_columns.map((column, index) => ({
        menu_site_id: menuSiteId,
        category_id: categoryId,
        key: column.key,
        label: column.label,
        visible: column.visible ?? true,
        sort_order: index,
      }));
    });
  });

  let insertedPriceColumns:
    | Array<Pick<Database["public"]["Tables"]["menu_category_price_columns"]["Row"], "id" | "category_id" | "key">>
    | null = null;
  if (categoryPriceColumnInserts.length > 0) {
    const { data, error } = await supabase
      .from("menu_category_price_columns")
      .insert(categoryPriceColumnInserts)
      .select("id, category_id, key");

    if (error && error.code !== "42P01" && !error.message.toLowerCase().includes("menu_category_price_columns")) {
      throw new Error(`기본 가격 컬럼 생성에 실패했습니다: ${error.message}`);
    }

    insertedPriceColumns = data;
  }

  const priceColumnIdByKey = new Map(
    (insertedPriceColumns ?? []).map((column) => [`${column.category_id}:${column.key}`, column.id])
  );
  const itemInserts: AubeTableMenuItemInsert[] = preset.pages.flatMap((page) => {
    const pageId = pageIdByTitle.get(page.title) ?? "";
    const courseItems = page.categories.flatMap((category) => {
      const categoryId = categoryIdByKey.get(`${pageId}:${category.name}`) ?? null;
      return category.items.map((menuItem, index) => ({
        menu_site_id: menuSiteId,
        category_id: categoryId,
        ...(isAubeTableTemplate(templateKey) ? { menu_page_id: pageId || null } : {}),
        name: menuItem.name,
        set_name: menuItem.set_name ?? null,
        description: menuItem.description,
        price: menuItem.price,
        price_label: menuItem.price_label ?? null,
        price_note: menuItem.price_note ?? null,
        portion_label: menuItem.portion_label ?? null,
        image_url: menuItem.image_url ?? (isCafeAStarterTemplateKey(templateKey) ? null : STARTER_PLACEHOLDERS.item),
        image_path: null,
        badge_label: menuItem.badge_label ?? (menuItem.recommended ? "추천" : null),
        recommended: menuItem.recommended ?? false,
        is_sold_out: menuItem.is_sold_out ?? false,
        price_visible:
          menuItem.price_visible ??
          !(isAubeTableTemplate(templateKey) && menuItem.price === 0 && !menuItem.price_label),
        portion_visible: Boolean(menuItem.portion_label),
        traits_visible: true,
        visible: starterMenuItemsVisible,
        sort_order: index + 1,
      }));
    });
    const directItems = (page.direct_items ?? []).map((menuItem, index) => ({
      menu_site_id: menuSiteId,
      menu_page_id: pageId || null,
      category_id: null,
      name: menuItem.name,
      set_name: menuItem.set_name ?? null,
      description: menuItem.description,
      price: menuItem.price,
      price_label: menuItem.price_label ?? null,
      price_note: menuItem.price_note ?? null,
      portion_label: menuItem.portion_label ?? null,
      image_url: menuItem.image_url ?? null,
      image_path: null,
      badge_label: menuItem.badge_label ?? (menuItem.recommended ? "추천" : null),
      recommended: menuItem.recommended ?? false,
      is_sold_out: menuItem.is_sold_out ?? false,
      price_visible: menuItem.price_visible ?? true,
      portion_visible: Boolean(menuItem.portion_label),
      traits_visible: true,
      visible: starterMenuItemsVisible,
      sort_order: index + 1,
    } satisfies AubeTableMenuItemInsert));
    return [...courseItems, ...directItems];
  });

  let { data: insertedItems, error: itemsError } = await supabase.from("menu_items").insert(itemInserts as never).select("id, name, category_id");

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
    const fallbackResult = await supabase.from("menu_items").insert(fallbackItemInserts as never).select("id, name, category_id");
    insertedItems = fallbackResult.data;
    itemsError = fallbackResult.error;
  }

  if (itemsError) {
    throw new Error(`기본 메뉴 아이템 생성에 실패했습니다: ${itemsError.message}`);
  }

  const itemIdByKey = new Map((insertedItems ?? []).map((menuItem) => [`${menuItem.category_id ?? ""}:${menuItem.name}`, menuItem.id]));
  const itemIdByStarterKey = new Map<string, string>();
  const itemIdByName = new Map<string, string>();
  preset.pages.forEach((page) => {
    const pageId = pageIdByTitle.get(page.title) ?? "";
    page.categories.forEach((category) => {
      const categoryId = categoryIdByKey.get(`${pageId}:${category.name}`) ?? "";
      category.items.forEach((menuItem) => {
        const insertedItemId = itemIdByKey.get(`${categoryId}:${menuItem.name}`);
        if (!insertedItemId) return;
        if (menuItem.key) itemIdByStarterKey.set(menuItem.key, insertedItemId);
        itemIdByName.set(menuItem.name, insertedItemId);
      });
    });
  });

  const starterFeaturedSlides = resolveStarterFeaturedSlidesByKey(preset, itemIdByStarterKey, itemIdByName);
  const firstCompleteStarterFeaturedSlide = getFirstCompleteStarterFeaturedSlide(starterFeaturedSlides);
  const starterFeaturedItemNames = getStarterFeaturedItemNames(preset);
  if (starterFeaturedItemNames.length > 0) {
    const featuredItemId =
      firstCompleteStarterFeaturedSlide?.featured_item_id ??
      (preset.featured_item_key ? itemIdByStarterKey.get(preset.featured_item_key) ?? null : null) ??
      (preset.featured_item_name ? itemIdByName.get(preset.featured_item_name) ?? null : null) ??
      starterFeaturedItemNames.map((name) => itemIdByName.get(name) ?? null).find((id): id is string => Boolean(id)) ??
      null;

    if (featuredItemId) {
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
        featured_item_id: featuredItemId,
        ...(starterFeaturedSlides.length > 0 ? { featured_slides: starterFeaturedSlides as unknown as Json } : {}),
      } satisfies Record<string, Json>;

      const { error: featuredSettingsError } = await supabase
        .from("menu_sites")
        .update({
          ...(firstCompleteStarterFeaturedSlide
            ? {
                cover_image_url: firstCompleteStarterFeaturedSlide.image_url,
                cover_image_path: firstCompleteStarterFeaturedSlide.image_path,
              }
            : {}),
          page_settings: nextPageSettings as Json,
          updated_at: new Date().toISOString(),
        })
        .eq("id", menuSiteId);

      if (featuredSettingsError) {
        throw new Error(`대표 추천 메뉴 기본값 저장에 실패했습니다: ${featuredSettingsError.message}`);
      }
    }
  }

  const priceColumnValueInserts: MenuItemPriceColumnValueInsert[] = preset.pages.flatMap((page) => {
    const pageId = pageIdByTitle.get(page.title) ?? "";
    return page.categories.flatMap((category) => {
      const categoryId = categoryIdByKey.get(`${pageId}:${category.name}`) ?? "";
      return category.items.flatMap((menuItem) => {
        const menuItemId = itemIdByKey.get(`${categoryId}:${menuItem.name}`);
        if (!menuItemId || !menuItem.price_column_values?.length) return [];

        return menuItem.price_column_values.flatMap((columnValue) => {
          const priceColumnId = priceColumnIdByKey.get(`${categoryId}:${columnValue.key}`);
          const hasPrice = typeof columnValue.price === "number" && Number.isFinite(columnValue.price);
          if (!priceColumnId || !hasPrice) return [];

          return [{
            menu_item_id: menuItemId,
            price_column_id: priceColumnId,
            price: columnValue.price ?? null,
            price_label: columnValue.price_label ?? null,
            visible: columnValue.visible ?? true,
          }];
        });
      });
    });
  });

  if (priceColumnValueInserts.length > 0) {
    const { error } = await supabase.from("menu_item_price_column_values").insert(priceColumnValueInserts);

    if (error && error.code !== "42P01" && !error.message.toLowerCase().includes("menu_item_price_column_values")) {
      throw new Error(`기본 옵션 컬럼 가격 생성에 실패했습니다: ${error.message}`);
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

  const starterTimeSales = preset.time_sales ?? [];
  if (starterTimeSales.length > 0) {
    for (const timeSale of starterTimeSales) {
      const campaignWindow = getStarterTimeSaleCampaignWindow(timeSale);
      const resolvedTargets = (timeSale.targets ?? []).flatMap((saleTarget) => {
        const targetItems = preset.pages.flatMap((page) => {
          const pageId = pageIdByTitle.get(page.title) ?? "";
          return page.categories.flatMap((category) => {
            const categoryId = categoryIdByKey.get(`${pageId}:${category.name}`) ?? "";
            const starterItem = category.items.find((menuItem) =>
              saleTarget.target_item_key
                ? menuItem.key === saleTarget.target_item_key
                : menuItem.name === saleTarget.target_item_name
            );
            const menuItemId = starterItem ? itemIdByKey.get(`${categoryId}:${starterItem.name}`) : null;
            return menuItemId ? [{ categoryId, menuItemId }] : [];
          });
        });
        const target = targetItems[0];
        if (!target) return [];

        const priceColumnId = saleTarget.target_price_column_key
          ? priceColumnIdByKey.get(`${target.categoryId}:${saleTarget.target_price_column_key}`) ?? null
          : null;
        if (saleTarget.target_price_column_key && !priceColumnId) return [];

        return [{
          menuItemId: target.menuItemId,
          priceColumnId,
          salePrice: saleTarget.sale_price,
          salePriceLabel: saleTarget.sale_price_label ?? null,
        }];
      });
      if (resolvedTargets.length === 0) continue;

      const promotionSettings: Record<string, Json> = {
        time_display_mode: timeSale.time_display_mode ?? DEFAULT_TIME_SALE_DISPLAY_MODE,
        badge_text: timeSale.badge_text ?? DEFAULT_TIME_SALE_BADGE_TEXT,
        badge_background_color: timeSale.badge_background_color ?? DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
      };
      if (timeSale.time_display_text) {
        promotionSettings.time_display_text = timeSale.time_display_text;
      }

      const promotionPayload: MenuPromotionInsert = {
        menu_site_id: menuSiteId,
        type: TIME_SALE_TYPE,
        name: timeSale.name,
        active: true,
        schedule_type: timeSale.schedule_type ?? "daily_window",
        starts_at: campaignWindow.startsAt,
        ends_at: campaignWindow.endsAt,
        daily_start_time: timeSale.daily_start_time ?? null,
        daily_end_time: timeSale.daily_end_time ?? null,
        timezone: TIME_SALE_TIMEZONE,
        settings: promotionSettings as Json,
      };

      const { data: promotion, error: promotionError } = await supabase
        .from("menu_promotions")
        .insert(promotionPayload)
        .select("id")
        .single();

      if (promotionError) {
        if (promotionError.code === "42P01" || promotionError.message.toLowerCase().includes("menu_promotions")) continue;
        throw new Error(`기본 타임세일 생성에 실패했습니다: ${promotionError.message}`);
      }

      const promotionItemPayload: MenuPromotionItemInsert[] = resolvedTargets.map((target) => ({
        promotion_id: promotion.id,
        menu_item_id: target.menuItemId,
        price_column_id: target.priceColumnId,
        sale_price: target.salePrice,
        sale_price_label: target.salePriceLabel,
        visible: true,
      }));
      const { error: promotionItemError } = await supabase
        .from("menu_promotion_items")
        .insert(promotionItemPayload);

      if (
        promotionItemError &&
        promotionItemError.code !== "42P01" &&
        !promotionItemError.message.toLowerCase().includes("menu_promotion_items")
      ) {
        throw new Error(`기본 타임세일 대상 생성에 실패했습니다: ${promotionItemError.message}`);
      }
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
