import "server-only";

import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";
import type { MenuQrDownloadData } from "@/lib/menu-qr-downloads";
import type { MenuTableListItem } from "@/lib/menu-table-validation";
import { normalizeMenuTableId } from "@/lib/menu-table-validation";
import { hasMenuSitePermission, MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  getMenuSiteAccessStateForMenuSite,
  requireMenuSitePermission,
} from "@/lib/server/menu-site-access-service";
import { listMenuTables } from "@/lib/server/menu-table-management-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";

export type MenuQrManagementPageData = Omit<MenuQrDownloadData, "tables"> & { tables: MenuTableListItem[] };

function getConfiguredPublicBaseUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_PUBLIC_MENU_BASE_URL?.trim()
    || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try {
    return configuredUrl ? new URL(configuredUrl).origin : null;
  } catch {
    return null;
  }
}

export async function getMenuQrManagementPageData(menuSiteId: string): Promise<MenuQrManagementPageData> {
  try {
    menuSiteId = normalizeMenuTableId(menuSiteId);
  } catch {
    throw new MenuSiteAccessError("MENU_SITE_NOT_FOUND", "메뉴판을 찾을 수 없습니다.", 404);
  }
  const accessContext = await requireMenuSitePermission(menuSiteId, "menu.read");
  const hasQrPermission = hasMenuSitePermission(accessContext, "qr.manage");
  const hasTablePermission = hasMenuSitePermission(accessContext, "table.manage");
  if (!hasQrPermission) {
    throw new MenuSiteAccessError("MENU_SITE_PERMISSION_DENIED", "QR 관리 권한이 없습니다.", 403);
  }

  const [accessState, menuSiteResult] = await Promise.all([
    getMenuSiteAccessStateForMenuSite({ menuSiteId }),
    createAdminClient()
      .from("menu_sites")
      .select("id, name, slug, status, template_key")
      .eq("id", menuSiteId)
      .maybeSingle(),
  ]);
  if (menuSiteResult.error || !menuSiteResult.data || !accessState) {
    throw new MenuSiteAccessError("MENU_SITE_NOT_FOUND", "메뉴판을 찾을 수 없거나 접근 권한이 없습니다.", 404);
  }

  const menuSite = menuSiteResult.data;
  const canDownloadRepresentativeQr = hasQrPermission && Boolean(menuSite.slug) && accessState.canDownloadQr;
  const representativeQrDisabledReason = canDownloadRepresentativeQr
    ? null
    : !hasQrPermission
      ? "대표 QR 다운로드 권한이 없습니다."
      : !menuSite.slug
        ? "공개 주소를 만든 뒤 QR을 사용할 수 있습니다."
        : menuSite.status !== "published"
          ? "메뉴판을 공개한 뒤 대표 QR을 다운로드할 수 있습니다."
          : accessState.message ?? "현재 서비스 상태에서는 QR을 사용할 수 없습니다.";
  // Keep table queries and mutations behind the existing permission, runtime and lifecycle gates.
  const canManageTables = hasTablePermission
    && isTableManagementRuntimeEnabledForSite(menuSiteId)
    && accessState.planType === "business_basic"
    && accessState.canUseWriteActions
    && accessState.canEdit
    && Boolean(menuSite.slug)
    && getDiningTemplateFeatures(menuSite.template_key).smartCall;
  const tableData = canManageTables ? await listMenuTables(menuSiteId) : null;

  return {
    menuSite: { id: menuSite.id, name: menuSite.name, slug: menuSite.slug, status: menuSite.status },
    canDownloadRepresentativeQr,
    representativeQrDisabledReason,
    canManageTables,
    tableQrUnavailableReason: canManageTables
      ? null
      : !hasTablePermission
        ? "테이블별 QR은 테이블 관리 권한이 필요합니다."
        : "테이블별 QR은 테이블 기능이 활성화된 메뉴판에서 사용할 수 있습니다.",
    publicBaseUrl: getConfiguredPublicBaseUrl(),
    tables: tableData?.tables ?? [],
  };
}
