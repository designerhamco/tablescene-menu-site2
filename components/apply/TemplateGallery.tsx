"use client";

import { PanelsTopLeft } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import {
  CATALOG_INDUSTRIES,
  CATALOG_LAYOUT_FILTERS,
  filterCatalogDesigns,
  normalizeCatalogLayoutFilter,
  type CatalogKind,
  type CatalogLayoutFilter,
  type CatalogService,
} from "@/lib/catalog-designs";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ChoiceGroup, ChoiceTile } from "@/app/components/ui/choice-tile";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import CatalogDesignCard from "@/components/templates/CatalogDesignCard";
import CatalogLayoutIcon from "@/components/templates/CatalogLayoutIcon";
import CatalogLayoutSelect from "@/components/templates/CatalogLayoutSelect";
import useTemplateFavorites from "@/components/templates/useTemplateFavorites";
import TemplatePagination from "./TemplatePagination";

const TEMPLATES_PER_PAGE = 6;
const PRODUCT_TABS = [
  { key: "basic", label: "베이직" },
  { key: "dining", label: "다이닝" },
  { key: "display", label: "디스플레이" },
] as const;
const KIND_TABS = [
  { key: "designer", label: "디자인 템플릿", description: "완성된 스타일에 우리 매장 메뉴를 넣어 시작하세요." },
  { key: "standard", label: "기본 템플릿", description: "기본 레이아웃에서 색상과 글꼴을 매장에 맞게 직접 설정하세요." },
] as const;
const INDUSTRY_EMOJI = {
  all: "🗂️", cafe_bakery: "☕",
  restaurant_dining: "🍽️", japanese: "🍣", pub_bar: "🍸", quick_meal: "🥪",
};

export default function TemplateGallery({
  initialProduct = "dining_single",
  initialKind = "designer",
  initialFilter = "all",
  initialLayoutFilter = "all",
}: {
  initialProduct?: "dining_single" | "dining_multi" | "display";
  initialKind?: CatalogKind;
  initialFilter?: string;
  initialLayoutFilter?: string;
}) {
  const [product, setProduct] = useState<CatalogService>(initialProduct === "dining_multi" ? "dining" : initialProduct === "display" ? "display" : "basic");
  const [kind, setKind] = useState<CatalogKind>(initialKind);
  const [filter, setFilter] = useState(initialProduct === "display" ? "all" : initialKind === "standard"
    ? (CATALOG_LAYOUT_FILTERS.some(item => item.key === initialFilter) ? initialFilter : "all")
    : (CATALOG_INDUSTRIES.some(item => item.key === initialFilter) ? initialFilter : "all"));
  const [layoutFilter, setLayoutFilter] = useState<CatalogLayoutFilter>(initialProduct !== "display" && initialKind === "designer"
    ? normalizeCatalogLayoutFilter(initialLayoutFilter) : "all");
  const [page, setPage] = useState(1);
  const galleryStartRef = useRef<HTMLDivElement>(null);
  const tabsId = useId();
  const { favorites, toggle, busy, message } = useTemplateFavorites();
  const visibleTemplates = useMemo(() => filterCatalogDesigns(product, kind, filter, layoutFilter), [product, kind, filter, layoutFilter]);
  const totalPages = Math.ceil(visibleTemplates.length / TEMPLATES_PER_PAGE);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const paginatedTemplates = visibleTemplates.slice((currentPage - 1) * TEMPLATES_PER_PAGE, currentPage * TEMPLATES_PER_PAGE);
  const selectedKind = KIND_TABS.find(item => item.key === kind)!;
  const filters = kind === "standard" ? CATALOG_LAYOUT_FILTERS : CATALOG_INDUSTRIES;
  const filterHeading = kind === "standard" ? "화면 구성" : "업종";
  const filterLabel = filters.find(item => item.key === filter)?.label ?? "전체";
  const layoutLabel = CATALOG_LAYOUT_FILTERS.find(item => item.key === layoutFilter)!.label;
  const hasLayoutFilter = product !== "display" && kind === "designer";
  const emptyTitle = hasLayoutFilter && layoutFilter !== "all"
    ? `${filter === "all" ? "" : `${filterLabel} · `}${layoutLabel} 템플릿 준비 중`
    : `${filterLabel} 템플릿 준비 중`;

  function keepUrl(service: CatalogService, nextKind: CatalogKind, nextFilter: string, nextLayout: CatalogLayoutFilter) {
    const url = new URL(location.href);
    url.searchParams.set("plan", service);
    url.searchParams.set("category", nextKind);
    url.searchParams.set("filter", nextFilter);
    if (service !== "display" && nextKind === "designer" && nextLayout !== "all") url.searchParams.set("layout", nextLayout);
    else url.searchParams.delete("layout");
    history.replaceState(null, "", url);
  }
  function selectProduct(service: CatalogService) {
    setProduct(service); setFilter("all"); setLayoutFilter("all"); setPage(1); keepUrl(service, kind, "all", "all");
  }
  function selectKind(next: CatalogKind) {
    setKind(next); setFilter("all"); setLayoutFilter("all"); setPage(1); keepUrl(product, next, "all", "all");
  }
  function selectFilter(next: string) {
    setFilter(next); setPage(1); keepUrl(product, kind, next, layoutFilter);
  }
  function selectLayout(next: CatalogLayoutFilter) {
    setLayoutFilter(next); setPage(1); keepUrl(product, kind, filter, next);
  }
  function clearFilters() {
    setFilter("all"); setLayoutFilter("all"); setPage(1); keepUrl(product, kind, "all", "all");
  }
  function filterButtons() {
    return filters.map(item => {
      const icon = item.key === "list" || item.key === "album"
        ? { icon: <CatalogLayoutIcon layout={item.key} /> }
        : kind === "designer" ? { emoji: INDUSTRY_EMOJI[item.key as keyof typeof INDUSTRY_EMOJI] } : { emoji: "🗂️" };
      return <ChoiceTile key={item.key} size="compact" {...icon} label={item.label} selected={filter === item.key} onClick={() => selectFilter(item.key)} />;
    });
  }

  return <Tabs variant="underline" value={product} onValueChange={value => selectProduct(value as CatalogService)}>
    <TabsList variant="underline" size="lg" className="site-catalog-services" aria-label="서비스 및 페이지 유형 선택">
      {PRODUCT_TABS.map(({ key, label }) => (
        <TabsTrigger key={key} value={key} id={`${tabsId}-${key}`} aria-controls={`${tabsId}-service-panel`}>{label}</TabsTrigger>
      ))}
    </TabsList>
    <div role="tabpanel" id={`${tabsId}-service-panel`} aria-labelledby={`${tabsId}-${product}`}>
      <Tabs ref={galleryStartRef} variant={product === "display" ? undefined : "contained"} value={kind} onValueChange={value => selectKind(value as CatalogKind)} className="site-catalog-selection scroll-mt-24">
        {product !== "display" && (
          <TabsList aria-label="템플릿 종류 선택">
            {KIND_TABS.map(({ key, label }) => (
              <TabsTrigger key={key} value={key} id={`${tabsId}-${key}`} aria-controls={`${tabsId}-kind-panel`}>{label}</TabsTrigger>
            ))}
          </TabsList>
        )}
        <div role={product !== "display" ? "tabpanel" : undefined} tabIndex={product !== "display" ? 0 : undefined}
          className={product !== "display" ? "site-contained-panel" : undefined}
          id={`${tabsId}-kind-panel`} aria-labelledby={product !== "display" ? `${tabsId}-${kind}` : undefined}>
          <section className="site-catalog-plan" aria-label="템플릿 이용 안내">
            <p className="type-body site-catalog-kind-description">
              {product === "display" ? "매장 모니터에 어울리는 디자인을 미리 확인하세요. 신규 신청은 준비 중입니다." : selectedKind.description}
            </p>
          </section>
          <div className="site-catalog-layout" data-with-filters={product !== "display"}>
            {product !== "display" && (
              <aside className="site-catalog-filters" aria-label={`템플릿 ${filterHeading} 필터`}>
                <h2 className="type-label mb-3">{filterHeading}</h2>
                <ChoiceGroup aria-label={`${filterHeading} 선택`}>{filterButtons()}</ChoiceGroup>
              </aside>
            )}
            <div className="site-catalog-results">
              <div className="site-catalog-results-toolbar">
                <p className="site-catalog-count" aria-live="polite" aria-atomic="true">
                  {product === "display" ? "디스플레이" : `${selectedKind.label} · ${filterLabel}${hasLayoutFilter && layoutFilter !== "all" ? ` · ${layoutLabel}` : ""}`} <span>{visibleTemplates.length}개</span>
                </p>
                {hasLayoutFilter && <div className="site-catalog-layout-filter">
                  <CatalogLayoutSelect label="디자인 템플릿 화면 구성" value={layoutFilter} onValueChange={selectLayout} />
                </div>}
              </div>
              {message && <p role="status" className="type-body-sm mb-3 text-red-700">{message}</p>}
              {paginatedTemplates.length ? (
                <div className="site-template-grid">{paginatedTemplates.map(design => <CatalogDesignCard key={design.id} design={design} liked={favorites.includes(design.id)} busy={busy} onToggle={toggle} />)}</div>
              ) : (
                <EmptyState icon={<PanelsTopLeft />} title={emptyTitle} description={hasLayoutFilter && layoutFilter !== "all"
                  ? "선택한 화면 구성의 디자인을 준비하고 있습니다. 다른 화면 구성이나 업종을 선택해 주세요."
                  : "매장에 잘 어울리는 새 디자인을 순차적으로 추가하고 있습니다."}
                  action={product !== "display" ? <Button variant="outline" size="lg" shape="rounded" onClick={clearFilters}>전체 템플릿 보기</Button> : undefined} />
              )}
              <TemplatePagination currentPage={currentPage} totalPages={totalPages} onSelect={next => {
                setPage(next);
                requestAnimationFrame(() => galleryStartRef.current?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" }));
              }} />
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  </Tabs>;
}
