import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

const pricingPlans = [
  {
    name: "TableScene Basic",
    description: "디지털 메뉴판을 만들고 QR 링크로 공유하는 기본 상품입니다.",
    price: "월 6,000원 / 연 60,000원",
    href: "/apply/basic",
    cta: "Basic 신청하기",
    available: true,
  },
  {
    name: "TableScene Display",
    description: "매장 TV와 모니터용 디스플레이 메뉴보드 상품입니다.",
    price: "월 12,000원 / 연 120,000원",
    href: "/apply/display",
    cta: "준비 중",
    available: false,
  },
  {
    name: "TableScene Custom",
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
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Pricing</p>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">요금제 안내</h1>
              <p className="mt-4 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500">
                요금제를 확인한 뒤 신청 페이지에서 상품을 선택해주세요. 실제 결제와 메뉴판 생성은 `/apply` 및 `/apply/basic` 흐름에서만 진행됩니다.
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
                <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-400">Plan</p>
                <h2 className="mt-5 break-keep text-2xl font-black tracking-tight">{plan.name}</h2>
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
