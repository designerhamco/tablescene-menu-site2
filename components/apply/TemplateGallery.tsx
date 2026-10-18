"use client";

import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useId, useMemo, useRef, useState } from "react";

import TemplateCatalogMedia from "@/components/templates/TemplateCatalogMedia";
import TemplatePagination from "./TemplatePagination";
import { getDiningTemplateTier, getDiningTierLabel, type DiningTemplateTier } from "@/lib/dining-product-tiers";
import { getTemplatePreviewRouteKey, type TemplateCatalogItem, type TemplateCategoryKey } from "@/lib/templates";

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

const TEMPLATES_PER_PAGE = 6;

const PRODUCT_TABS: readonly { key: ProductKey; label: string }[] = [
  { key: "dining_single", label: "다이닝 원페이지" },
  { key: "dining_multi", label: "다이닝 멀티페이지" },
  { key: "display", label: "디스플레이" },
];

const TIER_DETAILS: Record<DiningTemplateTier, { price: string; description: string; product: string }> = {
  single: {
    price: "얼리버드 월 4,900원 · 정상가 5,900원",
    description: "할인과 위젯을 사용하는 한 장 구성",
    product: "business_basic_single_monthly",
  },
  multi: {
    price: "얼리버드 월 6,900원 · 정상가 8,900원",
    description: "메뉴를 여러 페이지로 나누어 보여주는 구성",
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
  const tabsId = useId();
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
  const productPrice = service === "display" ? "얼리버드 월 10,900원 · 정상가 12,900원" : TIER_DETAILS[tier].price;
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
      galleryStartRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    });
  }

  return (
    <>
      <div className="site-catalog-services">
        <div className="site-tabs" role="tablist" aria-label="서비스 및 페이지 유형 선택"
          onKeyDown={(event) => {
            const current = PRODUCT_TABS.findIndex((tab) => tab.key === product);
            const next = event.key === "ArrowRight" ? (current + 1) % PRODUCT_TABS.length
              : event.key === "ArrowLeft" ? (current + PRODUCT_TABS.length - 1) % PRODUCT_TABS.length
              : event.key === "Home" ? 0 : event.key === "End" ? PRODUCT_TABS.length - 1 : -1;
            if (next < 0) return;
            event.preventDefault();
            selectProduct(PRODUCT_TABS[next].key);
            event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
          }}>
          {PRODUCT_TABS.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              id={`${tabsId}-${key}`}
              aria-controls={`${tabsId}-panel`}
              aria-selected={product === key}
              tabIndex={product === key ? 0 : -1}
              onClick={() => selectProduct(key)}
              className="site-tab"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel" id={`${tabsId}-panel`} aria-labelledby={`${tabsId}-${product}`} tabIndex={0}>
        <section className="site-catalog-plan" aria-label="템플릿 이용 안내">
          <div>
            <p className="site-body-title">{productTitle}</p>
            <p className="site-body-support mt-1 text-zinc-500">{productDescription}</p>
          </div>
          <div>
            <p className="text-lg font-bold">{productPrice}</p>
            <p className="site-brand-note mt-2 inline-flex items-center gap-1.5 text-xs font-medium">
              <Check className="h-4 w-4" aria-hidden="true" /> 템플릿 1개별 월 구독 · 메뉴 데이터 가져오기 지원
            </p>
          </div>
        </section>

        <div ref={galleryStartRef} className="site-catalog-layout scroll-mt-24">
          <aside className="site-catalog-filters" aria-label="템플릿 카테고리">
            <div className="site-category-desktop">
              <h2 className="type-item-title mb-4">카테고리</h2>
              <div className="site-category-list" role="group" aria-label="업종 선택">
                {INDUSTRY_GROUPS.map(group => (
                  <button key={group.key} type="button" aria-pressed={industry === group.key} onClick={() => selectIndustry(group.key)}>
                    {group.label}
                  </button>
                ))}
              </div>
            </div>
            <label className="site-category-mobile">
              <span className="type-label">카테고리</span>
              <select className="site-category-select" value={industry} onChange={event => selectIndustry(event.target.value as IndustryKey)} aria-label="업종 선택">
                {INDUSTRY_GROUPS.map(group => <option key={group.key} value={group.key}>{group.label}</option>)}
              </select>
            </label>
          </aside>

          <div className="site-catalog-results">
            <p className="site-catalog-count">{industry === "all" ? "전체 디자인" : selectedIndustryLabel} <span>{visibleTemplates.length}</span></p>
            {paginatedTemplates.length > 0 ? (
              <div className="site-template-grid">
                {paginatedTemplates.map(template => {
                  const templateTier = service === "dining" ? getDiningTemplateTier(template.key) : tier;
                  const startDisabled = service === "display" && !displayCheckoutEnabled;
                  const industryLabel = getIndustryGroup(template)?.label ?? template.categoryLabel;
                  const recommended = service === "display" ? template.featuredDisplay : template.featuredBasic;
                  const previewHref = `/templates/${getTemplatePreviewRouteKey(template.key)}/preview`;

                  return (
                    <article key={template.key} className="site-template-card site-template-selection-card">
                      <Link href={previewHref} target="_blank" rel="noopener noreferrer" className="site-catalog-media-link" aria-label={`${template.name} 새 창에서 미리보기`}>
                        <div className="site-template-media"><TemplateCatalogMedia template={template} /></div>
                        <span className="site-catalog-open" aria-hidden="true"><ArrowUpRight /></span>
                      </Link>
                      <div className="site-template-details">
                        <div className="site-catalog-title-row">
                          <h2 className="type-content-title site-template-title"><Link href={previewHref} target="_blank" rel="noopener noreferrer">{template.name}</Link></h2>
                          {recommended ? <span className="site-template-recommended">추천</span> : null}
                        </div>
                        <p className="site-template-category mt-1">{industryLabel} · {service === "display" ? "디스플레이" : getDiningTierLabel(templateTier)}</p>
                        <p className="site-template-description mt-2 line-clamp-2 whitespace-pre-line">{template.description}</p>
                        <div className="site-template-actions">
                          <Link href={previewHref} target="_blank" rel="noopener noreferrer" className="site-template-preview-link">미리보기 <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
                          {startDisabled ? <span className="site-template-unavailable">신청 준비 중</span> : (
                            <Link href={getStartHref(product, templateTier, template.key)} className="site-template-start-link">이 디자인으로 시작 <ArrowUpRight className="h-4 w-4" aria-hidden="true" /></Link>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <section className="site-card site-card-empty flex min-h-72 flex-col items-center justify-center px-6">
                <h2 className="type-content-title">{selectedIndustryLabel} 템플릿 준비 중</h2>
                <p className="mt-3 break-keep text-sm text-zinc-500">매장에 잘 어울리는 새 디자인을 순차적으로 추가하고 있습니다.</p>
              </section>
            )}
            <TemplatePagination currentPage={currentPage} totalPages={totalPages} onSelect={selectPage} />
          </div>
        </div>
      </div>
    </>
  );
}
