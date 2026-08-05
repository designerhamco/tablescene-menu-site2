"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getLegacyBadgeTypeForLabel, MENU_BADGE_MAX_LENGTH, normalizeBadgeLabelForSave, normalizeMenuBadgeLabel } from "@/lib/menu-badges";
import {
  isPromotionDisplayPage,
  normalizeMenuPageDisplaySettings,
  serializeMenuPageDisplaySettings,
  type MenuPageDisplaySettings,
} from "@/lib/display-page-settings";
import { pageSettingKeys } from "@/lib/menu-editor";
import { MENU_EDITOR_CAPABILITIES, getMenuEditorServiceTypeForMenuSite } from "@/lib/menu-editor-capabilities";
import { getAiUsage, getAiUsageFromCreditSpend, isAiUsageExceeded, normalizeMenuLinkPlanKey } from "@/lib/menu-ai-usage";
import { AI_FEATURE_CREDIT_COSTS } from "@/lib/ai-credits";
import { getAiCreditBalanceForMenuSite, spendAiCredits } from "@/lib/server/ai-credits-service";
import {
  getMenuSiteAccessStateForMenuSite,
  MENU_SITE_INACTIVE_EDIT_MESSAGE,
  MENU_SITE_INACTIVE_PUBLISH_MESSAGE,
} from "@/lib/server/menu-site-access-service";
import { getBasicMenuSiteLimitState } from "@/lib/server/basic-menu-site-limit-service";
import { DEFAULT_LOCALE, LOCALE_LABELS, TRANSLATABLE_LOCALES, getEnabledLocales, isSupportedLocale, type SupportedLocale } from "@/lib/locales";
import type {
  AutoTranslationDraftPatch,
  AutoTranslationLocaleResult,
  EditableTranslationDraftValue,
  EditableTranslationEntityType,
  EditableTranslationLocale,
  PartialTranslationActionResult,
} from "@/lib/menu-localization-draft";
import { PARTIAL_TRANSLATION_FAILURE_MESSAGE, getSafeTranslationErrorMessage } from "@/lib/menu-translation-errors";
import {
  createStarterMenuData,
  getFirstCompleteStarterFeaturedSlide,
  getStarterPreset,
  resolveStarterFeaturedSlides,
} from "@/lib/menu-starter-presets";
import {
  parseCafeAStarterResetFinalSavePayload,
  validateCafeAStarterResetSnapshot,
  type CafeAStarterResetFinalSavePayload,
  type CafeAStarterResetSnapshot,
} from "@/lib/cafe-a-starter-reset";
import { isValidPublicSlug, isValidRestaurantPhone, MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";
import { getTemplateContentLimits } from "@/lib/template-content-limits";
import { normalizePcTabletLayoutMode, supportsPcTabletLayoutMode } from "@/lib/menu-layout-modes";
import { isPriceDisplayMode } from "@/lib/menu-price-format";
import {
  getTimeSalePriceLabelForSave,
  normalizeTimeSaleDisplayMode,
  normalizeTimeSaleDisplayText,
  parseTimeSalePriceInputToWon,
  isBasicTimeSaleTemplate,
  isEmptyNewMenuTimeSalePlaceholder,
  normalizeTimeSaleBadgeBackgroundColor,
  normalizeTimeSaleBadgeText,
  MENU_TIME_SALE_SAVE_PAYLOAD_SCHEMA_VERSION,
  TIME_SALE_DISPLAY_TEXT_MAX_LENGTH,
  TIME_SALE_TIMEZONE,
  TIME_SALE_TYPE,
  TIME_SALE_BADGE_TEXT_MAX_LENGTH,
  type MenuTimeSaleManagementDraft,
  type MenuTimeSaleSavePayload,
  type TimeSaleDisplayMode,
} from "@/lib/menu-time-sales";
import {
  getNextTimeSaleStartMs,
  normalizeDailyTime,
  normalizeTimeSaleScheduleType,
  TIME_SALE_SCHEDULE_TIME_ZONE,
  type TimeSaleScheduleType,
} from "@/lib/menu-time-sale-schedule";
import {
  findOverlappingTimeSales,
  validateTimeSaleLimit,
  type TimeSaleValidationEntry,
} from "@/lib/menu-time-sale-validation";
import {
  parseMenuWidgetFinalSaveDraftPayload,
  remapMenuWidgetFinalSavePayloadIds,
  shouldRunMenuWidgetFinalSave,
  isUuid,
  type MenuWidgetFinalSavePayload,
  type MenuWidgetFinalSaveValidationError,
} from "@/lib/menu-widget-save-contract";
import { MAX_MENU_WIDGET_DESCRIPTION_LENGTH, MAX_MENU_WIDGET_TITLE_LENGTH } from "@/lib/menu-widgets";
import { getLegacyMenuPath, getPublicMenuPath } from "@/lib/menu-url";
import { isSocialLinkType } from "@/lib/social-links";
import {
  generateMenuCleanupStructure,
  generateMenuItemDescriptionDraft,
  runMenuTranslationDraft,
  runMenuTranslationUpdate,
  TARGET_TRANSLATION_LOCALES,
  translatePartialMenuCategoryFields,
  translatePartialMenuHeroFields,
  translatePartialMenuItemFields,
  type MenuCleanupStructuredResult,
} from "@/lib/server/menu-translation-service";
import { saveMenuWidgetsForFinalDraft, type MenuWidgetFinalSaveError } from "@/lib/server/menu-widget-final-save-service";
import { cleanupSavedMenuWidgetImages } from "@/lib/server/menu-widget-image-cleanup-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json, MenuSectionKey, MenuSiteStatus } from "@/lib/supabase/types";
import { BADGE_STYLE_KEYS, isHexColor, type BadgeStyleKey, type BadgeStyles } from "@/lib/template-badge-styles";
import { normalizeBackgroundColor } from "@/lib/template-background-colors";
import { getBasicPricingCapabilities, getTemplateCapabilities, type TemplateCapabilities } from "@/lib/template-capabilities";
import { getTemplateCategoryFromKey, isTemplateCategoryKey, isTemplateSupportedForService, isValidTemplateKey, type TemplateKey } from "@/lib/templates";
import { getTemplateType } from "@/lib/template-types";
import { isEnglishFontValue, isKoreanFontValue } from "@/lib/font-options";
import {
  TYPOGRAPHY_ROLE_KEYS,
  hasCustomTypographyRoleSettings,
  normalizeFontSizeScaleKeyForTemplate,
  normalizeTypographyRoleSettings,
  type TypographyRoleSettings,
} from "@/lib/template-typography-presets";
import {
  FEATURED_SLIDES_PAGE_SETTINGS_KEY,
  hasFeaturedSlidesSetting,
  mergePageSettings,
  validateMenuItemTrait,
  type FeaturedSlideSettings,
} from "@/types/menu";

const allowedStatuses = ["draft", "published", "archived"] as const;
const MENU_IMAGES_BUCKET = "menu-images";
const MENU_VIDEOS_BUCKET = "menu-videos";
const MENU_WIDGET_FINAL_SAVE_PAYLOAD_FIELD = "menuWidgetFinalSavePayload";
const CAFE_A_STARTER_RESET_FINAL_SAVE_PAYLOAD_FIELD = "cafeAStarterResetFinalSavePayload";
const MENU_TIME_SALE_SAVE_PAYLOAD_FIELD = "time_sale_save_payload";
const TRANSLATION_RECOVERY_JOB_ID_FIELD = "translation_recovery_job_id";
const PUBLIC_PRESET_IMAGE_PREFIXES = ["/placeholders/", "/menu-templates/"] as const;
type MenuCategoryInsert = Database["public"]["Tables"]["menu_categories"]["Insert"];
type MenuCategoryUpdate = Database["public"]["Tables"]["menu_categories"]["Update"];
type MenuSite = Database["public"]["Tables"]["menu_sites"]["Row"];
type MenuSiteUpdate = Database["public"]["Tables"]["menu_sites"]["Update"];
type MenuPageInsert = Database["public"]["Tables"]["menu_pages"]["Insert"];
type MenuPageUpdate = Database["public"]["Tables"]["menu_pages"]["Update"];
type MenuItemInsert = Database["public"]["Tables"]["menu_items"]["Insert"];
type MenuItemUpdate = Database["public"]["Tables"]["menu_items"]["Update"];
type MenuChefInsert = Database["public"]["Tables"]["menu_chefs"]["Insert"];
type MenuChefUpdate = Database["public"]["Tables"]["menu_chefs"]["Update"];
type MenuEventInsert = Database["public"]["Tables"]["menu_events"]["Insert"];
type MenuEventUpdate = Database["public"]["Tables"]["menu_events"]["Update"];
type MenuSocialLinkInsert = Database["public"]["Tables"]["menu_social_links"]["Insert"];
type MenuSocialLinkUpdate = Database["public"]["Tables"]["menu_social_links"]["Update"];
type MenuItemPriceOptionInsert = Database["public"]["Tables"]["menu_item_price_options"]["Insert"];
type MenuItemPriceOptionUpdate = Database["public"]["Tables"]["menu_item_price_options"]["Update"];
type MenuCategoryPriceColumnInsert = Database["public"]["Tables"]["menu_category_price_columns"]["Insert"];
type MenuCategoryPriceColumnUpdate = Database["public"]["Tables"]["menu_category_price_columns"]["Update"];
type MenuItemPriceColumnValueInsert = Database["public"]["Tables"]["menu_item_price_column_values"]["Insert"];
type MenuItemPriceColumnValueUpdate = Database["public"]["Tables"]["menu_item_price_column_values"]["Update"];
type MenuItemPriceColumnValueRow = Database["public"]["Tables"]["menu_item_price_column_values"]["Row"];
type MenuPromotionInsert = Database["public"]["Tables"]["menu_promotions"]["Insert"];
type MenuPromotionUpdate = Database["public"]["Tables"]["menu_promotions"]["Update"];
type MenuPromotionRow = Database["public"]["Tables"]["menu_promotions"]["Row"];
type MenuPromotionItemInsert = Database["public"]["Tables"]["menu_promotion_items"]["Insert"];
type MenuPromotionItemUpdate = Database["public"]["Tables"]["menu_promotion_items"]["Update"];
type MenuPromotionItemRow = Database["public"]["Tables"]["menu_promotion_items"]["Row"];
type MenuItemTraitInsert = Database["public"]["Tables"]["menu_item_traits"]["Insert"];
type MenuItemTraitUpdate = Database["public"]["Tables"]["menu_item_traits"]["Update"];
type MenuTranslationJobUpdate = Database["public"]["Tables"]["menu_translation_jobs"]["Update"];
type MenuSiteTranslationInsert = Database["public"]["Tables"]["menu_site_translations"]["Insert"];
type MenuPageTranslationInsert = Database["public"]["Tables"]["menu_page_translations"]["Insert"];
type MenuCategoryTranslationInsert = Database["public"]["Tables"]["menu_category_translations"]["Insert"];
type MenuItemTranslationInsert = Database["public"]["Tables"]["menu_item_translations"]["Insert"];
type MenuPromotionTranslationInsert = Database["public"]["Tables"]["menu_promotion_translations"]["Insert"];
type MenuWidgetTranslationInsert = Database["public"]["Tables"]["menu_widget_translations"]["Insert"];
type LooseInsert = Record<string, unknown>;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;
type MenuSaveTraceValue = string | number | boolean | null | undefined;
type MenuSaveTraceFields = Record<string, MenuSaveTraceValue>;
type MenuSaveTraceContext = {
  enabled: boolean;
  traceId: string;
  menuSiteId: string;
  actionStartedAtMs: number;
};

function isMenuSaveTraceQaEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.ENABLE_MENU_SAVE_TRACE_QA === "true";
}

function createMenuSaveTrace(menuSiteId: string): MenuSaveTraceContext {
  return {
    enabled: isMenuSaveTraceQaEnabled(),
    traceId: randomUUID(),
    menuSiteId,
    actionStartedAtMs: Date.now(),
  };
}

function getMenuSaveTraceElapsedMs(startedAtMs: number) {
  return Date.now() - startedAtMs;
}

function getSafeSupabaseErrorFields(error: unknown): MenuSaveTraceFields {
  if (!error || typeof error !== "object") return {};
  const record = error as Record<string, unknown>;
  return {
    errorCode: typeof record.code === "string" ? record.code : null,
    errorMessage: typeof record.message === "string" ? record.message : null,
    errorDetails: typeof record.details === "string" ? record.details : null,
    errorHint: typeof record.hint === "string" ? record.hint : null,
  };
}

function logMenuSaveTrace(trace: MenuSaveTraceContext | null | undefined, fields: MenuSaveTraceFields) {
  if (!trace?.enabled) return;

  console.log(
    "[menu-save-trace]",
    JSON.stringify({
      traceId: trace.traceId,
      menuSiteId: trace.menuSiteId,
      timestamp: new Date().toISOString(),
      actionElapsedMs: getMenuSaveTraceElapsedMs(trace.actionStartedAtMs),
      ...fields,
    })
  );
}

function startMenuSaveTraceStage(trace: MenuSaveTraceContext | null | undefined, stage: string, fields: MenuSaveTraceFields = {}) {
  const startedAtMs = Date.now();
  logMenuSaveTrace(trace, {
    stage,
    status: "start",
    elapsedMs: 0,
    ...fields,
  });

  return (status: "success" | "error", nextFields: MenuSaveTraceFields = {}) => {
    logMenuSaveTrace(trace, {
      stage,
      status,
      elapsedMs: getMenuSaveTraceElapsedMs(startedAtMs),
      ...fields,
      ...nextFields,
    });
  };
}

function normalizeNullableStringForDiff(value: unknown) {
  if (typeof value !== "string") return value == null ? null : String(value);
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function normalizeNullableNumberForDiff(value: unknown) {
  if (value == null || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function normalizeNullableTimeForDiff(value: unknown) {
  if (typeof value !== "string") return null;
  const normalized = normalizeDailyTime(value);
  return normalized;
}

function normalizeJsonForDiff(value: Json | null | undefined) {
  if (value == null) return null;
  return value;
}

function stableStringifyForDiff(value: unknown): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((entry) => stableStringifyForDiff(entry)).join(",")}]`;
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringifyForDiff(record[key])}`)
    .join(",")}}`;
}

function jsonValuesEqualForDiff(left: Json | null | undefined, right: Json | null | undefined) {
  return stableStringifyForDiff(normalizeJsonForDiff(left)) === stableStringifyForDiff(normalizeJsonForDiff(right));
}

function isoDateValuesEqualForDiff(left: unknown, right: unknown) {
  if (typeof left !== "string" || typeof right !== "string") return left === right;
  const leftDate = new Date(left);
  const rightDate = new Date(right);
  if (Number.isNaN(leftDate.getTime()) || Number.isNaN(rightDate.getTime())) {
    return left === right;
  }
  return leftDate.toISOString() === rightDate.toISOString();
}

function isMenuItemPriceColumnValueUnchanged(
  existing: Pick<MenuItemPriceColumnValueRow, "price_column_id" | "price" | "price_label" | "visible">,
  next: Pick<MenuItemPriceColumnValueUpdate, "price_column_id" | "price" | "price_label" | "visible">,
) {
  return (
    existing.price_column_id === next.price_column_id &&
    normalizeNullableNumberForDiff(existing.price) === normalizeNullableNumberForDiff(next.price) &&
    normalizeNullableStringForDiff(existing.price_label) === normalizeNullableStringForDiff(next.price_label) &&
    Boolean(existing.visible) === Boolean(next.visible)
  );
}

function isMenuPromotionUnchanged(existing: MenuPromotionRow, next: MenuPromotionInsert) {
  return (
    existing.name === next.name &&
    Boolean(existing.active) === Boolean(next.active) &&
    existing.schedule_type === next.schedule_type &&
    isoDateValuesEqualForDiff(existing.starts_at, next.starts_at) &&
    isoDateValuesEqualForDiff(existing.ends_at, next.ends_at) &&
    normalizeNullableTimeForDiff(existing.daily_start_time) === normalizeNullableTimeForDiff(next.daily_start_time) &&
    normalizeNullableTimeForDiff(existing.daily_end_time) === normalizeNullableTimeForDiff(next.daily_end_time) &&
    existing.timezone === next.timezone &&
    jsonValuesEqualForDiff(existing.settings, next.settings)
  );
}

function isMenuPromotionTargetUnchanged(
  existing: Pick<MenuPromotionItemRow, "menu_item_id" | "price_column_id" | "sale_price" | "sale_price_label" | "visible" | "settings">,
  next: Pick<MenuPromotionItemUpdate, "menu_item_id" | "price_column_id" | "sale_price" | "sale_price_label" | "visible" | "settings">,
) {
  return (
    existing.menu_item_id === next.menu_item_id &&
    (existing.price_column_id ?? null) === (next.price_column_id ?? null) &&
    normalizeNullableNumberForDiff(existing.sale_price) === normalizeNullableNumberForDiff(next.sale_price) &&
    normalizeNullableStringForDiff(existing.sale_price_label) === normalizeNullableStringForDiff(next.sale_price_label) &&
    Boolean(existing.visible) === Boolean(next.visible) &&
    jsonValuesEqualForDiff(existing.settings, next.settings)
  );
}

function isPublicPresetImageUrl(value: string | null | undefined) {
  return Boolean(value && PUBLIC_PRESET_IMAGE_PREFIXES.some((prefix) => value.startsWith(prefix)));
}

function normalizeFeaturedSlideString(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function parseFeaturedSlidesPayload(menuId: string, formData: FormData, maxSlides: number) {
  const rawValue = getString(formData, "featured_slides");

  if (!rawValue) {
    return [] satisfies FeaturedSlideSettings[];
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(rawValue);
  } catch {
    redirectToTabEditWithError(menuId, "cover", "대표 슬라이드 정보를 다시 확인해주세요.");
  }

  if (!Array.isArray(parsed)) {
    redirectToTabEditWithError(menuId, "cover", "대표 슬라이드 정보 형식이 올바르지 않습니다.");
  }

  const limit = Math.max(1, Math.min(5, Math.trunc(maxSlides)));

  if (parsed.length > limit) {
    redirectToTabEditWithError(menuId, "cover", `대표 슬라이드는 최대 ${limit}개까지 등록할 수 있습니다.`);
  }

  const seenSlideIds = new Set<string>();
  const seenFeaturedItemIds = new Set<string>();

  return parsed.map((rawSlide, index) => {
    if (!rawSlide || typeof rawSlide !== "object" || Array.isArray(rawSlide)) {
      redirectToTabEditWithError(menuId, "cover", "대표 슬라이드 정보 형식이 올바르지 않습니다.");
    }

    const slide = rawSlide as Record<string, unknown>;
    const id = normalizeFeaturedSlideString(slide.id);
    const imageUrl = normalizeFeaturedSlideString(slide.imageUrl) ?? normalizeFeaturedSlideString(slide.image_url);
    const imagePath = normalizeFeaturedSlideString(slide.imagePath) ?? normalizeFeaturedSlideString(slide.image_path);
    const featuredItemId = normalizeFeaturedSlideString(slide.featuredItemId) ?? normalizeFeaturedSlideString(slide.featured_item_id);

    if (!id) {
      redirectToTabEditWithError(menuId, "cover", "대표 슬라이드 ID가 올바르지 않습니다.");
    }

    if (seenSlideIds.has(id)) {
      redirectToTabEditWithError(menuId, "cover", "대표 슬라이드 ID가 중복되었습니다.");
    }
    seenSlideIds.add(id);

    if (featuredItemId) {
      if (seenFeaturedItemIds.has(featuredItemId)) {
        redirectToTabEditWithError(menuId, "cover", "같은 대표 상품은 한 번만 선택할 수 있습니다.");
      }
      seenFeaturedItemIds.add(featuredItemId);
    }

    for (const [label, value] of [
      ["이미지 URL", imageUrl],
      ["이미지 경로", imagePath],
    ] as const) {
      if (value && value.length > 2048) {
        redirectToTabEditWithError(menuId, "cover", `대표 슬라이드 ${label}이 너무 깁니다.`);
      }
    }

    if (imagePath && !imagePath.startsWith(`menu-sites/${menuId}/`)) {
      redirectToTabEditWithError(menuId, "cover", "대표 슬라이드 이미지 경로가 올바르지 않습니다.");
    }

    if (imageUrl && !imagePath && !isPublicPresetImageUrl(imageUrl)) {
      redirectToTabEditWithError(menuId, "cover", "대표 슬라이드 이미지 정보가 올바르지 않습니다.");
    }

    return {
      id,
      image_url: imageUrl,
      image_path: imagePath,
      featured_item_id: featuredItemId,
      sort_order: index,
    } satisfies FeaturedSlideSettings;
  });
}

async function getValidFeaturedItemIds(supabase: SupabaseServerClient, menuId: string, featuredSlides: FeaturedSlideSettings[]) {
  const requestedItemIds = [...new Set(featuredSlides.map((slide) => slide.featured_item_id).filter((id): id is string => Boolean(id)))];

  if (requestedItemIds.length === 0) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from("menu_items")
    .select("id")
    .eq("menu_site_id", menuId)
    .eq("visible", true)
    .in("id", requestedItemIds);

  if (error) {
    redirectToTabEditWithError(menuId, "cover", `대표 상품 확인에 실패했습니다: ${error.message}`);
  }

  const validItemIds = new Set((data ?? []).map((item) => item.id));

  for (const itemId of requestedItemIds) {
    if (!validItemIds.has(itemId)) {
      redirectToTabEditWithError(menuId, "cover", "대표 상품은 공개/활성 메뉴 중에서 선택해주세요.");
    }
  }

  return validItemIds;
}

function getFirstCompleteFeaturedSlide(featuredSlides: FeaturedSlideSettings[], validItemIds: Set<string>) {
  return featuredSlides.find((slide) => Boolean(slide.image_url && slide.featured_item_id && validItemIds.has(slide.featured_item_id))) ?? null;
}

function getOrderedIds(formData: FormData) {
  const rawValue = getString(formData, "orderedIds");
  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string" && Boolean(id)) : [];
  } catch {
    return [];
  }
}

function getMenuItemBadgeLabelFromForm(menuId: string, formData: FormData) {
  try {
    return normalizeBadgeLabelForSave(formData.get("item_badge_label"), formData.get("item_custom_badge_label"));
  } catch (error) {
    redirectToMenuEditWithError(menuId, error instanceof Error ? error.message : "배지 문구를 확인해주세요.");
  }
}

function getJsonObject(value: unknown): Record<string, Json> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, Json>) } : {};
}

function getJsonString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function formatServerActionLogContext(context: Record<string, unknown>) {
  return JSON.stringify(context);
}

async function getLatestProductKeyForMenuSite(supabase: SupabaseServerClient, menuId: string) {
  const { data, error } = await supabase
    .from("orders")
    .select("product_key")
    .eq("menu_site_id", menuId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data?.product_key ?? null;
}

async function canManageMenuPagesForMenuSite(supabase: SupabaseServerClient, menuId: string, templateKey?: string | null) {
  const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
  const serviceType = getMenuEditorServiceTypeForMenuSite(productKey, getTemplateType(templateKey));
  return MENU_EDITOR_CAPABILITIES[serviceType].canManageMenuPages;
}

async function assertCanManageMenuPages(supabase: SupabaseServerClient, menuId: string, templateKey?: string | null) {
  if (await canManageMenuPagesForMenuSite(supabase, menuId, templateKey)) return;

  redirectToMenuEditWithError(menuId, "메뉴링크 베이직은 1장 메뉴판으로 제공되어 페이지를 추가, 수정, 복사, 삭제하거나 정렬할 수 없습니다.");
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
}

async function hasEnoughAiCredits(menuId: string, cost: number) {
  const balance = await getAiCreditBalanceForMenuSite(menuId);
  return balance ? balance.remainingCredits >= cost : null;
}

function getBoolean(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function getNumber(formData: FormData, key: string, fallback = 0) {
  const value = Number(getString(formData, key));
  return Number.isFinite(value) ? value : fallback;
}

function getOptionalNumber(formData: FormData, key: string) {
  const rawValue = getString(formData, key);
  if (!rawValue) return undefined;
  const value = Number(rawValue);
  return Number.isFinite(value) ? value : undefined;
}

function parseMenuWidgetFinalSavePayloadFromForm(
  menuId: string,
  formData: FormData,
  widgetsEnabled: boolean,
): MenuWidgetFinalSavePayload | null {
  const rawValue = getString(formData, MENU_WIDGET_FINAL_SAVE_PAYLOAD_FIELD);
  if (!rawValue) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    redirectToMenuEditWithError(menuId, "위젯 저장 정보 형식이 올바르지 않습니다.");
  }

  const parseResult = parseMenuWidgetFinalSaveDraftPayload(parsed);
  if (!parseResult.ok) {
    redirectToMenuEditWithError(menuId, getMenuWidgetFinalSaveValidationMessage(parseResult.errors));
  }

  if (!widgetsEnabled) {
    if (shouldRunMenuWidgetFinalSave(parseResult.value)) {
      redirectToMenuEditWithError(menuId, "이 템플릿에서는 메뉴 위젯을 사용할 수 없습니다.");
    }
    return null;
  }

  return parseResult.value;
}

function parseCafeAStarterResetFinalSavePayloadFromForm({
  menuId,
  formData,
  menuSite,
}: {
  menuId: string;
  formData: FormData;
  menuSite: MenuSite;
}): CafeAStarterResetFinalSavePayload | null {
  const rawValue = getString(formData, CAFE_A_STARTER_RESET_FINAL_SAVE_PAYLOAD_FIELD);
  if (!rawValue) return null;

  if (menuSite.template_key !== "cafe_design_a" && menuSite.template_key !== "cafe_mocha_forest_a" && menuSite.template_key !== "cafe_sunday_line_a" && menuSite.template_key !== "cafe_round_focus_a") {
    redirectToMenuEditWithError(menuId, "CafeA starter family 샘플 저장 정보가 현재 템플릿과 맞지 않습니다.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    redirectToMenuEditWithError(menuId, "오브커피 샘플 저장 정보 형식이 올바르지 않습니다.");
  }

  const parseResult = parseCafeAStarterResetFinalSavePayload(parsed);
  if (!parseResult.ok) {
    redirectToMenuEditWithError(menuId, parseResult.errors[0]?.message ?? "오브커피 샘플 저장 정보를 확인해주세요.");
  }

  return parseResult.payload;
}

function isMenuTimeSaleManagementDraft(value: unknown): value is MenuTimeSaleManagementDraft {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const draft = value as Record<string, unknown>;
  if (typeof draft.clientKey !== "string") return false;
  if (draft.promotionId !== null && typeof draft.promotionId !== "string") return false;
  if (typeof draft.enabled !== "boolean") return false;
  if (typeof draft.name !== "string") return false;
  if (typeof draft.active !== "boolean") return false;
  if (typeof draft.startsAt !== "string") return false;
  if (typeof draft.endsAt !== "string") return false;
  if (typeof draft.scheduleType !== "string") return false;
  if (draft.dailyStartTime !== null && typeof draft.dailyStartTime !== "string") return false;
  if (draft.dailyEndTime !== null && typeof draft.dailyEndTime !== "string") return false;
  if (typeof draft.timeDisplayMode !== "string") return false;
  if (draft.displayText !== null && typeof draft.displayText !== "string") return false;
  if (typeof draft.badgeText !== "string") return false;
  if (typeof draft.badgeBackgroundColor !== "string") return false;
  if (!Array.isArray(draft.targets)) return false;

  return draft.targets.every((target) => {
    if (!target || typeof target !== "object" || Array.isArray(target)) return false;
    const targetDraft = target as Record<string, unknown>;
    return (
      (targetDraft.targetId === null || typeof targetDraft.targetId === "string") &&
      typeof targetDraft.itemId === "string" &&
      (targetDraft.priceColumnId === null || typeof targetDraft.priceColumnId === "string") &&
      (typeof targetDraft.salePrice === "string" || typeof targetDraft.salePrice === "number" || targetDraft.salePrice === null) &&
      (targetDraft.salePriceLabel === undefined || targetDraft.salePriceLabel === null || typeof targetDraft.salePriceLabel === "string") &&
      typeof targetDraft.visible === "boolean"
    );
  });
}

function parseMenuTimeSaleSavePayloadFromForm(menuId: string, formData: FormData): MenuTimeSaleSavePayload | null {
  const rawValue = getString(formData, MENU_TIME_SALE_SAVE_PAYLOAD_FIELD);
  if (!rawValue) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawValue);
  } catch {
    redirectToMenuEditWithError(menuId, "타임세일 저장 정보 형식이 올바르지 않습니다.");
  }

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    redirectToMenuEditWithError(menuId, "타임세일 저장 정보 형식이 올바르지 않습니다.");
  }

  const payload = parsed as Record<string, unknown>;
  if (payload.schemaVersion !== MENU_TIME_SALE_SAVE_PAYLOAD_SCHEMA_VERSION) {
    redirectToMenuEditWithError(menuId, "타임세일 저장 정보 버전이 올바르지 않습니다. 새로고침 후 다시 저장해주세요.");
  }
  if (payload.mode !== "merge" && payload.mode !== "replace") {
    redirectToMenuEditWithError(menuId, "타임세일 저장 방식을 확인해주세요.");
  }
  if (!Array.isArray(payload.entries) || !payload.entries.every(isMenuTimeSaleManagementDraft)) {
    redirectToMenuEditWithError(menuId, "타임세일 저장 항목을 확인해주세요.");
  }
  if (!Array.isArray(payload.deletedPromotionIds) || !payload.deletedPromotionIds.every((id) => typeof id === "string")) {
    redirectToMenuEditWithError(menuId, "타임세일 삭제 요청을 확인해주세요.");
  }

  return {
    schemaVersion: MENU_TIME_SALE_SAVE_PAYLOAD_SCHEMA_VERSION,
    mode: payload.mode,
    entries: payload.entries.filter((entry) => !isEmptyNewMenuTimeSalePlaceholder(entry)),
    deletedPromotionIds: payload.deletedPromotionIds,
  };
}

function createMenuTimeSaleSavePayloadFromCafeAStarterResetSnapshot(
  snapshot: CafeAStarterResetSnapshot
): MenuTimeSaleSavePayload {
  return {
    schemaVersion: MENU_TIME_SALE_SAVE_PAYLOAD_SCHEMA_VERSION,
    mode: "replace",
    entries: snapshot.timeSales.map((timeSale) => ({
      clientKey: `starter:${timeSale.presetKey}`,
      promotionId: null,
      enabled: true,
      name: timeSale.name,
      active: timeSale.active,
      startsAt: timeSale.startsAt,
      endsAt: timeSale.endsAt,
      scheduleType: timeSale.scheduleType,
      dailyStartTime: timeSale.dailyStartTime,
      dailyEndTime: timeSale.dailyEndTime,
      timeDisplayMode: timeSale.timeDisplayMode,
      displayText: timeSale.timeDisplayText,
      badgeText: timeSale.badgeText,
      badgeBackgroundColor: timeSale.badgeBackgroundColor,
      targets: timeSale.targets.map((target) => ({
        targetId: null,
        itemId: target.itemId,
        priceColumnId: target.priceColumnId,
        salePrice: target.salePrice,
        salePriceLabel: target.salePriceLabel,
        visible: target.visible,
      })),
    })),
    deletedPromotionIds: [],
  };
}

function getMenuWidgetFinalSaveValidationMessage(errors: readonly MenuWidgetFinalSaveValidationError[]) {
  return errors[0]?.message ?? "위젯 저장 정보를 확인해주세요.";
}

function getMenuWidgetFinalSaveActionErrorMessage(error: MenuWidgetFinalSaveError) {
  if (error.code === "VALIDATION_FAILED" || error.code === "UNSUPPORTED_TEMPLATE" || error.code === "FORBIDDEN") {
    return error.message;
  }

  return "위젯 저장 중 문제가 발생했습니다. 내용을 확인한 뒤 다시 저장해주세요.";
}

function validateRequiredText(menuId: string, value: string, label: string, maxLength: number, tab = "menu") {
  if (!value) {
    redirectToTabEditWithError(menuId, tab, `${label}은 필수 입력입니다.`);
  }

  if (value.length > maxLength) {
    redirectToTabEditWithError(menuId, tab, `${label}은 최대 ${maxLength}자까지 입력 가능합니다.`);
  }
}

function validateOptionalText(menuId: string, value: string | null, label: string, maxLength: number, tab = "menu") {
  if (value && value.length > maxLength) {
    redirectToTabEditWithError(menuId, tab, `${label}은 최대 ${maxLength}자까지 입력 가능합니다.`);
  }
}

function validatePriceOptionForm(menuId: string, formData: FormData) {
  const label = getString(formData, "price_option_label");
  const price = getOptionalNumber(formData, "price_option_price");
  const priceLabel = getNullableString(formData, "price_option_price_label");

  validateRequiredText(menuId, label, "옵션명", MENU_FIELD_LIMITS.menuItemPriceOptions.label);
  validateOptionalText(menuId, priceLabel, "옵션 가격 표시 문구", MENU_FIELD_LIMITS.menuItemPriceOptions.priceLabel);

  if (price === undefined) {
    redirectToMenuEditWithError(menuId, "옵션 가격을 입력해주세요.");
  }

  return {
    label,
    price,
    price_label: priceLabel,
    sort_order: getNumber(formData, "price_option_sort_order"),
  };
}

function getMaxPriceOptionsPerItem(capabilities: TemplateCapabilities) {
  return capabilities.maxPriceOptionsPerItem ?? MENU_LIMITS.maxPriceOptionsPerItem;
}

function getPriceOptionLimitError(maxOptions: number) {
  if (maxOptions === 3) {
    return "이 템플릿에서는 옵션별 가격을 최대 3개까지 표시할 수 있습니다.";
  }

  return `가격 옵션은 아이템당 최대 ${maxOptions}개까지 등록할 수 있습니다.`;
}

function assertPriceOptionLimit(menuId: string, optionCount: number, maxOptions: number) {
  if (optionCount > maxOptions) {
    redirectToMenuEditWithError(menuId, getPriceOptionLimitError(maxOptions));
  }
}

function getNewMenuItemPriceOptions(menuId: string, formData: FormData, maxOptions: number = MENU_LIMITS.maxPriceOptionsPerItem) {
  const options = Array.from({ length: MENU_LIMITS.maxPriceOptionsPerItem }, (_, index) => {
    const label = getString(formData, `new_price_option_${index}_label`);
    const price = getOptionalNumber(formData, `new_price_option_${index}_price`);
    const priceLabel = getNullableString(formData, `new_price_option_${index}_price_label`);
    const sortOrder = getNumber(formData, `new_price_option_${index}_sort_order`, index + 1);

    if (!label && price === undefined && !priceLabel) return null;

    validateRequiredText(menuId, label, "옵션명", MENU_FIELD_LIMITS.menuItemPriceOptions.label);
    validateOptionalText(menuId, priceLabel, "가격 표시 문구", MENU_FIELD_LIMITS.menuItemPriceOptions.priceLabel);

    if (price === undefined) {
      redirectToMenuEditWithError(menuId, "옵션 가격을 입력해주세요.");
    }

    return {
      label,
      price,
      price_label: priceLabel,
      visible: true,
      sort_order: sortOrder,
    };
  }).filter((option): option is NonNullable<typeof option> => Boolean(option));

  assertPriceOptionLimit(menuId, options.length, maxOptions);
  return options;
}

type MenuItemTraitSlotInput = {
  id: string | null;
  label: string;
  value: number;
  visible: boolean;
  sort_order: number;
};

type MenuItemTraitDraftInput = {
  id?: unknown;
  label?: unknown;
  value?: unknown;
  visible?: unknown;
  sortOrder?: unknown;
  maxValue?: unknown;
};

function getMenuItemTraitSlots(menuId: string, formData: FormData): MenuItemTraitSlotInput[] {
  return Array.from({ length: MENU_LIMITS.maxTraitsPerItem }, (_, index) => {
    const id = getNullableString(formData, `trait_slot_${index}_id`);
    const label = getString(formData, `trait_slot_${index}_label`);
    const value = getNumber(formData, `trait_slot_${index}_value`, MENU_FIELD_LIMITS.menuItemTraits.minValue);
    const visible = getBoolean(formData, `trait_slot_${index}_visible`);
    const sortOrder = getNumber(formData, `trait_slot_${index}_sort_order`, index);

    if (!label) {
      return { id, label, value, visible, sort_order: sortOrder };
    }

    const validation = validateMenuItemTrait({
      label,
      value,
      max_value: MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue,
      visible,
      sort_order: sortOrder,
    });

    if (!validation.ok) {
      redirectToMenuEditWithError(menuId, validation.message);
    }

    return {
      id,
      ...validation.trait,
    };
  });
}

function getMenuItemTraitSlotsFromDraft(menuId: string, drafts: unknown): MenuItemTraitSlotInput[] {
  const draftSlots = Array.isArray(drafts) ? (drafts as MenuItemTraitDraftInput[]) : [];

  return Array.from({ length: MENU_LIMITS.maxTraitsPerItem }, (_, index) => {
    const draft = draftSlots[index] ?? {};
    const id = normalizeDraftString(draft.id) || null;
    const label = normalizeDraftString(draft.label);
    const value = normalizeDraftNumber(draft.value) || MENU_FIELD_LIMITS.menuItemTraits.minValue;
    const visible = normalizeDraftBoolean(draft.visible);
    const sortOrder = normalizeDraftNumber(draft.sortOrder ?? index);

    if (!label) {
      return { id, label, value, visible, sort_order: sortOrder };
    }

    const validation = validateMenuItemTrait({
      label,
      value,
      max_value: MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue,
      visible,
      sort_order: sortOrder,
    });

    if (!validation.ok) {
      redirectToMenuEditWithError(menuId, validation.message);
    }

    return {
      id,
      ...validation.trait,
    };
  });
}

async function syncMenuItemTraitSlots(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuId: string,
  itemId: string,
  slots: MenuItemTraitSlotInput[]
) {
  for (const slot of slots) {
    if (!slot.label) {
      if (slot.id) {
        const { error } = await supabase
          .from("menu_item_traits")
          .update({ visible: false, updated_at: new Date().toISOString() })
          .eq("id", slot.id)
          .eq("menu_site_id", menuId)
          .eq("menu_item_id", itemId);

        if (error) {
          redirectToMenuEditWithError(menuId, `빈 맛/특징 지표 숨김 처리에 실패했습니다: ${error.message}`);
        }
      }

      continue;
    }

    const payload: MenuItemTraitInsert | MenuItemTraitUpdate = {
      label: slot.label,
      value: slot.value,
      max_value: MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue,
      visible: slot.visible,
      sort_order: slot.sort_order,
      updated_at: new Date().toISOString(),
    };

    if (slot.id) {
      const { error } = await supabase
        .from("menu_item_traits")
        .update(payload)
        .eq("id", slot.id)
        .eq("menu_site_id", menuId)
        .eq("menu_item_id", itemId);

      if (error) {
        redirectToMenuEditWithError(menuId, `맛/특징 지표 저장에 실패했습니다: ${error.message}`);
      }

      continue;
    }

    const insertPayload: MenuItemTraitInsert = {
      menu_site_id: menuId,
      menu_item_id: itemId,
      label: slot.label,
      value: slot.value,
      max_value: MENU_FIELD_LIMITS.menuItemTraits.defaultMaxValue,
      visible: slot.visible,
      sort_order: slot.sort_order,
    };
    const { error } = await supabase.from("menu_item_traits").insert(insertPayload);

    if (error) {
      redirectToMenuEditWithError(menuId, `맛/특징 지표 저장에 실패했습니다: ${error.message}`);
    }
  }
}

function isMissingBadgeLabelColumnError(error: { message: string; code?: string } | null) {
  return Boolean(
    error &&
      (error.message.toLowerCase().includes("badge_label") ||
        error.message.toLowerCase().includes("could not find") ||
        error.code === "42703")
  );
}

function validateRequiredPhone(menuId: string, value: string | null, label: string, tab = "about") {
  if (!value) {
    redirectToTabEditWithError(menuId, tab, `${label}은 필수 입력입니다.`);
  }

  if (!isValidRestaurantPhone(value)) {
    redirectToTabEditWithError(menuId, tab, `${label} 형식이 올바르지 않습니다.`);
  }
}

function normalizeSlug(slug: string) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isTemplateKey(value: string): value is TemplateKey {
  return isValidTemplateKey(value);
}

function isMenuSiteStatus(value: string): value is MenuSiteStatus {
  return allowedStatuses.includes(value as MenuSiteStatus);
}

function isMenuSectionKey(value: string | null): value is MenuSectionKey {
  return value === "set_menu" || value === "main_menu" || value === "dessert_drink";
}

function getMenuPageSectionKey(value: string | null): MenuSectionKey {
  return isMenuSectionKey(value) ? value : "main_menu";
}

function isValidSlug(slug: string) {
  return isValidPublicSlug(slug);
}

function getDateString(formData: FormData, key: string) {
  return getNullableString(formData, key);
}

function redirectWithError(message: string): never {
  redirect(`/mypage/menus/new?error=${encodeURIComponent(message)}`);
}

function getEditPath(menuId: string, params?: { error?: string; message?: string; tab?: string; editingItemId?: string }) {
  const searchParams = new URLSearchParams();

  if (params?.tab) {
    searchParams.set("tab", params.tab);
  }

  if (params?.error) {
    searchParams.set("error", params.error);
  }

  if (params?.message) {
    searchParams.set("message", params.message);
  }

  if (params?.editingItemId) {
    searchParams.set("editingItemId", params.editingItemId);
  }

  const query = searchParams.toString();
  return `/mypage/menus/${menuId}/edit${query ? `?${query}` : ""}`;
}

function redirectToEditWithError(menuId: string, message: string): never {
  redirect(getEditPath(menuId, { error: message }));
}

function redirectToTabEdit(menuId: string, tab: string, message: string): never {
  redirect(getEditPath(menuId, { tab, message }));
}

function redirectToTabEditWithError(menuId: string, tab: string, message: string): never {
  redirect(getEditPath(menuId, { tab, error: message }));
}

function redirectToMenuEdit(menuId: string, message: string): never {
  redirect(getEditPath(menuId, { tab: "menu", message }));
}

function redirectToMenuEditWithError(menuId: string, message: string): never {
  redirect(getEditPath(menuId, { tab: "menu", error: message }));
}

function revalidateMenuPaths(menuId: string, slug?: string) {
  revalidatePath("/mypage");
  revalidatePath(getEditPath(menuId));

  if (slug) {
    revalidatePath(getPublicMenuPath(slug));
    revalidatePath(getLegacyMenuPath(slug));
  }
}

async function removeMenuImagePath(
  supabase: Awaited<ReturnType<typeof createClient>>,
  imagePath: string | null | undefined
) {
  if (!imagePath) {
    return null;
  }

  const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).remove([imagePath]);
  return error;
}

async function removeMenuVideoPath(videoPath: string | null | undefined) {
  if (!videoPath) {
    return null;
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;

  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    return error instanceof Error ? error : new Error("Supabase admin client를 생성할 수 없습니다.");
  }

  const { error } = await adminSupabase.storage.from(MENU_VIDEOS_BUCKET).remove([videoPath]);
  return error;
}

async function requireOwnedMenuSite(menuId: string, options: { inactiveMessage?: string } = {}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/edit`);
  }

  const menuSiteSelect = "id, user_id, name, slug, status, published_at, template_key, template_category, restaurant_name, restaurant_category, menu_cover_label, menu_cover_title, menu_cover_description, brand_description, cover_image_url, cover_image_path, settings, page_settings";
  const fallbackMenuSiteSelect = "id, user_id, name, slug, status, published_at, template_key, restaurant_name, restaurant_category, menu_cover_title, menu_cover_description, brand_description, cover_image_url, cover_image_path, settings, page_settings";

  const primaryResult = await supabase
    .from("menu_sites")
    .select(menuSiteSelect)
    .eq("id", menuId)
    .eq("user_id", user.id)
    .maybeSingle();
  let menuSite = primaryResult.data as MenuSite | null;
  let error = primaryResult.error;

  const menuSiteErrorMessage = error?.message.toLowerCase() ?? "";
  if (error && ["template_category", "menu_cover_label"].some((column) => menuSiteErrorMessage.includes(column))) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .select(fallbackMenuSiteSelect)
      .eq("id", menuId)
      .eq("user_id", user.id)
      .maybeSingle();

    menuSite = fallbackResult.data as MenuSite | null;
    error = fallbackResult.error;
  }

  if (error) {
    console.error("[menu-editor] menu site ownership check failed", { menuId, message: error.message, code: error.code });
    redirectToEditWithError(menuId, "이 메뉴판을 수정할 권한이 없습니다.");
  }

  if (!menuSite) {
    redirectToEditWithError(menuId, "이 메뉴판을 수정할 권한이 없습니다.");
  }

  const accessState = await getMenuSiteAccessStateForMenuSite({ menuSiteId: menuId, userId: user.id });
  if (!accessState?.canUseWriteActions) {
    redirectToEditWithError(menuId, options.inactiveMessage ?? MENU_SITE_INACTIVE_EDIT_MESSAGE);
  }

  return { supabase, user, menuSite };
}

export async function updateBadgeStylesAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const badgeStyles = BADGE_STYLE_KEYS.reduce<BadgeStyles>((styles, key) => {
    const backgroundColor = getString(formData, `badge_${key}_background_color`);
    const textColor = getString(formData, `badge_${key}_text_color`);

    if (!isHexColor(backgroundColor) || !isHexColor(textColor)) {
      redirectToTabEditWithError(menuId, "design", "배지 색상은 #RRGGBB 형식으로 입력해주세요.");
    }

    styles[key] = {
      background_color: backgroundColor.toUpperCase(),
      text_color: textColor.toUpperCase(),
    };
    return styles;
  }, {} as BadgeStyles);
  const settings = {
    ...getJsonObject(menuSite.settings),
    badge_styles: badgeStyles,
  };

  const { error } = await supabase
    .from("menu_sites")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `배지 색상 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "배지/칩 색상이 저장되었습니다.");
}

export async function resetBadgeStylesAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const settings = getJsonObject(menuSite.settings);
  delete settings.badge_styles;

  const { error } = await supabase
    .from("menu_sites")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `배지 기본값 복원에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "현재 템플릿의 기본 배지 색상으로 되돌렸습니다.");
}

export async function updateBadgeStyleKeyAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const styleKey = getString(formData, "badge_style_key") as BadgeStyleKey;
  const backgroundColor = getString(formData, "badge_background_color");
  const textColor = getString(formData, "badge_text_color");

  if (!BADGE_STYLE_KEYS.includes(styleKey)) {
    redirectToMenuEditWithError(menuId, "배지 종류를 다시 선택해주세요.");
  }

  if (!isHexColor(backgroundColor) || !isHexColor(textColor)) {
    redirectToMenuEditWithError(menuId, "배지 색상은 #RRGGBB 형식으로 입력해주세요.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const settings = getJsonObject(menuSite.settings);
  const badgeStyles = getJsonObject(settings.badge_styles);
  badgeStyles[styleKey] = {
    background_color: backgroundColor.toUpperCase(),
    text_color: textColor.toUpperCase(),
  };
  settings.badge_styles = badgeStyles;

  const { error } = await supabase
    .from("menu_sites")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToMenuEditWithError(menuId, `배지 색상 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "배지 색상이 저장되었습니다.");
}

export async function resetBadgeStyleKeyAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const styleKey = getString(formData, "badge_style_key") as BadgeStyleKey;

  if (!BADGE_STYLE_KEYS.includes(styleKey)) {
    redirectToMenuEditWithError(menuId, "배지 종류를 다시 선택해주세요.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const settings = getJsonObject(menuSite.settings);
  const badgeStyles = getJsonObject(settings.badge_styles);
  delete badgeStyles[styleKey];

  if (Object.keys(badgeStyles).length > 0) {
    settings.badge_styles = badgeStyles;
  } else {
    delete settings.badge_styles;
  }

  const { error } = await supabase
    .from("menu_sites")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToMenuEditWithError(menuId, `배지 기본값 복원에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "선택한 배지를 현재 템플릿의 기본 색상으로 되돌렸습니다.");
}

export async function translateMenuSiteAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, user, menuSite } = await requireOwnedMenuSite(menuId);
  const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
  const aiUsagePlanKey = normalizeMenuLinkPlanKey(productKey);
  const fullTranslationUsage = getAiUsage(menuSite.settings, aiUsagePlanKey, "ai_translate_full");
  const hasFullTranslationCredits = await hasEnoughAiCredits(menuId, AI_FEATURE_CREDIT_COSTS.full_translation);
  const targetLocales = getEnabledLocales(menuSite.settings).filter((locale): locale is (typeof TARGET_TRANSLATION_LOCALES)[number] =>
    TARGET_TRANSLATION_LOCALES.includes(locale as (typeof TARGET_TRANSLATION_LOCALES)[number])
  );

  if (targetLocales.length === 0) {
    redirectToTabEditWithError(menuId, "localization", "자동 번역을 실행할 외국어를 먼저 선택해주세요.");
  }

  if (hasFullTranslationCredits === false || (hasFullTranslationCredits === null && isAiUsageExceeded(fullTranslationUsage))) {
    redirectToTabEditWithError(menuId, "localization", "AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.");
  }

  const startedAt = new Date().toISOString();
  const { data: job, error: jobError } = await supabase
    .from("menu_translation_jobs")
    .insert({
      menu_site_id: menuId,
      requested_by: user.id,
      status: "running",
      target_locales: [...targetLocales],
      started_at: startedAt,
      updated_at: startedAt,
    })
    .select("id")
    .single();

  if (jobError || !job) {
    const safeMessage = getSafeTranslationErrorMessage(jobError?.message ?? null);
    console.error("[menu-translation] job creation failed", { menuId, message: jobError?.message ?? "unknown" });
    redirectToTabEditWithError(menuId, "localization", safeMessage);
  }

  let translatedEntities = 0;

  try {
    const result = await runMenuTranslationUpdate(supabase, menuId, targetLocales);
    translatedEntities = result.translatedEntities;
    const completedAt = new Date().toISOString();
    const updatePayload: MenuTranslationJobUpdate = {
      status: "completed",
      completed_at: completedAt,
      updated_at: completedAt,
    };
    const { error: updateJobError } = await supabase.from("menu_translation_jobs").update(updatePayload).eq("id", job.id);

    if (updateJobError) {
      throw new Error(`번역 작업 상태 저장에 실패했습니다: ${updateJobError.message}`);
    }

    if (translatedEntities > 0) {
      await spendAiCredits({ userId: user.id, menuSiteId: menuId, featureKey: "full_translation" });
    }
  } catch (error) {
    const failedAt = new Date().toISOString();
    const errorMessage = error instanceof Error ? error.message : "번역 중 알 수 없는 오류가 발생했습니다.";
    const safeMessage = translatedEntities > 0 ? PARTIAL_TRANSLATION_FAILURE_MESSAGE : getSafeTranslationErrorMessage(errorMessage);
    console.error("[menu-translation] update failed", { menuId, jobId: job.id, message: errorMessage });
    await supabase
      .from("menu_translation_jobs")
      .update({
        status: "failed",
        error_message: safeMessage,
        completed_at: failedAt,
        updated_at: failedAt,
      })
      .eq("id", job.id);

    revalidateMenuPaths(menuId, menuSite.slug);
    redirectToTabEditWithError(menuId, "localization", safeMessage);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(
    menuId,
    "localization",
    translatedEntities > 0 ? "자동 번역 업데이트가 완료되었습니다." : "최신 번역이 이미 준비되어 있습니다."
  );
}

export async function generateMenuSiteTranslationDraftAction(input: {
  menuId: string;
  targetLocales: SupportedLocale[];
  mode?: TranslationRunMode;
  retryOfJobId?: string;
}): Promise<FullTranslationDraftActionResult> {
  const menuId = input.menuId?.trim();
  if (!menuId) {
    return { ok: false, message: "자동 번역 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  const mode: TranslationRunMode = input.mode === "single" || input.mode === "retry_failed" ? input.mode : "all";
  const targetLocales = input.targetLocales.filter((locale): locale is EditableTranslationLocale =>
    TARGET_TRANSLATION_LOCALES.includes(locale as (typeof TARGET_TRANSLATION_LOCALES)[number])
  );
  const uniqueTargetLocales = [...new Set(targetLocales)] as EditableTranslationLocale[];

  if (uniqueTargetLocales.length === 0) {
    return { ok: false, message: "자동 번역을 실행할 외국어를 먼저 선택해주세요." };
  }

  if ((mode === "single" || mode === "retry_failed") && uniqueTargetLocales.length !== 1) {
    return { ok: false, message: "언어별 자동 번역은 한 번에 하나의 언어만 실행할 수 있습니다." };
  }

  if (mode === "retry_failed" && !input.retryOfJobId?.trim()) {
    return { ok: false, message: "실패한 언어 재시도 정보가 없어 일반 언어별 번역으로 다시 실행해주세요." };
  }

  let draftJobId: string | null = null;
  let draftSupabase: SupabaseServerClient | null = null;

  try {
    const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
    draftSupabase = supabase;
    const enabledTargetLocales = getEnabledLocales(menuSite.settings).filter((locale): locale is EditableTranslationLocale =>
      TARGET_TRANSLATION_LOCALES.includes(locale as (typeof TARGET_TRANSLATION_LOCALES)[number])
    );
    const enabledTargetLocaleSet = new Set(enabledTargetLocales);
    const requestedDisabledLocale = uniqueTargetLocales.find((locale) => !enabledTargetLocaleSet.has(locale));

    if (requestedDisabledLocale) {
      return { ok: false, message: `${LOCALE_LABELS[requestedDisabledLocale]}를 먼저 사용 언어로 설정하고 저장해주세요.` };
    }

    const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
    const aiUsagePlanKey = normalizeMenuLinkPlanKey(productKey);
    const isFullRun = mode === "all";
    const featureKey = isFullRun ? "full_translation" : "partial_translation";
    const creditCost = AI_FEATURE_CREDIT_COSTS[featureKey];
    const usageType = isFullRun ? "ai_translate_full" : "ai_translate_partial";
    const currentUsage = getAiUsage(menuSite.settings, aiUsagePlanKey, usageType);
    const hasTranslationCredits = await hasEnoughAiCredits(menuId, creditCost);

    if (hasTranslationCredits === false || (hasTranslationCredits === null && isAiUsageExceeded(currentUsage))) {
      return { ok: false, message: "AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.", usage: currentUsage };
    }

    const startedAt = new Date().toISOString();
    const { data: job, error: jobError } = await supabase
      .from("menu_translation_jobs")
      .insert({
        menu_site_id: menuId,
        requested_by: menuSite.user_id,
        status: "running",
        target_locales: uniqueTargetLocales,
        started_at: startedAt,
        updated_at: startedAt,
      })
      .select("id")
      .single();

    if (jobError || !job) {
      const safeMessage = getSafeTranslationErrorMessage(jobError?.message ?? null);
      console.error("[localization:auto-translate] draft job creation failed", {
        menuId,
        mode,
        targetLocales: uniqueTargetLocales,
        message: jobError?.message ?? "unknown",
      });
      return { ok: false, message: safeMessage, usage: currentUsage };
    }

    draftJobId = job.id;

    const result = await runMenuTranslationDraft(supabase, menuId, uniqueTargetLocales);
    const failedLocaleLabels = result.localeResults
      .filter((localeResult) => !localeResult.ok)
      .map((localeResult) => LOCALE_LABELS[localeResult.locale])
      .join(", ");
    const untranslatedWarningCount = result.localeResults.reduce((total, localeResult) => total + localeResult.untranslatedWarningCount, 0);
    const failedLocaleResults = result.localeResults.filter((localeResult) => !localeResult.ok);
    const succeededOrSkippedLocaleResults = result.localeResults.filter((localeResult) => localeResult.ok);
    const overallStatus =
      failedLocaleResults.length === 0
        ? "success"
        : succeededOrSkippedLocaleResults.length > 0 && result.translatedEntities > 0
        ? "partial_success"
        : "failed";
    const localeResults: AutoTranslationLocaleResult[] = result.localeResults.map((localeResult) => {
      const status: TranslationRunLocaleStatus = localeResult.ok
        ? localeResult.translatedEntities > 0 || localeResult.draftRowCount > 0
          ? "success"
          : "skipped"
        : "failed";

      return {
        locale: localeResult.locale,
        status,
        translatedEntities: localeResult.translatedEntities,
        translatedTextUnits: localeResult.translatedTextUnits,
        draftRowCount: localeResult.draftRowCount,
        userMessage: localeResult.ok ? null : getSafeTranslationErrorMessage(localeResult.error),
      };
    });
    const entityTypeByTable = {
      menu_site_translations: "site",
      menu_page_translations: "page",
      menu_category_translations: "category",
      menu_item_translations: "item",
      menu_promotion_translations: "promotion",
      menu_widget_translations: "widget",
    } as const satisfies Record<string, EditableTranslationEntityType>;
    const data: AutoTranslationDraftPatch[] = result.rows.flatMap((row) => {
      const entityType = entityTypeByTable[row.table as keyof typeof entityTypeByTable];
      if (!entityType) return [];

      return Object.entries(row.fields).flatMap(([field, value]) => {
        if (!value) return [];
        return [
          {
            entityType,
            entityId: row.entityId,
            field,
            locale: row.locale,
            value,
            sourceHash: row.sourceTextHash,
          },
        ];
      });
    });
    const completedAt = new Date().toISOString();
    const jobErrorMessage =
      overallStatus === "success"
        ? null
        : failedLocaleLabels
        ? `${failedLocaleLabels} 번역 실패`
        : "자동 번역 초안 생성 실패";
    const { error: updateJobError } = await supabase
      .from("menu_translation_jobs")
      .update({
        status: overallStatus === "failed" ? "failed" : "completed",
        error_message: jobErrorMessage,
        completed_at: completedAt,
        updated_at: completedAt,
        draft_payload: data.length > 0 ? (data as Json) : null,
        locale_results: localeResults as Json,
        result_version: 1,
      })
      .eq("id", job.id);

    if (updateJobError) {
      throw new Error(`번역 작업 상태 저장에 실패했습니다: ${updateJobError.message}`);
    }

    let usage = currentUsage;
    let creditCharged = false;

    if (result.translatedEntities > 0) {
      const usedAt = new Date();
      const creditSpend = await spendAiCredits({ userId: menuSite.user_id, menuSiteId: menuId, featureKey });
      usage = getAiUsageFromCreditSpend(usageType, creditSpend.usedCredits, creditSpend.totalCredits, usedAt);
      creditCharged = true;
    }

    if (overallStatus === "failed") {
      return {
        ok: false,
        message:
          failedLocaleLabels
            ? `${failedLocaleLabels} 번역에 실패했습니다. 성공한 번역 초안은 없습니다.`
            : "자동 번역 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요.",
        usage,
        jobId: job.id,
        overallStatus,
        localeResults: localeResults.filter((localeResult) => localeResult.status !== "success"),
        credit: {
          charged: false,
          transactionType: result.translatedEntities > 0 ? featureKey : null,
          amount: 0,
        },
      };
    }

    return {
      ok: true,
      data,
      usage,
      message:
        overallStatus === "partial_success" && failedLocaleLabels
          ? `${failedLocaleLabels} 번역은 실패했지만, 완료된 번역 초안은 유지됩니다. 실패한 언어만 다시 시도할 수 있습니다.`
        : untranslatedWarningCount > 0
          ? "자동 번역 초안이 생성되었습니다. 일부 항목은 원문이 남아 있을 수 있으니 저장 전 내용을 확인해주세요."
          : result.translatedEntities > 0
          ? isFullRun
            ? "전체 자동 번역 초안이 생성되었습니다. 저장 후 공개 메뉴판에 반영됩니다."
            : `${LOCALE_LABELS[uniqueTargetLocales[0]]} 자동 번역 초안이 생성되었습니다. 저장 후 공개 메뉴판에 반영됩니다.`
          : "최신 번역이 이미 준비되어 있습니다.",
      jobId: job.id,
      overallStatus,
      localeResults,
      credit: {
        charged: creditCharged,
        transactionType: creditCharged ? featureKey : null,
        amount: creditCharged ? creditCost : 0,
      },
    };
  } catch (error) {
    if (draftSupabase && draftJobId) {
      const failedAt = new Date().toISOString();
      await draftSupabase
        .from("menu_translation_jobs")
        .update({
          status: "failed",
          error_message: getSafeTranslationErrorMessage(error instanceof Error ? error.message : null),
          completed_at: failedAt,
          updated_at: failedAt,
        })
        .eq("id", draftJobId);
    }

    console.error(`[localization:auto-translate] draft action failed ${formatServerActionLogContext({
      menuId,
      mode,
      targetLocales: uniqueTargetLocales,
      retryOfJobId: input.retryOfJobId?.trim() || null,
      message: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack : undefined,
    })}`);
    return {
      ok: false,
      message: getSafeTranslationErrorMessage(error instanceof Error ? error.message : "자동 번역 초안 생성 중 오류가 발생했습니다."),
      jobId: draftJobId,
      overallStatus: "failed",
      localeResults: uniqueTargetLocales.map((locale) => ({
        locale,
        status: "failed",
        translatedEntities: 0,
        translatedTextUnits: 0,
        draftRowCount: 0,
        userMessage: getSafeTranslationErrorMessage(error instanceof Error ? error.message : null),
      })),
      credit: {
        charged: false,
        transactionType: mode === "all" ? "full_translation" : "partial_translation",
        amount: 0,
      },
    };
  }
}

async function saveBadgeStyleFromMenuItemForm(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuId: string,
  menuSite: { settings: unknown },
  formData: FormData
) {
  const styleKey = getString(formData, "badge_style_key") as BadgeStyleKey;
  if (!styleKey) return;

  if (!BADGE_STYLE_KEYS.includes(styleKey)) {
    redirectToMenuEditWithError(menuId, "배지 종류를 다시 선택해주세요.");
  }

  const backgroundColor = getString(formData, "badge_background_color");
  const textColor = getString(formData, "badge_text_color");

  if (!isHexColor(backgroundColor) || !isHexColor(textColor)) {
    redirectToMenuEditWithError(menuId, "배지 색상은 #RRGGBB 형식으로 입력해주세요.");
  }

  const settings = getJsonObject(menuSite.settings);
  const badgeStyles = getJsonObject(settings.badge_styles);
  badgeStyles[styleKey] = {
    background_color: backgroundColor.toUpperCase(),
    text_color: textColor.toUpperCase(),
  };
  settings.badge_styles = badgeStyles;

  const { error } = await supabase
    .from("menu_sites")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToMenuEditWithError(menuId, `배지 색상 저장에 실패했습니다: ${error.message}`);
}

function getTypographyRoleSettingsFromFormData(formData: FormData, templateKey?: string | null): TypographyRoleSettings {
  const rawRoles = TYPOGRAPHY_ROLE_KEYS.reduce((roles, role) => {
    roles[role] = {
      font_ko_key: getString(formData, `typography_role_${role}_font_ko_key`),
      font_en_key: getString(formData, `typography_role_${role}_font_en_key`),
      color: getString(formData, `typography_role_${role}_color`),
      size: getString(formData, `typography_role_${role}_size`),
      weight: getString(formData, `typography_role_${role}_weight`),
    };
    return roles;
  }, {} as Record<string, Record<string, string>>);

  return normalizeTypographyRoleSettings(rawRoles, templateKey);
}

function getCafeATypographyRolePayload(roleSettings: TypographyRoleSettings) {
  const payload = TYPOGRAPHY_ROLE_KEYS.reduce((roles, role) => {
    const setting = roleSettings[role];
    const rolePayload: Record<string, string> = {};

    if (setting.font_ko_key) {
      rolePayload.font_ko_key = setting.font_ko_key;
    }

    if (setting.font_en_key) {
      rolePayload.font_en_key = setting.font_en_key;
    }

    if ((role === "brand" || role === "category") && setting.color) {
      rolePayload.color = setting.color;
    }

    if (Object.keys(rolePayload).length > 0) {
      roles[role] = rolePayload;
    }

    return roles;
  }, {} as Record<string, Record<string, string>>);

  return Object.keys(payload).length > 0 ? payload : null;
}

function setDesignTypographyRoleSettings(designSettings: Record<string, unknown>, roleSettings: TypographyRoleSettings, templateKey?: string | null) {
  if (templateKey === "cafe_design_a" || templateKey === "cafe_mocha_forest_a" || templateKey === "cafe_sunday_line_a" || templateKey === "cafe_round_focus_a") {
    const cafeARolePayload = getCafeATypographyRolePayload(roleSettings);
    if (cafeARolePayload) {
      designSettings.typographyRoles = cafeARolePayload;
    } else {
      delete designSettings.typographyRoles;
    }
    return;
  }

  if (hasCustomTypographyRoleSettings(roleSettings)) {
    designSettings.typographyRoles = roleSettings;
  } else {
    delete designSettings.typographyRoles;
  }
  delete designSettings.typography_roles;
}

export async function updateTypographySettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const koreanFontKey = getString(formData, "korean_font_key");
  const englishFontKey = getString(formData, "english_font_key");
  const rawFontSizeScaleKey = getString(formData, "font_size_scale_key") || "m";
  if (koreanFontKey && !isKoreanFontValue(koreanFontKey)) {
    redirectToTabEditWithError(menuId, "design", "한글 폰트 선택값이 올바르지 않습니다.");
  }

  if (englishFontKey && !isEnglishFontValue(englishFontKey)) {
    redirectToTabEditWithError(menuId, "design", "영문/숫자 폰트 선택값이 올바르지 않습니다.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const fontSizeScaleKey = normalizeFontSizeScaleKeyForTemplate(rawFontSizeScaleKey, menuSite.template_key);
  const typographyRoleSettings = getTypographyRoleSettingsFromFormData(formData, menuSite.template_key);
  const pageSettings = getJsonObject(menuSite.page_settings);
  const designSettings = getJsonObject(pageSettings.design);

  if (koreanFontKey) {
    designSettings.koreanFont = koreanFontKey;
  } else {
    delete designSettings.koreanFont;
  }

  if (englishFontKey) {
    designSettings.englishFont = englishFontKey;
  } else {
    delete designSettings.englishFont;
  }

  if (menuSite.template_key !== "cafe_design_a" && menuSite.template_key !== "cafe_mocha_forest_a" && menuSite.template_key !== "cafe_sunday_line_a" && menuSite.template_key !== "cafe_round_focus_a") {
    designSettings.fontSizeScale = fontSizeScaleKey;
  }
  setDesignTypographyRoleSettings(designSettings, typographyRoleSettings, menuSite.template_key);

  if (Object.keys(designSettings).length > 0) {
    pageSettings.design = designSettings;
  } else {
    delete pageSettings.design;
  }
  delete pageSettings.koreanFont;
  delete pageSettings.englishFont;
  delete pageSettings.fontSizeScale;

  const { error } = await supabase
    .from("menu_sites")
    .update({ page_settings: pageSettings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `폰트 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", koreanFontKey || englishFontKey ? "폰트 설정이 저장되었습니다." : "현재 템플릿의 기본 폰트로 되돌렸습니다.");
}

export async function updateBackgroundColorAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const backgroundColor = normalizeBackgroundColor(getString(formData, "background_color"));
  if (!backgroundColor) {
    redirectToTabEditWithError(menuId, "design", "배경색은 #RRGGBB 형식으로 입력해주세요.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const pageSettings = getJsonObject(menuSite.page_settings);
  const designSettings = getJsonObject(pageSettings.design);

  const nextPageSettings = {
    ...pageSettings,
    design: {
      ...designSettings,
      backgroundColor,
    },
  };

  const { error } = await supabase
    .from("menu_sites")
    .update({ page_settings: nextPageSettings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `배경색 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "배경색이 저장되었습니다.");
}

export async function resetBackgroundColorAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const pageSettings = getJsonObject(menuSite.page_settings);
  const designSettings = getJsonObject(pageSettings.design);

  delete designSettings.backgroundColor;
  if (Object.keys(designSettings).length > 0) {
    pageSettings.design = designSettings;
  } else {
    delete pageSettings.design;
  }
  delete pageSettings.backgroundColor;

  const { error } = await supabase
    .from("menu_sites")
    .update({ page_settings: pageSettings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `배경색 기본값 복원에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "현재 템플릿의 기본 배경색으로 되돌렸습니다.");
}

function getTranslationDraftValues(formData: FormData) {
  const rawValue = getString(formData, "translation_draft");
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((entry): entry is EditableTranslationDraftValue => {
      if (!entry || typeof entry !== "object") return false;
      const candidate = entry as Partial<EditableTranslationDraftValue>;
      return (
        (candidate.entityType === "site" ||
          candidate.entityType === "page" ||
          candidate.entityType === "category" ||
          candidate.entityType === "item" ||
          candidate.entityType === "promotion" ||
          candidate.entityType === "widget") &&
        typeof candidate.entityId === "string" &&
        typeof candidate.field === "string" &&
        typeof candidate.sourceHash === "string" &&
        Boolean(candidate.entityId) &&
        Boolean(candidate.field) &&
        candidate.translations !== null &&
        typeof candidate.translations === "object"
      );
    });
  } catch {
    return [];
  }
}

function getEditableTranslationText(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function isTargetTranslationLocale(value: string): value is (typeof TARGET_TRANSLATION_LOCALES)[number] {
  return TARGET_TRANSLATION_LOCALES.includes(value as (typeof TARGET_TRANSLATION_LOCALES)[number]);
}

function hasMeaningfulTranslationText(value: unknown) {
  if (typeof value !== "string") return false;

  const text = value.trim();
  if (!text) return false;
  if (/^[ㄱ-ㅎㅏ-ㅣ\s]+$/.test(text)) return false;
  if (!/[\p{L}\p{N}]/u.test(text)) return false;

  return true;
}

function getMeaningfulTranslatedFields(fields: Record<string, string>) {
  return Object.fromEntries(Object.entries(fields).filter(([, value]) => hasMeaningfulTranslationText(value)));
}

function normalizeAiDescriptionForComparison(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().replace(/\s+/g, " ");
}

type GenerateMenuItemDescriptionResult =
  | {
      ok: true;
      description: string;
      usage: { used: number; limit: number };
      message: string;
    }
  | {
      ok: false;
      message: string;
      usage?: { used: number; limit: number };
    };

type GenerateMenuCleanupActionResult =
  | {
      ok: true;
      data: MenuCleanupStructuredResult;
      usage: { used: number; limit: number };
      message: string;
    }
  | {
      ok: false;
      message: string;
      usage?: { used: number; limit: number };
    };

type FullTranslationDraftActionResult =
  | {
      ok: true;
      data: AutoTranslationDraftPatch[];
      usage: { used: number; limit: number };
      message: string;
      jobId: string | null;
      overallStatus: "success" | "partial_success";
      localeResults: AutoTranslationLocaleResult[];
      credit: {
        charged: boolean;
        transactionType: "full_translation" | "partial_translation" | null;
        amount: number;
      };
    }
  | {
      ok: false;
      message: string;
      usage?: { used: number; limit: number };
      jobId?: string | null;
      overallStatus?: "failed";
      localeResults?: AutoTranslationLocaleResult[];
      credit?: {
        charged: false;
        transactionType: "full_translation" | "partial_translation" | null;
        amount: number;
      };
    };

type TranslationRunMode = "all" | "single" | "retry_failed";
type TranslationRunLocaleStatus = "success" | "failed" | "skipped";

function setEditableTranslationValue(row: Record<string, unknown>, field: string, value: string | null) {
  row[field] = value;
}

async function saveEditableTranslationDrafts(
  supabase: SupabaseServerClient,
  menuId: string,
  draftValues: EditableTranslationDraftValue[],
  templateKey?: string | null,
  errorLabel = "다국어 저장"
) {
  if (draftValues.length === 0) return;

  const isDisplayLocalization = templateKey === "display_menu_a";
  const supportsWidgetLocalization = templateKey ? getTemplateCapabilities(templateKey).menuWidgets.enabled : false;
  const allowedFields: Record<EditableTranslationEntityType, readonly string[]> = isDisplayLocalization ? {
    site: ["restaurant_name"],
    page: [],
    category: ["name"],
    item: ["name", "set_name", "price_label", "badge_label"],
    promotion: [],
    widget: [],
  } : {
    site: [
      "restaurant_name",
      "brand_description",
      "menu_cover_title",
      "menu_cover_description",
      "menu_cover_label",
      "description",
      "opening_hours",
      "restaurant_address",
      "restaurant_phone",
    ],
    page: ["title", "description"],
    category: ["name", "description"],
    item: ["name", "description", "price_label", "portion_label", "badge_label"],
    promotion: isBasicTimeSaleTemplate(templateKey) ? ["badge_text", "time_display_text"] : [],
    widget: supportsWidgetLocalization ? ["title", "description"] : [],
  };
  const saveableDraftValues = draftValues.filter((draft) => {
    const isAllowedField = allowedFields[draft.entityType].includes(draft.field);
    if (!isAllowedField && isDisplayLocalization) {
      console.info("[localization:save] filtered unsupported display translation item", {
        templateKey,
        entityType: draft.entityType,
        entityId: draft.entityId,
        field: draft.field,
      });
    }
    return isAllowedField;
  });

  if (saveableDraftValues.length === 0) return;

  const targetLocales = TRANSLATABLE_LOCALES as readonly EditableTranslationLocale[];
  const groupedRows = {
    site: new Map<string, Record<string, unknown>>(),
    page: new Map<string, Record<string, unknown>>(),
    category: new Map<string, Record<string, unknown>>(),
    item: new Map<string, Record<string, unknown>>(),
    promotion: new Map<string, Record<string, unknown>>(),
    widget: new Map<string, Record<string, unknown>>(),
  };

  const idsByType = saveableDraftValues.reduce<Record<EditableTranslationEntityType, Set<string>>>(
    (result, draft) => {
      result[draft.entityType].add(draft.entityId);
      return result;
    },
    { site: new Set(), page: new Set(), category: new Set(), item: new Set(), promotion: new Set(), widget: new Set() }
  );

  if (idsByType.site.size > 1 || (idsByType.site.size === 1 && !idsByType.site.has(menuId))) {
    redirectToTabEditWithError(menuId, "localization", "번역 저장 대상 메뉴판을 확인할 수 없습니다.");
  }

  const invalidWidgetEntityId = [...idsByType.widget].find((id) => !isUuid(id));
  if (invalidWidgetEntityId) {
    redirectToTabEditWithError(menuId, "localization", "위젯 번역 저장 대상이 올바르지 않습니다.");
  }

  const invalidPromotionEntityId = [...idsByType.promotion].find((id) => !isUuid(id));
  if (invalidPromotionEntityId) {
    redirectToTabEditWithError(menuId, "localization", "특가세일 번역 저장 대상이 올바르지 않습니다.");
  }

  const [pagesResult, categoriesResult, itemsResult, promotionsResult, widgetsResult] = await Promise.all([
    idsByType.page.size > 0
      ? supabase.from("menu_pages").select("id").eq("menu_site_id", menuId).in("id", [...idsByType.page])
      : Promise.resolve({ data: [], error: null }),
    idsByType.category.size > 0
      ? supabase.from("menu_categories").select("id").eq("menu_site_id", menuId).in("id", [...idsByType.category])
      : Promise.resolve({ data: [], error: null }),
    idsByType.item.size > 0
      ? supabase.from("menu_items").select("id").eq("menu_site_id", menuId).in("id", [...idsByType.item])
      : Promise.resolve({ data: [], error: null }),
    idsByType.promotion.size > 0
      ? supabase.from("menu_promotions").select("id").eq("menu_site_id", menuId).eq("type", TIME_SALE_TYPE).in("id", [...idsByType.promotion])
      : Promise.resolve({ data: [], error: null }),
    idsByType.widget.size > 0
      ? supabase.from("menu_widgets").select("id, widget_type").eq("menu_site_id", menuId).in("id", [...idsByType.widget])
      : Promise.resolve({ data: [], error: null }),
  ]);

  const readError = pagesResult.error ?? categoriesResult.error ?? itemsResult.error ?? promotionsResult.error ?? widgetsResult.error;
  if (readError) {
    redirectToTabEditWithError(menuId, "localization", `번역 저장 대상 확인에 실패했습니다: ${readError.message}`);
  }

  const allowedIds = {
    site: new Set([menuId]),
    page: new Set((pagesResult.data ?? []).map((row) => row.id)),
    category: new Set((categoriesResult.data ?? []).map((row) => row.id)),
    item: new Set((itemsResult.data ?? []).map((row) => row.id)),
    promotion: new Set((promotionsResult.data ?? []).map((row) => row.id)),
    widget: new Set(
      ((widgetsResult.data ?? []) as { id: string; widget_type: string }[])
        .filter((row) => row.widget_type === "text" || row.widget_type === "image_text")
        .map((row) => row.id),
    ),
  };

  saveableDraftValues.forEach((draft) => {
    if (!allowedFields[draft.entityType].includes(draft.field) || !allowedIds[draft.entityType].has(draft.entityId)) {
      console.warn("[localization:save] rejected translation item", {
        templateKey,
        entityType: draft.entityType,
        entityId: draft.entityId,
        field: draft.field,
      });
      redirectToTabEditWithError(menuId, "localization", "저장할 수 없는 번역 항목이 포함되어 있습니다.");
    }

    targetLocales.forEach((locale) => {
      if (draft.entityType === "widget" || draft.entityType === "promotion") {
        const value = draft.translations[locale];
        const maxLength = draft.entityType === "widget"
          ? draft.field === "title"
            ? MAX_MENU_WIDGET_TITLE_LENGTH
            : draft.field === "description"
              ? MAX_MENU_WIDGET_DESCRIPTION_LENGTH
              : null
          : draft.field === "badge_text"
            ? TIME_SALE_BADGE_TEXT_MAX_LENGTH
            : draft.field === "time_display_text"
              ? TIME_SALE_DISPLAY_TEXT_MAX_LENGTH
              : null;

        if (typeof value === "string" && maxLength != null && value.length > maxLength) {
          const message = draft.entityType === "widget"
            ? draft.field === "title"
              ? `위젯 제목 번역은 ${MAX_MENU_WIDGET_TITLE_LENGTH}자 이하로 입력해주세요.`
              : `위젯 내용 번역은 ${MAX_MENU_WIDGET_DESCRIPTION_LENGTH}자 이하로 입력해주세요.`
            : draft.field === "badge_text"
              ? `특가세일 배지 문구 번역은 ${TIME_SALE_BADGE_TEXT_MAX_LENGTH}자 이하로 입력해주세요.`
              : `특가세일 시간 표시 문구 번역은 ${TIME_SALE_DISPLAY_TEXT_MAX_LENGTH}자 이하로 입력해주세요.`;
          redirectToTabEditWithError(menuId, "localization", message);
        }
      }

      const rowKey = `${draft.entityId}:${locale}`;
      const rows = groupedRows[draft.entityType];
      const existingRow = rows.get(rowKey) ?? {
        locale,
        source_text_hash: draft.sourceHash,
        status: "completed",
        updated_at: new Date().toISOString(),
      };
      rows.set(rowKey, existingRow);
      setEditableTranslationValue(existingRow, draft.field, getEditableTranslationText(draft.translations[locale]));
    });
  });

  const siteRows = [...groupedRows.site.values()].map((row) => ({ ...row, menu_site_id: menuId })) as MenuSiteTranslationInsert[];
  const pageRows = [...groupedRows.page.entries()].map(([key, row]) => ({ ...row, menu_page_id: key.split(":")[0] })) as MenuPageTranslationInsert[];
  const categoryRows = [...groupedRows.category.entries()].map(([key, row]) => ({ ...row, category_id: key.split(":")[0] })) as MenuCategoryTranslationInsert[];
  const itemRows = [...groupedRows.item.entries()].map(([key, row]) => ({ ...row, item_id: key.split(":")[0] })) as MenuItemTranslationInsert[];
  const promotionRows = [...groupedRows.promotion.entries()].map(([key, row]) => ({ ...row, menu_promotion_id: key.split(":")[0] })) as MenuPromotionTranslationInsert[];
  const widgetRows = [...groupedRows.widget.entries()].map(([key, row]) => ({ ...row, menu_widget_id: key.split(":")[0] })) as MenuWidgetTranslationInsert[];

  const [{ error: siteError }, { error: pageError }, { error: categoryError }, { error: itemError }, { error: promotionError }, { error: widgetError }] = await Promise.all([
    siteRows.length > 0
      ? supabase.from("menu_site_translations").upsert(siteRows, { onConflict: "menu_site_id,locale" })
      : Promise.resolve({ error: null }),
    pageRows.length > 0
      ? supabase.from("menu_page_translations").upsert(pageRows, { onConflict: "menu_page_id,locale" })
      : Promise.resolve({ error: null }),
    categoryRows.length > 0
      ? supabase.from("menu_category_translations").upsert(categoryRows, { onConflict: "category_id,locale" })
      : Promise.resolve({ error: null }),
    itemRows.length > 0
      ? supabase.from("menu_item_translations").upsert(itemRows, { onConflict: "item_id,locale" })
      : Promise.resolve({ error: null }),
    promotionRows.length > 0
      ? supabase.from("menu_promotion_translations").upsert(promotionRows, { onConflict: "menu_promotion_id,locale" })
      : Promise.resolve({ error: null }),
    widgetRows.length > 0
      ? supabase.from("menu_widget_translations").upsert(widgetRows, { onConflict: "menu_widget_id,locale" })
      : Promise.resolve({ error: null }),
  ]);
  const saveError = siteError ?? pageError ?? categoryError ?? itemError ?? promotionError ?? widgetError;

  if (saveError) {
    redirectToTabEditWithError(menuId, "localization", `${errorLabel} 중 오류가 발생했습니다: ${saveError.message}`);
  }
}

async function markTranslationRecoveryJobApplied({
  supabase,
  menuId,
  userId,
  jobId,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  userId: string;
  jobId: string | null;
}) {
  if (!jobId || !isUuid(jobId)) return;

  const appliedAt = new Date().toISOString();
  const { error } = await supabase
    .from("menu_translation_jobs")
    .update({
      applied_at: appliedAt,
      updated_at: appliedAt,
    })
    .eq("id", jobId)
    .eq("menu_site_id", menuId)
    .eq("requested_by", userId)
    .eq("status", "completed")
    .is("discarded_at", null);

  if (error) {
    redirectToTabEditWithError(menuId, "localization", `자동 번역 결과 적용 상태 저장에 실패했습니다: ${error.message}`);
  }
}

export async function updateLocalizationSettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const saveMode = getString(formData, "localization_save_mode") || "all";
  const translationRecoveryJobId = getString(formData, TRANSLATION_RECOVERY_JOB_ID_FIELD) || null;
  const requestedLocales = formData
    .getAll("enabled_locales")
    .filter((value): value is string => typeof value === "string")
    .filter(isSupportedLocale);

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const translationDraftValues = getTranslationDraftValues(formData);
  const currentSettings = getJsonObject(menuSite.settings);

  if (saveMode !== "languages") {
    await saveEditableTranslationDrafts(
      supabase,
      menuId,
      translationDraftValues,
      menuSite.template_key,
      saveMode === "translations" ? "번역 저장" : "다국어 저장"
    );
  }

  if (saveMode !== "translations") {
    const enabledLocales = [
      DEFAULT_LOCALE,
      ...TRANSLATABLE_LOCALES.filter((locale) => requestedLocales.includes(locale)),
    ] satisfies SupportedLocale[];
    const settings = {
      ...currentSettings,
      enabled_locales: enabledLocales,
    };

    const { error } = await supabase
      .from("menu_sites")
      .update({ settings, updated_at: new Date().toISOString() })
      .eq("id", menuId);

    if (error) {
      const errorLabel = saveMode === "languages" ? "언어 설정 저장" : "다국어 저장";
      redirectToTabEditWithError(menuId, "localization", `${errorLabel} 중 오류가 발생했습니다: ${error.message}`);
    }
  }

  if (saveMode !== "languages") {
    await markTranslationRecoveryJobApplied({
      supabase,
      menuId,
      userId: menuSite.user_id,
      jobId: translationRecoveryJobId,
    });
  }

  if (saveMode === "languages") {
    revalidateMenuPaths(menuId, menuSite.slug);
    redirectToTabEdit(menuId, "localization", "언어 설정이 저장되었습니다.");
  }

  if (saveMode === "translations") {
    revalidateMenuPaths(menuId, menuSite.slug);
    redirectToTabEdit(menuId, "localization", "번역 수정 내용이 저장되었습니다.");
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "localization", "다국어 설정과 번역 내용이 저장되었습니다.");
}

export async function generateMenuItemDescriptionAction(input: {
  menuId: string;
  itemId?: string | null;
  name: string;
  categoryName?: string | null;
  price?: string | null;
  priceLabel?: string | null;
  badgeLabel?: string | null;
  currentDescription?: string | null;
  templateKey?: string | null;
  serviceType?: string | null;
}): Promise<GenerateMenuItemDescriptionResult> {
  const menuId = input.menuId?.trim();
  const itemId = input.itemId?.trim() || null;
  const name = input.name?.trim();

  if (!menuId) {
    return { ok: false, message: "AI 설명 작성 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  if (!name) {
    return { ok: false, message: "메뉴명을 먼저 입력해주세요." };
  }

  try {
    const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
    const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);

    if (!getTemplateCapabilities(menuSite.template_key).itemDescription) {
      return { ok: false, message: "현재 템플릿에서는 아이템 설명을 사용하지 않습니다." };
    }

    if (itemId) {
      const { data: item, error: itemError } = await supabase
        .from("menu_items")
        .select("id")
        .eq("id", itemId)
        .eq("menu_site_id", menuId)
        .maybeSingle();

      if (itemError || !item) {
        return { ok: false, message: "AI 설명 작성 중 오류가 발생했습니다. 다시 시도해주세요." };
      }
    }

    const aiUsagePlanKey = normalizeMenuLinkPlanKey(productKey);
    const descriptionUsage = getAiUsage(menuSite.settings, aiUsagePlanKey, "ai_description");
    const hasDescriptionCredits = await hasEnoughAiCredits(menuId, 1);

    if (hasDescriptionCredits === false || (hasDescriptionCredits === null && isAiUsageExceeded(descriptionUsage))) {
      return {
        ok: false,
        message: "AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.",
        usage: { used: descriptionUsage.used, limit: descriptionUsage.limit },
      };
    }

    const description = await generateMenuItemDescriptionDraft({
      name,
      categoryName: input.categoryName,
      price: input.price,
      priceLabel: input.priceLabel,
      badgeLabel: input.badgeLabel,
      currentDescription: input.currentDescription,
      templateKey: input.templateKey ?? menuSite.template_key,
      serviceType: input.serviceType ?? getTemplateType(menuSite.template_key),
    });

    if (!description.trim()) {
      return {
        ok: false,
        message: "AI 설명 작성 중 오류가 발생했습니다. 다시 시도해주세요.",
        usage: { used: descriptionUsage.used, limit: descriptionUsage.limit },
      };
    }

    const normalizedCurrentDescription = normalizeAiDescriptionForComparison(input.currentDescription);
    const normalizedGeneratedDescription = normalizeAiDescriptionForComparison(description);

    if (!normalizedGeneratedDescription) {
      return {
        ok: false,
        message: "AI 설명 작성 중 오류가 발생했습니다. 다시 시도해주세요.",
        usage: { used: descriptionUsage.used, limit: descriptionUsage.limit },
      };
    }

    // TODO: 동일 결과가 반복될 때 "더 짧게/감성적으로/고급스럽게/담백하게" 같은 tone 옵션을 추가한다.
    if (normalizedCurrentDescription && normalizedCurrentDescription === normalizedGeneratedDescription) {
      return {
        ok: false,
        message: "기존 설명과 거의 동일한 결과입니다. 다른 문체로 다시 시도해보세요.",
        usage: { used: descriptionUsage.used, limit: descriptionUsage.limit },
      };
    }

    const usedAt = new Date();
    const creditSpend = await spendAiCredits({ userId: menuSite.user_id, menuSiteId: menuId, featureKey: "description_write" });
    const nextUsage = getAiUsageFromCreditSpend("ai_description", creditSpend.usedCredits, creditSpend.totalCredits, usedAt);

    return {
      ok: true,
      description: description.trim(),
      usage: { used: nextUsage.used, limit: nextUsage.limit },
      message: "AI 설명이 작성되었습니다. 수정 내용 반영 후 저장하면 공개 메뉴판에 반영됩니다.",
    };
  } catch (error) {
    console.error("[menu-ai] description generation failed", {
      menuId,
      itemId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, message: "AI 설명 작성 중 오류가 발생했습니다. 다시 시도해주세요." };
  }
}

export async function generateAiMenuCleanupAction(input: {
  menuId: string;
  rawText: string;
  templateKey?: string | null;
  serviceType?: string | null;
}): Promise<GenerateMenuCleanupActionResult> {
  const menuId = input.menuId?.trim();
  const rawText = input.rawText?.trim();

  if (!menuId) {
    return { ok: false, message: "AI 메뉴 정리 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  if (!rawText) {
    return { ok: false, message: "정리할 메뉴 내용을 입력해주세요." };
  }

  if (rawText.length < 8) {
    return { ok: false, message: "정리할 메뉴 내용을 조금 더 입력해주세요." };
  }

  if (rawText.length > 4000) {
    return { ok: false, message: "입력 내용이 너무 깁니다. 4,000자 이하로 입력해주세요." };
  }

  try {
    const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
    const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
    const aiUsagePlanKey = normalizeMenuLinkPlanKey(productKey);
    const cleanupUsage = getAiUsage(menuSite.settings, aiUsagePlanKey, "ai_menu_cleanup");
    const hasCleanupCredits = await hasEnoughAiCredits(menuId, 3);

    if (hasCleanupCredits === false || (hasCleanupCredits === null && isAiUsageExceeded(cleanupUsage))) {
      return {
        ok: false,
        message: "AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.",
        usage: { used: cleanupUsage.used, limit: cleanupUsage.limit },
      };
    }

    const data = await generateMenuCleanupStructure({
      rawText,
      templateKey: input.templateKey ?? menuSite.template_key,
      serviceType: input.serviceType ?? getTemplateType(menuSite.template_key),
    });

    const totalItemCount = data.categories.reduce((count, category) => count + category.items.length, 0);
    if (data.categories.length === 0 || totalItemCount === 0) {
      return {
        ok: false,
        message: "AI 메뉴 정리 중 오류가 발생했습니다. 다시 시도해주세요.",
        usage: { used: cleanupUsage.used, limit: cleanupUsage.limit },
      };
    }

    const usedAt = new Date();
    const creditSpend = await spendAiCredits({ userId: menuSite.user_id, menuSiteId: menuId, featureKey: "menu_cleanup" });
    const nextUsage = getAiUsageFromCreditSpend("ai_menu_cleanup", creditSpend.usedCredits, creditSpend.totalCredits, usedAt);

    return {
      ok: true,
      data,
      usage: { used: nextUsage.used, limit: nextUsage.limit },
      message: "AI가 메뉴를 정리했습니다. 결과를 확인한 뒤 메뉴 관리에 임시 추가하세요.",
    };
  } catch (error) {
    console.error("[menu-ai] menu cleanup failed", {
      menuId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, message: "AI 메뉴 정리 중 오류가 발생했습니다. 다시 시도해주세요." };
  }
}

export async function translateMenuItemPartialAction(input: {
  menuId: string;
  itemId: string;
  targetLocale: EditableTranslationLocale;
}): Promise<PartialTranslationActionResult> {
  const menuId = input.menuId?.trim();
  const itemId = input.itemId?.trim();
  const targetLocale = input.targetLocale;

  if (!menuId || !itemId || !isTargetTranslationLocale(targetLocale)) {
    return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  try {
    const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
    const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
    const aiUsagePlanKey = normalizeMenuLinkPlanKey(productKey);
    const partialUsage = getAiUsage(menuSite.settings, aiUsagePlanKey, "ai_translate_partial");
    const hasPartialCredits = await hasEnoughAiCredits(menuId, 1);

    if (hasPartialCredits === false || (hasPartialCredits === null && isAiUsageExceeded(partialUsage))) {
      return {
        ok: false,
        message: "AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const { data: item, error: itemError } = await supabase
      .from("menu_items")
      .select("id, menu_site_id, category_id, name, set_name, description, price_label, portion_label, badge_label")
      .eq("id", itemId)
      .eq("menu_site_id", menuId)
      .maybeSingle();

    if (itemError || !item) {
      return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
    }

    const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
    const supportsItemBadges = templateCapabilities.itemBadges;
    const { data: category } = item.category_id
      ? await supabase.from("menu_categories").select("name").eq("id", item.category_id).eq("menu_site_id", menuId).maybeSingle()
      : { data: null };
    const sourceFields = {
      name: item.name,
      set_name: menuSite.template_key === "display_menu_a" ? item.set_name : null,
      description: templateCapabilities.itemDescription ? item.description : null,
      price_label: item.price_label,
      portion_label: templateCapabilities.itemPortionLabel ? item.portion_label : null,
      badge_label: supportsItemBadges ? item.badge_label : null,
    };
    const hasTranslatableText = Object.values(sourceFields).some(hasMeaningfulTranslationText);

    if (!hasTranslatableText) {
      return {
        ok: false,
        message: "번역할 내용이 없습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const translatedFields = await translatePartialMenuItemFields(targetLocale, {
      ...sourceFields,
      categoryName: category?.name ?? null,
      restaurantName: menuSite.restaurant_category ?? null,
    });

    const meaningfulTranslatedFields = getMeaningfulTranslatedFields(translatedFields);

    if (Object.keys(meaningfulTranslatedFields).length === 0) {
      return {
        ok: false,
        message: "번역 결과가 비어 있어 기존 번역을 변경하지 않았습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const usedAt = new Date();
    const creditSpend = await spendAiCredits({ userId: menuSite.user_id, menuSiteId: menuId, featureKey: "partial_translation" });
    const nextUsage = getAiUsageFromCreditSpend("ai_translate_partial", creditSpend.usedCredits, creditSpend.totalCredits, usedAt);

    return {
      ok: true,
      data: meaningfulTranslatedFields,
      usage: { used: nextUsage.used, limit: nextUsage.limit },
      message: "선택한 메뉴 아이템 번역이 생성되었습니다. 저장 후 공개 메뉴판에 반영됩니다.",
    };
  } catch (error) {
    console.error("[menu-translation] partial item translation failed", {
      menuId,
      itemId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
  }
}

export async function translateMenuCategoryPartialAction(input: {
  menuId: string;
  categoryId: string;
  targetLocale: EditableTranslationLocale;
}): Promise<PartialTranslationActionResult> {
  const menuId = input.menuId?.trim();
  const categoryId = input.categoryId?.trim();
  const targetLocale = input.targetLocale;

  if (!menuId || !categoryId || !isTargetTranslationLocale(targetLocale)) {
    return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  try {
    const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
    const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
    const aiUsagePlanKey = normalizeMenuLinkPlanKey(productKey);
    const partialUsage = getAiUsage(menuSite.settings, aiUsagePlanKey, "ai_translate_partial");
    const hasPartialCredits = await hasEnoughAiCredits(menuId, 1);

    if (hasPartialCredits === false || (hasPartialCredits === null && isAiUsageExceeded(partialUsage))) {
      return {
        ok: false,
        message: "AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const { data: category, error: categoryError } = await supabase
      .from("menu_categories")
      .select("id, menu_site_id, name, description, description_visible")
      .eq("id", categoryId)
      .eq("menu_site_id", menuId)
      .maybeSingle();

    if (categoryError || !category) {
      return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
    }

    const supportsCategoryDescription = getTemplateCapabilities(menuSite.template_key).categoryDescription;
    const sourceFields = {
      name: category.name,
      description: supportsCategoryDescription && category.description_visible ? category.description : null,
    };
    const hasTranslatableText = Object.values(sourceFields).some(hasMeaningfulTranslationText);

    if (!hasTranslatableText) {
      return {
        ok: false,
        message: "번역할 내용이 없습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const translatedFields = await translatePartialMenuCategoryFields(targetLocale, {
      ...sourceFields,
      restaurantName: menuSite.restaurant_category ?? null,
    });

    const meaningfulTranslatedFields = getMeaningfulTranslatedFields(translatedFields);

    if (Object.keys(meaningfulTranslatedFields).length === 0) {
      return {
        ok: false,
        message: "번역 결과가 비어 있어 기존 번역을 변경하지 않았습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const usedAt = new Date();
    const creditSpend = await spendAiCredits({ userId: menuSite.user_id, menuSiteId: menuId, featureKey: "partial_translation" });
    const nextUsage = getAiUsageFromCreditSpend("ai_translate_partial", creditSpend.usedCredits, creditSpend.totalCredits, usedAt);

    return {
      ok: true,
      data: meaningfulTranslatedFields,
      usage: { used: nextUsage.used, limit: nextUsage.limit },
      message: "선택한 카테고리 번역이 생성되었습니다. 저장 후 공개 메뉴판에 반영됩니다.",
    };
  } catch (error) {
    console.error("[menu-translation] partial category translation failed", {
      menuId,
      categoryId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
  }
}

export async function translateMenuHeroPartialAction(input: {
  menuId: string;
  targetLocale: EditableTranslationLocale;
}): Promise<PartialTranslationActionResult> {
  const menuId = input.menuId?.trim();
  const targetLocale = input.targetLocale;

  if (!menuId || !isTargetTranslationLocale(targetLocale)) {
    return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  try {
    const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
    const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
    const aiUsagePlanKey = normalizeMenuLinkPlanKey(productKey);
    const partialUsage = getAiUsage(menuSite.settings, aiUsagePlanKey, "ai_translate_partial");
    const hasPartialCredits = await hasEnoughAiCredits(menuId, 1);

    if (hasPartialCredits === false || (hasPartialCredits === null && isAiUsageExceeded(partialUsage))) {
      return {
        ok: false,
        message: "AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const { data: site, error: siteError } = await supabase
      .from("menu_sites")
      .select("id, restaurant_name, restaurant_category, restaurant_address, restaurant_phone, brand_description, menu_cover_label, menu_cover_title, menu_cover_description, opening_hours, settings, template_key")
      .eq("id", menuId)
      .maybeSingle();

    if (siteError || !site) {
      return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
    }

    const menuCoverCapabilities = getTemplateCapabilities(site.template_key).menuCover;
    const templateCapabilities = getTemplateCapabilities(site.template_key);
    const settings = getJsonObject(site.settings);
    const hasFooterNotice1 = Object.prototype.hasOwnProperty.call(settings, "footer_notice_1");
    const hasFooterNotice2 = Object.prototype.hasOwnProperty.call(settings, "footer_notice_2");
    const hasFooterNotice3 = Object.prototype.hasOwnProperty.call(settings, "footer_notice_3");
    // Basic/CafeA footer notice translation compatibility mapping:
    // footer_notice_1/2/3 reuse opening_hours/address/phone translation columns to avoid a schema change.
    const footerNotice1 = hasFooterNotice1 ? getJsonString(settings.footer_notice_1) : site.opening_hours ?? "";
    const footerNotice2 = hasFooterNotice2 ? getJsonString(settings.footer_notice_2) : site.restaurant_address ?? "";
    const footerNotice3 = hasFooterNotice3
      ? getJsonString(settings.footer_notice_3)
      : getJsonString(settings.footer_sns_text) || getJsonString(settings.footer_note);
    const sourceFields = {
      restaurant_name: site.template_key === "display_menu_a" ? site.restaurant_name : menuCoverCapabilities.usesStoreName ? site.restaurant_name : null,
      brand_description: menuCoverCapabilities.usesStoreDescription ? site.brand_description : null,
      menu_cover_label: menuCoverCapabilities.usesCoverLabel ? site.menu_cover_label : null,
      menu_cover_title: menuCoverCapabilities.usesCoverTitle ? site.menu_cover_title : null,
      menu_cover_description: menuCoverCapabilities.usesCoverDescription ? site.menu_cover_description : null,
      opening_hours: templateCapabilities.footerStoreInfo ? footerNotice1 : null,
      restaurant_address: templateCapabilities.footerStoreInfo ? footerNotice2 : null,
      restaurant_phone: templateCapabilities.footerStoreInfo ? footerNotice3 : null,
    };
    const hasTranslatableText = Object.values(sourceFields).some(hasMeaningfulTranslationText);

    if (!hasTranslatableText) {
      return {
        ok: false,
        message: "번역할 내용이 없습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const translatedFields = await translatePartialMenuHeroFields(targetLocale, {
      ...sourceFields,
      restaurantCategory: site.restaurant_category ?? null,
    });

    const meaningfulTranslatedFields = getMeaningfulTranslatedFields(translatedFields);

    if (Object.keys(meaningfulTranslatedFields).length === 0) {
      return {
        ok: false,
        message: "번역 결과가 비어 있어 기존 번역을 변경하지 않았습니다.",
        usage: { used: partialUsage.used, limit: partialUsage.limit },
      };
    }

    const usedAt = new Date();
    const creditSpend = await spendAiCredits({ userId: menuSite.user_id, menuSiteId: menuId, featureKey: "partial_translation" });
    const nextUsage = getAiUsageFromCreditSpend("ai_translate_partial", creditSpend.usedCredits, creditSpend.totalCredits, usedAt);

    return {
      ok: true,
      data: meaningfulTranslatedFields,
      usage: { used: nextUsage.used, limit: nextUsage.limit },
      message: "커버 이미지 번역이 생성되었습니다. 저장 후 공개 메뉴판에 반영됩니다.",
    };
  } catch (error) {
    console.error("[menu-translation] partial hero translation failed", {
      menuId,
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, message: "부분 자동 번역 중 오류가 발생했습니다. 다시 시도해주세요." };
  }
}

export async function resetTypographySettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const settings = getJsonObject(menuSite.settings);
  const pageSettings = getJsonObject(menuSite.page_settings);
  const designSettings = getJsonObject(pageSettings.design);

  delete settings.typography;
  delete pageSettings.typography;
  delete pageSettings.koreanFont;
  delete pageSettings.englishFont;
  delete pageSettings.typographyRoles;
  delete pageSettings.typography_roles;
  delete designSettings.koreanFont;
  delete designSettings.englishFont;
  delete designSettings.fontSizeScale;
  delete designSettings.typographyRoles;
  delete designSettings.typography_roles;
  if (Object.keys(designSettings).length > 0) {
    pageSettings.design = designSettings;
  } else {
    delete pageSettings.design;
  }

  const { error } = await supabase
    .from("menu_sites")
    .update({ settings, page_settings: pageSettings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `폰트 기본값 복원에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "현재 템플릿의 기본 폰트로 되돌렸습니다.");
}

export async function updateDesignSettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const backgroundColor = normalizeBackgroundColor(getString(formData, "background_color"));
  const koreanFontKey = getString(formData, "korean_font_key");
  const englishFontKey = getString(formData, "english_font_key");
  const rawFontSizeScaleKey = getString(formData, "font_size_scale_key") || "m";

  if (!backgroundColor) {
    redirectToTabEditWithError(menuId, "design", "배경색은 #RRGGBB 형식으로 입력해주세요.");
  }

  if (koreanFontKey && !isKoreanFontValue(koreanFontKey)) {
    redirectToTabEditWithError(menuId, "design", "한글 폰트 선택값이 올바르지 않습니다.");
  }

  if (englishFontKey && !isEnglishFontValue(englishFontKey)) {
    redirectToTabEditWithError(menuId, "design", "영문/숫자 폰트 선택값이 올바르지 않습니다.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const fontSizeScaleKey = normalizeFontSizeScaleKeyForTemplate(rawFontSizeScaleKey, menuSite.template_key);
  const typographyRoleSettings = getTypographyRoleSettingsFromFormData(formData, menuSite.template_key);
  const pageSettings = getJsonObject(menuSite.page_settings);
  const designSettings = getJsonObject(pageSettings.design);

  designSettings.backgroundColor = backgroundColor;

  if (koreanFontKey) {
    designSettings.koreanFont = koreanFontKey;
  } else {
    delete designSettings.koreanFont;
  }

  if (englishFontKey) {
    designSettings.englishFont = englishFontKey;
  } else {
    delete designSettings.englishFont;
  }

  if (menuSite.template_key !== "cafe_design_a" && menuSite.template_key !== "cafe_mocha_forest_a" && menuSite.template_key !== "cafe_sunday_line_a" && menuSite.template_key !== "cafe_round_focus_a") {
    designSettings.fontSizeScale = fontSizeScaleKey;
  }
  setDesignTypographyRoleSettings(designSettings, typographyRoleSettings, menuSite.template_key);
  delete designSettings.onePageLayoutShell;
  delete designSettings.one_page_layout_shell;

  pageSettings.design = designSettings;
  delete pageSettings.backgroundColor;
  delete pageSettings.koreanFont;
  delete pageSettings.englishFont;
  delete pageSettings.fontSizeScale;
  delete pageSettings.typographyRoles;
  delete pageSettings.typography_roles;
  delete pageSettings.onePageLayoutShell;
  delete pageSettings.one_page_layout_shell;

  const { error } = await supabase
    .from("menu_sites")
    .update({ page_settings: pageSettings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `디자인 설정 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "디자인 설정이 저장되었습니다.");
}

export async function resetMenuCoverToPresetAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const preset = getStarterPreset(menuSite.template_key, menuSite.restaurant_category, menuSite.template_category);
  const { data: visibleItems, error: visibleItemsError } = await supabase
    .from("menu_items")
    .select("id, name, image_url, recommended, sort_order, visible")
    .eq("menu_site_id", menuId)
    .eq("visible", true)
    .order("sort_order", { ascending: true });

  if (visibleItemsError) {
    redirectToTabEditWithError(menuId, "cover", `대표 추천 메뉴 확인에 실패했습니다: ${visibleItemsError.message}`);
  }

  const starterFeaturedSlides = resolveStarterFeaturedSlides(preset, visibleItems ?? []);
  const firstCompleteStarterFeaturedSlide = getFirstCompleteStarterFeaturedSlide(starterFeaturedSlides);
  const featuredItemId =
    firstCompleteStarterFeaturedSlide?.featured_item_id ??
    (preset.featured_item_name ? (visibleItems ?? []).find((item) => item.name === preset.featured_item_name)?.id ?? null : null) ??
    (visibleItems ?? []).find((item) => item.recommended === true && Boolean(item.image_url))?.id ??
    (visibleItems ?? []).find((item) => item.recommended === true)?.id ??
    null;

  const nextPageSettings = {
    ...getJsonObject(menuSite.page_settings),
    cover_image_visible: true,
    featured_item_enabled: Boolean(featuredItemId),
    featured_item_id: featuredItemId,
    ...(preset.featured_slides ? { [FEATURED_SLIDES_PAGE_SETTINGS_KEY]: starterFeaturedSlides } : {}),
  };

  const { error } = await supabase
    .from("menu_sites")
    .update({
      menu_cover_title: preset.site.menu_cover_title,
      menu_cover_description: preset.site.menu_cover_description,
      cover_image_url: firstCompleteStarterFeaturedSlide?.image_url ?? preset.site.cover_image_url,
      cover_image_path: firstCompleteStarterFeaturedSlide?.image_path ?? null,
      page_settings: nextPageSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "cover", `커버 이미지 초기화에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(
    menuId,
    "cover",
    featuredItemId
      ? "커버 이미지 설정을 샘플 상태로 되돌렸습니다."
      : "커버 이미지 설정을 샘플 상태로 되돌렸습니다. 대표 추천 메뉴는 현재 메뉴 목록에서 찾을 수 없어 선택 해제되었습니다."
  );
}

export async function resetMenuManagementToPresetAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  await requireOwnedMenuSite(menuId);
  redirectToMenuEditWithError(menuId, "샘플 복원 기능은 안전한 draft 저장 구조 적용 후 사용할 수 있습니다. 현재 데이터 보호를 위해 비활성화되어 있습니다.");
}

export async function restoreEmptyMenuManagementFromStarterPresetAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const preset = getStarterPreset(menuSite.template_key, menuSite.restaurant_category, menuSite.template_category);
  const presetCategoryCount = preset.pages.reduce((count, page) => count + page.categories.length, 0);
  const presetItemCount = preset.pages.reduce(
    (count, page) => count + page.categories.reduce((categoryCount, category) => categoryCount + category.items.length, 0),
    0
  );

  if (preset.pages.length === 0 || presetCategoryCount === 0 || presetItemCount === 0) {
    redirectToMenuEditWithError(menuId, "이 템플릿의 기본 샘플 데이터를 찾을 수 없습니다.");
  }

  const [{ count: pageCount, error: pageCountError }, { count: categoryCount, error: categoryCountError }, { count: itemCount, error: itemCountError }] =
    await Promise.all([
      supabase.from("menu_pages").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
      supabase.from("menu_categories").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
      supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
    ]);

  if (pageCountError) redirectToMenuEditWithError(menuId, `페이지 상태 확인에 실패했습니다: ${pageCountError.message}`);
  if (categoryCountError) redirectToMenuEditWithError(menuId, `카테고리 상태 확인에 실패했습니다: ${categoryCountError.message}`);
  if (itemCountError) redirectToMenuEditWithError(menuId, `아이템 상태 확인에 실패했습니다: ${itemCountError.message}`);

  if ((pageCount ?? 0) > 0 || (categoryCount ?? 0) > 0 || (itemCount ?? 0) > 0) {
    redirectToMenuEditWithError(menuId, "복구 action은 메뉴 데이터가 비어 있을 때만 실행할 수 있습니다. 기존 데이터가 있는 경우 아무것도 변경하지 않았습니다.");
  }

  try {
    await createStarterMenuData(
      supabase,
      menuId,
      menuSite.template_key,
      menuSite.restaurant_category,
      menuSite.template_category,
      null,
      {
        force: false,
        applySiteDefaults: false,
        includeAuxiliaryContent: false,
      }
    );
  } catch (error) {
    redirectToMenuEditWithError(menuId, error instanceof Error ? error.message : "샘플 메뉴 복구에 실패했습니다.");
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "템플릿 기본 샘플 메뉴를 복구했습니다.");
}

export async function resetDesignSettingsToTemplateDefaultAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const settings = getJsonObject(menuSite.settings);
  const pageSettings = getJsonObject(menuSite.page_settings);

  delete settings.badge_styles;
  delete settings.typography;
  delete pageSettings.badge_styles;
  delete pageSettings.typography;
  const designSettings = getJsonObject(pageSettings.design);
  delete designSettings.backgroundColor;
  delete designSettings.koreanFont;
  delete designSettings.englishFont;
  delete designSettings.fontSizeScale;
  delete designSettings.typographyRoles;
  delete designSettings.typography_roles;
  delete designSettings.onePageLayoutShell;
  delete designSettings.one_page_layout_shell;
  if (Object.keys(designSettings).length > 0) {
    pageSettings.design = designSettings;
  } else {
    delete pageSettings.design;
  }
  delete pageSettings.backgroundColor;
  delete pageSettings.koreanFont;
  delete pageSettings.englishFont;
  delete pageSettings.fontSizeScale;
  delete pageSettings.typographyRoles;
  delete pageSettings.typography_roles;
  delete pageSettings.onePageLayoutShell;
  delete pageSettings.one_page_layout_shell;

  const { error } = await supabase
    .from("menu_sites")
    .update({
      settings,
      page_settings: pageSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `디자인 설정 초기화에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "디자인 설정을 현재 템플릿의 기본값으로 되돌렸습니다.");
}

async function assertCategoryBelongsToMenuSite(menuId: string, categoryId: string) {
  const supabase = await createClient();
  const { data: category, error } = await supabase
    .from("menu_categories")
    .select("id, section_key, menu_page_id")
    .eq("id", categoryId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (error) {
    redirectToEditWithError(menuId, `메뉴 카테고리 확인에 실패했습니다: ${error.message}`);
  }

  if (!category) {
    redirectToEditWithError(menuId, "해당 메뉴 카테고리를 찾을 수 없습니다.");
  }

  return category;
}

async function assertMenuPageBelongsToMenuSite(menuId: string, menuPageId: string) {
  const supabase = await createClient();
  const { data: menuPage, error } = await supabase
    .from("menu_pages")
    .select("id, legacy_section_key")
    .eq("id", menuPageId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (error) {
    redirectToEditWithError(menuId, `메뉴 페이지 확인에 실패했습니다: ${error.message}`);
  }

  if (!menuPage) {
    redirectToEditWithError(menuId, "해당 메뉴 페이지를 찾을 수 없습니다.");
  }

  return menuPage;
}

async function assertItemBelongsToMenuSite(menuId: string, itemId: string) {
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("menu_items")
    .select("id, menu_site_id, image_path")
    .eq("id", itemId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (error) {
    redirectToEditWithError(menuId, `메뉴 확인에 실패했습니다: ${error.message}`);
  }

  if (!item) {
    redirectToEditWithError(menuId, "해당 메뉴 아이템을 찾을 수 없습니다.");
  }

  return item;
}

async function assertChefBelongsToMenuSite(menuId: string, chefId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("menu_chefs").select("id, chef_image_path").eq("id", chefId).eq("menu_site_id", menuId).maybeSingle();

  if (error) redirectToTabEditWithError(menuId, "about", `셰프/인물 확인에 실패했습니다: ${error.message}`);
  if (!data) redirectToTabEditWithError(menuId, "about", "해당 셰프/인물 정보를 찾을 수 없습니다.");

  return data;
}

async function assertEventBelongsToMenuSite(menuId: string, eventId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("menu_events").select("id, event_image_path").eq("id", eventId).eq("menu_site_id", menuId).maybeSingle();

  if (error) redirectToTabEditWithError(menuId, "events", `이벤트 확인에 실패했습니다: ${error.message}`);
  if (!data) redirectToTabEditWithError(menuId, "events", "해당 이벤트를 찾을 수 없습니다.");

  return data;
}

async function assertSocialLinkBelongsToMenuSite(menuId: string, socialLinkId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("menu_social_links").select("id").eq("id", socialLinkId).eq("menu_site_id", menuId).maybeSingle();

  if (error) redirectToTabEditWithError(menuId, "about", `SNS 링크 확인에 실패했습니다: ${error.message}`);
  if (!data) redirectToTabEditWithError(menuId, "about", "해당 SNS 링크를 찾을 수 없습니다.");
}

async function assertTraitBelongsToMenuSite(menuId: string, traitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("menu_item_traits").select("id").eq("id", traitId).eq("menu_site_id", menuId).maybeSingle();

  if (error) redirectToEditWithError(menuId, `맛/특징 지표 확인에 실패했습니다: ${error.message}`);
  if (!data) redirectToEditWithError(menuId, "해당 맛/특징 지표를 찾을 수 없습니다.");
}

async function assertPriceOptionBelongsToMenuSite(menuId: string, priceOptionId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_item_price_options")
    .select("id")
    .eq("id", priceOptionId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (error) redirectToEditWithError(menuId, `가격 옵션 확인에 실패했습니다: ${error.message}`);
  if (!data) redirectToEditWithError(menuId, "해당 가격 옵션을 찾을 수 없습니다.");
}

export async function createMenuSiteAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/menus/new");
  }

  const name = getString(formData, "name");
  const rawSlug = getString(formData, "slug");
  const templateKey = getString(formData, "template_key");
  const rawTemplateCategory = getString(formData, "template_category");
  const templateCategory = isTemplateCategoryKey(rawTemplateCategory)
    ? rawTemplateCategory
    : getTemplateCategoryFromKey(templateKey);
  const slug = normalizeSlug(rawSlug);

  if (!name) {
    redirectWithError("메뉴판 이름을 입력해주세요.");
  }

  if (name.length > MENU_FIELD_LIMITS.menuSites.name) {
    redirectWithError(`메뉴판 이름은 최대 ${MENU_FIELD_LIMITS.menuSites.name}자까지 입력 가능합니다.`);
  }

  if (!slug) {
    redirectWithError("공개 메뉴판 주소를 입력해주세요. 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }

  if (!isValidSlug(slug)) {
    redirectWithError(
      `공개 메뉴판 주소는 영문 소문자, 숫자, 하이픈으로 ${MENU_FIELD_LIMITS.menuSites.slugMin}자 이상 ${MENU_FIELD_LIMITS.menuSites.slugMax}자 이하로 입력해주세요.`
    );
  }

  if (!isTemplateKey(templateKey)) {
    redirectWithError("템플릿을 선택해주세요.");
  }

  if (!isTemplateSupportedForService(templateKey, "basic")) {
    redirectWithError("Basic에서 사용할 수 있는 템플릿만 선택해주세요.");
  }

  if (!templateCategory) {
    redirectWithError("템플릿 카테고리를 선택해주세요.");
  }

  const adminSupabase = createAdminClient();
  const basicMenuLimitState = await getBasicMenuSiteLimitState({
    adminSupabase,
    userId: user.id,
  });
  const activeBasicSubscription = basicMenuLimitState.activeBasicSubscription;

  if (!activeBasicSubscription) {
    redirectWithError("이용 중인 Basic 구독이 있어야 새 메뉴판을 추가할 수 있습니다.");
  }

  if (!basicMenuLimitState.canCreate) {
    redirectWithError("Basic 메뉴판은 한 구독당 최대 3개까지 만들 수 있습니다.");
  }

  const accessStartsAt = activeBasicSubscription.current_period_start ?? new Date().toISOString();
  const accessExpiresAt = activeBasicSubscription.current_period_end ?? activeBasicSubscription.next_billing_at;

  if (!accessExpiresAt) {
    redirectWithError("구독 이용 기간을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
  }

  const { data: existingSite, error: duplicateCheckError } = await supabase
    .from("menu_sites")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (duplicateCheckError) {
    redirectWithError(`공개 메뉴판 주소 중복 확인 중 오류가 발생했습니다: ${duplicateCheckError.message}`);
  }

  if (existingSite) {
    redirectWithError("이미 사용 중인 공개 메뉴판 주소입니다. 다른 주소를 입력해주세요.");
  }

  const status: MenuSiteStatus = "draft";

  const menuSiteInsert: Database["public"]["Tables"]["menu_sites"]["Insert"] = {
    user_id: user.id,
    name,
    slug,
    template_key: templateKey,
    template_category: templateCategory,
    status,
    settings: {
      source: "basic_subscription_additional_menu_site",
      product_key: activeBasicSubscription.product_key,
      plan_type: "business_basic",
      payment_type: "subscription",
      billing_cycle: activeBasicSubscription.billing_cycle,
      subscription_id: activeBasicSubscription.id,
      access_starts_at: accessStartsAt,
      access_expires_at: accessExpiresAt,
      current_period_start: activeBasicSubscription.current_period_start,
      current_period_end: activeBasicSubscription.current_period_end,
      next_billing_at: activeBasicSubscription.next_billing_at,
      auto_renewal: true,
      basic_menu_site_limit: basicMenuLimitState.limit,
    },
  };

  let { data: createdSite, error } = await supabase.from("menu_sites").insert(menuSiteInsert).select("id").single();

  if (error && error.message.toLowerCase().includes("template_category")) {
    const fallbackInsert: LooseInsert = {
      user_id: user.id,
      name,
      slug,
      template_key: templateKey,
      status,
    };
    const fallbackResult = await supabase.from("menu_sites").insert(fallbackInsert as never).select("id").single();
    createdSite = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    redirectWithError(`메뉴판 생성에 실패했습니다: ${error.message}`);
  }

  if (createdSite?.id) {
    await createStarterMenuData(supabase, createdSite.id, templateKey, null, templateCategory, activeBasicSubscription.product_key);

    const { error: entitlementError } = await adminSupabase.from("service_entitlements").insert({
      user_id: user.id,
      menu_site_id: createdSite.id,
      business_profile_id: activeBasicSubscription.business_profile_id,
      product_key: activeBasicSubscription.product_key,
      plan_key: "basic",
      plan_type: "business_basic",
      billing_type: "subscription",
      billing_cycle: activeBasicSubscription.billing_cycle,
      subscription_id: activeBasicSubscription.id,
      status: "active",
      access_starts_at: accessStartsAt,
      access_expires_at: accessExpiresAt,
      expired_at: null,
      data_retention_until: null,
      deleted_scheduled_at: null,
    });

    if (entitlementError) {
      redirectWithError(`메뉴판 권한 연결에 실패했습니다: ${entitlementError.message}`);
    }
  }

  revalidatePath("/mypage");
  redirect("/mypage?message=menu-created");
}

export async function updateMenuSiteAction(formData: FormData) {
  const menuId = getString(formData, "menuId");

  if (!menuId) {
    redirect("/mypage?error=missing-menu-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const name = getString(formData, "name");
  const restaurantName = getNullableString(formData, "restaurant_name");
  const hasBrandDescriptionField = formData.has("brand_description");
  const brandDescription = hasBrandDescriptionField ? getNullableString(formData, "brand_description") : menuSite.brand_description;
  const hasFooterNotice1Field = formData.has("footer_notice_1");
  const hasFooterNotice2Field = formData.has("footer_notice_2");
  const hasFooterNotice3Field = formData.has("footer_notice_3");
  const hasLogoReplacesNameField = formData.has("logo_replaces_name_present");
  const footerNotice1 = hasFooterNotice1Field ? getNullableString(formData, "footer_notice_1") : null;
  const footerNotice2 = hasFooterNotice2Field ? getNullableString(formData, "footer_notice_2") : null;
  const footerNotice3 = hasFooterNotice3Field ? getNullableString(formData, "footer_notice_3") : null;
  const logoReplacesName = getBoolean(formData, "logo_replaces_name");
  const shouldDeleteLogoImage = getBoolean(formData, "delete_logo_image");
  const draftLogoImageUrl = getNullableString(formData, "draft_logo_image_url");
  const draftLogoImagePath = getNullableString(formData, "draft_logo_image_path");
  const templateContentLimits = getTemplateContentLimits(menuSite.template_key);

  if (!name) {
    redirectToTabEditWithError(menuId, "basic", "메뉴판 이름을 입력해주세요.");
  }

  validateRequiredText(menuId, name, "메뉴판 이름", MENU_FIELD_LIMITS.menuSites.name, "basic");
  validateRequiredText(menuId, restaurantName ?? "", "실제 매장명", templateContentLimits.restaurantName, "basic");
  if (hasBrandDescriptionField) {
    validateOptionalText(menuId, brandDescription, "매장 설명", templateContentLimits.brandDescription, "basic");
  }
  if (hasFooterNotice1Field) {
    validateOptionalText(menuId, footerNotice1, "안내사항 1", templateContentLimits.footerNotice, "basic");
  }
  if (hasFooterNotice2Field) {
    validateOptionalText(menuId, footerNotice2, "안내사항 2", templateContentLimits.footerNotice, "basic");
  }
  if (hasFooterNotice3Field) {
    validateOptionalText(menuId, footerNotice3, "안내사항 3", templateContentLimits.footerNotice, "basic");
  }

  const updatePayload: MenuSiteUpdate = {
    name,
    restaurant_name: restaurantName,
    updated_at: new Date().toISOString(),
  };
  if (hasBrandDescriptionField) updatePayload.brand_description = brandDescription;
  if (hasLogoReplacesNameField || hasFooterNotice1Field || hasFooterNotice2Field || hasFooterNotice3Field) {
    const settings = getJsonObject(menuSite.settings);
    if (hasLogoReplacesNameField) {
      settings.logo_replaces_name = logoReplacesName;
    }
    if (hasFooterNotice1Field) {
      settings.footer_notice_1 = footerNotice1;
    }
    if (hasFooterNotice2Field) {
      settings.footer_notice_2 = footerNotice2;
    }
    if (hasFooterNotice3Field) {
      settings.footer_notice_3 = footerNotice3;
    }
    updatePayload.settings = settings;
  }

  if (shouldDeleteLogoImage) {
    updatePayload.logo_url = null;
    updatePayload.logo_path = null;
  } else if (draftLogoImageUrl && draftLogoImagePath) {
    updatePayload.logo_url = draftLogoImageUrl;
    updatePayload.logo_path = draftLogoImagePath;
  }

  let { error } = await supabase.from("menu_sites").update(updatePayload).eq("id", menuId);

  if (error && error.message.toLowerCase().includes("restaurant_type")) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .update({
        name,
        restaurant_name: restaurantName,
        ...(hasBrandDescriptionField ? { brand_description: brandDescription } : {}),
        ...(updatePayload.settings ? { settings: updatePayload.settings } : {}),
        ...(shouldDeleteLogoImage
          ? { logo_url: null, logo_path: null }
          : draftLogoImageUrl && draftLogoImagePath
          ? { logo_url: draftLogoImageUrl, logo_path: draftLogoImagePath }
          : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", menuId);

    error = fallbackResult.error;
  }

  if (error) {
    redirectToTabEditWithError(menuId, "basic", `메뉴판 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "basic", "기본 정보가 저장되었습니다.");
}

export async function updatePageSettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const pageSettingsRecord = getJsonObject(menuSite.page_settings);
  const currentSettings = mergePageSettings(menuSite.page_settings);
  const nextSettings = { ...pageSettingsRecord, ...currentSettings };
  const supportsMenuCover = getTemplateCapabilities(menuSite.template_key).menuCover.coverMode !== "none";

  for (const key of pageSettingKeys) {
    if (key === "menu_cover_enabled" && !supportsMenuCover) {
      continue;
    }
    nextSettings[key] = getBoolean(formData, key);
  }

  const { error } = await supabase
    .from("menu_sites")
    .update({ page_settings: nextSettings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "pages", `페이지 설정 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "pages", "페이지 설정이 저장되었습니다.");
}

export async function updateIntroAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const introTitle = getNullableString(formData, "intro_title");
  const introDescription = getNullableString(formData, "intro_description");
  const hasBrandDescriptionField = formData.has("brand_description");
  const brandDescription = hasBrandDescriptionField ? getNullableString(formData, "brand_description") : menuSite.brand_description;
  const shouldDeleteIntroImage = getBoolean(formData, "delete_intro_image");
  const draftIntroImageUrl = getNullableString(formData, "draft_intro_image_url");
  const draftIntroImagePath = getNullableString(formData, "draft_intro_image_path");
  const templateContentLimits = getTemplateContentLimits(menuSite.template_key);

  validateRequiredText(menuId, introTitle ?? "", "인트로 제목", MENU_FIELD_LIMITS.menuSites.introTitle, "intro");
  validateRequiredText(menuId, introDescription ?? "", "인트로 설명", MENU_FIELD_LIMITS.menuSites.introDescription, "intro");
  if (hasBrandDescriptionField) {
    validateOptionalText(menuId, brandDescription, "매장 설명", templateContentLimits.brandDescription, "intro");
  }

  const updatePayload: MenuSiteUpdate = {
    intro_title: introTitle,
    intro_description: introDescription,
    brand_description: brandDescription,
    updated_at: new Date().toISOString(),
  };

  if (shouldDeleteIntroImage) {
    updatePayload.intro_image_url = null;
    updatePayload.intro_image_path = null;
  } else if (draftIntroImageUrl && draftIntroImagePath) {
    updatePayload.intro_image_url = draftIntroImageUrl;
    updatePayload.intro_image_path = draftIntroImagePath;
  }

  const { error } = await supabase.from("menu_sites").update(updatePayload).eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "intro", `인트로 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "intro", "인트로가 저장되었습니다.");
}

export async function updateMenuCoverAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const hasMenuCoverLabelField = formData.has("menu_cover_label");
  const menuCoverLabel = hasMenuCoverLabelField ? getNullableString(formData, "menu_cover_label") : menuSite.menu_cover_label;
  const menuCoverCapabilities = getTemplateCapabilities(menuSite.template_key).menuCover;
  if (menuCoverCapabilities.coverMode === "none") {
    redirectToTabEditWithError(menuId, "basic", "현재 템플릿은 커버 이미지 기능을 지원하지 않습니다.");
  }
  const menuCoverEnabled = getBoolean(formData, "menu_cover_enabled");
  const menuCoverTitle = menuCoverCapabilities.usesCoverTitle ? getNullableString(formData, "menu_cover_title") : menuSite.menu_cover_title;
  const menuCoverDescription = menuCoverCapabilities.usesCoverDescription ? getNullableString(formData, "menu_cover_description") : menuSite.menu_cover_description;
  const shouldDeleteCoverImage = getBoolean(formData, "delete_cover_image");
  const draftCoverImageUrl = getNullableString(formData, "draft_cover_image_url");
  const draftCoverImagePath = getNullableString(formData, "draft_cover_image_path");
  const pageSettingsRecord = getJsonObject(menuSite.page_settings);
  const currentSettings = mergePageSettings(menuSite.page_settings);
  const supportsCoverImageVisibility = menuCoverCapabilities.usesCoverImage && menuCoverCapabilities.coverMode === "page";
  const coverImageVisible = supportsCoverImageVisibility
    ? getBoolean(formData, "cover_image_visible")
    : currentSettings.cover_image_visible !== false;
  const templateType = getTemplateType(menuSite.template_key);
  const canUseFeaturedItem = templateType === "menu" && menuCoverCapabilities.usesFeaturedItem;
  const canUseFeaturedSlides = canUseFeaturedItem && getTemplateCapabilities(menuSite.template_key).featuredItemCarousel === true;
  const featuredSlideMaxSlides = Math.max(1, Math.min(5, Math.trunc(getTemplateCapabilities(menuSite.template_key).featuredItemMaxSlides ?? 1)));
  const hasFeaturedSlidesPayload = formData.has("featured_slides");
  const wantsFeaturedItem = menuCoverEnabled && canUseFeaturedItem && getBoolean(formData, "featured_item_enabled");
  const requestedFeaturedItemId = menuCoverEnabled && canUseFeaturedItem ? getNullableString(formData, "featured_item_id") : null;
  const featuredItemEnabled = wantsFeaturedItem && Boolean(requestedFeaturedItemId);
  let featuredItemId: string | null = null;

  if (hasMenuCoverLabelField) {
    validateOptionalText(menuId, menuCoverLabel, "커버 이미지 라벨", MENU_FIELD_LIMITS.menuSites.menuCoverLabel, "cover");
  }
  if (hasFeaturedSlidesPayload && !canUseFeaturedSlides) {
    redirectToTabEditWithError(menuId, "cover", "현재 템플릿은 대표 슬라이드를 지원하지 않습니다.");
  }
  if (menuCoverEnabled && menuCoverCapabilities.usesCoverTitle) {
    validateRequiredText(menuId, menuCoverTitle ?? "", "커버 이미지 제목", MENU_FIELD_LIMITS.menuSites.menuCoverTitle, "cover");
  }
  if (menuCoverEnabled && menuCoverCapabilities.usesCoverDescription) {
    validateRequiredText(menuId, menuCoverDescription ?? "", "커버 이미지 설명", MENU_FIELD_LIMITS.menuSites.menuCoverDescription, "cover");
  }
  if (!hasFeaturedSlidesPayload && wantsFeaturedItem && !requestedFeaturedItemId) {
    redirectToTabEditWithError(menuId, "cover", "대표 추천 메뉴를 선택해주세요.");
  }

  if (hasFeaturedSlidesPayload && canUseFeaturedSlides) {
    const featuredSlides = parseFeaturedSlidesPayload(menuId, formData, featuredSlideMaxSlides);
    const validFeaturedItemIds = await getValidFeaturedItemIds(supabase, menuId, featuredSlides);
    const firstCompleteSlide = getFirstCompleteFeaturedSlide(featuredSlides, validFeaturedItemIds);
    const featuredSlidesEnabled = menuCoverEnabled && canUseFeaturedItem && getBoolean(formData, "featured_item_enabled");
    const nextSettings = {
      ...pageSettingsRecord,
      ...currentSettings,
      menu_cover_enabled: menuCoverEnabled,
      cover_image_visible: coverImageVisible,
      featured_item_enabled: featuredSlidesEnabled,
      featured_item_id: firstCompleteSlide?.featured_item_id ?? null,
      [FEATURED_SLIDES_PAGE_SETTINGS_KEY]: featuredSlides,
    };

    const updatePayload: MenuSiteUpdate = {
      menu_cover_title: menuCoverTitle,
      menu_cover_description: menuCoverDescription,
      cover_image_url: firstCompleteSlide?.image_url ?? null,
      cover_image_path: firstCompleteSlide?.image_path ?? null,
      page_settings: nextSettings,
      updated_at: new Date().toISOString(),
    };

    if (hasMenuCoverLabelField) {
      updatePayload.menu_cover_label = menuCoverLabel;
    }

    let { error } = await supabase.from("menu_sites").update(updatePayload).eq("id", menuId);

    if (error && error.message.toLowerCase().includes("menu_cover_label")) {
      const fallbackResult = await supabase
        .from("menu_sites")
        .update({
          menu_cover_title: menuCoverTitle,
          menu_cover_description: menuCoverDescription,
          cover_image_url: firstCompleteSlide?.image_url ?? null,
          cover_image_path: firstCompleteSlide?.image_path ?? null,
          page_settings: nextSettings,
          updated_at: new Date().toISOString(),
        })
        .eq("id", menuId);

      error = fallbackResult.error;
    }

    if (error) redirectToTabEditWithError(menuId, "cover", `커버 이미지 저장에 실패했습니다: ${error.message}`);

    revalidateMenuPaths(menuId, menuSite.slug);
    redirectToTabEdit(menuId, "cover", "커버 이미지 설정이 저장되었습니다.");
  }

  if (featuredItemEnabled && requestedFeaturedItemId) {
    const { data: featuredItem, error: featuredItemError } = await supabase
      .from("menu_items")
      .select("id")
      .eq("id", requestedFeaturedItemId)
      .eq("menu_site_id", menuId)
      .eq("visible", true)
      .maybeSingle();

    if (featuredItemError) {
      redirectToTabEditWithError(menuId, "cover", `대표 추천 메뉴 확인에 실패했습니다: ${featuredItemError.message}`);
    }

    if (!featuredItem) {
      redirectToTabEditWithError(menuId, "cover", "대표 추천 메뉴는 공개/활성 메뉴 중에서 선택해주세요.");
    }

    featuredItemId = featuredItem.id;
  }

  const nextSettings = menuCoverEnabled && canUseFeaturedItem
    ? {
        ...pageSettingsRecord,
        ...currentSettings,
        menu_cover_enabled: true,
        cover_image_visible: coverImageVisible,
        featured_item_enabled: featuredItemEnabled,
        featured_item_id: featuredItemEnabled ? featuredItemId : null,
      }
    : !menuCoverEnabled && canUseFeaturedItem
    ? {
        ...pageSettingsRecord,
        ...currentSettings,
        menu_cover_enabled: false,
        cover_image_visible: coverImageVisible,
      }
    : {
        ...pageSettingsRecord,
        ...currentSettings,
        menu_cover_enabled: menuCoverEnabled,
        cover_image_visible: coverImageVisible,
        featured_item_enabled: false,
        featured_item_id: null,
      };

  const updatePayload: MenuSiteUpdate = {
    menu_cover_title: menuCoverTitle,
    menu_cover_description: menuCoverDescription,
    page_settings: nextSettings,
    updated_at: new Date().toISOString(),
  };

  if (shouldDeleteCoverImage) {
    updatePayload.cover_image_url = null;
    updatePayload.cover_image_path = null;
  } else if (draftCoverImageUrl && (draftCoverImagePath || isPublicPresetImageUrl(draftCoverImageUrl))) {
    updatePayload.cover_image_url = draftCoverImageUrl;
    updatePayload.cover_image_path = draftCoverImagePath;
  }

  if (hasMenuCoverLabelField) {
    updatePayload.menu_cover_label = menuCoverLabel;
  }

  let { error } = await supabase.from("menu_sites").update(updatePayload).eq("id", menuId);

  if (error && error.message.toLowerCase().includes("menu_cover_label")) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .update({
        menu_cover_title: menuCoverTitle,
        menu_cover_description: menuCoverDescription,
        ...(shouldDeleteCoverImage
          ? { cover_image_url: null, cover_image_path: null }
          : draftCoverImageUrl && (draftCoverImagePath || isPublicPresetImageUrl(draftCoverImageUrl))
          ? { cover_image_url: draftCoverImageUrl, cover_image_path: draftCoverImagePath }
          : {}),
        page_settings: nextSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", menuId);

    error = fallbackResult.error;
  }

  if (error) redirectToTabEditWithError(menuId, "cover", `커버 이미지 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "cover", "커버 이미지 설정이 저장되었습니다.");
}

type AboutSocialLinkDraft = {
  id?: string;
  type?: string;
  label?: string;
  display_name?: string;
  url?: string;
  visible?: boolean;
  sort_order?: number;
  deleted?: boolean;
};

type AboutChefDraft = {
  id?: string;
  chef_name?: string;
  chef_role?: string;
  chef_description?: string;
  visible?: boolean;
  sort_order?: number;
  deleted?: boolean;
};

type AboutEventDraft = {
  id?: string;
  event_title?: string;
  event_subtitle?: string;
  event_description?: string;
  event_period?: string;
  event_benefit?: string;
  event_detail?: string;
  event_regular_price_label?: string;
  event_sale_price_label?: string;
  event_price_visible?: boolean;
  start_date?: string;
  end_date?: string;
  link_url?: string;
  visible?: boolean;
  sort_order?: number;
  deleted?: boolean;
};

function normalizeDraftNumber(value: unknown, fallback = 0) {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeDraftDate(value: unknown) {
  const dateValue = normalizeDraftString(value);
  return dateValue || null;
}

function isDraftDeleted(value: unknown) {
  return value === true;
}

async function syncAboutSocialLinks(supabase: SupabaseServerClient, menuId: string, drafts: AboutSocialLinkDraft[]) {
  const activeDrafts = drafts.filter((draft) => !isDraftDeleted(draft.deleted));
  if (activeDrafts.length > MENU_LIMITS.maxSocialLinksPerSite) {
    redirectToTabEditWithError(menuId, "about", `SNS 링크는 최대 ${MENU_LIMITS.maxSocialLinksPerSite}개까지 등록할 수 있습니다.`);
  }

  const usedTypes = new Set<string>();
  for (const draft of activeDrafts) {
    const type = normalizeDraftString(draft.type);
    const label = normalizeDraftString(draft.label);
    const displayName = normalizeDraftString(draft.display_name);
    const url = normalizeDraftString(draft.url);

    if (!isSocialLinkType(type)) redirectToTabEditWithError(menuId, "about", "SNS 종류를 선택해주세요.");
    if (usedTypes.has(type)) redirectToTabEditWithError(menuId, "about", "같은 SNS 종류는 한 번만 등록할 수 있습니다.");
    usedTypes.add(type);
    if (!label) redirectToTabEditWithError(menuId, "about", "SNS 화면 표시 라벨을 입력해주세요.");
    if (!displayName) redirectToTabEditWithError(menuId, "about", "SNS 아이디/표시명을 입력해주세요.");
    validateRequiredText(menuId, label, "SNS 화면 표시 라벨", MENU_FIELD_LIMITS.menuSocialLinks.label, "about");
    validateRequiredText(menuId, displayName, "SNS 아이디/표시명", MENU_FIELD_LIMITS.menuSocialLinks.displayName, "about");
    validateRequiredText(menuId, url, "SNS URL", MENU_FIELD_LIMITS.menuSocialLinks.url, "about");
    if (!/^https?:\/\//i.test(url)) redirectToTabEditWithError(menuId, "about", "SNS URL은 http:// 또는 https://로 시작해야 합니다.");
  }

  const { data: existingLinks, error: existingError } = await supabase
    .from("menu_social_links")
    .select("id")
    .eq("menu_site_id", menuId);

  if (existingError) redirectToTabEditWithError(menuId, "about", `SNS 링크 확인에 실패했습니다: ${existingError.message}`);

  const existingIds = new Set((existingLinks ?? []).map((link) => link.id));

  for (const draft of drafts) {
    const id = normalizeDraftString(draft.id);

    if (isDraftDeleted(draft.deleted)) {
      if (!id) continue;
      if (!existingIds.has(id)) redirectToTabEditWithError(menuId, "about", "삭제할 SNS 링크를 찾을 수 없습니다.");
      const { error } = await supabase.from("menu_social_links").delete().eq("id", id).eq("menu_site_id", menuId);
      if (error) redirectToTabEditWithError(menuId, "about", `SNS 링크 삭제에 실패했습니다: ${error.message}`);
      continue;
    }

    const type = normalizeDraftString(draft.type);
    if (!isSocialLinkType(type)) redirectToTabEditWithError(menuId, "about", "SNS 종류를 선택해주세요.");

    const payloadInput = {
      type,
      label: normalizeDraftString(draft.label),
      display_name: normalizeDraftString(draft.display_name),
      url: normalizeDraftString(draft.url),
      visible: normalizeDraftBoolean(draft.visible),
      sort_order: normalizeDraftNumber(draft.sort_order),
    };

    if (id) {
      if (!existingIds.has(id)) redirectToTabEditWithError(menuId, "about", "저장할 SNS 링크를 찾을 수 없습니다.");
      const payload: MenuSocialLinkUpdate = { ...payloadInput, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("menu_social_links").update(payload).eq("id", id).eq("menu_site_id", menuId);
      if (error) redirectToTabEditWithError(menuId, "about", `SNS 링크 저장에 실패했습니다: ${error.message}`);
    } else {
      const payload: MenuSocialLinkInsert = { menu_site_id: menuId, ...payloadInput };
      const { error } = await supabase.from("menu_social_links").insert(payload);
      if (error) redirectToTabEditWithError(menuId, "about", `SNS 링크 추가에 실패했습니다: ${error.message}`);
    }
  }
}

async function syncAboutChefs(supabase: SupabaseServerClient, menuId: string, drafts: AboutChefDraft[]) {
  const activeDrafts = drafts.filter((draft) => !isDraftDeleted(draft.deleted));
  if (activeDrafts.length > MENU_LIMITS.maxChefsPerSite) {
    redirectToTabEditWithError(menuId, "about", `셰프/인물 정보는 최대 ${MENU_LIMITS.maxChefsPerSite}명까지 등록할 수 있습니다.`);
  }

  for (const draft of activeDrafts) {
    const chefName = normalizeDraftString(draft.chef_name);
    const chefRole = normalizeDraftString(draft.chef_role);
    const chefDescription = normalizeDraftString(draft.chef_description);

    if (!chefName) redirectToTabEditWithError(menuId, "about", "셰프/인물 이름을 입력해주세요.");
    if (!chefRole) redirectToTabEditWithError(menuId, "about", "셰프/인물 역할을 입력해주세요.");
    if (!chefDescription) redirectToTabEditWithError(menuId, "about", "셰프/인물 소개를 입력해주세요.");
    validateRequiredText(menuId, chefName, "셰프/인물 이름", MENU_FIELD_LIMITS.menuChefs.chefName, "about");
    validateRequiredText(menuId, chefRole, "셰프/인물 역할", MENU_FIELD_LIMITS.menuChefs.chefRole, "about");
    validateRequiredText(menuId, chefDescription, "셰프/인물 소개", MENU_FIELD_LIMITS.menuChefs.chefDescription, "about");
  }

  const { data: existingChefs, error: existingError } = await supabase
    .from("menu_chefs")
    .select("id, chef_image_path")
    .eq("menu_site_id", menuId);

  if (existingError) redirectToTabEditWithError(menuId, "about", `셰프/인물 확인에 실패했습니다: ${existingError.message}`);

  const existingById = new Map((existingChefs ?? []).map((chef) => [chef.id, chef]));

  for (const draft of drafts) {
    const id = normalizeDraftString(draft.id);

    if (isDraftDeleted(draft.deleted)) {
      if (!id) continue;
      const existingChef = existingById.get(id);
      if (!existingChef) redirectToTabEditWithError(menuId, "about", "삭제할 셰프/인물 정보를 찾을 수 없습니다.");

      const { error } = await supabase.from("menu_chefs").delete().eq("id", id).eq("menu_site_id", menuId);
      if (error) redirectToTabEditWithError(menuId, "about", `셰프/인물 삭제에 실패했습니다: ${error.message}`);

      const removeError = await removeMenuImagePath(supabase, existingChef.chef_image_path);
      if (removeError) {
        redirectToTabEditWithError(menuId, "about", `셰프/인물 정보는 삭제되었지만 Storage 이미지 정리에 실패했습니다: ${removeError.message}`);
      }
      continue;
    }

    const payloadInput = {
      chef_name: normalizeDraftString(draft.chef_name),
      chef_role: normalizeDraftString(draft.chef_role),
      chef_description: normalizeDraftString(draft.chef_description),
      visible: normalizeDraftBoolean(draft.visible),
      sort_order: normalizeDraftNumber(draft.sort_order),
    };

    if (id) {
      if (!existingById.has(id)) redirectToTabEditWithError(menuId, "about", "저장할 셰프/인물 정보를 찾을 수 없습니다.");
      const payload: MenuChefUpdate = { ...payloadInput, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("menu_chefs").update(payload).eq("id", id).eq("menu_site_id", menuId);
      if (error) redirectToTabEditWithError(menuId, "about", `셰프/인물 저장에 실패했습니다: ${error.message}`);
    } else {
      const payload: MenuChefInsert = { menu_site_id: menuId, ...payloadInput };
      const { error } = await supabase.from("menu_chefs").insert(payload);
      if (error) redirectToTabEditWithError(menuId, "about", `셰프/인물 추가에 실패했습니다: ${error.message}`);
    }
  }
}

async function syncEvents(supabase: SupabaseServerClient, menuId: string, drafts: AboutEventDraft[]) {
  const activeDrafts = drafts.filter((draft) => !isDraftDeleted(draft.deleted));
  if (activeDrafts.length > MENU_LIMITS.maxEventsPerSite) {
    redirectToTabEditWithError(menuId, "events", `이벤트는 최대 ${MENU_LIMITS.maxEventsPerSite}개까지 등록할 수 있습니다.`);
  }

  for (const draft of activeDrafts) {
    const title = normalizeDraftString(draft.event_title);
    const description = normalizeDraftString(draft.event_description);

    if (!title) redirectToTabEditWithError(menuId, "events", "이벤트 제목을 입력해주세요.");
    if (!description) redirectToTabEditWithError(menuId, "events", "이벤트 설명을 입력해주세요.");
    validateRequiredText(menuId, title, "이벤트 제목", MENU_FIELD_LIMITS.menuEvents.eventTitle, "events");
    validateRequiredText(menuId, description, "이벤트 설명", MENU_FIELD_LIMITS.menuEvents.eventDescription, "events");
    validateOptionalText(menuId, normalizeDraftString(draft.event_subtitle) || null, "이벤트 부제목", MENU_FIELD_LIMITS.menuEvents.eventSubtitle, "events");
    validateOptionalText(menuId, normalizeDraftString(draft.event_period) || null, "이벤트 기간 문구", MENU_FIELD_LIMITS.menuEvents.eventPeriod, "events");
    validateOptionalText(menuId, normalizeDraftString(draft.event_benefit) || null, "이벤트 혜택", MENU_FIELD_LIMITS.menuEvents.eventBenefit, "events");
    validateOptionalText(menuId, normalizeDraftString(draft.event_detail) || null, "이벤트 상세", MENU_FIELD_LIMITS.menuEvents.eventDetail, "events");
    validateOptionalText(menuId, normalizeDraftString(draft.event_regular_price_label) || null, "정가 표시 문구", MENU_FIELD_LIMITS.menuEvents.eventRegularPriceLabel, "events");
    validateOptionalText(menuId, normalizeDraftString(draft.event_sale_price_label) || null, "할인가/이벤트가 표시 문구", MENU_FIELD_LIMITS.menuEvents.eventSalePriceLabel, "events");
    validateOptionalText(menuId, normalizeDraftString(draft.link_url) || null, "이벤트 링크 URL", MENU_FIELD_LIMITS.menuEvents.linkUrl, "events");
  }

  const { data: existingEvents, error: existingError } = await supabase
    .from("menu_events")
    .select("id, event_image_path")
    .eq("menu_site_id", menuId);

  if (existingError) redirectToTabEditWithError(menuId, "events", `이벤트 확인에 실패했습니다: ${existingError.message}`);

  const existingById = new Map((existingEvents ?? []).map((event) => [event.id, event]));

  for (const draft of drafts) {
    const id = normalizeDraftString(draft.id);

    if (isDraftDeleted(draft.deleted)) {
      if (!id) continue;
      const existingEvent = existingById.get(id);
      if (!existingEvent) redirectToTabEditWithError(menuId, "events", "삭제할 이벤트를 찾을 수 없습니다.");

      const { error } = await supabase.from("menu_events").delete().eq("id", id).eq("menu_site_id", menuId);
      if (error) redirectToTabEditWithError(menuId, "events", `이벤트 삭제에 실패했습니다: ${error.message}`);

      const removeError = await removeMenuImagePath(supabase, existingEvent.event_image_path);
      if (removeError) {
        redirectToTabEditWithError(menuId, "events", `이벤트는 삭제되었지만 Storage 이미지 정리에 실패했습니다: ${removeError.message}`);
      }
      continue;
    }

    const regularPriceLabel = normalizeDraftString(draft.event_regular_price_label) || null;
    const salePriceLabel = normalizeDraftString(draft.event_sale_price_label) || null;
    const hasEventPriceData = Boolean(regularPriceLabel || salePriceLabel);
    const payloadInput = {
      event_title: normalizeDraftString(draft.event_title),
      event_subtitle: normalizeDraftString(draft.event_subtitle) || null,
      event_description: normalizeDraftString(draft.event_description),
      event_period: normalizeDraftString(draft.event_period) || null,
      event_benefit: normalizeDraftString(draft.event_benefit) || null,
      event_detail: normalizeDraftString(draft.event_detail) || null,
      event_regular_price_label: regularPriceLabel,
      event_sale_price_label: salePriceLabel,
      event_price_visible: Boolean(normalizeDraftBoolean(draft.event_price_visible) && hasEventPriceData),
      start_date: normalizeDraftDate(draft.start_date),
      end_date: normalizeDraftDate(draft.end_date),
      link_url: normalizeDraftString(draft.link_url) || null,
      visible: normalizeDraftBoolean(draft.visible),
      sort_order: normalizeDraftNumber(draft.sort_order),
    };

    if (id) {
      if (!existingById.has(id)) redirectToTabEditWithError(menuId, "events", "저장할 이벤트를 찾을 수 없습니다.");
      const payload: MenuEventUpdate = { ...payloadInput, updated_at: new Date().toISOString() };
      const { error } = await supabase.from("menu_events").update(payload).eq("id", id).eq("menu_site_id", menuId);
      if (error) redirectToTabEditWithError(menuId, "events", `이벤트 저장에 실패했습니다: ${error.message}`);
    } else {
      const payload: MenuEventInsert = { menu_site_id: menuId, ...payloadInput };
      const { error } = await supabase.from("menu_events").insert(payload);
      if (error) redirectToTabEditWithError(menuId, "events", `이벤트 추가에 실패했습니다: ${error.message}`);
    }
  }
}

export async function updateAboutAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const hasRestaurantAddressField = formData.has("restaurant_address");
  const hasRestaurantPhoneField = formData.has("restaurant_phone");
  const hasOpeningHoursField = formData.has("opening_hours");
  const hasAboutDescriptionField = formData.has("about_description");
  const hasMapUrlField = formData.has("map_url");
  const restaurantAddress = hasRestaurantAddressField ? getNullableString(formData, "restaurant_address") : null;
  const restaurantPhone = hasRestaurantPhoneField ? getNullableString(formData, "restaurant_phone") : null;
  const openingHours = hasOpeningHoursField ? getNullableString(formData, "opening_hours") : null;
  const aboutDescription = hasAboutDescriptionField ? getNullableString(formData, "about_description") : null;
  const mapUrl = hasMapUrlField ? getNullableString(formData, "map_url") : null;
  const hasBrandDescriptionField = formData.has("brand_description");
  const brandDescription = hasBrandDescriptionField ? getNullableString(formData, "brand_description") : menuSite.brand_description;
  const templateContentLimits = getTemplateContentLimits(menuSite.template_key);

  if (hasRestaurantAddressField) {
    validateRequiredText(menuId, restaurantAddress ?? "", "주소", MENU_FIELD_LIMITS.menuSites.restaurantAddress, "about");
  }
  if (hasRestaurantPhoneField) {
    validateRequiredPhone(menuId, restaurantPhone, "전화번호", "about");
  }
  if (hasOpeningHoursField) {
    validateRequiredText(menuId, openingHours ?? "", "영업시간", MENU_FIELD_LIMITS.menuSites.openingHours, "about");
  }
  if (hasAboutDescriptionField) {
    validateRequiredText(menuId, aboutDescription ?? "", "소개 문구", MENU_FIELD_LIMITS.menuSites.aboutDescription, "about");
  }
  if (hasMapUrlField) {
    validateOptionalText(menuId, mapUrl, "지도 URL", MENU_FIELD_LIMITS.menuSites.mapUrl, "about");
  }
  if (hasBrandDescriptionField) {
    validateOptionalText(menuId, brandDescription, "매장 설명", templateContentLimits.brandDescription, "about");
  }

  if (hasRestaurantAddressField || hasRestaurantPhoneField || hasOpeningHoursField || hasMapUrlField || hasAboutDescriptionField || hasBrandDescriptionField) {
    const siteUpdate: MenuSiteUpdate = { updated_at: new Date().toISOString() };
    if (hasRestaurantAddressField) siteUpdate.restaurant_address = restaurantAddress;
    if (hasRestaurantPhoneField) siteUpdate.restaurant_phone = restaurantPhone;
    if (hasOpeningHoursField) siteUpdate.opening_hours = openingHours;
    if (hasMapUrlField) siteUpdate.map_url = mapUrl;
    if (hasAboutDescriptionField) siteUpdate.about_description = aboutDescription;
    if (hasBrandDescriptionField) siteUpdate.brand_description = brandDescription;

    const { error } = await supabase
      .from("menu_sites")
      .update(siteUpdate)
      .eq("id", menuId);

    if (error) redirectToTabEditWithError(menuId, "about", `소개 정보 저장에 실패했습니다: ${error.message}`);
  }

  if (getString(formData, "include_social_links") === "on") {
    await syncAboutSocialLinks(supabase, menuId, parseDraftArray<AboutSocialLinkDraft>(formData, "about_social_links_draft"));
  }

  if (getString(formData, "include_chefs") === "on") {
    await syncAboutChefs(supabase, menuId, parseDraftArray<AboutChefDraft>(formData, "about_chefs_draft"));
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "about", "소개 내용이 저장되었습니다.");
}

export async function updateEventsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);

  if (getString(formData, "include_events") === "on") {
    await syncEvents(supabase, menuId, parseDraftArray<AboutEventDraft>(formData, "events_draft"));
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "events", "이벤트 내용이 저장되었습니다.");
}

export async function updatePublishSettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId, { inactiveMessage: MENU_SITE_INACTIVE_PUBLISH_MESSAGE });
  const status = getString(formData, "status");

  if (!isMenuSiteStatus(status)) redirectToTabEditWithError(menuId, "publish", "공개 상태를 선택해주세요.");

  const nextStatus: MenuSiteStatus = status;

  if (nextStatus === "published") {
    if (!menuSite.restaurant_name) {
      redirectToTabEditWithError(menuId, "publish", "공개하려면 실제 매장명을 먼저 입력해주세요.");
    }
    if (!menuSite.slug) {
      redirectToTabEditWithError(menuId, "publish", "공개하려면 공개 메뉴판 주소를 먼저 설정해주세요.");
    }

    const [
      { count: pageCount, error: pageCountError },
      { count: categoryCount, error: categoryCountError },
      { count: itemCount, error: itemCountError },
    ] = await Promise.all([
      supabase.from("menu_pages").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
      supabase.from("menu_categories").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
      supabase.from("menu_items").select("id", { count: "exact", head: true }).eq("menu_site_id", menuId),
    ]);

    if (pageCountError || categoryCountError || itemCountError) {
      redirectToTabEditWithError(menuId, "publish", "공개 전 필수 데이터 확인 중 오류가 발생했습니다.");
    }
    if ((pageCount ?? 0) < 1) {
      redirectToTabEditWithError(menuId, "publish", "공개하려면 페이지를 1개 이상 등록해주세요.");
    }
    if ((categoryCount ?? 0) < 1) {
      redirectToTabEditWithError(menuId, "publish", "공개하려면 카테고리를 1개 이상 등록해주세요.");
    }
    if ((itemCount ?? 0) < 1) {
      redirectToTabEditWithError(menuId, "publish", "공개하려면 메뉴 아이템을 1개 이상 등록해주세요.");
    }
  }

  const publishedAt = nextStatus === "published" ? menuSite.published_at ?? new Date().toISOString() : menuSite.published_at;

  const { error } = await supabase
    .from("menu_sites")
    .update({ status: nextStatus, published_at: publishedAt, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "publish", `공개 설정 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "publish", "공개 설정이 저장되었습니다.");
}

export async function createMenuPageAction(formData: FormData) {
  const menuId = getString(formData, "menuId");

  if (!menuId) {
    redirect("/mypage?error=missing-menu-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertCanManageMenuPages(supabase, menuId, menuSite.template_key);
  const title = getString(formData, "menu_page_title");
  const description = getNullableString(formData, "menu_page_description");

  validateRequiredText(menuId, title, "페이지 이름", MENU_FIELD_LIMITS.menuPages.title);
  validateOptionalText(menuId, description, "페이지 설명", MENU_FIELD_LIMITS.menuPages.description);

  const { count: pageCount, error: pageCountError } = await supabase
    .from("menu_pages")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (pageCountError) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 개수 확인에 실패했습니다: ${pageCountError.message}`);
  }

  if ((pageCount ?? 0) >= MENU_LIMITS.maxPagesPerSite) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지는 최대 ${MENU_LIMITS.maxPagesPerSite}개까지 추가할 수 있습니다.`);
  }

  const { data: existingPages, error: existingPagesError } = await supabase
    .from("menu_pages")
    .select("id, sort_order")
    .eq("menu_site_id", menuId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (existingPagesError) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 정렬 확인에 실패했습니다: ${existingPagesError.message}`);
  }

  const pageReorderResults = await Promise.all(
    (existingPages ?? []).map((page, index) =>
      supabase
        .from("menu_pages")
        .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
        .eq("id", page.id)
        .eq("menu_site_id", menuId)
    )
  );
  const pageReorderError = pageReorderResults.find((result) => result.error)?.error;

  if (pageReorderError) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 정렬 저장에 실패했습니다: ${pageReorderError.message}`);
  }

  const payload: MenuPageInsert = {
    menu_site_id: menuId,
    title,
    description,
    description_visible: Boolean(description && getBoolean(formData, "menu_page_description_visible")),
    visible: true,
    sort_order: 0,
  };

  const { error } = await supabase.from("menu_pages").insert(payload);

  if (error) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 추가에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "메뉴 페이지가 추가되었습니다.");
}

export async function updateMenuPageAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const menuPageId = getString(formData, "menuPageId");

  if (!menuId || !menuPageId) {
    redirect("/mypage?error=missing-menu-page-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertCanManageMenuPages(supabase, menuId, menuSite.template_key);
  await assertMenuPageBelongsToMenuSite(menuId, menuPageId);

  const title = getString(formData, "menu_page_title");
  const description = getNullableString(formData, "menu_page_description");

  validateRequiredText(menuId, title, "페이지 이름", MENU_FIELD_LIMITS.menuPages.title);
  validateOptionalText(menuId, description, "페이지 설명", MENU_FIELD_LIMITS.menuPages.description);

  const payload: MenuPageUpdate = {
    title,
    description,
    description_visible: Boolean(description && getBoolean(formData, "menu_page_description_visible")),
    visible: true,
    sort_order: getNumber(formData, "menu_page_sort_order"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("menu_pages")
    .update(payload)
    .eq("id", menuPageId)
    .eq("menu_site_id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "메뉴 페이지가 저장되었습니다.");
}

export async function reorderMenuPagesAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const orderedIds = getOrderedIds(formData);

  if (!menuId || orderedIds.length === 0) {
    redirectToMenuEditWithError(menuId, "페이지 순서를 저장할 항목이 없습니다.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertCanManageMenuPages(supabase, menuId, menuSite.template_key);
  const { data: pages, error: pagesError } = await supabase.from("menu_pages").select("id").eq("menu_site_id", menuId);

  if (pagesError) {
    redirectToMenuEditWithError(menuId, `페이지 순서 확인에 실패했습니다: ${pagesError.message}`);
  }

  const pageIds = new Set((pages ?? []).map((page) => page.id));
  const canSaveOrder = orderedIds.length === pageIds.size && orderedIds.every((id) => pageIds.has(id));

  if (!canSaveOrder) {
    redirectToMenuEditWithError(menuId, "현재 페이지 목록과 순서 정보가 일치하지 않습니다. 새로고침 후 다시 시도해주세요.");
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("menu_pages").update({ sort_order: index, updated_at: new Date().toISOString() }).eq("id", id).eq("menu_site_id", menuId)
    )
  );
  const error = results.find((result) => result.error)?.error;

  if (error) {
    redirectToMenuEditWithError(menuId, `페이지 순서 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "페이지 순서가 저장되었습니다.");
}

export async function copyMenuPageAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const menuPageId = getString(formData, "menuPageId");

  if (!menuId || !menuPageId) {
    redirect("/mypage?error=missing-menu-page-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertCanManageMenuPages(supabase, menuId, menuSite.template_key);
  await assertMenuPageBelongsToMenuSite(menuId, menuPageId);
  const maxPriceOptionsPerItem = getMaxPriceOptionsPerItem(getTemplateCapabilities(menuSite.template_key));

  const { count: pageCount, error: pageCountError } = await supabase
    .from("menu_pages")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (pageCountError) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 개수 확인에 실패했습니다: ${pageCountError.message}`);
  }

  if ((pageCount ?? 0) >= MENU_LIMITS.maxPagesPerSite) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지는 최대 ${MENU_LIMITS.maxPagesPerSite}개까지 추가할 수 있습니다.`);
  }

  const { data: sourcePage, error: sourcePageError } = await supabase
    .from("menu_pages")
    .select("id, title, description, description_visible, display_settings, legacy_section_key, visible")
    .eq("id", menuPageId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (sourcePageError || !sourcePage) {
    redirectToMenuEditWithError(menuId, sourcePageError ? `복사할 메뉴 페이지 확인에 실패했습니다: ${sourcePageError.message}` : "복사할 메뉴 페이지를 찾을 수 없습니다.");
  }

  const nextSortOrder = pageCount ?? 0;
  const copiedPageTitle = `${sourcePage.title || `메뉴 페이지 ${nextSortOrder}`} 복사본`;
  const sourceDisplaySettings = normalizeMenuPageDisplaySettings(sourcePage.display_settings);
  const sourcePageIsPromotion = isPromotionDisplayPage(sourceDisplaySettings);

  if (sourcePageIsPromotion) {
    const { count: promotionPageCount, error: promotionPageCountError } = await supabase
      .from("menu_pages")
      .select("id", { count: "exact", head: true })
      .eq("menu_site_id", menuId)
      .contains("display_settings", { pageType: "promotion" });

    if (promotionPageCountError) {
      redirectToMenuEditWithError(menuId, `프로모션 페이지 개수 확인에 실패했습니다: ${promotionPageCountError.message}`);
    }

    if ((promotionPageCount ?? 0) >= MENU_LIMITS.maxPromotionPagesPerSite) {
      redirectToMenuEditWithError(menuId, `프로모션 페이지는 최대 ${MENU_LIMITS.maxPromotionPagesPerSite}개까지 추가할 수 있습니다.`);
    }
  }

  const pagePayload: MenuPageInsert = {
    menu_site_id: menuId,
    title: copiedPageTitle,
    description: sourcePage.description,
    description_visible: sourcePage.description_visible,
    display_settings: serializeMenuPageDisplaySettings(sourceDisplaySettings),
    legacy_section_key: sourcePage.legacy_section_key,
    visible: sourcePage.visible ?? true,
    sort_order: nextSortOrder,
  };

  const { data: copiedPage, error: copiedPageError } = await supabase.from("menu_pages").insert(pagePayload).select("id").single();

  if (copiedPageError || !copiedPage) {
    redirectToMenuEditWithError(menuId, copiedPageError ? `메뉴 페이지 복사에 실패했습니다: ${copiedPageError.message}` : "메뉴 페이지 복사에 실패했습니다.");
  }

  if (sourcePageIsPromotion) {
    revalidateMenuPaths(menuId, menuSite.slug);
    redirectToMenuEdit(menuId, "프로모션 페이지가 복사되었습니다.");
  }

  const { data: sourceCategories, error: categoriesError } = await supabase
    .from("menu_categories")
    .select("id, name, description, description_visible, section_key, visible, sort_order")
    .eq("menu_site_id", menuId)
    .eq("menu_page_id", menuPageId)
    .order("sort_order", { ascending: true });

  if (categoriesError) {
    redirectToMenuEditWithError(menuId, `페이지 복사 중 메뉴 그룹 확인에 실패했습니다: ${categoriesError.message}`);
  }

  const categoryIdBySourceId = new Map<string, string>();
  const sourceCategoryIds = (sourceCategories ?? []).map((category) => category.id);

  if (sourceCategories?.length) {
    const categoryPayloads: MenuCategoryInsert[] = sourceCategories.map((category) => ({
      menu_site_id: menuId,
      menu_page_id: copiedPage.id,
      name: category.name,
      description: category.description,
      description_visible: category.description_visible,
      section_key: category.section_key,
      visible: category.visible,
      sort_order: category.sort_order,
    }));

    const { data: copiedCategories, error: copiedCategoriesError } = await supabase
      .from("menu_categories")
      .insert(categoryPayloads)
      .select("id, name, sort_order");

    if (copiedCategoriesError) {
      redirectToMenuEditWithError(menuId, `페이지 복사 중 메뉴 그룹 생성에 실패했습니다: ${copiedCategoriesError.message}`);
    }

    const copiedCategoryQueue = [...(copiedCategories ?? [])].sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
    sourceCategories.forEach((category, index) => {
      const copiedCategory = copiedCategoryQueue[index];
      if (copiedCategory) categoryIdBySourceId.set(category.id, copiedCategory.id);
    });
  }

  const menuItemCopySelect =
    "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, image_path, badge_label, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order";
  const legacyMenuItemCopySelect =
    "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, image_path, badge_type, recommended, origin_info, is_best, is_sold_out, traits_visible, visible, sort_order";

  let { data: sourceItems, error: itemsError } = sourceCategoryIds.length
    ? await supabase
        .from("menu_items")
        .select(menuItemCopySelect)
        .eq("menu_site_id", menuId)
        .in("category_id", sourceCategoryIds)
        .order("sort_order", { ascending: true })
    : { data: [], error: null };

  if (itemsError && itemsError.message.toLowerCase().includes("badge_label")) {
    const fallbackResult = await supabase
      .from("menu_items")
      .select(legacyMenuItemCopySelect)
      .eq("menu_site_id", menuId)
      .in("category_id", sourceCategoryIds)
      .order("sort_order", { ascending: true });

    sourceItems = (fallbackResult.data ?? []).map((item) => ({ ...item, badge_label: null }));
    itemsError = fallbackResult.error;
  }

  if (itemsError) {
    redirectToMenuEditWithError(menuId, `페이지 복사 중 메뉴 아이템 확인에 실패했습니다: ${itemsError.message}`);
  }

  const itemIdBySourceId = new Map<string, string>();
  const sourceItemIds = (sourceItems ?? []).map((item) => item.id);

  if (sourceItems?.length) {
    const itemPayloads: MenuItemInsert[] = sourceItems.map((item) => {
      const itemWithOptionalBadgeLabel = item as typeof item & { badge_label?: string | null };

      return {
        menu_site_id: menuId,
        category_id: item.category_id ? (categoryIdBySourceId.get(item.category_id) ?? null) : null,
        name: item.name,
        set_name: item.set_name,
        description: item.description,
        price: item.price,
        price_label: item.price_label,
        price_visible: item.price_visible,
        portion_label: item.portion_label,
        portion_visible: item.portion_visible,
        image_url: item.image_url,
        image_path: item.image_path,
        badge_label: itemWithOptionalBadgeLabel.badge_label ?? null,
        badge_type: item.badge_type,
        recommended: item.recommended,
        origin_info: item.origin_info,
        is_best: item.is_best,
        is_sold_out: false,
        traits_visible: item.traits_visible,
        visible: item.visible,
        sort_order: item.sort_order,
      };
    });

    let { data: copiedItems, error: copiedItemsError } = await supabase
      .from("menu_items")
      .insert(itemPayloads)
      .select("id, name, category_id, sort_order");

    if (
      copiedItemsError &&
      (copiedItemsError.message.toLowerCase().includes("badge_label") ||
        copiedItemsError.message.toLowerCase().includes("could not find") ||
        copiedItemsError.code === "42703")
    ) {
      const fallbackItemPayloads = itemPayloads.map((itemPayload) => {
        const fallbackPayload = { ...itemPayload };
        delete fallbackPayload.badge_label;
        return fallbackPayload;
      });
      const fallbackResult = await supabase.from("menu_items").insert(fallbackItemPayloads).select("id, name, category_id, sort_order");
      copiedItems = fallbackResult.data;
      copiedItemsError = fallbackResult.error;
    }

    if (copiedItemsError) {
      redirectToMenuEditWithError(menuId, `페이지 복사 중 메뉴 아이템 생성에 실패했습니다: ${copiedItemsError.message}`);
    }

    const copiedItemsByCategory = new Map<string, NonNullable<typeof copiedItems>>();
    for (const item of copiedItems ?? []) {
      const key = item.category_id ?? "";
      const values = copiedItemsByCategory.get(key) ?? [];
      values.push(item);
      copiedItemsByCategory.set(key, values);
    }

    for (const values of copiedItemsByCategory.values()) {
      values.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
    }

    const sourceItemsForGrouping = [...(sourceItems ?? [])];
    const sourceItemsByCategory = new Map<string, typeof sourceItemsForGrouping>();
    for (const item of sourceItemsForGrouping) {
      const key = item.category_id ?? "";
      const values = sourceItemsByCategory.get(key);
      if (values) {
        values.push(item);
      } else {
        sourceItemsByCategory.set(key, [item]);
      }
    }

    for (const [sourceCategoryId, values] of sourceItemsByCategory) {
      values.sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, "ko"));
      const copiedCategoryId = sourceCategoryId ? (categoryIdBySourceId.get(sourceCategoryId) ?? "") : "";
      const copiedValues = copiedItemsByCategory.get(copiedCategoryId) ?? [];
      values.forEach((item, index) => {
        const copiedItem = copiedValues[index];
        if (copiedItem) itemIdBySourceId.set(item.id, copiedItem.id);
      });
    }
  }

  if (sourceItemIds.length > 0) {
    const { data: sourcePriceOptions, error: priceOptionsError } = await supabase
      .from("menu_item_price_options")
      .select("menu_item_id, label, price, price_label, visible, sort_order")
      .eq("menu_site_id", menuId)
      .in("menu_item_id", sourceItemIds)
      .order("sort_order", { ascending: true });

    if (
      priceOptionsError &&
      !priceOptionsError.message.toLowerCase().includes("menu_item_price_options") &&
      !priceOptionsError.message.toLowerCase().includes("does not exist") &&
      priceOptionsError.code !== "42P01"
    ) {
      redirectToMenuEditWithError(menuId, `페이지 복사 중 가격 옵션 확인에 실패했습니다: ${priceOptionsError.message}`);
    }

    const copiedPriceOptionCountsBySourceItemId = new Map<string, number>();
    const priceOptionPayloads: MenuItemPriceOptionInsert[] = (sourcePriceOptions ?? []).flatMap((option) => {
      const copiedItemId = itemIdBySourceId.get(option.menu_item_id);
      if (!copiedItemId) return [];
      const copiedOptionCount = copiedPriceOptionCountsBySourceItemId.get(option.menu_item_id) ?? 0;
      if (copiedOptionCount >= maxPriceOptionsPerItem) return [];
      copiedPriceOptionCountsBySourceItemId.set(option.menu_item_id, copiedOptionCount + 1);

      return {
        menu_site_id: menuId,
        menu_item_id: copiedItemId,
        label: option.label,
        price: option.price,
        price_label: option.price_label,
        visible: option.visible,
        sort_order: option.sort_order,
      };
    });

    if (priceOptionPayloads.length > 0) {
      const { error: copyPriceOptionsError } = await supabase.from("menu_item_price_options").insert(priceOptionPayloads);
      if (copyPriceOptionsError) {
        redirectToMenuEditWithError(menuId, `페이지 복사 중 가격 옵션 생성에 실패했습니다: ${copyPriceOptionsError.message}`);
      }
    }

    const { data: sourceTraits, error: traitsError } = await supabase
      .from("menu_item_traits")
      .select("menu_item_id, label, value, max_value, visible, sort_order")
      .eq("menu_site_id", menuId)
      .in("menu_item_id", sourceItemIds);

    if (
      traitsError &&
      !traitsError.message.toLowerCase().includes("menu_item_traits") &&
      !traitsError.message.toLowerCase().includes("does not exist") &&
      traitsError.code !== "42P01"
    ) {
      redirectToMenuEditWithError(menuId, `페이지 복사 중 메뉴 특성 확인에 실패했습니다: ${traitsError.message}`);
    }

    const traitPayloads: MenuItemTraitInsert[] = (sourceTraits ?? []).flatMap((trait) => {
      const copiedItemId = itemIdBySourceId.get(trait.menu_item_id);
      if (!copiedItemId) return [];
      return {
        menu_site_id: menuId,
        menu_item_id: copiedItemId,
        label: trait.label,
        value: trait.value,
        max_value: trait.max_value,
        visible: trait.visible,
        sort_order: trait.sort_order,
      };
    });

    if (traitPayloads.length > 0) {
      const { error: copyTraitsError } = await supabase.from("menu_item_traits").insert(traitPayloads);
      if (copyTraitsError) {
        redirectToMenuEditWithError(menuId, `페이지 복사 중 메뉴 특성 생성에 실패했습니다: ${copyTraitsError.message}`);
      }
    }
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "메뉴 페이지가 복사되었습니다.");
}

export async function deleteMenuPageAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const menuPageId = getString(formData, "menuPageId");

  if (!menuId || !menuPageId) {
    redirect("/mypage?error=missing-menu-page-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertCanManageMenuPages(supabase, menuId, menuSite.template_key);
  await assertMenuPageBelongsToMenuSite(menuId, menuPageId);

  const { count: pageCount, error: pageCountError } = await supabase
    .from("menu_pages")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (pageCountError) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 개수 확인에 실패했습니다: ${pageCountError.message}`);
  }

  if ((pageCount ?? 0) <= 1) {
    redirectToMenuEditWithError(menuId, "최소 1개의 메뉴 페이지는 필요합니다.");
  }

  const { data: pageCategories, error: categoriesError } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("menu_site_id", menuId)
    .eq("menu_page_id", menuPageId);

  if (categoriesError) {
    redirectToMenuEditWithError(menuId, `하위 메뉴 그룹 확인에 실패했습니다: ${categoriesError.message}`);
  }

  const categoryIds = (pageCategories ?? []).map((category) => category.id);
  const { data: pageItems, error: itemsError } = categoryIds.length
    ? await supabase.from("menu_items").select("id").eq("menu_site_id", menuId).in("category_id", categoryIds)
    : { data: [], error: null };

  if (itemsError) {
    redirectToMenuEditWithError(menuId, `하위 메뉴 아이템 확인에 실패했습니다: ${itemsError.message}`);
  }

  const itemIds = (pageItems ?? []).map((item) => item.id);

  if (itemIds.length > 0) {
    const { error: priceOptionsError } = await supabase.from("menu_item_price_options").delete().eq("menu_site_id", menuId).in("menu_item_id", itemIds);
    if (
      priceOptionsError &&
      !priceOptionsError.message.toLowerCase().includes("menu_item_price_options") &&
      !priceOptionsError.message.toLowerCase().includes("does not exist") &&
      priceOptionsError.code !== "42P01"
    ) {
      redirectToMenuEditWithError(menuId, `가격 옵션 삭제에 실패했습니다: ${priceOptionsError.message}`);
    }

    const { error: traitsError } = await supabase.from("menu_item_traits").delete().eq("menu_site_id", menuId).in("menu_item_id", itemIds);
    if (
      traitsError &&
      !traitsError.message.toLowerCase().includes("menu_item_traits") &&
      !traitsError.message.toLowerCase().includes("does not exist") &&
      traitsError.code !== "42P01"
    ) {
      redirectToMenuEditWithError(menuId, `메뉴 특성 삭제에 실패했습니다: ${traitsError.message}`);
    }

    const { error: itemsDeleteError } = await supabase.from("menu_items").delete().eq("menu_site_id", menuId).in("id", itemIds);
    if (itemsDeleteError) {
      redirectToMenuEditWithError(menuId, `메뉴 아이템 삭제에 실패했습니다: ${itemsDeleteError.message}`);
    }
  }

  if (categoryIds.length > 0) {
    const { error: categoriesDeleteError } = await supabase.from("menu_categories").delete().eq("menu_site_id", menuId).in("id", categoryIds);
    if (categoriesDeleteError) {
      redirectToMenuEditWithError(menuId, `메뉴 그룹 삭제에 실패했습니다: ${categoriesDeleteError.message}`);
    }
  }

  const { error } = await supabase.from("menu_pages").delete().eq("id", menuPageId).eq("menu_site_id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 삭제에 실패했습니다: ${error.message}`);
  }

  const featuredItemId = getJsonObject(menuSite.page_settings).featured_item_id;
  if (typeof featuredItemId === "string" && itemIds.includes(featuredItemId)) {
    const nextPageSettings = {
      ...getJsonObject(menuSite.page_settings),
      featured_item_enabled: false,
      featured_item_id: null,
    };
    await supabase.from("menu_sites").update({ page_settings: nextPageSettings, updated_at: new Date().toISOString() }).eq("id", menuId);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "메뉴 페이지가 삭제되었습니다.");
}

export async function createCategoryAction(formData: FormData) {
  const menuId = getString(formData, "menuId");

  if (!menuId) {
    redirect("/mypage?error=missing-menu-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  const name = getString(formData, "category_name");
  const description = templateCapabilities.categoryDescription ? getNullableString(formData, "category_description") : null;
  const menuPageId = getString(formData, "category_menu_page_id");

  validateRequiredText(menuId, name, "메뉴 카테고리 이름", MENU_FIELD_LIMITS.menuCategories.name);
  if (templateCapabilities.categoryDescription) {
    validateOptionalText(menuId, description, "메뉴 카테고리 설명", MENU_FIELD_LIMITS.menuCategories.description);
  }

  if (!menuPageId) {
    redirectToMenuEditWithError(menuId, "메뉴 카테고리를 추가할 메뉴 페이지를 선택해주세요.");
  }

  const menuPage = await assertMenuPageBelongsToMenuSite(menuId, menuPageId);

  const { count: categoryCount, error: categoryCountError } = await supabase
    .from("menu_categories")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("menu_page_id", menuPageId);

  if (categoryCountError) {
    redirectToMenuEditWithError(menuId, `메뉴 카테고리 개수 확인에 실패했습니다: ${categoryCountError.message}`);
  }

  if ((categoryCount ?? 0) >= MENU_LIMITS.maxCategoriesPerPage) {
    redirectToMenuEditWithError(menuId, `이 페이지에는 메뉴 카테고리를 최대 ${MENU_LIMITS.maxCategoriesPerPage}개까지 추가할 수 있습니다.`);
  }

  const { data: existingCategories, error: existingCategoriesError } = await supabase
    .from("menu_categories")
    .select("id, sort_order")
    .eq("menu_site_id", menuId)
    .eq("menu_page_id", menuPageId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (existingCategoriesError) {
    redirectToMenuEditWithError(menuId, `메뉴 카테고리 정렬 확인에 실패했습니다: ${existingCategoriesError.message}`);
  }

  const categoryReorderResults = await Promise.all(
    (existingCategories ?? []).map((category, index) =>
      supabase
        .from("menu_categories")
        .update({ sort_order: index + 1, updated_at: new Date().toISOString() })
        .eq("id", category.id)
        .eq("menu_site_id", menuId)
    )
  );
  const categoryReorderError = categoryReorderResults.find((result) => result.error)?.error;

  if (categoryReorderError) {
    redirectToMenuEditWithError(menuId, `메뉴 카테고리 정렬 저장에 실패했습니다: ${categoryReorderError.message}`);
  }

  const payload: MenuCategoryInsert = {
    menu_site_id: menuId,
    menu_page_id: menuPageId,
    name,
    description,
    description_visible: Boolean(description && getBoolean(formData, "category_description_visible")),
    section_key: getMenuPageSectionKey(menuPage.legacy_section_key),
    sort_order: 0,
    visible: getBoolean(formData, "category_visible"),
  };

  const { error } = await supabase.from("menu_categories").insert(payload);

  if (error) {
    redirectToMenuEditWithError(menuId, `메뉴 카테고리 추가에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "메뉴 카테고리가 추가되었습니다.");
}

export async function updateCategoryAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const categoryId = getString(formData, "categoryId");

  if (!menuId || !categoryId) {
    redirect("/mypage?error=missing-category-id");
  }

  const { menuSite } = await requireOwnedMenuSite(menuId);
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const supabase = await createClient();
  const name = getString(formData, "category_name");
  const description = templateCapabilities.categoryDescription ? getNullableString(formData, "category_description") : null;
  const menuPageId = getString(formData, "category_menu_page_id");

  validateRequiredText(menuId, name, "메뉴 카테고리 이름", MENU_FIELD_LIMITS.menuCategories.name);
  if (templateCapabilities.categoryDescription) {
    validateOptionalText(menuId, description, "메뉴 카테고리 설명", MENU_FIELD_LIMITS.menuCategories.description);
  }

  if (!menuPageId) {
    redirectToMenuEditWithError(menuId, "메뉴 카테고리가 속할 메뉴 페이지를 선택해주세요.");
  }

  const menuPage = await assertMenuPageBelongsToMenuSite(menuId, menuPageId);

  const payload: MenuCategoryUpdate = {
    menu_page_id: menuPageId,
    name,
    ...(templateCapabilities.categoryDescription
      ? {
          description,
          description_visible: Boolean(description && getBoolean(formData, "category_description_visible")),
        }
      : {}),
    section_key: getMenuPageSectionKey(menuPage.legacy_section_key),
    sort_order: getNumber(formData, "category_sort_order"),
    visible: getBoolean(formData, "category_visible"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("menu_categories")
    .update(payload)
    .eq("id", categoryId)
    .eq("menu_site_id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `메뉴 카테고리 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "메뉴 카테고리가 저장되었습니다.");
}

export async function reorderCategoriesAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const menuPageId = getString(formData, "menuPageId");
  const orderedIds = getOrderedIds(formData);

  if (!menuId || !menuPageId || orderedIds.length === 0) {
    redirectToMenuEditWithError(menuId, "카테고리 순서를 저장할 항목이 없습니다.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertMenuPageBelongsToMenuSite(menuId, menuPageId);
  const { data: currentCategories, error: categoriesError } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("menu_site_id", menuId)
    .eq("menu_page_id", menuPageId);

  if (categoriesError) {
    redirectToMenuEditWithError(menuId, `카테고리 순서 확인에 실패했습니다: ${categoriesError.message}`);
  }

  const categoryIds = new Set((currentCategories ?? []).map((category) => category.id));
  const canSaveOrder = orderedIds.length === categoryIds.size && orderedIds.every((id) => categoryIds.has(id));

  if (!canSaveOrder) {
    redirectToMenuEditWithError(menuId, "현재 카테고리 목록과 순서 정보가 일치하지 않습니다. 새로고침 후 다시 시도해주세요.");
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("menu_categories").update({ sort_order: index, updated_at: new Date().toISOString() }).eq("id", id).eq("menu_site_id", menuId)
    )
  );
  const error = results.find((result) => result.error)?.error;

  if (error) {
    redirectToMenuEditWithError(menuId, `카테고리 순서 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "카테고리 순서가 저장되었습니다.");
}

export async function deleteCategoryAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const categoryId = getString(formData, "categoryId");

  if (!menuId || !categoryId) {
    redirect("/mypage?error=missing-category-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const { count, error: countError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("category_id", categoryId);

  if (countError) {
    redirectToMenuEditWithError(menuId, `하위 아이템 확인에 실패했습니다: ${countError.message}`);
  }

  if ((count ?? 0) > 0) {
    const { error: hideError } = await supabase
      .from("menu_categories")
      .update({ visible: false, updated_at: new Date().toISOString() })
      .eq("id", categoryId)
      .eq("menu_site_id", menuId);

    if (hideError) {
      redirectToMenuEditWithError(menuId, `메뉴 카테고리 숨김 처리에 실패했습니다: ${hideError.message}`);
    }

    revalidateMenuPaths(menuId, menuSite.slug);
    redirectToMenuEdit(menuId, "하위 아이템이 있어 삭제하지 않고 메뉴판 표시를 껐습니다.");
  }

  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId)
    .eq("menu_site_id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `메뉴 카테고리 삭제에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "메뉴 카테고리가 삭제되었습니다.");
}

export async function createMenuItemAction(formData: FormData) {
  const menuId = getString(formData, "menuId");

  if (!menuId) {
    redirect("/mypage?error=missing-menu-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  const maxPriceOptionsPerItem = getMaxPriceOptionsPerItem(templateCapabilities);
  const name = getString(formData, "item_name");
  const priceLabel = getNullableString(formData, "item_price_label");
  const hasPriceNoteField = formData.has("item_price_note");
  const priceNote = hasPriceNoteField ? getNullableString(formData, "item_price_note") : null;
  const portionLabel = templateCapabilities.itemPortionLabel ? getNullableString(formData, "item_portion_label") : null;
  const description = templateCapabilities.itemDescription ? getNullableString(formData, "item_description") : null;
  const priceMode = getString(formData, "item_price_mode") === "options" ? "options" : "single";

  validateRequiredText(menuId, name, "아이템 이름", MENU_FIELD_LIMITS.menuItems.name);
  validateOptionalText(menuId, priceLabel, "가격 표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
  if (hasPriceNoteField) {
    validateOptionalText(menuId, priceNote, "가격 안내 문구", MENU_FIELD_LIMITS.menuItems.priceNote);
  }
  if (templateCapabilities.itemPortionLabel) {
    validateOptionalText(menuId, portionLabel, "제공량", MENU_FIELD_LIMITS.menuItems.portionLabel);
  }
  if (templateCapabilities.itemDescription) {
    validateOptionalText(menuId, description, "아이템 설명", MENU_FIELD_LIMITS.menuItems.description);
  }
  validateOptionalText(menuId, getNullableString(formData, "item_origin_info"), "원산지 정보", MENU_FIELD_LIMITS.menuItems.originInfo);

  const price = getOptionalNumber(formData, "item_price");
  const newPriceOptions = getNewMenuItemPriceOptions(menuId, formData, maxPriceOptionsPerItem);

  if (priceMode === "single" && price === undefined) {
    redirectToMenuEditWithError(menuId, "기본 가격을 입력해주세요.");
  }

  if (priceMode === "options" && newPriceOptions.length < 1) {
    redirectToMenuEditWithError(menuId, "옵션별 가격을 1개 이상 추가해주세요.");
  }

  const categoryId = getString(formData, "item_category_id");

  if (!categoryId) {
    redirectToMenuEditWithError(menuId, "아이템을 추가할 메뉴 카테고리를 선택해주세요.");
  }

  const category = await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const { count: categoryItemCount, error: categoryItemCountError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("category_id", categoryId);

  if (categoryItemCountError) {
    redirectToMenuEditWithError(menuId, `아이템 개수 확인에 실패했습니다: ${categoryItemCountError.message}`);
  }

  if ((categoryItemCount ?? 0) >= MENU_LIMITS.maxItemsPerCategory) {
    redirectToMenuEditWithError(menuId, `이 카테고리에는 아이템을 최대 ${MENU_LIMITS.maxItemsPerCategory}개까지 추가할 수 있습니다.`);
  }

  const { count: totalItemCount, error: totalItemCountError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (totalItemCountError) {
    redirectToMenuEditWithError(menuId, `전체 아이템 개수 확인에 실패했습니다: ${totalItemCountError.message}`);
  }

  if ((totalItemCount ?? 0) >= MENU_LIMITS.maxItemsPerSite) {
    redirectToMenuEditWithError(menuId, `한 메뉴판에는 아이템을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`);
  }

  const badgeLabel = getMenuItemBadgeLabelFromForm(menuId, formData);
  const badgeType = getLegacyBadgeTypeForLabel(badgeLabel);
  const setName = category?.section_key === "set_menu" ? getNullableString(formData, "item_set_name") : null;
  const traitSlots = getMenuItemTraitSlots(menuId, formData);
  const hasTraitSlotData = traitSlots.some((slot) => slot.label);

  const payload: MenuItemInsert = {
    menu_site_id: menuId,
    category_id: categoryId,
    name,
    set_name: setName,
    description,
    price: priceMode === "single" ? price : undefined,
    price_label: priceMode === "single" ? priceLabel : null,
    ...(hasPriceNoteField ? { price_note: priceNote } : {}),
    price_visible: getBoolean(formData, "item_price_visible"),
    portion_label: portionLabel,
    portion_visible: Boolean(templateCapabilities.itemPortionLabel && getBoolean(formData, "item_portion_visible") && portionLabel),
    badge_label: badgeLabel,
    badge_type: badgeType,
    recommended: Boolean(badgeLabel),
    origin_info: getNullableString(formData, "item_origin_info"),
    is_best: badgeLabel === "BEST",
    is_sold_out: getBoolean(formData, "item_is_sold_out"),
    traits_visible: Boolean(getBoolean(formData, "item_traits_visible") && hasTraitSlotData),
    visible: getBoolean(formData, "item_visible"),
    sort_order: getNumber(formData, "item_sort_order"),
  };

  let { data: createdItem, error } = await supabase.from("menu_items").insert(payload).select("id").single();

  if (isMissingBadgeLabelColumnError(error)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.badge_label;
    const fallbackResult = await supabase.from("menu_items").insert(fallbackPayload).select("id").single();
    createdItem = fallbackResult.data;
    error = fallbackResult.error;
  }

  if (error) {
    redirectToMenuEditWithError(menuId, `아이템 추가에 실패했습니다: ${error.message}`);
  }

  if (createdItem?.id) {
    await syncMenuItemTraitSlots(supabase, menuId, createdItem.id, traitSlots);

    if (priceMode === "options") {
      const payloads: MenuItemPriceOptionInsert[] = newPriceOptions.map((option) => ({
        menu_site_id: menuId,
        menu_item_id: createdItem.id,
        ...option,
      }));
      const { error: priceOptionsError } = await supabase.from("menu_item_price_options").insert(payloads);

      if (priceOptionsError) {
        revalidateMenuPaths(menuId, menuSite.slug);
        redirectToMenuEditWithError(
          menuId,
          `아이템은 추가되었지만 옵션별 가격 저장에 실패했습니다: ${priceOptionsError.message}. 생성된 아이템 카드에서 옵션 가격을 다시 추가해주세요.`
        );
      }
    }
  }

  await saveBadgeStyleFromMenuItemForm(supabase, menuId, menuSite, formData);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "아이템이 추가되었습니다.");
}

export async function updateMenuItemAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const itemId = getString(formData, "itemId");

  if (!menuId || !itemId) {
    redirect("/mypage?error=missing-menu-item-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  const maxPriceOptionsPerItem = getMaxPriceOptionsPerItem(templateCapabilities);
  await assertItemBelongsToMenuSite(menuId, itemId);

  const name = getString(formData, "item_name");
  const priceLabel = getNullableString(formData, "item_price_label");
  const hasPriceNoteField = formData.has("item_price_note");
  const priceNote = hasPriceNoteField ? getNullableString(formData, "item_price_note") : null;
  const portionLabel = templateCapabilities.itemPortionLabel ? getNullableString(formData, "item_portion_label") : null;
  const description = templateCapabilities.itemDescription ? getNullableString(formData, "item_description") : null;
  const priceMode = getString(formData, "item_price_mode") === "options" ? "options" : "single";
  const price = getOptionalNumber(formData, "item_price");

  validateRequiredText(menuId, name, "아이템 이름", MENU_FIELD_LIMITS.menuItems.name);
  validateOptionalText(menuId, priceLabel, "가격 표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
  if (hasPriceNoteField) {
    validateOptionalText(menuId, priceNote, "가격 안내 문구", MENU_FIELD_LIMITS.menuItems.priceNote);
  }
  if (templateCapabilities.itemPortionLabel) {
    validateOptionalText(menuId, portionLabel, "제공량", MENU_FIELD_LIMITS.menuItems.portionLabel);
  }
  if (templateCapabilities.itemDescription) {
    validateOptionalText(menuId, description, "아이템 설명", MENU_FIELD_LIMITS.menuItems.description);
  }
  validateOptionalText(menuId, getNullableString(formData, "item_origin_info"), "원산지 정보", MENU_FIELD_LIMITS.menuItems.originInfo);

  if (priceMode === "single" && price === undefined) {
    redirectToMenuEditWithError(menuId, "기본 가격을 입력해주세요.");
  }

  if (priceMode === "options") {
    const { count, error: visiblePriceOptionCountError } = await supabase
      .from("menu_item_price_options")
      .select("id", { count: "exact", head: true })
      .eq("menu_site_id", menuId)
      .eq("menu_item_id", itemId)
      .eq("visible", true);

    if (visiblePriceOptionCountError) {
      redirectToMenuEditWithError(menuId, `가격 옵션 확인에 실패했습니다: ${visiblePriceOptionCountError.message}`);
    }

    if ((count ?? 0) < 1) {
      redirectToMenuEditWithError(menuId, "옵션별 가격 모드에서는 가격 옵션을 1개 이상 등록하고 표시 상태로 켜주세요.");
    }

    if ((count ?? 0) > maxPriceOptionsPerItem) {
      redirectToMenuEditWithError(menuId, getPriceOptionLimitError(maxPriceOptionsPerItem));
    }
  }

  const categoryId = getString(formData, "item_category_id");

  if (!categoryId) {
    redirectToMenuEditWithError(menuId, "아이템이 속할 메뉴 카테고리를 선택해주세요.");
  }

  const category = await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const badgeLabel = getMenuItemBadgeLabelFromForm(menuId, formData);
  const badgeType = getLegacyBadgeTypeForLabel(badgeLabel);
  const setName = category?.section_key === "set_menu" ? getNullableString(formData, "item_set_name") : null;
  const traitSlots = getMenuItemTraitSlots(menuId, formData);
  const hasTraitSlotData = traitSlots.some((slot) => slot.label);

  const payload: MenuItemUpdate = {
    category_id: categoryId,
    name,
    set_name: setName,
    ...(hasPriceNoteField ? { price_note: priceNote } : {}),
    price_visible: getBoolean(formData, "item_price_visible"),
    badge_label: badgeLabel,
    badge_type: badgeType,
    recommended: Boolean(badgeLabel),
    origin_info: getNullableString(formData, "item_origin_info"),
    is_best: badgeLabel === "BEST",
    is_sold_out: getBoolean(formData, "item_is_sold_out"),
    traits_visible: Boolean(getBoolean(formData, "item_traits_visible") && hasTraitSlotData),
    visible: getBoolean(formData, "item_visible"),
    sort_order: getNumber(formData, "item_sort_order"),
    updated_at: new Date().toISOString(),
  };
  if (templateCapabilities.itemDescription) {
    payload.description = description;
  }
  if (templateCapabilities.itemPortionLabel) {
    payload.portion_label = portionLabel;
    payload.portion_visible = Boolean(getBoolean(formData, "item_portion_visible") && portionLabel);
  }

  if (priceMode === "single") {
    payload.price = price;
    payload.price_label = priceLabel;
  }

  let { error } = await supabase
    .from("menu_items")
    .update(payload)
    .eq("id", itemId)
    .eq("menu_site_id", menuId);

  if (isMissingBadgeLabelColumnError(error)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.badge_label;
    const fallbackResult = await supabase
      .from("menu_items")
      .update(fallbackPayload)
      .eq("id", itemId)
      .eq("menu_site_id", menuId);
    error = fallbackResult.error;
  }

  if (error) {
    redirectToMenuEditWithError(menuId, `아이템 저장에 실패했습니다: ${error.message}`);
  }

  await syncMenuItemTraitSlots(supabase, menuId, itemId, traitSlots);

  if (priceMode === "single") {
    const { error: hidePriceOptionsError } = await supabase
      .from("menu_item_price_options")
      .update({ visible: false, updated_at: new Date().toISOString() })
      .eq("menu_site_id", menuId)
      .eq("menu_item_id", itemId);

    const isMissingPriceOptionsTable =
      hidePriceOptionsError &&
      (hidePriceOptionsError.message.toLowerCase().includes("menu_item_price_options") ||
        hidePriceOptionsError.message.toLowerCase().includes("does not exist") ||
        hidePriceOptionsError.code === "42P01");

    if (hidePriceOptionsError && !isMissingPriceOptionsTable) {
      redirectToMenuEditWithError(menuId, `단일 가격 전환 중 기존 가격 옵션 숨김 처리에 실패했습니다: ${hidePriceOptionsError.message}`);
    }
  }

  await saveBadgeStyleFromMenuItemForm(supabase, menuId, menuSite, formData);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "아이템이 저장되었습니다.");
}

type MenuManagementBasicPageDraft = {
  id: string;
  isNew?: boolean;
  title: string;
  description?: string;
  descriptionVisible?: boolean;
  displaySettings?: MenuPageDisplaySettings;
  visible?: boolean;
  sortOrder: number;
};

type MenuManagementBasicCategoryDraft = {
  id: string;
  isNew?: boolean;
  pageId?: string;
  name: string;
  description?: string;
  descriptionVisible?: boolean;
  visible?: boolean;
  sortOrder: number;
  priceOptionLabels?: string[];
  priceColumns?: {
    id?: string;
    key?: string;
    label?: string;
    visible?: boolean;
    sortOrder?: number;
  }[];
};

type MenuManagementBasicItemDraft = {
  id: string;
  categoryId?: string;
  isNew?: boolean;
  imageUrl?: string | null;
  imagePath?: string | null;
  imageAction?: "keep" | "replace" | "delete";
  name: string;
  setName?: string;
  description: string;
  originInfo?: string;
  price: string;
  priceLabel: string;
  singlePriceInputMode?: "number" | "text";
  priceNote?: string;
  badgeLabel: string;
  visible: boolean;
  sortOrder: number;
  portionLabel?: string;
  priceVisible?: boolean;
  priceMode?: "single" | "options";
  portionVisible?: boolean;
  traitsVisible?: boolean;
  traitDrafts?: MenuItemTraitDraftInput[];
  priceOptions?: {
    label?: string;
    price?: string | number | null;
    priceLabel?: string | null;
    visible?: boolean;
    sortOrder?: number;
  }[];
  priceColumnValues?: {
    id?: string;
    priceColumnId?: string;
    price?: string | number | null;
    priceLabel?: string | null;
    visible?: boolean;
    sortOrder?: number;
  }[];
  timeSale?: {
    clientKey?: string;
    promotionId?: string | null;
    enabled?: boolean;
    name?: string;
    salePrice?: string | number | null;
    targets?: {
      targetId?: string | null;
      itemId?: string;
      priceColumnId?: string | null;
      salePrice?: string | number | null;
      salePriceLabel?: string | null;
      visible?: boolean;
    }[];
    scheduleType?: string | null;
    startsAt?: string;
    endsAt?: string;
    dailyStartTime?: string | null;
    dailyEndTime?: string | null;
    displayMode?: string | null;
    timeDisplayMode?: string;
    displayText?: string | null;
    badgeText?: string;
    badgeBackgroundColor?: string;
    active?: boolean;
  };
  isSoldOut?: boolean;
  badgeStyleKey?: string;
  badgeBackgroundColor?: string;
  badgeTextColor?: string;
};

function parseDraftArray<T extends Record<string, unknown>>(formData: FormData, key: string): T[] {
  const rawValue = getString(formData, key);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is T => Boolean(entry) && typeof entry === "object" && !Array.isArray(entry)) : [];
  } catch {
    return [];
  }
}

function parseDraftStringArray(formData: FormData, key: string) {
  const rawValue = getString(formData, key);
  if (!rawValue) return [];

  try {
    const parsed = JSON.parse(rawValue);
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string" && Boolean(entry)) : [];
  } catch {
    return [];
  }
}

function normalizeDraftString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeDraftPriceOptionLabels(value: unknown, maxOptions: number) {
  if (!Array.isArray(value)) return [];
  const seen = new Set<string>();

  return value
    .map((label) => normalizeDraftString(label))
    .filter((label) => {
      if (!label) return false;
      const key = label.toLocaleUpperCase("ko-KR");
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, maxOptions);
}

function getBasicPriceColumnKey(label: string, index: number) {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

  return slug || `column_${index + 1}`;
}

function normalizeBasicPriceColumnDrafts(
  menuId: string,
  value: unknown,
  maxColumns = 3
): {
  id?: string;
  key: string;
  label: string;
  visible: boolean;
  sortOrder: number;
}[] {
  if (!Array.isArray(value)) return [];
  if (value.length > maxColumns) {
    redirectToMenuEditWithError(menuId, `가격 옵션 컬럼은 최대 ${maxColumns}개까지 사용할 수 있습니다.`);
  }

  const labelSet = new Set<string>();
  const keySet = new Set<string>();
  return value.map((entry, index) => {
    const draft = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const label = normalizeDraftString(draft.label);
    validateRequiredText(menuId, label, "가격 옵션 컬럼 이름", MENU_FIELD_LIMITS.menuItemPriceOptions.label);

    const key = normalizeDraftString(draft.key) || getBasicPriceColumnKey(label, index);
    const labelKey = label.toLocaleUpperCase("ko-KR");
    if (labelSet.has(labelKey) || keySet.has(key)) {
      redirectToMenuEditWithError(menuId, "가격 옵션 컬럼 이름은 중복될 수 없습니다.");
    }
    labelSet.add(labelKey);
    keySet.add(key);

    return {
      id: normalizeDraftString(draft.id) || undefined,
      key,
      label,
      visible: draft.visible === undefined ? true : normalizeDraftBoolean(draft.visible),
      sortOrder: normalizeDraftNumber(draft.sortOrder ?? index),
    };
  });
}

type NormalizedItemPriceColumnValueDraft = {
  id?: string;
  priceColumnId: string;
  price: number | null;
  priceLabel: string | null;
  visible: boolean;
  sortOrder: number;
};

function normalizeItemPriceColumnValueDrafts(menuId: string, value: unknown): NormalizedItemPriceColumnValueDraft[] {
  if (!Array.isArray(value)) return [];

  const seenColumnIds = new Set<string>();
  const normalizedValues: NormalizedItemPriceColumnValueDraft[] = [];

  value.forEach((entry, index) => {
    const draft = entry && typeof entry === "object" ? entry as Record<string, unknown> : {};
    const priceColumnId = normalizeDraftString(draft.priceColumnId);
    if (!priceColumnId) return;

    const rawPrice =
      typeof draft.price === "number"
        ? String(draft.price)
        : normalizeDraftString(draft.price);
    const price = rawPrice ? normalizeDraftNumber(rawPrice) : null;
    const visible = price != null;
    const hasVisibleOrValue = price != null;

    if (!hasVisibleOrValue) return;
    if (seenColumnIds.has(priceColumnId)) {
      redirectToMenuEditWithError(menuId, "같은 옵션 컬럼 가격값은 중복 저장할 수 없습니다.");
    }
    seenColumnIds.add(priceColumnId);
    normalizedValues.push({
      id: normalizeDraftString(draft.id) || undefined,
      priceColumnId,
      price,
      priceLabel: null,
      visible,
      sortOrder: normalizeDraftNumber(draft.sortOrder ?? index),
    });
  });

  return normalizedValues.sort((left, right) => left.sortOrder - right.sortOrder || left.priceColumnId.localeCompare(right.priceColumnId));
}

function normalizeDraftBoolean(value: unknown) {
  return value === true;
}

function validateMenuPageDisplaySettingsDraft(
  menuId: string,
  settings: MenuPageDisplaySettings,
  templateCapabilities: TemplateCapabilities
) {
  validateOptionalText(menuId, settings.splitImage.url, "분할 이미지 URL", MENU_FIELD_LIMITS.menuPageDisplaySettings.mediaUrl);
  if (templateCapabilities.splitImageText) {
    validateOptionalText(menuId, settings.splitImage.title, "이미지 제목", MENU_FIELD_LIMITS.menuPageDisplaySettings.splitImageTitle);
    validateOptionalText(menuId, settings.splitImage.description, "이미지 설명", MENU_FIELD_LIMITS.menuPageDisplaySettings.splitImageDescription);
  }
  if (templateCapabilities.promotionText) {
    validateOptionalText(menuId, settings.promotion.title, "프로모션 제목", MENU_FIELD_LIMITS.menuPageDisplaySettings.promotionTitle);
    validateOptionalText(menuId, settings.promotion.description, "프로모션 설명", MENU_FIELD_LIMITS.menuPageDisplaySettings.promotionDescription);
  }
  validateOptionalText(menuId, settings.promotion.mediaUrl, "프로모션 이미지 URL", MENU_FIELD_LIMITS.menuPageDisplaySettings.mediaUrl);
  validateOptionalText(menuId, settings.promotion.videoUrl, "영상 URL", MENU_FIELD_LIMITS.menuPageDisplaySettings.mediaUrl);
}

function getDisplayImageStoragePaths(settings: MenuPageDisplaySettings) {
  const normalizedSettings = normalizeMenuPageDisplaySettings(settings);
  return [
    normalizedSettings.splitImage.path,
    normalizedSettings.promotion.mediaType === "image" ? normalizedSettings.promotion.mediaPath : null,
  ].filter((path): path is string => Boolean(path));
}

function getDisplayImagePathsToRemove(menuId: string, before: MenuPageDisplaySettings, after: MenuPageDisplaySettings) {
  const nextPaths = new Set(getDisplayImageStoragePaths(after));
  const sitePathPrefix = `menu-sites/${menuId}/`;

  return getDisplayImageStoragePaths(before).filter((path) => path.startsWith(sitePathPrefix) && !nextPaths.has(path));
}

function getDisplayVideoStoragePaths(menuId: string, settings: MenuPageDisplaySettings) {
  const normalizedSettings = normalizeMenuPageDisplaySettings(settings);
  const videoPath = normalizedSettings.promotion.videoPath;
  const siteVideoPathPrefix = `menu-sites/${menuId}/draft/display-videos/`;

  if (!videoPath || !videoPath.startsWith(siteVideoPathPrefix)) {
    return [];
  }

  return [videoPath];
}

function getDisplayVideoPathsToRemove(menuId: string, previousSettingsByPageId: Map<string, MenuPageDisplaySettings>, nextSettingsByPageId: Map<string, MenuPageDisplaySettings>) {
  const nextVideoPaths = new Set(
    Array.from(nextSettingsByPageId.values()).flatMap((settings) => getDisplayVideoStoragePaths(menuId, settings))
  );

  return Array.from(
    new Set(
      Array.from(previousSettingsByPageId.entries()).flatMap(([pageId, previousSettings]) => {
        const previousVideoPaths = getDisplayVideoStoragePaths(menuId, previousSettings);
        const nextSettings = nextSettingsByPageId.get(pageId);
        const nextPageVideoPaths = nextSettings ? new Set(getDisplayVideoStoragePaths(menuId, nextSettings)) : new Set<string>();

        return previousVideoPaths.filter((path) => !nextPageVideoPaths.has(path) && !nextVideoPaths.has(path));
      })
    )
  );
}

type NormalizedTimeSaleDraft = {
  clientKey: string;
  promotionId: string | null;
  enabled: boolean;
  name: string;
  targets: NormalizedTimeSaleTargetDraft[];
  scheduleType: TimeSaleScheduleType;
  startsAt: Date;
  endsAt: Date;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  timeDisplayMode: TimeSaleDisplayMode;
  displayText: string | null;
  badgeText: string;
  badgeBackgroundColor: string;
  active: boolean;
};

type NormalizedTimeSaleTargetDraft = {
  targetId: string | null;
  itemDraftId: string;
  priceColumnId: string | null;
  salePrice: number;
  salePriceLabel: string | null;
  visible: boolean;
};

function getTimeSaleSettingsJson({
  timeDisplayMode,
  displayText,
  badgeText,
  badgeBackgroundColor,
  existingSettings,
}: {
  timeDisplayMode: TimeSaleDisplayMode;
  displayText: string | null;
  badgeText: string;
  badgeBackgroundColor: string;
  existingSettings?: Json | null;
}): Json {
  const settings =
    existingSettings && typeof existingSettings === "object" && !Array.isArray(existingSettings)
      ? { ...(existingSettings as Record<string, Json>) }
      : {};
  settings.time_display_mode = timeDisplayMode;
  settings.badge_text = badgeText;
  settings.badge_background_color = badgeBackgroundColor;
  if (displayText) {
    settings.time_display_text = displayText;
  } else {
    delete settings.time_display_text;
  }
  return settings;
}

function buildUniqueItemIdByName(items: { id: string; name: string }[]) {
  const itemIdByName = new Map<string, string>();
  const duplicateNames = new Set<string>();

  items.forEach((item) => {
    const name = normalizeDraftString(item.name);
    if (!name) return;
    if (itemIdByName.has(name)) {
      duplicateNames.add(name);
      itemIdByName.delete(name);
      return;
    }
    if (!duplicateNames.has(name)) {
      itemIdByName.set(name, item.id);
    }
  });

  return itemIdByName;
}

async function remapFeaturedSlidesAfterMenuDraftSave({
  supabase,
  menuId,
  menuSite,
  itemDrafts,
  itemIdMap,
  deletedItemIdSet,
  categoryIdDeleteSet,
  previousItemNameById,
  updatedAt,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  menuSite: MenuSite;
  itemDrafts: MenuManagementBasicItemDraft[];
  itemIdMap: Map<string, string>;
  deletedItemIdSet: Set<string>;
  categoryIdDeleteSet: Set<string>;
  previousItemNameById: Map<string, string>;
  updatedAt: string;
}) {
  const { data: currentMenuSite, error: currentMenuSiteError } = await supabase
    .from("menu_sites")
    .select("page_settings")
    .eq("id", menuId)
    .maybeSingle();

  if (currentMenuSiteError) {
    redirectToMenuEditWithError(menuId, `대표 슬라이드 설정 확인에 실패했습니다: ${currentMenuSiteError.message}`);
  }
  if (!currentMenuSite) {
    redirectToMenuEditWithError(menuId, "대표 슬라이드 설정을 확인할 메뉴판을 찾지 못했습니다.");
  }

  const sourcePageSettings = currentMenuSite.page_settings ?? menuSite.page_settings;
  const pageSettings = mergePageSettings(sourcePageSettings);
  const hasFeaturedSlides = hasFeaturedSlidesSetting(sourcePageSettings);
  const currentSlides = hasFeaturedSlides ? pageSettings.featured_slides ?? [] : [];
  if (!hasFeaturedSlides && !pageSettings.featured_item_id) return;

  const activeItems = itemDrafts
    .map((item) => {
      const draftItemId = normalizeDraftString(item.id);
      const categoryId = normalizeDraftString(item.categoryId);
      const resolvedItemId = itemIdMap.get(draftItemId) ?? draftItemId;
      return {
        id: resolvedItemId,
        draftItemId,
        categoryId,
        name: normalizeDraftString(item.name),
        visible: item.visible === undefined ? true : normalizeDraftBoolean(item.visible),
      };
    })
    .filter(
      (item) =>
        item.id &&
        item.name &&
        item.visible &&
        !deletedItemIdSet.has(item.draftItemId) &&
        !deletedItemIdSet.has(item.id) &&
        !categoryIdDeleteSet.has(item.categoryId)
    );
  const activeItemIdSet = new Set(activeItems.map((item) => item.id));
  const activeItemIdByName = buildUniqueItemIdByName(activeItems);

  const remapFeaturedItemId = (featuredItemId: string | null) => {
    const normalizedItemId = normalizeDraftString(featuredItemId);
    if (!normalizedItemId) return null;
    if (activeItemIdSet.has(normalizedItemId)) return normalizedItemId;

    const previousName = previousItemNameById.get(normalizedItemId);
    if (!previousName) return null;

    return activeItemIdByName.get(previousName) ?? null;
  };

  const remappedSlides = currentSlides.map((slide) => ({
    ...slide,
    featured_item_id: remapFeaturedItemId(slide.featured_item_id),
  }));
  const firstCompleteSlide = remappedSlides.find((slide) => Boolean(slide.image_url && slide.featured_item_id)) ?? null;
  const remappedFeaturedItemId = hasFeaturedSlides
    ? firstCompleteSlide?.featured_item_id ?? null
    : remapFeaturedItemId(pageSettings.featured_item_id);

  const rawPageSettings = getJsonObject(sourcePageSettings);
  rawPageSettings.featured_item_enabled = pageSettings.featured_item_enabled;
  rawPageSettings.featured_item_id = remappedFeaturedItemId;
  if (hasFeaturedSlides) {
    rawPageSettings[FEATURED_SLIDES_PAGE_SETTINGS_KEY] = remappedSlides as unknown as Json;
  }

  const updatePayload: MenuSiteUpdate = {
    page_settings: rawPageSettings,
    updated_at: updatedAt,
  };

  const { error } = await supabase
    .from("menu_sites")
    .update(updatePayload)
    .eq("id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `대표 슬라이드 상품 연결 보정에 실패했습니다: ${error.message}`);
  }
}

function validateCafeAStarterResetDraftAlignment({
  menuId,
  snapshot,
  pageDrafts,
  categoryDrafts,
  itemDrafts,
  widgetPayload,
  canManageMenuPages,
}: {
  menuId: string;
  snapshot: CafeAStarterResetSnapshot;
  pageDrafts: MenuManagementBasicPageDraft[];
  categoryDrafts: MenuManagementBasicCategoryDraft[];
  itemDrafts: MenuManagementBasicItemDraft[];
  widgetPayload: MenuWidgetFinalSavePayload | null;
  canManageMenuPages: boolean;
}) {
  const validation = validateCafeAStarterResetSnapshot(snapshot);
  if (!validation.ok) {
    redirectToMenuEditWithError(menuId, validation.errors[0]?.message ?? "오브커피 샘플 저장 정보를 확인해주세요.");
  }

  const pageDraftIds = new Set(pageDrafts.map((page) => normalizeDraftString(page.id)).filter(Boolean));
  const categoryDraftIds = new Set(categoryDrafts.map((category) => normalizeDraftString(category.id)).filter(Boolean));
  const itemDraftIds = new Set(itemDrafts.map((item) => normalizeDraftString(item.id)).filter(Boolean));
  const widgetDraftIds = new Set((widgetPayload?.widgetDrafts ?? []).map((widget) => normalizeDraftString(widget.id)).filter(Boolean));

  if (canManageMenuPages) {
    const missingPageId = snapshot.pages.map((page) => page.id).find((pageId) => !pageDraftIds.has(pageId));
    if (missingPageId) {
      redirectToMenuEditWithError(menuId, "오브커피 샘플 페이지 저장 정보가 누락되었습니다.");
    }
  }

  const missingCategoryId = snapshot.categories.map((category) => category.id).find((categoryId) => !categoryDraftIds.has(categoryId));
  if (missingCategoryId) {
    redirectToMenuEditWithError(menuId, "오브커피 샘플 카테고리 저장 정보가 누락되었습니다.");
  }

  const missingItemId = snapshot.items.map((item) => item.id).find((itemId) => !itemDraftIds.has(itemId));
  if (missingItemId) {
    redirectToMenuEditWithError(menuId, "오브커피 샘플 메뉴 저장 정보가 누락되었습니다.");
  }

  const missingWidgetId = snapshot.widgets.map((widget) => widget.id).find((widgetId) => !widgetDraftIds.has(widgetId));
  if (missingWidgetId) {
    redirectToMenuEditWithError(menuId, "오브커피 샘플 위젯 저장 정보가 누락되었습니다.");
  }
}

async function assertCafeAStarterResetDeletedRowsBelongToMenuSite({
  supabase,
  menuId,
  snapshot,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  snapshot: CafeAStarterResetSnapshot;
}) {
  if (snapshot.deletedPageIds.length > 0) {
    const { data, error } = await supabase
      .from("menu_pages")
      .select("id")
      .eq("menu_site_id", menuId)
      .in("id", snapshot.deletedPageIds);
    if (error) redirectToMenuEditWithError(menuId, `오브커피 샘플 기존 페이지 확인에 실패했습니다: ${error.message}`);
    const foundIds = new Set((data ?? []).map((row) => row.id));
    if (snapshot.deletedPageIds.some((id) => !foundIds.has(id))) {
      redirectToMenuEditWithError(menuId, "오브커피 샘플 삭제 대상 페이지가 현재 메뉴판과 맞지 않습니다.");
    }
  }

  if (snapshot.deletedCategoryIds.length > 0) {
    const { data, error } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("menu_site_id", menuId)
      .in("id", snapshot.deletedCategoryIds);
    if (error) redirectToMenuEditWithError(menuId, `오브커피 샘플 기존 카테고리 확인에 실패했습니다: ${error.message}`);
    const foundIds = new Set((data ?? []).map((row) => row.id));
    if (snapshot.deletedCategoryIds.some((id) => !foundIds.has(id))) {
      redirectToMenuEditWithError(menuId, "오브커피 샘플 삭제 대상 카테고리가 현재 메뉴판과 맞지 않습니다.");
    }
  }

  if (snapshot.deletedItemIds.length > 0) {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id")
      .eq("menu_site_id", menuId)
      .in("id", snapshot.deletedItemIds);
    if (error) redirectToMenuEditWithError(menuId, `오브커피 샘플 기존 메뉴 확인에 실패했습니다: ${error.message}`);
    const foundIds = new Set((data ?? []).map((row) => row.id));
    if (snapshot.deletedItemIds.some((id) => !foundIds.has(id))) {
      redirectToMenuEditWithError(menuId, "오브커피 샘플 삭제 대상 메뉴가 현재 메뉴판과 맞지 않습니다.");
    }
  }

  if (snapshot.deletedWidgetIds.length > 0) {
    const { data, error } = await supabase
      .from("menu_widgets")
      .select("id")
      .eq("menu_site_id", menuId)
      .in("id", snapshot.deletedWidgetIds);
    if (error) redirectToMenuEditWithError(menuId, `오브커피 샘플 기존 위젯 확인에 실패했습니다: ${error.message}`);
    const foundIds = new Set((data ?? []).map((row) => row.id));
    if (snapshot.deletedWidgetIds.some((id) => !foundIds.has(id))) {
      redirectToMenuEditWithError(menuId, "오브커피 샘플 삭제 대상 위젯이 현재 메뉴판과 맞지 않습니다.");
    }
  }
}

async function saveCafeAStarterResetCoverAndFeaturedAfterMenuDraftSave({
  supabase,
  menuId,
  menuSite,
  snapshot,
  itemIdMap,
  updatedAt,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  menuSite: MenuSite;
  snapshot: CafeAStarterResetSnapshot;
  itemIdMap: ReadonlyMap<string, string>;
  updatedAt: string;
}) {
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  const menuCoverCapabilities = templateCapabilities.menuCover;
  const remapStarterItemId = (itemId: string | null, label: string) => {
    const normalizedItemId = normalizeDraftString(itemId);
    if (!normalizedItemId) return null;
    const remappedItemId = itemIdMap.get(normalizedItemId);
    if (!remappedItemId || !isUuid(remappedItemId)) {
      redirectToMenuEditWithError(menuId, `${label}의 메뉴 연결을 저장하지 못했습니다.`);
    }
    return remappedItemId;
  };

  const remappedSlides: FeaturedSlideSettings[] = snapshot.featuredSlides.map((slide, index) => ({
    id: normalizeDraftString(slide.id) || `starter-slide-${index + 1}`,
    image_url: normalizeDraftString(slide.imageUrl) || null,
    image_path: normalizeDraftString(slide.imagePath) || null,
    featured_item_id: remapStarterItemId(slide.featuredItemId, `대표 슬라이드 ${index + 1}`),
    sort_order: normalizeDraftNumber(slide.sortOrder ?? index),
  }));
  const firstCompleteSlide = remappedSlides.find((slide) => Boolean(slide.image_url && slide.featured_item_id)) ?? null;
  const remappedFeaturedItemId = snapshot.featuredEnabled
    ? firstCompleteSlide?.featured_item_id ?? remapStarterItemId(snapshot.featuredItemId, "대표 상품")
    : null;
  const menuCoverTitle = normalizeDraftString(snapshot.coverSettings.menuCoverTitle);
  const menuCoverDescription = normalizeDraftString(snapshot.coverSettings.menuCoverDescription);

  if (menuCoverCapabilities.usesCoverTitle) {
    validateRequiredText(menuId, menuCoverTitle, "커버 이미지 제목", MENU_FIELD_LIMITS.menuSites.menuCoverTitle);
  }
  if (menuCoverCapabilities.usesCoverDescription) {
    validateRequiredText(menuId, menuCoverDescription, "커버 이미지 설명", MENU_FIELD_LIMITS.menuSites.menuCoverDescription);
  }

  const nextPageSettings = getJsonObject(menuSite.page_settings);
  if (menuCoverCapabilities.coverMode !== "none") {
    nextPageSettings.menu_cover_enabled = true;
  }
  if (menuCoverCapabilities.usesFeaturedItem) {
    nextPageSettings.featured_item_enabled = Boolean(remappedFeaturedItemId);
    nextPageSettings.featured_item_id = remappedFeaturedItemId;
  }
  if (templateCapabilities.featuredItemCarousel) {
    nextPageSettings[FEATURED_SLIDES_PAGE_SETTINGS_KEY] = remappedSlides as unknown as Json;
  }

  const updatePayload: MenuSiteUpdate = {
    ...(menuCoverCapabilities.usesCoverTitle ? { menu_cover_title: menuCoverTitle } : {}),
    ...(menuCoverCapabilities.usesCoverDescription ? { menu_cover_description: menuCoverDescription } : {}),
    cover_image_url: normalizeDraftString(snapshot.coverSettings.coverImageUrl) || null,
    cover_image_path: normalizeDraftString(snapshot.coverSettings.coverImagePath) || null,
    page_settings: nextPageSettings,
    updated_at: updatedAt,
  };

  const { error } = await supabase
    .from("menu_sites")
    .update(updatePayload)
    .eq("id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `오브커피 대표 영역 저장에 실패했습니다: ${error.message}`);
  }
}

function parseTimeSaleDateTime(menuId: string, value: unknown, label: string) {
  const rawValue = normalizeDraftString(value);
  if (!rawValue) {
    redirectToMenuEditWithError(menuId, `${label}를 입력해주세요.`);
  }

  const hasTimezone = /(?:z|[+-]\d{2}:\d{2})$/i.test(rawValue);
  const normalizedValue = hasTimezone ? rawValue : `${rawValue.length === 16 ? `${rawValue}:00` : rawValue}+09:00`;
  const date = new Date(normalizedValue);

  if (Number.isNaN(date.getTime())) {
    redirectToMenuEditWithError(menuId, `${label} 형식을 확인해주세요.`);
  }

  return date;
}

function parseDailyTimeToSeconds(value: string | null) {
  const normalized = normalizeDailyTime(value);
  if (!normalized) return null;
  const [hour, minute, second] = normalized.split(":").map(Number);
  return hour * 3600 + minute * 60 + second;
}

function normalizeTimeSaleDisplayTextForSave(menuId: string, value: unknown, timeDisplayMode: TimeSaleDisplayMode) {
  const rawValue = typeof value === "string" ? value : value == null ? "" : String(value);
  const normalizedValue = rawValue.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  const requiresText = timeDisplayMode === "message" || timeDisplayMode === "message_and_countdown";

  if (requiresText && !normalizedValue) {
    redirectToMenuEditWithError(menuId, "타임세일 표시 문구를 입력해주세요.");
  }

  if (normalizedValue.length > TIME_SALE_DISPLAY_TEXT_MAX_LENGTH) {
    redirectToMenuEditWithError(menuId, `타임세일 표시 문구는 ${TIME_SALE_DISPLAY_TEXT_MAX_LENGTH}자 이하로 입력해주세요.`);
  }

  return normalizeTimeSaleDisplayText(normalizedValue);
}

function normalizeTimeSaleDailyWindow({
  menuId,
  scheduleType,
  startsAt,
  endsAt,
  dailyStartTime,
  dailyEndTime,
}: {
  menuId: string;
  scheduleType: TimeSaleScheduleType;
  startsAt: Date;
  endsAt: Date;
  dailyStartTime: unknown;
  dailyEndTime: unknown;
}) {
  if (scheduleType === "once") {
    return {
      dailyStartTime: null,
      dailyEndTime: null,
    };
  }

  const normalizedStartTime = normalizeDailyTime(dailyStartTime);
  const normalizedEndTime = normalizeDailyTime(dailyEndTime);
  if (!normalizedStartTime || !normalizedEndTime) {
    redirectToMenuEditWithError(menuId, "매일 반복 할인 시작 시간과 종료 시간을 입력해주세요.");
  }

  const startSeconds = parseDailyTimeToSeconds(normalizedStartTime);
  const endSeconds = parseDailyTimeToSeconds(normalizedEndTime);
  if (startSeconds == null || endSeconds == null || endSeconds <= startSeconds) {
    redirectToMenuEditWithError(menuId, "매일 종료 시간은 시작 시간보다 늦어야 합니다. 자정을 넘기는 반복 할인은 아직 지원하지 않습니다.");
  }

  const nextStartMs = getNextTimeSaleStartMs(
    {
      active: true,
      scheduleType,
      startsAt: startsAt.toISOString(),
      endsAt: endsAt.toISOString(),
      dailyStartTime: normalizedStartTime,
      dailyEndTime: normalizedEndTime,
      timeZone: TIME_SALE_SCHEDULE_TIME_ZONE,
    },
    startsAt.getTime() - 1,
  );

  if (nextStartMs == null || nextStartMs >= endsAt.getTime()) {
    redirectToMenuEditWithError(menuId, "행사 기간 안에 적용 가능한 할인 시간대가 없습니다.");
  }

  return {
    dailyStartTime: normalizedStartTime,
    dailyEndTime: normalizedEndTime,
  };
}

function normalizeMenuTimeSaleTargetDrafts(
  menuId: string,
  draft: MenuTimeSaleManagementDraft
): NormalizedTimeSaleTargetDraft[] {
  const targetInputs = draft.targets;
  const seenTargetKeys = new Set<string>();
  const targets: NormalizedTimeSaleTargetDraft[] = [];

  for (const targetInput of targetInputs) {
    const target = targetInput;
    const targetId = normalizeDraftString(target.targetId) || null;
    const itemDraftId = normalizeDraftString(target.itemId);
    const priceColumnId = normalizeDraftString(target.priceColumnId) || null;
    const rawSalePrice =
      typeof target.salePrice === "number"
        ? String(target.salePrice)
        : normalizeDraftString(target.salePrice);
    const salePrice = parseTimeSalePriceInputToWon(rawSalePrice);
    const visible = target.visible === undefined ? true : normalizeDraftBoolean(target.visible);
    const targetKey = `${itemDraftId}:${priceColumnId ?? "single"}`;

    if (!itemDraftId) {
      redirectToMenuEditWithError(menuId, "타임세일 대상 메뉴 정보가 누락되었습니다.");
    }
    if (targetId && !isUuid(targetId)) {
      redirectToMenuEditWithError(menuId, "타임세일 대상 ID 형식이 올바르지 않습니다.");
    }

    if (seenTargetKeys.has(targetKey)) {
      redirectToMenuEditWithError(menuId, "같은 옵션 가격에 타임세일을 중복 적용할 수 없습니다.");
    }
    seenTargetKeys.add(targetKey);

    if (!Number.isFinite(salePrice) || salePrice <= 0 || !Number.isInteger(salePrice)) {
      redirectToMenuEditWithError(menuId, "타임세일 할인가를 4.5 또는 4500처럼 입력해주세요.");
    }

    targets.push({
      targetId,
      itemDraftId,
      priceColumnId,
      salePrice,
      salePriceLabel:
        typeof target.salePriceLabel === "string" && target.salePriceLabel.trim()
          ? target.salePriceLabel.trim()
          : getTimeSalePriceLabelForSave(rawSalePrice, salePrice),
      visible,
    });
  }

  if (targets.length === 0) {
    redirectToMenuEditWithError(menuId, "타임세일을 적용할 옵션 가격을 하나 이상 입력해주세요.");
  }

  return targets;
}

function normalizeMenuTimeSaleDraft(menuId: string, draft: MenuTimeSaleManagementDraft): NormalizedTimeSaleDraft {
  const clientKey = normalizeDraftString(draft.clientKey);
  if (!clientKey) {
    redirectToMenuEditWithError(menuId, "타임세일 저장 키가 누락되었습니다.");
  }
  const promotionId = normalizeDraftString(draft.promotionId) || null;
  if (promotionId && !isUuid(promotionId)) {
    redirectToMenuEditWithError(menuId, "타임세일 ID 형식이 올바르지 않습니다.");
  }
  const name = normalizeDraftString(draft.name) || "타임세일";
  const targets = normalizeMenuTimeSaleTargetDrafts(menuId, draft);
  const startsAt = parseTimeSaleDateTime(menuId, draft.startsAt, "타임세일 시작 일시");
  const endsAt = parseTimeSaleDateTime(menuId, draft.endsAt, "타임세일 종료 일시");
  const scheduleType = normalizeTimeSaleScheduleType(draft.scheduleType);
  const timeDisplayMode = normalizeTimeSaleDisplayMode(draft.timeDisplayMode);
  const displayText = normalizeTimeSaleDisplayTextForSave(menuId, draft.displayText, timeDisplayMode);
  const dailyWindow = normalizeTimeSaleDailyWindow({
    menuId,
    scheduleType,
    startsAt,
    endsAt,
    dailyStartTime: draft.dailyStartTime,
    dailyEndTime: draft.dailyEndTime,
  });
  const badgeText = normalizeTimeSaleBadgeText(draft.badgeText);
  const badgeBackgroundColor = normalizeTimeSaleBadgeBackgroundColor(draft.badgeBackgroundColor);

  validateRequiredText(menuId, name, "타임세일 이름", 40);
  validateRequiredText(menuId, badgeText, "타임세일 배지 문구", TIME_SALE_BADGE_TEXT_MAX_LENGTH);

  if (endsAt.getTime() <= startsAt.getTime()) {
    redirectToMenuEditWithError(menuId, "타임세일 종료 일시는 시작 일시보다 뒤여야 합니다.");
  }

  return {
    clientKey,
    promotionId,
    enabled: Boolean(draft.enabled),
    name,
    targets,
    scheduleType,
    startsAt,
    endsAt,
    dailyStartTime: dailyWindow.dailyStartTime,
    dailyEndTime: dailyWindow.dailyEndTime,
    timeDisplayMode,
    displayText,
    badgeText,
    badgeBackgroundColor,
    active: draft.enabled === false ? false : draft.active !== false,
  };
}

async function deleteMenuTimeSalePromotions(supabase: SupabaseServerClient, menuId: string) {
  const { data: existingPromotions, error: existingPromotionsError } = await supabase
    .from("menu_promotions")
    .select("id")
    .eq("menu_site_id", menuId)
    .eq("type", TIME_SALE_TYPE);

  const missingPromotionTable =
    existingPromotionsError &&
    (existingPromotionsError.message.toLowerCase().includes("menu_promotions") ||
      existingPromotionsError.message.toLowerCase().includes("does not exist") ||
      existingPromotionsError.code === "42P01");

  if (missingPromotionTable) {
    return;
  }

  if (existingPromotionsError) {
    redirectToMenuEditWithError(menuId, `타임세일 기존 설정 확인에 실패했습니다: ${existingPromotionsError.message}`);
  }

  const promotionIds = (existingPromotions ?? []).map((promotion) => promotion.id);
  if (promotionIds.length === 0) {
    return;
  }

  const { error } = await supabase
    .from("menu_promotions")
    .delete()
    .eq("menu_site_id", menuId)
    .eq("type", TIME_SALE_TYPE)
    .in("id", promotionIds);

  if (error) {
    redirectToMenuEditWithError(menuId, `타임세일 기존 설정 정리에 실패했습니다: ${error.message}`);
  }
}

async function deleteSpecificMenuTimeSalePromotions(supabase: SupabaseServerClient, menuId: string, promotionIds: string[]) {
  const uniquePromotionIds = Array.from(new Set(promotionIds));
  if (uniquePromotionIds.length === 0) return;

  const { error } = await supabase
    .from("menu_promotions")
    .delete()
    .eq("menu_site_id", menuId)
    .eq("type", TIME_SALE_TYPE)
    .in("id", uniquePromotionIds);

  if (error) {
    redirectToMenuEditWithError(menuId, `타임세일 삭제에 실패했습니다: ${error.message}`);
  }
}

async function cleanupZeroTargetTimeSalePromotions(supabase: SupabaseServerClient, menuId: string) {
  const { data: promotions, error: promotionsError } = await supabase
    .from("menu_promotions")
    .select("id")
    .eq("menu_site_id", menuId)
    .eq("type", TIME_SALE_TYPE);

  const missingPromotionTable =
    promotionsError &&
    (promotionsError.message.toLowerCase().includes("menu_promotions") ||
      promotionsError.message.toLowerCase().includes("does not exist") ||
      promotionsError.code === "42P01");

  if (missingPromotionTable) return;
  if (promotionsError) {
    redirectToMenuEditWithError(menuId, `타임세일 정리 기준 확인에 실패했습니다: ${promotionsError.message}`);
  }

  const promotionIds = (promotions ?? []).map((promotion) => promotion.id);
  if (promotionIds.length === 0) return;

  const { data: promotionItems, error: promotionItemsError } = await supabase
    .from("menu_promotion_items")
    .select("promotion_id")
    .in("promotion_id", promotionIds);

  if (promotionItemsError) {
    redirectToMenuEditWithError(menuId, `타임세일 대상 정리 기준 확인에 실패했습니다: ${promotionItemsError.message}`);
  }

  const promotionIdsWithTargets = new Set((promotionItems ?? []).map((item) => item.promotion_id));
  const zeroTargetPromotionIds = promotionIds.filter((promotionId) => !promotionIdsWithTargets.has(promotionId));
  await deleteSpecificMenuTimeSalePromotions(supabase, menuId, zeroTargetPromotionIds);
}

function getPromotionItemTargetKey(target: Pick<MenuPromotionItemRow, "menu_item_id" | "price_column_id">) {
  return `${target.menu_item_id}:${target.price_column_id ?? "single"}`;
}

type PreparedTimeSaleTarget = Omit<MenuPromotionItemInsert, "promotion_id"> & {
  targetId: string | null;
  itemName: string;
  priceColumnLabel: string | null;
};

type PreparedTimeSale = {
  promotionId: string | null;
  promotion: MenuPromotionInsert;
  items: PreparedTimeSaleTarget[];
  validationEntry: TimeSaleValidationEntry;
};

async function prepareMenuTimeSaleForSave({
  supabase,
  menuId,
  draft,
  itemIdMap,
  priceColumnIdMap,
  deletedItemIdSet,
  existingPromotionIdSet,
  trace,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  draft: NormalizedTimeSaleDraft;
  itemIdMap: Map<string, string>;
  priceColumnIdMap: Map<string, string>;
  deletedItemIdSet: Set<string>;
  existingPromotionIdSet: Set<string>;
  trace?: MenuSaveTraceContext | null;
}): Promise<PreparedTimeSale | null> {
  const stageEnd = startMenuSaveTraceStage(trace, "time-sale-prepare", {
    operation: "prepare-entry",
    targetCount: draft.targets.length,
    hasPromotionId: Boolean(draft.promotionId),
  });
  const preparedTargets: PreparedTimeSaleTarget[] = [];
  let selectQueryCount = 0;
  let maxQueryElapsedMs = 0;

  for (const target of draft.targets) {
    const resolvedItemId = itemIdMap.get(target.itemDraftId) ?? target.itemDraftId;
    if (deletedItemIdSet.has(target.itemDraftId) || deletedItemIdSet.has(resolvedItemId)) {
      continue;
    }
    const resolvedPriceColumnId = target.priceColumnId ? priceColumnIdMap.get(target.priceColumnId) ?? target.priceColumnId : null;

    selectQueryCount += 1;
    let queryStartedAtMs = Date.now();
    const { data: menuItem, error: menuItemError } = await supabase
      .from("menu_items")
      .select("id, category_id, name, price, price_label, price_visible")
      .eq("id", resolvedItemId)
      .eq("menu_site_id", menuId)
      .maybeSingle();
    maxQueryElapsedMs = Math.max(maxQueryElapsedMs, getMenuSaveTraceElapsedMs(queryStartedAtMs));
    logMenuSaveTrace(trace, {
      stage: "time-sale-prepare",
      status: menuItemError ? "error" : "success",
      operation: "validate-target-items",
      table: "menu_items",
      queryIndex: selectQueryCount,
      rowCount: menuItem ? 1 : 0,
      elapsedMs: getMenuSaveTraceElapsedMs(queryStartedAtMs),
      ...getSafeSupabaseErrorFields(menuItemError),
    });

    if (menuItemError) {
      stageEnd("error", { operation: "validate-target-items", ...getSafeSupabaseErrorFields(menuItemError) });
      redirectToMenuEditWithError(menuId, `타임세일 대상 메뉴 확인에 실패했습니다: ${menuItemError.message}`);
    }
    if (!menuItem) {
      if (draft.promotionId && existingPromotionIdSet.has(draft.promotionId)) continue;
      redirectToMenuEditWithError(menuId, "타임세일 대상 메뉴를 찾을 수 없습니다.");
    }
    if (menuItem.price_visible === false) {
      redirectToMenuEditWithError(menuId, "가격을 숨긴 메뉴에는 타임세일을 적용할 수 없습니다.");
    }

    selectQueryCount += 1;
    queryStartedAtMs = Date.now();
    const { count: priceOptionCount, error: priceOptionCountError } = await supabase
      .from("menu_item_price_options")
      .select("id", { count: "exact", head: true })
      .eq("menu_site_id", menuId)
      .eq("menu_item_id", resolvedItemId)
      .eq("visible", true);
    maxQueryElapsedMs = Math.max(maxQueryElapsedMs, getMenuSaveTraceElapsedMs(queryStartedAtMs));
    logMenuSaveTrace(trace, {
      stage: "time-sale-prepare",
      status: priceOptionCountError ? "error" : "success",
      operation: "validate-target-price-options",
      table: "menu_item_price_options",
      queryIndex: selectQueryCount,
      rowCount: priceOptionCount ?? 0,
      elapsedMs: getMenuSaveTraceElapsedMs(queryStartedAtMs),
      ...getSafeSupabaseErrorFields(priceOptionCountError),
    });

    const missingPriceOptionsTable =
      priceOptionCountError &&
      (priceOptionCountError.message.toLowerCase().includes("menu_item_price_options") ||
        priceOptionCountError.message.toLowerCase().includes("does not exist") ||
        priceOptionCountError.code === "42P01");

    if (priceOptionCountError && !missingPriceOptionsTable) {
      stageEnd("error", { operation: "validate-target-price-options", ...getSafeSupabaseErrorFields(priceOptionCountError) });
      redirectToMenuEditWithError(menuId, `타임세일 대상 메뉴 가격 옵션 확인에 실패했습니다: ${priceOptionCountError.message}`);
    }
    if (!missingPriceOptionsTable && (priceOptionCount ?? 0) > 0) {
      redirectToMenuEditWithError(menuId, "옵션별 가격 메뉴는 타임세일 MVP에서 지원하지 않습니다.");
    }

    let originalTargetPrice = Number(menuItem.price);
    let priceColumnLabel: string | null = null;

    if (resolvedPriceColumnId === null) {
      if (!Number.isFinite(originalTargetPrice) || originalTargetPrice <= 0 || normalizeDraftString(menuItem.price_label)) {
        redirectToMenuEditWithError(menuId, "숫자 기본 가격이 있는 메뉴만 타임세일을 사용할 수 있습니다.");
      }
    } else {
      selectQueryCount += 1;
      queryStartedAtMs = Date.now();
      const { data: priceColumn, error: priceColumnError } = await supabase
        .from("menu_category_price_columns")
        .select("id, category_id, label, visible")
        .eq("menu_site_id", menuId)
        .eq("id", resolvedPriceColumnId)
        .maybeSingle();
      maxQueryElapsedMs = Math.max(maxQueryElapsedMs, getMenuSaveTraceElapsedMs(queryStartedAtMs));
      logMenuSaveTrace(trace, {
        stage: "time-sale-prepare",
        status: priceColumnError ? "error" : "success",
        operation: "validate-price-columns",
        table: "menu_category_price_columns",
        queryIndex: selectQueryCount,
        rowCount: priceColumn ? 1 : 0,
        elapsedMs: getMenuSaveTraceElapsedMs(queryStartedAtMs),
        ...getSafeSupabaseErrorFields(priceColumnError),
      });

      if (priceColumnError) {
        stageEnd("error", { operation: "validate-price-columns", ...getSafeSupabaseErrorFields(priceColumnError) });
        redirectToMenuEditWithError(menuId, `타임세일 옵션 컬럼 확인에 실패했습니다: ${priceColumnError.message}`);
      }
      if (!priceColumn) {
        if (draft.promotionId && existingPromotionIdSet.has(draft.promotionId)) continue;
        redirectToMenuEditWithError(menuId, "선택한 옵션 가격을 찾을 수 없습니다.");
      }
      if (priceColumn.visible === false) {
        redirectToMenuEditWithError(menuId, "숨김 처리된 옵션 가격에는 타임세일을 적용할 수 없습니다.");
      }
      if (priceColumn.category_id !== menuItem.category_id) {
        redirectToMenuEditWithError(menuId, "선택한 옵션 가격이 이 메뉴의 카테고리에 속하지 않습니다.");
      }

      selectQueryCount += 1;
      queryStartedAtMs = Date.now();
      const { data: priceColumnValue, error: priceColumnValueError } = await supabase
        .from("menu_item_price_column_values")
        .select("price, visible")
        .eq("menu_item_id", resolvedItemId)
        .eq("price_column_id", resolvedPriceColumnId)
        .eq("visible", true)
        .maybeSingle();
      maxQueryElapsedMs = Math.max(maxQueryElapsedMs, getMenuSaveTraceElapsedMs(queryStartedAtMs));
      logMenuSaveTrace(trace, {
        stage: "time-sale-prepare",
        status: priceColumnValueError ? "error" : "success",
        operation: "validate-target-price-column-values",
        table: "menu_item_price_column_values",
        queryIndex: selectQueryCount,
        rowCount: priceColumnValue ? 1 : 0,
        elapsedMs: getMenuSaveTraceElapsedMs(queryStartedAtMs),
        ...getSafeSupabaseErrorFields(priceColumnValueError),
      });

      if (priceColumnValueError) {
        stageEnd("error", { operation: "validate-target-price-column-values", ...getSafeSupabaseErrorFields(priceColumnValueError) });
        redirectToMenuEditWithError(menuId, `타임세일 대상 메뉴 옵션 컬럼 가격 확인에 실패했습니다: ${priceColumnValueError.message}`);
      }
      if (!priceColumnValue || typeof priceColumnValue.price !== "number" || !Number.isFinite(priceColumnValue.price) || priceColumnValue.price <= 0) {
        if (draft.promotionId && existingPromotionIdSet.has(draft.promotionId)) continue;
        redirectToMenuEditWithError(menuId, "타임세일을 적용할 옵션 가격을 하나 이상 입력해주세요.");
      }

      originalTargetPrice = priceColumnValue.price;
      priceColumnLabel = priceColumn.label;
    }

    if (!Number.isFinite(originalTargetPrice) || originalTargetPrice <= 0) {
      redirectToMenuEditWithError(menuId, "숫자 가격이 있는 메뉴만 타임세일을 사용할 수 있습니다.");
    }
    if (target.salePrice >= originalTargetPrice) {
      redirectToMenuEditWithError(menuId, "타임세일 가격은 기존 가격보다 낮아야 합니다.");
    }

    preparedTargets.push({
      targetId: target.targetId,
      menu_item_id: resolvedItemId,
      price_column_id: resolvedPriceColumnId,
      sale_price: target.salePrice,
      sale_price_label: target.salePriceLabel,
      visible: target.visible,
      settings: {},
      itemName: menuItem.name,
      priceColumnLabel,
    });
  }

  if (preparedTargets.length === 0) {
    if (draft.promotionId && existingPromotionIdSet.has(draft.promotionId)) {
      stageEnd("success", { preparedTargetCount: 0, selectQueryCount, maxQueryElapsedMs, skipped: true });
      return null;
    }
    stageEnd("error", { preparedTargetCount: 0, selectQueryCount, maxQueryElapsedMs });
    redirectToMenuEditWithError(menuId, "타임세일을 적용할 옵션 가격을 하나 이상 입력해주세요.");
  }

  const promotionPayload: MenuPromotionInsert = {
    menu_site_id: menuId,
    type: TIME_SALE_TYPE,
    name: draft.name,
    active: draft.active,
    schedule_type: draft.scheduleType,
    starts_at: draft.startsAt.toISOString(),
    ends_at: draft.endsAt.toISOString(),
    daily_start_time: draft.dailyStartTime,
    daily_end_time: draft.dailyEndTime,
    timezone: TIME_SALE_TIMEZONE,
    settings: getTimeSaleSettingsJson({
      timeDisplayMode: draft.timeDisplayMode,
      displayText: draft.displayText,
      badgeText: draft.badgeText,
      badgeBackgroundColor: draft.badgeBackgroundColor,
    }),
  };

  const result = {
    promotionId: draft.promotionId,
    promotion: promotionPayload,
    items: preparedTargets,
    validationEntry: {
      id: draft.promotionId ?? draft.clientKey,
      name: draft.name,
      scheduleType: draft.scheduleType,
      startsAt: draft.startsAt.toISOString(),
      endsAt: draft.endsAt.toISOString(),
      dailyStartTime: draft.dailyStartTime,
      dailyEndTime: draft.dailyEndTime,
      targets: preparedTargets
        .filter((target) => target.visible !== false)
        .map((target) => ({
          menuItemId: target.menu_item_id,
          itemName: target.itemName,
          priceColumnId: target.price_column_id ?? null,
          priceColumnLabel: target.priceColumnLabel,
      })),
    },
  };
  stageEnd("success", {
    preparedTargetCount: preparedTargets.length,
    selectQueryCount,
    maxQueryElapsedMs,
  });
  return result;
}

async function buildExistingTimeSaleValidationEntries({
  supabase,
  menuId,
  existingPromotions,
  existingPromotionItems,
  excludedPromotionIds,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  existingPromotions: MenuPromotionRow[];
  existingPromotionItems: MenuPromotionItemRow[];
  excludedPromotionIds: Set<string>;
}) {
  const retainedItems = existingPromotionItems.filter((item) => !excludedPromotionIds.has(item.promotion_id) && item.visible !== false);
  const itemIds = Array.from(new Set(retainedItems.map((item) => item.menu_item_id)));
  const priceColumnIds = Array.from(new Set(retainedItems.map((item) => item.price_column_id).filter((id): id is string => Boolean(id))));

  const { data: menuItems, error: menuItemsError } = itemIds.length > 0
    ? await supabase.from("menu_items").select("id, name").in("id", itemIds)
    : { data: [], error: null };
  if (menuItemsError) {
    redirectToMenuEditWithError(menuId, `기존 타임세일 메뉴 확인에 실패했습니다: ${menuItemsError.message}`);
  }

  const { data: priceColumns, error: priceColumnsError } = priceColumnIds.length > 0
    ? await supabase.from("menu_category_price_columns").select("id, label").in("id", priceColumnIds)
    : { data: [], error: null };
  if (priceColumnsError) {
    redirectToMenuEditWithError(menuId, `기존 타임세일 옵션 컬럼 확인에 실패했습니다: ${priceColumnsError.message}`);
  }

  const itemNameById = new Map((menuItems ?? []).map((item) => [item.id, item.name]));
  const priceColumnLabelById = new Map((priceColumns ?? []).map((column) => [column.id, column.label]));
  const targetsByPromotionId = new Map<string, TimeSaleValidationEntry["targets"]>();
  retainedItems.forEach((item) => {
    const targets = targetsByPromotionId.get(item.promotion_id) ?? [];
    targets.push({
      menuItemId: item.menu_item_id,
      itemName: itemNameById.get(item.menu_item_id) ?? "메뉴",
      priceColumnId: item.price_column_id,
      priceColumnLabel: item.price_column_id ? priceColumnLabelById.get(item.price_column_id) ?? null : null,
    });
    targetsByPromotionId.set(item.promotion_id, targets);
  });

  return existingPromotions
    .filter((promotion) => !excludedPromotionIds.has(promotion.id))
    .map((promotion) => ({
      id: promotion.id,
      name: promotion.name,
      scheduleType: promotion.schedule_type,
      startsAt: promotion.starts_at,
      endsAt: promotion.ends_at,
      dailyStartTime: promotion.daily_start_time,
      dailyEndTime: promotion.daily_end_time,
      targets: targetsByPromotionId.get(promotion.id) ?? [],
    }))
    .filter((entry) => entry.targets.length > 0);
}

async function syncPreparedTimeSaleTargets({
  supabase,
  menuId,
  promotionId,
  items,
  existingTargets,
  trace,
  promotionIndex,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  promotionId: string;
  items: PreparedTimeSaleTarget[];
  existingTargets: MenuPromotionItemRow[];
  trace?: MenuSaveTraceContext | null;
  promotionIndex?: number;
}) {
  const stageEnd = startMenuSaveTraceStage(trace, "time-sale-target-write", {
    operation: "function",
    table: "menu_promotion_items",
    promotionIndex: promotionIndex ?? null,
    entryCount: items.length,
    existingTargetCount: existingTargets.length,
  });
  const existingById = new Map(existingTargets.map((target) => [target.id, target]));
  const existingByKey = new Map(existingTargets.map((target) => [getPromotionItemTargetKey(target), target]));
  const keptTargetIds = new Set<string>();
  let updateQueryCount = 0;
  let insertQueryCount = 0;
  let deleteQueryCount = 0;
  let unchangedQueryCount = 0;
  let maxQueryElapsedMs = 0;
  let writeElapsedMs = 0;

  for (const item of items) {
    const key = `${item.menu_item_id}:${item.price_column_id ?? "single"}`;
    const existingTarget =
      item.targetId && existingById.has(item.targetId)
        ? existingById.get(item.targetId)
        : existingByKey.get(key);
    const payload: MenuPromotionItemUpdate = {
      menu_item_id: item.menu_item_id,
      price_column_id: item.price_column_id,
      sale_price: item.sale_price,
      sale_price_label: item.sale_price_label,
      visible: item.visible,
      settings: item.settings,
    };

    if (existingTarget) {
      keptTargetIds.add(existingTarget.id);
      if (isMenuPromotionTargetUnchanged(existingTarget, payload)) {
        unchangedQueryCount += 1;
        continue;
      }

      updateQueryCount += 1;
      const queryStartedAtMs = Date.now();
      const { error } = await supabase
        .from("menu_promotion_items")
        .update(payload)
        .eq("id", existingTarget.id)
        .eq("promotion_id", promotionId);
      const updateElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
      writeElapsedMs += updateElapsedMs;
      maxQueryElapsedMs = Math.max(maxQueryElapsedMs, updateElapsedMs);
      logMenuSaveTrace(trace, {
        stage: "time-sale-target-write",
        status: error ? "error" : "success",
        operation: "update-target",
        table: "menu_promotion_items",
        promotionIndex: promotionIndex ?? null,
        queryIndex: updateQueryCount,
        rowCount: 1,
        elapsedMs: updateElapsedMs,
        ...getSafeSupabaseErrorFields(error),
      });
      if (error) {
        stageEnd("error", { operation: "update-target", queryIndex: updateQueryCount, ...getSafeSupabaseErrorFields(error) });
        redirectToMenuEditWithError(menuId, `타임세일 대상 메뉴 저장에 실패했습니다: ${error.message}`);
      }
      continue;
    }

    const insertPayload: MenuPromotionItemInsert = {
      promotion_id: promotionId,
      menu_item_id: item.menu_item_id,
      price_column_id: item.price_column_id,
      sale_price: item.sale_price,
      sale_price_label: item.sale_price_label,
      visible: item.visible,
      settings: item.settings,
    };
    insertQueryCount += 1;
    const queryStartedAtMs = Date.now();
    const { data, error } = await supabase.from("menu_promotion_items").insert(insertPayload).select("id").single();
    const insertElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
    writeElapsedMs += insertElapsedMs;
    maxQueryElapsedMs = Math.max(maxQueryElapsedMs, insertElapsedMs);
    logMenuSaveTrace(trace, {
      stage: "time-sale-target-write",
      status: error ? "error" : "success",
      operation: "insert-target",
      table: "menu_promotion_items",
      promotionIndex: promotionIndex ?? null,
      queryIndex: insertQueryCount,
      rowCount: data?.id ? 1 : 0,
      elapsedMs: insertElapsedMs,
      ...getSafeSupabaseErrorFields(error),
    });
    if (error) {
      stageEnd("error", { operation: "insert-target", queryIndex: insertQueryCount, ...getSafeSupabaseErrorFields(error) });
      redirectToMenuEditWithError(menuId, `타임세일 대상 메뉴 저장에 실패했습니다: ${error.message}`);
    }
    if (data?.id) keptTargetIds.add(data.id);
  }

  const targetIdsToDelete = existingTargets.map((target) => target.id).filter((targetId) => !keptTargetIds.has(targetId)).sort();
  if (targetIdsToDelete.length > 0) {
    deleteQueryCount += 1;
    const queryStartedAtMs = Date.now();
    const { error } = await supabase
      .from("menu_promotion_items")
      .delete()
      .eq("promotion_id", promotionId)
      .in("id", targetIdsToDelete);
    const deleteElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
    writeElapsedMs += deleteElapsedMs;
    maxQueryElapsedMs = Math.max(maxQueryElapsedMs, deleteElapsedMs);
    logMenuSaveTrace(trace, {
      stage: "time-sale-target-write",
      status: error ? "error" : "success",
      operation: "delete-removed-target",
      table: "menu_promotion_items",
      promotionIndex: promotionIndex ?? null,
      queryIndex: deleteQueryCount,
      rowCount: targetIdsToDelete.length,
      elapsedMs: deleteElapsedMs,
      ...getSafeSupabaseErrorFields(error),
    });
    if (error) {
      stageEnd("error", { operation: "delete-removed-target", queryIndex: deleteQueryCount, ...getSafeSupabaseErrorFields(error) });
      redirectToMenuEditWithError(menuId, `타임세일 대상 메뉴 정리에 실패했습니다: ${error.message}`);
    }
  }

  stageEnd("success", {
    updateQueryCount,
    insertQueryCount,
    deleteQueryCount,
    unchangedQueryCount,
    existingCount: existingTargets.length,
    keptTargetCount: keptTargetIds.size,
    deletedTargetCount: targetIdsToDelete.length,
    writeElapsedMs,
    maxQueryElapsedMs,
  });

  return {
    updateQueryCount,
    insertQueryCount,
    deleteQueryCount,
    unchangedQueryCount,
    existingCount: existingTargets.length,
    writeElapsedMs,
    maxQueryElapsedMs,
  };
}

async function syncMenuTimeSalesFromPayload({
  supabase,
  menuId,
  menuSite,
  payload,
  cafeAStarterResetFinalSavePayload,
  itemIdMap,
  priceColumnIdMap,
  deletedItemIdSet,
  trace,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  menuSite: MenuSite;
  payload: MenuTimeSaleSavePayload | null;
  cafeAStarterResetFinalSavePayload: CafeAStarterResetFinalSavePayload | null;
  itemIdMap: Map<string, string>;
  priceColumnIdMap: Map<string, string>;
  deletedItemIdSet: Set<string>;
  trace?: MenuSaveTraceContext | null;
}) {
  const stageEnd = startMenuSaveTraceStage(trace, "time-sale-save", {
    operation: "function",
    mode: payload?.mode ?? null,
    entryCount: payload?.entries.length ?? 0,
    deletedPromotionIdCount: payload?.deletedPromotionIds.length ?? 0,
  });
  let selectQueryCount = 0;
  let promotionUpdateQueryCount = 0;
  let promotionInsertQueryCount = 0;
  let promotionDeleteQueryCount = 0;
  let unchangedPromotionCount = 0;
  let targetUpdateQueryCount = 0;
  let targetInsertQueryCount = 0;
  let targetDeleteQueryCount = 0;
  let unchangedTargetCount = 0;
  let selectElapsedMs = 0;
  let writeElapsedMs = 0;
  let maxQueryElapsedMs = 0;
  if (!payload) {
    stageEnd("success", { skipped: true, reason: "no-payload" });
    return;
  }

  const canUseTimeSales = isBasicTimeSaleTemplate(menuSite.template_key, menuSite.template_category);
  if (!canUseTimeSales) {
    if (payload.entries.length > 0 || payload.deletedPromotionIds.length > 0) {
      stageEnd("error", { reason: "unsupported-template", entryCount: payload.entries.length });
      redirectToMenuEditWithError(menuId, "이 템플릿에서는 타임세일을 사용할 수 없습니다.");
    }
    stageEnd("success", { skipped: true, reason: "unsupported-template" });
    return;
  }

  if (payload.mode === "replace" && !cafeAStarterResetFinalSavePayload) {
    stageEnd("error", { reason: "replace-not-allowed" });
    redirectToMenuEditWithError(menuId, "타임세일 전체 교체는 오브커피 샘플 초기화 저장에서만 사용할 수 있습니다.");
  }

  const normalizedDrafts = payload.entries.map((entry) => normalizeMenuTimeSaleDraft(menuId, entry));
  const persistedEntryCount = normalizedDrafts.filter((draft) => Boolean(draft.promotionId)).length;
  const newEntryCount = normalizedDrafts.length - persistedEntryCount;
  const normalizedTargetCount = normalizedDrafts.reduce((count, draft) => count + draft.targets.length, 0);
  logMenuSaveTrace(trace, {
    stage: "time-sale-save",
    status: "success",
    operation: "payload-normalized",
    mode: payload.mode,
    entryCount: normalizedDrafts.length,
    targetCount: normalizedTargetCount,
    persistedEntryCount,
    newEntryCount,
    deletedPromotionIdCount: payload.deletedPromotionIds.length,
  });
  const seenEntryKeys = new Set<string>();
  for (const draft of normalizedDrafts) {
    const entryKey = draft.promotionId ? `promotion:${draft.promotionId}` : draft.clientKey;
    if (seenEntryKeys.has(entryKey)) {
      redirectToMenuEditWithError(menuId, "같은 타임세일 저장 항목이 중복되었습니다. 새로고침 후 다시 시도해주세요.");
    }
    seenEntryKeys.add(entryKey);
  }
  const promotionIdsInEntries = new Set(normalizedDrafts.map((draft) => draft.promotionId).filter((id): id is string => Boolean(id)));
  const deletedPromotionIds = Array.from(new Set(payload.deletedPromotionIds.map((id) => normalizeDraftString(id)).filter(Boolean)));
  if (payload.mode === "replace" && deletedPromotionIds.length > 0) {
    redirectToMenuEditWithError(menuId, "오브커피 샘플 초기화에는 개별 타임세일 삭제 요청을 함께 보낼 수 없습니다.");
  }
  const invalidDeletedPromotionId = deletedPromotionIds.find((id) => !isUuid(id));
  if (invalidDeletedPromotionId) {
    redirectToMenuEditWithError(menuId, "타임세일 삭제 요청 ID를 확인해주세요.");
  }
  const deletedPromotionIdSet = new Set(deletedPromotionIds);
  const entryAlsoDeleted = Array.from(promotionIdsInEntries).find((promotionId) => deletedPromotionIdSet.has(promotionId));
  if (entryAlsoDeleted) {
    redirectToMenuEditWithError(menuId, "삭제할 타임세일과 저장할 타임세일이 중복되었습니다. 새로고침 후 다시 시도해주세요.");
  }

  selectQueryCount += 1;
  let queryStartedAtMs = Date.now();
  const { data: existingPromotionsData, error: existingPromotionsError } = await supabase
    .from("menu_promotions")
    .select("*")
    .eq("menu_site_id", menuId)
    .eq("type", TIME_SALE_TYPE);
  const existingPromotionsElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
  selectElapsedMs += existingPromotionsElapsedMs;
  maxQueryElapsedMs = Math.max(maxQueryElapsedMs, existingPromotionsElapsedMs);
  logMenuSaveTrace(trace, {
    stage: "time-sale-save",
    status: existingPromotionsError ? "error" : "success",
    operation: "select-existing-promotions",
    table: "menu_promotions",
    queryIndex: selectQueryCount,
    rowCount: existingPromotionsData?.length ?? 0,
    elapsedMs: existingPromotionsElapsedMs,
    ...getSafeSupabaseErrorFields(existingPromotionsError),
  });

  const missingPromotionTable =
    existingPromotionsError &&
    (existingPromotionsError.message.toLowerCase().includes("menu_promotions") ||
      existingPromotionsError.message.toLowerCase().includes("does not exist") ||
      existingPromotionsError.code === "42P01");
  if (missingPromotionTable) {
    if (payload.entries.length > 0 || deletedPromotionIds.length > 0) {
      stageEnd("error", { operation: "select-existing-promotions", reason: "missing-table" });
      redirectToMenuEditWithError(menuId, "타임세일 저장 테이블을 찾을 수 없습니다.");
    }
    stageEnd("success", { skipped: true, reason: "missing-table" });
    return;
  }
  if (existingPromotionsError) {
    stageEnd("error", { operation: "select-existing-promotions", ...getSafeSupabaseErrorFields(existingPromotionsError) });
    redirectToMenuEditWithError(menuId, `타임세일 기존 설정 확인에 실패했습니다: ${existingPromotionsError.message}`);
  }

  const existingPromotions = (existingPromotionsData ?? []) as MenuPromotionRow[];
  const existingPromotionIdSet = new Set(existingPromotions.map((promotion) => promotion.id));
  const existingPromotionById = new Map(existingPromotions.map((promotion) => [promotion.id, promotion]));
  const invalidEntryPromotionId = Array.from(promotionIdsInEntries).find((promotionId) => !existingPromotionIdSet.has(promotionId));
  if (invalidEntryPromotionId) {
    redirectToMenuEditWithError(menuId, "수정할 타임세일이 현재 메뉴판에 없습니다. 새로고침 후 다시 시도해주세요.");
  }
  const invalidDeletedOwnedId = deletedPromotionIds.find((promotionId) => !existingPromotionIdSet.has(promotionId));
  if (invalidDeletedOwnedId && payload.mode === "merge") {
    redirectToMenuEditWithError(menuId, "삭제할 타임세일이 현재 메뉴판에 없습니다. 새로고침 후 다시 시도해주세요.");
  }

  const existingPromotionIds = existingPromotions.map((promotion) => promotion.id);
  selectQueryCount += existingPromotionIds.length > 0 ? 1 : 0;
  queryStartedAtMs = Date.now();
  const { data: existingPromotionItemsData, error: existingPromotionItemsError } = existingPromotionIds.length > 0
    ? await supabase
        .from("menu_promotion_items")
        .select("*")
        .in("promotion_id", existingPromotionIds)
    : { data: [], error: null };
  const existingTargetsElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
  selectElapsedMs += existingTargetsElapsedMs;
  maxQueryElapsedMs = Math.max(maxQueryElapsedMs, existingTargetsElapsedMs);
  logMenuSaveTrace(trace, {
    stage: "time-sale-save",
    status: existingPromotionItemsError ? "error" : "success",
    operation: "select-existing-targets-for-menu",
    table: "menu_promotion_items",
    queryIndex: selectQueryCount,
    rowCount: existingPromotionItemsData?.length ?? 0,
    elapsedMs: existingTargetsElapsedMs,
    ...getSafeSupabaseErrorFields(existingPromotionItemsError),
  });
  if (existingPromotionItemsError) {
    stageEnd("error", { operation: "select-existing-targets-for-menu", ...getSafeSupabaseErrorFields(existingPromotionItemsError) });
    redirectToMenuEditWithError(menuId, `타임세일 기존 대상 확인에 실패했습니다: ${existingPromotionItemsError.message}`);
  }
  const existingPromotionItems = (existingPromotionItemsData ?? []) as MenuPromotionItemRow[];
  const existingTargetsByPromotionId = new Map<string, MenuPromotionItemRow[]>();
  existingPromotionItems.forEach((item) => {
    const targets = existingTargetsByPromotionId.get(item.promotion_id) ?? [];
    targets.push(item);
    existingTargetsByPromotionId.set(item.promotion_id, targets);
  });

  const preparedTimeSales: PreparedTimeSale[] = [];
  const promotionIdsToDeleteBecauseEmpty: string[] = [];
  for (const draft of normalizedDrafts) {
    const prepared = await prepareMenuTimeSaleForSave({
      supabase,
      menuId,
      draft,
      itemIdMap,
      priceColumnIdMap,
      deletedItemIdSet,
      existingPromotionIdSet,
      trace,
    });
    if (!prepared) {
      if (draft.promotionId) promotionIdsToDeleteBecauseEmpty.push(draft.promotionId);
      continue;
    }
    if (prepared.validationEntry.targets.length > 0) {
      preparedTimeSales.push(prepared);
    }
  }

  const effectiveDeletedPromotionIds = new Set([
    ...deletedPromotionIds,
    ...promotionIdsToDeleteBecauseEmpty,
  ]);
  const nextPromotionCount =
    payload.mode === "replace"
      ? preparedTimeSales.length
      : existingPromotions.filter((promotion) => !promotionIdsInEntries.has(promotion.id) && !effectiveDeletedPromotionIds.has(promotion.id)).length +
        preparedTimeSales.length;
  const limitError = validateTimeSaleLimit(nextPromotionCount);
  if (limitError) {
    redirectToMenuEditWithError(menuId, limitError);
  }

  const excludedFromExistingValidation = new Set<string>([
    ...Array.from(promotionIdsInEntries),
    ...Array.from(effectiveDeletedPromotionIds),
  ]);
  const existingValidationEntries = payload.mode === "replace"
    ? []
    : await buildExistingTimeSaleValidationEntries({
        supabase,
        menuId,
        existingPromotions,
        existingPromotionItems,
        excludedPromotionIds: excludedFromExistingValidation,
      });
  const overlapError = findOverlappingTimeSales([
    ...existingValidationEntries,
    ...preparedTimeSales.map((entry) => entry.validationEntry),
  ]);
  if (overlapError) {
    redirectToMenuEditWithError(menuId, overlapError);
  }

  if (payload.mode === "replace") {
    await deleteMenuTimeSalePromotions(supabase, menuId);
  }

  for (const [promotionIndex, preparedTimeSale] of preparedTimeSales.entries()) {
    let promotionId = preparedTimeSale.promotionId ?? "";
    if (promotionId) {
      const existingPromotion = existingPromotionById.get(promotionId);
      if (existingPromotion && isMenuPromotionUnchanged(existingPromotion, preparedTimeSale.promotion)) {
        unchangedPromotionCount += 1;
      } else {
        promotionUpdateQueryCount += 1;
        const updatePayload: MenuPromotionUpdate = {
          ...preparedTimeSale.promotion,
          updated_at: new Date().toISOString(),
        };
        delete updatePayload.menu_site_id;
        delete updatePayload.type;
        queryStartedAtMs = Date.now();
        const { error } = await supabase
          .from("menu_promotions")
          .update(updatePayload)
          .eq("id", promotionId)
          .eq("menu_site_id", menuId)
          .eq("type", TIME_SALE_TYPE);
        const updateElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
        writeElapsedMs += updateElapsedMs;
        maxQueryElapsedMs = Math.max(maxQueryElapsedMs, updateElapsedMs);
        logMenuSaveTrace(trace, {
          stage: "time-sale-save",
          status: error ? "error" : "success",
          operation: "update-promotion",
          table: "menu_promotions",
          promotionIndex,
          queryIndex: promotionUpdateQueryCount,
          rowCount: 1,
          elapsedMs: updateElapsedMs,
          unchangedRewrite: false,
          ...getSafeSupabaseErrorFields(error),
        });
        if (error) {
          stageEnd("error", { operation: "update-promotion", queryIndex: promotionUpdateQueryCount, ...getSafeSupabaseErrorFields(error) });
          redirectToMenuEditWithError(menuId, `타임세일 설정 저장에 실패했습니다: ${error.message}`);
        }
      }
    } else {
      const insertPayload: MenuPromotionInsert = {
        ...preparedTimeSale.promotion,
        menu_site_id: menuId,
        type: TIME_SALE_TYPE,
      };
      promotionInsertQueryCount += 1;
      queryStartedAtMs = Date.now();
      const { data, error } = await supabase.from("menu_promotions").insert(insertPayload).select("id").single();
      const insertElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
      writeElapsedMs += insertElapsedMs;
      maxQueryElapsedMs = Math.max(maxQueryElapsedMs, insertElapsedMs);
      logMenuSaveTrace(trace, {
        stage: "time-sale-save",
        status: error ? "error" : "success",
        operation: "insert-promotion",
        table: "menu_promotions",
        promotionIndex,
        queryIndex: promotionInsertQueryCount,
        rowCount: data?.id ? 1 : 0,
        elapsedMs: insertElapsedMs,
        ...getSafeSupabaseErrorFields(error),
      });
      if (error) {
        stageEnd("error", { operation: "insert-promotion", queryIndex: promotionInsertQueryCount, ...getSafeSupabaseErrorFields(error) });
        redirectToMenuEditWithError(menuId, `타임세일 설정 생성에 실패했습니다: ${error.message}`);
      }
      promotionId = data?.id ?? "";
      if (!promotionId) {
        redirectToMenuEditWithError(menuId, "타임세일 설정을 저장할 수 없습니다.");
      }
    }

    const targetSummary = await syncPreparedTimeSaleTargets({
      supabase,
      menuId,
      promotionId,
      items: preparedTimeSale.items,
      existingTargets: payload.mode === "replace" ? [] : existingTargetsByPromotionId.get(promotionId) ?? [],
      trace,
      promotionIndex,
    });
    targetUpdateQueryCount += targetSummary.updateQueryCount;
    targetInsertQueryCount += targetSummary.insertQueryCount;
    targetDeleteQueryCount += targetSummary.deleteQueryCount;
    unchangedTargetCount += targetSummary.unchangedQueryCount;
    writeElapsedMs += targetSummary.writeElapsedMs;
    maxQueryElapsedMs = Math.max(maxQueryElapsedMs, targetSummary.maxQueryElapsedMs);
  }

  if (payload.mode === "merge") {
    const promotionIdsToDelete = Array.from(effectiveDeletedPromotionIds).sort();
    if (promotionIdsToDelete.length > 0) {
      promotionDeleteQueryCount += 1;
      queryStartedAtMs = Date.now();
      await deleteSpecificMenuTimeSalePromotions(supabase, menuId, promotionIdsToDelete);
      const deleteElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
      writeElapsedMs += deleteElapsedMs;
      maxQueryElapsedMs = Math.max(maxQueryElapsedMs, deleteElapsedMs);
      logMenuSaveTrace(trace, {
        stage: "time-sale-save",
        status: "success",
        operation: "delete-explicit-promotions",
        table: "menu_promotions",
        queryIndex: promotionDeleteQueryCount,
        rowCount: promotionIdsToDelete.length,
        elapsedMs: deleteElapsedMs,
      });
    }
  }

  await cleanupZeroTargetTimeSalePromotions(supabase, menuId);
  stageEnd("success", {
    mode: payload.mode,
    entryCount: normalizedDrafts.length,
    targetCount: normalizedTargetCount,
    persistedEntryCount,
    newEntryCount,
    selectQueryCount,
    selectElapsedMs,
    writeElapsedMs,
    promotionUpdateQueryCount,
    promotionInsertQueryCount,
    promotionDeleteQueryCount,
    unchangedPromotionCount,
    targetUpdateQueryCount,
    targetInsertQueryCount,
    targetDeleteQueryCount,
    unchangedTargetCount,
    existingPromotionCount: existingPromotions.length,
    existingTargetCount: existingPromotionItems.length,
    preparedTimeSaleCount: preparedTimeSales.length,
    unchangedPromotionRewrite: false,
    maxQueryElapsedMs,
  });
}

async function syncBasicCategoryPriceColumnsFromDrafts({
  supabase,
  menuId,
  categoryDrafts,
  categoryIdMap,
  categoryIdDeleteSet,
  canManageCategoryPriceColumns,
  maxColumns,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  categoryDrafts: MenuManagementBasicCategoryDraft[];
  categoryIdMap: Map<string, string>;
  categoryIdDeleteSet: Set<string>;
  canManageCategoryPriceColumns: boolean;
  maxColumns: number;
}) {
  const priceColumnIdMap = new Map<string, string>();
  const draftsWithColumns = categoryDrafts.filter((category) => Array.isArray(category.priceColumns));
  if (!canManageCategoryPriceColumns) {
    const hasColumnPayload = draftsWithColumns.some((category) => (category.priceColumns ?? []).length > 0);
    if (hasColumnPayload) {
      redirectToMenuEditWithError(menuId, "이 템플릿에서는 가격 옵션 컬럼을 사용할 수 없습니다.");
    }
    return priceColumnIdMap;
  }

  const activeDrafts = draftsWithColumns
    .map((category) => {
      const draftCategoryId = normalizeDraftString(category.id);
      const resolvedCategoryId = categoryIdMap.get(draftCategoryId) ?? draftCategoryId;
      return {
        draftCategoryId,
        categoryId: resolvedCategoryId,
        columns: normalizeBasicPriceColumnDrafts(menuId, category.priceColumns, maxColumns),
      };
    })
    .filter((category) => category.categoryId && !categoryIdDeleteSet.has(category.draftCategoryId) && !categoryIdDeleteSet.has(category.categoryId));

  if (activeDrafts.length === 0) return priceColumnIdMap;

  const categoryIds = activeDrafts.map((category) => category.categoryId);
  const { data: categoriesData, error: categoriesError } = await supabase
    .from("menu_categories")
    .select("id")
    .eq("menu_site_id", menuId)
    .in("id", categoryIds);

  if (categoriesError) {
    redirectToMenuEditWithError(menuId, `가격 옵션 컬럼 카테고리 확인에 실패했습니다: ${categoriesError.message}`);
  }

  const categoryIdSet = new Set((categoriesData ?? []).map((category) => category.id));
  const invalidCategory = activeDrafts.find((category) => !categoryIdSet.has(category.categoryId));
  if (invalidCategory) {
    redirectToMenuEditWithError(menuId, "가격 옵션 컬럼을 저장할 카테고리를 찾지 못했습니다.");
  }

  const { data: existingColumns, error: existingColumnsError } = await supabase
    .from("menu_category_price_columns")
    .select("id, category_id")
    .eq("menu_site_id", menuId)
    .in("category_id", categoryIds);

  if (existingColumnsError) {
    redirectToMenuEditWithError(menuId, `가격 옵션 컬럼 기존 값 확인에 실패했습니다: ${existingColumnsError.message}`);
  }

  const existingByCategoryId = new Map<string, { id: string; category_id: string }[]>();
  (existingColumns ?? []).forEach((column) => {
    const entries = existingByCategoryId.get(column.category_id) ?? [];
    entries.push(column);
    existingByCategoryId.set(column.category_id, entries);
  });

  for (const draft of activeDrafts) {
    const existingForCategory = existingByCategoryId.get(draft.categoryId) ?? [];
    const existingIdSet = new Set(existingForCategory.map((column) => column.id));
    const nextIds = new Set(draft.columns.map((column) => column.id).filter((id): id is string => Boolean(id)));
    const idsToDelete = existingForCategory.map((column) => column.id).filter((id) => !nextIds.has(id));

    if (idsToDelete.length > 0) {
      const { error } = await supabase
        .from("menu_category_price_columns")
        .delete()
        .eq("menu_site_id", menuId)
        .eq("category_id", draft.categoryId)
        .in("id", idsToDelete);
      if (error) {
        redirectToMenuEditWithError(menuId, `가격 옵션 컬럼 삭제에 실패했습니다: ${error.message}`);
      }
    }

    for (const column of draft.columns) {
      if (column.id && existingIdSet.has(column.id)) {
        priceColumnIdMap.set(column.id, column.id);
        const payload: MenuCategoryPriceColumnUpdate = {
          key: column.key,
          label: column.label,
          visible: column.visible,
          sort_order: column.sortOrder,
          updated_at: new Date().toISOString(),
        };
        const { error } = await supabase
          .from("menu_category_price_columns")
          .update(payload)
          .eq("id", column.id)
          .eq("menu_site_id", menuId)
          .eq("category_id", draft.categoryId);
        if (error) {
          redirectToMenuEditWithError(menuId, `가격 옵션 컬럼 저장에 실패했습니다: ${error.message}`);
        }
        continue;
      }

      const payload: MenuCategoryPriceColumnInsert = {
        menu_site_id: menuId,
        category_id: draft.categoryId,
        key: column.key,
        label: column.label,
        visible: column.visible,
        sort_order: column.sortOrder,
        settings: {},
      };
      const { data, error } = await supabase.from("menu_category_price_columns").insert(payload).select("id").single();
      if (error) {
        redirectToMenuEditWithError(menuId, `가격 옵션 컬럼 생성에 실패했습니다: ${error.message}`);
      }
      if (column.id && data?.id) {
        priceColumnIdMap.set(column.id, data.id);
      }
    }
  }

  return priceColumnIdMap;
}

async function syncBasicItemPriceColumnValuesFromDrafts({
  supabase,
  menuId,
  itemDrafts,
  itemIdMap,
  priceColumnIdMap,
  deletedItemIdSet,
  categoryIdDeleteSet,
  canManageCategoryPriceColumns,
  trace,
}: {
  supabase: SupabaseServerClient;
  menuId: string;
  itemDrafts: MenuManagementBasicItemDraft[];
  itemIdMap: Map<string, string>;
  priceColumnIdMap: Map<string, string>;
  deletedItemIdSet: Set<string>;
  categoryIdDeleteSet: Set<string>;
  canManageCategoryPriceColumns: boolean;
  trace?: MenuSaveTraceContext | null;
}) {
  const stageEnd = startMenuSaveTraceStage(trace, "item-price-column-values-save", {
    operation: "function",
    table: "menu_item_price_column_values",
    draftItemCount: itemDrafts.length,
  });
  let updateQueryCount = 0;
  let insertQueryCount = 0;
  let deleteQueryCount = 0;
  let unchangedQueryCount = 0;
  let selectElapsedMs = 0;
  let writeElapsedMs = 0;
  let maxQueryElapsedMs = 0;
  const draftsWithValues = itemDrafts.filter((item) => Array.isArray(item.priceColumnValues));
  if (!canManageCategoryPriceColumns) {
    const hasValuePayload = draftsWithValues.some((item) => (item.priceColumnValues ?? []).length > 0);
    if (hasValuePayload) {
      stageEnd("error", { reason: "unsupported-price-columns", draftsWithValues: draftsWithValues.length });
      redirectToMenuEditWithError(menuId, "이 템플릿에서는 옵션 컬럼 가격을 사용할 수 없습니다.");
    }
    stageEnd("success", { skipped: true, reason: "unsupported-price-columns", draftsWithValues: draftsWithValues.length });
    return;
  }

  const activeDrafts = draftsWithValues
    .map((item) => {
      const draftItemId = normalizeDraftString(item.id);
      const resolvedItemId = itemIdMap.get(draftItemId) ?? draftItemId;
      const categoryId = normalizeDraftString(item.categoryId);
      return {
        draftItemId,
        itemId: resolvedItemId,
        categoryId,
        values: normalizeItemPriceColumnValueDrafts(menuId, item.priceColumnValues).map((value) => ({
          ...value,
          priceColumnId: priceColumnIdMap.get(value.priceColumnId) ?? value.priceColumnId,
        })),
      };
    })
    .filter((item) => item.itemId && !deletedItemIdSet.has(item.draftItemId) && !deletedItemIdSet.has(item.itemId) && !categoryIdDeleteSet.has(item.categoryId));

  if (activeDrafts.length === 0) {
    stageEnd("success", { skipped: true, reason: "no-active-drafts", draftsWithValues: draftsWithValues.length });
    return;
  }

  const itemIds = activeDrafts.map((item) => item.itemId);
  logMenuSaveTrace(trace, {
    stage: "item-price-column-values-save",
    status: "start",
    operation: "select-items",
    table: "menu_items",
    rowCount: itemIds.length,
  });
  let queryStartedAtMs = Date.now();
  const { data: menuItems, error: menuItemsError } = await supabase
    .from("menu_items")
    .select("id, category_id")
    .eq("menu_site_id", menuId)
    .in("id", itemIds);
  const menuItemsElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
  selectElapsedMs += menuItemsElapsedMs;
  maxQueryElapsedMs = Math.max(maxQueryElapsedMs, menuItemsElapsedMs);
  logMenuSaveTrace(trace, {
    stage: "item-price-column-values-save",
    status: menuItemsError ? "error" : "success",
    operation: "select-items",
    table: "menu_items",
    rowCount: menuItems?.length ?? 0,
    elapsedMs: menuItemsElapsedMs,
    ...getSafeSupabaseErrorFields(menuItemsError),
  });

  if (menuItemsError) {
    stageEnd("error", { operation: "select-items", ...getSafeSupabaseErrorFields(menuItemsError) });
    redirectToMenuEditWithError(menuId, `옵션 컬럼 가격 아이템 확인에 실패했습니다: ${menuItemsError.message}`);
  }

  const itemCategoryById = new Map((menuItems ?? []).map((item) => [item.id, item.category_id]));
  const invalidItem = activeDrafts.find((item) => !itemCategoryById.has(item.itemId));
  if (invalidItem) {
    redirectToMenuEditWithError(menuId, "옵션 컬럼 가격을 저장할 아이템을 찾지 못했습니다.");
  }

  const priceColumnIds = Array.from(new Set(activeDrafts.flatMap((item) => item.values.map((value) => value.priceColumnId))));
  queryStartedAtMs = Date.now();
  const { data: priceColumns, error: priceColumnsError } = priceColumnIds.length > 0
    ? await supabase
        .from("menu_category_price_columns")
        .select("id, category_id")
        .eq("menu_site_id", menuId)
        .in("id", priceColumnIds)
    : { data: [], error: null };
  const priceColumnsElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
  selectElapsedMs += priceColumnsElapsedMs;
  maxQueryElapsedMs = Math.max(maxQueryElapsedMs, priceColumnsElapsedMs);
  logMenuSaveTrace(trace, {
    stage: "item-price-column-values-save",
    status: priceColumnsError ? "error" : "success",
    operation: "select-price-columns",
    table: "menu_category_price_columns",
    rowCount: priceColumns?.length ?? 0,
    elapsedMs: priceColumnsElapsedMs,
    ...getSafeSupabaseErrorFields(priceColumnsError),
  });

  if (priceColumnsError) {
    stageEnd("error", { operation: "select-price-columns", ...getSafeSupabaseErrorFields(priceColumnsError) });
    redirectToMenuEditWithError(menuId, `옵션 컬럼 확인에 실패했습니다: ${priceColumnsError.message}`);
  }

  const columnCategoryById = new Map((priceColumns ?? []).map((column) => [column.id, column.category_id]));
  for (const draft of activeDrafts) {
    const itemCategoryId = itemCategoryById.get(draft.itemId) ?? "";
    for (const value of draft.values) {
      const columnCategoryId = columnCategoryById.get(value.priceColumnId);
      if (!columnCategoryId) {
        redirectToMenuEditWithError(menuId, "옵션 컬럼 가격을 저장할 컬럼을 찾지 못했습니다.");
      }
      if (columnCategoryId !== itemCategoryId) {
        redirectToMenuEditWithError(menuId, "아이템이 속한 카테고리의 옵션 컬럼 가격만 저장할 수 있습니다.");
      }
    }
  }

  queryStartedAtMs = Date.now();
  const { data: existingValues, error: existingValuesError } = await supabase
    .from("menu_item_price_column_values")
    .select("id, menu_item_id, price_column_id, price, price_label, visible")
    .in("menu_item_id", itemIds);
  const existingValuesElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
  selectElapsedMs += existingValuesElapsedMs;
  maxQueryElapsedMs = Math.max(maxQueryElapsedMs, existingValuesElapsedMs);
  logMenuSaveTrace(trace, {
    stage: "item-price-column-values-save",
    status: existingValuesError ? "error" : "success",
    operation: "select-existing",
    table: "menu_item_price_column_values",
    rowCount: existingValues?.length ?? 0,
    elapsedMs: existingValuesElapsedMs,
    ...getSafeSupabaseErrorFields(existingValuesError),
  });

  if (existingValuesError) {
    stageEnd("error", { operation: "select-existing", ...getSafeSupabaseErrorFields(existingValuesError) });
    redirectToMenuEditWithError(menuId, `기존 옵션 컬럼 가격 확인에 실패했습니다: ${existingValuesError.message}`);
  }

  const existingByItemId = new Map<string, MenuItemPriceColumnValueRow[]>();
  (existingValues ?? []).forEach((value) => {
    const entries = existingByItemId.get(value.menu_item_id) ?? [];
    entries.push(value as MenuItemPriceColumnValueRow);
    existingByItemId.set(value.menu_item_id, entries);
  });

  for (const draft of activeDrafts) {
    const existingForItem = existingByItemId.get(draft.itemId) ?? [];
    const existingById = new Map(existingForItem.map((value) => [value.id, value]));
    const existingByKey = new Map(existingForItem.map((value) => [`${value.menu_item_id}:${value.price_column_id}`, value]));
    const keptExistingValueIds = new Set<string>();

    for (const value of draft.values) {
      const existingValue =
        value.id && existingById.has(value.id)
          ? existingById.get(value.id)
          : existingByKey.get(`${draft.itemId}:${value.priceColumnId}`);

      if (existingValue) {
        keptExistingValueIds.add(existingValue.id);
        const payloadWithoutTimestamp: MenuItemPriceColumnValueUpdate = {
          price_column_id: value.priceColumnId,
          price: value.price,
          price_label: value.priceLabel,
          visible: value.visible,
        };
        if (isMenuItemPriceColumnValueUnchanged(existingValue, payloadWithoutTimestamp)) {
          unchangedQueryCount += 1;
          continue;
        }

        updateQueryCount += 1;
        const payload: MenuItemPriceColumnValueUpdate = {
          ...payloadWithoutTimestamp,
          updated_at: new Date().toISOString(),
        };
        queryStartedAtMs = Date.now();
        const { error } = await supabase
          .from("menu_item_price_column_values")
          .update(payload)
          .eq("id", existingValue.id)
          .eq("menu_item_id", draft.itemId);
        const updateElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
        writeElapsedMs += updateElapsedMs;
        maxQueryElapsedMs = Math.max(maxQueryElapsedMs, updateElapsedMs);
        logMenuSaveTrace(trace, {
          stage: "item-price-column-values-save",
          status: error ? "error" : "success",
          operation: "update",
          table: "menu_item_price_column_values",
          queryIndex: updateQueryCount,
          rowCount: 1,
          elapsedMs: updateElapsedMs,
          ...getSafeSupabaseErrorFields(error),
        });
        if (error) {
          stageEnd("error", { operation: "update", queryIndex: updateQueryCount, ...getSafeSupabaseErrorFields(error) });
          redirectToMenuEditWithError(menuId, `옵션 컬럼 가격 저장에 실패했습니다: ${error.message}`);
        }
        continue;
      }

      insertQueryCount += 1;
      const payload: MenuItemPriceColumnValueInsert = {
        menu_item_id: draft.itemId,
        price_column_id: value.priceColumnId,
        price: value.price,
        price_label: value.priceLabel,
        visible: value.visible,
        settings: {},
      };
      queryStartedAtMs = Date.now();
      const { error } = await supabase.from("menu_item_price_column_values").insert(payload);
      const insertElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
      writeElapsedMs += insertElapsedMs;
      maxQueryElapsedMs = Math.max(maxQueryElapsedMs, insertElapsedMs);
      logMenuSaveTrace(trace, {
        stage: "item-price-column-values-save",
        status: error ? "error" : "success",
        operation: "insert",
        table: "menu_item_price_column_values",
        queryIndex: insertQueryCount,
        rowCount: 1,
        elapsedMs: insertElapsedMs,
        ...getSafeSupabaseErrorFields(error),
      });
      if (error) {
        stageEnd("error", { operation: "insert", queryIndex: insertQueryCount, ...getSafeSupabaseErrorFields(error) });
        redirectToMenuEditWithError(menuId, `옵션 컬럼 가격 생성에 실패했습니다: ${error.message}`);
      }
    }

    const idsToDelete = existingForItem
      .map((value) => value.id)
      .filter((id) => !keptExistingValueIds.has(id))
      .sort();

    if (idsToDelete.length > 0) {
      deleteQueryCount += 1;
      queryStartedAtMs = Date.now();
      const { error } = await supabase
        .from("menu_item_price_column_values")
        .delete()
        .in("id", idsToDelete);
      const deleteElapsedMs = getMenuSaveTraceElapsedMs(queryStartedAtMs);
      writeElapsedMs += deleteElapsedMs;
      maxQueryElapsedMs = Math.max(maxQueryElapsedMs, deleteElapsedMs);
      logMenuSaveTrace(trace, {
        stage: "item-price-column-values-save",
        status: error ? "error" : "success",
        operation: "delete",
        table: "menu_item_price_column_values",
        queryIndex: deleteQueryCount,
        rowCount: idsToDelete.length,
        elapsedMs: deleteElapsedMs,
        ...getSafeSupabaseErrorFields(error),
      });
      if (error) {
        stageEnd("error", { operation: "delete", queryIndex: deleteQueryCount, ...getSafeSupabaseErrorFields(error) });
        redirectToMenuEditWithError(menuId, `옵션 컬럼 가격 삭제에 실패했습니다: ${error.message}`);
      }
    }
  }

  stageEnd("success", {
    activeDraftCount: activeDrafts.length,
    uniqueItemCount: itemIds.length,
    uniquePriceColumnCount: priceColumnIds.length,
    updateQueryCount,
    insertQueryCount,
    deleteQueryCount,
    unchangedQueryCount,
    existingCount: existingValues?.length ?? 0,
    selectElapsedMs,
    writeElapsedMs,
    maxQueryElapsedMs,
  });
}

export async function saveMenuManagementBasicDraftAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const trace = createMenuSaveTrace(menuId);
  const actionEnd = startMenuSaveTraceStage(trace, "action", { operation: "saveMenuManagementBasicDraftAction" });
  const authorizationEnd = startMenuSaveTraceStage(trace, "authorization");
  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  authorizationEnd("success", { templateKey: menuSite.template_key, status: menuSite.status });
  const formParseEnd = startMenuSaveTraceStage(trace, "form-parse");
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  const menuWidgetFinalSaveDraftPayload = parseMenuWidgetFinalSavePayloadFromForm(
    menuId,
    formData,
    templateCapabilities.menuWidgets.enabled,
  );
  const cafeAStarterResetFinalSavePayload = parseCafeAStarterResetFinalSavePayloadFromForm({
    menuId,
    formData,
    menuSite,
  });
  const parsedMenuTimeSaleSavePayload = parseMenuTimeSaleSavePayloadFromForm(menuId, formData);
  const menuTimeSaleSavePayload =
    parsedMenuTimeSaleSavePayload ??
    (cafeAStarterResetFinalSavePayload
      ? createMenuTimeSaleSavePayloadFromCafeAStarterResetSnapshot(cafeAStarterResetFinalSavePayload.snapshot)
      : null);
  if (cafeAStarterResetFinalSavePayload && menuTimeSaleSavePayload?.mode !== "replace") {
    redirectToMenuEditWithError(menuId, "오브커피 샘플 타임세일 저장 방식이 올바르지 않습니다.");
  }
  const maxPriceOptionsPerItem = getMaxPriceOptionsPerItem(templateCapabilities);
  const now = new Date().toISOString();
  const pageDrafts = parseDraftArray<MenuManagementBasicPageDraft>(formData, "page_basic_drafts");
  let categoryDrafts = parseDraftArray<MenuManagementBasicCategoryDraft>(formData, "category_basic_drafts");
  const itemDrafts = parseDraftArray<MenuManagementBasicItemDraft>(formData, "item_basic_drafts");
  const deletedPageIds = parseDraftStringArray(formData, "deleted_page_ids");
  const deletedCategoryIds = parseDraftStringArray(formData, "deleted_category_ids");
  const deletedItemIds = parseDraftStringArray(formData, "deleted_item_ids");
  formParseEnd("success", {
    pageDraftCount: pageDrafts.length,
    categoryDraftCount: categoryDrafts.length,
    itemDraftCount: itemDrafts.length,
    deletedPageCount: deletedPageIds.length,
    deletedCategoryCount: deletedCategoryIds.length,
    deletedItemCount: deletedItemIds.length,
    hasWidgetPayload: Boolean(menuWidgetFinalSaveDraftPayload),
    hasTimeSalePayload: Boolean(menuTimeSaleSavePayload),
  });
  const atomicValidationEnd = startMenuSaveTraceStage(trace, "atomic-payload-validation", {
    hasStarterResetPayload: Boolean(cafeAStarterResetFinalSavePayload),
    hasWidgetPayload: Boolean(menuWidgetFinalSaveDraftPayload),
    hasTimeSalePayload: Boolean(menuTimeSaleSavePayload),
  });
  const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
  const editorServiceType = getMenuEditorServiceTypeForMenuSite(productKey, getTemplateType(menuSite.template_key));
  const menuEditorCapabilities = MENU_EDITOR_CAPABILITIES[editorServiceType];
  const canManageMenuPages = menuEditorCapabilities.canManageMenuPages;
  const canConfigureDisplayPages = canManageMenuPages && menuEditorCapabilities.supportsDisplayPageTypes;
  const usesCategoryPriceOptionColumns = Boolean(templateCapabilities.categoryPriceOptionColumns && templateCapabilities.priceOptions);
  const basicPricingCapabilities = getBasicPricingCapabilities(menuSite.template_key);
  const canManageCategoryPriceColumns = basicPricingCapabilities.supportsBasicPriceColumns;
  const supportsPriceDisplayMode = basicPricingCapabilities.supportsPriceDisplayMode;
  const supportsPriceNote = basicPricingCapabilities.supportsPriceNote;
  const supportsPriceNoteWithPriceColumns = basicPricingCapabilities.supportsPriceNoteWithPriceColumns;
  const pageManagementBlockedMessage = "메뉴링크 베이직은 1장 메뉴판으로 제공되어 페이지를 추가, 수정, 복사, 삭제하거나 정렬할 수 없습니다.";
  const pcTabletLayoutModeInput = formData.get("pc_tablet_layout_mode");
  const shouldSavePcTabletLayoutMode =
    typeof pcTabletLayoutModeInput === "string" && supportsPcTabletLayoutMode(menuSite.template_key);
  const priceDisplayModeInput = formData.get("price_display_mode");
  const shouldValidatePriceDisplayMode = supportsPriceDisplayMode && typeof priceDisplayModeInput === "string";
  if (shouldValidatePriceDisplayMode && !isPriceDisplayMode(priceDisplayModeInput)) {
    redirectToMenuEditWithError(menuId, "가격 표시 형식을 확인해주세요.");
  }
  const nextPriceDisplayMode =
    supportsPriceDisplayMode && isPriceDisplayMode(priceDisplayModeInput) ? priceDisplayModeInput : null;

  if (cafeAStarterResetFinalSavePayload) {
    validateCafeAStarterResetDraftAlignment({
      menuId,
      snapshot: cafeAStarterResetFinalSavePayload.snapshot,
      pageDrafts,
      categoryDrafts,
      itemDrafts,
      widgetPayload: menuWidgetFinalSaveDraftPayload,
      canManageMenuPages,
    });
    await assertCafeAStarterResetDeletedRowsBelongToMenuSite({
      supabase,
      menuId,
      snapshot: cafeAStarterResetFinalSavePayload.snapshot,
    });
  }
  atomicValidationEnd("success");

  const { data: previousItemsForFeaturedSlides, error: previousItemsForFeaturedSlidesError } = await supabase
    .from("menu_items")
    .select("id, name")
    .eq("menu_site_id", menuId);

  if (previousItemsForFeaturedSlidesError) {
    redirectToMenuEditWithError(menuId, `대표 슬라이드 상품 연결 기준 확인에 실패했습니다: ${previousItemsForFeaturedSlidesError.message}`);
  }

  const previousItemNameById = new Map(
    (previousItemsForFeaturedSlides ?? []).map((item) => [item.id, normalizeDraftString(item.name)])
  );

  if (!canManageMenuPages) {
    const samplePageDraftIds = new Set(
      pageDrafts
        .map((page) => normalizeDraftString(page.id))
        .filter((pageId) => pageId.startsWith("temp-page-sample-"))
    );
    const isSamplePageResetPayload =
      samplePageDraftIds.size > 0 &&
      pageDrafts.every((page) => {
        const pageId = normalizeDraftString(page.id);
        return pageId && samplePageDraftIds.has(pageId) && page.isNew === true;
      });

    const hasNewPageDraft = pageDrafts.some((page) => {
      const pageId = normalizeDraftString(page.id);
      return pageId && page.isNew === true && !samplePageDraftIds.has(pageId) && !deletedPageIds.includes(pageId);
    });
    if (hasNewPageDraft || (deletedPageIds.length > 0 && !isSamplePageResetPayload)) {
      redirectToMenuEditWithError(menuId, pageManagementBlockedMessage);
    }

    if (isSamplePageResetPayload) {
      const { data: defaultPages, error: defaultPagesError } = await supabase
        .from("menu_pages")
        .select("id")
        .eq("menu_site_id", menuId)
        .order("visible", { ascending: false })
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: true })
        .limit(1);

      if (defaultPagesError) {
        redirectToMenuEditWithError(menuId, `기본 페이지 확인에 실패했습니다: ${defaultPagesError.message}`);
      }

      const defaultPageId = defaultPages?.[0]?.id ?? "";
      if (!defaultPageId) {
        redirectToMenuEditWithError(menuId, "기본 메뉴 페이지를 찾을 수 없어 샘플로 되돌릴 수 없습니다.");
      }

      categoryDrafts = categoryDrafts.map((category) => {
        const pageId = normalizeDraftString(category.pageId);
        return samplePageDraftIds.has(pageId) ? { ...category, pageId: defaultPageId } : category;
      });
    }

    const existingPageIds = pageDrafts
      .map((page) => normalizeDraftString(page.id))
      .filter((pageId) => pageId && !pageId.startsWith("temp-"));
    if (existingPageIds.length > 0) {
      const { data: existingPages, error: existingPagesError } = await supabase
        .from("menu_pages")
        .select("id, title, description, description_visible, visible, sort_order")
        .eq("menu_site_id", menuId)
        .in("id", existingPageIds);

      if (existingPagesError) {
        redirectToMenuEditWithError(menuId, `페이지 변경 가능 여부 확인에 실패했습니다: ${existingPagesError.message}`);
      }

      const existingPageById = new Map((existingPages ?? []).map((page) => [page.id, page]));
      const hasPageChange = pageDrafts.some((page) => {
        const pageId = normalizeDraftString(page.id);
        if (!pageId || pageId.startsWith("temp-")) return false;
        const existingPage = existingPageById.get(pageId);
        if (!existingPage) return true;
        const nextDescriptionVisible =
          page.descriptionVisible === undefined ? Boolean(existingPage.description_visible) : normalizeDraftBoolean(page.descriptionVisible);
        const nextVisible = page.visible === undefined ? Boolean(existingPage.visible) : normalizeDraftBoolean(page.visible);
        const nextSortOrder = page.sortOrder === undefined ? normalizeDraftNumber(existingPage.sort_order) : normalizeDraftNumber(page.sortOrder);

        return (
          normalizeDraftString(page.title) !== normalizeDraftString(existingPage.title) ||
          normalizeDraftString(page.description) !== normalizeDraftString(existingPage.description) ||
          nextDescriptionVisible !== Boolean(existingPage.description_visible) ||
          nextVisible !== Boolean(existingPage.visible) ||
          nextSortOrder !== normalizeDraftNumber(existingPage.sort_order)
        );
      });

      if (hasPageChange) {
        redirectToMenuEditWithError(menuId, pageManagementBlockedMessage);
      }
    }
  }

  const effectivePageDrafts = canManageMenuPages ? pageDrafts : [];
  const effectiveDeletedPageIds = canManageMenuPages ? deletedPageIds : [];
  const newPageDraftCount = effectivePageDrafts.filter((page) => {
    const pageId = normalizeDraftString(page.id);
    return pageId && page.isNew === true && !effectiveDeletedPageIds.includes(pageId);
  }).length;

  if (effectiveDeletedPageIds.length > 0) {
    const { count: pageCount, error: pageCountError } = await supabase
      .from("menu_pages")
      .select("id", { count: "exact", head: true })
      .eq("menu_site_id", menuId);

    if (pageCountError) {
      redirectToMenuEditWithError(menuId, `페이지 삭제 가능 여부 확인에 실패했습니다: ${pageCountError.message}`);
    }

    if ((pageCount ?? 0) - effectiveDeletedPageIds.length + newPageDraftCount < 1) {
      redirectToMenuEditWithError(menuId, "최소 1개의 페이지는 필요합니다.");
    }
  }

  let categoryIdsFromDeletedPages: string[] = [];
  if (effectiveDeletedPageIds.length > 0) {
    const { data: pageCategories, error: pageCategoriesError } = await supabase
      .from("menu_categories")
      .select("id")
      .eq("menu_site_id", menuId)
      .in("menu_page_id", effectiveDeletedPageIds);

    if (pageCategoriesError) {
      redirectToMenuEditWithError(menuId, `삭제할 페이지의 카테고리 확인에 실패했습니다: ${pageCategoriesError.message}`);
    }

    categoryIdsFromDeletedPages = (pageCategories ?? []).map((category) => category.id);
  }

  const deletedPageIdSet = new Set(effectiveDeletedPageIds);
  const categoryIdsToDelete = Array.from(new Set([...deletedCategoryIds, ...categoryIdsFromDeletedPages]));
  const categoryIdDeleteSet = new Set(categoryIdsToDelete);
  const deletedItemIdSet = new Set(deletedItemIds);
  const existingItemIdsForBadgeCheck = Array.from(
    new Set(
      itemDrafts
        .map((item) => normalizeDraftString(item.id))
        .filter((itemId) => itemId && !itemId.startsWith("temp-") && !deletedItemIdSet.has(itemId))
    )
  );
  const originalBadgeLabelsByItemId = new Map<string, string>();
  let canCompareOriginalBadgeLabels = true;

  if (existingItemIdsForBadgeCheck.length > 0) {
    const { data: originalBadgeItems, error: originalBadgeItemsError } = await supabase
      .from("menu_items")
      .select("id, badge_label")
      .eq("menu_site_id", menuId)
      .in("id", existingItemIdsForBadgeCheck);

    if (isMissingBadgeLabelColumnError(originalBadgeItemsError)) {
      canCompareOriginalBadgeLabels = false;
    } else if (originalBadgeItemsError) {
      redirectToMenuEditWithError(menuId, `아이템 배지 정보 확인에 실패했습니다: ${originalBadgeItemsError.message}`);
    } else {
      (originalBadgeItems ?? []).forEach((item) => {
        originalBadgeLabelsByItemId.set(item.id, normalizeDraftString(item.badge_label));
      });
    }
  }

  for (const page of effectivePageDrafts) {
    const pageId = normalizeDraftString(page.id);
    const title = normalizeDraftString(page.title);
    if (!pageId || deletedPageIdSet.has(pageId)) continue;
    validateRequiredText(menuId, title, "페이지 이름", MENU_FIELD_LIMITS.menuPages.title);
    if (canConfigureDisplayPages) {
      validateMenuPageDisplaySettingsDraft(menuId, normalizeMenuPageDisplaySettings(page.displaySettings), templateCapabilities);
    }
  }

  if (canConfigureDisplayPages) {
    const promotionPageCount = effectivePageDrafts.filter((page) => {
      const pageId = normalizeDraftString(page.id);
      if (!pageId || deletedPageIdSet.has(pageId)) return false;
      return isPromotionDisplayPage(normalizeMenuPageDisplaySettings(page.displaySettings));
    }).length;

    if (promotionPageCount > MENU_LIMITS.maxPromotionPagesPerSite) {
      redirectToMenuEditWithError(menuId, `프로모션 페이지는 최대 ${MENU_LIMITS.maxPromotionPagesPerSite}개까지 추가할 수 있습니다.`);
    }
  }

  for (const category of categoryDrafts) {
    const categoryId = normalizeDraftString(category.id);
    const name = normalizeDraftString(category.name);
    if (!categoryId || categoryIdDeleteSet.has(categoryId)) continue;
    validateRequiredText(menuId, name, "메뉴 카테고리 이름", MENU_FIELD_LIMITS.menuCategories.name);
    if (usesCategoryPriceOptionColumns) {
      const labels = normalizeDraftPriceOptionLabels(category.priceOptionLabels, maxPriceOptionsPerItem);
      if (Array.isArray(category.priceOptionLabels) && category.priceOptionLabels.length > maxPriceOptionsPerItem) {
        redirectToMenuEditWithError(menuId, "가격 옵션 열은 최대 3개까지 사용할 수 있습니다.");
      }
      for (const label of labels) {
        validateRequiredText(menuId, label, "가격 옵션 열", MENU_FIELD_LIMITS.menuItemPriceOptions.label);
      }
    }
    if (Array.isArray(category.priceColumns)) {
      if (!canManageCategoryPriceColumns && category.priceColumns.length > 0) {
        redirectToMenuEditWithError(menuId, "이 템플릿에서는 가격 옵션 컬럼을 사용할 수 없습니다.");
      }
      if (canManageCategoryPriceColumns) {
        normalizeBasicPriceColumnDrafts(menuId, category.priceColumns, basicPricingCapabilities.maxCategoryPriceColumns);
      }
    }
  }

  const categoryPriceOptionLabelsById = new Map(
    categoryDrafts
      .map((category) => [normalizeDraftString(category.id), normalizeDraftPriceOptionLabels(category.priceOptionLabels, maxPriceOptionsPerItem)] as const)
      .filter(([categoryId]) => Boolean(categoryId))
  );

  for (const item of itemDrafts) {
    const itemId = normalizeDraftString(item.id);
    const name = normalizeDraftString(item.name);
    const setName = normalizeDraftString(item.setName);
    const description = normalizeDraftString(item.description);
    const originInfo = normalizeDraftString(item.originInfo);
    const singlePriceInputMode = item.singlePriceInputMode === "text" ? "text" : "number";
    const hasBasicPriceColumnPayload = canManageCategoryPriceColumns && Array.isArray(item.priceColumnValues);
    const normalizedBasicPriceColumnValues = hasBasicPriceColumnPayload
      ? normalizeItemPriceColumnValueDrafts(menuId, item.priceColumnValues)
      : [];
    const hasBasicPriceColumnDrafts = normalizedBasicPriceColumnValues.length > 0;
    const usesDirectPriceText = canManageCategoryPriceColumns && !hasBasicPriceColumnDrafts && singlePriceInputMode === "text";
    const usesLegacyOptionDrafts = normalizeDraftString(item.priceMode) === "options" || Boolean(item.priceOptions?.length);
    const priceLabel = usesDirectPriceText || !canManageCategoryPriceColumns ? normalizeDraftString(item.priceLabel) : "";
    const shouldUsePriceNote = supportsPriceNote && (!hasBasicPriceColumnDrafts || supportsPriceNoteWithPriceColumns);
    const priceNote = shouldUsePriceNote ? normalizeDraftString(item.priceNote) : "";
    const portionLabel = normalizeDraftString(item.portionLabel);
    const badgeLabel = normalizeDraftString(item.badgeLabel);
    const badgeStyleKey = normalizeDraftString(item.badgeStyleKey) as BadgeStyleKey;
    const badgeBackgroundColor = normalizeDraftString(item.badgeBackgroundColor);
    const badgeTextColor = normalizeDraftString(item.badgeTextColor);
    const categoryId = normalizeDraftString(item.categoryId);
    if (!itemId || deletedItemIdSet.has(itemId) || categoryIdDeleteSet.has(categoryId)) continue;

    if (item.isSoldOut !== undefined && typeof item.isSoldOut !== "boolean") {
      redirectToMenuEditWithError(menuId, "품절 상태 값이 올바르지 않습니다.");
    }

    validateRequiredText(menuId, name, "아이템 이름", MENU_FIELD_LIMITS.menuItems.name);
    validateOptionalText(menuId, setName || null, "보조 언어 표기", MENU_FIELD_LIMITS.menuItems.setName);
    if (templateCapabilities.itemDescription) {
      validateOptionalText(menuId, description || null, "아이템 설명", MENU_FIELD_LIMITS.menuItems.description);
    }
    if (templateCapabilities.originInfo) {
      validateOptionalText(menuId, originInfo || null, "원산지 정보", MENU_FIELD_LIMITS.menuItems.originInfo);
    }
    if (usesDirectPriceText) {
      validateRequiredText(menuId, priceLabel, "표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
      if (item.timeSale?.enabled === true) {
        redirectToMenuEditWithError(menuId, "직접 표시 문구를 사용하려면 먼저 이 메뉴의 타임세일을 해제해주세요.");
      }
    } else {
      validateOptionalText(menuId, priceLabel || null, "가격 표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
      const rawPrice = normalizeDraftString(item.price);
      const numericPrice = rawPrice ? Number(rawPrice) : null;
      if (canManageCategoryPriceColumns && !usesLegacyOptionDrafts && !hasBasicPriceColumnDrafts && !rawPrice) {
        redirectToMenuEditWithError(menuId, "가격은 숫자로 입력해주세요.");
      }
      if (rawPrice && !Number.isFinite(numericPrice)) {
        redirectToMenuEditWithError(menuId, "가격은 숫자로 입력해주세요.");
      }
    }
    if (shouldUsePriceNote) {
      validateOptionalText(menuId, priceNote || null, "가격 안내 문구", MENU_FIELD_LIMITS.menuItems.priceNote);
    }
    if (templateCapabilities.itemPortionLabel) {
      validateOptionalText(menuId, portionLabel || null, "제공량", MENU_FIELD_LIMITS.menuItems.portionLabel);
    }
    if (canManageCategoryPriceColumns && Array.isArray(item.priceOptions) && item.priceOptions.length > 0) {
      redirectToMenuEditWithError(menuId, "새 가격 구조에서는 옵션별 가격 대신 카테고리 옵션 컬럼 가격을 사용해주세요.");
    }
    if (templateCapabilities.priceOptions && Array.isArray(item.priceOptions)) {
      assertPriceOptionLimit(menuId, item.priceOptions.length, maxPriceOptionsPerItem);
      if (usesCategoryPriceOptionColumns) {
        const allowedLabels = categoryPriceOptionLabelsById.get(categoryId) ?? [];
        const allowedLabelSet = new Set(allowedLabels.map((label) => label.toLocaleUpperCase("ko-KR")));
        const invalidLabel = item.priceOptions
          .map((option) => normalizeDraftString(option.label))
          .find((label) => label && !allowedLabelSet.has(label.toLocaleUpperCase("ko-KR")));
        if (invalidLabel) {
          redirectToMenuEditWithError(menuId, "디스플레이에서는 카테고리에 설정된 가격 옵션 열만 사용할 수 있습니다.");
        }
      }
    }
    if (Array.isArray(item.priceColumnValues)) {
      if (!canManageCategoryPriceColumns && item.priceColumnValues.length > 0) {
        redirectToMenuEditWithError(menuId, "이 템플릿에서는 옵션 컬럼 가격을 사용할 수 없습니다.");
      }
    }
    if (templateCapabilities.itemTraits) {
      getMenuItemTraitSlotsFromDraft(menuId, item.traitDrafts);
    }
    const originalBadgeLabel = originalBadgeLabelsByItemId.get(itemId) ?? "";
    const shouldValidateBadgeLabel =
      item.isNew === true ||
      !canCompareOriginalBadgeLabels ||
      !originalBadgeLabelsByItemId.has(itemId) ||
      badgeLabel !== originalBadgeLabel;

    const isPresetBadgeLabel = Boolean(normalizeMenuBadgeLabel(badgeLabel));
    if (shouldValidateBadgeLabel && !isPresetBadgeLabel && badgeLabel.length > MENU_BADGE_MAX_LENGTH) {
      const itemName = name || "이름 없는 아이템";
      redirectToMenuEditWithError(
        menuId,
        `"${itemName}"의 배지 문구는 최대 ${MENU_BADGE_MAX_LENGTH}자까지 입력할 수 있습니다.`
      );
    }
    if (badgeStyleKey || badgeBackgroundColor || badgeTextColor) {
      if (!BADGE_STYLE_KEYS.includes(badgeStyleKey) || !isHexColor(badgeBackgroundColor) || !isHexColor(badgeTextColor)) {
        redirectToMenuEditWithError(menuId, "배지 색상은 #RRGGBB 형식으로 입력해주세요.");
      }
    }
  }

  const badgeStyleDrafts = itemDrafts
    .map((item) => ({
      styleKey: normalizeDraftString(item.badgeStyleKey) as BadgeStyleKey,
      backgroundColor: normalizeDraftString(item.badgeBackgroundColor),
      textColor: normalizeDraftString(item.badgeTextColor),
    }))
    .filter(
      (draft) =>
        BADGE_STYLE_KEYS.includes(draft.styleKey) &&
        isHexColor(draft.backgroundColor) &&
        isHexColor(draft.textColor)
    );

  if (badgeStyleDrafts.length > 0 || nextPriceDisplayMode) {
    const settings = getJsonObject(menuSite.settings);
    if (badgeStyleDrafts.length > 0) {
      const badgeStyles = getJsonObject(settings.badge_styles);
      badgeStyleDrafts.forEach((draft) => {
        badgeStyles[draft.styleKey] = {
          background_color: draft.backgroundColor.toUpperCase(),
          text_color: draft.textColor.toUpperCase(),
        };
      });
      settings.badge_styles = badgeStyles;
    }
    if (nextPriceDisplayMode) {
      settings.price_display_mode = nextPriceDisplayMode;
    }

    const { error } = await supabase
      .from("menu_sites")
      .update({ settings, updated_at: now })
      .eq("id", menuId);

    if (error) redirectToMenuEditWithError(menuId, `메뉴판 설정 저장에 실패했습니다: ${error.message}`);
  }

  if (shouldSavePcTabletLayoutMode) {
    const nextPcTabletLayoutMode = normalizePcTabletLayoutMode(pcTabletLayoutModeInput);
    const currentPageSettings = getJsonObject(menuSite.page_settings);
    const currentDesignSettings = getJsonObject(currentPageSettings.design);
    const currentRawPcTabletLayoutMode = currentDesignSettings.pcTabletLayoutMode;
    const currentPcTabletLayoutMode = normalizePcTabletLayoutMode(currentRawPcTabletLayoutMode);

    if (nextPcTabletLayoutMode !== currentPcTabletLayoutMode || currentRawPcTabletLayoutMode !== nextPcTabletLayoutMode) {
      const pageSettings = currentPageSettings;
      const designSettings = getJsonObject(pageSettings.design);
      designSettings.pcTabletLayoutMode = nextPcTabletLayoutMode;
      pageSettings.design = designSettings;

      const { error } = await supabase
        .from("menu_sites")
        .update({ page_settings: pageSettings, updated_at: now })
        .eq("id", menuId);

      if (error) redirectToMenuEditWithError(menuId, `PC/태블릿 배치 방식 저장에 실패했습니다: ${error.message}`);
    }
  }

  let itemIdsFromDeletedCategories: string[] = [];
  if (categoryIdsToDelete.length > 0) {
    const { data: categoryItems, error: categoryItemsError } = await supabase
      .from("menu_items")
      .select("id")
      .eq("menu_site_id", menuId)
      .in("category_id", categoryIdsToDelete);

    if (categoryItemsError) {
      redirectToMenuEditWithError(menuId, `삭제할 카테고리의 아이템 확인에 실패했습니다: ${categoryItemsError.message}`);
    }

    itemIdsFromDeletedCategories = (categoryItems ?? []).map((item) => item.id);
  }

  const itemIdsToDelete = Array.from(new Set([...deletedItemIds, ...itemIdsFromDeletedCategories]));
  if (itemIdsToDelete.length > 0) {
    const { error: priceOptionDeleteError } = await supabase
      .from("menu_item_price_options")
      .delete()
      .eq("menu_site_id", menuId)
      .in("menu_item_id", itemIdsToDelete);

    const missingPriceOptionsTable =
      priceOptionDeleteError &&
      (priceOptionDeleteError.message.toLowerCase().includes("menu_item_price_options") ||
        priceOptionDeleteError.message.toLowerCase().includes("does not exist") ||
        priceOptionDeleteError.code === "42P01");

    if (priceOptionDeleteError && !missingPriceOptionsTable) {
      redirectToMenuEditWithError(menuId, `삭제할 아이템의 가격 옵션 정리에 실패했습니다: ${priceOptionDeleteError.message}`);
    }

    const { error: traitDeleteError } = await supabase
      .from("menu_item_traits")
      .delete()
      .eq("menu_site_id", menuId)
      .in("menu_item_id", itemIdsToDelete);

    const missingTraitsTable =
      traitDeleteError &&
      (traitDeleteError.message.toLowerCase().includes("menu_item_traits") ||
        traitDeleteError.message.toLowerCase().includes("does not exist") ||
        traitDeleteError.code === "42P01");

    if (traitDeleteError && !missingTraitsTable) {
      redirectToMenuEditWithError(menuId, `삭제할 아이템의 맛/특징 지표 정리에 실패했습니다: ${traitDeleteError.message}`);
    }

    const { error } = await supabase
      .from("menu_items")
      .delete()
      .eq("menu_site_id", menuId)
      .in("id", itemIdsToDelete);

    if (error) redirectToMenuEditWithError(menuId, `아이템 draft 삭제에 실패했습니다: ${error.message}`);
  }

  if (categoryIdsToDelete.length > 0) {
    const { error: categoryDeleteError } = await supabase
      .from("menu_categories")
      .delete()
      .eq("menu_site_id", menuId)
      .in("id", categoryIdsToDelete);

    if (categoryDeleteError) redirectToMenuEditWithError(menuId, `카테고리 draft 삭제에 실패했습니다: ${categoryDeleteError.message}`);
  }

  const existingDisplaySettingsByPageId = new Map<string, MenuPageDisplaySettings>();

  if (canConfigureDisplayPages) {
    const { data: existingDisplayPages, error: existingDisplayPagesError } = await supabase
      .from("menu_pages")
      .select("id, display_settings")
      .eq("menu_site_id", menuId);

    if (existingDisplayPagesError) {
      redirectToMenuEditWithError(menuId, `디스플레이 미디어 정리 기준 확인에 실패했습니다: ${existingDisplayPagesError.message}`);
    }

    (existingDisplayPages ?? []).forEach((page) => {
      existingDisplaySettingsByPageId.set(page.id, normalizeMenuPageDisplaySettings(page.display_settings));
    });
  }

  if (effectiveDeletedPageIds.length > 0) {
    const { error } = await supabase
      .from("menu_pages")
      .delete()
      .eq("menu_site_id", menuId)
      .in("id", effectiveDeletedPageIds);

    if (error) redirectToMenuEditWithError(menuId, `페이지 draft 삭제에 실패했습니다: ${error.message}`);
  }

  const newPageDrafts = effectivePageDrafts
    .map((page) => ({
      id: normalizeDraftString(page.id),
      title: normalizeDraftString(page.title),
      description: normalizeDraftString(page.description),
      descriptionVisible: normalizeDraftBoolean(page.descriptionVisible),
      displaySettings: normalizeMenuPageDisplaySettings(page.displaySettings),
      visible: page.visible === undefined ? true : normalizeDraftBoolean(page.visible),
      sortOrder: normalizeDraftNumber(page.sortOrder),
      isNew: page.isNew === true,
    }))
    .filter((page) => page.id && page.isNew && !deletedPageIdSet.has(page.id));

  const { count: existingPageCount, error: existingPageCountError } = await supabase
    .from("menu_pages")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (existingPageCountError) {
    redirectToMenuEditWithError(menuId, `페이지 개수 확인에 실패했습니다: ${existingPageCountError.message}`);
  }

  if ((existingPageCount ?? 0) + newPageDrafts.length - effectiveDeletedPageIds.length > MENU_LIMITS.maxPagesPerSite) {
    redirectToMenuEditWithError(menuId, `페이지는 최대 ${MENU_LIMITS.maxPagesPerSite}개까지 추가할 수 있습니다.`);
  }

  const pageSaveEnd = startMenuSaveTraceStage(trace, "page-save", {
    pageDraftCount: effectivePageDrafts.length,
    deletedPageCount: effectiveDeletedPageIds.length,
  });
  const pageIdMap = new Map<string, string>();
  for (const page of newPageDrafts) {
    const payload: MenuPageInsert = {
      menu_site_id: menuId,
      title: page.title,
      description: page.description || null,
      description_visible: Boolean(page.description && page.descriptionVisible),
      ...(canConfigureDisplayPages ? { display_settings: serializeMenuPageDisplaySettings(page.displaySettings) } : {}),
      visible: page.visible,
      sort_order: page.sortOrder,
    };

    const { data, error } = await supabase.from("menu_pages").insert(payload).select("id").single();
    if (error) redirectToMenuEditWithError(menuId, `새 페이지 draft 저장에 실패했습니다: ${error.message}`);
    if (data?.id) pageIdMap.set(page.id, data.id);
  }

  const pageResults = await Promise.all(
    effectivePageDrafts
      .map((page) => ({
        id: normalizeDraftString(page.id),
        title: normalizeDraftString(page.title),
        description: normalizeDraftString(page.description),
        descriptionVisible: normalizeDraftBoolean(page.descriptionVisible),
        displaySettings: normalizeMenuPageDisplaySettings(page.displaySettings),
        visible: page.visible === undefined ? true : normalizeDraftBoolean(page.visible),
        sortOrder: normalizeDraftNumber(page.sortOrder),
        isNew: page.isNew === true,
      }))
      .filter((page) => page.id && !page.isNew && !deletedPageIdSet.has(page.id))
      .map((page) =>
        supabase
          .from("menu_pages")
          .update({
            title: page.title,
            description: page.description || null,
            description_visible: Boolean(page.description && page.descriptionVisible),
            ...(canConfigureDisplayPages ? { display_settings: serializeMenuPageDisplaySettings(page.displaySettings) } : {}),
            visible: page.visible,
            sort_order: page.sortOrder,
            updated_at: now,
          })
          .eq("id", page.id)
          .eq("menu_site_id", menuId)
      )
  );
  const pageError = pageResults.find((result) => result.error)?.error;
  // TODO(display-video-upload): Add transaction-aware compensation for newly uploaded draft videos if page saving fails.
  if (pageError) pageSaveEnd("error", getSafeSupabaseErrorFields(pageError));
  if (pageError) redirectToMenuEditWithError(menuId, `페이지 draft 저장에 실패했습니다: ${pageError.message}`);
  pageSaveEnd("success", {
    newPageCount: newPageDrafts.length,
    updatePageCount: pageResults.length,
  });

  if (canConfigureDisplayPages && existingDisplaySettingsByPageId.size > 0) {
    const nextDisplaySettingsByPageId = new Map<string, MenuPageDisplaySettings>(
      Array.from(existingDisplaySettingsByPageId.entries()).filter(([pageId]) => !deletedPageIdSet.has(pageId))
    );

    effectivePageDrafts.forEach((page) => {
      const pageId = normalizeDraftString(page.id);
      if (!pageId || deletedPageIdSet.has(pageId)) return;
      const resolvedPageId = pageIdMap.get(pageId) ?? pageId;
      nextDisplaySettingsByPageId.set(resolvedPageId, normalizeMenuPageDisplaySettings(page.displaySettings));
    });

    const displayImagePathsToRemove = Array.from(
      new Set(
        effectivePageDrafts.flatMap((page) => {
          const pageId = normalizeDraftString(page.id);
          if (!pageId || page.isNew === true || deletedPageIdSet.has(pageId)) return [];
          const previousSettings = existingDisplaySettingsByPageId.get(pageId);
          if (!previousSettings) return [];
          const nextSettings = normalizeMenuPageDisplaySettings(page.displaySettings);
          return getDisplayImagePathsToRemove(menuId, previousSettings, nextSettings);
        })
      )
    );

    for (const imagePath of displayImagePathsToRemove) {
      const removeError = await removeMenuImagePath(supabase, imagePath);
      if (removeError) {
        console.warn(`Display page image cleanup failed for ${imagePath}: ${removeError.message}`);
      }
    }

    const displayVideoPathsToRemove = getDisplayVideoPathsToRemove(menuId, existingDisplaySettingsByPageId, nextDisplaySettingsByPageId);

    for (const videoPath of displayVideoPathsToRemove) {
      const removeError = await removeMenuVideoPath(videoPath);
      if (removeError) {
        console.warn(`Display page video cleanup failed for ${videoPath}: ${removeError.message}`);
      }
    }
  }

  const categorySaveEnd = startMenuSaveTraceStage(trace, "category-save", {
    categoryDraftCount: categoryDrafts.length,
    deletedCategoryCount: categoryIdsToDelete.length,
  });
  const categoryIdMap = new Map<string, string>();
  const newCategoryDrafts = categoryDrafts
    .map((category) => ({
      id: normalizeDraftString(category.id),
      pageId: normalizeDraftString(category.pageId),
      name: normalizeDraftString(category.name),
      description: normalizeDraftString(category.description),
      descriptionVisible: normalizeDraftBoolean(category.descriptionVisible),
      visible: category.visible === undefined ? true : normalizeDraftBoolean(category.visible),
      sortOrder: normalizeDraftNumber(category.sortOrder),
      isNew: category.isNew === true,
    }))
    .filter((category) => category.id && category.isNew && !categoryIdDeleteSet.has(category.id));

  for (const category of newCategoryDrafts) {
    const resolvedPageId = pageIdMap.get(category.pageId) ?? category.pageId;
    if (!resolvedPageId) redirectToMenuEditWithError(menuId, "새 카테고리를 추가할 페이지를 찾을 수 없습니다.");
    const menuPage = await assertMenuPageBelongsToMenuSite(menuId, resolvedPageId);

    const payload: MenuCategoryInsert = {
      menu_site_id: menuId,
      menu_page_id: resolvedPageId,
      name: category.name,
      section_key: getMenuPageSectionKey(menuPage.legacy_section_key),
      sort_order: category.sortOrder,
      visible: category.visible,
      ...(templateCapabilities.categoryDescription
        ? {
            description: category.description || null,
            description_visible: Boolean(category.description && category.descriptionVisible),
          }
        : {
            description: null,
            description_visible: false,
          }),
    };

    const { data, error } = await supabase.from("menu_categories").insert(payload).select("id").single();
    if (error) redirectToMenuEditWithError(menuId, `새 카테고리 draft 저장에 실패했습니다: ${error.message}`);
    if (data?.id) categoryIdMap.set(category.id, data.id);
  }

  const categoryResults = await Promise.all(
    categoryDrafts
      .map((category) => ({
        id: normalizeDraftString(category.id),
        pageId: normalizeDraftString(category.pageId),
        name: normalizeDraftString(category.name),
        description: normalizeDraftString(category.description),
        descriptionVisible: normalizeDraftBoolean(category.descriptionVisible),
        visible: category.visible === undefined ? true : normalizeDraftBoolean(category.visible),
        sortOrder: normalizeDraftNumber(category.sortOrder),
        isNew: category.isNew === true,
      }))
      .filter((category) => category.id && !category.isNew && !categoryIdDeleteSet.has(category.id))
      .map((category) => {
        const payload: MenuCategoryUpdate = {
          name: category.name,
          visible: category.visible,
          sort_order: category.sortOrder,
          updated_at: now,
          ...(templateCapabilities.categoryDescription
            ? {
                description: category.description || null,
                description_visible: Boolean(category.description && category.descriptionVisible),
              }
            : {}),
        };

        return supabase.from("menu_categories").update(payload).eq("id", category.id).eq("menu_site_id", menuId);
      })
  );
  const categoryError = categoryResults.find((result) => result.error)?.error;
  if (categoryError) categorySaveEnd("error", getSafeSupabaseErrorFields(categoryError));
  if (categoryError) redirectToMenuEditWithError(menuId, `카테고리 draft 저장에 실패했습니다: ${categoryError.message}`);
  categorySaveEnd("success", {
    newCategoryCount: newCategoryDrafts.length,
    updateCategoryCount: categoryResults.length,
  });

  const priceColumnSaveEnd = startMenuSaveTraceStage(trace, "price-column-save", {
    categoryDraftCount: categoryDrafts.length,
  });
  const priceColumnIdMap = await syncBasicCategoryPriceColumnsFromDrafts({
    supabase,
    menuId,
    categoryDrafts,
    categoryIdMap,
    categoryIdDeleteSet,
    canManageCategoryPriceColumns,
    maxColumns: basicPricingCapabilities.maxCategoryPriceColumns,
  });
  priceColumnSaveEnd("success", { mappedPriceColumnCount: priceColumnIdMap.size });

  const itemIdMap = new Map<string, string>();
  const itemSaveEnd = startMenuSaveTraceStage(trace, "item-save", {
    itemDraftCount: itemDrafts.length,
    deletedItemCount: itemIdsToDelete.length,
  });
  for (const item of itemDrafts) {
    const itemId = normalizeDraftString(item.id);
    if (!itemId) continue;
    const rawCategoryId = normalizeDraftString(item.categoryId);
    const categoryId = categoryIdMap.get(rawCategoryId) ?? rawCategoryId;
    if (deletedItemIdSet.has(itemId) || categoryIdDeleteSet.has(categoryId)) continue;

    const rawPrice = normalizeDraftString(item.price);
    const numericPrice = rawPrice ? Number(rawPrice) : null;
    if (rawPrice && !Number.isFinite(numericPrice)) {
      redirectToMenuEditWithError(menuId, "가격은 숫자로 입력해주세요.");
    }
    const singlePriceInputMode = item.singlePriceInputMode === "text" ? "text" : "number";
    const hasBasicPriceColumnPayload = canManageCategoryPriceColumns && Array.isArray(item.priceColumnValues);
    const normalizedBasicPriceColumnValues = hasBasicPriceColumnPayload
      ? normalizeItemPriceColumnValueDrafts(menuId, item.priceColumnValues)
      : [];
    const hasBasicPriceColumnDrafts = normalizedBasicPriceColumnValues.length > 0;
    const usesDirectPriceText = canManageCategoryPriceColumns && !hasBasicPriceColumnDrafts && singlePriceInputMode === "text";
    const priceLabel = usesDirectPriceText || !canManageCategoryPriceColumns ? normalizeDraftString(item.priceLabel) : "";
    const shouldSavePriceNote = supportsPriceNote && (!hasBasicPriceColumnDrafts || supportsPriceNoteWithPriceColumns);
    const priceNote = shouldSavePriceNote ? normalizeDraftString(item.priceNote) : "";

    const badgeLabel = normalizeDraftString(item.badgeLabel) || null;
    const imageAction = normalizeDraftString(item.imageAction);
    const draftImageUrl = normalizeDraftString(item.imageUrl);
    const draftImagePath = normalizeDraftString(item.imagePath);
    const traitSlots = templateCapabilities.itemTraits ? getMenuItemTraitSlotsFromDraft(menuId, item.traitDrafts) : [];
    const hasPriceOptionDraft = item.priceOptions !== undefined;
    const priceMode = normalizeDraftString(item.priceMode);
    const rawPriceOptionDrafts = templateCapabilities.priceOptions ? (item.priceOptions ?? []) : [];
    assertPriceOptionLimit(menuId, rawPriceOptionDrafts.length, maxPriceOptionsPerItem);
    const categoryPriceOptionLabels = usesCategoryPriceOptionColumns
      ? categoryPriceOptionLabelsById.get(rawCategoryId) ?? []
      : [];
    const categoryPriceOptionLabelSet = new Set(categoryPriceOptionLabels.map((label) => label.toLocaleUpperCase("ko-KR")));
    const priceOptionDrafts = templateCapabilities.priceOptions
      ? rawPriceOptionDrafts
          .map((option, index) => {
            const rawOptionPrice = typeof option.price === "number" ? String(option.price) : normalizeDraftString(option.price);
            return {
              label: normalizeDraftString(option.label),
              price: rawOptionPrice ? normalizeDraftNumber(rawOptionPrice) : null,
              priceLabel: normalizeDraftString(option.priceLabel),
              visible: option.visible === undefined ? true : normalizeDraftBoolean(option.visible),
              sortOrder: normalizeDraftNumber(option.sortOrder ?? index),
            };
          })
          .filter((option) => {
            if (!usesCategoryPriceOptionColumns) return true;
            return categoryPriceOptionLabelSet.has(option.label.toLocaleUpperCase("ko-KR"));
          })
          .filter((option) => option.label && (option.price != null || option.priceLabel))
      : [];
    const usesOptionPricing = templateCapabilities.priceOptions && (priceMode === "options" || priceOptionDrafts.length > 0);

    if (usesOptionPricing && priceOptionDrafts.length === 0) {
      redirectToMenuEditWithError(menuId, "옵션별 가격은 가격 옵션을 1개 이상 입력해주세요.");
    }
    if (usesDirectPriceText) {
      if (!priceLabel) {
        redirectToMenuEditWithError(menuId, "표시 문구를 입력해주세요.");
      }
      if (item.timeSale?.enabled === true) {
        redirectToMenuEditWithError(menuId, "직접 표시 문구를 사용하려면 먼저 이 메뉴의 타임세일을 해제해주세요.");
      }
    }
    if (canManageCategoryPriceColumns && !usesOptionPricing && !hasBasicPriceColumnDrafts && !usesDirectPriceText && numericPrice == null) {
      redirectToMenuEditWithError(menuId, "가격은 숫자로 입력해주세요.");
    }
    const payloadInput = {
      name: normalizeDraftString(item.name),
      set_name: normalizeDraftString(item.setName) || null,
      origin_info: normalizeDraftString(item.originInfo) || null,
      price: usesOptionPricing || usesDirectPriceText ? 0 : numericPrice ?? 0,
      price_label: usesOptionPricing ? null : priceLabel || null,
      ...(shouldSavePriceNote ? { price_note: priceNote || null } : {}),
      badge_label: badgeLabel,
      badge_type: getLegacyBadgeTypeForLabel(badgeLabel),
      recommended: Boolean(badgeLabel),
      is_best: badgeLabel === "BEST",
      visible: normalizeDraftBoolean(item.visible),
      sort_order: normalizeDraftNumber(item.sortOrder),
      image_url: imageAction === "delete" ? null : draftImageUrl || null,
      image_path: imageAction === "delete" ? null : draftImagePath || null,
      price_visible: item.priceVisible !== undefined ? normalizeDraftBoolean(item.priceVisible) : true,
      traits_visible: item.traitsVisible !== undefined ? normalizeDraftBoolean(item.traitsVisible) : true,
      ...(typeof item.isSoldOut === "boolean" ? { is_sold_out: item.isSoldOut } : item.isNew ? { is_sold_out: false } : {}),
      updated_at: now,
    };
    const portionPayload = templateCapabilities.itemPortionLabel
      ? {
          portion_label: normalizeDraftString(item.portionLabel) || null,
          portion_visible: item.portionVisible !== undefined ? normalizeDraftBoolean(item.portionVisible) : true,
        }
      : item.isNew
        ? { portion_label: null, portion_visible: false }
        : {};
    const descriptionPayload = templateCapabilities.itemDescription
      ? { description: normalizeDraftString(item.description) || null }
      : item.isNew
        ? { description: null }
        : {};

    if (item.isNew) {
      if (!categoryId) redirectToMenuEditWithError(menuId, "새 아이템을 추가할 카테고리를 선택해주세요.");
      await assertCategoryBelongsToMenuSite(menuId, categoryId);

      const { count: categoryItemCount, error: categoryItemCountError } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("menu_site_id", menuId)
        .eq("category_id", categoryId);

      if (categoryItemCountError) {
        redirectToMenuEditWithError(menuId, `아이템 개수 확인에 실패했습니다: ${categoryItemCountError.message}`);
      }

      if ((categoryItemCount ?? 0) >= MENU_LIMITS.maxItemsPerCategory) {
        redirectToMenuEditWithError(menuId, `이 카테고리에는 아이템을 최대 ${MENU_LIMITS.maxItemsPerCategory}개까지 추가할 수 있습니다.`);
      }

      const { count: totalItemCount, error: totalItemCountError } = await supabase
        .from("menu_items")
        .select("id", { count: "exact", head: true })
        .eq("menu_site_id", menuId);

      if (totalItemCountError) {
        redirectToMenuEditWithError(menuId, `전체 아이템 개수 확인에 실패했습니다: ${totalItemCountError.message}`);
      }

      if ((totalItemCount ?? 0) >= MENU_LIMITS.maxItemsPerSite) {
        redirectToMenuEditWithError(menuId, `한 메뉴판에는 아이템을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`);
      }

      const insertPayload: MenuItemInsert = {
        menu_site_id: menuId,
        category_id: categoryId,
        ...descriptionPayload,
        ...payloadInput,
        ...portionPayload,
      };
      delete insertPayload.updated_at;

      const insertResult = await supabase.from("menu_items").insert(insertPayload).select("id").single();
      let error = insertResult.error;
      let insertedItemId = insertResult.data?.id ?? "";

      if (isMissingBadgeLabelColumnError(error)) {
        const fallbackPayload = { ...insertPayload };
        delete fallbackPayload.badge_label;
        const fallbackResult = await supabase.from("menu_items").insert(fallbackPayload).select("id").single();
        error = fallbackResult.error;
        insertedItemId = fallbackResult.data?.id ?? "";
      }

      if (error) redirectToMenuEditWithError(menuId, `새 아이템 draft 저장에 실패했습니다: ${error.message}`);
      if (insertedItemId) {
        itemIdMap.set(itemId, insertedItemId);
        if (priceOptionDrafts.length > 0) {
          const priceOptionInserts: MenuItemPriceOptionInsert[] = priceOptionDrafts.map((option) => ({
            menu_site_id: menuId,
            menu_item_id: insertedItemId,
            label: option.label,
            price: option.price,
            price_label: option.priceLabel || null,
            visible: option.visible,
            sort_order: option.sortOrder,
          }));
          const { error: priceOptionsError } = await supabase.from("menu_item_price_options").insert(priceOptionInserts);
          const missingPriceOptionsTable =
            priceOptionsError &&
            (priceOptionsError.message.toLowerCase().includes("menu_item_price_options") ||
              priceOptionsError.message.toLowerCase().includes("does not exist") ||
              priceOptionsError.code === "42P01");

          if (priceOptionsError && !missingPriceOptionsTable) {
            redirectToMenuEditWithError(menuId, `새 아이템 가격 옵션 저장에 실패했습니다: ${priceOptionsError.message}`);
          }
        }
        if (templateCapabilities.itemTraits) {
          await syncMenuItemTraitSlots(supabase, menuId, insertedItemId, traitSlots);
        }
      }
      continue;
    }

    const payload: MenuItemUpdate = {
      ...descriptionPayload,
      ...payloadInput,
      ...portionPayload,
    };

    const updateResult = await supabase
      .from("menu_items")
      .update(payload)
      .eq("id", itemId)
      .eq("menu_site_id", menuId)
      .select("id")
      .maybeSingle();
    let error = updateResult.error;
    let updatedItemId = updateResult.data?.id ?? "";

    if (isMissingBadgeLabelColumnError(error)) {
      const fallbackPayload = { ...payload };
      delete fallbackPayload.badge_label;
      const fallbackResult = await supabase
        .from("menu_items")
        .update(fallbackPayload)
        .eq("id", itemId)
        .eq("menu_site_id", menuId)
        .select("id")
        .maybeSingle();
      error = fallbackResult.error;
      updatedItemId = fallbackResult.data?.id ?? "";
    }

    if (error) redirectToMenuEditWithError(menuId, `아이템 draft 저장에 실패했습니다: ${error.message}`);
    if (!updatedItemId) redirectToMenuEditWithError(menuId, "저장할 아이템을 찾지 못했습니다. 새로고침 후 다시 시도해주세요.");
    itemIdMap.set(itemId, updatedItemId);
    if (templateCapabilities.priceOptions && hasPriceOptionDraft) {
      const { error: deletePriceOptionsError } = await supabase
        .from("menu_item_price_options")
        .delete()
        .eq("menu_site_id", menuId)
        .eq("menu_item_id", itemId);
      const missingPriceOptionsTable =
        deletePriceOptionsError &&
        (deletePriceOptionsError.message.toLowerCase().includes("menu_item_price_options") ||
          deletePriceOptionsError.message.toLowerCase().includes("does not exist") ||
          deletePriceOptionsError.code === "42P01");

      if (deletePriceOptionsError && !missingPriceOptionsTable) {
        redirectToMenuEditWithError(menuId, `아이템 가격 옵션 정리에 실패했습니다: ${deletePriceOptionsError.message}`);
      }

      if (!deletePriceOptionsError && priceOptionDrafts.length > 0) {
        const priceOptionInserts: MenuItemPriceOptionInsert[] = priceOptionDrafts.map((option) => ({
          menu_site_id: menuId,
          menu_item_id: itemId,
          label: option.label,
          price: option.price,
          price_label: option.priceLabel || null,
          visible: option.visible,
          sort_order: option.sortOrder,
        }));
        const { error: insertPriceOptionsError } = await supabase.from("menu_item_price_options").insert(priceOptionInserts);
        if (insertPriceOptionsError) {
          redirectToMenuEditWithError(menuId, `아이템 가격 옵션 저장에 실패했습니다: ${insertPriceOptionsError.message}`);
        }
      }
    }
    if (templateCapabilities.itemTraits) {
      await syncMenuItemTraitSlots(supabase, menuId, itemId, traitSlots);
    }
  }
  itemSaveEnd("success", { mappedItemCount: itemIdMap.size });

  await syncBasicItemPriceColumnValuesFromDrafts({
    supabase,
    menuId,
    itemDrafts,
    itemIdMap,
    priceColumnIdMap,
    deletedItemIdSet,
    categoryIdDeleteSet,
    canManageCategoryPriceColumns,
    trace,
  });

  await syncMenuTimeSalesFromPayload({
    supabase,
    menuId,
    menuSite,
    payload: menuTimeSaleSavePayload,
    cafeAStarterResetFinalSavePayload,
    itemIdMap,
    priceColumnIdMap,
    deletedItemIdSet,
    trace,
  });

  if (!cafeAStarterResetFinalSavePayload) {
    const coverFeaturedEnd = startMenuSaveTraceStage(trace, "cover-featured-save", { mode: "remap-existing" });
    await remapFeaturedSlidesAfterMenuDraftSave({
      supabase,
      menuId,
      menuSite,
      itemDrafts,
      itemIdMap,
      deletedItemIdSet,
      categoryIdDeleteSet,
      previousItemNameById,
      updatedAt: now,
    });
    coverFeaturedEnd("success");
  }

  let menuWidgetImageCleanupInput: Parameters<typeof cleanupSavedMenuWidgetImages>[0] | null = null;

  if (menuWidgetFinalSaveDraftPayload && shouldRunMenuWidgetFinalSave(menuWidgetFinalSaveDraftPayload)) {
    const widgetSaveEnd = startMenuSaveTraceStage(trace, "widget-save", {
      widgetDraftCount: menuWidgetFinalSaveDraftPayload.widgetDrafts.length,
      deletedWidgetIdCount: menuWidgetFinalSaveDraftPayload.deletedWidgetIds.length,
      contentPageCount: menuWidgetFinalSaveDraftPayload.contentBlocksByPage.length,
      contentBlockCount: menuWidgetFinalSaveDraftPayload.contentBlocksByPage.reduce(
        (count, pageBlocks) => count + pageBlocks.blocks.length,
        0,
      ),
    });
    const remappedWidgetPayloadResult = remapMenuWidgetFinalSavePayloadIds({
      payload: menuWidgetFinalSaveDraftPayload,
      pageIdMap,
      categoryIdMap,
    });

    if (!remappedWidgetPayloadResult.ok) {
      widgetSaveEnd("error", { reason: "validation", errorCount: remappedWidgetPayloadResult.errors.length });
      redirectToMenuEditWithError(menuId, getMenuWidgetFinalSaveValidationMessage(remappedWidgetPayloadResult.errors));
    }

    const widgetSaveResult = await saveMenuWidgetsForFinalDraft({
      menuSiteId: menuId,
      payload: remappedWidgetPayloadResult.value,
    });

    if (!widgetSaveResult.ok) {
      widgetSaveEnd("error", {
        reason: "save-failed",
        errorCode: widgetSaveResult.error.code,
      });
      console.warn("[saveMenuManagementBasicDraftAction] menu widget final save failed", {
        menuId,
        code: widgetSaveResult.error.code,
        field: widgetSaveResult.error.field,
      });
      redirectToMenuEditWithError(menuId, getMenuWidgetFinalSaveActionErrorMessage(widgetSaveResult.error));
    }
    widgetSaveEnd("success", {
      assetCleanupPlanCount: widgetSaveResult.assetCleanupPlans.length,
      assetChangeCount: widgetSaveResult.assetChanges.length,
    });

    if (widgetSaveResult.assetCleanupPlans.length > 0 || widgetSaveResult.assetChanges.length > 0) {
      menuWidgetImageCleanupInput = {
        menuSiteId: menuId,
        assetCleanupPlans: widgetSaveResult.assetCleanupPlans,
        assetChanges: widgetSaveResult.assetChanges,
      };
    }
  }

  if (cafeAStarterResetFinalSavePayload) {
    const coverFeaturedEnd = startMenuSaveTraceStage(trace, "cover-featured-save", { mode: "starter-reset" });
    await saveCafeAStarterResetCoverAndFeaturedAfterMenuDraftSave({
      supabase,
      menuId,
      menuSite,
      snapshot: cafeAStarterResetFinalSavePayload.snapshot,
      itemIdMap,
      updatedAt: now,
    });
    coverFeaturedEnd("success");
  }

  if (menuWidgetImageCleanupInput) {
    const cleanupEnd = startMenuSaveTraceStage(trace, "cleanup", {
      candidateCount: menuWidgetImageCleanupInput.assetCleanupPlans.length + menuWidgetImageCleanupInput.assetChanges.length,
    });
    const cleanupResult = await cleanupSavedMenuWidgetImages(menuWidgetImageCleanupInput);

    if (!cleanupResult.ok) {
      cleanupEnd("error", {
        removedCount: cleanupResult.removedPaths.length,
        warningCount: cleanupResult.warnings.length,
      });
      console.warn("[saveMenuManagementBasicDraftAction] menu widget image cleanup failed", {
        menuId,
        candidateCount: menuWidgetImageCleanupInput.assetCleanupPlans.length + menuWidgetImageCleanupInput.assetChanges.length,
        removedCount: cleanupResult.removedPaths.length,
        warningCodes: cleanupResult.warnings.map((warning) => warning.code),
      });
    } else {
      cleanupEnd("success", { removedCount: cleanupResult.removedPaths.length });
    }
  }

  const revalidationEnd = startMenuSaveTraceStage(trace, "revalidation");
  revalidateMenuPaths(menuId, menuSite.slug);
  revalidationEnd("success");
  actionEnd("success");
  redirectToMenuEdit(menuId, "메뉴 관리 내용이 저장되었습니다.");
}

export async function copyMenuItemAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const itemId = getString(formData, "itemId");

  if (!menuId || !itemId) {
    redirect("/mypage?error=missing-menu-item-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  const maxPriceOptionsPerItem = getMaxPriceOptionsPerItem(templateCapabilities);
  await assertItemBelongsToMenuSite(menuId, itemId);

  const menuItemCopySelect =
    "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, image_path, badge_label, badge_type, origin_info, is_sold_out, traits_visible, visible, sort_order";
  const legacyMenuItemCopySelect =
    "id, category_id, name, set_name, description, price, price_label, price_visible, portion_label, portion_visible, image_url, image_path, badge_type, origin_info, is_sold_out, traits_visible, visible, sort_order";

  let { data: sourceItem, error: sourceItemError } = await supabase
    .from("menu_items")
    .select(menuItemCopySelect)
    .eq("id", itemId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (isMissingBadgeLabelColumnError(sourceItemError)) {
    const fallbackResult = await supabase
      .from("menu_items")
      .select(legacyMenuItemCopySelect)
      .eq("id", itemId)
      .eq("menu_site_id", menuId)
      .maybeSingle();
    sourceItem = fallbackResult.data ? { ...fallbackResult.data, badge_label: null } : null;
    sourceItemError = fallbackResult.error;
  }

  if (sourceItemError || !sourceItem) {
    redirectToMenuEditWithError(menuId, sourceItemError ? `복사할 아이템 확인에 실패했습니다: ${sourceItemError.message}` : "복사할 아이템을 찾을 수 없습니다.");
  }

  const categoryId = sourceItem.category_id;
  if (!categoryId) {
    redirectToMenuEditWithError(menuId, "카테고리가 없는 아이템은 복사할 수 없습니다.");
  }

  await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const { count: categoryItemCount, error: categoryItemCountError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("category_id", categoryId);

  if (categoryItemCountError) {
    redirectToMenuEditWithError(menuId, `아이템 개수 확인에 실패했습니다: ${categoryItemCountError.message}`);
  }

  if ((categoryItemCount ?? 0) >= MENU_LIMITS.maxItemsPerCategory) {
    redirectToMenuEditWithError(menuId, `이 카테고리에는 아이템을 최대 ${MENU_LIMITS.maxItemsPerCategory}개까지 추가할 수 있습니다.`);
  }

  const { count: totalItemCount, error: totalItemCountError } = await supabase
    .from("menu_items")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (totalItemCountError) {
    redirectToMenuEditWithError(menuId, `전체 아이템 개수 확인에 실패했습니다: ${totalItemCountError.message}`);
  }

  if ((totalItemCount ?? 0) >= MENU_LIMITS.maxItemsPerSite) {
    redirectToMenuEditWithError(menuId, `한 메뉴판에는 아이템을 최대 ${MENU_LIMITS.maxItemsPerSite}개까지 등록할 수 있습니다.`);
  }

  const itemWithOptionalBadgeLabel = sourceItem as typeof sourceItem & { badge_label?: string | null };
  const payload: MenuItemInsert = {
    menu_site_id: menuId,
    category_id: categoryId,
    name: `${sourceItem.name || "아이템"} 복사본`,
    set_name: sourceItem.set_name,
    description: sourceItem.description,
    price: sourceItem.price,
    price_label: sourceItem.price_label,
    price_visible: sourceItem.price_visible,
    portion_label: templateCapabilities.itemPortionLabel ? sourceItem.portion_label : null,
    portion_visible: templateCapabilities.itemPortionLabel ? sourceItem.portion_visible : false,
    image_url: sourceItem.image_url,
    image_path: sourceItem.image_path,
    badge_label: itemWithOptionalBadgeLabel.badge_label ?? null,
    badge_type: sourceItem.badge_type,
    recommended: false,
    origin_info: sourceItem.origin_info,
    is_best: false,
    is_sold_out: false,
    traits_visible: sourceItem.traits_visible,
    visible: sourceItem.visible,
    sort_order: categoryItemCount ?? 0,
  };

  let { data: copiedItem, error: copiedItemError } = await supabase.from("menu_items").insert(payload).select("id").single();

  if (isMissingBadgeLabelColumnError(copiedItemError)) {
    const fallbackPayload = { ...payload };
    delete fallbackPayload.badge_label;
    const fallbackResult = await supabase.from("menu_items").insert(fallbackPayload).select("id").single();
    copiedItem = fallbackResult.data;
    copiedItemError = fallbackResult.error;
  }

  if (copiedItemError || !copiedItem) {
    redirectToMenuEditWithError(menuId, copiedItemError ? `아이템 복사에 실패했습니다: ${copiedItemError.message}` : "아이템 복사에 실패했습니다.");
  }

  const { data: sourcePriceOptions, error: priceOptionsError } = await supabase
    .from("menu_item_price_options")
    .select("label, price, price_label, visible, sort_order")
    .eq("menu_site_id", menuId)
    .eq("menu_item_id", itemId)
    .order("sort_order", { ascending: true });

  if (
    priceOptionsError &&
    !priceOptionsError.message.toLowerCase().includes("menu_item_price_options") &&
    !priceOptionsError.message.toLowerCase().includes("does not exist") &&
    priceOptionsError.code !== "42P01"
  ) {
    redirectToMenuEditWithError(menuId, `아이템 복사 중 가격 옵션 확인에 실패했습니다: ${priceOptionsError.message}`);
  }

  const priceOptionPayloads: MenuItemPriceOptionInsert[] = (sourcePriceOptions ?? []).slice(0, maxPriceOptionsPerItem).map((option) => ({
    menu_site_id: menuId,
    menu_item_id: copiedItem.id,
    label: option.label,
    price: option.price,
    price_label: option.price_label,
    visible: option.visible,
    sort_order: option.sort_order,
  }));

  if (priceOptionPayloads.length > 0) {
    const { error: copyPriceOptionsError } = await supabase.from("menu_item_price_options").insert(priceOptionPayloads);
    if (copyPriceOptionsError) {
      redirectToMenuEditWithError(menuId, `아이템은 복사되었지만 가격 옵션 복사에 실패했습니다: ${copyPriceOptionsError.message}`);
    }
  }

  const { data: sourceTraits, error: traitsError } = await supabase
    .from("menu_item_traits")
    .select("label, value, max_value, visible, sort_order")
    .eq("menu_site_id", menuId)
    .eq("menu_item_id", itemId);

  if (
    traitsError &&
    !traitsError.message.toLowerCase().includes("menu_item_traits") &&
    !traitsError.message.toLowerCase().includes("does not exist") &&
    traitsError.code !== "42P01"
  ) {
    redirectToMenuEditWithError(menuId, `아이템 복사 중 맛/특징 지표 확인에 실패했습니다: ${traitsError.message}`);
  }

  const traitPayloads: MenuItemTraitInsert[] = (sourceTraits ?? []).map((trait) => ({
    menu_site_id: menuId,
    menu_item_id: copiedItem.id,
    label: trait.label,
    value: trait.value,
    max_value: trait.max_value,
    visible: trait.visible,
    sort_order: trait.sort_order,
  }));

  if (traitPayloads.length > 0) {
    const { error: copyTraitsError } = await supabase.from("menu_item_traits").insert(traitPayloads);
    if (copyTraitsError) {
      redirectToMenuEditWithError(menuId, `아이템은 복사되었지만 맛/특징 지표 복사에 실패했습니다: ${copyTraitsError.message}`);
    }
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  const templateType = getTemplateType(menuSite.template_key);
  redirect(getEditPath(menuId, {
    tab: "menu",
    message: templateType === "price_list" ? "서비스가 복사되었습니다." : "메뉴 아이템이 복사되었습니다.",
    editingItemId: copiedItem.id,
  }));
}

export async function reorderMenuItemsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const categoryId = getString(formData, "categoryId");
  const orderedIds = getOrderedIds(formData);

  if (!menuId || !categoryId || orderedIds.length === 0) {
    redirectToMenuEditWithError(menuId, "아이템 순서를 저장할 항목이 없습니다.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertCategoryBelongsToMenuSite(menuId, categoryId);
  const { data: currentItems, error: itemsError } = await supabase
    .from("menu_items")
    .select("id")
    .eq("menu_site_id", menuId)
    .eq("category_id", categoryId);

  if (itemsError) {
    redirectToMenuEditWithError(menuId, `아이템 순서 확인에 실패했습니다: ${itemsError.message}`);
  }

  const itemIds = new Set((currentItems ?? []).map((item) => item.id));
  const canSaveOrder = orderedIds.length === itemIds.size && orderedIds.every((id) => itemIds.has(id));

  if (!canSaveOrder) {
    redirectToMenuEditWithError(menuId, "현재 아이템 목록과 순서 정보가 일치하지 않습니다. 새로고침 후 다시 시도해주세요.");
  }

  const results = await Promise.all(
    orderedIds.map((id, index) =>
      supabase.from("menu_items").update({ sort_order: index, updated_at: new Date().toISOString() }).eq("id", id).eq("menu_site_id", menuId)
    )
  );
  const error = results.find((result) => result.error)?.error;

  if (error) {
    redirectToMenuEditWithError(menuId, `아이템 순서 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "아이템 순서가 저장되었습니다.");
}

export async function deleteMenuItemAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const itemId = getString(formData, "itemId");

  if (!menuId || !itemId) {
    redirect("/mypage?error=missing-menu-item-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const item = await assertItemBelongsToMenuSite(menuId, itemId);

  const { count, error: countError } = await supabase
    .from("menu_item_traits")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("menu_item_id", itemId);

  if (countError) {
    redirectToMenuEditWithError(menuId, `하위 맛/특징 지표 확인에 실패했습니다: ${countError.message}`);
  }

  if ((count ?? 0) > 0) {
    const { error: hideError } = await supabase
      .from("menu_items")
      .update({ visible: false, updated_at: new Date().toISOString() })
      .eq("id", itemId)
      .eq("menu_site_id", menuId);

    if (hideError) {
      redirectToMenuEditWithError(menuId, `아이템 숨김 처리에 실패했습니다: ${hideError.message}`);
    }

    revalidateMenuPaths(menuId, menuSite.slug);
    redirectToMenuEdit(menuId, "하위 맛/특징 지표가 있어 삭제하지 않고 메뉴판 표시를 껐습니다.");
  }

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .eq("menu_site_id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `아이템 삭제에 실패했습니다: ${error.message}`);
  }

  const removeError = await removeMenuImagePath(supabase, item.image_path);

  if (removeError) {
    redirectToMenuEditWithError(menuId, `아이템은 삭제되었지만 Storage 이미지 정리에 실패했습니다: ${removeError.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "아이템이 삭제되었습니다.");
}

export async function createMenuItemPriceOptionAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const itemId = getString(formData, "itemId");
  if (!menuId || !itemId) redirect("/mypage?error=missing-menu-item-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  const maxPriceOptionsPerItem = getMaxPriceOptionsPerItem(templateCapabilities);
  await assertItemBelongsToMenuSite(menuId, itemId);

  const { count: optionCount, error: optionCountError } = await supabase
    .from("menu_item_price_options")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("menu_item_id", itemId);

  if (optionCountError) {
    redirectToMenuEditWithError(menuId, `가격 옵션 개수 확인에 실패했습니다: ${optionCountError.message}`);
  }

  if ((optionCount ?? 0) >= maxPriceOptionsPerItem) {
    redirectToMenuEditWithError(menuId, getPriceOptionLimitError(maxPriceOptionsPerItem));
  }

  const payloadInput = validatePriceOptionForm(menuId, formData);
  const payload: MenuItemPriceOptionInsert = {
    menu_site_id: menuId,
    menu_item_id: itemId,
    visible: true,
    ...payloadInput,
  };
  const { error } = await supabase.from("menu_item_price_options").insert(payload);

  if (error) redirectToMenuEditWithError(menuId, `가격 옵션 추가에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "가격 옵션이 추가되었습니다.");
}

export async function updateMenuItemPriceOptionAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const priceOptionId = getString(formData, "priceOptionId");
  if (!menuId || !priceOptionId) redirect("/mypage?error=missing-price-option-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertPriceOptionBelongsToMenuSite(menuId, priceOptionId);

  const payloadInput = validatePriceOptionForm(menuId, formData);
  const payload: MenuItemPriceOptionUpdate = { ...payloadInput, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("menu_item_price_options").update(payload).eq("id", priceOptionId).eq("menu_site_id", menuId);

  if (error) redirectToMenuEditWithError(menuId, `가격 옵션 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "가격 옵션이 저장되었습니다.");
}

export async function deleteMenuItemPriceOptionAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const priceOptionId = getString(formData, "priceOptionId");
  if (!menuId || !priceOptionId) redirect("/mypage?error=missing-price-option-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertPriceOptionBelongsToMenuSite(menuId, priceOptionId);
  const { error } = await supabase.from("menu_item_price_options").delete().eq("id", priceOptionId).eq("menu_site_id", menuId);

  if (error) redirectToMenuEditWithError(menuId, `가격 옵션 삭제에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "가격 옵션이 삭제되었습니다.");
}

export async function createMenuItemTraitAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const itemId = getString(formData, "itemId");
  if (!menuId || !itemId) redirect("/mypage?error=missing-menu-item-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertItemBelongsToMenuSite(menuId, itemId);

  const { count: traitCount, error: traitCountError } = await supabase
    .from("menu_item_traits")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("menu_item_id", itemId);

  if (traitCountError) {
    redirectToMenuEditWithError(menuId, `맛/특징 지표 개수 확인에 실패했습니다: ${traitCountError.message}`);
  }

  if ((traitCount ?? 0) >= MENU_LIMITS.maxTraitsPerItem) {
    redirectToMenuEditWithError(menuId, `맛/특징 지표는 아이템당 최대 ${MENU_LIMITS.maxTraitsPerItem}개까지 등록할 수 있습니다.`);
  }

  const validation = validateMenuItemTrait({
    label: formData.get("trait_label"),
    value: formData.get("trait_value"),
    max_value: formData.get("trait_max_value"),
    visible: getBoolean(formData, "trait_visible"),
    sort_order: formData.get("trait_sort_order"),
  });

  if (!validation.ok) redirectToMenuEditWithError(menuId, validation.message);

  const payload: MenuItemTraitInsert = {
    menu_site_id: menuId,
    menu_item_id: itemId,
    ...validation.trait,
  };
  const { error } = await supabase.from("menu_item_traits").insert(payload);

  if (error) redirectToMenuEditWithError(menuId, `맛/특징 지표 추가에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "맛/특징 지표가 추가되었습니다.");
}

export async function updateMenuItemTraitAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const traitId = getString(formData, "traitId");
  if (!menuId || !traitId) redirect("/mypage?error=missing-trait-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertTraitBelongsToMenuSite(menuId, traitId);

  const validation = validateMenuItemTrait({
    label: formData.get("trait_label"),
    value: formData.get("trait_value"),
    max_value: formData.get("trait_max_value"),
    visible: getBoolean(formData, "trait_visible"),
    sort_order: formData.get("trait_sort_order"),
  });

  if (!validation.ok) redirectToMenuEditWithError(menuId, validation.message);

  const payload: MenuItemTraitUpdate = { ...validation.trait, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("menu_item_traits").update(payload).eq("id", traitId).eq("menu_site_id", menuId);

  if (error) redirectToMenuEditWithError(menuId, `맛/특징 지표 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "맛/특징 지표가 저장되었습니다.");
}

export async function deleteMenuItemTraitAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const traitId = getString(formData, "traitId");
  if (!menuId || !traitId) redirect("/mypage?error=missing-trait-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertTraitBelongsToMenuSite(menuId, traitId);
  const { error } = await supabase.from("menu_item_traits").delete().eq("id", traitId).eq("menu_site_id", menuId);

  if (error) redirectToMenuEditWithError(menuId, `맛/특징 지표 삭제에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "맛/특징 지표가 삭제되었습니다.");
}

export async function createChefAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const chefName = getString(formData, "chef_name");
  const chefRole = getString(formData, "chef_role");
  const chefDescription = getString(formData, "chef_description");

  if (!chefName) redirectToTabEditWithError(menuId, "about", "셰프/인물 이름을 입력해주세요.");
  if (!chefRole) redirectToTabEditWithError(menuId, "about", "셰프/인물 역할을 입력해주세요.");
  if (!chefDescription) redirectToTabEditWithError(menuId, "about", "셰프/인물 소개를 입력해주세요.");
  validateRequiredText(menuId, chefName, "셰프/인물 이름", MENU_FIELD_LIMITS.menuChefs.chefName, "about");
  validateRequiredText(menuId, chefRole, "셰프/인물 역할", MENU_FIELD_LIMITS.menuChefs.chefRole, "about");
  validateRequiredText(menuId, chefDescription, "셰프/인물 소개", MENU_FIELD_LIMITS.menuChefs.chefDescription, "about");

  const { count: chefCount, error: chefCountError } = await supabase
    .from("menu_chefs")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (chefCountError) redirectToTabEditWithError(menuId, "about", `셰프/인물 개수 확인에 실패했습니다: ${chefCountError.message}`);
  if ((chefCount ?? 0) >= MENU_LIMITS.maxChefsPerSite) {
    redirectToTabEditWithError(menuId, "about", `셰프/인물 정보는 최대 ${MENU_LIMITS.maxChefsPerSite}명까지 등록할 수 있습니다.`);
  }

  const payload: MenuChefInsert = {
    menu_site_id: menuId,
    chef_name: chefName,
    chef_role: chefRole,
    chef_description: chefDescription,
    visible: getBoolean(formData, "chef_visible"),
    sort_order: getNumber(formData, "chef_sort_order"),
  };
  const { error } = await supabase.from("menu_chefs").insert(payload);

  if (error) redirectToTabEditWithError(menuId, "about", `셰프/인물 추가에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "about", "셰프/인물 정보가 추가되었습니다.");
}

export async function updateChefAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const chefId = getString(formData, "chefId");
  if (!menuId || !chefId) redirect("/mypage?error=missing-chef-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertChefBelongsToMenuSite(menuId, chefId);
  const chefName = getString(formData, "chef_name");
  const chefRole = getString(formData, "chef_role");
  const chefDescription = getString(formData, "chef_description");

  if (!chefName) redirectToTabEditWithError(menuId, "about", "셰프/인물 이름을 입력해주세요.");
  if (!chefRole) redirectToTabEditWithError(menuId, "about", "셰프/인물 역할을 입력해주세요.");
  if (!chefDescription) redirectToTabEditWithError(menuId, "about", "셰프/인물 소개를 입력해주세요.");
  validateRequiredText(menuId, chefName, "셰프/인물 이름", MENU_FIELD_LIMITS.menuChefs.chefName, "about");
  validateRequiredText(menuId, chefRole, "셰프/인물 역할", MENU_FIELD_LIMITS.menuChefs.chefRole, "about");
  validateRequiredText(menuId, chefDescription, "셰프/인물 소개", MENU_FIELD_LIMITS.menuChefs.chefDescription, "about");

  const payload: MenuChefUpdate = {
    chef_name: chefName,
    chef_role: chefRole,
    chef_description: chefDescription,
    visible: getBoolean(formData, "chef_visible"),
    sort_order: getNumber(formData, "chef_sort_order"),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("menu_chefs").update(payload).eq("id", chefId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "about", `셰프/인물 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "about", "셰프/인물 정보가 저장되었습니다.");
}

export async function deleteChefAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const chefId = getString(formData, "chefId");
  if (!menuId || !chefId) redirect("/mypage?error=missing-chef-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const chef = await assertChefBelongsToMenuSite(menuId, chefId);
  const { error } = await supabase.from("menu_chefs").delete().eq("id", chefId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "about", `셰프/인물 삭제에 실패했습니다: ${error.message}`);

  const removeError = await removeMenuImagePath(supabase, chef.chef_image_path);

  if (removeError) {
    redirectToTabEditWithError(menuId, "about", `셰프/인물 정보는 삭제되었지만 Storage 이미지 정리에 실패했습니다: ${removeError.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "about", "셰프/인물 정보가 삭제되었습니다.");
}

export async function createEventAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const title = getString(formData, "event_title");
  const description = getString(formData, "event_description");

  if (!title) redirectToTabEditWithError(menuId, "events", "이벤트 제목을 입력해주세요.");
  if (!description) redirectToTabEditWithError(menuId, "events", "이벤트 설명을 입력해주세요.");
  validateRequiredText(menuId, title, "이벤트 제목", MENU_FIELD_LIMITS.menuEvents.eventTitle, "events");
  validateRequiredText(menuId, description, "이벤트 설명", MENU_FIELD_LIMITS.menuEvents.eventDescription, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_subtitle"), "이벤트 부제목", MENU_FIELD_LIMITS.menuEvents.eventSubtitle, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_period"), "이벤트 기간 문구", MENU_FIELD_LIMITS.menuEvents.eventPeriod, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_benefit"), "이벤트 혜택", MENU_FIELD_LIMITS.menuEvents.eventBenefit, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_detail"), "이벤트 상세", MENU_FIELD_LIMITS.menuEvents.eventDetail, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_regular_price_label"), "정가 표시 문구", MENU_FIELD_LIMITS.menuEvents.eventRegularPriceLabel, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_sale_price_label"), "할인가/이벤트가 표시 문구", MENU_FIELD_LIMITS.menuEvents.eventSalePriceLabel, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_link_url"), "이벤트 링크 URL", MENU_FIELD_LIMITS.menuEvents.linkUrl, "events");
  const eventRegularPriceLabel = getNullableString(formData, "event_regular_price_label");
  const eventSalePriceLabel = getNullableString(formData, "event_sale_price_label");
  const hasEventPriceData = Boolean(eventRegularPriceLabel || eventSalePriceLabel);

  const { count: eventCount, error: eventCountError } = await supabase
    .from("menu_events")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (eventCountError) redirectToTabEditWithError(menuId, "events", `이벤트 개수 확인에 실패했습니다: ${eventCountError.message}`);
  if ((eventCount ?? 0) >= MENU_LIMITS.maxEventsPerSite) {
    redirectToTabEditWithError(menuId, "events", `이벤트는 최대 ${MENU_LIMITS.maxEventsPerSite}개까지 등록할 수 있습니다.`);
  }

  const payload: MenuEventInsert = {
    menu_site_id: menuId,
    event_title: title,
    event_subtitle: getNullableString(formData, "event_subtitle"),
    event_description: description,
    event_period: getNullableString(formData, "event_period"),
    event_benefit: getNullableString(formData, "event_benefit"),
    event_detail: getNullableString(formData, "event_detail"),
    event_regular_price_label: eventRegularPriceLabel,
    event_sale_price_label: eventSalePriceLabel,
    event_price_visible: Boolean(getBoolean(formData, "event_price_visible") && hasEventPriceData),
    start_date: getDateString(formData, "event_start_date"),
    end_date: getDateString(formData, "event_end_date"),
    link_url: getNullableString(formData, "event_link_url"),
    visible: getBoolean(formData, "event_visible"),
    sort_order: getNumber(formData, "event_sort_order"),
  };
  const { error } = await supabase.from("menu_events").insert(payload);

  if (error) redirectToTabEditWithError(menuId, "events", `이벤트 추가에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "events", "이벤트가 추가되었습니다.");
}

export async function updateEventAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const eventId = getString(formData, "eventId");
  if (!menuId || !eventId) redirect("/mypage?error=missing-event-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertEventBelongsToMenuSite(menuId, eventId);
  const title = getString(formData, "event_title");
  const description = getString(formData, "event_description");

  if (!title) redirectToTabEditWithError(menuId, "events", "이벤트 제목을 입력해주세요.");
  if (!description) redirectToTabEditWithError(menuId, "events", "이벤트 설명을 입력해주세요.");
  validateRequiredText(menuId, title, "이벤트 제목", MENU_FIELD_LIMITS.menuEvents.eventTitle, "events");
  validateRequiredText(menuId, description, "이벤트 설명", MENU_FIELD_LIMITS.menuEvents.eventDescription, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_subtitle"), "이벤트 부제목", MENU_FIELD_LIMITS.menuEvents.eventSubtitle, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_period"), "이벤트 기간 문구", MENU_FIELD_LIMITS.menuEvents.eventPeriod, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_benefit"), "이벤트 혜택", MENU_FIELD_LIMITS.menuEvents.eventBenefit, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_detail"), "이벤트 상세", MENU_FIELD_LIMITS.menuEvents.eventDetail, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_regular_price_label"), "정가 표시 문구", MENU_FIELD_LIMITS.menuEvents.eventRegularPriceLabel, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_sale_price_label"), "할인가/이벤트가 표시 문구", MENU_FIELD_LIMITS.menuEvents.eventSalePriceLabel, "events");
  validateOptionalText(menuId, getNullableString(formData, "event_link_url"), "이벤트 링크 URL", MENU_FIELD_LIMITS.menuEvents.linkUrl, "events");
  const eventRegularPriceLabel = getNullableString(formData, "event_regular_price_label");
  const eventSalePriceLabel = getNullableString(formData, "event_sale_price_label");
  const hasEventPriceData = Boolean(eventRegularPriceLabel || eventSalePriceLabel);

  const payload: MenuEventUpdate = {
    event_title: title,
    event_subtitle: getNullableString(formData, "event_subtitle"),
    event_description: description,
    event_period: getNullableString(formData, "event_period"),
    event_benefit: getNullableString(formData, "event_benefit"),
    event_detail: getNullableString(formData, "event_detail"),
    event_regular_price_label: eventRegularPriceLabel,
    event_sale_price_label: eventSalePriceLabel,
    event_price_visible: Boolean(getBoolean(formData, "event_price_visible") && hasEventPriceData),
    start_date: getDateString(formData, "event_start_date"),
    end_date: getDateString(formData, "event_end_date"),
    link_url: getNullableString(formData, "event_link_url"),
    visible: getBoolean(formData, "event_visible"),
    sort_order: getNumber(formData, "event_sort_order"),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("menu_events").update(payload).eq("id", eventId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "events", `이벤트 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "events", "이벤트가 저장되었습니다.");
}

export async function deleteEventAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const eventId = getString(formData, "eventId");
  if (!menuId || !eventId) redirect("/mypage?error=missing-event-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const event = await assertEventBelongsToMenuSite(menuId, eventId);
  const { error } = await supabase.from("menu_events").delete().eq("id", eventId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "events", `이벤트 삭제에 실패했습니다: ${error.message}`);

  const removeError = await removeMenuImagePath(supabase, event.event_image_path);

  if (removeError) {
    redirectToTabEditWithError(menuId, "events", `이벤트는 삭제되었지만 Storage 이미지 정리에 실패했습니다: ${removeError.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "events", "이벤트가 삭제되었습니다.");
}

async function validateSocialLinkForm(menuId: string, formData: FormData) {
  const type = getString(formData, "social_type");
  const label = getString(formData, "social_label");
  const displayName = getString(formData, "social_display_name");
  const url = getString(formData, "social_url");

  if (!isSocialLinkType(type)) redirectToTabEditWithError(menuId, "about", "SNS 종류를 선택해주세요.");
  if (!label) redirectToTabEditWithError(menuId, "about", "SNS 화면 표시 라벨을 입력해주세요.");
  if (!displayName) redirectToTabEditWithError(menuId, "about", "SNS 아이디/표시명을 입력해주세요.");
  validateRequiredText(menuId, label, "SNS 화면 표시 라벨", MENU_FIELD_LIMITS.menuSocialLinks.label, "about");
  validateRequiredText(menuId, displayName, "SNS 아이디/표시명", MENU_FIELD_LIMITS.menuSocialLinks.displayName, "about");
  validateRequiredText(menuId, url, "SNS URL", MENU_FIELD_LIMITS.menuSocialLinks.url, "about");
  if (!/^https?:\/\//i.test(url)) redirectToTabEditWithError(menuId, "about", "SNS URL은 http:// 또는 https://로 시작해야 합니다.");

  return {
    type,
    label,
    display_name: displayName,
    url,
    visible: getBoolean(formData, "social_visible"),
    sort_order: getNumber(formData, "social_sort_order"),
  };
}

export async function createSocialLinkAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const payloadInput = await validateSocialLinkForm(menuId, formData);

  const { data: existingLinks, error: existingError } = await supabase
    .from("menu_social_links")
    .select("id, type")
    .eq("menu_site_id", menuId);

  if (existingError) redirectToTabEditWithError(menuId, "about", `SNS 링크 확인에 실패했습니다: ${existingError.message}`);
  if ((existingLinks ?? []).length >= MENU_LIMITS.maxSocialLinksPerSite) {
    redirectToTabEditWithError(menuId, "about", `SNS 링크는 최대 ${MENU_LIMITS.maxSocialLinksPerSite}개까지 등록할 수 있습니다.`);
  }
  if ((existingLinks ?? []).some((link) => link.type === payloadInput.type)) {
    redirectToTabEditWithError(menuId, "about", "같은 SNS 종류는 한 번만 등록할 수 있습니다.");
  }

  const payload: MenuSocialLinkInsert = { menu_site_id: menuId, ...payloadInput };
  const { error } = await supabase.from("menu_social_links").insert(payload);

  if (error) redirectToTabEditWithError(menuId, "about", `SNS 링크 추가에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "about", "SNS 링크가 추가되었습니다.");
}

export async function updateSocialLinkAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const socialLinkId = getString(formData, "socialLinkId");
  if (!menuId || !socialLinkId) redirect("/mypage?error=missing-social-link-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertSocialLinkBelongsToMenuSite(menuId, socialLinkId);
  const payloadInput = await validateSocialLinkForm(menuId, formData);

  const { data: duplicate, error: duplicateError } = await supabase
    .from("menu_social_links")
    .select("id")
    .eq("menu_site_id", menuId)
    .eq("type", payloadInput.type)
    .neq("id", socialLinkId)
    .maybeSingle();

  if (duplicateError) redirectToTabEditWithError(menuId, "about", `SNS 중복 확인에 실패했습니다: ${duplicateError.message}`);
  if (duplicate) redirectToTabEditWithError(menuId, "about", "같은 SNS 종류는 한 번만 등록할 수 있습니다.");

  const payload: MenuSocialLinkUpdate = { ...payloadInput, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("menu_social_links").update(payload).eq("id", socialLinkId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "about", `SNS 링크 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "about", "SNS 링크가 저장되었습니다.");
}

export async function deleteSocialLinkAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const socialLinkId = getString(formData, "socialLinkId");
  if (!menuId || !socialLinkId) redirect("/mypage?error=missing-social-link-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertSocialLinkBelongsToMenuSite(menuId, socialLinkId);
  const { error } = await supabase.from("menu_social_links").delete().eq("id", socialLinkId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "about", `SNS 링크 삭제에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "about", "SNS 링크가 삭제되었습니다.");
}
