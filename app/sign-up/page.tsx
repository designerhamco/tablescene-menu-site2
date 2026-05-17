import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import { signUpAction } from "@/app/auth/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

type SearchParams = Promise<{
  error?: string;
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
  const { error } = await searchParams;
  const errorMessage = getErrorMessage(error);

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-zinc-400">
              Create Account
            </p>
            <h1 className="text-3xl font-bold tracking-tight">회원가입</h1>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              메뉴판 SaaS 관리와 서비스 신청을 위한 테이블씬 계정을 만듭니다.
            </p>
          </div>

          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <form action={signUpAction} className="space-y-5">
            <div>
              <label htmlFor="displayName" className="mb-2 block text-sm font-bold">
                이름 또는 매장명
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                autoComplete="name"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
                placeholder="강남 비스트로"
              />
            </div>

            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
                placeholder="owner@example.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-sm font-bold">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
                placeholder="6자 이상"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-base font-bold text-white transition-transform hover:scale-[1.01]"
            >
              계정 만들기
            </button>
          </form>

          <p className="mt-6 text-center text-sm font-medium text-zinc-500">
            이미 계정이 있나요?{" "}
            <Link href="/sign-in" className="font-bold text-zinc-950 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
      </main>
      <Footer />
    </>
  );
}
