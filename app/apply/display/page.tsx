import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import PaidApplyPage from "@/app/apply/_components/PaidApplyPage";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { isDisplayCheckoutQaEnabled } from "@/lib/display-checkout-qa";

export const metadata: Metadata = {
  title: "메뉴링크 디스플레이 준비 중 | MenuLink",
  description: "메뉴링크 디스플레이는 전용 템플릿 준비 후 신청할 수 있습니다.",
};

export default function ApplyDisplayPage() {
  if (isDisplayCheckoutQaEnabled()) {
    return <PaidApplyPage serviceType="screen" nextPath="/apply/display" />;
  }

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-4xl">
          <section className="rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm md:p-12">
            <h1 className="break-keep text-4xl font-black tracking-tight md:text-5xl">
              메뉴링크 디스플레이는 준비 중입니다.
            </h1>
            <p className="mt-5 max-w-2xl break-keep text-base font-semibold leading-relaxed text-zinc-500">
              메뉴링크 디스플레이 전용 템플릿 준비 후 신청할 수 있습니다. 현재는 결제, 템플릿 선택, 공개 주소 입력을 진행하지 않습니다.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/apply"
                className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                상품 선택으로 돌아가기
              </Link>
              <Link
                href="/services/display"
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-6 py-3 text-sm font-bold text-zinc-700 transition hover:border-zinc-400 hover:text-zinc-950"
              >
                메뉴링크 디스플레이 소개 보기
              </Link>
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
