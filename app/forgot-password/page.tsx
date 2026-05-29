import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import { requestPasswordResetAction } from "@/app/auth/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

type SearchParams = Promise<{
  error?: string;
  message?: string;
}>;

function getErrorMessage(error?: string) {
  if (error === "missing-email") {
    return "이메일 주소를 입력해주세요.";
  }

  if (error === "send-failed") {
    return "입력하신 이메일로 비밀번호 재설정 안내를 보낼 수 있는지 확인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.";
  }

  return null;
}

function getNotice(message?: string) {
  if (message === "sent") {
    return "입력하신 이메일로 비밀번호 재설정 링크를 보냈습니다. 메일함을 확인해주세요.";
  }

  return null;
}

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { error, message } = await searchParams;
  const errorMessage = getErrorMessage(error);
  const notice = getNotice(message);

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold tracking-tight">비밀번호 재설정</h1>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              가입한 이메일을 입력하면 비밀번호를 다시 설정할 수 있는 링크를 보내드립니다.
            </p>
          </div>

          {notice && <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{notice}</div>}
          {errorMessage && <div className="mb-6 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMessage}</div>}

          <form action={requestPasswordResetAction} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-2 block text-sm font-bold">
                이메일 주소
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

            <button type="submit" className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-base font-bold text-white transition-transform hover:scale-[1.01]">
              재설정 메일 보내기
            </button>
          </form>

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
