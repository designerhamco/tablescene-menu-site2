import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import SiteHeader from "@/components/layout/SiteHeader";

export const metadata: Metadata = {
  title: "서비스 신청 | TableScene",
  description: "테이블씬 메뉴, 스크린, 오더 1.0, 커스텀 서비스 신청 페이지를 선택하세요.",
};

const applyServices = [
  {
    title: "테이블씬 메뉴",
    eyebrow: "TableScene Menu",
    description: "누구나 쉽고 빠르게 만드는 디지털 메뉴판",
    type: "결제신청형",
    cta: "바로 도입하기",
    href: "/apply/menu",
  },
  {
    title: "테이블씬 스크린",
    eyebrow: "TableScene Screen",
    description: "매장 화면을 감각적인 디지털 메뉴보드로",
    type: "결제신청형",
    cta: "바로 도입하기",
    href: "/apply/screen",
  },
  {
    title: "테이블씬 오더 1.0",
    eyebrow: "TableScene QR Order",
    description: "QR로 주문하고 주방까지 바로 연결되는 오더 시스템",
    type: "결제신청형",
    cta: "바로 도입하기",
    href: "/apply/order",
  },
  {
    title: "테이블씬 커스텀",
    eyebrow: "TableScene Custom",
    description: "브랜딩과 인터랙션을 담은 프리미엄 웹 메뉴 경험",
    type: "상담형",
    cta: "상담 신청하기",
    href: "/apply/custom",
  },
] as const;

export default function ApplyPage() {
  return (
    <>
      <SiteHeader />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="border-b border-zinc-200 pb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Apply</p>
            <h1 className="max-w-3xl break-keep text-4xl font-black tracking-tight md:text-5xl">
              어떤 서비스를 신청하시겠어요?
            </h1>
            <p className="mt-5 max-w-2xl break-keep text-base font-semibold leading-relaxed text-zinc-500">
              테이블씬의 네 가지 서비스 중 필요한 신청 유형을 선택해주세요. 결제신청형 서비스는 신청서 작성 후 결제로 이어지고,
              커스텀은 상담과 견적 문의로 접수됩니다.
            </p>
          </header>

          <section className="mt-10 grid gap-5 md:grid-cols-2">
            {applyServices.map((service) => (
              <article
                key={service.href}
                className="flex min-h-[280px] flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md md:p-8"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">{service.eyebrow}</p>
                  <span className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs font-black text-zinc-500">
                    {service.type}
                  </span>
                </div>

                <div className="mt-8 flex-1">
                  <h2 className="break-keep text-3xl font-black tracking-tight">{service.title}</h2>
                  <p className="mt-4 break-keep text-base font-semibold leading-relaxed text-zinc-500">
                    {service.description}
                  </p>
                </div>

                <Link
                  href={service.href}
                  className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-zinc-800"
                >
                  {service.cta}
                </Link>
              </article>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
