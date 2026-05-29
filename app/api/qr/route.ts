import { toBuffer } from "qrcode";

import { isValidPublicSlug } from "@/lib/menu-limits";
import { getPublicMenuPath } from "@/lib/menu-url";
import { getMenuSiteAccessStateBySlug } from "@/lib/server/menu-site-access-service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPublicMenuQrUrl(request: Request, slug: string) {
  const encodedSlug = encodeURIComponent(slug);
  const requestOrigin = new URL(request.url).origin;
  const publicBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_MENU_BASE_URL?.trim().replace(/\/+$/, "");

  if (publicBaseUrl) {
    return `${publicBaseUrl}/menu/${encodedSlug}`;
  }

  const legacyMenuBaseUrl = process.env.NEXT_PUBLIC_MENU_BASE_URL?.trim().replace(/\/+$/, "");

  if (legacyMenuBaseUrl) {
    if (legacyMenuBaseUrl.startsWith("http://") || legacyMenuBaseUrl.startsWith("https://")) {
      return legacyMenuBaseUrl.endsWith("/menu") ? `${legacyMenuBaseUrl}/${encodedSlug}` : `${legacyMenuBaseUrl}/menu/${encodedSlug}`;
    }

    const legacyPath = legacyMenuBaseUrl.endsWith("/menu") ? `${legacyMenuBaseUrl}/${encodedSlug}` : `${legacyMenuBaseUrl}/menu/${encodedSlug}`;
    return `${requestOrigin}${legacyPath.startsWith("/") ? legacyPath : `/${legacyPath}`}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return siteUrl ? `${siteUrl}${getPublicMenuPath(slug)}` : `${requestOrigin}${getPublicMenuPath(slug)}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim() ?? "";

  if (!slug || !isValidPublicSlug(slug)) {
    return Response.json({ error: "올바른 메뉴판 주소가 필요합니다." }, { status: 400 });
  }

  const accessState = await getMenuSiteAccessStateBySlug(slug);
  if (!accessState) {
    return Response.json({ error: "메뉴판을 찾을 수 없습니다." }, { status: 404 });
  }

  if (!accessState.canDownloadQr) {
    return Response.json({ error: "공개 중인 메뉴판에서만 QR을 다운로드할 수 있습니다." }, { status: 403 });
  }

  const publicMenuUrl = getPublicMenuQrUrl(request, slug);
  const pngBuffer = await toBuffer(publicMenuUrl, {
    type: "png",
    width: 1024,
    margin: 2,
    errorCorrectionLevel: "M",
    color: {
      dark: "#18181b",
      light: "#ffffff",
    },
  });

  return new Response(new Uint8Array(pngBuffer), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="menulink-${slug}-qr.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
