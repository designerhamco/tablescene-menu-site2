import { NextResponse, type NextRequest } from "next/server";

import { getSafeAuthRedirectPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const next = getSafeAuthRedirectPath(requestUrl.searchParams.get("next"));
  const authError = requestUrl.searchParams.get("error");
  const authErrorDescription = requestUrl.searchParams.get("error_description");

  if (authError) {
    const errorMessage = authErrorDescription || "간편로그인에 실패했습니다.";
    const signInUrl = new URL("/sign-in", origin);
    signInUrl.searchParams.set("error", errorMessage);
    signInUrl.searchParams.set("next", next);

    return NextResponse.redirect(signInUrl);
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const signInUrl = new URL("/sign-in", origin);
      signInUrl.searchParams.set("error", error.message);
      signInUrl.searchParams.set("next", next);

      return NextResponse.redirect(signInUrl);
    }
  }

  return NextResponse.redirect(new URL(next, origin));
}
