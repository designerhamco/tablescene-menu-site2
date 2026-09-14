"use client";

import { ArrowUpRight, Check } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";

import { TemplateThumbnail } from "@/components/templates/TemplateCard";
import { getDiningTemplateTier, getDiningTierLabel, type DiningTemplateTier } from "@/lib/dining-product-tiers";
import type { TemplateCatalogItem, TemplateCategoryKey } from "@/lib/templates";

type ServiceKey = "dining" | "display";
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

function getStartHref(service: ServiceKey, tier: DiningTemplateTier, templateKey: string) {
  if (service === "display") {
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
  const [service, setService] = useState<ServiceKey>("dining");
  const [tier, setTier] = useState<DiningTemplateTier>("single");
  const [industry, setIndustry] = useState<IndustryKey>("all");

  const templatesForProduct = useMemo(() => {
    if (service === "display") return [...displayTemplates];
    return diningTemplates.filter((template) => getDiningTemplateTier(template.key) === tier);
  }, [diningTemplates, displayTemplates, service, tier]);

  const visibleIndustryGroups = useMemo(() => {
    const groupsWithTemplates = INDUSTRY_GROUPS.filter((group) => (
      group.key === "all" || templatesForProduct.some((template) => group.categoryKeys.includes(template.template_category))
    ));
    return groupsWithTemplates.length > 1 ? groupsWithTemplates : INDUSTRY_GROUPS.slice(0, 1);
  }, [templatesForProduct]);

  const visibleTemplates = useMemo(() => {
    if (industry === "all") return templatesForProduct;
    const selectedGroup = INDUSTRY_GROUPS.find((group) => group.key === industry);
    return selectedGroup
      ? templatesForProduct.filter((template) => selectedGroup.categoryKeys.includes(template.template_category))
      : templatesForProduct;
  }, [industry, templatesForProduct]);

  const productTitle = service === "display" ? "아티메뉴 디스플레이" : `다이닝 ${getDiningTierLabel(tier)}`;
  const productPrice = service === "display" ? "월 14,900원" : TIER_DETAILS[tier].price;
  const productDescription = service === "display"
    ? "이미지와 동영상을 함께 사용하는 대형 화면 구성"
    : TIER_DETAILS[tier].description;

  function selectService(nextService: ServiceKey) {
    setService(nextService);
    setIndustry("all");
  }

  function selectTier(nextTier: DiningTemplateTier) {
    setTier(nextTier);
    setIndustry("all");
  }

  return (
    <>
      <div className="border-b border-zinc-200">
        <div className="flex gap-8 overflow-x-auto" aria-label="서비스 선택">
          {([
            ["dining", "다이닝"],
            ["display", "디스플레이"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => selectService(key)}
              className={`shrink-0 border-b-2 pb-4 text-base font-bold transition-colors md:text-lg ${service === key ? "border-zinc-950 text-zinc-950" : "border-transparent text-zinc-400 hover:text-zinc-700"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {service === "dining" ? (
        <div className="mt-8 flex flex-wrap gap-2" aria-label="다이닝 페이지 유형 선택">
          {(["single", "multi"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => selectTier(key)}
              className={`rounded-full border px-5 py-2.5 text-sm font-bold transition-colors ${tier === key ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"}`}
            >
              {getDiningTierLabel(key)}
            </button>
          ))}
        </div>
      ) : null}

      <section className="mt-8 border-y border-zinc-200 bg-white py-6" aria-label="템플릿 이용 안내">
        <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
          <div>
            <p className="text-xl font-bold tracking-tight text-zinc-950">{productTitle}</p>
            <p className="mt-1 text-sm font-medium text-zinc-500 md:text-base">{productDescription}</p>
          </div>
          <div className="md:text-right">
            <p className="text-xl font-black text-zinc-950">{productPrice}</p>
            <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-bold text-emerald-700">
              <Check className="h-4 w-4" aria-hidden="true" /> 같은 페이지 유형의 템플릿을 언제든 교체
            </p>
          </div>
        </div>
      </section>

      <div className="mt-8 flex gap-2 overflow-x-auto pb-1" aria-label="업종 선택">
        {visibleIndustryGroups.map((group) => (
          <button
            key={group.key}
            type="button"
            onClick={() => setIndustry(group.key)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${industry === group.key ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"}`}
          >
            {group.label}
          </button>
        ))}
      </div>

      <div className="mt-8 grid gap-x-6 gap-y-12 md:grid-cols-2">
        {visibleTemplates.map((template) => {
          const templateTier = service === "dining" ? getDiningTemplateTier(template.key) : tier;
          const startDisabled = service === "display" && !displayCheckoutEnabled;
          const industryLabel = getIndustryGroup(template)?.label ?? template.categoryLabel;

          return (
            <article key={template.key} className="group">
              <Link href={`/templates/${template.key}/preview`} className="block" aria-label={`${template.name} 미리보기`}>
                <div className="overflow-hidden rounded-[1.75rem] border border-zinc-200 bg-zinc-100 transition-colors group-hover:border-zinc-400">
                  <TemplateThumbnail template={template} />
                </div>
              </Link>
              <div className="pt-5">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-bold text-zinc-400">{industryLabel}</p>
                    <h2 className="mt-1 text-2xl font-black tracking-tight text-zinc-950">{template.name}</h2>
                  </div>
                  <span className="shrink-0 rounded-full bg-zinc-100 px-3 py-1.5 text-xs font-black text-zinc-600">
                    {service === "display" ? "디스플레이" : getDiningTierLabel(templateTier)}
                  </span>
                </div>
                <p className="mt-3 whitespace-pre-line break-keep text-base font-medium leading-relaxed text-zinc-500">
                  {template.description}
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <Link href={`/templates/${template.key}/preview`} className="inline-flex items-center gap-1.5 border-b border-zinc-400 pb-1 text-sm font-black text-zinc-700 hover:border-zinc-950 hover:text-zinc-950">
                    미리보기 <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                  {startDisabled ? (
                    <span className="text-sm font-bold text-zinc-400">신청 준비 중</span>
                  ) : (
                    <Link href={getStartHref(service, templateTier, template.key)} className="inline-flex items-center gap-1.5 border-b border-zinc-950 pb-1 text-sm font-black text-zinc-950">
                      이 디자인으로 시작 <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                    </Link>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
