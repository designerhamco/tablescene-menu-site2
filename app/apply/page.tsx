import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

export const metadata: Metadata = {
  title: "서비스 신청 | MenuLink",
  description: "메뉴링크 베이직, 메뉴링크 디스플레이, 메뉴링크 커스텀 신청 페이지를 선택하세요.",
};

const applyServices = [
  {
    title: "메뉴링크 베이직",
    description: "개인 1개월 체험 또는 사업자 정식 월/연 결제를 선택해 웹 메뉴판을 만듭니다.",
    price: "첫 달 체험가 6,600원 / 사업자 월 9,900원 / 연 95,000원",
    note: "메뉴링크 베이직 신청 화면에서 이용 방식과 템플릿을 함께 선택합니다.",
    type: "웹 메뉴판",
    cta: "베이직 만들기",
    href: "/apply/basic",
    active: true,
  },
  {
    title: "메뉴링크 디스플레이",
    description: "사업자 전용 디스플레이 메뉴보드입니다.",
    price: "오픈 할인 월 19,800원 / 연 190,000원",
    note: "메뉴링크 디스플레이 전용 템플릿 준비 전까지 결제할 수 없습니다.",
    type: "준비 중",
    cta: "준비 중",
    href: "/apply/display",
    active: false,
  },
  {
    title: "메뉴링크 커스텀",
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
            <h1 className="max-w-3xl break-keep text-4xl font-black tracking-tight md:text-5xl">
              어떤 서비스를 신청하시겠어요?
            </h1>
            <p className="mt-5 max-w-2xl break-keep text-base font-semibold leading-relaxed text-zinc-500">
              메뉴링크 베이직은 개인 1개월 체험과 사업자 정식 월/연 결제를 한 화면에서 선택할 수 있습니다.
              메뉴링크 디스플레이는 전용 템플릿 준비 후 신청을 열 예정입니다.
            </p>
            <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-400">
              ※ 모든 금액은 부가세 포함가입니다. ※ 오픈할인은 공식 오픈일로부터 1년간 제공됩니다.
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
