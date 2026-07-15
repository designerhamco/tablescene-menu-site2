import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import { normalizeMenuPageDisplaySettings, serializeMenuPageDisplaySettings } from "@/lib/display-page-settings";
import { DEFAULT_LOCALE, DEFAULT_ENABLED_LOCALES } from "@/lib/locales";
import type { MenuPageData } from "@/lib/menu-page-data";
import { normalizePcTabletLayoutMode, supportsPcTabletLayoutMode } from "@/lib/menu-layout-modes";
import { getFirstCompleteStarterFeaturedSlide, getStarterPreset, resolveStarterFeaturedSlides } from "@/lib/menu-starter-presets";
import {
  DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
  DEFAULT_TIME_SALE_BADGE_TEXT,
  DEFAULT_TIME_SALE_DISPLAY_MODE,
  TIME_SALE_TIMEZONE,
} from "@/lib/menu-time-sales";
import { getNextTimeSaleStartMs } from "@/lib/menu-time-sale-schedule";
import { buildDisplayMenuAPreviewData, normalizeDisplayMenuAQaCase } from "@/lib/template-demo-data/display-menu-a";
import { isDisplayTypographyTemplate, normalizeFontSizeScaleKey } from "@/lib/template-typography-presets";
import { getTemplateByKey, isValidTemplateKey, type TemplateKey } from "@/lib/templates";
import { getDefaultPageSettings, sortMenuPages } from "@/types/menu";

type PageProps = {
  params: Promise<{ templateKey: string }>;
  searchParams?: Promise<{
    fontSizeScale?: string | string[];
    layoutMode?: string | string[];
    page?: string | string[];
    qaCase?: string | string[];
    qaSplitImagePosition?: string | string[];
    footerStress?: string | string[];
  }>;
};

function buildPreviewData(templateKey: TemplateKey, qaCase: string | null = null): MenuPageData {
  if (templateKey === "display_menu_a") {
    return buildDisplayMenuAPreviewData(normalizeDisplayMenuAQaCase(qaCase));
  }

  const template = getTemplateByKey(templateKey);
  const preset = getStarterPreset(templateKey, template.categoryLabel, template.template_category);
  const now = new Date().toISOString();
  const siteId = `template-preview-${template.key}`;

  const pages: MenuPageData["pages"] = preset.pages.map((page, pageIndex) => ({
    id: `${siteId}-page-${pageIndex}`,
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
    const pageId = pages[pageIndex]?.id ?? null;

    page.categories.forEach((category, categoryIndex) => {
      const categoryId = `${siteId}-category-${pageIndex}-${categoryIndex}`;
      const priceColumns = (category.price_columns ?? []).map((column, columnIndex) => {
        const priceColumnId = `${categoryId}-price-column-${column.key}`;
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
        sort_order: categoryIndex + 1,
        visible: true,
        priceColumns,
      });

      category.items.forEach((menuItem, itemIndex) => {
        const itemId = `${siteId}-item-${pageIndex}-${categoryIndex}-${itemIndex}`;
        const priceColumnValues = (menuItem.price_column_values ?? []).flatMap((columnValue) => {
          const priceColumnId = priceColumnIdByCategoryKey.get(`${categoryId}:${columnValue.key}`);
          if (!priceColumnId || columnValue.price == null) return [];
          return [{
            id: `${itemId}-price-column-value-${columnValue.key}`,
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

  const featuredItem = preset.featured_item_name
    ? items.find((item) => item.name === preset.featured_item_name)
    : null;
  const featuredSlides = resolveStarterFeaturedSlides(preset, items);
  const firstCompleteFeaturedSlide = getFirstCompleteStarterFeaturedSlide(featuredSlides);
  const pageSettings = {
    ...getDefaultPageSettings(),
    featured_item_enabled: Boolean(firstCompleteFeaturedSlide?.featured_item_id ?? featuredItem?.id),
    featured_item_id: firstCompleteFeaturedSlide?.featured_item_id ?? featuredItem?.id ?? null,
    ...(featuredSlides.length > 0 ? { featured_slides: featuredSlides } : {}),
  };
  const timeSales: MenuPageData["timeSales"] = (preset.time_sales ?? []).flatMap((timeSale, promotionIndex) => {
    const timeSaleDurationMinutes = timeSale.duration_minutes;
    const timeSaleCampaignEnd = new Date(
      new Date(now).getTime() +
        (typeof timeSaleDurationMinutes === "number" && Number.isFinite(timeSaleDurationMinutes) && timeSaleDurationMinutes > 0
          ? timeSaleDurationMinutes * 60 * 1000
          : 30 * 24 * 60 * 60 * 1000)
    ).toISOString();
    const saleItems = (timeSale.targets ?? []).flatMap((saleTarget, targetIndex) => {
      const item = items.find((candidate) => candidate.name === saleTarget.target_item_name);
      if (!item) return [];

      const priceColumnId = saleTarget.target_price_column_key
        ? priceColumnIdByCategoryKey.get(`${item.category_id}:${saleTarget.target_price_column_key}`) ?? null
        : null;
      if (saleTarget.target_price_column_key && !priceColumnId) return [];

      return [{
        id: `${siteId}-time-sale-${promotionIndex}-item-${targetIndex}`,
        menuItemId: item.id,
        priceColumnId,
        salePrice: saleTarget.sale_price,
        salePriceLabel: saleTarget.sale_price_label ?? null,
        visible: true,
      }];
    });
    if (saleItems.length === 0) return [];

    return [{
      id: `${siteId}-time-sale-${promotionIndex}`,
      name: timeSale.name,
      scheduleType: timeSale.schedule_type ?? "daily_window",
      startsAt: now,
      endsAt: timeSaleCampaignEnd,
      dailyStartTime: timeSale.daily_start_time ?? null,
      dailyEndTime: timeSale.daily_end_time ?? null,
      timezone: TIME_SALE_TIMEZONE,
      timeDisplayMode: timeSale.time_display_mode ?? DEFAULT_TIME_SALE_DISPLAY_MODE,
      displayText: timeSale.time_display_text ?? null,
      badgeText: timeSale.badge_text ?? DEFAULT_TIME_SALE_BADGE_TEXT,
      badgeBackgroundColor: timeSale.badge_background_color ?? DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
      items: saleItems,
    }];
  });
  const nextTimeSaleStartMs = timeSales.reduce<number | null>((nextStart, timeSale) => {
    const startMs = getNextTimeSaleStartMs({
      active: true,
      scheduleType: timeSale.scheduleType,
      startsAt: timeSale.startsAt,
      endsAt: timeSale.endsAt,
      dailyStartTime: timeSale.dailyStartTime,
      dailyEndTime: timeSale.dailyEndTime,
      timeZone: "Asia/Seoul",
    }, Date.now());
    if (startMs == null) return nextStart;
    return nextStart == null ? startMs : Math.min(nextStart, startMs);
  }, null);

  return {
    locale: DEFAULT_LOCALE,
    enabledLocales: [...DEFAULT_ENABLED_LOCALES],
    publicServiceType: "menu",
    menuSite: {
      id: siteId,
      user_id: "template-preview",
      name: template.name,
      slug: `preview-${template.key}`,
      template_key: template.key,
      template_category: template.template_category,
      status: "published",
      description: template.description,
      logo_url: template.key === "cafe_noir_a" ? (preset.site.logo_url ?? null) : null,
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
    events: preset.events.map((event, index) => ({
      id: `${siteId}-event-${index}`,
      event_title: event.event_title,
      event_subtitle: event.event_subtitle,
      event_description: event.event_description,
      event_period: event.event_period,
      event_image_url: null,
      event_benefit: event.event_benefit,
      event_detail: event.event_detail,
      event_regular_price_label: event.event_regular_price_label,
      event_sale_price_label: event.event_sale_price_label,
      event_price_visible: true,
      visible: true,
      sort_order: index + 1,
    })),
    chefs: preset.chefs.map((chef, index) => ({
      id: `${siteId}-chef-${index}`,
      chef_name: chef.chef_name,
      chef_role: chef.chef_role,
      chef_description: chef.chef_description,
      chef_image_url: null,
      visible: true,
      sort_order: index + 1,
    })),
    socialLinks: preset.socialLinks.map((link, index) => ({
      id: `${siteId}-social-${index}`,
      type: link.type,
      label: link.label,
      display_name: link.display_name,
      url: link.url,
      visible: true,
      sort_order: index + 1,
    })),
    timeSales,
    nextTimeSaleStartAt: nextTimeSaleStartMs == null ? null : new Date(nextTimeSaleStartMs).toISOString(),
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
  };
}

function getDisplayPreviewPageIndex(value: string | string[] | undefined) {
  const pageValue = Array.isArray(value) ? value[0] : value;
  if (!pageValue) return null;

  const pageIndex = Number.parseInt(pageValue, 10);
  return Number.isFinite(pageIndex) && pageIndex >= 1 ? pageIndex - 1 : null;
}

function getDisplayPreviewInitialPageId(data: MenuPageData, requestedPageIndex: number | null) {
  if (requestedPageIndex === null) return null;

  return sortMenuPages(data.pages.filter((page) => page.visible))[requestedPageIndex]?.id ?? null;
}

function getDisplayPreviewSplitImagePosition(value: string | string[] | undefined) {
  const positionValue = Array.isArray(value) ? value[0] : value;
  return positionValue === "right" ? "right" : positionValue === "left" ? "left" : null;
}

function applyDisplayPreviewSplitImagePosition(data: MenuPageData, splitImagePosition: "left" | "right" | null): MenuPageData {
  if (!splitImagePosition) return data;

  return {
    ...data,
    pages: data.pages.map((page) => {
      const settings = normalizeMenuPageDisplaySettings(page.display_settings);
      if (settings.pageType !== "menu" || settings.menuLayoutType !== "split_image_menu") return page;

      return {
        ...page,
        display_settings: serializeMenuPageDisplaySettings({
          ...settings,
          splitImagePosition,
        }),
      };
    }),
  };
}

function applyPreviewFontSizeScale(data: MenuPageData, fontSizeScale: string | string[] | undefined): MenuPageData {
  const rawFontSizeScale = Array.isArray(fontSizeScale) ? fontSizeScale[0] : fontSizeScale;
  if (!rawFontSizeScale) return data;
  if (!isDisplayTypographyTemplate(data.menuSite.template_key)) return data;

  const normalizedFontSizeScale = normalizeFontSizeScaleKey(rawFontSizeScale);
  const pageSettings = data.menuSite.page_settings && typeof data.menuSite.page_settings === "object" && !Array.isArray(data.menuSite.page_settings)
    ? (data.menuSite.page_settings as Record<string, unknown>)
    : {};
  const designSettings = pageSettings.design && typeof pageSettings.design === "object" && !Array.isArray(pageSettings.design)
    ? (pageSettings.design as Record<string, unknown>)
    : {};
  const nextPageSettings = {
    ...pageSettings,
    design: {
      ...designSettings,
      fontSizeScale: normalizedFontSizeScale,
    },
  };

  return {
    ...data,
    pageSettings: nextPageSettings as unknown as MenuPageData["pageSettings"],
    menuSite: {
      ...data.menuSite,
      page_settings: nextPageSettings as unknown as MenuPageData["menuSite"]["page_settings"],
    },
  };
}

function isPreviewFlagEnabled(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "1" || rawValue === "true" || rawValue === "yes";
}

function applyCafeAFooterStressData(data: MenuPageData, footerStress: string | string[] | undefined): MenuPageData {
  if (data.menuSite.template_key !== "cafe_design_a" || !isPreviewFlagEnabled(footerStress)) return data;

  const stressItems = [
    { categoryName: "SIGNATURE COFFEE", name: "헤이즐넛 크림 모카", set_name: "HAZELNUT CREAM MOCHA", price: 6200, price_label: "6.2", description: "헤이즐넛 크림과 다크 초콜릿의 진한 조화", badge_label: "BEST" },
    { categoryName: "CLASSIC COFFEE", name: "롱 블랙", set_name: "LONG BLACK", price: 4800, price_label: "4.8", description: "에스프레소 향이 선명한 클래식 커피" },
    { categoryName: "CLASSIC COFFEE", name: "카푸치노", set_name: "CAPPUCCINO", price: 5200, price_label: "5.2", description: "부드러운 거품과 고소한 에스프레소", portion_label: "HOT ONLY", price_options: [{ label: "HOT ONLY", price: 5200, price_label: "5.2" }] },
    { categoryName: "CLASSIC COFFEE", name: "디카페인 아메리카노", set_name: "DECAF AMERICANO", price: 5000, price_label: "5.0", description: "저녁에도 부담 없이 마시는 디카페인" },
    { categoryName: "CLASSIC COFFEE", name: "콜드브루 라떼", set_name: "COLD BREW LATTE", price: 5800, price_label: "5.8", description: "콜드브루와 우유의 부드러운 밸런스", portion_label: "ICE ONLY", price_options: [{ label: "ICE ONLY", price: 5800, price_label: "5.8" }] },
    { categoryName: "NON-COFFEE", name: "오트 말차 크림", set_name: "OAT MATCHA CREAM", price: 6800, price_label: "6.8", description: "오트 밀크와 말차 크림의 산뜻한 풍미", badge_label: "SIGNATURE" },
    { categoryName: "NON-COFFEE", name: "바닐라 루이보스 밀크티", set_name: "VANILLA ROOIBOS MILK TEA", price: 6200, price_label: "6.2", description: "루이보스와 바닐라 향이 은은한 밀크티" },
    { categoryName: "TEA & ADE", name: "청포도 민트 에이드", set_name: "GREEN GRAPE MINT ADE", price: 6200, price_label: "6.2", description: "청포도와 민트의 시원한 조합", portion_label: "ICE ONLY", price_options: [{ label: "ICE ONLY", price: 6200, price_label: "6.2" }] },
    { categoryName: "TEA & ADE", name: "자스민 피치 티", set_name: "JASMINE PEACH TEA", price: 5600, price_label: "5.6", description: "복숭아 향과 자스민 티의 산뜻한 여운" },
    { categoryName: "TEA & ADE", name: "히비스커스 베리 티", set_name: "HIBISCUS BERRY TEA", price: 5600, price_label: "5.6", description: "새콤한 히비스커스와 베리의 밸런스" },
    { categoryName: "DESSERT", name: "말차 테린느", set_name: "MATCHA TERRINE", price: 7200, price_label: "7.2", description: "진한 말차와 화이트 초콜릿의 밀도 있는 디저트", badge_label: "NEW" },
  ];

  const nextItems = [...data.items];
  const nextPriceOptions = [...data.priceOptions];

  stressItems.forEach((stressItem, stressIndex) => {
    const category = data.categories.find((candidate) => candidate.name === stressItem.categoryName);
    if (!category) return;

    const itemId = `${data.menuSite.id}-footer-stress-item-${stressIndex}`;
    const sortOrder = nextItems.filter((item) => item.category_id === category.id).length + 1;
    nextItems.push({
      id: itemId,
      category_id: category.id,
      name: stressItem.name,
      set_name: stressItem.set_name,
      description: stressItem.description,
      price: stressItem.price,
      price_label: stressItem.price_label,
      priceNote: null,
      price_visible: true,
      portion_label: stressItem.portion_label ?? null,
      portion_visible: Boolean(stressItem.portion_label),
      image_url: null,
      badge: stressItem.badge_label ?? null,
      badge_label: stressItem.badge_label ?? null,
      badge_type: null,
      recommended: false,
      origin_info: null,
      is_best: false,
      is_sold_out: false,
      traits_visible: true,
      visible: true,
      sort_order: sortOrder,
      priceColumnValues: [],
    });

    stressItem.price_options?.forEach((option, optionIndex) => {
      nextPriceOptions.push({
        id: `${itemId}-price-option-${optionIndex}`,
        menu_item_id: itemId,
        label: option.label,
        price: option.price,
        price_label: option.price_label,
        visible: true,
        sort_order: optionIndex + 1,
      });
    });
  });

  const settings = data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings)
    ? { ...data.menuSite.settings }
    : {};
  settings.footer_notice_1 = "10:00~22:00";
  settings.footer_notice_2 = "서울시 강남구 테이블로 12";
  settings.footer_notice_3 = "Instagram @menulink_official · 포장 가능";

  return {
    ...data,
    menuSite: {
      ...data.menuSite,
      settings: settings as MenuPageData["menuSite"]["settings"],
    },
    items: nextItems,
    priceOptions: nextPriceOptions,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { templateKey } = await params;

  if (!isValidTemplateKey(templateKey)) {
    return {
      title: "템플릿 미리보기 | MenuLink",
      robots: { index: false, follow: false },
    };
  }

  const template = getTemplateByKey(templateKey);

  return {
    title: `${template.name} 미리보기 | MenuLink`,
    description: `${template.name} 템플릿 화면을 미리 확인해보세요.`,
    robots: { index: false, follow: false },
  };
}

export default async function TemplatePreviewPage({ params, searchParams }: PageProps) {
  const { templateKey } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const layoutModeParam = Array.isArray(resolvedSearchParams.layoutMode)
    ? resolvedSearchParams.layoutMode[0]
    : resolvedSearchParams.layoutMode;
  const previewLayoutMode = supportsPcTabletLayoutMode(templateKey)
    ? normalizePcTabletLayoutMode(layoutModeParam)
    : undefined;
  const displayPreviewPageIndex = templateKey === "display_menu_a"
    ? getDisplayPreviewPageIndex(resolvedSearchParams.page)
    : null;
  const displayPreviewQaCase = templateKey === "display_menu_a"
    ? Array.isArray(resolvedSearchParams.qaCase)
      ? resolvedSearchParams.qaCase[0] ?? null
      : resolvedSearchParams.qaCase ?? null
    : null;
  const displayPreviewSplitImagePosition = templateKey === "display_menu_a"
    ? getDisplayPreviewSplitImagePosition(resolvedSearchParams.qaSplitImagePosition)
    : null;

  if (!isValidTemplateKey(templateKey)) {
    notFound();
  }

  const data = applyPreviewFontSizeScale(
    applyDisplayPreviewSplitImagePosition(
      applyCafeAFooterStressData(
        buildPreviewData(templateKey, displayPreviewQaCase),
        resolvedSearchParams.footerStress
      ),
      displayPreviewSplitImagePosition
    ),
    resolvedSearchParams.fontSizeScale
  );

  return (
    <MenuPageRenderer
      mode="preview"
      previewLayoutMode={previewLayoutMode}
      initialPreviewPageId={templateKey === "display_menu_a" ? getDisplayPreviewInitialPageId(data, displayPreviewPageIndex) : null}
      {...data}
    />
  );
}
