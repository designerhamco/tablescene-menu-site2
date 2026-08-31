import type { Metadata } from "next";
import { notFound } from "next/navigation";

import MenuPageRenderer from "@/components/menu/MenuPageRenderer";
import type { OrderCallEntryConfig } from "@/components/public-menu/order-call/types";
import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";
import { normalizeMenuPageDisplaySettings, serializeMenuPageDisplaySettings } from "@/lib/display-page-settings";
import { DEFAULT_LOCALE, DEFAULT_ENABLED_LOCALES, normalizeLocale, SUPPORTED_LOCALES, type SupportedLocale } from "@/lib/locales";
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
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { DEFAULT_TEMPLATE_CONTENT_LIMITS, getTemplateContentLimits } from "@/lib/template-content-limits";
import { buildDisplayMenuAPreviewData, normalizeDisplayMenuAQaCase } from "@/lib/template-demo-data/display-menu-a";
import { MENU_WIDGET_SETTINGS_VERSION } from "@/lib/menu-widgets";
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
    contentQa?: string | string[];
    featured?: string | string[];
    featureQa?: string | string[];
    copyQa?: string | string[];
    brewCoverPageQa?: string | string[];
    brewCoverImageQa?: string | string[];
    lang?: string | string[];
    localeQa?: string | string[];
    pagePresentation?: string | string[];
    renderMode?: string | string[];
    orderCallQa?: string | string[];
  }>;
};

function buildPreviewData(templateKey: TemplateKey, qaCase: string | null = null): MenuPageData {
  if (templateKey === "display_menu_a") {
    return buildDisplayMenuAPreviewData(normalizeDisplayMenuAQaCase(qaCase));
  }

  const template = getTemplateByKey(templateKey);
  const preset = getStarterPreset(templateKey, template.categoryLabel, template.template_category);
  const initialNowMs = templateKey === "cafe_brew_chapter_a"
    ? Date.UTC(2026, 7, 4, 9, 0, 0)
    : Date.now();
  const now = new Date(initialNowMs).toISOString();
  const siteId = `template-preview-${template.key}`;

  const pages: MenuPageData["pages"] = preset.pages.map((page, pageIndex) => ({
    id: `${siteId}-page-${pageIndex}`,
    title: page.title,
    description: page.description ?? null,
    description_visible: page.description_visible ?? Boolean(page.description),
    display_settings: {},
    legacy_section_key: page.legacy_section_key,
    visible: true,
    sort_order: pageIndex,
    created_at: now,
    layout_columns: page.layout_columns ?? 1,
    text_alignment: page.text_alignment ?? "left",
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
        course_price: category.course_price ?? null,
        course_price_label: category.course_price_label ?? null,
        course_price_visible: category.course_price_visible ?? true,
        course_price_description: category.course_price_description ?? null,
        course_price_description_visible: category.course_price_description_visible ?? true,
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
          menu_page_id: pageId,
          name: menuItem.name,
          set_name: menuItem.set_name ?? null,
          description: menuItem.description,
          price: menuItem.price,
          price_label: menuItem.price_label ?? null,
          priceNote: menuItem.price_note ?? null,
          price_visible:
            menuItem.price_visible ??
            !(templateKey === "dining_aube_table_a" && menuItem.price === 0 && !menuItem.price_label),
          portion_label: menuItem.portion_label ?? null,
          portion_visible: Boolean(menuItem.portion_label),
          image_url: menuItem.image_url ?? null,
          badge: menuItem.badge_label ?? null,
          badge_label: menuItem.badge_label ?? null,
          badge_type: null,
          recommended: menuItem.recommended ?? false,
          origin_info: null,
          is_best: menuItem.recommended ?? false,
          is_sold_out: menuItem.is_sold_out ?? false,
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

    (page.direct_items ?? []).forEach((menuItem, itemIndex) => {
      const itemId = `${siteId}-direct-item-${pageIndex}-${itemIndex}`;
      items.push({
        id: itemId,
        category_id: null,
        menu_page_id: pageId,
        name: menuItem.name,
        set_name: menuItem.set_name ?? null,
        description: menuItem.description,
        price: menuItem.price,
        price_label: menuItem.price_label ?? null,
        priceNote: menuItem.price_note ?? null,
        price_visible: menuItem.price_visible ?? true,
        portion_label: menuItem.portion_label ?? null,
        portion_visible: Boolean(menuItem.portion_label),
        image_url: menuItem.image_url ?? null,
        badge: menuItem.badge_label ?? null,
        badge_label: menuItem.badge_label ?? null,
        badge_type: null,
        recommended: menuItem.recommended ?? false,
        origin_info: null,
        is_best: menuItem.recommended ?? false,
        is_sold_out: menuItem.is_sold_out ?? false,
        traits_visible: true,
        visible: true,
        sort_order: itemIndex + 1,
        priceColumnValues: [],
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

  const featuredItem = preset.featured_item_name
    ? items.find((item) => item.name === preset.featured_item_name)
    : null;
  const featuredSlides = resolveStarterFeaturedSlides(preset, items);
  const firstCompleteFeaturedSlide = getFirstCompleteStarterFeaturedSlide(featuredSlides);
  const pageSettings = {
    ...getDefaultPageSettings(),
    multi_page_cover_background_color: "#0D172A",
    multi_page_cover_background_opacity: 75,
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
    }, initialNowMs);
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
    initialNowMs,
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

function applyPreviewLocale(data: MenuPageData, lang: string | string[] | undefined): MenuPageData {
  const rawLocale = Array.isArray(lang) ? lang[0] : lang;

  return {
    ...data,
    locale: normalizeLocale(rawLocale),
    enabledLocales: [...SUPPORTED_LOCALES],
  };
}

function applyActiveTemplateLocaleQaFixture(
  data: MenuPageData,
  localeQa: string | string[] | undefined,
): MenuPageData {
  if (process.env.NODE_ENV === "production" || !isPreviewFlagEnabled(localeQa)) return data;

  const copyByLocale: Record<SupportedLocale, {
    siteName: string;
    description: string;
    footer: string;
    category: string;
    itemName: string;
    itemSecondary: string;
    itemDescription: string;
  }> = {
    ko: {
      siteName: "계절의 향을 담은 로스터리",
      description: "정성스럽게 내린 커피와 제철 재료로 만든 디저트를 편안한 공간에서 소개합니다.",
      footer: "포장 가능 · 알레르기 정보는 직원에게 문의해주세요.",
      category: "계절 한정 시그니처 메뉴",
      itemName: "제주 말차와 바닐라 크림 라떼",
      itemSecondary: "JEJU MATCHA VANILLA CREAM LATTE",
      itemDescription: "진한 제주 말차와 부드러운 바닐라 크림을 층층이 담은 시즌 음료",
    },
    en: {
      siteName: "Seasonal Roastery House",
      description: "Thoughtfully roasted coffee and seasonal desserts are served in a calm neighborhood space.",
      footer: "Takeout available · Ask our team about allergy information.",
      category: "SEASONAL SIGNATURE COLLECTION",
      itemName: "Jeju Matcha Vanilla Cream Latte",
      itemSecondary: "JEJU MATCHA VANILLA CREAM LATTE",
      itemDescription: "Deep Jeju matcha layered with silky vanilla cream for a balanced seasonal drink.",
    },
    zh: {
      siteName: "四季精品烘焙咖啡馆",
      description: "我们在舒适的社区空间里提供精心烘焙的咖啡和使用时令食材制作的甜点。",
      footer: "支持外带 · 过敏原信息请咨询工作人员。",
      category: "季节限定招牌饮品系列",
      itemName: "济州抹茶香草奶油拿铁",
      itemSecondary: "JEJU MATCHA VANILLA CREAM LATTE",
      itemDescription: "浓郁济州抹茶与柔滑香草奶油层层融合的季节限定饮品。",
    },
    ja: {
      siteName: "季節を楽しむロースタリー",
      description: "丁寧に焙煎したコーヒーと旬の素材を使ったデザートを、落ち着いた空間で提供します。",
      footer: "テイクアウト可 · アレルギー情報はスタッフまで。",
      category: "季節限定シグネチャーメニュー",
      itemName: "済州抹茶バニラクリームラテ",
      itemSecondary: "JEJU MATCHA VANILLA CREAM LATTE",
      itemDescription: "濃厚な済州抹茶となめらかなバニラクリームを重ねた季節限定ドリンクです。",
    },
  };
  const copy = copyByLocale[data.locale];
  const limits = getTemplateContentLimits(data.menuSite.template_key);
  const firstCategoryId = data.categories.find((category) => category.visible !== false)?.id ?? null;
  const firstItemId = data.items.find((item) => item.visible !== false)?.id ?? null;
  const settings = data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings)
    ? { ...data.menuSite.settings }
    : {};
  settings.footer_notice_1 = toExactPreviewLength(copy.footer, limits.footerNotice, " · QA");

  return {
    ...data,
    menuSite: {
      ...data.menuSite,
      name: toExactPreviewLength(copy.siteName, limits.restaurantName, " QA"),
      business_name: toExactPreviewLength(copy.siteName, limits.restaurantName, " QA"),
      restaurant_name: toExactPreviewLength(copy.siteName, limits.restaurantName, " QA"),
      brand_description: toExactPreviewLength(copy.description, limits.brandDescription, " QA"),
      settings: settings as MenuPageData["menuSite"]["settings"],
    },
    categories: data.categories.map((category) => category.id === firstCategoryId ? { ...category, name: copy.category } : category),
    items: data.items.map((item) => item.id === firstItemId ? {
      ...item,
      name: copy.itemName,
      set_name: copy.itemSecondary,
      description: copy.itemDescription,
    } : item),
  };
}

function applyActiveTemplateFeatureQaFixture(
  data: MenuPageData,
  featureQa: string | string[] | undefined,
): MenuPageData {
  if (process.env.NODE_ENV === "production" || !isPreviewFlagEnabled(featureQa)) return data;

  const templateKey = data.menuSite.template_key;
  const capabilities = getTemplateCapabilities(templateKey);
  const firstPage = sortMenuPages(data.pages.filter((page) => page.visible !== false))[0] ?? null;
  const visibleItems = [...data.items]
    .filter((item) => item.visible !== false)
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "ko"));
  const featureItemsByCategory = data.categories
    .filter((category) => category.visible !== false)
    .map((category) => visibleItems.filter((item) => item.category_id === category.id));
  const primaryItems = featureItemsByCategory.flatMap((items) => items[0] ? [items[0]] : []);
  const soldOutItems = featureItemsByCategory.flatMap((items) => items[1] ? [items[1]] : []);
  const timeSaleItems = featureItemsByCategory.flatMap((items) => items[2] ? [items[2]] : items[0] ? [items[0]] : []);
  const primaryItemIds = new Set(primaryItems.map((item) => item.id));
  const soldOutItemIds = new Set(soldOutItems.map((item) => item.id));
  const timeSaleItemIds = new Set(timeSaleItems.map((item) => item.id));
  const featureImageUrl = "/menu-templates/cafe_design_a/malcha.jpg";
  const supportsTimeSale = (
    templateKey === "display_menu_a" ||
    templateKey === "cafe_design_a" ||
    templateKey === "cafe_mocha_forest_a" ||
    templateKey === "cafe_sunday_line_a" ||
    templateKey === "cafe_round_focus_a" ||
    templateKey === "cafe_brew_chapter_a"
  );
  const items = data.items.map((item) => {
    if (primaryItemIds.has(item.id)) {
      return {
        ...item,
        badge: capabilities.itemBadges ? "FEATURE QA" : item.badge,
        badge_label: capabilities.itemBadges ? "FEATURE QA" : item.badge_label,
        image_url: capabilities.menuItemImages ? featureImageUrl : item.image_url,
        is_best: capabilities.itemBadges ? true : item.is_best,
        recommended: capabilities.itemBadges ? true : item.recommended,
      };
    }
    if (soldOutItemIds.has(item.id)) {
      return { ...item, is_sold_out: true };
    }
    return item;
  });
  const priceOptions = capabilities.priceOptions && primaryItems.length > 0
    ? [
        ...data.priceOptions.filter((option) => (
          !primaryItemIds.has(option.menu_item_id) &&
          !(templateKey === "display_menu_a" && timeSaleItemIds.has(option.menu_item_id))
        )),
        ...primaryItems.flatMap((item) => [
          { id: `${item.id}-feature-qa-option-1`, menu_item_id: item.id, label: "HOT", price: 5500, price_label: "5.5", visible: true, sort_order: 1 },
          { id: `${item.id}-feature-qa-option-2`, menu_item_id: item.id, label: "ICE", price: 6000, price_label: "6.0", visible: true, sort_order: 2 },
          { id: `${item.id}-feature-qa-option-3`, menu_item_id: item.id, label: "LARGE", price: 6800, price_label: "6.8", visible: true, sort_order: 3 },
        ]),
      ]
    : data.priceOptions;
  const timeSales: MenuPageData["timeSales"] = supportsTimeSale && timeSaleItems.length > 0
    ? [{
        id: `${data.menuSite.id}-feature-qa-time-sale`,
        name: "FEATURE QA SALE",
        scheduleType: "once" as const,
        startsAt: new Date(data.initialNowMs - 60 * 60 * 1000).toISOString(),
        endsAt: new Date(data.initialNowMs + 6 * 60 * 60 * 1000).toISOString(),
        dailyStartTime: null,
        dailyEndTime: null,
        timezone: TIME_SALE_TIMEZONE,
        timeDisplayMode: templateKey === "display_menu_a" ? "message_and_countdown" : DEFAULT_TIME_SALE_DISPLAY_MODE,
        displayText: "출시 기능 확인 세일",
        badgeText: "QA SALE",
        badgeBackgroundColor: DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
        items: timeSaleItems.map((item, index) => ({
          id: `${data.menuSite.id}-feature-qa-time-sale-item-${index}`,
          menuItemId: item.id,
          priceColumnId: null,
          salePrice: 3900,
          salePriceLabel: "3.9",
          visible: true,
        })),
      }]
    : data.timeSales;
  const widgets: MenuPageData["widgets"] = capabilities.menuWidgets.enabled && firstPage
    ? [
        {
          id: `${data.menuSite.id}-feature-qa-widget-image`,
          menuSiteId: data.menuSite.id,
          menuPageId: firstPage.id,
          type: "image",
          title: null,
          description: null,
          imageUrl: featureImageUrl,
          imagePath: null,
          sortOrder: 0,
          visible: true,
          settings: { schemaVersion: MENU_WIDGET_SETTINGS_VERSION, aspectRatio: "4:3", objectFit: "cover", altText: "말차 음료" },
        },
        {
          id: `${data.menuSite.id}-feature-qa-widget-text`,
          menuSiteId: data.menuSite.id,
          menuPageId: firstPage.id,
          type: "text",
          title: "오늘의 안내",
          description: "원두와 디저트, 포장 가능 시간을 한눈에 확인하세요.",
          imageUrl: null,
          imagePath: null,
          sortOrder: 1,
          visible: true,
          settings: { schemaVersion: MENU_WIDGET_SETTINGS_VERSION, textAlign: "center" },
        },
        {
          id: `${data.menuSite.id}-feature-qa-widget-image-text`,
          menuSiteId: data.menuSite.id,
          menuPageId: firstPage.id,
          type: "image_text",
          title: "SEASONAL PICK",
          description: "제철 재료로 완성한 시즌 메뉴를 소개합니다.",
          imageUrl: featureImageUrl,
          imagePath: null,
          sortOrder: 2,
          visible: true,
          settings: { schemaVersion: MENU_WIDGET_SETTINGS_VERSION, aspectRatio: "3:2", objectFit: "cover", textAlign: "left", altText: "시즌 메뉴" },
        },
      ]
    : data.widgets;

  return {
    ...data,
    items,
    priceOptions,
    timeSales,
    nextTimeSaleStartAt: null,
    widgets,
  };
}

function getOrderCallQaConfig(
  value: string | string[] | undefined,
  storeName: string,
  templateKey: string,
): OrderCallEntryConfig | undefined {
  if (process.env.NODE_ENV === "production") return undefined;

  const qaCase = Array.isArray(value) ? value[0] : value;
  if (!getDiningTemplateFeatures(templateKey).smartCall) return undefined;
  if (!qaCase || !["active", "call", "no-session"].includes(qaCase)) return undefined;

  const hasValidTableSession = qaCase !== "no-session";
  return {
    mode: hasValidTableSession ? "active" : "preview",
    orderEnabled: false,
    callEnabled: true,
    hasValidTableSession,
    orderingOpen: false,
    languageSlotEnabled: true,
    storeName,
    tableLabel: hasValidTableSession ? "TABLE 3" : undefined,
    cartCount: 0,
    menuSiteId: hasValidTableSession ? "11111111-1111-4111-8111-111111111111" : undefined,
    orderCatalog: [],
    previewOnly: true,
  };
}

function applyBrewChapterCoverImageQaFixture(
  data: MenuPageData,
  templateKey: string,
  brewCoverPageQa: string | string[] | undefined,
  brewCoverImageQa: string | string[] | undefined
): MenuPageData {
  if (templateKey !== "cafe_brew_chapter_a") return data;
  const rawCoverPageValue = Array.isArray(brewCoverPageQa) ? brewCoverPageQa[0] : brewCoverPageQa;
  const rawCoverImageValue = Array.isArray(brewCoverImageQa) ? brewCoverImageQa[0] : brewCoverImageQa;
  if (rawCoverPageValue !== "off" && rawCoverImageValue !== "none") return data;

  const pageSettings = data.pageSettings && typeof data.pageSettings === "object" && !Array.isArray(data.pageSettings)
    ? { ...data.pageSettings as Record<string, unknown> }
    : {};
  const nextPageSettings = {
    ...pageSettings,
    ...(rawCoverPageValue === "off" ? { menu_cover_enabled: false } : {}),
    ...(rawCoverImageValue === "none" ? { cover_image_visible: false } : {}),
  } as MenuPageData["pageSettings"];

  return {
    ...data,
    pageSettings: nextPageSettings,
    menuSite: {
      ...data.menuSite,
      page_settings: nextPageSettings as MenuPageData["menuSite"]["page_settings"],
    },
  };
}

function isPreviewFlagEnabled(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "1" || rawValue === "true" || rawValue === "yes";
}

function isMultiPagePresentationPreview(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "multi" || rawValue === "multi-page";
}

function normalizeSundayLineCopyQaCase(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "long" || rawValue === "stress" || rawValue === "globalMax" ? rawValue : null;
}

function normalizeSundayLineCopyQaLocale(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "en" || rawValue === "zh" || rawValue === "ja" ? rawValue : "ko";
}

function normalizeContentQaCase(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  return rawValue === "dense" ? rawValue : null;
}

function toExactPreviewLength(value: string, maxLength: number, filler = " 안내") {
  if (value.length >= maxLength) return value.slice(0, maxLength);

  let nextValue = value;
  while (nextValue.length < maxLength) {
    nextValue += filler;
  }

  return nextValue.slice(0, maxLength);
}

function applyCafeDenseContentQaFixture(
  data: MenuPageData,
  contentQa: string | string[] | undefined
): MenuPageData {
  if (process.env.NODE_ENV === "production") return data;
  if (data.menuSite.template_key !== "cafe_design_a" && data.menuSite.template_key !== "cafe_sunday_line_a") return data;
  if (normalizeContentQaCase(contentQa) !== "dense") return data;

  const page = sortMenuPages(data.pages.filter((candidate) => candidate.visible !== false))[0] ?? data.pages[0];
  if (!page) return data;

  const now = new Date(data.initialNowMs).toISOString();
  type DensePreviewItemSeed = {
    name: string;
    setName: string;
    description: string;
    price: number;
    priceLabel: string;
    badge?: string;
    imageUrl?: string;
    portionLabel?: string;
    recommended?: boolean;
    salePrice?: number;
    salePriceLabel?: string;
    priceOptions?: { label: string; price: number; priceLabel: string }[];
  };
  const categorySeeds: { name: string; items: DensePreviewItemSeed[] }[] = [
    {
      name: "HOUSE SPECIALS",
      items: [
        { name: "라운드 크림 커피", setName: "ROUND CREAM COFFEE", description: "부드러운 크림과 고소한 에스프레소의 시그니처 커피", price: 6500, priceLabel: "6.5", badge: "SIGNATURE", imageUrl: "/menu-templates/cafe_design_a/nutty-cream.jpeg", recommended: true },
        { name: "브라운 슈가 플랫화이트", setName: "BROWN SUGAR FLAT WHITE", description: "브라운 슈가의 은은한 단맛을 담은 플랫화이트", price: 6200, priceLabel: "6.2", badge: "BEST" },
        { name: "오렌지 크림 콜드브루", setName: "ORANGE CREAM COLDBREW", description: "오렌지 향과 부드러운 크림을 더한 콜드브루", price: 6800, priceLabel: "6.8", badge: "NEW" },
      ],
    },
    {
      name: "ESPRESSO",
      items: [
        { name: "에스프레소", setName: "ESPRESSO", description: "진한 향과 깔끔한 단맛", price: 3500, priceLabel: "3.5" },
        { name: "아메리카노", setName: "AMERICANO", description: "견과류의 고소함과 균형 잡힌 끝맛", price: 4500, priceLabel: "4.5", salePrice: 3900, salePriceLabel: "3.9", badge: "모닝딜" },
        { name: "카푸치노", setName: "CAPPUCCINO", description: "풍성한 우유 거품과 진한 에스프레소", price: 5500, priceLabel: "5.5" },
      ],
    },
    {
      name: "MILK & CREAM",
      items: [
        { name: "카페 라떼", setName: "CAFE LATTE", description: "에스프레소와 부드러운 우유의 조화", price: 5500, priceLabel: "5.5", priceOptions: [{ label: "HOT", price: 5500, priceLabel: "5.5" }, { label: "ICE", price: 6000, priceLabel: "6.0" }] },
        { name: "바닐라 빈 밀크", setName: "VANILLA BEAN MILK", description: "바닐라 빈과 우유를 담은 달콤한 음료", price: 6000, priceLabel: "6.0", badge: "NEW" },
        { name: "말차 오트 밀크", setName: "MATCHA OAT MILK", description: "제주 말차와 고소한 오트 밀크의 조화", price: 6200, priceLabel: "6.2", imageUrl: "/menu-templates/cafe_design_a/malcha.jpg" },
      ],
    },
    {
      name: "TEA & ADE",
      items: [
        { name: "시트러스 민트 에이드", setName: "CITRUS MINT ADE", description: "감귤과 민트 향이 산뜻한 에이드", price: 6200, priceLabel: "6.2", portionLabel: "ICE ONLY" },
        { name: "얼그레이 피치 티", setName: "EARL GREY PEACH TEA", description: "얼그레이 향과 복숭아의 은은한 단맛", price: 5800, priceLabel: "5.8" },
      ],
    },
    {
      name: "BAKE",
      items: [
        { name: "무화과 버터 스콘", setName: "FIG BUTTER SCONE", description: "무화과와 발효 버터를 넣어 구운 스콘", price: 4800, priceLabel: "4.8" },
        { name: "레몬 마들렌", setName: "LEMON MADELEINE", description: "레몬 향을 담아 촉촉하게 구운 마들렌", price: 3800, priceLabel: "3.8" },
      ],
    },
  ];
  const siteId = data.menuSite.id;
  const categories: MenuPageData["categories"] = [];
  const items: MenuPageData["items"] = [];
  const priceOptions: MenuPageData["priceOptions"] = [];
  let morningDealItemId: string | null = null;

  categorySeeds.forEach((categorySeed, categoryIndex) => {
    const categoryId = `${siteId}-dense-category-${categoryIndex}`;
    categories.push({
      id: categoryId,
      menu_page_id: page.id,
      name: categorySeed.name,
      description: null,
      description_visible: false,
      sort_order: categoryIndex + 1,
      visible: true,
      priceColumns: [],
    });

    categorySeed.items.forEach((itemSeed, itemIndex) => {
      const itemId = `${categoryId}-item-${itemIndex}`;
      if (itemSeed.salePrice) morningDealItemId = itemId;
      items.push({
        id: itemId,
        category_id: categoryId,
        name: itemSeed.name,
        set_name: itemSeed.setName,
        description: itemSeed.description,
        price: itemSeed.price,
        price_label: itemSeed.priceLabel,
        priceNote: null,
        price_visible: true,
        portion_label: itemSeed.portionLabel ?? null,
        portion_visible: Boolean(itemSeed.portionLabel),
        image_url: itemSeed.imageUrl ?? null,
        badge: itemSeed.badge ?? null,
        badge_label: itemSeed.badge ?? null,
        badge_type: null,
        recommended: itemSeed.recommended ?? false,
        origin_info: null,
        is_best: itemSeed.recommended ?? false,
        is_sold_out: false,
        traits_visible: true,
        visible: true,
        sort_order: itemIndex + 1,
        priceColumnValues: [],
      });

      itemSeed.priceOptions?.forEach((option, optionIndex) => {
        priceOptions.push({
          id: `${itemId}-price-option-${optionIndex}`,
          menu_item_id: itemId,
          label: option.label,
          price: option.price,
          price_label: option.priceLabel,
          visible: true,
          sort_order: optionIndex + 1,
        });
      });
    });
  });

  const timeSales: MenuPageData["timeSales"] = morningDealItemId
    ? [{
        id: `${siteId}-dense-time-sale-0`,
        name: "모닝딜",
        scheduleType: "daily_window",
        startsAt: now,
        endsAt: new Date(data.initialNowMs + 30 * 24 * 60 * 60 * 1000).toISOString(),
        dailyStartTime: "08:00",
        dailyEndTime: "10:00",
        timezone: TIME_SALE_TIMEZONE,
        timeDisplayMode: DEFAULT_TIME_SALE_DISPLAY_MODE,
        displayText: "매일 오전 8시부터 10시까지",
        badgeText: "모닝딜",
        badgeBackgroundColor: DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR,
        items: [{
          id: `${siteId}-dense-time-sale-0-item-0`,
          menuItemId: morningDealItemId,
          priceColumnId: null,
          salePrice: 3900,
          salePriceLabel: "3.9",
          visible: true,
        }],
      }]
    : [];

  return {
    ...data,
    categories,
    items,
    priceOptions,
    timeSales,
    nextTimeSaleStartAt: null,
  };
}

function applySundayLineCopyQaFixture(
  data: MenuPageData,
  copyQa: string | string[] | undefined,
  lang: string | string[] | undefined
): MenuPageData {
  if (process.env.NODE_ENV === "production") return data;
  if (data.menuSite.template_key !== "cafe_sunday_line_a") return data;

  const copyQaCase = normalizeSundayLineCopyQaCase(copyQa);
  if (!copyQaCase) return data;

  const locale = normalizeSundayLineCopyQaLocale(lang);
  const isStress = copyQaCase === "stress";
  const isGlobalMax = copyQaCase === "globalMax";
  const contentLimits = isGlobalMax ? DEFAULT_TEMPLATE_CONTENT_LIMITS : getTemplateContentLimits(data.menuSite.template_key);
  const settings = data.menuSite.settings && typeof data.menuSite.settings === "object" && !Array.isArray(data.menuSite.settings)
    ? { ...data.menuSite.settings }
    : {};
  const longCopyByLocale = {
    ko: {
      restaurantName: "SUNDAY ROASTERS.",
      brandDescription: "좋은 원두와 담백한 디저트를 천천히 즐기는 동네 로스터리의 메뉴판 안내입니다. 여유로운 매장 분위기를 함께 안내합니다.",
      footerNotice1: "Wi-Fi · SUNDAY_GUEST · Password 2026",
      footerNotice2: "Instagram · @sunday.roasters · 매일 새 소식",
      footerNotice3: "반려동물은 야외 좌석만 이용 가능하며 포장 주문도 가능합니다.",
    },
    en: {
      restaurantName: "SUNDAY ROASTERS",
      brandDescription: "Carefully roasted coffee and simple desserts are prepared for neighbors who enjoy an easy Sunday rhythm.",
      footerNotice1: "Wi-Fi SUNDAY_GUEST · Password 2026",
      footerNotice2: "Instagram @sunday.roasters",
      footerNotice3: "Takeout available · Patio pet seating",
    },
    zh: {
      restaurantName: "星期日烘焙咖啡店欢迎",
      brandDescription: "每日准备烘焙咖啡和朴素甜点，为附近客人提供轻松舒适的菜单说明和温暖的店铺体验。",
      footerNotice1: "Wi-Fi SUNDAY_GUEST · 密码 2026",
      footerNotice2: "Instagram @sunday.roasters",
      footerNotice3: "可外带 · 宠物可使用户外座位说明",
    },
    ja: {
      restaurantName: "サンデーロースターズ本店",
      brandDescription: "丁寧に焙煎したコーヒーと素朴なデザートを用意し、ゆっくり過ごせる店内のメニューを案内します。",
      footerNotice1: "Wi-Fi SUNDAY_GUEST · Password 2026",
      footerNotice2: "Instagram @sunday.roasters",
      footerNotice3: "テイクアウト可 · ペットは屋外席のみ",
    },
  } as const;
  const longCopy = longCopyByLocale[locale];
  const fillerByLocale = {
    ko: " 안내",
    en: " Info",
    zh: "说明",
    ja: "案内",
  } as const;
  const filler = fillerByLocale[locale];

  const restaurantName = isStress
    ? toExactPreviewLength("SUNDAYROASTERSNEIGHBORHOODCAFE2026", contentLimits.restaurantName)
    : toExactPreviewLength(longCopy.restaurantName, contentLimits.restaurantName, filler);
  const brandDescription = isStress
    ? toExactPreviewLength("SUNDAYROASTERSCOFFEEDESSERTNEIGHBORHOODPAPERMENUDAILYBREWINGGUIDE", contentLimits.brandDescription)
    : toExactPreviewLength(longCopy.brandDescription, contentLimits.brandDescription, filler);
  const footerNotice1 = isStress
    ? toExactPreviewLength("WiFiSSID_SUNDAYROASTERS_GUEST_NETWORK_2026_PASSWORD", contentLimits.footerNotice)
    : toExactPreviewLength(longCopy.footerNotice1, contentLimits.footerNotice, filler);
  const footerNotice2 = isStress
    ? toExactPreviewLength("Instagram @sunday.roasters.official.account.2026", contentLimits.footerNotice)
    : toExactPreviewLength(longCopy.footerNotice2, contentLimits.footerNotice, filler);
  const footerNotice3 = isStress
    ? toExactPreviewLength("TAKEOUTPETFRIENDLYPATIOSEATINGSUNDAYROASTERSNOTICE", contentLimits.footerNotice)
    : toExactPreviewLength(longCopy.footerNotice3, contentLimits.footerNotice, filler);

  settings.footer_notice_1 = footerNotice1;
  settings.footer_notice_2 = footerNotice2;
  settings.footer_notice_3 = footerNotice3;

  return {
    ...data,
    menuSite: {
      ...data.menuSite,
      name: restaurantName,
      business_name: restaurantName,
      restaurant_name: restaurantName,
      brand_description: brandDescription,
      settings: settings as MenuPageData["menuSite"]["settings"],
    },
  };
}

function applyRoundFocusFeaturedFixture(
  data: MenuPageData,
  featured: string | string[] | undefined
): MenuPageData {
  if (process.env.NODE_ENV === "production") return data;
  if (data.menuSite.template_key !== "cafe_round_focus_a") return data;

  const featuredValue = Array.isArray(featured) ? featured[0] : featured;
  if (featuredValue !== "off") return data;

  const pageSettings = {
    ...data.pageSettings,
    menu_cover_enabled: false,
    featured_item_enabled: false,
    featured_item_id: null,
    featured_slides: [],
  };

  return {
    ...data,
    menuSite: {
      ...data.menuSite,
      cover_image_url: null,
      page_settings: pageSettings,
    },
    pageSettings,
    featuredSlides: [],
  };
}

function applyCafeAMultiPagePreviewFixture(data: MenuPageData, pagePresentation: string | string[] | undefined): MenuPageData {
  if (data.menuSite.template_key !== "cafe_design_a" || !isMultiPagePresentationPreview(pagePresentation)) return data;

  const basePage = sortMenuPages(data.pages.filter((page) => page.visible !== false))[0];
  if (!basePage) return data;

  const now = basePage.created_at || new Date(data.initialNowMs).toISOString();
  const pages: MenuPageData["pages"] = [
    { ...basePage, id: `${data.menuSite.id}-multi-page-1`, title: "추천 메뉴", sort_order: 0, visible: true, created_at: now },
    { ...basePage, id: `${data.menuSite.id}-multi-page-2`, title: "음료 메뉴", sort_order: 1, visible: true, created_at: now },
    { ...basePage, id: `${data.menuSite.id}-multi-page-3`, title: "베이커리 안내", sort_order: 2, visible: true, created_at: now },
    { ...basePage, id: `${data.menuSite.id}-multi-page-hidden`, title: "숨김 페이지", sort_order: 3, visible: false, created_at: now },
  ];
  const visibleCategories = [...data.categories]
    .filter((category) => category.visible !== false)
    .sort((left, right) => left.sort_order - right.sort_order || left.name.localeCompare(right.name, "ko"));
  const pageIdByCategoryId = new Map<string, string>();

  visibleCategories.forEach((category, categoryIndex) => {
    const pageIndex = categoryIndex === 0 ? 0 : categoryIndex <= 2 ? 1 : 2;
    pageIdByCategoryId.set(category.id, pages[pageIndex]?.id ?? pages[0].id);
  });

  const categories = data.categories.map((category) => ({
    ...category,
    menu_page_id: pageIdByCategoryId.get(category.id) ?? pages[3].id,
    sort_order: visibleCategories.findIndex((candidate) => candidate.id === category.id) + 1,
  }));
  const page3Widget = {
    id: `${data.menuSite.id}-multi-page-widget-1`,
    menuSiteId: data.menuSite.id,
    menuPageId: pages[2].id,
    type: "text" as const,
    title: "오늘의 안내",
    description: "베이커리 메뉴는 한정 수량으로 준비됩니다.",
    imageUrl: null,
    imagePath: null,
    sortOrder: 0,
    visible: true,
    settings: {
      schemaVersion: MENU_WIDGET_SETTINGS_VERSION,
      textAlign: "left" as const,
    },
  } satisfies NonNullable<MenuPageData["widgets"]>[number];

  return {
    ...data,
    pages,
    categories,
    widgets: [...(data.widgets ?? []), page3Widget],
  };
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
  settings.footer_notice_3 = "Instagram @artimenu_official · 포장 가능";

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
      title: "템플릿 미리보기 | ArtiMenu",
      robots: { index: false, follow: false },
    };
  }

  const template = getTemplateByKey(templateKey);

  return {
    title: `${template.name} 미리보기 | ArtiMenu`,
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

  const fixtureData = applyPreviewFontSizeScale(
    applyDisplayPreviewSplitImagePosition(
      applyCafeAMultiPagePreviewFixture(
        applyActiveTemplateFeatureQaFixture(
          applyRoundFocusFeaturedFixture(
            applySundayLineCopyQaFixture(
              applyBrewChapterCoverImageQaFixture(
                applyCafeDenseContentQaFixture(
                  applyCafeAFooterStressData(
                    buildPreviewData(templateKey, displayPreviewQaCase),
                    resolvedSearchParams.footerStress
                  ),
                  resolvedSearchParams.contentQa
                ),
                templateKey,
                resolvedSearchParams.brewCoverPageQa,
                resolvedSearchParams.brewCoverImageQa
              ),
              resolvedSearchParams.copyQa,
              resolvedSearchParams.lang
            ),
            resolvedSearchParams.featured
          ),
          resolvedSearchParams.featureQa
        ),
        resolvedSearchParams.pagePresentation
      ),
      displayPreviewSplitImagePosition
    ),
    resolvedSearchParams.fontSizeScale
  );
  const data = applyActiveTemplateLocaleQaFixture(
    applyPreviewLocale(fixtureData, resolvedSearchParams.lang),
    resolvedSearchParams.localeQa,
  );
  const requestedRenderMode = Array.isArray(resolvedSearchParams.renderMode)
    ? resolvedSearchParams.renderMode[0]
    : resolvedSearchParams.renderMode;
  const renderMode = process.env.NODE_ENV !== "production" && requestedRenderMode === "public"
    ? "public"
    : "preview";
  const orderCallConfig = getOrderCallQaConfig(
    resolvedSearchParams.orderCallQa,
    data.menuSite.restaurant_name || data.menuSite.business_name || data.menuSite.name,
    templateKey,
  );

  return (
    <MenuPageRenderer
      mode={renderMode}
      previewLayoutMode={previewLayoutMode}
      initialPreviewPageId={templateKey === "display_menu_a" ? getDisplayPreviewInitialPageId(data, displayPreviewPageIndex) : null}
      pagePresentation={isMultiPagePresentationPreview(resolvedSearchParams.pagePresentation) ? "multi" : "one"}
      orderCallConfig={orderCallConfig}
      {...data}
    />
  );
}
