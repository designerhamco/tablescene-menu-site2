import { toBuffer } from "qrcode";

import { isValidPublicSlug } from "@/lib/menu-limits";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getPublicMenuQrUrl(request: Request, slug: string) {
  const encodedSlug = encodeURIComponent(slug);
  const requestOrigin = new URL(request.url).origin;
  const menuBaseUrl = process.env.NEXT_PUBLIC_MENU_BASE_URL?.trim().replace(/\/+$/, "");

  if (menuBaseUrl) {
    if (menuBaseUrl.startsWith("http://") || menuBaseUrl.startsWith("https://")) {
      return `${menuBaseUrl}/${encodedSlug}`;
    }

    return `${requestOrigin}${menuBaseUrl.startsWith("/") ? menuBaseUrl : `/${menuBaseUrl}`}/${encodedSlug}`;
  }

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "");
  return `${siteUrl || requestOrigin}/menu/${encodedSlug}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug")?.trim() ?? "";

  if (!slug || !isValidPublicSlug(slug)) {
    return Response.json({ error: "올바른 메뉴판 주소가 필요합니다." }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: menuSite, error } = await supabase.from("menu_sites").select("id, status").eq("slug", slug).maybeSingle();

  if (error) {
    return Response.json({ error: "메뉴판 정보를 확인하지 못했습니다." }, { status: 500 });
  }

  if (!menuSite) {
    return Response.json({ error: "메뉴판을 찾을 수 없습니다." }, { status: 404 });
  }

  if (menuSite.status !== "published") {
    return Response.json({ error: "공개된 메뉴판만 QR을 다운로드할 수 있습니다." }, { status: 403 });
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
      "Content-Disposition": `attachment; filename="tablescene-${slug}-qr.png"`,
      "Cache-Control": "private, no-store",
    },
  });
}
