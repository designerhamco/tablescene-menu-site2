import SitePageHeader from "@/components/layout/SitePageHeader";
import type { Metadata } from "next";
import Link from "next/link";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";

export const metadata: Metadata = {
  title: "메뉴판 만들기 | ArtiMenu",
  description: "베이직, 다이닝, 디스플레이와 커스텀 중 필요한 아티메뉴 서비스를 선택해 시작하세요.",
};

const applyOptions = [
  {
    title: "베이직 메뉴판",
    eyebrow: "BASIC",
    description: "카페와 매장의 메뉴를 한 화면에 정돈해 보여주는 메뉴판을 만듭니다.",
    href: "/apply/basic?product=business_basic_single_monthly",
    cta: "베이직으로 만들기",
  },
  {
    title: "다이닝 메뉴판",
    eyebrow: "DINING",
    description: "커버와 여러 페이지로 코스와 메뉴의 흐름을 보여주는 메뉴판을 만듭니다.",
    href: "/apply/basic?product=business_basic_multi_monthly",
    cta: "다이닝으로 만들기",
  },
  {
    title: "디스플레이",
    eyebrow: "DISPLAY",
    description: "TV와 모니터에 맞춘 대형 화면용 디지털 메뉴보드를 준비하고 있습니다.",
    href: "/services/display",
    cta: "준비 중 안내 보기",
    pending: true,
  },
  {
    title: "커스텀 제작",
    eyebrow: "CUSTOM",
    description: "템플릿 범위를 넘어선 별도 브랜딩과 기능을 상담하고 맞춤 제작합니다.",
    href: "/apply/custom",
    cta: "커스텀 상담하기",
  },
] as const;

export default function ApplyPage() {

  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-page-spacing-compact min-h-screen bg-white text-zinc-950">
        <div className="site-container">
          <SitePageHeader title="어떤 메뉴판을 만들까요?" description="필요한 메뉴판 유형을 선택하면 디자인과 매장 정보를 확인하는 신청 단계로 이어집니다." />

          <section className="site-card-grid grid gap-5 md:grid-cols-2" aria-label="메뉴판 만들기 유형 선택">
            {applyOptions.map((option) => (
              <article key={option.href} className="site-section flex min-h-[260px] flex-col p-6 md:p-8">
                <div className="flex items-center justify-between gap-3">
                  <p className="type-caption font-bold tracking-[0.16em] text-zinc-500">{option.eyebrow}</p>
                  {"pending" in option ? <span className="site-chip site-chip-pending">준비 중</span> : null}
                </div>
                <div className="mt-7 flex-1">
                  <h2 className="type-subsection-title">{option.title}</h2>
                  <p className="site-body mt-4 max-w-xl text-zinc-600">{option.description}</p>
                </div>
                <Link href={option.href} className={`site-button mt-8 w-full ${"pending" in option ? "site-button-secondary" : "site-button-primary"}`}>
                  {option.cta}
                </Link>
              </article>
            ))}
          </section>

          <section className="site-dark-cta mt-16 md:mt-20">
            <div className="mx-auto max-w-2xl">
              <h2 className="type-section-title">디자인을 먼저 둘러보세요</h2>
              <p className="site-body mt-5 text-zinc-400">
                기본 레이아웃과 완성된 디자인 템플릿을 비교한 뒤 메뉴판 만들기를 시작할 수 있습니다.
              </p>
            </div>
            <Link href="/templates" className="site-button site-button-secondary site-button-lg mt-8">
              디자인 템플릿 보기
            </Link>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
