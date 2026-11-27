"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  canImportIntoMenuCatalogTarget,
  getMenuCatalogImportResultMessage,
  isMenuCatalogImportMode,
  MENU_CATALOG_CONFIRMATION,
  MENU_CATALOG_DISCONNECT_CONFIRMATION,
} from "@/lib/menu-catalog";
import { isUuid } from "@/lib/menu-widget-save-contract";
import { getMenuSiteAccessStateForMenuSite } from "@/lib/server/menu-site-access-service";
import { createClient } from "@/lib/supabase/server";

type MutationResult = {
  status: "success" | "error" | "unauthenticated";
  message: string;
};

const signInRequired: MutationResult = { status: "unauthenticated", message: "다시 로그인한 후 시도해 주세요." };

function failure(message: string): MutationResult {
  return { status: "error", message };
}

function finishImportPageAction(menuId: string, result: MutationResult, successPage: "edit" | "import"): never {
  const importPath = `/mypage/menus/${menuId}/import`;
  if (result.status === "unauthenticated") {
    redirect(`/sign-in?next=${encodeURIComponent(importPath)}`);
  }
  const message = encodeURIComponent(result.message);
  if (result.status === "error") {
    redirect(`${importPath}?error=${message}`);
  }
  redirect(`/mypage/menus/${menuId}/${successPage}?message=${message}`);
}

function refreshMenuCatalogPaths(menuId: string) {
  revalidatePath("/mypage");
  revalidatePath(`/mypage/menus/${menuId}/import`);
  revalidatePath(`/mypage/menus/${menuId}/edit`);
  revalidatePath(`/mypage/menus/${menuId}/preview`);
}

function getSafeImportErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202" || /import_menu_site_content/i.test(error.message)) {
    return "공통 메뉴 데이터 기반이 아직 적용되지 않았습니다. 관리자에게 migration 적용을 요청해 주세요.";
  }
  if (/must be draft/i.test(error.message)) {
    return "공개 중인 메뉴판에는 가져올 수 없습니다. 작성 중인 메뉴판에서 다시 시도해 주세요.";
  }
  if (/owner access required|permission denied|row-level security/i.test(error.message)) {
    return "두 메뉴판을 모두 소유한 계정에서만 메뉴를 가져올 수 있습니다.";
  }
  if (/has no menu items/i.test(error.message)) {
    return "원본 메뉴판에 가져올 메뉴가 없습니다.";
  }
  return "메뉴를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

async function importMenuContent(targetMenuSiteId: string, formData: FormData, fromCard = false): Promise<MutationResult> {
  const sourceMenuSiteId = String(formData.get("sourceMenuSiteId") ?? "").trim();
  const mode = fromCard ? "linked" : formData.get("mode");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!isUuid(sourceMenuSiteId) || sourceMenuSiteId === targetMenuSiteId) {
    return failure("가져올 다른 메뉴판을 선택해 주세요.");
  }
  if (!isMenuCatalogImportMode(mode)) {
    return failure("메뉴 연결 방식을 선택해 주세요.");
  }
  if (confirmation !== MENU_CATALOG_CONFIRMATION) {
    return failure(`확인란에 '${MENU_CATALOG_CONFIRMATION}'를 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return signInRequired;

  const { data: menuSites, error: menuSitesError } = await supabase
    .from("menu_sites")
    .select("id, user_id, status")
    .in("id", [sourceMenuSiteId, targetMenuSiteId]);

  if (menuSitesError) return failure("메뉴판 소유권을 확인하지 못했습니다.");

  const source = menuSites?.find((menuSite) => menuSite.id === sourceMenuSiteId);
  const target = menuSites?.find((menuSite) => menuSite.id === targetMenuSiteId);
  if (!source || !target || source.user_id !== user.id || target.user_id !== user.id) {
    return failure("두 메뉴판을 모두 소유한 계정에서만 메뉴를 가져올 수 있습니다.");
  }
  if (!canImportIntoMenuCatalogTarget(target.status)) {
    return failure("작성 중인 메뉴판에만 기존 메뉴를 가져올 수 있습니다.");
  }

  if (fromCard) {
    if (source.status === "archived") return failure("보관 중인 메뉴판은 원본으로 선택할 수 없습니다.");

    const [accessState, existingLinks] = await Promise.all([
      getMenuSiteAccessStateForMenuSite({ menuSiteId: targetMenuSiteId, userId: user.id }),
      supabase
        .from("menu_site_content_links")
        .select("id")
        .eq("owner_user_id", user.id)
        .eq("mode", "linked")
        .eq("status", "active")
        .or(`target_menu_site_id.eq.${targetMenuSiteId},source_menu_site_id.eq.${targetMenuSiteId},target_menu_site_id.eq.${sourceMenuSiteId}`)
        .limit(1),
    ]);
    if (!accessState?.canEdit) return failure("편집할 수 있는 작성 중 메뉴판만 연결할 수 있습니다.");
    if (existingLinks.error) return failure("메뉴판 연결 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    if (existingLinks.data?.length) {
      revalidatePath("/mypage");
      return failure("메뉴판 연결 상태가 바뀌었습니다. 목록에서 다시 확인해 주세요.");
    }
  }

  const { data, error } = await supabase.rpc("import_menu_site_content", {
    p_source_menu_site_id: sourceMenuSiteId,
    p_target_menu_site_id: targetMenuSiteId,
    p_mode: mode,
  });
  if (error) return failure(getSafeImportErrorMessage(error));

  const result = data && typeof data === "object" && !Array.isArray(data) ? data : {};
  const itemCount = typeof result.itemCount === "number" ? result.itemCount : 0;
  refreshMenuCatalogPaths(targetMenuSiteId);
  return { status: "success", message: getMenuCatalogImportResultMessage({ mode, itemCount }) };
}

async function disconnectMenuContent(
  targetMenuSiteId: string,
  formData: FormData,
  expectedSourceId?: string,
): Promise<MutationResult> {
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== MENU_CATALOG_DISCONNECT_CONFIRMATION) {
    return failure(`확인란에 '${MENU_CATALOG_DISCONNECT_CONFIRMATION}'를 입력해 주세요.`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return signInRequired;

  const { data: target } = await supabase
    .from("menu_sites")
    .select("id")
    .eq("id", targetMenuSiteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!target) return failure("메뉴판 소유권을 확인하지 못했습니다.");

  if (expectedSourceId) {
    const { data: activeLink, error } = await supabase
      .from("menu_site_content_links")
      .select("id")
      .eq("owner_user_id", user.id)
      .eq("target_menu_site_id", targetMenuSiteId)
      .eq("source_menu_site_id", expectedSourceId)
      .eq("mode", "linked")
      .eq("status", "active")
      .maybeSingle();

    if (error) return failure("메뉴판 연결 상태를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.");
    if (!activeLink) {
      revalidatePath("/mypage");
      return failure("메뉴판 연결 상태가 바뀌었습니다. 목록에서 다시 확인해 주세요.");
    }
  }

  const { data, error } = await supabase.rpc("disconnect_menu_site_content", {
    p_target_menu_site_id: targetMenuSiteId,
  });
  if (error) return failure("메뉴판 연결을 해제하지 못했습니다. 잠시 후 다시 시도해 주세요.");
  refreshMenuCatalogPaths(targetMenuSiteId);
  if (expectedSourceId && !data) return failure("메뉴판 연결 상태가 바뀌었습니다. 목록에서 다시 확인해 주세요.");
  return { status: "success", message: "공통 메뉴 연결을 해제했습니다. 현재 메뉴 내용은 그대로 유지됩니다." };
}

export async function importMenuSiteContentAction(targetMenuSiteId: string, formData: FormData) {
  if (!isUuid(targetMenuSiteId)) redirect("/mypage?error=invalid-menu-site");
  finishImportPageAction(targetMenuSiteId, await importMenuContent(targetMenuSiteId, formData), "edit");
}

export async function disconnectMenuSiteContentAction(targetMenuSiteId: string, formData: FormData) {
  if (!isUuid(targetMenuSiteId)) redirect("/mypage?error=invalid-menu-site");
  finishImportPageAction(targetMenuSiteId, await disconnectMenuContent(targetMenuSiteId, formData), "import");
}

export async function manageCardMenuConnectionAction(
  menuSiteId: string,
  _previous: MutationResult | null,
  formData: FormData,
): Promise<MutationResult> {
  if (!isUuid(menuSiteId)) return failure("메뉴판을 확인할 수 없습니다.");

  const intent = formData.get("intent");
  if (intent === "connect") return importMenuContent(menuSiteId, formData, true);
  if (intent !== "disconnect") return failure("메뉴판 연결 작업을 확인해 주세요.");

  const sourceId = String(formData.get("connectionSourceId") ?? "");
  const targetId = String(formData.get("connectionTargetId") ?? "");
  if (!isUuid(sourceId) || !isUuid(targetId) || sourceId === targetId || (sourceId !== menuSiteId && targetId !== menuSiteId)) {
    return failure("해제할 메뉴판 연결을 확인해 주세요.");
  }
  return disconnectMenuContent(targetId, formData, sourceId);
}
