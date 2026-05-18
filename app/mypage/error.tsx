"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function MyPageError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    console.error("[mypage] render failed", error);
  }, [error]);

  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
        <p className="mb-3 text-xs font-black uppercase tracking-[0.24em] text-red-400">My Page Error</p>
        <h1 className="break-keep text-3xl font-black tracking-tight">마이페이지를 불러오지 못했습니다.</h1>
        <p className="mt-4 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
          일시적인 오류일 수 있습니다. 다시 시도해도 문제가 계속되면 관리자에게 문의해주세요.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}
