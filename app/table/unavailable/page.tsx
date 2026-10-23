import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "사용할 수 없는 테이블 QR | 아티메뉴",
  robots: { index: false, follow: false },
};

export default function TableQrUnavailablePage() {
  return (
    <main className="site-gutter min-h-screen bg-stone-50 py-16 text-zinc-950">
      <section className="site-section mx-auto flex min-h-[70vh] max-w-xl flex-col justify-center p-8 md:p-12">
        <p className="text-sm font-bold text-amber-700">테이블 QR 확인 필요</p>
        <h1 className="type-subsection-title mt-3">이 QR은 현재 사용할 수 없습니다.</h1>
        <p className="mt-4 break-keep text-base font-medium leading-7 text-zinc-600">
          QR이 교체되었거나 테이블 또는 메뉴판 사용이 중지되었을 수 있습니다. 매장 직원에게 새 QR을 요청해 주세요.
        </p>
        <Link href="/" className="site-button site-button-primary mt-8 w-fit text-sm">
          아티메뉴 홈
        </Link>
      </section>
    </main>
  );
}
