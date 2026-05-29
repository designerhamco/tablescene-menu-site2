import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import { signUpAction } from "@/app/auth/actions";
import OAuthButtons from "@/components/auth/OAuthButtons";
import SignUpAgreementFields from "@/components/auth/SignUpAgreementFields";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { getSafeAuthRedirectPath } from "@/lib/auth-redirect";

type SearchParams = Promise<{
  error?: string;
  next?: string;
}>;

function getErrorMessage(error?: string) {
  if (!error) {
    return null;
  }

  if (error === "missing-fields") {
    return "이메일과 비밀번호를 입력해주세요.";
  }

  return decodeURIComponent(error);
}

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, next } = await searchParams;
  const errorMessage = getErrorMessage(error);
  const safeNext = getSafeAuthRedirectPath(next);

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-16 text-zinc-950 sm:px-6 lg:py-20">
        <section className="mx-auto w-full max-w-xl rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-xl shadow-zinc-200/60 sm:p-8">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">메뉴링크 회원가입</h1>
            <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
              카카오 계정 또는 이메일로 간편하게 가입할 수 있습니다. 가입 후 마이페이지에서 메뉴판을 만들고 관리할 수 있습니다.
            </p>
          </div>

          {errorMessage ? (
            <div className="mt-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
              {errorMessage}
            </div>
          ) : null}

          <div className="mt-7">
            <OAuthButtons next={safeNext} buttonLabel="카카오로 시작하기" showDivider={false} />
          </div>

          <div className="my-7 flex items-center gap-3">
            <div className="h-px flex-1 bg-zinc-200" />
            <span className="text-xs font-black text-zinc-400">또는</span>
            <div className="h-px flex-1 bg-zinc-200" />
          </div>

          <SignUpAgreementFields action={signUpAction} safeNext={safeNext} />

          <p className="mt-6 text-center text-sm font-medium text-zinc-500">
            이미 계정이 있나요?{" "}
            <Link
              href={`/sign-in?next=${encodeURIComponent(safeNext)}`}
              className="font-bold text-zinc-950 hover:underline"
            >
              메뉴링크 로그인
            </Link>
          </p>
        </section>
      </main>
      <Footer />
    </>
  );
}
