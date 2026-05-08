"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { normalizeBadgeType } from "@/lib/menu-badges";
import { pageSettingKeys } from "@/lib/menu-editor";
import { MENU_LIMITS } from "@/lib/menu-starter-presets";
import { getLegacyMenuPath, getPublicMenuPath } from "@/lib/menu-url";
import { isSocialLinkType } from "@/lib/social-links";
import { createClient } from "@/lib/supabase/server";
import type { Database, MenuSectionKey, MenuSiteStatus } from "@/lib/supabase/types";
import { getTemplateCategoryFromKey, isTemplateCategoryKey, isValidTemplateKey, type TemplateKey } from "@/lib/templates";
import { mergePageSettings, validateMenuItemTrait } from "@/types/menu";

const allowedStatuses = ["draft", "published", "archived"] as const;
const MENU_IMAGES_BUCKET = "menu-images";

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
type MenuItemTraitInsert = Database["public"]["Tables"]["menu_item_traits"]["Insert"];
type MenuItemTraitUpdate = Database["public"]["Tables"]["menu_item_traits"]["Update"];
type LooseInsert = Record<string, unknown>;

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
  return /^[a-z0-9-]+$/.test(slug) && slug.length >= 3;
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
    .select("id, user_id, slug, status, published_at, page_settings")
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

  if (error) redirectToTabEditWithError(menuId, "chefs", `셰프/인물 확인에 실패했습니다: ${error.message}`);
  if (!data) redirectToTabEditWithError(menuId, "chefs", "해당 셰프/인물 정보를 찾을 수 없습니다.");

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

  if (error) redirectToTabEditWithError(menuId, "social", `SNS 링크 확인에 실패했습니다: ${error.message}`);
  if (!data) redirectToTabEditWithError(menuId, "social", "해당 SNS 링크를 찾을 수 없습니다.");
}

async function assertTraitBelongsToMenuSite(menuId: string, traitId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("menu_item_traits").select("id").eq("id", traitId).eq("menu_site_id", menuId).maybeSingle();

  if (error) redirectToEditWithError(menuId, `맛/특징 지표 확인에 실패했습니다: ${error.message}`);
  if (!data) redirectToEditWithError(menuId, "해당 맛/특징 지표를 찾을 수 없습니다.");
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

  if (!slug) {
    redirectWithError("공개 메뉴판 주소를 입력해주세요. 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }

  if (slug.length < 3) {
    redirectWithError("공개 메뉴판 주소는 3자 이상이어야 합니다.");
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
  const restaurantCategory = getNullableString(formData, "restaurant_category");
  const slug = normalizeSlug(rawSlug);

  if (!name) {
    redirectToTabEditWithError(menuId, "basic", "메뉴판 이름을 입력해주세요.");
  }

  if (!isValidSlug(slug)) {
    redirectToTabEditWithError(menuId, "basic", "공개 메뉴판 주소는 영문 소문자, 숫자, 하이픈으로 3자 이상 입력해주세요.");
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

  const { error } = await supabase
    .from("menu_sites")
    .update({
      name,
      slug,
      restaurant_name: restaurantName,
      restaurant_category: restaurantCategory,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

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

  validateRequiredText(menuId, introTitle ?? "", "인트로 제목", 100, "intro");
  validateRequiredText(menuId, introDescription ?? "", "인트로 설명", 300, "intro");

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
  const menuCoverTitle = getNullableString(formData, "menu_cover_title");
  const menuCoverDescription = getNullableString(formData, "menu_cover_description");

  validateRequiredText(menuId, menuCoverTitle ?? "", "메뉴 커버 제목", 100, "cover");
  validateRequiredText(menuId, menuCoverDescription ?? "", "메뉴 커버 설명", 300, "cover");

  const { error } = await supabase
    .from("menu_sites")
    .update({
      menu_cover_title: menuCoverTitle,
      menu_cover_description: menuCoverDescription,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

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

  validateRequiredText(menuId, restaurantAddress ?? "", "주소", 100, "about");
  validateRequiredText(menuId, restaurantPhone ?? "", "전화번호", 50, "about");
  validateRequiredText(menuId, openingHours ?? "", "영업시간", 100, "about");
  validateRequiredText(menuId, aboutDescription ?? "", "소개 문구", 500, "about");

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

  validateRequiredText(menuId, title, "페이지 이름", 30);
  validateOptionalText(menuId, description, "페이지 설명", 100);

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
    description_visible: getBoolean(formData, "menu_page_description_visible"),
    visible: getBoolean(formData, "menu_page_visible"),
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

  validateRequiredText(menuId, title, "페이지 이름", 30);
  validateOptionalText(menuId, description, "페이지 설명", 100);

  const payload: MenuPageUpdate = {
    title,
    description,
    description_visible: getBoolean(formData, "menu_page_description_visible"),
    visible: getBoolean(formData, "menu_page_visible"),
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

  validateRequiredText(menuId, name, "메뉴 카테고리 이름", 30);
  validateOptionalText(menuId, description, "메뉴 카테고리 설명", 100);

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
    description_visible: getBoolean(formData, "category_description_visible"),
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

  validateRequiredText(menuId, name, "메뉴 카테고리 이름", 30);
  validateOptionalText(menuId, description, "메뉴 카테고리 설명", 100);

  if (!menuPageId) {
    redirectToMenuEditWithError(menuId, "메뉴 카테고리가 속할 메뉴 페이지를 선택해주세요.");
  }

  const menuPage = await assertMenuPageBelongsToMenuSite(menuId, menuPageId);

  const payload: MenuCategoryUpdate = {
    menu_page_id: menuPageId,
    name,
    description,
    description_visible: getBoolean(formData, "category_description_visible"),
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

  validateRequiredText(menuId, name, "아이템 이름", 50);
  validateOptionalText(menuId, priceLabel, "표시용 가격", 30);
  validateOptionalText(menuId, portionLabel, "제공량", 30);
  validateOptionalText(menuId, description, "아이템 설명", 200);

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

  const badgeType = normalizeBadgeType(formData.get("item_badge_type"));
  const setName = category?.section_key === "set_menu" ? getNullableString(formData, "item_set_name") : null;

  const payload: MenuItemInsert = {
    menu_site_id: menuId,
    category_id: categoryId,
    name,
    set_name: setName,
    description,
    price: getOptionalNumber(formData, "item_price"),
    price_label: priceLabel,
    price_visible: getBoolean(formData, "item_price_visible"),
    portion_label: portionLabel,
    portion_visible: getBoolean(formData, "item_portion_visible"),
    badge_type: badgeType,
    recommended: badgeType === "recommend" || getBoolean(formData, "item_recommended"),
    origin_info: getNullableString(formData, "item_origin_info"),
    is_best: badgeType === "best" || getBoolean(formData, "item_is_best"),
    is_sold_out: getBoolean(formData, "item_is_sold_out"),
    traits_visible: getBoolean(formData, "item_traits_visible"),
    visible: getBoolean(formData, "item_visible"),
    sort_order: getNumber(formData, "item_sort_order"),
  };

  const { error } = await supabase.from("menu_items").insert(payload);

  if (error) {
    redirectToMenuEditWithError(menuId, `아이템 추가에 실패했습니다: ${error.message}`);
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

  validateRequiredText(menuId, name, "아이템 이름", 50);
  validateOptionalText(menuId, priceLabel, "표시용 가격", 30);
  validateOptionalText(menuId, portionLabel, "제공량", 30);
  validateOptionalText(menuId, description, "아이템 설명", 200);

  const categoryId = getString(formData, "item_category_id");

  if (!categoryId) {
    redirectToMenuEditWithError(menuId, "아이템이 속할 메뉴 카테고리를 선택해주세요.");
  }

  const category = await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const badgeType = normalizeBadgeType(formData.get("item_badge_type"));
  const setName = category?.section_key === "set_menu" ? getNullableString(formData, "item_set_name") : null;

  const payload: MenuItemUpdate = {
    category_id: categoryId,
    name,
    set_name: setName,
    description,
    price: getOptionalNumber(formData, "item_price"),
    price_label: priceLabel,
    price_visible: getBoolean(formData, "item_price_visible"),
    portion_label: portionLabel,
    portion_visible: getBoolean(formData, "item_portion_visible"),
    badge_type: badgeType,
    recommended: badgeType === "recommend" || getBoolean(formData, "item_recommended"),
    origin_info: getNullableString(formData, "item_origin_info"),
    is_best: badgeType === "best" || getBoolean(formData, "item_is_best"),
    is_sold_out: getBoolean(formData, "item_is_sold_out"),
    traits_visible: getBoolean(formData, "item_traits_visible"),
    visible: getBoolean(formData, "item_visible"),
    sort_order: getNumber(formData, "item_sort_order"),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("menu_items")
    .update(payload)
    .eq("id", itemId)
    .eq("menu_site_id", menuId);

  if (error) {
    redirectToMenuEditWithError(menuId, `아이템 저장에 실패했습니다: ${error.message}`);
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

export async function createMenuItemTraitAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const itemId = getString(formData, "itemId");
  if (!menuId || !itemId) redirect("/mypage?error=missing-menu-item-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertItemBelongsToMenuSite(menuId, itemId);

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

  if (!chefName) redirectToTabEditWithError(menuId, "chefs", "셰프/인물 이름을 입력해주세요.");
  if (!chefRole) redirectToTabEditWithError(menuId, "chefs", "셰프/인물 역할을 입력해주세요.");
  if (!chefDescription) redirectToTabEditWithError(menuId, "chefs", "셰프/인물 소개를 입력해주세요.");

  const { count: chefCount, error: chefCountError } = await supabase
    .from("menu_chefs")
    .select("id", { count: "exact", head: true })
    .eq("menu_site_id", menuId);

  if (chefCountError) redirectToTabEditWithError(menuId, "chefs", `셰프/인물 개수 확인에 실패했습니다: ${chefCountError.message}`);
  if ((chefCount ?? 0) >= MENU_LIMITS.maxChefsPerSite) {
    redirectToTabEditWithError(menuId, "chefs", `셰프/인물 정보는 최대 ${MENU_LIMITS.maxChefsPerSite}명까지 등록할 수 있습니다.`);
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

  if (error) redirectToTabEditWithError(menuId, "chefs", `셰프/인물 추가에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "chefs", "셰프/인물 정보가 추가되었습니다.");
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

  if (!chefName) redirectToTabEditWithError(menuId, "chefs", "셰프/인물 이름을 입력해주세요.");
  if (!chefRole) redirectToTabEditWithError(menuId, "chefs", "셰프/인물 역할을 입력해주세요.");
  if (!chefDescription) redirectToTabEditWithError(menuId, "chefs", "셰프/인물 소개를 입력해주세요.");

  const payload: MenuChefUpdate = {
    chef_name: chefName,
    chef_role: chefRole,
    chef_description: chefDescription,
    visible: getBoolean(formData, "chef_visible"),
    sort_order: getNumber(formData, "chef_sort_order"),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("menu_chefs").update(payload).eq("id", chefId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "chefs", `셰프/인물 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "chefs", "셰프/인물 정보가 저장되었습니다.");
}

export async function deleteChefAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const chefId = getString(formData, "chefId");
  if (!menuId || !chefId) redirect("/mypage?error=missing-chef-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const chef = await assertChefBelongsToMenuSite(menuId, chefId);
  const { error } = await supabase.from("menu_chefs").delete().eq("id", chefId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "chefs", `셰프/인물 삭제에 실패했습니다: ${error.message}`);

  const removeError = await removeMenuImagePath(supabase, chef.chef_image_path);

  if (removeError) {
    redirectToTabEditWithError(menuId, "chefs", `셰프/인물 정보는 삭제되었지만 Storage 이미지 정리에 실패했습니다: ${removeError.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "chefs", "셰프/인물 정보가 삭제되었습니다.");
}

export async function createEventAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  if (!menuId) redirect("/mypage?error=missing-menu-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const title = getString(formData, "event_title");
  const description = getString(formData, "event_description");

  if (!title) redirectToTabEditWithError(menuId, "events", "이벤트 제목을 입력해주세요.");
  if (!description) redirectToTabEditWithError(menuId, "events", "이벤트 설명을 입력해주세요.");

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
    event_regular_price_label: getNullableString(formData, "event_regular_price_label"),
    event_sale_price_label: getNullableString(formData, "event_sale_price_label"),
    event_price_visible: getBoolean(formData, "event_price_visible"),
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

  const payload: MenuEventUpdate = {
    event_title: title,
    event_subtitle: getNullableString(formData, "event_subtitle"),
    event_description: description,
    event_period: getNullableString(formData, "event_period"),
    event_benefit: getNullableString(formData, "event_benefit"),
    event_detail: getNullableString(formData, "event_detail"),
    event_regular_price_label: getNullableString(formData, "event_regular_price_label"),
    event_sale_price_label: getNullableString(formData, "event_sale_price_label"),
    event_price_visible: getBoolean(formData, "event_price_visible"),
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

  if (!isSocialLinkType(type)) redirectToTabEditWithError(menuId, "social", "SNS 종류를 선택해주세요.");
  if (!label) redirectToTabEditWithError(menuId, "social", "SNS 화면 표시 라벨을 입력해주세요.");
  if (!displayName) redirectToTabEditWithError(menuId, "social", "SNS 아이디/표시명을 입력해주세요.");
  if (!/^https?:\/\//i.test(url)) redirectToTabEditWithError(menuId, "social", "SNS URL은 http:// 또는 https://로 시작해야 합니다.");

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

  if (existingError) redirectToTabEditWithError(menuId, "social", `SNS 링크 확인에 실패했습니다: ${existingError.message}`);
  if ((existingLinks ?? []).length >= MENU_LIMITS.maxSocialLinksPerSite) {
    redirectToTabEditWithError(menuId, "social", `SNS 링크는 최대 ${MENU_LIMITS.maxSocialLinksPerSite}개까지 등록할 수 있습니다.`);
  }
  if ((existingLinks ?? []).some((link) => link.type === payloadInput.type)) {
    redirectToTabEditWithError(menuId, "social", "같은 SNS 종류는 한 번만 등록할 수 있습니다.");
  }

  const payload: MenuSocialLinkInsert = { menu_site_id: menuId, ...payloadInput };
  const { error } = await supabase.from("menu_social_links").insert(payload);

  if (error) redirectToTabEditWithError(menuId, "social", `SNS 링크 추가에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "social", "SNS 링크가 추가되었습니다.");
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

  if (duplicateError) redirectToTabEditWithError(menuId, "social", `SNS 중복 확인에 실패했습니다: ${duplicateError.message}`);
  if (duplicate) redirectToTabEditWithError(menuId, "social", "같은 SNS 종류는 한 번만 등록할 수 있습니다.");

  const payload: MenuSocialLinkUpdate = { ...payloadInput, updated_at: new Date().toISOString() };
  const { error } = await supabase.from("menu_social_links").update(payload).eq("id", socialLinkId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "social", `SNS 링크 저장에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "social", "SNS 링크가 저장되었습니다.");
}

export async function deleteSocialLinkAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const socialLinkId = getString(formData, "socialLinkId");
  if (!menuId || !socialLinkId) redirect("/mypage?error=missing-social-link-id");

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertSocialLinkBelongsToMenuSite(menuId, socialLinkId);
  const { error } = await supabase.from("menu_social_links").delete().eq("id", socialLinkId).eq("menu_site_id", menuId);

  if (error) redirectToTabEditWithError(menuId, "social", `SNS 링크 삭제에 실패했습니다: ${error.message}`);

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToTabEdit(menuId, "social", "SNS 링크가 삭제되었습니다.");
}
