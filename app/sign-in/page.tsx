import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import { signInAction } from "@/app/auth/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

type SearchParams = Promise<{
  error?: string;
  message?: string;
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

function getNotice(message?: string) {
  if (message === "check-email") {
    return "가입 확인 메일을 보냈습니다. 메일 인증 후 로그인해주세요.";
  }

  if (message === "password-updated") {
    return "비밀번호가 변경되었습니다. 새 비밀번호로 로그인해주세요.";
  }

  return null;
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, message, next } = await searchParams;
  const errorMessage = getErrorMessage(error);
  const notice = getNotice(message);

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-zinc-400">
              Welcome Back
            </p>
            <h1 className="text-3xl font-bold tracking-tight">로그인</h1>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              마이페이지에서 메뉴판 생성과 관리 기능을 준비합니다.
            </p>
          </div>

          {notice && (
            <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
              {notice}
            </div>
          )}

          {errorMessage && (
            <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {errorMessage}
            </div>
          )}

          <form action={signInAction} className="space-y-5">
            <input type="hidden" name="next" value={next ?? "/mypage"} />

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
                autoComplete="current-password"
                className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
                placeholder="비밀번호"
              />
            </div>

            <button
              type="submit"
              className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-base font-bold text-white transition-transform hover:scale-[1.01]"
            >
              로그인
            </button>
          </form>

          <div className="mt-5 flex flex-col items-center justify-center gap-2 text-sm font-semibold text-zinc-500 sm:flex-row sm:gap-3">
            <Link href="/forgot-password" className="hover:text-zinc-950 hover:underline">
              비밀번호를 잊으셨나요?
            </Link>
            <span className="hidden text-zinc-300 sm:inline">·</span>
            <Link href="/find-account" className="hover:text-zinc-950 hover:underline">
              로그인 이메일을 잊으셨나요?
            </Link>
          </div>

          <p className="mt-6 text-center text-sm font-medium text-zinc-500">
            계정이 없나요?{" "}
            <Link href="/sign-up" className="font-bold text-zinc-950 hover:underline">
              회원가입
            </Link>
          </p>
        </div>
      </div>
      </main>
      <Footer />
    </>
  );
}
