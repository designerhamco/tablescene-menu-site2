import type { Metadata } from "next";
import Link from "next/link";

import SitePage from "@/components/layout/SitePage";
import TemplateGallery from "@/components/apply/TemplateGallery";
import { normalizeCatalogServiceFilter } from "@/lib/catalog-designs";

export const metadata: Metadata = {
  title: "디자인 템플릿 | ArtiMenu",
  description: "아티메뉴 베이직, 다이닝, 디스플레이에 맞는 템플릿을 둘러보세요.",
};

export default async function TemplatesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const query = await searchParams;

  return (
    <SitePage title="매장에 맞는 디자인 선택">

    <TemplateGallery
      initialService={normalizeCatalogServiceFilter(query.plan)}
      initialKind={query.category === "standard" ? "standard" : "designer"}
      initialFilter={query.filter ?? "all"}
      initialLayoutFilter={query.layout ?? "all"}
      initialMoodFilter={query.mood ?? "all"}
      initialColorFilter={query.color ?? "all"}
      initialQuery={typeof query.q === "string" ? query.q : ""}
      initialThumbnailSize={typeof query.view === "string" ? query.view : undefined}
    />

    <section className="site-dark-cta site-catalog-consultation">
      <div className="mx-auto max-w-2xl">
        <h2 className="type-section-title">브랜드 맞춤 제작</h2>
        <p className="type-body-lg mt-5 text-zinc-400">
          템플릿 범위를 넘어선 별도 브랜딩과 기능이 필요하다면 커스텀 제작을 상담해 주세요.
        </p>
      </div>
      <Link href="/apply/custom" className="site-button site-button-secondary site-button-lg mt-8">
        커스텀 상담
      </Link>
    </section>
    </SitePage>
  );
}
