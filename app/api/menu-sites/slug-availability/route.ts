import { NextResponse } from "next/server";

import { isValidMenuSlug, normalizeMenuSlug } from "@/lib/payments";
import { createClient } from "@/lib/supabase/server";

function jsonError(message: string, status = 400) {
  return NextResponse.json({ available: false, message }, { status });
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const url = new URL(request.url);
  const slug = normalizeMenuSlug(url.searchParams.get("slug") ?? "");

  if (!isValidMenuSlug(slug)) {
    return jsonError("메뉴판 주소는 3자 이상이며 영문 소문자, 숫자, 하이픈만 사용할 수 있습니다.");
  }

  const { data: existingSite, error } = await supabase
    .from("menu_sites")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return jsonError(`주소 중복 확인 중 오류가 발생했습니다: ${error.message}`, 500);
  }

  if (existingSite) {
    return NextResponse.json({
      available: false,
      message: "이미 사용 중인 주소입니다.",
    });
  }

  return NextResponse.json({
    available: true,
    message: "사용 가능한 주소입니다.",
  });
}
