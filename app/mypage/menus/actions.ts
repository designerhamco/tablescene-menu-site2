"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getLegacyBadgeTypeForLabel, normalizeMenuBadgeLabel } from "@/lib/menu-badges";
import { pageSettingKeys } from "@/lib/menu-editor";
import { isValidPublicSlug, isValidRestaurantPhone, MENU_FIELD_LIMITS, MENU_LIMITS } from "@/lib/menu-limits";
import { getLegacyMenuPath, getPublicMenuPath } from "@/lib/menu-url";
import { isRestaurantTypeKey } from "@/lib/restaurant-types";
import { isSocialLinkType } from "@/lib/social-links";
import { createClient } from "@/lib/supabase/server";
import type { Database, MenuSectionKey, MenuSiteStatus } from "@/lib/supabase/types";
import { BADGE_STYLE_KEYS, isHexColor, type BadgeStyles } from "@/lib/template-badge-styles";
import { getTemplateCategoryFromKey, isTemplateCategoryKey, isValidTemplateKey, type TemplateKey } from "@/lib/templates";
import {
  ENGLISH_FONT_OPTIONS,
  KOREAN_FONT_OPTIONS,
  isFontSizeScaleKey,
  type EnglishFontKey,
  type KoreanFontKey,
} from "@/lib/template-typography-presets";
import { mergePageSettings, validateMenuItemTrait } from "@/types/menu";

const allowedStatuses = ["draft", "published", "archived"] as const;
const MENU_IMAGES_BUCKET = "menu-images";
const koreanFontKeys = new Set(KOREAN_FONT_OPTIONS.map((option) => option.key));
const englishFontKeys = new Set(ENGLISH_FONT_OPTIONS.map((option) => option.key));

type MenuCategoryInsert = Database["public"]["Tables"]["menu_categories"]["Insert"];
type MenuCategoryUpdate = Database["public"]["Tables"]["menu_categories"]["Update"];
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
type LooseInsert = Record<string, unknown>;

function getJsonObject(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value) ? { ...(value as Record<string, unknown>) } : {};
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(formData: FormData, key: string) {
  const value = getString(formData, key);
  return value || null;
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

function getNewMenuItemPriceOptions(menuId: string, formData: FormData) {
  return Array.from({ length: MENU_LIMITS.maxPriceOptionsPerItem }, (_, index) => {
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
}

type MenuItemTraitSlotInput = {
  id: string | null;
  label: string;
  value: number;
  visible: boolean;
  sort_order: number;
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

function getEditPath(menuId: string, params?: { error?: string; message?: string; tab?: string }) {
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

async function requireOwnedMenuSite(menuId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/mypage/menus/${menuId}/edit`);
  }

  const { data: menuSite, error } = await supabase
    .from("menu_sites")
    .select("id, user_id, slug, status, published_at, settings, page_settings")
    .eq("id", menuId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    redirectToEditWithError(menuId, `메뉴판 권한 확인에 실패했습니다: ${error.message}`);
  }

  if (!menuSite) {
    redirect("/mypage?error=menu-not-found");
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

export async function updateTypographySettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const koreanFontKey = getString(formData, "korean_font_key");
  const englishFontKey = getString(formData, "english_font_key");
  const fontSizeScaleKey = getString(formData, "font_size_scale_key");

  if (!koreanFontKeys.has(koreanFontKey as KoreanFontKey)) {
    redirectToTabEditWithError(menuId, "design", "한글 폰트 선택값이 올바르지 않습니다.");
  }

  if (!englishFontKeys.has(englishFontKey as EnglishFontKey)) {
    redirectToTabEditWithError(menuId, "design", "영문 폰트 선택값이 올바르지 않습니다.");
  }

  if (!isFontSizeScaleKey(fontSizeScaleKey)) {
    redirectToTabEditWithError(menuId, "design", "글자 크기 선택값이 올바르지 않습니다.");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const settings = {
    ...getJsonObject(menuSite.settings),
    typography: {
      korean_font_key: koreanFontKey,
      english_font_key: englishFontKey,
      font_size_scale_key: fontSizeScaleKey,
    },
  };

  const { error } = await supabase
    .from("menu_sites")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `글꼴과 글자 크기 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "글꼴과 글자 크기 설정이 저장되었습니다.");
}

export async function resetTypographySettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const settings = getJsonObject(menuSite.settings);
  delete settings.typography;

  const { error } = await supabase
    .from("menu_sites")
    .update({ settings, updated_at: new Date().toISOString() })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "design", `글꼴 기본값 복원에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "design", "현재 템플릿의 기본 글꼴과 글자 크기로 되돌렸습니다.");
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

  if (!templateCategory) {
    redirectWithError("템플릿 카테고리를 선택해주세요.");
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
  };

  let { error } = await supabase.from("menu_sites").insert(menuSiteInsert);

  if (error && error.message.toLowerCase().includes("template_category")) {
    const fallbackInsert: LooseInsert = {
      user_id: user.id,
      name,
      slug,
      template_key: templateKey,
      status,
    };
    const fallbackResult = await supabase.from("menu_sites").insert(fallbackInsert as never);
    error = fallbackResult.error;
  }

  if (error) {
    redirectWithError(`메뉴판 생성에 실패했습니다: ${error.message}`);
  }

  redirect("/mypage?message=menu-created");
}

export async function updateMenuSiteAction(formData: FormData) {
  const menuId = getString(formData, "menuId");

  if (!menuId) {
    redirect("/mypage?error=missing-menu-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const name = getString(formData, "name");
  const rawSlug = getString(formData, "slug");
  const restaurantName = getNullableString(formData, "restaurant_name");
  const restaurantType = getNullableString(formData, "restaurant_type");
  const slug = normalizeSlug(rawSlug);

  if (!name) {
    redirectToTabEditWithError(menuId, "basic", "메뉴판 이름을 입력해주세요.");
  }

  validateRequiredText(menuId, name, "메뉴판 이름", MENU_FIELD_LIMITS.menuSites.name, "basic");
  validateOptionalText(menuId, restaurantName, "실제 매장명", MENU_FIELD_LIMITS.menuSites.restaurantName, "basic");
  validateOptionalText(menuId, restaurantType, "업종", MENU_FIELD_LIMITS.menuSites.restaurantType, "basic");

  if (restaurantType && !isRestaurantTypeKey(restaurantType)) {
    redirectToTabEditWithError(menuId, "basic", "업종을 다시 선택해주세요.");
  }

  if (!isValidSlug(slug)) {
    redirectToTabEditWithError(
      menuId,
      "basic",
      `공개 메뉴판 주소는 영문 소문자, 숫자, 하이픈으로 ${MENU_FIELD_LIMITS.menuSites.slugMin}자 이상 ${MENU_FIELD_LIMITS.menuSites.slugMax}자 이하로 입력해주세요.`
    );
  }

  const isSlugLocked = menuSite.status === "published" || Boolean(menuSite.published_at);

  if (isSlugLocked && slug !== menuSite.slug) {
    redirectToTabEditWithError(menuId, "basic", "공개 후에는 QR 코드와 공유 링크 유지를 위해 주소를 변경할 수 없습니다.");
  }

  const { data: existingSite, error: duplicateCheckError } = await supabase
    .from("menu_sites")
    .select("id")
    .eq("slug", slug)
    .neq("id", menuId)
    .maybeSingle();

  if (duplicateCheckError) {
    redirectToTabEditWithError(menuId, "basic", `공개 메뉴판 주소 중복 확인 중 오류가 발생했습니다: ${duplicateCheckError.message}`);
  }

  if (existingSite) {
    redirectToTabEditWithError(menuId, "basic", "이미 사용 중인 공개 메뉴판 주소입니다. 다른 주소를 입력해주세요.");
  }

  let { error } = await supabase
    .from("menu_sites")
    .update({
      name,
      slug,
      restaurant_name: restaurantName,
      restaurant_type: restaurantType,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

  if (error && error.message.toLowerCase().includes("restaurant_type")) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .update({
        name,
        slug,
        restaurant_name: restaurantName,
        updated_at: new Date().toISOString(),
      })
      .eq("id", menuId);

    error = fallbackResult.error;
  }

  if (error) {
    redirectToTabEditWithError(menuId, "basic", `메뉴판 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  revalidatePath(getPublicMenuPath(slug));
  revalidatePath(getLegacyMenuPath(slug));
  redirectToTabEdit(menuId, "basic", "메뉴판 기본 정보가 저장되었습니다.");
}

export async function updatePageSettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const currentSettings = mergePageSettings(menuSite.page_settings);
  const nextSettings = { ...currentSettings };

  for (const key of pageSettingKeys) {
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

  validateRequiredText(menuId, introTitle ?? "", "인트로 제목", MENU_FIELD_LIMITS.menuSites.introTitle, "intro");
  validateRequiredText(menuId, introDescription ?? "", "인트로 설명", MENU_FIELD_LIMITS.menuSites.introDescription, "intro");
  validateOptionalText(menuId, getNullableString(formData, "brand_description"), "브랜드 설명", MENU_FIELD_LIMITS.menuSites.brandDescription, "intro");

  const { error } = await supabase
    .from("menu_sites")
    .update({
      intro_title: introTitle,
      intro_description: introDescription,
      brand_description: getNullableString(formData, "brand_description"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "intro", `인트로 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "intro", "인트로가 저장되었습니다.");
}

export async function updateMenuCoverAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const menuCoverLabel = getNullableString(formData, "menu_cover_label");
  const menuCoverTitle = getNullableString(formData, "menu_cover_title");
  const menuCoverDescription = getNullableString(formData, "menu_cover_description");
  const currentSettings = mergePageSettings(menuSite.page_settings);
  const requestedFeaturedItemId = getNullableString(formData, "featured_item_id");
  const featuredItemEnabled = getBoolean(formData, "featured_item_enabled") && Boolean(requestedFeaturedItemId);
  let featuredItemId: string | null = null;

  validateOptionalText(menuId, menuCoverLabel, "커버 상단 문구", MENU_FIELD_LIMITS.menuSites.menuCoverLabel, "cover");
  validateRequiredText(menuId, menuCoverTitle ?? "", "메뉴 커버 제목", MENU_FIELD_LIMITS.menuSites.menuCoverTitle, "cover");
  validateRequiredText(menuId, menuCoverDescription ?? "", "메뉴 커버 설명", MENU_FIELD_LIMITS.menuSites.menuCoverDescription, "cover");

  if (featuredItemEnabled && requestedFeaturedItemId) {
    const { data: featuredItem, error: featuredItemError } = await supabase
      .from("menu_items")
      .select("id")
      .eq("id", requestedFeaturedItemId)
      .eq("menu_site_id", menuId)
      .maybeSingle();

    if (featuredItemError) {
      redirectToTabEditWithError(menuId, "cover", `대표 추천 메뉴 확인에 실패했습니다: ${featuredItemError.message}`);
    }

    if (!featuredItem) {
      redirectToTabEditWithError(menuId, "cover", "대표 추천 메뉴를 다시 선택해주세요.");
    }

    featuredItemId = featuredItem.id;
  }

  const nextSettings = {
    ...currentSettings,
    featured_item_enabled: featuredItemEnabled,
    featured_item_id: featuredItemEnabled ? featuredItemId : null,
  };

  let { error } = await supabase
    .from("menu_sites")
    .update({
      menu_cover_label: menuCoverLabel,
      menu_cover_title: menuCoverTitle,
      menu_cover_description: menuCoverDescription,
      page_settings: nextSettings,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

  if (error && error.message.toLowerCase().includes("menu_cover_label")) {
    const fallbackResult = await supabase
      .from("menu_sites")
      .update({
        menu_cover_title: menuCoverTitle,
        menu_cover_description: menuCoverDescription,
        page_settings: nextSettings,
        updated_at: new Date().toISOString(),
      })
      .eq("id", menuId);

    error = fallbackResult.error;
  }

  if (error) redirectToTabEditWithError(menuId, "cover", `메뉴 커버 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "cover", "메뉴 커버가 저장되었습니다.");
}

export async function updateAboutAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const restaurantAddress = getNullableString(formData, "restaurant_address");
  const restaurantPhone = getNullableString(formData, "restaurant_phone");
  const openingHours = getNullableString(formData, "opening_hours");
  const aboutDescription = getNullableString(formData, "about_description");

  validateRequiredText(menuId, restaurantAddress ?? "", "주소", MENU_FIELD_LIMITS.menuSites.restaurantAddress, "about");
  validateRequiredPhone(menuId, restaurantPhone, "전화번호", "about");
  validateRequiredText(menuId, openingHours ?? "", "영업시간", MENU_FIELD_LIMITS.menuSites.openingHours, "about");
  validateRequiredText(menuId, aboutDescription ?? "", "소개 문구", MENU_FIELD_LIMITS.menuSites.aboutDescription, "about");
  validateOptionalText(menuId, getNullableString(formData, "map_url"), "지도 URL", MENU_FIELD_LIMITS.menuSites.mapUrl, "about");
  validateOptionalText(menuId, getNullableString(formData, "brand_description"), "브랜드 설명", MENU_FIELD_LIMITS.menuSites.brandDescription, "about");

  const { error } = await supabase
    .from("menu_sites")
    .update({
      restaurant_address: restaurantAddress,
      restaurant_phone: restaurantPhone,
      opening_hours: openingHours,
      map_url: getNullableString(formData, "map_url"),
      about_description: aboutDescription,
      brand_description: getNullableString(formData, "brand_description"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

  if (error) redirectToTabEditWithError(menuId, "about", `소개 정보 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "about", "소개 정보가 저장되었습니다.");
}

export async function updatePublishSettingsAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const status = getString(formData, "status");

  if (!isMenuSiteStatus(status)) redirectToTabEditWithError(menuId, "publish", "공개 상태를 선택해주세요.");

  const nextStatus: MenuSiteStatus = status;
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

  const payload: MenuPageInsert = {
    menu_site_id: menuId,
    title,
    description,
    description_visible: Boolean(description && getBoolean(formData, "menu_page_description_visible")),
    visible: true,
    sort_order: getNumber(formData, "menu_page_sort_order"),
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

export async function deleteMenuPageAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const menuPageId = getString(formData, "menuPageId");

  if (!menuId || !menuPageId) {
    redirect("/mypage?error=missing-menu-page-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertMenuPageBelongsToMenuSite(menuId, menuPageId);

  const { count, error: countError } = await supabase
    .from("menu_categories")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("menu_page_id", menuPageId);

  if (countError) {
    redirectToMenuEditWithError(menuId, `하위 메뉴 카테고리 확인에 실패했습니다: ${countError.message}`);
  }

  if ((count ?? 0) > 0) {
    const { error: hideError } = await supabase
      .from("menu_pages")
      .update({ visible: false, updated_at: new Date().toISOString() })
      .eq("id", menuPageId)
      .eq("menu_site_id", menuId);

    if (hideError) {
      redirectToMenuEditWithError(menuId, `메뉴 페이지 숨김 처리에 실패했습니다: ${hideError.message}`);
    }

    revalidateMenuPaths(menuId, menuSite.slug);
    redirectToMenuEdit(menuId, "하위 메뉴 카테고리가 있어 삭제하지 않고 메뉴판 표시를 껐습니다.");
  }

  const { error } = await supabase.from("menu_pages").delete().eq("id", menuPageId).eq("menu_site_id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `메뉴 페이지 삭제에 실패했습니다: ${error.message}`);
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
  const name = getString(formData, "category_name");
  const description = getNullableString(formData, "category_description");
  const menuPageId = getString(formData, "category_menu_page_id");

  validateRequiredText(menuId, name, "메뉴 카테고리 이름", MENU_FIELD_LIMITS.menuCategories.name);
  validateOptionalText(menuId, description, "메뉴 카테고리 설명", MENU_FIELD_LIMITS.menuCategories.description);

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

  const payload: MenuCategoryInsert = {
    menu_site_id: menuId,
    menu_page_id: menuPageId,
    name,
    description,
    description_visible: Boolean(description && getBoolean(formData, "category_description_visible")),
    section_key: getMenuPageSectionKey(menuPage.legacy_section_key),
    sort_order: getNumber(formData, "category_sort_order"),
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
  await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const supabase = await createClient();
  const name = getString(formData, "category_name");
  const description = getNullableString(formData, "category_description");
  const menuPageId = getString(formData, "category_menu_page_id");

  validateRequiredText(menuId, name, "메뉴 카테고리 이름", MENU_FIELD_LIMITS.menuCategories.name);
  validateOptionalText(menuId, description, "메뉴 카테고리 설명", MENU_FIELD_LIMITS.menuCategories.description);

  if (!menuPageId) {
    redirectToMenuEditWithError(menuId, "메뉴 카테고리가 속할 메뉴 페이지를 선택해주세요.");
  }

  const menuPage = await assertMenuPageBelongsToMenuSite(menuId, menuPageId);

  const payload: MenuCategoryUpdate = {
    menu_page_id: menuPageId,
    name,
    description,
    description_visible: Boolean(description && getBoolean(formData, "category_description_visible")),
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
  const name = getString(formData, "item_name");
  const priceLabel = getNullableString(formData, "item_price_label");
  const portionLabel = getNullableString(formData, "item_portion_label");
  const description = getNullableString(formData, "item_description");
  const priceMode = getString(formData, "item_price_mode") === "options" ? "options" : "single";

  validateRequiredText(menuId, name, "아이템 이름", MENU_FIELD_LIMITS.menuItems.name);
  validateOptionalText(menuId, priceLabel, "가격 표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
  validateOptionalText(menuId, portionLabel, "제공량", MENU_FIELD_LIMITS.menuItems.portionLabel);
  validateOptionalText(menuId, description, "아이템 설명", MENU_FIELD_LIMITS.menuItems.description);
  validateOptionalText(menuId, getNullableString(formData, "item_origin_info"), "원산지 정보", MENU_FIELD_LIMITS.menuItems.originInfo);

  const price = getOptionalNumber(formData, "item_price");
  const newPriceOptions = getNewMenuItemPriceOptions(menuId, formData);

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

  const badgeLabel = normalizeMenuBadgeLabel(formData.get("item_badge_label"));
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
    portion_visible: Boolean(getBoolean(formData, "item_portion_visible") && portionLabel),
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
  await assertItemBelongsToMenuSite(menuId, itemId);

  const name = getString(formData, "item_name");
  const priceLabel = getNullableString(formData, "item_price_label");
  const portionLabel = getNullableString(formData, "item_portion_label");
  const description = getNullableString(formData, "item_description");
  const priceMode = getString(formData, "item_price_mode") === "options" ? "options" : "single";
  const price = getOptionalNumber(formData, "item_price");

  validateRequiredText(menuId, name, "아이템 이름", MENU_FIELD_LIMITS.menuItems.name);
  validateOptionalText(menuId, priceLabel, "가격 표시 문구", MENU_FIELD_LIMITS.menuItems.priceLabel);
  validateOptionalText(menuId, portionLabel, "제공량", MENU_FIELD_LIMITS.menuItems.portionLabel);
  validateOptionalText(menuId, description, "아이템 설명", MENU_FIELD_LIMITS.menuItems.description);
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

  }

  const categoryId = getString(formData, "item_category_id");

  if (!categoryId) {
    redirectToMenuEditWithError(menuId, "아이템이 속할 메뉴 카테고리를 선택해주세요.");
  }

  const category = await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const badgeLabel = normalizeMenuBadgeLabel(formData.get("item_badge_label"));
  const badgeType = getLegacyBadgeTypeForLabel(badgeLabel);
  const setName = category?.section_key === "set_menu" ? getNullableString(formData, "item_set_name") : null;
  const traitSlots = getMenuItemTraitSlots(menuId, formData);
  const hasTraitSlotData = traitSlots.some((slot) => slot.label);

  const payload: MenuItemUpdate = {
    category_id: categoryId,
    name,
    set_name: setName,
    description,
    price_visible: getBoolean(formData, "item_price_visible"),
    portion_label: portionLabel,
    portion_visible: Boolean(getBoolean(formData, "item_portion_visible") && portionLabel),
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

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToMenuEdit(menuId, "아이템이 저장되었습니다.");
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
  await assertItemBelongsToMenuSite(menuId, itemId);

  const { count: optionCount, error: optionCountError } = await supabase
    .from("menu_item_price_options")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId)
    .eq("menu_item_id", itemId);

  if (optionCountError) {
    redirectToMenuEditWithError(menuId, `가격 옵션 개수 확인에 실패했습니다: ${optionCountError.message}`);
  }

  if ((optionCount ?? 0) >= MENU_LIMITS.maxPriceOptionsPerItem) {
    redirectToMenuEditWithError(menuId, `가격 옵션은 아이템당 최대 ${MENU_LIMITS.maxPriceOptionsPerItem}개까지 등록할 수 있습니다.`);
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
