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
      <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">새 비밀번호 설정</h1>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">새로운 비밀번호를 입력해주세요.</p>
          </div>

          <ResetPasswordForm recoveryAuthorized={recoveryAuthorized} />

          <div className="mt-6 text-center text-sm font-medium text-zinc-500">
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
