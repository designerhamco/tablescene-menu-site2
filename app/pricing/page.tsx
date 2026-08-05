import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

const pricingPlans = [
  {
    name: "메뉴링크 베이직",
    description: "신규 구매 또는 신규 구독 1건당 Basic 메뉴판 1개가 제공됩니다. 추가 메뉴판은 별도로 구매해 같은 계정에서 관리할 수 있습니다.",
    price: "첫 달 체험가 6,600원 / 월 9,900원 / 연 95,000원",
    href: "/apply/basic",
    cta: "Basic 신청하기",
    available: true,
  },
  {
    name: "메뉴링크 디스플레이",
    description: "신규 Display 구독 1건당 매장 TV와 모니터용 Display 메뉴판 1개가 제공됩니다.",
    price: "월 19,800원 / 연 190,000원",
    href: "/apply/display",
    cta: "준비 중",
    available: false,
  },
  {
    name: "메뉴링크 커스텀",
    description: "브랜딩과 인터랙션을 담은 맞춤 제작 상담형 상품입니다.",
    price: "별도 견적",
    href: "/apply/custom",
    cta: "상담 신청하기",
    available: true,
  },
] as const;

export default function PricingPage() {
  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-10 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <Link href="/mypage" className="mb-6 inline-block text-sm font-bold text-zinc-400 hover:text-zinc-950">
                ← 마이페이지
              </Link>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">요금제 안내</h1>
              <p className="mt-4 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500">
                요금제를 확인한 뒤 신청 페이지에서 상품을 선택해주세요. 실제 결제와 메뉴판 생성은 `/apply` 및 `/apply/basic` 흐름에서만 진행됩니다.
              </p>
              <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-400">
                ※ 모든 금액은 부가세 포함가입니다. ※ 오픈할인은 공식 오픈일로부터 1년간 제공됩니다.
              </p>
              <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-400">
                정기 결제 갱신 시에는 기존 메뉴판의 이용기간만 연장되며, 새 메뉴판이 추가로 생성되지 않습니다.
              </p>
            </div>
            <Link
              href="/apply"
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-6 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
            >
              상품 선택하기
            </Link>
          </header>

          <section className="grid gap-5 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <article key={plan.name} className="flex min-h-[280px] flex-col rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                <h2 className="break-keep text-2xl font-black tracking-tight">{plan.name}</h2>
                <p className="mt-4 flex-1 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{plan.description}</p>
                <p className="mt-6 text-lg font-black text-zinc-950">{plan.price}</p>
                {plan.available ? (
                  <Link
                    href={plan.href}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-zinc-800"
                  >
                    {plan.cta}
                  </Link>
                ) : (
                  <span className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm font-bold text-zinc-400">
                    {plan.cta}
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
