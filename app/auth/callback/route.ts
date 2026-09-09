import { NextResponse, type NextRequest } from "next/server";

import { isDeletedAccountStatus } from "@/lib/account-status";
import { getSafeAuthRedirectPath } from "@/lib/auth-redirect";
import {
  PASSWORD_RECOVERY_COOKIE,
  PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
} from "@/lib/password-reset-recovery";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = request.nextUrl;
  const origin = requestUrl.origin;
  const code = requestUrl.searchParams.get("code");
  const next = getSafeAuthRedirectPath(requestUrl.searchParams.get("next"));
  const authError = requestUrl.searchParams.get("error");
  const authErrorDescription = requestUrl.searchParams.get("error_description");
  const isRecoveryFlow = requestUrl.searchParams.get("flow") === "recovery";

  function getFailureRedirect() {
    if (isRecoveryFlow) {
      return new URL("/reset-password?error=invalid-link", origin);
    }

    const signInUrl = new URL("/sign-in", origin);
    signInUrl.searchParams.set("error", "sign-in-failed");
    signInUrl.searchParams.set("next", next);
    return signInUrl;
  }

  if (authError) {
    console.error("[auth] callback returned an authentication error", {
      authError,
      authErrorDescription,
      isRecoveryFlow,
    });
    return NextResponse.redirect(getFailureRedirect());
  }

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth] code exchange failed", {
        code: error.code,
        isRecoveryFlow,
        message: error.message,
      });
      return NextResponse.redirect(getFailureRedirect());
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (isDeletedAccountStatus(user?.app_metadata)) {
      await supabase.auth.signOut();
      const signInUrl = new URL("/sign-in", origin);
      signInUrl.searchParams.set("error", "탈퇴 처리된 계정입니다.");

      return NextResponse.redirect(signInUrl);
    }
  }

  const response = NextResponse.redirect(new URL(next, origin));

  if (isRecoveryFlow && code) {
    response.cookies.set(PASSWORD_RECOVERY_COOKIE, "verified", {
      httpOnly: true,
      maxAge: PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
      path: "/reset-password",
      sameSite: "lax",
      secure: requestUrl.protocol === "https:",
    });
  }

  return response;
}
