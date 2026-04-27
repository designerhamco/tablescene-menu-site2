"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database, MenuSiteStatus } from "@/lib/supabase/types";
import { templateKeys, type TemplateKey } from "@/lib/templates";

const allowedStatuses = ["draft", "published", "archived"] as const;

type MenuCategoryInsert = Database["public"]["Tables"]["menu_categories"]["Insert"];
type MenuCategoryUpdate = Database["public"]["Tables"]["menu_categories"]["Update"];
type MenuItemInsert = Database["public"]["Tables"]["menu_items"]["Insert"];
type MenuItemUpdate = Database["public"]["Tables"]["menu_items"]["Update"];

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

function normalizeSlug(slug: string) {
  return slug
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function isTemplateKey(value: string): value is TemplateKey {
  return templateKeys.includes(value as TemplateKey);
}

function isMenuSiteStatus(value: string): value is MenuSiteStatus {
  return allowedStatuses.includes(value as MenuSiteStatus);
}

function redirectWithError(message: string): never {
  redirect(`/mypage/menus/new?error=${encodeURIComponent(message)}`);
}

function getEditPath(menuId: string, params?: { error?: string; message?: string }) {
  const searchParams = new URLSearchParams();

  if (params?.error) {
    searchParams.set("error", params.error);
  }

  if (params?.message) {
    searchParams.set("message", params.message);
  }

  const query = searchParams.toString();
  return `/mypage/menus/${menuId}/edit${query ? `?${query}` : ""}`;
}

function redirectToEdit(menuId: string, message: string): never {
  redirect(getEditPath(menuId, { message }));
}

function redirectToEditWithError(menuId: string, message: string): never {
  redirect(getEditPath(menuId, { error: message }));
}

function revalidateMenuPaths(menuId: string, slug?: string) {
  revalidatePath("/mypage");
  revalidatePath(getEditPath(menuId));

  if (slug) {
    revalidatePath(`/m/${slug}`);
  }
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
    .select("id, user_id, slug")
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
    .select("id")
    .eq("id", categoryId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (error) {
    redirectToEditWithError(menuId, `카테고리 확인에 실패했습니다: ${error.message}`);
  }

  if (!category) {
    redirectToEditWithError(menuId, "해당 카테고리를 찾을 수 없습니다.");
  }
}

async function assertItemBelongsToMenuSite(menuId: string, itemId: string) {
  const supabase = await createClient();
  const { data: item, error } = await supabase
    .from("menu_items")
    .select("id")
    .eq("id", itemId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (error) {
    redirectToEditWithError(menuId, `메뉴 확인에 실패했습니다: ${error.message}`);
  }

  if (!item) {
    redirectToEditWithError(menuId, "해당 메뉴 아이템을 찾을 수 없습니다.");
  }
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

  const { error } = await supabase.from("menu_sites").insert({
    user_id: user.id,
    name,
    slug,
    template_key: templateKey,
    status,
  });

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
  const templateKey = getString(formData, "template_key");
  const status = getString(formData, "status");
  const slug = normalizeSlug(rawSlug);

  if (!name) {
    redirectToEditWithError(menuId, "메뉴판 이름을 입력해주세요.");
  }

  if (!slug || slug.length < 3) {
    redirectToEditWithError(menuId, "공개 메뉴판 주소는 영문 소문자, 숫자, 하이픈으로 3자 이상 입력해주세요.");
  }

  if (!isTemplateKey(templateKey)) {
    redirectToEditWithError(menuId, "템플릿을 선택해주세요.");
  }

  if (!isMenuSiteStatus(status)) {
    redirectToEditWithError(menuId, "공개 상태를 선택해주세요.");
  }

  const menuStatus: MenuSiteStatus = status;

  const { data: existingSite, error: duplicateCheckError } = await supabase
    .from("menu_sites")
    .select("id")
    .eq("slug", slug)
    .neq("id", menuId)
    .maybeSingle();

  if (duplicateCheckError) {
    redirectToEditWithError(menuId, `공개 메뉴판 주소 중복 확인 중 오류가 발생했습니다: ${duplicateCheckError.message}`);
  }

  if (existingSite) {
    redirectToEditWithError(menuId, "이미 사용 중인 공개 메뉴판 주소입니다. 다른 주소를 입력해주세요.");
  }

  const { error } = await supabase
    .from("menu_sites")
    .update({
      name,
      slug,
      template_key: templateKey,
      status: menuStatus,
      published_at: menuStatus === "published" ? new Date().toISOString() : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", menuId);

  if (error) {
    redirectToEditWithError(menuId, `메뉴판 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  revalidatePath(`/m/${slug}`);
  redirectToEdit(menuId, "메뉴판 기본 정보가 저장되었습니다.");
}

export async function createCategoryAction(formData: FormData) {
  const menuId = getString(formData, "menuId");

  if (!menuId) {
    redirect("/mypage?error=missing-menu-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const name = getString(formData, "category_name");

  if (!name) {
    redirectToEditWithError(menuId, "카테고리 이름을 입력해주세요.");
  }

  const payload: MenuCategoryInsert = {
    menu_site_id: menuId,
    name,
    description: getNullableString(formData, "category_description"),
    sort_order: getNumber(formData, "category_sort_order"),
    visible: getBoolean(formData, "category_visible"),
  };

  const { error } = await supabase.from("menu_categories").insert(payload);

  if (error) {
    redirectToEditWithError(menuId, `카테고리 추가에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToEdit(menuId, "카테고리가 추가되었습니다.");
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

  if (!name) {
    redirectToEditWithError(menuId, "카테고리 이름을 입력해주세요.");
  }

  const payload: MenuCategoryUpdate = {
    name,
    description: getNullableString(formData, "category_description"),
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
    redirectToEditWithError(menuId, `카테고리 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToEdit(menuId, "카테고리가 저장되었습니다.");
}

export async function deleteCategoryAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const categoryId = getString(formData, "categoryId");

  if (!menuId || !categoryId) {
    redirect("/mypage?error=missing-category-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertCategoryBelongsToMenuSite(menuId, categoryId);

  const { error } = await supabase
    .from("menu_categories")
    .delete()
    .eq("id", categoryId)
    .eq("menu_site_id", menuId);

  if (error) {
    redirectToEditWithError(menuId, `카테고리 삭제에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToEdit(menuId, "카테고리가 삭제되었습니다.");
}

export async function createMenuItemAction(formData: FormData) {
  const menuId = getString(formData, "menuId");

  if (!menuId) {
    redirect("/mypage?error=missing-menu-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  const name = getString(formData, "item_name");

  if (!name) {
    redirectToEditWithError(menuId, "메뉴 이름을 입력해주세요.");
  }

  const categoryId = getString(formData, "item_category_id") || null;

  if (categoryId) {
    await assertCategoryBelongsToMenuSite(menuId, categoryId);
  }

  const payload: MenuItemInsert = {
    menu_site_id: menuId,
    category_id: categoryId,
    name,
    description: getNullableString(formData, "item_description"),
    price: getNumber(formData, "item_price"),
    image_url: getNullableString(formData, "item_image_url"),
    badge: getNullableString(formData, "item_badge"),
    is_best: getBoolean(formData, "item_recommended") || getBoolean(formData, "item_is_best"),
    is_sold_out: getBoolean(formData, "item_is_sold_out"),
    visible: getBoolean(formData, "item_visible"),
    sort_order: getNumber(formData, "item_sort_order"),
  };

  const { error } = await supabase.from("menu_items").insert(payload);

  if (error) {
    redirectToEditWithError(menuId, `메뉴 추가에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToEdit(menuId, "메뉴 아이템이 추가되었습니다.");
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

  if (!name) {
    redirectToEditWithError(menuId, "메뉴 이름을 입력해주세요.");
  }

  const categoryId = getString(formData, "item_category_id") || null;

  if (categoryId) {
    await assertCategoryBelongsToMenuSite(menuId, categoryId);
  }

  const payload: MenuItemUpdate = {
    category_id: categoryId,
    name,
    description: getNullableString(formData, "item_description"),
    price: getNumber(formData, "item_price"),
    image_url: getNullableString(formData, "item_image_url"),
    badge: getNullableString(formData, "item_badge"),
    is_best: getBoolean(formData, "item_recommended") || getBoolean(formData, "item_is_best"),
    is_sold_out: getBoolean(formData, "item_is_sold_out"),
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
    redirectToEditWithError(menuId, `메뉴 저장에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToEdit(menuId, "메뉴 아이템이 저장되었습니다.");
}

export async function deleteMenuItemAction(formData: FormData) {
  const menuId = getString(formData, "menuId");
  const itemId = getString(formData, "itemId");

  if (!menuId || !itemId) {
    redirect("/mypage?error=missing-menu-item-id");
  }

  const { supabase, menuSite } = await requireOwnedMenuSite(menuId);
  await assertItemBelongsToMenuSite(menuId, itemId);

  const { error } = await supabase
    .from("menu_items")
    .delete()
    .eq("id", itemId)
    .eq("menu_site_id", menuId);

  if (error) {
    redirectToEditWithError(menuId, `메뉴 삭제에 실패했습니다: ${error.message}`);
  }

  revalidateMenuPaths(menuId, menuSite.slug);
  redirectToEdit(menuId, "메뉴 아이템이 삭제되었습니다.");
}
