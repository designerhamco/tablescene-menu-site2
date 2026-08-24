import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { formatProductPrice, publicBasicProducts } from "@/lib/public-product-details";

export const metadata: Metadata = {
  title: "요금제 및 상품 | ArtiMenu",
  description: "아티메뉴 다이닝의 개인 체험, 사업자 월결제, 사업자 연간 상품 가격과 제공·환불 기준을 확인하세요.",
};

const upcomingServices = [
  {
    name: "아티메뉴 디스플레이",
    description: "신규 Display 구독 1건당 매장 TV와 모니터용 Display 메뉴판 1개가 제공됩니다.",
    price: "월 19,800원 / 연 190,000원",
    cta: "준비 중",
  },
  {
    name: "아티메뉴 커스텀",
    description: "브랜딩과 인터랙션을 담은 맞춤 제작 상담형 상품입니다.",
    price: "별도 견적",
    href: "/apply/custom",
    cta: "상담 신청하기",
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

          <section aria-labelledby="basic-products-heading">
            <div className="mb-5 flex flex-col justify-between gap-2 md:flex-row md:items-end">
              <div>
                <p className="text-sm font-black text-zinc-500">현재 신청 가능</p>
                <h2 id="basic-products-heading" className="mt-1 text-2xl font-black tracking-tight">아티메뉴 다이닝 상품</h2>
              </div>
              <p className="break-keep text-sm font-bold text-zinc-400">상품별 이용기간·제공 시점·환불 기준을 상세 페이지에서 확인할 수 있습니다.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-3">
              {publicBasicProducts.map((product) => (
                <article key={product.slug} className="flex min-h-[310px] flex-col rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                  <span className="w-fit rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">{product.billingLabel}</span>
                  <h3 className="mt-5 break-keep text-2xl font-black tracking-tight">{product.shortName}</h3>
                  <p className="mt-4 flex-1 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{product.summary}</p>
                  <p className="mt-6 text-2xl font-black text-zinc-950">{formatProductPrice(product.price)}</p>
                  <p className="mt-1 text-xs font-bold text-zinc-400">정상가 {formatProductPrice(product.regularPrice)} · 부가세 포함</p>
                  <Link
                    href={`/products/${product.slug}`}
                    className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-zinc-800"
                  >
                    상품 상세 및 신청
                  </Link>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-12 border-t border-zinc-200 pt-10" aria-labelledby="upcoming-services-heading">
            <h2 id="upcoming-services-heading" className="text-2xl font-black tracking-tight">다른 서비스</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {upcomingServices.map((plan) => (
                <article key={plan.name} className="flex min-h-[250px] flex-col rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
                  <h3 className="break-keep text-2xl font-black tracking-tight">{plan.name}</h3>
                  <p className="mt-4 flex-1 break-keep text-sm font-semibold leading-relaxed text-zinc-500">{plan.description}</p>
                  <p className="mt-6 text-lg font-black text-zinc-950">{plan.price}</p>
                  {"href" in plan ? (
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
            </div>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
