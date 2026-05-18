import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

export const metadata: Metadata = {
  title: "서비스 신청 | TableScene",
  description: "테이블씬 베이직, 디스플레이 서비스 신청 페이지를 선택하세요.",
};

const applyServices = [
  {
    title: "테이블씬 베이직",
    eyebrow: "TableScene Basic",
    description: "누구나 쉽고 빠르게 만드는 디지털 메뉴판/가격표",
    price: "오픈가 월 6,000원 / 연 60,000원",
    note: "월/연 자동결제 방식은 준비 중이며, 정식 오픈 시 적용됩니다.",
    type: "결제신청형",
    cta: "Basic 만들기",
    href: "/apply/basic",
    active: true,
  },
  {
    title: "테이블씬 디스플레이",
    eyebrow: "TableScene Display",
    description: "매장 화면을 감각적인 디지털 메뉴보드로",
    price: "오픈가 월 12,000원 / 연 120,000원",
    note: "Display 전용 템플릿 준비 중입니다. 템플릿 준비 후 신청할 수 있습니다.",
    type: "준비 중",
    cta: "준비 중",
    href: "/apply/display",
    active: false,
  },
  {
    title: "테이블씬 오더 1.0",
    eyebrow: "TableScene QR Order",
    description: "QR로 주문하고 주방까지 바로 연결되는 오더 시스템은 준비 중입니다.",
    price: null,
    note: null,
    type: "준비 중",
    cta: "준비 중",
    href: "/services/order",
    active: false,
  },
  {
    title: "테이블씬 커스텀",
    eyebrow: "TableScene Custom",
    description: "브랜딩과 인터랙션을 담은 프리미엄 웹 메뉴 경험",
    price: "별도 견적",
    note: "결제 없이 상담 신청을 접수한 뒤 별도 견적을 안내합니다.",
    type: "상담형",
    cta: "상담 신청",
    href: "/apply/custom",
    active: true,
  },
] as const;

export default function ApplyPage() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="border-b border-zinc-200 pb-10">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Apply</p>
            <h1 className="max-w-3xl break-keep text-4xl font-black tracking-tight md:text-5xl">
              어떤 서비스를 신청하시겠어요?
            </h1>
            <p className="mt-5 max-w-2xl break-keep text-base font-semibold leading-relaxed text-zinc-500">
              현재 바로 도입 가능한 베이직과 상담형 커스텀 중 필요한 신청 유형을 선택해주세요.
              디스플레이와 오더는 준비 중입니다.
            </p>
            <p className="mt-4 max-w-2xl break-keep text-sm font-bold leading-relaxed text-amber-700">
              월/연 자동결제 방식은 준비 중이며, PG/PortOne 확인 후 정식 오픈 시 적용됩니다.
            </p>
          </header>

          <section className="mt-10 grid gap-5 md:grid-cols-2">
            {applyServices.map((service) => (
              <article
                key={service.href}
                className={`flex min-h-[280px] flex-col rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm transition md:p-8 ${
                  service.active ? "hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md" : "opacity-60"
                }`}
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
                  {service.price ? (
                    <p className="mt-5 text-lg font-black text-zinc-950">
                      {service.price}
                    </p>
                  ) : null}
                  {service.note ? (
                    <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-400">
                      {service.note}
                    </p>
                  ) : null}
                </div>

                {service.active ? (
                  <Link
                    href={service.href}
                    className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-zinc-800"
                  >
                    {service.cta}
                  </Link>
                ) : (
                  <span className="mt-8 inline-flex w-full items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm font-bold text-zinc-400">
                    {service.cta}
                  </span>
                )}
              </article>
            ))}
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
