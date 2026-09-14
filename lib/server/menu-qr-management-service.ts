import "server-only";

import { getDiningTemplateFeatures } from "@/lib/dining-product-tiers";
import { hasMenuSitePermission, MenuSiteAccessError } from "@/lib/menu-site-permissions";
import {
  getMenuSiteAccessStateForMenuSite,
  requireMenuSitePermission,
} from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { isTableManagementRuntimeEnabledForSite } from "@/lib/table-management-runtime";

export type MenuQrManagementPageData = {
  menuSite: {
    id: string;
    name: string;
    slug: string;
    status: string;
  };
  canDownloadRepresentativeQr: boolean;
  representativeQrDisabledReason: string | null;
  canManageTables: boolean;
};

export async function getMenuQrManagementPageData(menuSiteId: string): Promise<MenuQrManagementPageData> {
  const accessContext = await requireMenuSitePermission(menuSiteId, "qr.manage");
  const [accessState, menuSiteResult] = await Promise.all([
    getMenuSiteAccessStateForMenuSite({ menuSiteId }),
    createAdminClient()
      .from("menu_sites")
      .select("id, name, slug, status, template_key")
      .eq("id", menuSiteId)
      .maybeSingle(),
  ]);

  if (menuSiteResult.error || !menuSiteResult.data || !accessState) {
    throw new MenuSiteAccessError(
      "MENU_SITE_NOT_FOUND",
      "메뉴판을 찾을 수 없거나 접근 권한이 없습니다.",
      404,
    );
  }

  const menuSite = menuSiteResult.data;
  const canDownloadRepresentativeQr = Boolean(menuSite.slug) && accessState.canDownloadQr;
  const representativeQrDisabledReason = canDownloadRepresentativeQr
    ? null
    : !menuSite.slug
      ? "공개 주소를 만든 뒤 QR을 사용할 수 있습니다."
      : menuSite.status !== "published"
        ? "메뉴판을 공개한 뒤 대표 QR을 다운로드할 수 있습니다."
        : accessState.message ?? "현재 서비스 상태에서는 QR을 사용할 수 없습니다.";
  const canManageTables =
    hasMenuSitePermission(accessContext, "table.manage")
    && isTableManagementRuntimeEnabledForSite(menuSiteId)
    && accessState.planType === "business_basic"
    && accessState.canUseWriteActions
    && accessState.canEdit
    && getDiningTemplateFeatures(menuSite.template_key).smartCall;

  return {
    menuSite: {
      id: menuSite.id,
      name: menuSite.name,
      slug: menuSite.slug,
      status: menuSite.status,
    },
    canDownloadRepresentativeQr,
    representativeQrDisabledReason,
    canManageTables,
  };
}
