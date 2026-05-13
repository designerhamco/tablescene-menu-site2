import Link from "next/link";
import { Suspense } from "react";

import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-950 px-6 py-24 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-12rem)] w-full max-w-md flex-col justify-center">
        <div className="rounded-3xl border border-white/10 bg-white p-8 text-zinc-950 shadow-2xl">
          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.28em] text-zinc-400">Password Reset</p>
            <h1 className="text-3xl font-bold tracking-tight">새 비밀번호 설정</h1>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">새로운 비밀번호를 입력해주세요.</p>
          </div>

          <Suspense fallback={<p className="break-keep text-sm font-bold leading-relaxed text-zinc-500">비밀번호 재설정 링크를 확인하고 있습니다.</p>}>
            <ResetPasswordForm />
          </Suspense>

          <div className="mt-6 text-center text-sm font-medium text-zinc-500">
            <Link href="/sign-in" className="font-bold text-zinc-950 hover:underline">
              로그인으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
      </main>
    </>
  );
}
