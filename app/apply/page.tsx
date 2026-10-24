import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import TemplateGallery from "@/components/apply/TemplateGallery";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

export const metadata: Metadata = {
  title: "메뉴판 만들기 | ArtiMenu",
  description: "아티메뉴 베이직과 다이닝 템플릿을 미리 보고 원하는 디자인으로 시작하세요.",
};

export default async function ApplyPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;
  const initialProduct = query.plan === "dining" ? "dining_multi" : query.plan === "display" ? "display" : "dining_single";

  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-page-spacing-compact min-h-screen bg-white text-zinc-950">
        <div className="site-container">
          <header className="site-page-heading pb-8 md:pb-10">
            <h1 className="type-page-title">
              매장에 맞는 디자인 선택
            </h1>
            <p className="site-body mt-5 max-w-2xl text-zinc-500">
              완성된 디자인으로 시작하거나 직접 꾸며보세요. 메뉴판 1개당 요금제를 선택할 수 있습니다.
            </p>
          </header>

          <TemplateGallery
            initialProduct={initialProduct}
            initialKind={query.category === "standard" ? "standard" : "designer"}
            initialFilter={typeof query.filter === "string" ? query.filter : "all"}
            initialLayoutFilter={typeof query.layout === "string" ? query.layout : "all"}
          />

          <section className="site-dark-cta site-catalog-consultation mt-20 md:mt-28">
            <div className="mx-auto max-w-2xl">
              <h2 className="type-section-title">브랜드 맞춤 제작</h2>
              <p className="site-body mt-5 text-zinc-400">
                템플릿 범위를 넘어선 별도 브랜딩과 기능이 필요하다면 커스텀 제작을 상담해 주세요.
              </p>
            </div>
            <Link href="/apply/custom" className="site-button site-button-secondary site-consultation-button mt-8">
              커스텀 상담
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
