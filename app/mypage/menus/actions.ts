"use server";

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
import { getAiCreditBalanceForMenuSite, spendAiCredits } from "@/lib/server/ai-credits-service";
import {
  getMenuSiteAccessStateForMenuSite,
  MENU_SITE_INACTIVE_EDIT_MESSAGE,
  MENU_SITE_INACTIVE_PUBLISH_MESSAGE,
} from "@/lib/server/menu-site-access-service";
import { getBasicMenuSiteLimitState } from "@/lib/server/basic-menu-site-limit-service";
import { DEFAULT_LOCALE, LOCALE_LABELS, TRANSLATABLE_LOCALES, getEnabledLocales, isSupportedLocale, type SupportedLocale } from "@/lib/locales";
import type { EditableTranslationDraftValue, EditableTranslationEntityType, EditableTranslationLocale, PartialTranslationActionResult } from "@/lib/menu-localization-draft";
import { PARTIAL_TRANSLATION_FAILURE_MESSAGE, getSafeTranslationErrorMessage } from "@/lib/menu-translation-errors";
import { createStarterMenuData, getStarterPreset } from "@/lib/menu-starter-presets";
import { isValidPublicSlug, isValidRestaurantPhone, MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";
import { normalizePcTabletLayoutMode, supportsPcTabletLayoutMode } from "@/lib/menu-layout-modes";
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
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json, MenuSectionKey, MenuSiteStatus } from "@/lib/supabase/types";
import { BADGE_STYLE_KEYS, isHexColor, type BadgeStyleKey, type BadgeStyles } from "@/lib/template-badge-styles";
import { normalizeBackgroundColor } from "@/lib/template-background-colors";
import { getTemplateCapabilities, type TemplateCapabilities } from "@/lib/template-capabilities";
import { getTemplateCategoryFromKey, isTemplateCategoryKey, isTemplateSupportedForService, isValidTemplateKey, type TemplateKey } from "@/lib/templates";
import { getTemplateType } from "@/lib/template-types";
import { isEnglishFontValue, isKoreanFontValue } from "@/lib/font-options";
import { normalizeFontSizeScaleKeyForTemplate } from "@/lib/template-typography-presets";
import { mergePageSettings, validateMenuItemTrait } from "@/types/menu";

const allowedStatuses = ["draft", "published", "archived"] as const;
const MENU_IMAGES_BUCKET = "menu-images";
const MENU_VIDEOS_BUCKET = "menu-videos";
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
type MenuItemTraitInsert = Database["public"]["Tables"]["menu_item_traits"]["Insert"];
type MenuItemTraitUpdate = Database["public"]["Tables"]["menu_item_traits"]["Update"];
type MenuTranslationJobUpdate = Database["public"]["Tables"]["menu_translation_jobs"]["Update"];
type MenuSiteTranslationInsert = Database["public"]["Tables"]["menu_site_translations"]["Insert"];
type MenuPageTranslationInsert = Database["public"]["Tables"]["menu_page_translations"]["Insert"];
type MenuCategoryTranslationInsert = Database["public"]["Tables"]["menu_category_translations"]["Insert"];
type MenuItemTranslationInsert = Database["public"]["Tables"]["menu_item_translations"]["Insert"];
type LooseInsert = Record<string, unknown>;
type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

function isPublicPresetImageUrl(value: string | null | undefined) {
  return Boolean(value && PUBLIC_PRESET_IMAGE_PREFIXES.some((prefix) => value.startsWith(prefix)));
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

  const menuSiteSelect = "id, user_id, name, slug, status, published_at, template_key, template_category, restaurant_name, restaurant_category, menu_cover_label, menu_cover_title, menu_cover_description, brand_description, settings, page_settings";
  const fallbackMenuSiteSelect = "id, user_id, name, slug, status, published_at, template_key, restaurant_name, restaurant_category, menu_cover_title, menu_cover_description, brand_description, settings, page_settings";

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
  const hasFullTranslationCredits = await hasEnoughAiCredits(menuId, 5);
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
}): Promise<FullTranslationDraftActionResult> {
  const menuId = input.menuId?.trim();
  if (!menuId) {
    return { ok: false, message: "자동 번역 초안 생성 중 오류가 발생했습니다. 다시 시도해주세요." };
  }

  const targetLocales = input.targetLocales.filter((locale): locale is EditableTranslationLocale =>
    TARGET_TRANSLATION_LOCALES.includes(locale as (typeof TARGET_TRANSLATION_LOCALES)[number])
  );

  if (targetLocales.length === 0) {
    return { ok: false, message: "자동 번역을 실행할 외국어를 먼저 선택해주세요." };
  }

  try {
    const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
    const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
    const aiUsagePlanKey = normalizeMenuLinkPlanKey(productKey);
    const fullTranslationUsage = getAiUsage(menuSite.settings, aiUsagePlanKey, "ai_translate_full");
    const hasFullTranslationCredits = await hasEnoughAiCredits(menuId, 5);

    if (hasFullTranslationCredits === false || (hasFullTranslationCredits === null && isAiUsageExceeded(fullTranslationUsage))) {
      return { ok: false, message: "AI 크레딧이 부족합니다. 크레딧을 충전하면 계속 사용할 수 있습니다.", usage: fullTranslationUsage };
    }

    const result = await runMenuTranslationDraft(supabase, menuId, targetLocales);
    const failedLocaleLabels = result.localeResults
      .filter((localeResult) => !localeResult.ok)
      .map((localeResult) => LOCALE_LABELS[localeResult.locale])
      .join(", ");
    const untranslatedWarningCount = result.localeResults.reduce((total, localeResult) => total + localeResult.untranslatedWarningCount, 0);
    let usage = fullTranslationUsage;

    if (result.translatedEntities > 0) {
      const usedAt = new Date();
      const creditSpend = await spendAiCredits({ userId: menuSite.user_id, menuSiteId: menuId, featureKey: "full_translation" });
      usage = getAiUsageFromCreditSpend("ai_translate_full", creditSpend.usedCredits, creditSpend.totalCredits, usedAt);
    }

    const entityTypeByTable = {
      menu_site_translations: "site",
      menu_page_translations: "page",
      menu_category_translations: "category",
      menu_item_translations: "item",
    } as const satisfies Record<string, EditableTranslationEntityType>;
    const data = result.rows.flatMap((row) => {
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

    return {
      ok: true,
      data,
      usage,
      message:
        failedLocaleLabels && result.translatedEntities > 0
          ? `${failedLocaleLabels} 번역은 실패했지만, 생성된 번역 초안을 표시했습니다. 저장 전 내용을 확인해주세요.`
          : untranslatedWarningCount > 0
          ? "전체 자동 번역 초안이 생성되었습니다. 일부 항목은 원문이 남아 있을 수 있으니 저장 전 내용을 확인해주세요."
          : result.translatedEntities > 0
          ? "전체 자동 번역 초안이 생성되었습니다. 저장 후 공개 메뉴판에 반영됩니다."
          : "최신 번역이 이미 준비되어 있습니다.",
    };
  } catch (error) {
    console.error(`[localization:auto-translate] draft action failed ${formatServerActionLogContext({
      menuId,
      targetLocales,
      message: error instanceof Error ? error.message : "unknown",
      stack: error instanceof Error ? error.stack : undefined,
    })}`);
    return {
      ok: false,
      message: getSafeTranslationErrorMessage(error instanceof Error ? error.message : "자동 번역 초안 생성 중 오류가 발생했습니다."),
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

  designSettings.fontSizeScale = fontSizeScaleKey;

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
        (candidate.entityType === "site" || candidate.entityType === "page" || candidate.entityType === "category" || candidate.entityType === "item") &&
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
      data: {
        entityType: EditableTranslationEntityType;
        entityId: string;
        field: string;
        locale: EditableTranslationLocale;
        value: string;
        sourceHash: string;
      }[];
      usage: { used: number; limit: number };
      message: string;
    }
  | {
      ok: false;
      message: string;
      usage?: { used: number; limit: number };
    };

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
  const allowedFields: Record<EditableTranslationEntityType, readonly string[]> = isDisplayLocalization ? {
    site: ["restaurant_name"],
    page: [],
    category: ["name"],
    item: ["name", "set_name", "price_label", "badge_label"],
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
  };

  const idsByType = saveableDraftValues.reduce<Record<EditableTranslationEntityType, Set<string>>>(
    (result, draft) => {
      result[draft.entityType].add(draft.entityId);
      return result;
    },
    { site: new Set(), page: new Set(), category: new Set(), item: new Set() }
  );

  if (idsByType.site.size > 1 || (idsByType.site.size === 1 && !idsByType.site.has(menuId))) {
    redirectToTabEditWithError(menuId, "localization", "번역 저장 대상 메뉴판을 확인할 수 없습니다.");
  }

  const [pagesResult, categoriesResult, itemsResult] = await Promise.all([
    idsByType.page.size > 0
      ? supabase.from("menu_pages").select("id").eq("menu_site_id", menuId).in("id", [...idsByType.page])
      : Promise.resolve({ data: [], error: null }),
    idsByType.category.size > 0
      ? supabase.from("menu_categories").select("id").eq("menu_site_id", menuId).in("id", [...idsByType.category])
      : Promise.resolve({ data: [], error: null }),
    idsByType.item.size > 0
      ? supabase.from("menu_items").select("id").eq("menu_site_id", menuId).in("id", [...idsByType.item])
      : Promise.resolve({ data: [], error: null }),
  ]);

  const readError = pagesResult.error ?? categoriesResult.error ?? itemsResult.error;
  if (readError) {
    redirectToTabEditWithError(menuId, "localization", `번역 저장 대상 확인에 실패했습니다: ${readError.message}`);
  }

  const allowedIds = {
    site: new Set([menuId]),
    page: new Set((pagesResult.data ?? []).map((row) => row.id)),
    category: new Set((categoriesResult.data ?? []).map((row) => row.id)),
    item: new Set((itemsResult.data ?? []).map((row) => row.id)),
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

  const [{ error: siteError }, { error: pageError }, { error: categoryError }, { error: itemError }] = await Promise.all([
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
  ]);
  const saveError = siteError ?? pageError ?? categoryError ?? itemError;

  if (saveError) {
    redirectToTabEditWithError(menuId, "localization", `${errorLabel} 중 오류가 발생했습니다: ${saveError.message}`);
  }
}

export async function updateLocalizationSettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const saveMode = getString(formData, "localization_save_mode") || "all";
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
  delete designSettings.koreanFont;
  delete designSettings.englishFont;
  delete designSettings.fontSizeScale;
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

  designSettings.fontSizeScale = fontSizeScaleKey;

  pageSettings.design = designSettings;
  delete pageSettings.backgroundColor;
  delete pageSettings.koreanFont;
  delete pageSettings.englishFont;
  delete pageSettings.fontSizeScale;

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
  const featuredItemName = preset.featured_item_name;
  let featuredItemId: string | null = null;

  if (featuredItemName) {
    const { data: featuredItem, error: featuredItemError } = await supabase
      .from("menu_items")
      .select("id")
      .eq("menu_site_id", menuId)
      .eq("name", featuredItemName)
      .eq("visible", true)
      .maybeSingle();

    if (featuredItemError) {
      redirectToTabEditWithError(menuId, "cover", `대표 추천 메뉴 확인에 실패했습니다: ${featuredItemError.message}`);
    }

    featuredItemId = featuredItem?.id ?? null;
  }

  if (!featuredItemId) {
    const { data: recommendedItem, error: recommendedItemError } = await supabase
      .from("menu_items")
      .select("id")
      .eq("menu_site_id", menuId)
      .eq("visible", true)
      .eq("recommended", true)
      .order("sort_order", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (recommendedItemError) {
      redirectToTabEditWithError(menuId, "cover", `대표 추천 메뉴 확인에 실패했습니다: ${recommendedItemError.message}`);
    }

    featuredItemId = recommendedItem?.id ?? null;
  }

  const nextPageSettings = {
    ...getJsonObject(menuSite.page_settings),
    featured_item_enabled: Boolean(featuredItemId),
    featured_item_id: featuredItemId,
  };

  const { error } = await supabase
    .from("menu_sites")
    .update({
      menu_cover_title: preset.site.menu_cover_title,
      menu_cover_description: preset.site.menu_cover_description,
      cover_image_url: preset.site.cover_image_url,
      cover_image_path: null,
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
  if (Object.keys(designSettings).length > 0) {
    pageSettings.design = designSettings;
  } else {
    delete pageSettings.design;
  }
  delete pageSettings.backgroundColor;
  delete pageSettings.koreanFont;
  delete pageSettings.englishFont;
  delete pageSettings.fontSizeScale;

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

  if (!name) {
    redirectToTabEditWithError(menuId, "basic", "메뉴판 이름을 입력해주세요.");
  }

  validateRequiredText(menuId, name, "메뉴판 이름", MENU_FIELD_LIMITS.menuSites.name, "basic");
  validateRequiredText(menuId, restaurantName ?? "", "실제 매장명", MENU_FIELD_LIMITS.menuSites.restaurantName, "basic");
  if (hasBrandDescriptionField) {
    validateOptionalText(menuId, brandDescription, "매장 설명", MENU_FIELD_LIMITS.menuSites.brandDescription, "basic");
  }
  if (hasFooterNotice1Field) {
    validateOptionalText(menuId, footerNotice1, "안내사항 1", MENU_FIELD_LIMITS.menuSites.footerNotice, "basic");
  }
  if (hasFooterNotice2Field) {
    validateOptionalText(menuId, footerNotice2, "안내사항 2", MENU_FIELD_LIMITS.menuSites.footerNotice, "basic");
  }
  if (hasFooterNotice3Field) {
    validateOptionalText(menuId, footerNotice3, "안내사항 3", MENU_FIELD_LIMITS.menuSites.footerNotice, "basic");
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

  validateRequiredText(menuId, introTitle ?? "", "인트로 제목", MENU_FIELD_LIMITS.menuSites.introTitle, "intro");
  validateRequiredText(menuId, introDescription ?? "", "인트로 설명", MENU_FIELD_LIMITS.menuSites.introDescription, "intro");
  if (hasBrandDescriptionField) {
    validateOptionalText(menuId, brandDescription, "매장 설명", MENU_FIELD_LIMITS.menuSites.brandDescription, "intro");
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
  const templateType = getTemplateType(menuSite.template_key);
  const canUseFeaturedItem = templateType === "menu" && menuCoverCapabilities.usesFeaturedItem;
  const wantsFeaturedItem = menuCoverEnabled && canUseFeaturedItem && getBoolean(formData, "featured_item_enabled");
  const requestedFeaturedItemId = menuCoverEnabled && canUseFeaturedItem ? getNullableString(formData, "featured_item_id") : null;
  const featuredItemEnabled = wantsFeaturedItem && Boolean(requestedFeaturedItemId);
  let featuredItemId: string | null = null;

  if (hasMenuCoverLabelField) {
    validateOptionalText(menuId, menuCoverLabel, "커버 이미지 라벨", MENU_FIELD_LIMITS.menuSites.menuCoverLabel, "cover");
  }
  if (menuCoverEnabled && menuCoverCapabilities.usesCoverTitle) {
    validateRequiredText(menuId, menuCoverTitle ?? "", "커버 이미지 제목", MENU_FIELD_LIMITS.menuSites.menuCoverTitle, "cover");
  }
  if (menuCoverEnabled && menuCoverCapabilities.usesCoverDescription) {
    validateRequiredText(menuId, menuCoverDescription ?? "", "커버 이미지 설명", MENU_FIELD_LIMITS.menuSites.menuCoverDescription, "cover");
  }
  if (wantsFeaturedItem && !requestedFeaturedItemId) {
    redirectToTabEditWithError(menuId, "cover", "대표 추천 메뉴를 선택해주세요.");
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
        featured_item_enabled: featuredItemEnabled,
        featured_item_id: featuredItemEnabled ? featuredItemId : null,
      }
    : !menuCoverEnabled && canUseFeaturedItem
    ? {
        ...pageSettingsRecord,
        ...currentSettings,
        menu_cover_enabled: false,
      }
    : {
        ...pageSettingsRecord,
        ...currentSettings,
        menu_cover_enabled: menuCoverEnabled,
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
    validateOptionalText(menuId, brandDescription, "매장 설명", MENU_FIELD_LIMITS.menuSites.brandDescription, "about");
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
        is_sold_out: item.is_sold_out,
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
  const portionLabel = templateCapabilities.itemPortionLabel ? getNullableString(formData, "item_portion_label") : null;
  const description = templateCapabilities.itemDescription ? getNullableString(formData, "item_description") : null;
  const priceMode = getString(formData, "item_price_mode") === "options" ? "options" : "single";

  validateRequiredText(menuId, name, "아이템 이름", MENU_FIELD_LIMITS.menuItems.name);
  validateOptionalText(menuId, priceLabel, "가격 표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
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
  const portionLabel = templateCapabilities.itemPortionLabel ? getNullableString(formData, "item_portion_label") : null;
  const description = templateCapabilities.itemDescription ? getNullableString(formData, "item_description") : null;
  const priceMode = getString(formData, "item_price_mode") === "options" ? "options" : "single";
  const price = getOptionalNumber(formData, "item_price");

  validateRequiredText(menuId, name, "아이템 이름", MENU_FIELD_LIMITS.menuItems.name);
  validateOptionalText(menuId, priceLabel, "가격 표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
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

export async function saveMenuManagementBasicDraftAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const templateCapabilities = getTemplateCapabilities(menuSite.template_key);
  const maxPriceOptionsPerItem = getMaxPriceOptionsPerItem(templateCapabilities);
  const now = new Date().toISOString();
  const pageDrafts = parseDraftArray<MenuManagementBasicPageDraft>(formData, "page_basic_drafts");
  let categoryDrafts = parseDraftArray<MenuManagementBasicCategoryDraft>(formData, "category_basic_drafts");
  const itemDrafts = parseDraftArray<MenuManagementBasicItemDraft>(formData, "item_basic_drafts");
  const deletedPageIds = parseDraftStringArray(formData, "deleted_page_ids");
  const deletedCategoryIds = parseDraftStringArray(formData, "deleted_category_ids");
  const deletedItemIds = parseDraftStringArray(formData, "deleted_item_ids");
  const productKey = await getLatestProductKeyForMenuSite(supabase, menuId);
  const editorServiceType = getMenuEditorServiceTypeForMenuSite(productKey, getTemplateType(menuSite.template_key));
  const menuEditorCapabilities = MENU_EDITOR_CAPABILITIES[editorServiceType];
  const canManageMenuPages = menuEditorCapabilities.canManageMenuPages;
  const canConfigureDisplayPages = canManageMenuPages && menuEditorCapabilities.supportsDisplayPageTypes;
  const usesCategoryPriceOptionColumns = Boolean(templateCapabilities.categoryPriceOptionColumns && templateCapabilities.priceOptions);
  const pageManagementBlockedMessage = "메뉴링크 베이직은 1장 메뉴판으로 제공되어 페이지를 추가, 수정, 복사, 삭제하거나 정렬할 수 없습니다.";
  const pcTabletLayoutModeInput = formData.get("pc_tablet_layout_mode");
  const shouldSavePcTabletLayoutMode =
    typeof pcTabletLayoutModeInput === "string" && supportsPcTabletLayoutMode(menuSite.template_key);

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
    const priceLabel = normalizeDraftString(item.priceLabel);
    const portionLabel = normalizeDraftString(item.portionLabel);
    const badgeLabel = normalizeDraftString(item.badgeLabel);
    const badgeStyleKey = normalizeDraftString(item.badgeStyleKey) as BadgeStyleKey;
    const badgeBackgroundColor = normalizeDraftString(item.badgeBackgroundColor);
    const badgeTextColor = normalizeDraftString(item.badgeTextColor);
    const categoryId = normalizeDraftString(item.categoryId);
    if (!itemId || deletedItemIdSet.has(itemId) || categoryIdDeleteSet.has(categoryId)) continue;

    validateRequiredText(menuId, name, "아이템 이름", MENU_FIELD_LIMITS.menuItems.name);
    validateOptionalText(menuId, setName || null, "보조 언어 표기", MENU_FIELD_LIMITS.menuItems.setName);
    if (templateCapabilities.itemDescription) {
      validateOptionalText(menuId, description || null, "아이템 설명", MENU_FIELD_LIMITS.menuItems.description);
    }
    if (templateCapabilities.originInfo) {
      validateOptionalText(menuId, originInfo || null, "원산지 정보", MENU_FIELD_LIMITS.menuItems.originInfo);
    }
    validateOptionalText(menuId, priceLabel || null, "가격 표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
    if (templateCapabilities.itemPortionLabel) {
      validateOptionalText(menuId, portionLabel || null, "제공량", MENU_FIELD_LIMITS.menuItems.portionLabel);
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

  if (badgeStyleDrafts.length > 0) {
    const settings = getJsonObject(menuSite.settings);
    const badgeStyles = getJsonObject(settings.badge_styles);
    badgeStyleDrafts.forEach((draft) => {
      badgeStyles[draft.styleKey] = {
        background_color: draft.backgroundColor.toUpperCase(),
        text_color: draft.textColor.toUpperCase(),
      };
    });
    settings.badge_styles = badgeStyles;

    const { error } = await supabase
      .from("menu_sites")
      .update({ settings, updated_at: now })
      .eq("id", menuId);

    if (error) redirectToMenuEditWithError(menuId, `배지 색상 draft 저장에 실패했습니다: ${error.message}`);
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
  if (pageError) redirectToMenuEditWithError(menuId, `페이지 draft 저장에 실패했습니다: ${pageError.message}`);

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
  if (categoryError) redirectToMenuEditWithError(menuId, `카테고리 draft 저장에 실패했습니다: ${categoryError.message}`);

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
    const priceLabel = normalizeDraftString(item.priceLabel);

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
    if (!usesOptionPricing && item.isNew && numericPrice == null && !priceLabel) {
      redirectToMenuEditWithError(menuId, "새 아이템은 가격 또는 표시용 가격 중 하나를 입력해주세요.");
    }
    const payloadInput = {
      name: normalizeDraftString(item.name),
      set_name: normalizeDraftString(item.setName) || null,
      origin_info: normalizeDraftString(item.originInfo) || null,
      price: usesOptionPricing ? 0 : numericPrice ?? 0,
      price_label: usesOptionPricing ? null : priceLabel || null,
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

  revalidateMenuPaths(menuId, menuSite.slug);
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
    is_sold_out: sourceItem.is_sold_out,
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
