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
import { createClient } from "@/lib/supabase/server";

type ImportRpcResult = {
  mode?: unknown;
  itemCount?: unknown;
};

type UntypedRpcClient = {
  rpc: (
    functionName: string,
    args: Record<string, string>,
  ) => Promise<{ data: unknown; error: { code?: string; message: string } | null }>;
};

function redirectToImportError(menuId: string, message: string): never {
  redirect(`/mypage/menus/${menuId}/import?error=${encodeURIComponent(message)}`);
}

function getSafeRpcErrorMessage(error: { code?: string; message: string }) {
  if (error.code === "PGRST202" || /import_menu_site_content/i.test(error.message)) {
    return "공통 메뉴 데이터 기반이 아직 적용되지 않았습니다. 관리자에게 migration 적용을 요청해 주세요.";
  }
  if (/must be draft/i.test(error.message)) {
    return "공개 중인 메뉴판에는 가져올 수 없습니다. 작성중 메뉴판에서 다시 시도해 주세요.";
  }
  if (/owner access required|permission denied|row-level security/i.test(error.message)) {
    return "두 메뉴판을 모두 소유한 계정에서만 메뉴를 가져올 수 있습니다.";
  }
  if (/has no menu items/i.test(error.message)) {
    return "원본 메뉴판에 가져올 메뉴가 없습니다.";
  }
  return "메뉴를 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

export async function importMenuSiteContentAction(targetMenuSiteId: string, formData: FormData) {
  if (!isUuid(targetMenuSiteId)) {
    redirect("/mypage?error=invalid-menu-site");
  }

  const sourceMenuSiteId = String(formData.get("sourceMenuSiteId") ?? "").trim();
  const mode = formData.get("mode");
  const confirmation = String(formData.get("confirmation") ?? "").trim();

  if (!isUuid(sourceMenuSiteId) || sourceMenuSiteId === targetMenuSiteId) {
    redirectToImportError(targetMenuSiteId, "가져올 다른 메뉴판을 선택해 주세요.");
  }
  if (!isMenuCatalogImportMode(mode)) {
    redirectToImportError(targetMenuSiteId, "메뉴 연결 방식을 선택해 주세요.");
  }
  if (confirmation !== MENU_CATALOG_CONFIRMATION) {
    redirectToImportError(targetMenuSiteId, `확인란에 '${MENU_CATALOG_CONFIRMATION}'를 입력해 주세요.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${targetMenuSiteId}/import`)}`);
  }

  const { data: menuSites, error: menuSitesError } = await supabase
    .from("menu_sites")
    .select("id, user_id, status")
    .in("id", [sourceMenuSiteId, targetMenuSiteId]);

  if (menuSitesError) {
    redirectToImportError(targetMenuSiteId, "메뉴판 소유권을 확인하지 못했습니다.");
  }

  const sourceMenuSite = menuSites?.find((menuSite) => menuSite.id === sourceMenuSiteId);
  const targetMenuSite = menuSites?.find((menuSite) => menuSite.id === targetMenuSiteId);

  if (!sourceMenuSite || !targetMenuSite || sourceMenuSite.user_id !== user.id || targetMenuSite.user_id !== user.id) {
    redirectToImportError(targetMenuSiteId, "두 메뉴판을 모두 소유한 계정에서만 메뉴를 가져올 수 있습니다.");
  }
  if (!canImportIntoMenuCatalogTarget(targetMenuSite.status)) {
    redirectToImportError(targetMenuSiteId, "안전을 위해 작성중 메뉴판에만 기존 메뉴를 가져올 수 있습니다.");
  }

  const { data, error } = await (supabase as unknown as UntypedRpcClient).rpc("import_menu_site_content", {
    p_source_menu_site_id: sourceMenuSiteId,
    p_target_menu_site_id: targetMenuSiteId,
    p_mode: mode,
  });

  if (error) {
    redirectToImportError(targetMenuSiteId, getSafeRpcErrorMessage(error));
  }

  const result = data && typeof data === "object" && !Array.isArray(data) ? data as ImportRpcResult : {};
  const itemCount = typeof result.itemCount === "number" ? result.itemCount : 0;
  const message = getMenuCatalogImportResultMessage({ mode, itemCount });

  revalidatePath("/mypage");
  revalidatePath(`/mypage/menus/${targetMenuSiteId}/edit`);
  revalidatePath(`/mypage/menus/${targetMenuSiteId}/preview`);
  redirect(`/mypage/menus/${targetMenuSiteId}/edit?message=${encodeURIComponent(message)}`);
}

export async function disconnectMenuSiteContentAction(targetMenuSiteId: string, formData: FormData) {
  if (!isUuid(targetMenuSiteId)) {
    redirect("/mypage?error=invalid-menu-site");
  }

  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== MENU_CATALOG_DISCONNECT_CONFIRMATION) {
    redirectToImportError(targetMenuSiteId, `확인란에 '${MENU_CATALOG_DISCONNECT_CONFIRMATION}'를 입력해 주세요.`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/mypage/menus/${targetMenuSiteId}/import`)}`);
  }

  const { data: targetMenuSite } = await supabase
    .from("menu_sites")
    .select("id, user_id")
    .eq("id", targetMenuSiteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!targetMenuSite) {
    redirectToImportError(targetMenuSiteId, "메뉴판 소유권을 확인하지 못했습니다.");
  }

  const { error } = await (supabase as unknown as UntypedRpcClient).rpc("disconnect_menu_site_content", {
    p_target_menu_site_id: targetMenuSiteId,
  });

  if (error) {
    redirectToImportError(targetMenuSiteId, getSafeRpcErrorMessage(error));
  }

  revalidatePath(`/mypage/menus/${targetMenuSiteId}/import`);
  revalidatePath(`/mypage/menus/${targetMenuSiteId}/edit`);
  redirect(`/mypage/menus/${targetMenuSiteId}/import?message=${encodeURIComponent("공통 메뉴 연결을 해제했습니다. 현재 메뉴 내용은 그대로 유지됩니다.")}`);
}
