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
    <main className="site-management-scope site-gutter min-h-screen bg-white py-16 text-zinc-950">
      <div className="mx-auto w-full max-w-3xl rounded-3xl border border-red-100 bg-white p-8 shadow-sm">
        <h1 className="type-page-title">마이페이지를 불러오지 못했습니다.</h1>
        <p className="type-page-description mt-4 text-zinc-500">
          일시적인 오류일 수 있습니다. 다시 시도해도 문제가 계속되면 관리자에게 문의해주세요.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => unstable_retry()}
            className="site-button site-button-rounded site-button-primary inline-flex items-center justify-center"
          >
            다시 시도
          </button>
          <Link
            href="/"
            className="site-button site-button-rounded site-button-outline inline-flex items-center justify-center"
          >
            홈으로 이동
          </Link>
        </div>
      </div>
    </main>
  );
}
