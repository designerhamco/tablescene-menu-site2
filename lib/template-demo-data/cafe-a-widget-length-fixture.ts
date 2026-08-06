import { DEFAULT_LOCALE, SUPPORTED_LOCALES, isSupportedLocale, type SupportedLocale } from "@/lib/locales";
import { normalizePcTabletLayoutMode, type PcTabletLayoutMode } from "@/lib/menu-layout-modes";
import { getFirstCompleteStarterFeaturedSlide, getStarterPreset, resolveStarterFeaturedSlides } from "@/lib/menu-starter-presets";
import type { MenuPageData } from "@/lib/menu-page-data";
import { TIME_SALE_TIMEZONE } from "@/lib/menu-time-sales";
import {
  MAX_MENU_WIDGET_DESCRIPTION_LENGTH,
  MAX_MENU_WIDGET_TITLE_LENGTH,
  MAX_MENU_WIDGETS_PER_PAGE,
  normalizeMenuWidgetDraft,
  validateMenuWidgetDraft,
  type MenuWidgetDraft,
  type MenuWidgetTextAlign,
  type MenuWidgetType,
} from "@/lib/menu-widgets";
import { getDefaultPageSettings } from "@/types/menu";

const FIXTURE_SITE_ID = "cafe-a-widget-length-fixture";
const FIXTURE_PAGE_ID = "00000000-0000-4000-8000-000000000101";
const FIXTURE_NOW = new Date("2026-07-21T00:00:00.000Z");
const IMAGE_TEXT_FIXTURE_URL = "/menu-templates/cafe_design_a/malcha.jpg";

const WIDGET_TYPE_OPTIONS = ["text", "image_text"] as const satisfies readonly MenuWidgetType[];
const WIDGET_COUNT_OPTIONS = [1, 2, 3] as const;
const TITLE_LENGTH_OPTIONS = [10, 20, MAX_MENU_WIDGET_TITLE_LENGTH] as const;
const BODY_LENGTH_OPTIONS = [40, 80, MAX_MENU_WIDGET_DESCRIPTION_LENGTH] as const;
const ALIGN_OPTIONS = ["left", "center", "right"] as const satisfies readonly MenuWidgetTextAlign[];
const LAYOUT_OPTIONS = ["orderedFit", "orderedBalancedFit"] as const satisfies readonly PcTabletLayoutMode[];
const CONTENT_OPTIONS = ["both", "titleOnly", "bodyOnly", "longWord"] as const;

export type CafeAWidgetLengthFixtureType = (typeof WIDGET_TYPE_OPTIONS)[number];
export type CafeAWidgetLengthFixtureCount = (typeof WIDGET_COUNT_OPTIONS)[number];
export type CafeAWidgetLengthFixtureTitleLength = (typeof TITLE_LENGTH_OPTIONS)[number];
export type CafeAWidgetLengthFixtureBodyLength = (typeof BODY_LENGTH_OPTIONS)[number];
export type CafeAWidgetLengthFixtureAlign = (typeof ALIGN_OPTIONS)[number];
export type CafeAWidgetLengthFixtureLayout = (typeof LAYOUT_OPTIONS)[number];
export type CafeAWidgetLengthFixtureContent = (typeof CONTENT_OPTIONS)[number];

export type CafeAWidgetLengthFixtureOptions = {
  type: CafeAWidgetLengthFixtureType;
  count: CafeAWidgetLengthFixtureCount;
  titleLength: CafeAWidgetLengthFixtureTitleLength;
  bodyLength: CafeAWidgetLengthFixtureBodyLength;
  locale: SupportedLocale;
  align: CafeAWidgetLengthFixtureAlign;
  layout: CafeAWidgetLengthFixtureLayout;
  content: CafeAWidgetLengthFixtureContent;
};

export type CafeAWidgetLengthFixtureMeta = {
  widgetId: string;
  index: number;
  titleUtf16Length: number;
  titleCodepointLength: number;
  bodyUtf16Length: number;
  bodyCodepointLength: number;
};

export type CafeAWidgetLengthFixture = {
  options: CafeAWidgetLengthFixtureOptions;
  data: MenuPageData;
  widgets: CafeAWidgetLengthFixtureMeta[];
};

const DEFAULT_OPTIONS: CafeAWidgetLengthFixtureOptions = {
  type: "text",
  count: 1,
  titleLength: MAX_MENU_WIDGET_TITLE_LENGTH,
  bodyLength: MAX_MENU_WIDGET_DESCRIPTION_LENGTH,
  locale: DEFAULT_LOCALE,
  align: "left",
  layout: "orderedBalancedFit",
  content: "both",
};

const TEXT_PARTS: Record<SupportedLocale, readonly string[]> = {
  ko: ["오늘의 안내는 매장 이용과 메뉴 선택을 돕기 위한 짧은 문장입니다", "오브 커피는 편안한 흐름으로 정보를 전합니다"],
  en: ["Today notice keeps the menu board clear and easy to scan", "Aube Coffee shares helpful updates with a calm voice"],
  zh: ["今日公告用于帮助顾客轻松阅读菜单和选择饮品", "奥布咖啡用简洁文字传达门店信息"],
  ja: ["本日のお知らせはメニュー選びをわかりやすくします", "オーブコーヒーは落ち着いた言葉で案内します"],
};

const LONG_WORD_PARTS: Record<SupportedLocale, string> = {
  ko: "오브커피위젯길이측정용연속문자열",
  en: "AubeCoffeeWidgetLengthStressToken",
  zh: "奥布咖啡组件长度测试连续文字",
  ja: "オーブコーヒーウィジェット長さ検証文字列",
};

function getSingleValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function includesOption<const T extends readonly unknown[]>(options: T, value: unknown): value is T[number] {
  return options.includes(value as T[number]);
}

function parseOption<const T extends readonly (string | number)[]>(
  value: string | string[] | undefined,
  options: T,
  fallback: T[number],
): T[number] {
  const rawValue = getSingleValue(value);
  if (typeof fallback === "number") {
    const numericValue = Number.parseInt(rawValue ?? "", 10);
    return includesOption(options, numericValue) ? numericValue : fallback;
  }
  return includesOption(options, rawValue) ? rawValue : fallback;
}

export function parseCafeAWidgetLengthFixtureOptions(searchParams: {
  type?: string | string[];
  count?: string | string[];
  title?: string | string[];
  body?: string | string[];
  locale?: string | string[];
  align?: string | string[];
  layout?: string | string[];
  content?: string | string[];
}): CafeAWidgetLengthFixtureOptions {
  const rawLocale = getSingleValue(searchParams.locale);
  const rawLayout = getSingleValue(searchParams.layout);
  const normalizedLayout = normalizePcTabletLayoutMode(rawLayout);

  return {
    type: parseOption(searchParams.type, WIDGET_TYPE_OPTIONS, DEFAULT_OPTIONS.type),
    count: parseOption(searchParams.count, WIDGET_COUNT_OPTIONS, DEFAULT_OPTIONS.count),
    titleLength: parseOption(searchParams.title, TITLE_LENGTH_OPTIONS, DEFAULT_OPTIONS.titleLength),
    bodyLength: parseOption(searchParams.body, BODY_LENGTH_OPTIONS, DEFAULT_OPTIONS.bodyLength),
    locale: isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_OPTIONS.locale,
    align: parseOption(searchParams.align, ALIGN_OPTIONS, DEFAULT_OPTIONS.align),
    layout: includesOption(LAYOUT_OPTIONS, normalizedLayout) ? normalizedLayout : DEFAULT_OPTIONS.layout,
    content: parseOption(searchParams.content, CONTENT_OPTIONS, DEFAULT_OPTIONS.content),
  };
}

function countCodepoints(value: string) {
  return Array.from(value).length;
}

function repeatToLength(parts: readonly string[], targetLength: number, pad: string) {
  let value = "";
  let index = 0;

  while (value.length < targetLength) {
    const nextPart = parts[index % parts.length] ?? pad;
    value = value ? `${value} ${nextPart}` : nextPart;
    index += 1;
  }

  if (value.length > targetLength) {
    value = value.slice(0, targetLength).trimEnd();
  }

  while (value.length < targetLength) {
    value += pad;
  }

  return value;
}

function createFixtureText(locale: SupportedLocale, targetLength: number, longWord: boolean) {
  if (targetLength <= 0) return "";
  if (longWord) {
    const token = LONG_WORD_PARTS[locale];
    let value = "";
    while (value.length < targetLength) {
      value += token;
    }
    if (value.length > targetLength) {
      value = value.slice(0, targetLength);
    }
    while (value.length < targetLength) {
      value += token[0] ?? "x";
    }
    return value;
  }
  return repeatToLength(TEXT_PARTS[locale], targetLength, TEXT_PARTS[locale][0]?.[0] ?? "x");
}

function createFixtureWidgetDraft(options: CafeAWidgetLengthFixtureOptions, index: number): MenuWidgetDraft {
  const widgetNumber = index + 1;
  const useTitle = options.content === "both" || options.content === "titleOnly" || options.content === "longWord";
  const useBody = options.content === "both" || options.content === "bodyOnly" || options.content === "longWord";
  const longWord = options.content === "longWord";
  const title = useTitle ? createFixtureText(options.locale, options.titleLength, longWord) : "";
  const description = useBody ? createFixtureText(options.locale, options.bodyLength, longWord) : "";

  return {
    id: `00000000-0000-4000-8000-00000000010${widgetNumber}`,
    menuPageId: FIXTURE_PAGE_ID,
    type: options.type,
    title,
    description,
    imageUrl: options.type === "image_text" ? IMAGE_TEXT_FIXTURE_URL : null,
    imagePath: null,
    sortOrder: 3 + index,
    visible: true,
    settings: {
      aspectRatio: "4:3",
      objectFit: "cover",
      textAlign: options.align,
      altText: `CafeA widget length fixture ${widgetNumber}`,
    },
  };
}

function createFixtureWidgets(options: CafeAWidgetLengthFixtureOptions) {
  const drafts = Array.from({ length: options.count }, (_, index) => createFixtureWidgetDraft(options, index));
  const widgets = drafts.map((draft) => {
    const validation = validateMenuWidgetDraft(draft);
    if (!validation.valid) {
      throw new Error(`Invalid CafeA widget length fixture: ${validation.errors.map((error) => error.code).join(", ")}`);
    }
    return normalizeMenuWidgetDraft(draft, { menuSiteId: FIXTURE_SITE_ID });
  });

  if (widgets.length > MAX_MENU_WIDGETS_PER_PAGE) {
    throw new Error("CafeA widget length fixture cannot exceed the per-page widget limit.");
  }

  return widgets;
}

function getCategorySortOrder(categoryKey: string) {
  const sortOrderByCategoryKey: Record<string, number> = {
    "signature-coffee": 0,
    "classic-coffee": 1,
    "non-coffee": 2,
    tea: 6,
    ade: 7,
    bakery: 8,
    dessert: 9,
  };

  return sortOrderByCategoryKey[categoryKey] ?? 100;
}

function getPageSettings(featuredSlides: ReturnType<typeof resolveStarterFeaturedSlides>, featuredItemId: string | null) {
  const firstCompleteFeaturedSlide = getFirstCompleteStarterFeaturedSlide(featuredSlides);
  return {
    ...getDefaultPageSettings(),
    featured_item_enabled: Boolean(firstCompleteFeaturedSlide?.featured_item_id ?? featuredItemId),
    featured_item_id: firstCompleteFeaturedSlide?.featured_item_id ?? featuredItemId,
    ...(featuredSlides.length > 0 ? { featured_slides: featuredSlides } : {}),
  };
}

export function buildCafeAWidgetLengthFixture(options: CafeAWidgetLengthFixtureOptions): CafeAWidgetLengthFixture {
  const preset = getStarterPreset("cafe_design_a");
  const now = FIXTURE_NOW.toISOString();
  const pages: MenuPageData["pages"] = preset.pages.map((page, pageIndex) => ({
    id: pageIndex === 0 ? FIXTURE_PAGE_ID : `00000000-0000-4000-8000-00000000020${pageIndex}`,
    title: page.title,
    description: null,
    description_visible: true,
    display_settings: {},
    legacy_section_key: page.legacy_section_key,
    visible: true,
    sort_order: pageIndex,
    created_at: now,
  }));

  const categories: MenuPageData["categories"] = [];
  const items: MenuPageData["items"] = [];
  const priceOptions: MenuPageData["priceOptions"] = [];
  const priceColumnIdByCategoryKey = new Map<string, string>();

  preset.pages.forEach((page, pageIndex) => {
    const pageId = pages[pageIndex]?.id ?? FIXTURE_PAGE_ID;

    page.categories.forEach((category, categoryIndex) => {
      const categoryKey = category.key ?? `category-${categoryIndex}`;
      const categoryId = `00000000-0000-4000-8001-${String(categoryIndex + 1).padStart(12, "0")}`;
      const priceColumns = (category.price_columns ?? []).map((column, columnIndex) => {
        const priceColumnId = `00000000-0000-4000-8002-${String(categoryIndex * 10 + columnIndex + 1).padStart(12, "0")}`;
        priceColumnIdByCategoryKey.set(`${categoryId}:${column.key}`, priceColumnId);
        return {
          id: priceColumnId,
          categoryId,
          key: column.key,
          label: column.label,
          sortOrder: columnIndex,
          visible: column.visible ?? true,
        };
      });

      categories.push({
        id: categoryId,
        menu_page_id: pageId,
        name: category.name,
        description: category.description ?? null,
        description_visible: category.description_visible ?? Boolean(category.description),
        sort_order: getCategorySortOrder(categoryKey),
        visible: true,
        priceColumns,
      });

      category.items.forEach((menuItem, itemIndex) => {
        const itemId = `00000000-0000-4000-8003-${String(categoryIndex * 100 + itemIndex + 1).padStart(12, "0")}`;
        const priceColumnValues = (menuItem.price_column_values ?? []).flatMap((columnValue) => {
          const priceColumnId = priceColumnIdByCategoryKey.get(`${categoryId}:${columnValue.key}`);
          if (!priceColumnId || columnValue.price == null) return [];
          return [{
            id: `${itemId}-${columnValue.key}`,
            priceColumnId,
            price: columnValue.price,
            priceLabel: columnValue.price_label ?? null,
            visible: columnValue.visible ?? true,
          }];
        });

        items.push({
          id: itemId,
          category_id: categoryId,
          name: menuItem.name,
          set_name: menuItem.set_name ?? null,
          description: menuItem.description,
          price: menuItem.price,
          price_label: menuItem.price_label ?? null,
          priceNote: menuItem.price_note ?? null,
          price_visible: true,
          portion_label: menuItem.portion_label ?? null,
          portion_visible: Boolean(menuItem.portion_label),
          image_url: menuItem.image_url ?? null,
          badge: menuItem.badge_label ?? null,
          badge_label: menuItem.badge_label ?? null,
          badge_type: null,
          recommended: menuItem.recommended ?? false,
          origin_info: null,
          is_best: menuItem.recommended ?? false,
          is_sold_out: false,
          traits_visible: true,
          visible: true,
          sort_order: itemIndex + 1,
          priceColumnValues,
        });

        menuItem.price_options?.forEach((option, optionIndex) => {
          priceOptions.push({
            id: `${itemId}-price-option-${optionIndex}`,
            menu_item_id: itemId,
            label: option.label,
            price: option.price ?? null,
            price_label: option.price_label ?? null,
            visible: true,
            sort_order: optionIndex + 1,
          });
        });
      });
    });
  });

  const featuredSlides = resolveStarterFeaturedSlides(preset, items);
  const featuredItemId = preset.featured_item_name
    ? items.find((item) => item.name === preset.featured_item_name)?.id ?? null
    : null;
  const firstCompleteFeaturedSlide = getFirstCompleteStarterFeaturedSlide(featuredSlides);
  const pageSettings = getPageSettings(featuredSlides, featuredItemId);
  const widgets = createFixtureWidgets(options);
  const timeSales: MenuPageData["timeSales"] = [];

  const data: MenuPageData = {
    locale: options.locale,
    enabledLocales: [...SUPPORTED_LOCALES],
    publicServiceType: "menu",
    menuSite: {
      id: FIXTURE_SITE_ID,
      user_id: "cafe-a-widget-length-fixture",
      name: "AUBE COFFEE",
      slug: "cafe-a-widget-length-fixture",
      template_key: "cafe_design_a",
      template_category: "cafe",
      status: "published",
      description: preset.site.brand_description,
      logo_url: null,
      cover_image_url: firstCompleteFeaturedSlide?.image_url ?? preset.site.cover_image_url,
      intro_image_url: null,
      brand_color: "#111111",
      business_name: preset.site.restaurant_name,
      business_address: preset.site.restaurant_address,
      business_phone: preset.site.restaurant_phone,
      restaurant_name: preset.site.restaurant_name,
      restaurant_category: preset.site.restaurant_category,
      restaurant_type: preset.site.restaurant_type,
      restaurant_address: preset.site.restaurant_address,
      restaurant_phone: preset.site.restaurant_phone,
      intro_title: preset.site.intro_title,
      intro_description: preset.site.intro_description,
      brand_description: preset.site.brand_description,
      menu_cover_label: preset.site.menu_cover_label,
      menu_cover_title: preset.site.menu_cover_title,
      menu_cover_description: preset.site.menu_cover_description,
      about_description: preset.site.about_description,
      opening_hours: preset.site.opening_hours,
      map_url: null,
      page_settings: pageSettings,
      settings: preset.site.settings ? { ...preset.site.settings } : {},
    },
    pageSettings,
    pages,
    categories,
    items,
    priceOptions,
    traits: [],
    events: [],
    chefs: [],
    socialLinks: [],
    timeSales,
    nextTimeSaleStartAt: null,
    initialNowMs: FIXTURE_NOW.getTime(),
    featuredSlides: featuredSlides.flatMap((slide) => {
      const item = slide.featured_item_id ? items.find((menuItem) => menuItem.id === slide.featured_item_id) : null;
      if (!slide.image_url || !item || item.visible === false) return [];
      return [
        {
          id: slide.id,
          imageUrl: slide.image_url,
          featuredItemId: item.id,
          sortOrder: slide.sort_order,
        },
      ];
    }),
    widgets,
  };

  return {
    options,
    data,
    widgets: widgets.map((widget, index) => ({
      widgetId: widget.id,
      index: index + 1,
      titleUtf16Length: widget.title?.length ?? 0,
      titleCodepointLength: countCodepoints(widget.title ?? ""),
      bodyUtf16Length: widget.description?.length ?? 0,
      bodyCodepointLength: countCodepoints(widget.description ?? ""),
    })),
  };
}

export function getCafeAWidgetLengthFixtureAttributes(options: CafeAWidgetLengthFixtureOptions) {
  return {
    "data-cafe-a-widget-length-fixture": "true",
    "data-fixture-type": options.type,
    "data-fixture-count": String(options.count),
    "data-fixture-title-length": String(options.titleLength),
    "data-fixture-body-length": String(options.bodyLength),
    "data-fixture-locale": options.locale,
    "data-fixture-align": options.align,
    "data-fixture-layout": options.layout,
    "data-fixture-content": options.content,
  };
}

export function getCafeAWidgetLengthFixtureRuntimeConfig(fixture: CafeAWidgetLengthFixture) {
  return {
    options: fixture.options,
    widgets: fixture.widgets,
    timeZone: TIME_SALE_TIMEZONE,
  };
}
