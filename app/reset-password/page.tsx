import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { PASSWORD_RECOVERY_COOKIE } from "@/lib/password-reset-recovery";
import { createClient } from "@/lib/supabase/server";

import ResetPasswordForm from "./ResetPasswordForm";

type SearchParams = Promise<{
  code?: string;
  error?: string;
}>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { code, error } = await searchParams;

  if (code) {
    const callbackParams = new URLSearchParams({
      code,
      flow: "recovery",
      next: "/reset-password",
    });
    redirect(`/auth/callback?${callbackParams.toString()}`);
  }

  const cookieStore = await cookies();
  const hasRecoveryMarker = cookieStore.get(PASSWORD_RECOVERY_COOKIE)?.value === "verified";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const recoveryAuthorized = !error && hasRecoveryMarker && Boolean(user);

  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-gutter site-auth-page bg-white text-zinc-950">
        <div className="site-auth-content">
          <div className="site-auth-form">
            <div className="site-auth-header">
              <h1 className="type-page-title">새 비밀번호 설정</h1>
              <p className="type-page-description mt-3 text-zinc-500">새로운 비밀번호를 입력해주세요.</p>
            </div>

            <ResetPasswordForm recoveryAuthorized={recoveryAuthorized} />

            <div className="type-body-sm mt-6 text-center font-medium text-zinc-500">
              <Link href="/sign-in" className="font-bold text-zinc-950 hover:underline">
                로그인으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
