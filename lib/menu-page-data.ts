import "server-only";

import type { PublicMenuTemplateProps, PublicMenuTimeSale } from "@/components/menu-templates/types";
import { DEFAULT_LOCALE, getEffectiveLocale, getEnabledLocales, getLocalizedValue, type SupportedLocale } from "@/lib/locales";
import { parseMenuWidgetRows, type MenuWidgetRow } from "@/lib/menu-widget-db-mappers";
import { getMenuPublicServiceType } from "@/lib/menu-public-capabilities";
import {
  getTimeSaleBadgeBackgroundColorFromSettings,
  getTimeSaleBadgeTextFromSettings,
  getTimeSaleDisplayModeFromSettings,
  getTimeSaleDisplayTextFromSettings,
  isBasicTimeSaleTemplate,
  TIME_SALE_TYPE,
} from "@/lib/menu-time-sales";
import {
  getNextTimeSaleStartMs,
  isTimeSaleActiveAt,
  normalizeDailyTime,
  normalizeTimeSaleScheduleType,
  TIME_SALE_SCHEDULE_TIME_ZONE,
  type NormalizedTimeSaleSchedule,
} from "@/lib/menu-time-sale-schedule";
import { canAccessMenuSitePreview } from "@/lib/menu-site-preview-access";
import {
  getMenuSiteAccessStateForMenuSite,
  requireMenuSitePermission,
} from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import { getTemplateCapabilities } from "@/lib/template-capabilities";
import { isAubeTableTemplate } from "@/lib/aube-table";
import { mergePageSettings, sortMenuPages } from "@/types/menu";

type MenuSite = PublicMenuTemplateProps["menuSite"] &
  Pick<Database["public"]["Tables"]["menu_sites"]["Row"], "status" | "user_id">;

type MenuPageData = Omit<PublicMenuTemplateProps, "mode"> & {
  menuSite: MenuSite;
};

type MenuPage = PublicMenuTemplateProps["pages"][number];
type MenuCategory = PublicMenuTemplateProps["categories"][number];
type MenuItem = PublicMenuTemplateProps["items"][number];
type MenuCategoryPriceColumn = MenuCategory["priceColumns"][number];
type MenuItemPriceColumnValue = MenuItem["priceColumnValues"][number];
type PublicFeaturedSlide = NonNullable<PublicMenuTemplateProps["featuredSlides"]>[number];
type MenuItemQueryRow = Omit<MenuItem, "default_name" | "priceNote" | "priceColumnValues"> & { price_note?: string | null };
type MenuItemPriceOption = PublicMenuTemplateProps["priceOptions"][number];
type MenuItemTrait = PublicMenuTemplateProps["traits"][number];
type MenuTimeSalePromotionRow = Database["public"]["Tables"]["menu_promotions"]["Row"];
type MenuTimeSalePromotionItemRow = Database["public"]["Tables"]["menu_promotion_items"]["Row"];
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type MenuSiteTranslation = Database["public"]["Tables"]["menu_site_translations"]["Row"];
type MenuPageTranslation = Database["public"]["Tables"]["menu_page_translations"]["Row"];
type MenuCategoryTranslation = Database["public"]["Tables"]["menu_category_translations"]["Row"];
type AubeTableMenuCategoryTranslation = MenuCategoryTranslation & {
  course_price_label: string | null;
  course_price_description: string | null;
};
type MenuItemTranslation = Database["public"]["Tables"]["menu_item_translations"]["Row"];
type MenuItemPriceOptionTranslation = Database["public"]["Tables"]["menu_item_price_option_translations"]["Row"];
type MenuItemTraitTranslation = Database["public"]["Tables"]["menu_item_trait_translations"]["Row"];
type MenuEventTranslation = Database["public"]["Tables"]["menu_event_translations"]["Row"];
type MenuChefTranslation = Database["public"]["Tables"]["menu_chef_translations"]["Row"];
type MenuSocialLinkTranslation = Database["public"]["Tables"]["menu_social_link_translations"]["Row"];
type MenuPromotionTranslation = Database["public"]["Tables"]["menu_promotion_translations"]["Row"];
type MenuWidgetTranslation = Database["public"]["Tables"]["menu_widget_translations"]["Row"];

type MenuPageDataOptions = {
  locale?: SupportedLocale;
};

const baseSiteSelect =
  "id, user_id, name, slug, template_key, status, description, logo_url, cover_image_url, intro_image_url, brand_color, business_name, business_address, business_phone, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, intro_title, intro_description, brand_description, menu_cover_title, menu_cover_description, about_description, opening_hours, map_url, settings, page_settings";
const siteSelect = baseSiteSelect
  .replace("template_key", "template_key, template_category")
  .replace("restaurant_category", "restaurant_category, restaurant_type")
  .replace("menu_cover_title", "menu_cover_label, menu_cover_title");

const pageSelect = "id, title, description, description_visible, display_settings, legacy_section_key, visible, sort_order, created_at";
const aubeTablePageSelect = `${pageSelect}, layout_columns, text_alignment`;
const categorySelect = "id, menu_page_id, name, description, description_visible, sort_order, visible";
const aubeTableCategorySelect = `${categorySelect}, course_price, course_price_label, course_price_visible, course_price_description, course_price_description_visible`;
const itemSelect =
  "id, category_id, name, set_name, description, price, price_label, price_note, price_visible, portion_label, portion_visible, image_url, badge, badge_label, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order";
const aubeTableItemSelect = itemSelect.replace("category_id", "category_id, menu_page_id");
const legacyItemSelect =
  "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, badge, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order";
const categoryPriceColumnSelect = "id, category_id, key, label, sort_order, visible";
const itemPriceColumnValueSelect = "id, menu_item_id, price_column_id, price, price_label, visible";
const priceOptionSelect = "id, menu_item_id, label, price, price_label, visible, sort_order";
const traitSelect = "id, menu_item_id, label, value, max_value, visible, sort_order";
const eventSelect =
  "id, event_title, event_subtitle, event_description, event_period, event_image_url, event_benefit, event_detail, event_regular_price_label, event_sale_price_label, event_price_visible, visible, sort_order";
const chefSelect = "id, chef_name, chef_role, chef_description, chef_image_url, visible, sort_order";
const socialLinkSelect = "id, type, label, display_name, url, visible, sort_order";
const promotionSelect = "id, name, active, schedule_type, starts_at, ends_at, daily_start_time, daily_end_time, timezone, settings";
const promotionItemSelect = "id, promotion_id, menu_item_id, price_column_id, sale_price, sale_price_label, visible";
const futurePromotionItemSelect = "promotion_id, menu_item_id, price_column_id, visible";
const legacyFeaturedSlideId = "legacy-featured-slide";

function shouldLoadMenuWidgets(menuSite: MenuSite) {
  return menuSite.template_key === "cafe_design_a" || menuSite.template_key === "cafe_mocha_forest_a" || menuSite.template_key === "cafe_sunday_line_a" || menuSite.template_key === "cafe_round_focus_a";
}

function orderBySortThenCreated<T extends { sort_order: number; created_at?: string }>(rows: T[]) {
  return [...rows].sort((a, b) => {
    if (a.sort_order !== b.sort_order) {
      return a.sort_order - b.sort_order;
    }

    return (a.created_at ?? "").localeCompare(b.created_at ?? "");
  });
}

function mapById<T extends Record<TKey, string>, TKey extends keyof T>(rows: T[], idKey: TKey) {
  return new Map(rows.map((row) => [row[idKey], row]));
}

function getJsonRecord(value: unknown): Record<string, Json> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, Json>) } : {};
}

function isMissingTableError(error: { message: string; code?: string | null } | null, tableName: string) {
  return Boolean(
    error &&
      (error.message.toLowerCase().includes(tableName) ||
        error.message.toLowerCase().includes("does not exist") ||
        error.code === "42P01"),
  );
}

function shouldLoadTimeSales(menuSite: MenuSite) {
  return isBasicTimeSaleTemplate(menuSite.template_key, menuSite.template_category);
}

function hasUsableNumericPrice(price: number | null | undefined) {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

function buildTimeSaleScheduleFromPromotion(promotion: Pick<
  MenuTimeSalePromotionRow,
  "active" | "schedule_type" | "starts_at" | "ends_at" | "daily_start_time" | "daily_end_time"
>): NormalizedTimeSaleSchedule {
  const scheduleType = normalizeTimeSaleScheduleType(promotion.schedule_type);
  return {
    active: promotion.active,
    scheduleType,
    startsAt: promotion.starts_at,
    endsAt: promotion.ends_at,
    dailyStartTime: scheduleType === "daily_window" ? normalizeDailyTime(promotion.daily_start_time) : null,
    dailyEndTime: scheduleType === "daily_window" ? normalizeDailyTime(promotion.daily_end_time) : null,
    timeZone: TIME_SALE_SCHEDULE_TIME_ZONE,
  };
}

function isPromotionActiveForPublic(promotion: MenuTimeSalePromotionRow, nowMs: number) {
  return isTimeSaleActiveAt(buildTimeSaleScheduleFromPromotion(promotion), nowMs);
}

function getPublicTimeSaleScheduleFields(promotion: MenuTimeSalePromotionRow) {
  const scheduleType = normalizeTimeSaleScheduleType(promotion.schedule_type);
  return {
    scheduleType,
    dailyStartTime: scheduleType === "daily_window" ? normalizeDailyTime(promotion.daily_start_time) : null,
    dailyEndTime: scheduleType === "daily_window" ? normalizeDailyTime(promotion.daily_end_time) : null,
  };
}

function getFeaturedSlideLimit(templateKey: string | null | undefined) {
  const capabilities = getTemplateCapabilities(templateKey);
  if (!capabilities.featuredItemHero) return 0;
  if (!capabilities.featuredItemCarousel) return 1;

  return Math.max(0, Math.trunc(capabilities.featuredItemMaxSlides ?? 5));
}

function findLegacyFeaturedItemId(pageSettings: MenuPageData["pageSettings"], items: MenuItem[]) {
  if (!pageSettings.featured_item_id) return null;

  return items.find((item) => item.visible !== false && item.id === pageSettings.featured_item_id)?.id ?? null;
}

function buildPublicFeaturedSlides({
  menuSite,
  pageSettings,
  items,
}: {
  menuSite: MenuSite;
  pageSettings: MenuPageData["pageSettings"];
  items: MenuItem[];
}): PublicFeaturedSlide[] {
  const maxSlides = getFeaturedSlideLimit(menuSite.template_key);
  if (maxSlides <= 0) return [];
  if (pageSettings.featured_item_enabled === false) return [];

  const visibleItemIds = new Set(items.filter((item) => item.visible !== false).map((item) => item.id));
  const seenFeaturedItemIds = new Set<string>();
  const publicSlides: PublicFeaturedSlide[] = [];

  const addSlide = ({
    id,
    imageUrl,
    featuredItemId,
  }: {
    id: string;
    imageUrl: string | null;
    featuredItemId: string | null;
  }) => {
    const normalizedImageUrl = typeof imageUrl === "string" ? imageUrl.trim() : "";
    const normalizedItemId = typeof featuredItemId === "string" ? featuredItemId.trim() : "";
    if (!id || !normalizedImageUrl || !normalizedItemId) return;
    if (!visibleItemIds.has(normalizedItemId) || seenFeaturedItemIds.has(normalizedItemId)) return;
    if (publicSlides.length >= maxSlides) return;

    seenFeaturedItemIds.add(normalizedItemId);
    publicSlides.push({
      id,
      imageUrl: normalizedImageUrl,
      featuredItemId: normalizedItemId,
      sortOrder: publicSlides.length,
    });
  };

  if (pageSettings.featured_slides !== undefined) {
    for (const slide of pageSettings.featured_slides) {
      addSlide({
        id: slide.id,
        imageUrl: slide.image_url,
        featuredItemId: slide.featured_item_id,
      });
    }

    return publicSlides;
  }

  addSlide({
    id: legacyFeaturedSlideId,
    imageUrl: menuSite.cover_image_url,
    featuredItemId: findLegacyFeaturedItemId(pageSettings, items),
  });

  return publicSlides;
}

async function loadPublicTimeSales({
  supabase,
  menuSite,
  items,
  priceOptions,
  nowMs,
}: {
  supabase: SupabaseServerClient;
  menuSite: MenuSite;
  items: MenuItem[];
  priceOptions: MenuItemPriceOption[];
  nowMs: number;
}): Promise<PublicMenuTimeSale[]> {
  if (!shouldLoadTimeSales(menuSite) || items.length === 0) {
    return [];
  }

  const now = new Date(nowMs).toISOString();
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const priceOptionItemIds = new Set(priceOptions.map((option) => option.menu_item_id));
  const visibleOptionPriceColumnIdsByItemId = new Map<string, Set<string>>();

  for (const item of items) {
    if (item.price_visible === false) continue;

    const visibleColumnIds = new Set(
      item.priceColumnValues
        .filter((value) => value.visible !== false && hasUsableNumericPrice(value.price))
        .map((value) => value.priceColumnId),
    );

    if (visibleColumnIds.size > 0) {
      visibleOptionPriceColumnIdsByItemId.set(item.id, visibleColumnIds);
    }
  }

  const visibleSinglePriceItemIds = new Set(
    items
      .filter((item) => item.price_visible !== false)
      .filter((item) => hasUsableNumericPrice(item.price))
      .filter((item) => !priceOptionItemIds.has(item.id))
      .filter((item) => !visibleOptionPriceColumnIdsByItemId.has(item.id))
      .map((item) => item.id),
  );

  if (visibleSinglePriceItemIds.size === 0 && visibleOptionPriceColumnIdsByItemId.size === 0) {
    return [];
  }

  const { data: promotionsData, error: promotionsError } = await supabase
    .from("menu_promotions")
    .select(promotionSelect)
    .eq("menu_site_id", menuSite.id)
    .eq("type", TIME_SALE_TYPE)
    .eq("active", true)
    .lte("starts_at", now)
    .gt("ends_at", now)
    .order("starts_at", { ascending: true });

  const isMissingPromotionTable =
    promotionsError &&
    (promotionsError.message.toLowerCase().includes("menu_promotions") ||
      promotionsError.message.toLowerCase().includes("does not exist") ||
      promotionsError.code === "42P01");

  if (isMissingPromotionTable) {
    return [];
  }

  if (promotionsError) {
    return [];
  }

  const promotions = ((promotionsData ?? []) as MenuTimeSalePromotionRow[])
    .filter((promotion) => isPromotionActiveForPublic(promotion, nowMs));
  const promotionIds = promotions.map((promotion) => promotion.id);

  if (promotionIds.length === 0) {
    return [];
  }

  const { data: promotionItemsData, error: promotionItemsError } = await supabase
    .from("menu_promotion_items")
    .select(promotionItemSelect)
    .in("promotion_id", promotionIds)
    .eq("visible", true);

  const isMissingPromotionItemsTable =
    promotionItemsError &&
    (promotionItemsError.message.toLowerCase().includes("menu_promotion_items") ||
      promotionItemsError.message.toLowerCase().includes("does not exist") ||
      promotionItemsError.code === "42P01");

  if (isMissingPromotionItemsTable) {
    return [];
  }

  if (promotionItemsError) {
    return [];
  }

  const itemsByPromotionId = new Map<string, MenuTimeSalePromotionItemRow[]>();

  for (const item of (promotionItemsData ?? []) as MenuTimeSalePromotionItemRow[]) {
    const menuItem = itemsById.get(item.menu_item_id);

    if (!menuItem || menuItem.price_visible === false) {
      continue;
    }

    if (item.price_column_id === null) {
      if (!visibleSinglePriceItemIds.has(item.menu_item_id)) {
        continue;
      }
    } else {
      const visibleColumnIds = visibleOptionPriceColumnIdsByItemId.get(item.menu_item_id);

      if (!visibleColumnIds?.has(item.price_column_id)) {
        continue;
      }
    }

    if (!hasUsableNumericPrice(item.sale_price)) {
      continue;
    }

    const currentItems = itemsByPromotionId.get(item.promotion_id) ?? [];
    currentItems.push(item);
    itemsByPromotionId.set(item.promotion_id, currentItems);
  }

  return promotions
    .map((promotion) => {
      const promotionItems = itemsByPromotionId.get(promotion.id) ?? [];
      const scheduleFields = getPublicTimeSaleScheduleFields(promotion);

      return {
        id: promotion.id,
        name: promotion.name,
        scheduleType: scheduleFields.scheduleType,
        startsAt: promotion.starts_at,
        endsAt: promotion.ends_at,
        dailyStartTime: scheduleFields.dailyStartTime,
        dailyEndTime: scheduleFields.dailyEndTime,
        timezone: promotion.timezone,
        timeDisplayMode: getTimeSaleDisplayModeFromSettings(promotion.settings),
        displayText: getTimeSaleDisplayTextFromSettings(promotion.settings),
        badgeText: getTimeSaleBadgeTextFromSettings(promotion.settings),
        badgeBackgroundColor: getTimeSaleBadgeBackgroundColorFromSettings(promotion.settings),
        items: promotionItems.map((item) => ({
          id: item.id,
          menuItemId: item.menu_item_id,
          priceColumnId: item.price_column_id,
          salePrice: item.sale_price,
          salePriceLabel: item.sale_price_label,
          visible: item.visible,
        })),
      };
    })
    .filter((promotion) => promotion.items.length > 0);
}

async function loadNextPublicTimeSaleStartAt({
  supabase,
  menuSite,
  items,
  priceOptions,
  nowMs,
}: {
  supabase: SupabaseServerClient;
  menuSite: MenuSite;
  items: MenuItem[];
  priceOptions: MenuItemPriceOption[];
  nowMs: number;
}): Promise<string | null> {
  if (!shouldLoadTimeSales(menuSite) || items.length === 0) {
    return null;
  }

  const now = new Date(nowMs).toISOString();
  const itemsById = new Map(items.map((item) => [item.id, item]));
  const priceOptionItemIds = new Set(priceOptions.map((option) => option.menu_item_id));
  const visibleOptionPriceColumnIdsByItemId = new Map<string, Set<string>>();

  for (const item of items) {
    if (item.price_visible === false) continue;

    const visibleColumnIds = new Set(
      item.priceColumnValues
        .filter((value) => value.visible !== false && hasUsableNumericPrice(value.price))
        .map((value) => value.priceColumnId),
    );

    if (visibleColumnIds.size > 0) {
      visibleOptionPriceColumnIdsByItemId.set(item.id, visibleColumnIds);
    }
  }

  const visibleSinglePriceItemIds = new Set(
    items
      .filter((item) => item.price_visible !== false)
      .filter((item) => hasUsableNumericPrice(item.price))
      .filter((item) => !priceOptionItemIds.has(item.id))
      .filter((item) => !visibleOptionPriceColumnIdsByItemId.has(item.id))
      .map((item) => item.id),
  );

  if (visibleSinglePriceItemIds.size === 0 && visibleOptionPriceColumnIdsByItemId.size === 0) {
    return null;
  }

  let futurePromotionClient: Pick<SupabaseServerClient, "from">;
  try {
    futurePromotionClient = createAdminClient();
  } catch {
    futurePromotionClient = supabase;
  }

  const { data: promotionsData, error: promotionsError } = await futurePromotionClient
    .from("menu_promotions")
    .select("id, active, schedule_type, starts_at, ends_at, daily_start_time, daily_end_time, timezone")
    .eq("menu_site_id", menuSite.id)
    .eq("type", TIME_SALE_TYPE)
    .eq("active", true)
    .gt("ends_at", now)
    .order("starts_at", { ascending: true })
    .limit(32);

  const isMissingPromotionTable = isMissingTableError(promotionsError, "menu_promotions");

  if (isMissingPromotionTable || promotionsError) {
    return null;
  }

  const promotionEntries = ((promotionsData ?? []) as Pick<
    MenuTimeSalePromotionRow,
    "id" | "active" | "schedule_type" | "starts_at" | "ends_at" | "daily_start_time" | "daily_end_time" | "timezone"
  >[])
    .map((promotion) => ({
      promotion,
      nextStartMs: getNextTimeSaleStartMs(buildTimeSaleScheduleFromPromotion(promotion), nowMs),
    }))
    .filter((entry): entry is { promotion: Pick<
      MenuTimeSalePromotionRow,
      "id" | "active" | "schedule_type" | "starts_at" | "ends_at" | "daily_start_time" | "daily_end_time" | "timezone"
    >; nextStartMs: number } => entry.nextStartMs != null);
  const promotionIds = promotionEntries.map((entry) => entry.promotion.id);

  if (promotionIds.length === 0) {
    return null;
  }

  const { data: promotionItemsData, error: promotionItemsError } = await futurePromotionClient
    .from("menu_promotion_items")
    .select(futurePromotionItemSelect)
    .in("promotion_id", promotionIds)
    .eq("visible", true);

  const isMissingPromotionItemsTable = isMissingTableError(promotionItemsError, "menu_promotion_items");

  if (isMissingPromotionItemsTable || promotionItemsError) {
    return null;
  }

  const validPromotionIds = new Set<string>();

  for (const item of (promotionItemsData ?? []) as Pick<
    MenuTimeSalePromotionItemRow,
    "promotion_id" | "menu_item_id" | "price_column_id" | "visible"
  >[]) {
    const menuItem = itemsById.get(item.menu_item_id);

    if (!menuItem || menuItem.price_visible === false) {
      continue;
    }

    if (item.price_column_id === null) {
      if (!visibleSinglePriceItemIds.has(item.menu_item_id)) {
        continue;
      }
    } else {
      const visibleColumnIds = visibleOptionPriceColumnIdsByItemId.get(item.menu_item_id);

      if (!visibleColumnIds?.has(item.price_column_id)) {
        continue;
      }
    }

    validPromotionIds.add(item.promotion_id);
  }

  const nextStartMs = promotionEntries
    .filter((entry) => validPromotionIds.has(entry.promotion.id))
    .reduce<number | null>((earliest, entry) => earliest == null ? entry.nextStartMs : Math.min(earliest, entry.nextStartMs), null);

  return nextStartMs == null ? null : new Date(nextStartMs).toISOString();
}

async function loadPublicMenuWidgets({
  supabase,
  menuSite,
}: {
  supabase: SupabaseServerClient;
  menuSite: MenuSite;
}): Promise<MenuPageData["widgets"]> {
  if (!shouldLoadMenuWidgets(menuSite)) return [];

  const { data, error } = await supabase
    .from("menu_widgets")
    .select("*")
    .eq("menu_site_id", menuSite.id)
    .eq("visible", true)
    .order("menu_page_id", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true })
    .order("id", { ascending: true });

  if (error) {
    console.warn("[menu-page-data] menu widget load failed", {
      menuSiteId: menuSite.id,
      code: error.code,
    });
    return [];
  }

  const parsed = parseMenuWidgetRows((data ?? []) as MenuWidgetRow[]);
  if (parsed.issues.length > 0) {
    const issueCounts = parsed.issues.reduce<Record<string, number>>((counts, issue) => {
      counts[issue.code] = (counts[issue.code] ?? 0) + 1;
      return counts;
    }, {});

    console.warn("[menu-page-data] menu widget rows skipped", {
      menuSiteId: menuSite.id,
      issueCounts,
    });
  }

  return parsed.widgets.filter((widget) => widget.visible);
}

function setLocalizedFooterNotice(settings: Record<string, Json>, key: string, value: string | null | undefined) {
  if (typeof value === "string" && value.trim()) {
    settings[key] = value.trim();
  }
}

function mergeMenuSiteTranslation(menuSite: MenuSite, translation: MenuSiteTranslation | null | undefined): MenuSite {
  if (!translation) return menuSite;

  const localizedSettings = getJsonRecord(menuSite.settings);
  // Basic/CafeA footer notice translation compatibility mapping:
  // footer_notice_1/2/3 reuse opening_hours/address/phone translation columns to avoid a schema change.
  setLocalizedFooterNotice(localizedSettings, "footer_notice_1", translation.opening_hours);
  setLocalizedFooterNotice(localizedSettings, "footer_notice_2", translation.restaurant_address);
  setLocalizedFooterNotice(localizedSettings, "footer_notice_3", translation.restaurant_phone);

  return {
    ...menuSite,
    description: getLocalizedValue(menuSite.description, translation.description),
    restaurant_name: getLocalizedValue(menuSite.restaurant_name, translation.restaurant_name),
    restaurant_category: getLocalizedValue(menuSite.restaurant_category, translation.restaurant_category),
    brand_description: getLocalizedValue(menuSite.brand_description, translation.brand_description),
    intro_title: getLocalizedValue(menuSite.intro_title, translation.intro_title),
    intro_description: getLocalizedValue(menuSite.intro_description, translation.intro_description),
    menu_cover_label: getLocalizedValue(menuSite.menu_cover_label, translation.menu_cover_label),
    menu_cover_title: getLocalizedValue(menuSite.menu_cover_title, translation.menu_cover_title),
    menu_cover_description: getLocalizedValue(menuSite.menu_cover_description, translation.menu_cover_description),
    about_description: getLocalizedValue(menuSite.about_description, translation.about_description),
    opening_hours: getLocalizedValue(menuSite.opening_hours, translation.opening_hours),
    restaurant_address: getLocalizedValue(menuSite.restaurant_address, translation.restaurant_address),
    restaurant_phone: getLocalizedValue(menuSite.restaurant_phone, translation.restaurant_phone),
    settings: localizedSettings,
  };
}

function getLocalizedRequiredValue(defaultValue: string, translationValue: string | null | undefined) {
  return getLocalizedValue(defaultValue, translationValue ?? null) ?? defaultValue;
}

function mergePriceOptionTranslation(
  option: MenuItemPriceOption,
  translation: MenuItemPriceOptionTranslation | null | undefined,
): MenuItemPriceOption {
  if (!translation) return option;

  return {
    ...option,
    label: getLocalizedRequiredValue(option.label, translation.label),
    price_label: getLocalizedValue(option.price_label, translation.price_label),
    price: option.price,
    visible: option.visible,
    menu_item_id: option.menu_item_id,
    sort_order: option.sort_order,
  };
}

function normalizeCategoryPriceColumn(row: Database["public"]["Tables"]["menu_category_price_columns"]["Row"]): MenuCategoryPriceColumn {
  return {
    id: row.id,
    categoryId: row.category_id,
    key: row.key,
    label: row.label,
    sortOrder: row.sort_order,
    visible: row.visible,
  };
}

function normalizeItemPriceColumnValue(row: Database["public"]["Tables"]["menu_item_price_column_values"]["Row"]): MenuItemPriceColumnValue {
  return {
    id: row.id,
    priceColumnId: row.price_column_id,
    price: row.price,
    priceLabel: row.price_label,
    visible: row.visible,
  };
}

async function applyMenuTranslations(
  supabase: SupabaseServerClient,
  data: MenuPageData,
  locale: SupportedLocale,
): Promise<MenuPageData> {
  if (locale === DEFAULT_LOCALE) return data;

  const pageIds = data.pages.map((page) => page.id);
  const categoryIds = data.categories.map((category) => category.id);
  const itemIds = data.items.map((item) => item.id);
  const priceOptionIds = data.priceOptions.map((option) => option.id);
  const traitIds = data.traits.map((trait) => trait.id);
  const eventIds = data.events.map((event) => event.id);
  const chefIds = data.chefs.map((chef) => chef.id);
  const socialLinkIds = data.socialLinks.map((link) => link.id);
  const widgets = data.widgets ?? [];
  const widgetIds = widgets
    .filter((widget) => widget.type === "text" || widget.type === "image_text")
    .map((widget) => widget.id);
  const timeSaleIds = data.timeSales.map((timeSale) => timeSale.id);
  const promotionTranslationClient = timeSaleIds.length > 0 ? createAdminClient() : supabase;

  const [
    siteResult,
    pageResult,
    categoryResult,
    itemResult,
    priceOptionResult,
    traitResult,
    eventResult,
    chefResult,
    socialLinkResult,
    promotionResult,
    widgetResult,
  ] = await Promise.all([
    supabase
      .from("menu_site_translations")
      .select("*")
      .eq("menu_site_id", data.menuSite.id)
      .eq("locale", locale)
      .maybeSingle(),
    pageIds.length
      ? supabase.from("menu_page_translations").select("*").eq("locale", locale).in("menu_page_id", pageIds)
      : Promise.resolve({ data: [], error: null }),
    categoryIds.length
      ? supabase.from("menu_category_translations").select("*").eq("locale", locale).in("category_id", categoryIds)
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? supabase.from("menu_item_translations").select("*").eq("locale", locale).in("item_id", itemIds)
      : Promise.resolve({ data: [], error: null }),
    priceOptionIds.length
      ? supabase.from("menu_item_price_option_translations").select("*").eq("locale", locale).in("price_option_id", priceOptionIds)
      : Promise.resolve({ data: [], error: null }),
    traitIds.length
      ? supabase.from("menu_item_trait_translations").select("*").eq("locale", locale).in("trait_id", traitIds)
      : Promise.resolve({ data: [], error: null }),
    eventIds.length
      ? supabase.from("menu_event_translations").select("*").eq("locale", locale).in("event_id", eventIds)
      : Promise.resolve({ data: [], error: null }),
    chefIds.length
      ? supabase.from("menu_chef_translations").select("*").eq("locale", locale).in("chef_id", chefIds)
      : Promise.resolve({ data: [], error: null }),
    socialLinkIds.length
      ? supabase.from("menu_social_link_translations").select("*").eq("locale", locale).in("social_link_id", socialLinkIds)
      : Promise.resolve({ data: [], error: null }),
    timeSaleIds.length
      ? promotionTranslationClient.from("menu_promotion_translations").select("*").eq("locale", locale).in("menu_promotion_id", timeSaleIds)
      : Promise.resolve({ data: [], error: null }),
    widgetIds.length
      ? supabase.from("menu_widget_translations").select("*").eq("locale", locale).in("menu_widget_id", widgetIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (
    siteResult.error ||
    pageResult.error ||
    categoryResult.error ||
    itemResult.error ||
    traitResult.error ||
    eventResult.error ||
    chefResult.error ||
    socialLinkResult.error ||
    promotionResult.error ||
    widgetResult.error
  ) {
    return data;
  }

  const pageTranslations = mapById((pageResult.data ?? []) as MenuPageTranslation[], "menu_page_id");
  const categoryTranslations = mapById(
    (categoryResult.data ?? []) as unknown as AubeTableMenuCategoryTranslation[],
    "category_id",
  );
  const itemTranslations = mapById((itemResult.data ?? []) as MenuItemTranslation[], "item_id");
  const priceOptionTranslations = priceOptionResult.error
    ? new Map<string, MenuItemPriceOptionTranslation>()
    : mapById((priceOptionResult.data ?? []) as MenuItemPriceOptionTranslation[], "price_option_id");
  const traitTranslations = mapById((traitResult.data ?? []) as MenuItemTraitTranslation[], "trait_id");
  const eventTranslations = mapById((eventResult.data ?? []) as MenuEventTranslation[], "event_id");
  const chefTranslations = mapById((chefResult.data ?? []) as MenuChefTranslation[], "chef_id");
  const socialLinkTranslations = mapById((socialLinkResult.data ?? []) as MenuSocialLinkTranslation[], "social_link_id");
  const promotionTranslations = mapById((promotionResult.data ?? []) as MenuPromotionTranslation[], "menu_promotion_id");
  const widgetTranslations = mapById((widgetResult.data ?? []) as MenuWidgetTranslation[], "menu_widget_id");

  return {
    ...data,
    menuSite: mergeMenuSiteTranslation(data.menuSite, siteResult.data as MenuSiteTranslation | null),
    pages: data.pages.map((page) => {
      const translation = pageTranslations.get(page.id);
      return translation
        ? {
            ...page,
            title: getLocalizedRequiredValue(page.title, translation.title),
            description: getLocalizedValue(page.description, translation.description),
          }
        : page;
    }),
    categories: data.categories.map((category) => {
      const translation = categoryTranslations.get(category.id);
      return translation
        ? {
            ...category,
            name: getLocalizedRequiredValue(category.name, translation.name),
            description: getLocalizedValue(category.description, translation.description),
            course_price_label: getLocalizedValue(
              category.course_price_label,
              translation.course_price_label,
            ),
            course_price_description: getLocalizedValue(
              category.course_price_description,
              translation.course_price_description,
            ),
          }
        : category;
    }),
    items: data.items.map((item) => {
      const translation = itemTranslations.get(item.id);
      return translation
        ? {
            ...item,
            name: getLocalizedRequiredValue(item.name, translation.name),
            set_name: getLocalizedValue(item.set_name, translation.set_name),
            description: getLocalizedValue(item.description, translation.description),
            price_label: getLocalizedValue(item.price_label, translation.price_label),
            priceNote: getLocalizedValue(item.priceNote, translation.price_note),
            portion_label: getLocalizedValue(item.portion_label, translation.portion_label),
            badge_label: getLocalizedValue(item.badge_label, translation.badge_label),
            origin_info: getLocalizedValue(item.origin_info, translation.origin_info),
          }
        : item;
    }),
    priceOptions: data.priceOptions.map((option) => mergePriceOptionTranslation(option, priceOptionTranslations.get(option.id))),
    traits: data.traits.map((trait) => {
      const translation = traitTranslations.get(trait.id);
      return translation
        ? {
            ...trait,
            label: getLocalizedRequiredValue(trait.label, translation.label),
          }
        : trait;
    }),
    events: data.events.map((event) => {
      const translation = eventTranslations.get(event.id);
      return translation
        ? {
            ...event,
            event_title: getLocalizedValue(event.event_title, translation.event_title),
            event_subtitle: getLocalizedValue(event.event_subtitle, translation.event_subtitle),
            event_description: getLocalizedValue(event.event_description, translation.event_description),
            event_period: getLocalizedValue(event.event_period, translation.event_period),
            event_benefit: getLocalizedValue(event.event_benefit, translation.event_benefit),
            event_detail: getLocalizedValue(event.event_detail, translation.event_detail),
            event_regular_price_label: getLocalizedValue(event.event_regular_price_label, translation.event_regular_price_label),
            event_sale_price_label: getLocalizedValue(event.event_sale_price_label, translation.event_sale_price_label),
          }
        : event;
    }),
    chefs: data.chefs.map((chef) => {
      const translation = chefTranslations.get(chef.id);
      return translation
        ? {
            ...chef,
            chef_name: getLocalizedRequiredValue(chef.chef_name, translation.chef_name),
            chef_role: getLocalizedValue(chef.chef_role, translation.chef_role),
            chef_description: getLocalizedValue(chef.chef_description, translation.chef_description),
          }
        : chef;
    }),
    socialLinks: data.socialLinks.map((link) => {
      const translation = socialLinkTranslations.get(link.id);
      return translation
        ? {
            ...link,
            label: getLocalizedValue(link.label, translation.label),
          }
        : link;
    }),
    timeSales: data.timeSales.map((timeSale) => {
      const translation = promotionTranslations.get(timeSale.id);
      if (!translation) return timeSale;

      return {
        ...timeSale,
        badgeText: getLocalizedRequiredValue(timeSale.badgeText, translation.badge_text),
        displayText: getLocalizedValue(timeSale.displayText, translation.time_display_text),
      };
    }),
    widgets: data.widgets == null
      ? undefined
      : widgets.map((widget) => {
          if (widget.type !== "text" && widget.type !== "image_text") return widget;

          const translation = widgetTranslations.get(widget.id);
          if (!translation) return widget;

          return {
            ...widget,
            title: getLocalizedValue(widget.title, translation.title),
            description: getLocalizedRequiredValue(widget.description, translation.description),
          };
        }),
  };
}

async function getLatestProductKeyForMenuSite(supabase: SupabaseServerClient, menuSiteId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("product_key")
    .eq("menu_site_id", menuSiteId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.product_key ?? null;
}

async function normalizeMenuPageData(menuSite: MenuSite, options: MenuPageDataOptions = {}, client?: SupabaseServerClient): Promise<MenuPageData | null> {
  const supabase = client ?? await createClient();
  const initialNowMs = Date.now();
  const pageSettings = mergePageSettings(menuSite.page_settings);
  const enabledLocales = getEnabledLocales(menuSite.settings);
  const locale = getEffectiveLocale(options.locale ?? DEFAULT_LOCALE, enabledLocales);
  const productKey = await getLatestProductKeyForMenuSite(supabase, menuSite.id);
  const publicServiceType = getMenuPublicServiceType(productKey);
  const isAubeTable = isAubeTableTemplate(menuSite.template_key);

  const { data: pagesData, error: pagesError } = await supabase
    .from("menu_pages")
    .select((isAubeTable ? aubeTablePageSelect : pageSelect) as never)
    .eq("menu_site_id", menuSite.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (pagesError) {
    return null;
  }

  const pages = sortMenuPages((pagesData ?? []) as unknown as MenuPage[]);
  const pageIds = pages.map((page) => page.id);

  const { data: categoriesData, error: categoriesError } = pageIds.length
    ? await supabase
        .from("menu_categories")
        .select((isAubeTable ? aubeTableCategorySelect : categorySelect) as never)
        .in("menu_page_id", pageIds)
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : { data: [], error: null };

  if (categoriesError) {
    return null;
  }

  const categories = orderBySortThenCreated((categoriesData ?? []) as unknown as Omit<MenuCategory, "priceColumns">[]).map((category) => ({
    ...category,
    priceColumns: [],
  }));
  const categoryIds = categories.map((category) => category.id);

  const shouldLoadItems = isAubeTable ? pageIds.length > 0 : categoryIds.length > 0;
  let itemsQuery = shouldLoadItems
    ? supabase
        .from("menu_items")
        .select(isAubeTable ? aubeTableItemSelect : itemSelect)
        .eq("visible", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
    : null;
  if (itemsQuery) {
    if (isAubeTable) {
      const filters = [
        ...(categoryIds.length > 0 ? [`category_id.in.(${categoryIds.join(",")})`] : []),
        ...(pageIds.length > 0 ? [`menu_page_id.in.(${pageIds.join(",")})`] : []),
      ];
      itemsQuery = itemsQuery.or(filters.join(","));
    } else {
      itemsQuery = itemsQuery.in("category_id", categoryIds);
    }
  }
  const { data: itemsData, error: itemsError } = itemsQuery ? await itemsQuery : { data: [], error: null };

  const isMissingBadgeLabelColumn =
    itemsError &&
    (itemsError.message.toLowerCase().includes("badge_label") ||
      itemsError.message.toLowerCase().includes("could not find") ||
      itemsError.code === "42703");

  const { data: legacyItemsData, error: legacyItemsError } =
    isMissingBadgeLabelColumn && categoryIds.length
      ? await supabase
          .from("menu_items")
          .select(legacyItemSelect)
          .in("category_id", categoryIds)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : { data: null, error: null };

  if ((itemsError && !isMissingBadgeLabelColumn) || legacyItemsError) {
    return null;
  }

  const items = orderBySortThenCreated(((isMissingBadgeLabelColumn ? legacyItemsData : itemsData) ?? []) as MenuItemQueryRow[]).map((item) => ({
    ...item,
    default_name: item.name,
    priceNote: item.price_note ?? null,
    priceColumnValues: [],
  }));
  const itemIds = items.map((item) => item.id);
  const traitItemIds = items.filter((item) => item.traits_visible).map((item) => item.id);

  const [
    { data: categoryPriceColumnsData, error: categoryPriceColumnsError },
    { data: itemPriceColumnValuesData, error: itemPriceColumnValuesError },
    { data: priceOptionsData, error: priceOptionsError },
    { data: traitsData, error: traitsError },
    { data: eventsData },
    { data: chefsData },
    { data: socialLinksData },
  ] = await Promise.all([
    categoryIds.length
      ? supabase
          .from("menu_category_price_columns")
          .select(categoryPriceColumnSelect)
          .in("category_id", categoryIds)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? supabase
          .from("menu_item_price_column_values")
          .select(itemPriceColumnValueSelect)
          .in("menu_item_id", itemIds)
          .eq("visible", true)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    itemIds.length
      ? supabase
          .from("menu_item_price_options")
          .select(priceOptionSelect)
          .in("menu_item_id", itemIds)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    traitItemIds.length
      ? supabase
          .from("menu_item_traits")
          .select(traitSelect)
          .in("menu_item_id", traitItemIds)
          .eq("visible", true)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("menu_events")
      .select(eventSelect)
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_chefs")
      .select(chefSelect)
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("menu_social_links")
      .select(socialLinkSelect)
      .eq("menu_site_id", menuSite.id)
      .eq("visible", true)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true }),
  ]);

  const isMissingCategoryPriceColumnsTable = isMissingTableError(categoryPriceColumnsError, "menu_category_price_columns");
  const isMissingItemPriceColumnValuesTable = isMissingTableError(itemPriceColumnValuesError, "menu_item_price_column_values");
  const isMissingPriceOptionsTable = isMissingTableError(priceOptionsError, "menu_item_price_options");

  if (categoryPriceColumnsError && !isMissingCategoryPriceColumnsTable) {
    return null;
  }

  if (itemPriceColumnValuesError && !isMissingItemPriceColumnValuesTable) {
    return null;
  }

  if (priceOptionsError && !isMissingPriceOptionsTable) {
    return null;
  }

  if (traitsError) {
    return null;
  }

  const categoryPriceColumns = isMissingCategoryPriceColumnsTable
    ? []
    : ((categoryPriceColumnsData ?? []) as Database["public"]["Tables"]["menu_category_price_columns"]["Row"][]).map(normalizeCategoryPriceColumn);
  const categoryPriceColumnsById = new Map(categoryPriceColumns.map((column) => [column.id, column]));
  const categoryPriceColumnsByCategoryId = new Map<string, MenuCategoryPriceColumn[]>();

  for (const column of categoryPriceColumns) {
    const currentColumns = categoryPriceColumnsByCategoryId.get(column.categoryId) ?? [];
    currentColumns.push(column);
    categoryPriceColumnsByCategoryId.set(column.categoryId, currentColumns);
  }

  const itemsById = new Map(items.map((item) => [item.id, item]));
  const itemPriceColumnValuesByItemId = new Map<string, MenuItemPriceColumnValue[]>();

  if (!isMissingItemPriceColumnValuesTable) {
    for (const row of (itemPriceColumnValuesData ?? []) as Database["public"]["Tables"]["menu_item_price_column_values"]["Row"][]) {
      const item = itemsById.get(row.menu_item_id);
      const column = categoryPriceColumnsById.get(row.price_column_id);

      if (!item || !column || item.price_visible === false || row.price === null || column.categoryId !== item.category_id) {
        continue;
      }

      const currentValues = itemPriceColumnValuesByItemId.get(item.id) ?? [];
      currentValues.push(normalizeItemPriceColumnValue(row));
      itemPriceColumnValuesByItemId.set(item.id, currentValues);
    }
  }

  const categoriesWithPriceColumns = categories.map((category) => ({
    ...category,
    priceColumns: categoryPriceColumnsByCategoryId.get(category.id) ?? [],
  }));
  const itemsWithPriceColumnValues = items.map((item) => ({
    ...item,
    priceColumnValues: itemPriceColumnValuesByItemId.get(item.id) ?? [],
  }));
  const featuredSlides = buildPublicFeaturedSlides({
    menuSite,
    pageSettings,
    items: itemsWithPriceColumnValues,
  });
  const priceOptions = isMissingPriceOptionsTable ? [] : ((priceOptionsData ?? []) as MenuItemPriceOption[]);
  const timeSales = await loadPublicTimeSales({
    supabase,
    menuSite,
    items: itemsWithPriceColumnValues,
    priceOptions,
    nowMs: initialNowMs,
  });
  const nextTimeSaleStartAt = await loadNextPublicTimeSaleStartAt({
    supabase,
    menuSite,
    items: itemsWithPriceColumnValues,
    priceOptions,
    nowMs: initialNowMs,
  });
  const widgets = await loadPublicMenuWidgets({ supabase, menuSite });

  const data = {
    locale,
    enabledLocales,
    publicServiceType,
    menuSite,
    pageSettings,
    pages,
    categories: categoriesWithPriceColumns,
    items: itemsWithPriceColumnValues,
    featuredSlides,
    priceOptions,
    traits: (traitsData ?? []) as MenuItemTrait[],
    events: (eventsData ?? []) as MenuPageData["events"],
    chefs: (chefsData ?? []) as MenuPageData["chefs"],
    socialLinks: (socialLinksData ?? []) as MenuPageData["socialLinks"],
    timeSales,
    widgets,
    nextTimeSaleStartAt,
    initialNowMs,
  };

  return applyMenuTranslations(supabase, data, locale);
}

export async function getPublicMenuPageData(slug: string, options: MenuPageDataOptions = {}) {
  const supabase = await createClient();
  const primarySiteResult = await supabase
    .from("menu_sites")
    .select(siteSelect)
    .eq("slug", slug)
    .eq("status", "published")
    .maybeSingle();
  let site = primarySiteResult.data as unknown;
  let error = primarySiteResult.error;

  const siteErrorMessage = error?.message.toLowerCase() ?? "";
  if (error && ["template_category", "restaurant_type", "menu_cover_label"].some((column) => siteErrorMessage.includes(column))) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .select(baseSiteSelect)
      .eq("slug", slug)
      .eq("status", "published")
      .maybeSingle();

    site = fallbackResult.data as unknown;
    error = fallbackResult.error;
  }

  if (error || !site) {
    return null;
  }

  const accessState = await getMenuSiteAccessStateForMenuSite({ menuSiteId: (site as MenuSite).id });
  if (!accessState?.canViewPublic) {
    return null;
  }

  return normalizeMenuPageData(site as MenuSite, options);
}

async function loadPreviewMenuSite(
  supabase: SupabaseServerClient,
  menuId: string,
  ownerUserId?: string,
) {
  let primaryQuery = supabase
    .from("menu_sites")
    .select(siteSelect)
    .eq("id", menuId);
  if (ownerUserId) {
    primaryQuery = primaryQuery.eq("user_id", ownerUserId);
  }

  const primarySiteResult = await primaryQuery.maybeSingle();
  let site = primarySiteResult.data as unknown;
  let error = primarySiteResult.error;

  const siteErrorMessage = error?.message.toLowerCase() ?? "";
  if (error && ["template_category", "restaurant_type", "menu_cover_label"].some((column) => siteErrorMessage.includes(column))) {
    let fallbackQuery = supabase
      .from("menu_sites")
      .select(baseSiteSelect)
      .eq("id", menuId);
    if (ownerUserId) {
      fallbackQuery = fallbackQuery.eq("user_id", ownerUserId);
    }

    const fallbackResult = await fallbackQuery.maybeSingle();

    site = fallbackResult.data as unknown;
    error = fallbackResult.error;
  }

  if (error || !site) {
    return null;
  }

  return site as MenuSite;
}

export async function getOwnerPreviewMenuPageData(menuId: string, userId: string, options: MenuPageDataOptions = {}) {
  const supabase = await createClient();
  const site = await loadPreviewMenuSite(supabase, menuId, userId);

  if (!site) {
    return null;
  }

  return normalizeMenuPageData(site, options, supabase);
}

export async function getAuthorizedPreviewMenuPageData(menuId: string, options: MenuPageDataOptions = {}) {
  const accessContext = await requireMenuSitePermission(menuId, "menu.read");
  const accessState = await getMenuSiteAccessStateForMenuSite({
    menuSiteId: menuId,
    userId: accessContext.isOwner ? accessContext.actorUserId : undefined,
  });

  if (!canAccessMenuSitePreview(accessContext, accessState)) {
    return { accessContext, accessState, data: null };
  }

  const supabase = accessContext.isOwner ? await createClient() : createAdminClient();
  const site = await loadPreviewMenuSite(
    supabase,
    menuId,
    accessContext.isOwner ? accessContext.actorUserId : undefined,
  );
  const data = site ? await normalizeMenuPageData(site, options, supabase) : null;

  return { accessContext, accessState, data };
}

export const getPublicMenuDataBySlug = getPublicMenuPageData;
export const getPreviewMenuDataById = getOwnerPreviewMenuPageData;
export const getMenuPreviewData = getOwnerPreviewMenuPageData;

export { normalizeMenuPageData };
export type { MenuPageData };
