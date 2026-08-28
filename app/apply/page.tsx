import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { isDisplayCheckoutQaEnabled } from "@/lib/display-checkout-qa";

export const metadata: Metadata = {
  title: "서비스 신청 | ArtiMenu",
  description: "아티메뉴 다이닝, 아티메뉴 디스플레이, 아티메뉴 커스텀 신청 페이지를 선택하세요.",
};

function getApplyServices(displayCheckoutQaEnabled: boolean) {
  return [
  {
    title: "아티메뉴 다이닝",
    description: "단일페이지와 멀티페이지 상품을 나눠 선택하고 같은 유형의 템플릿을 자유롭게 교체할 수 있습니다.",
    price: "단일 월 5,900원·연 63,700원 / 멀티 월 9,900원·연 106,900원",
    note: "단일 월결제는 계정당 최초 1회, 결제수단 등록 후 30일 무료입니다. 추가 메뉴판은 별도로 구매하며 갱신 시 기존 메뉴판의 이용기간만 연장됩니다.",
    type: "웹 메뉴판",
    cta: "베이직 만들기",
    href: "/apply/basic",
    active: true,
  },
  {
    title: "아티메뉴 디스플레이",
    description: "사업자 전용 디스플레이 메뉴보드입니다. 신규 Display 구독 1건당 Display 메뉴판 1개가 제공됩니다.",
    price: "오픈 할인 월 14,900원 / 연 160,900원",
    note: displayCheckoutQaEnabled
      ? "TV/모니터용 디지털 메뉴보드를 사업자 전용 정기결제로 신청할 수 있습니다."
      : "아티메뉴 디스플레이 전용 템플릿 준비 전까지 결제할 수 없습니다.",
    type: displayCheckoutQaEnabled ? "오픈 할인" : "준비 중",
    cta: displayCheckoutQaEnabled ? "디스플레이 만들기" : "준비 중",
    href: "/apply/display",
    active: displayCheckoutQaEnabled,
  },
  {
    title: "아티메뉴 커스텀",
    description: "브랜딩과 인터랙션을 담은 프리미엄 웹 메뉴 경험",
    price: "별도 견적",
    note: "결제 없이 상담 신청을 접수한 뒤 별도 견적을 안내합니다.",
    type: "상담형",
    cta: "상담 신청",
    href: "/apply/custom",
    active: true,
  },
  ] as const;
}

export default function ApplyPage() {
  const displayCheckoutQaEnabled = isDisplayCheckoutQaEnabled();
  const applyServices = getApplyServices(displayCheckoutQaEnabled);

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
              아티메뉴 다이닝은 단일·멀티페이지 월결제/연결제를 한 화면에서 선택할 수 있습니다. 단일 월결제는 계정당 최초 1회 30일 무료체험을 제공합니다.
              {displayCheckoutQaEnabled
                ? " 아티메뉴 디스플레이는 사업자 전용 디지털 메뉴보드로 신규 구독 1건당 Display 메뉴판 1개를 제공합니다."
                : " 아티메뉴 디스플레이는 전용 템플릿 준비 후 신청을 열 예정입니다."}
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
