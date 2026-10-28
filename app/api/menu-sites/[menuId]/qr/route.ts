import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { getMenuQrManagementPageData } from "@/lib/server/menu-qr-management-service";
import { MenuTableManagementError } from "@/lib/server/menu-table-management-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_request: Request, { params }: { params: Promise<{ menuId: string }> }) {
  const { menuId } = await params;
  const headers = { "Cache-Control": "private, no-store" };
  try {
    const { tables, ...data } = await getMenuQrManagementPageData(menuId);
    return Response.json({
      ...data,
      // The popup only needs public download paths, not management metadata.
      tables: tables.map(({ id, label, status, qrPath }) => ({ id, label, status, qrPath })),
    }, { headers });
  } catch (error) {
    if (error instanceof MenuSiteAccessError || error instanceof MenuTableManagementError) {
      return Response.json({ error: error.message }, { status: error.status, headers });
    }
    console.error("[menu-qr-downloads] failed to load QR list");
    return Response.json({ error: "QR 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 500, headers });
  }
}
