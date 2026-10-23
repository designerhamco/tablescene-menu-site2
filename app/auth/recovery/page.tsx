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
      <main className="site-gutter site-auth-page bg-white text-zinc-950">
        <div className="site-auth-content">
          <div className="site-auth-form">
            <div className="site-auth-header">
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
                <div className="site-notice site-notice-warning px-4 py-3 text-sm font-medium leading-relaxed">
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
