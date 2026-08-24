import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import {
  formatProductPrice,
  getPublicBasicProduct,
  publicBasicProducts,
} from "@/lib/public-product-details";

type ProductPageProps = {
  params: Promise<{ slug: string }>;
};

export function generateStaticParams() {
  return publicBasicProducts.map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: ProductPageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = getPublicBasicProduct(slug);

  if (!product) {
    return { title: "상품을 찾을 수 없습니다 | ArtiMenu" };
  }

  return {
    title: `${product.name} | ArtiMenu`,
    description: product.summary,
  };
}

export default async function ProductDetailPage({ params }: ProductPageProps) {
  const { slug } = await params;
  const product = getPublicBasicProduct(slug);

  if (!product) notFound();

  const purchaseHref = `/apply/basic?product=${encodeURIComponent(product.productKey)}`;

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-14 text-zinc-950 md:py-20">
        <article className="mx-auto max-w-5xl">
          <Link href="/pricing" className="text-sm font-bold text-zinc-500 transition hover:text-zinc-950">
            ← 요금제 안내
          </Link>

          <header className="mt-7 grid gap-8 rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm md:grid-cols-[1fr_320px] md:p-10">
            <div>
              <span className="inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">
                아티메뉴 다이닝
              </span>
              <h1 className="mt-5 break-keep text-4xl font-black tracking-tight md:text-5xl">{product.shortName}</h1>
              <p className="mt-5 max-w-2xl break-keep text-base font-semibold leading-relaxed text-zinc-600">
                {product.summary}
              </p>
            </div>
            <div className="rounded-3xl bg-zinc-950 p-6 text-white">
              <p className="text-sm font-bold text-zinc-400">부가세 포함</p>
              <p className="mt-2 text-3xl font-black">{formatProductPrice(product.price)}</p>
              <p className="mt-2 text-sm font-semibold text-zinc-400">
                정상가 {formatProductPrice(product.regularPrice)} · {product.billingLabel}
              </p>
              <Link
                href={purchaseHref}
                className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-white px-5 py-4 text-sm font-black text-zinc-950 transition hover:bg-zinc-100"
              >
                이 상품 신청하기
              </Link>
            </div>
          </header>

          <div className="mt-8 grid gap-6 md:grid-cols-2">
            <section className="rounded-3xl border border-zinc-200 bg-white p-7">
              <h2 className="text-xl font-black">상품·제공 정보</h2>
              <dl className="mt-6 space-y-5 text-sm">
                {[
                  ["서비스 형태", "온라인 디지털 메뉴판 서비스(실물 배송 없음)"],
                  ["이용기간", product.servicePeriod],
                  ["구매 대상", product.buyerRequirement],
                  ["제공 시점", product.provision],
                  ["교환 안내", "실물 상품이 아니므로 배송·교환은 제공되지 않습니다. 상품 적용 오류는 고객지원 확인 후 바로잡습니다."],
                ].map(([label, value]) => (
                  <div key={label} className="border-b border-zinc-100 pb-5 last:border-0 last:pb-0">
                    <dt className="font-black text-zinc-950">{label}</dt>
                    <dd className="mt-2 break-keep font-semibold leading-relaxed text-zinc-600">{value}</dd>
                  </div>
                ))}
              </dl>
            </section>

            <section className="rounded-3xl border border-zinc-200 bg-white p-7">
              <h2 className="text-xl font-black">포함 기능</h2>
              <ul className="mt-6 space-y-3 text-sm font-semibold leading-relaxed text-zinc-600">
                <li>• Basic 메뉴판 1개 생성 및 관리</li>
                <li>• 출시 대상 Basic 템플릿 선택</li>
                <li>• 메뉴·가격·이미지·매장 정보 편집</li>
                <li>• 공개 URL과 QR 코드 제공</li>
                <li>• 모바일·태블릿·PC 반응형 메뉴판</li>
              </ul>
              <p className="mt-6 rounded-2xl bg-zinc-50 p-4 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                신규 구매 또는 신규 구독 1건당 메뉴판 1개가 생성됩니다. 정기결제 갱신은 기존 메뉴판의 이용기간만 연장합니다.
              </p>
            </section>
          </div>

          <section className="mt-6 rounded-3xl border border-zinc-200 bg-white p-7 md:p-9">
            <h2 className="text-xl font-black">구독 해지·청약철회·환불 안내</h2>
            <ul className="mt-5 space-y-3 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
              {product.cancellation.map((item) => (
                <li key={item}>• {item}</li>
              ))}
            </ul>
            <p className="mt-5 text-xs font-bold leading-relaxed text-zinc-500">
              자세한 기준은 <Link href="/terms" className="underline underline-offset-2">이용약관</Link>을 확인해주세요. 환불 문의: admin@dndcommerce.co.kr / 010-3646-0642
            </p>
          </section>
        </article>
      </main>
      <Footer />
    </>
  );
}
