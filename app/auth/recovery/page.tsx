import Link from "next/link";

import { verifyPasswordRecoveryAction } from "@/app/auth/actions";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

type SearchParams = Promise<{
  token_hash?: string;
  type?: string;
}>;

export default async function PasswordRecoveryVerificationPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token_hash: tokenHash, type } = await searchParams;
  const hasValidParameters = Boolean(tokenHash) && type === "recovery";

  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-gutter min-h-screen bg-zinc-950 py-24 text-white">
        <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md flex-col justify-center">
          <div className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
            <div className="mb-8">
              <h1 className="type-subsection-title">비밀번호 재설정</h1>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                본인 확인을 마치고 새 비밀번호를 설정합니다.
              </p>
            </div>

            {hasValidParameters ? (
              <form action={verifyPasswordRecoveryAction}>
                <input type="hidden" name="tokenHash" value={tokenHash ?? ""} />
                <input type="hidden" name="type" value="recovery" />
                <button
                  type="submit"
                  className="site-button site-button-primary site-button-lg w-full"
                >
                  비밀번호 재설정 계속하기
                </button>
              </form>
            ) : (
              <div className="space-y-5">
                <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800">
                  비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.
                </div>
                <Link
                  href="/forgot-password"
                  className="site-button site-button-primary site-button-lg w-full"
                >
                  재설정 메일 다시 받기
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
