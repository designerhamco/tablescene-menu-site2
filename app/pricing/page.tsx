import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { publicBasicProducts } from "@/lib/public-product-details";
import ProductOfferCard from "@/components/marketing/ProductOfferCard";
import { Badge } from "@/app/components/ui/badge";

export const metadata: Metadata = {
  title: "요금제 및 상품 | ArtiMenu",
  description: "아티메뉴의 메뉴판별 월 구독, 30일 무료체험, 오픈 얼리버드 가격을 확인하세요.",
};

const upcomingServices = [
  {
    name: "아티메뉴 디스플레이",
    description: "선택한 디스플레이 디자인 템플릿 1개를 월 구독하며, 계정당 최초 1회 30일 무료체험을 제공합니다.",
    price: "정상가 월 12,900원 · 얼리버드 월 10,900원",
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
      <main className="site-gutter min-h-screen bg-white py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-[var(--site-content-width)]">
          <header className="site-page-heading mb-10 flex flex-col items-center gap-6 border-b border-zinc-200 pb-8">
            <div>
              <Link href="/mypage" className="mb-6 inline-block text-copy font-medium text-zinc-600 hover:text-zinc-950">
                ← 마이페이지
              </Link>
              <h1 className="type-page-title">요금제 안내</h1>
              <p className="type-page-description mt-4 max-w-2xl text-zinc-600">
                요금제를 확인한 뒤 매장에 맞는 디자인을 선택해 시작하세요.
              </p>
              <p className="site-body-support mt-3 font-bold text-zinc-600">
                ※ 모든 금액은 부가세 포함가입니다. ※ 오픈 얼리버드는 2026년 10월 1일부터 12월 31일까지 가입할 수 있으며, 구독 유지 중 할인 가격이 유지됩니다.
              </p>
              <p className="site-body-support mt-2 font-bold text-zinc-600">
                메뉴판마다 기본 디자인 또는 디자인 포함 이용권을 선택합니다. 같은 서비스 안에서 이용권에 포함된 디자인끼리 교체할 수 있습니다.
              </p>
            </div>
            <Link
              href="/apply"
              className="site-button site-button-primary inline-flex items-center justify-center"
            >
              상품 선택하기
            </Link>
          </header>

          <section aria-labelledby="basic-products-heading">
            <div className="site-section-heading mb-5 flex flex-col items-center gap-2">
              <div>
                <p className="text-copy font-medium text-zinc-600">현재 신청 가능</p>
                <h2 id="basic-products-heading" className="type-subsection-title mt-1">베이직·다이닝 플랜</h2>
              </div>
              <p className="break-keep text-copy font-medium text-zinc-600">상품별 이용기간·제공 시점·환불 기준을 상세 페이지에서 확인할 수 있습니다.</p>
            </div>
            <div className="grid gap-5 md:grid-cols-2">
              {publicBasicProducts.map((product) => (
                <ProductOfferCard key={product.slug} product={product} />
              ))}
            </div>
          </section>

          <section className="mt-12 border-t border-zinc-200 pt-10" aria-labelledby="upcoming-services-heading">
            <h2 id="upcoming-services-heading" className="type-subsection-title text-center">다른 서비스</h2>
            <div className="mt-5 grid gap-5 md:grid-cols-2">
              {upcomingServices.map((plan) => (
                <article key={plan.name} className="site-section flex min-h-[250px] flex-col p-7">
                  <h3 className="type-subsection-title">{plan.name}</h3>
                  <p className="mt-4 flex-1 break-keep text-copy font-semibold leading-relaxed text-zinc-600">{plan.description}</p>
                  <p className="type-item-title mt-6 text-zinc-950">{plan.price}</p>
                  {"href" in plan ? (
                    <Link
                      href={plan.href}
                      className="site-button site-button-primary mt-6 inline-flex w-full items-center justify-center"
                    >
                      {plan.cta}
                    </Link>
                  ) : (
                    <Badge>
                      {plan.cta}
                    </Badge>
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
