"use client";

import { ArrowUpRight, Check, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState } from "react";

import { TemplateThumbnail } from "@/components/templates/TemplateCard";
import { getDiningTemplateTier, getDiningTierLabel, type DiningTemplateTier } from "@/lib/dining-product-tiers";
import type { TemplateCatalogItem, TemplateCategoryKey } from "@/lib/templates";

type ProductKey = "dining_single" | "dining_multi" | "display";
type IndustryKey = "all" | "cafe_bakery" | "restaurant_dining" | "japanese" | "pub_bar" | "quick_meal";

type IndustryGroup = {
  key: IndustryKey;
  label: string;
  categoryKeys: readonly TemplateCategoryKey[];
};

const INDUSTRY_GROUPS: readonly IndustryGroup[] = [
  { key: "all", label: "전체", categoryKeys: [] },
  { key: "cafe_bakery", label: "카페·베이커리", categoryKeys: ["cafe", "bakery", "dessert", "display"] },
  { key: "restaurant_dining", label: "레스토랑·다이닝", categoryKeys: ["restaurant", "brunch", "casual_dining", "fine_dining"] },
  { key: "japanese", label: "일식", categoryKeys: ["japanese"] },
  { key: "pub_bar", label: "바·주점", categoryKeys: ["pub_bar"] },
  { key: "quick_meal", label: "패스트푸드·분식", categoryKeys: ["fast_food"] },
];

const TEMPLATES_PER_PAGE = 8;

const PRODUCT_TABS: readonly { key: ProductKey; label: string }[] = [
  { key: "dining_single", label: "다이닝 원페이지" },
  { key: "dining_multi", label: "다이닝 멀티페이지" },
  { key: "display", label: "디스플레이" },
];

const TIER_DETAILS: Record<DiningTemplateTier, { price: string; description: string; product: string }> = {
  single: {
    price: "월 5,900원",
    description: "할인과 위젯을 사용하는 한 장 구성",
    product: "business_basic_single_monthly",
  },
  multi: {
    price: "월 9,900원",
    description: "여러 페이지와 스마트호출을 사용하는 구성",
    product: "business_basic_multi_monthly",
  },
};

function getIndustryGroup(template: TemplateCatalogItem) {
  return INDUSTRY_GROUPS.find((group) => group.key !== "all" && group.categoryKeys.includes(template.template_category));
}

function getStartHref(product: ProductKey, tier: DiningTemplateTier, templateKey: string) {
  if (product === "display") {
    return `/apply/display?template=${encodeURIComponent(templateKey)}`;
  }

  return `/apply/basic?product=${TIER_DETAILS[tier].product}&template=${encodeURIComponent(templateKey)}`;
}

export default function TemplateGallery({
  diningTemplates,
  displayTemplates,
  displayCheckoutEnabled,
}: {
  diningTemplates: readonly TemplateCatalogItem[];
  displayTemplates: readonly TemplateCatalogItem[];
  displayCheckoutEnabled: boolean;
}) {
  const [product, setProduct] = useState<ProductKey>("dining_single");
  const [industry, setIndustry] = useState<IndustryKey>("all");
  const [page, setPage] = useState(1);
  const galleryStartRef = useRef<HTMLDivElement>(null);
  const service = product === "display" ? "display" : "dining";
  const tier: DiningTemplateTier = product === "dining_multi" ? "multi" : "single";

  const templatesForProduct = useMemo(() => {
    if (service === "display") return [...displayTemplates];
    return diningTemplates.filter((template) => getDiningTemplateTier(template.key) === tier);
  }, [diningTemplates, displayTemplates, service, tier]);

  const visibleTemplates = useMemo(() => {
    if (industry === "all") return templatesForProduct;
    const selectedGroup = INDUSTRY_GROUPS.find((group) => group.key === industry);
    return selectedGroup
      ? templatesForProduct.filter((template) => selectedGroup.categoryKeys.includes(template.template_category))
      : templatesForProduct;
  }, [industry, templatesForProduct]);

  const totalPages = Math.ceil(visibleTemplates.length / TEMPLATES_PER_PAGE);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const paginatedTemplates = visibleTemplates.slice(
    (currentPage - 1) * TEMPLATES_PER_PAGE,
    currentPage * TEMPLATES_PER_PAGE,
  );
  const selectedIndustryLabel = INDUSTRY_GROUPS.find((group) => group.key === industry)?.label ?? "선택한 업종";

  const productTitle = product === "display" ? "아티메뉴 디스플레이" : product === "dining_multi" ? "다이닝 멀티페이지" : "다이닝 원페이지";
  const productPrice = service === "display" ? "월 14,900원" : TIER_DETAILS[tier].price;
  const productDescription = service === "display"
    ? "이미지와 동영상을 함께 사용하는 대형 화면 구성"
    : TIER_DETAILS[tier].description;

  function selectProduct(nextProduct: ProductKey) {
    setProduct(nextProduct);
    setIndustry("all");
    setPage(1);
  }

  function selectIndustry(nextIndustry: IndustryKey) {
    setIndustry(nextIndustry);
    setPage(1);
  }

  function selectPage(nextPage: number) {
    setPage(nextPage);
    window.requestAnimationFrame(() => {
      galleryStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <>
      <div className="border-b border-zinc-200">
        <div className="flex gap-7 overflow-x-auto" aria-label="서비스 및 페이지 유형 선택">
          {PRODUCT_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => selectProduct(key)}
              className={`shrink-0 border-b-2 pb-4 text-base font-bold transition-colors md:text-lg ${product === key ? "border-zinc-950 text-zinc-950" : "border-transparent text-zinc-600 hover:text-zinc-950"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <section className="mt-7 border-y border-zinc-200 bg-white py-6" aria-label="템플릿 이용 안내">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="site-body-title text-zinc-950">{productTitle}</p>
            <p className="site-body-support mt-1 text-zinc-500">{productDescription}</p>
          </div>
          <div className="md:text-right">
            <p className="text-xl font-bold text-zinc-950">{productPrice}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <Check className="h-4 w-4" aria-hidden="true" /> 같은 페이지 유형의 템플릿을 언제든 교체
            </p>
          </div>
        </div>
      </section>

      <div ref={galleryStartRef} className="scroll-mt-24">
        <div className="mt-8 flex gap-2 overflow-x-auto pb-1" aria-label="업종 선택">
          {INDUSTRY_GROUPS.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => selectIndustry(group.key)}
              className={`site-button site-button-sm shrink-0 ${industry === group.key ? "site-button-primary" : "site-button-secondary"}`}
            >
              {group.label}
            </button>
          ))}
        </div>
      </div>

      {paginatedTemplates.length > 0 ? (
        <div className="mt-8 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {paginatedTemplates.map((template) => {
            const templateTier = service === "dining" ? getDiningTemplateTier(template.key) : tier;
            const startDisabled = service === "display" && !displayCheckoutEnabled;
            const industryLabel = getIndustryGroup(template)?.label ?? template.categoryLabel;

            return (
              <article key={template.key} className="group">
                <Link href={`/templates/${template.key}/preview`} target="_blank" rel="noopener noreferrer" className="block" aria-label={`${template.name} 새 창에서 미리보기`}>
                  <div className="overflow-hidden rounded-[1.5rem] bg-zinc-100 ring-1 ring-inset ring-zinc-200 transition-shadow group-hover:ring-zinc-400">
                    <TemplateThumbnail template={template} />
                  </div>
                </Link>
                <div className="pt-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-zinc-600">{industryLabel}</p>
                      <h2 className="type-content-title mt-1 text-zinc-950">{template.name}</h2>
                    </div>
                    <span className="shrink-0 rounded-full bg-zinc-100 px-2.5 py-1 text-xs font-bold text-zinc-600">
                      {service === "display" ? "디스플레이" : getDiningTierLabel(templateTier)}
                    </span>
                  </div>
                  <p className="site-body-support mt-2 line-clamp-2 whitespace-pre-line text-zinc-500">
                    {template.description}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-3">
                    <Link href={`/templates/${template.key}/preview`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 border-b border-zinc-400 pb-1 text-sm font-bold text-zinc-700 hover:border-zinc-950 hover:text-zinc-950">
                      미리보기 <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                    {startDisabled ? (
                      <span className="text-sm font-bold text-zinc-400">신청 준비 중</span>
                    ) : (
                      <Link href={getStartHref(product, templateTier, template.key)} className="inline-flex items-center gap-1.5 border-b border-zinc-950 pb-1 text-sm font-bold text-zinc-950">
                        이 디자인으로 시작 <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="site-card site-card-empty mt-8 flex min-h-72 flex-col items-center justify-center bg-zinc-50 px-6">
          <h2 className="type-content-title text-zinc-950">{selectedIndustryLabel} 템플릿 준비 중</h2>
          <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500 md:text-base">
            매장에 잘 어울리는 새 디자인을 순차적으로 추가하고 있습니다.
          </p>
        </section>
      )}

      {totalPages > 1 ? (
        <nav className="mt-14 flex items-center justify-center gap-1" aria-label="템플릿 페이지">
          <button
            type="button"
            onClick={() => selectPage(currentPage - 1)}
            disabled={currentPage === 1}
            className="site-button site-button-ghost site-button-sm site-button-icon text-zinc-600 disabled:opacity-30"
            aria-label="이전 템플릿 페이지"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              onClick={() => selectPage(pageNumber)}
              className={`site-button site-button-sm min-w-10 px-3 ${currentPage === pageNumber ? "site-button-primary" : "site-button-ghost"}`}
              aria-current={currentPage === pageNumber ? "page" : undefined}
              aria-label={`${pageNumber}페이지`}
            >
              {pageNumber}
            </button>
          ))}
          <button
            type="button"
            onClick={() => selectPage(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="site-button site-button-ghost site-button-sm site-button-icon text-zinc-600 disabled:opacity-30"
            aria-label="다음 템플릿 페이지"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </nav>
      ) : null}
    </>
  );
}
