import { NextResponse } from "next/server";

import { isValidMenuSlug, normalizeMenuSlug } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ available: false, message }, { status, headers: { "Cache-Control": "no-store" } });
}

function jsonAvailable(available: boolean, message: string) {
  return NextResponse.json({ available, message }, { headers: { "Cache-Control": "no-store" } });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const slug = normalizeMenuSlug(url.searchParams.get("slug") ?? "");

  if (!isValidMenuSlug(slug)) {
    return jsonError("메뉴판 주소는 3자 이상이며 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;

  try {
    adminSupabase = createAdminClient();
  } catch (error) {
    console.error("[slug-availability] admin client configuration failed", {
      message: error instanceof Error ? error.message : "Unknown admin client error",
      hasSupabaseUrl: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()),
      hasServiceRoleKey: Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()),
    });
    return jsonError("주소 확인 설정에 문제가 있습니다. 관리자에게 문의해주세요.", 500);
  }

  const { data: existingSite, error } = await adminSupabase.from("menu_sites").select("id").eq("slug", slug).maybeSingle();

  if (error) {
    console.error("[slug-availability] slug check failed", {
      slug,
      code: error.code,
      message: error.message,
    });
    return jsonError("주소 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", 500);
  }

  if (existingSite) {
    return jsonAvailable(false, "이미 사용 중인 공개 주소입니다. 다른 주소를 입력해주세요.");
  }

  return jsonAvailable(true, "사용 가능한 주소입니다.");
}
