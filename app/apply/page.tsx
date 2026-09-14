import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import TemplateGallery from "@/components/apply/TemplateGallery";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { isDisplayCheckoutQaEnabled } from "@/lib/display-checkout-qa";
import { getAvailableTemplatesForService } from "@/lib/templates";

export const metadata: Metadata = {
  title: "메뉴판 만들기 | ArtiMenu",
  description: "아티메뉴 다이닝과 디스플레이 템플릿을 미리 보고 원하는 디자인으로 시작하세요.",
};

export default function ApplyPage() {
  const displayCheckoutEnabled = isDisplayCheckoutQaEnabled();
  const diningTemplates = getAvailableTemplatesForService("basic");
  const displayTemplates = getAvailableTemplatesForService("display");

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-white py-14 text-zinc-950 md:py-20">
        <div className="site-container">
          <header className="max-w-3xl pb-12 md:pb-16">
            <h1 className="site-page-title">
              매장에 맞는 디자인 선택
            </h1>
            <p className="site-body mt-5 max-w-2xl text-zinc-500">
              템플릿을 미리 보고 원하는 디자인으로 메뉴판을 시작하고, 구독 중에는 선택한 페이지 유형의 모든 템플릿을 추가 결제 없이 교체할 수 있습니다.
            </p>
          </header>

          <TemplateGallery
            diningTemplates={diningTemplates}
            displayTemplates={displayTemplates}
            displayCheckoutEnabled={displayCheckoutEnabled}
          />

          <section className="mt-20 rounded-[2rem] bg-zinc-950 px-7 py-12 text-white md:mt-28 md:flex md:items-end md:justify-between md:gap-12 md:rounded-[2.5rem] md:px-12 md:py-14">
            <div className="max-w-2xl">
              <h2 className="site-section-title">브랜드 맞춤 제작</h2>
              <p className="site-body mt-5 text-zinc-400">
                템플릿 범위를 넘어선 별도 브랜딩과 기능이 필요하다면 커스텀 제작을 상담해 주세요.
              </p>
            </div>
            <Link href="/apply/custom" className="mt-8 inline-flex shrink-0 items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-zinc-200 md:mt-0">
              커스텀 상담
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
