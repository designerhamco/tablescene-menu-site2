"use client";

import { Grid2X2, Grid3X3, Palette, PanelsTopLeft, Sparkles, Store } from "@/app/components/ui/site-icon";
import { useId, useMemo, useRef, useState } from "react";
import {
  CATALOG_INDUSTRIES,
  filterCatalogDesigns,
  normalizeCatalogFilters,
  type CatalogFilters,
  type CatalogKind,
  type CatalogService,
} from "@/lib/catalog-designs";
import { CATALOG_COLORS, CATALOG_MOODS, CATALOG_DEFAULT_THUMBNAIL_SIZE, normalizeCatalogThumbnailSize, type CatalogThumbnailSize } from "@/lib/catalog-facets";
import { Button } from "@/app/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/app/components/ui/toggle-group";
import { FilterToolbar } from "@/app/components/ui/filter-toolbar";
import { SearchField } from "@/app/components/ui/search-field";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Tabs, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import CatalogDesignCard from "@/components/templates/CatalogDesignCard";
import CatalogFilterSearch from "@/components/templates/CatalogFilterSearch";
import CatalogFilterSelect from "@/components/templates/CatalogFilterSelect";
import CatalogIndustryIcon from "@/components/templates/CatalogIndustryIcon";
import CatalogLayoutSelect from "@/components/templates/CatalogLayoutSelect";
import useTemplateFavorites from "@/components/templates/useTemplateFavorites";
import TemplatePagination from "./TemplatePagination";
import HintBubble from "@/components/ui/HintBubble";

const TEMPLATES_PER_PAGE = 6;
const PRODUCT_TABS = [
  { key: "basic", label: "베이직" },
  { key: "dining", label: "다이닝" },
  { key: "display", label: "디스플레이" },
] as const;
const KIND_TABS = [
  { key: "designer", label: "디자인 템플릿" },
  { key: "standard", label: "기본 템플릿" },
] as const;
const DEFAULT_FILTERS: CatalogFilters = { industry: [], mood: [], color: [], layout: [] };
const industryOptions = CATALOG_INDUSTRIES.map(item => ({ ...item, label: item.key === "all" ? "전체 업종" : item.label, icon: <CatalogIndustryIcon industry={item.key} /> }));
const colorOptions = CATALOG_COLORS.map(item => ({ ...item, icon: item.swatch
  ? <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><circle cx="10" cy="10" r="7" fill={item.swatch} stroke="currentColor" strokeWidth="0.5" /></svg>
  : <Palette aria-hidden="true" /> }));

export default function TemplateGallery({
  initialProduct = "dining_single", initialKind = "designer", initialFilter = "all", initialLayoutFilter = "all",
  initialMoodFilter = "all", initialColorFilter = "all", initialQuery = "", initialThumbnailSize = CATALOG_DEFAULT_THUMBNAIL_SIZE,
}: {
  initialProduct?: "dining_single" | "dining_multi" | "display";
  initialKind?: CatalogKind;
  initialFilter?: string | string[];
  initialLayoutFilter?: string | string[];
  initialMoodFilter?: string | string[];
  initialColorFilter?: string | string[];
  initialQuery?: string;
  initialThumbnailSize?: string;
}) {
  const [product, setProduct] = useState<CatalogService>(initialProduct === "dining_multi" ? "dining" : initialProduct === "display" ? "display" : "basic");
  const [kind, setKind] = useState<CatalogKind>(initialKind);
  const [filters, setFilters] = useState(() => normalizeCatalogFilters({
    industry: initialFilter, layout: initialLayoutFilter === "all" ? undefined : initialLayoutFilter,
    mood: initialMoodFilter, color: initialColorFilter,
  }, initialProduct === "display" ? "designer" : initialKind));
  const [query, setQuery] = useState(initialQuery.slice(0, 100));
  const [thumbnailSize, setThumbnailSize] = useState(normalizeCatalogThumbnailSize(initialThumbnailSize));
  const [page, setPage] = useState(1);
  const galleryStartRef = useRef<HTMLDivElement>(null);
  const tabsId = useId();
  const { favorites, toggle, busy, message } = useTemplateFavorites();
  const visibleTemplates = useMemo(() => filterCatalogDesigns(product, kind, filters.industry, filters.layout, { mood: filters.mood, color: filters.color, query }), [product, kind, filters, query]);
  const totalPages = Math.ceil(visibleTemplates.length / TEMPLATES_PER_PAGE);
  const currentPage = Math.min(page, Math.max(totalPages, 1));
  const paginatedTemplates = visibleTemplates.slice((currentPage - 1) * TEMPLATES_PER_PAGE, currentPage * TEMPLATES_PER_PAGE);
  const selectedKind = KIND_TABS.find(item => item.key === kind)!;
  const hasFilters = Object.values(filters).some(value => value.length > 0) || Boolean(query.trim());

  function keepUrl(service: CatalogService, nextKind: CatalogKind, next: CatalogFilters, search = query, size = thumbnailSize) {
    const url = new URL(location.href);
    url.searchParams.set("plan", service);
    url.searchParams.set("category", nextKind);
    for (const [key, value] of Object.entries({ filter: next.industry.join(","), layout: next.layout.join(","), mood: next.mood.join(","), color: next.color.join(","), q: search.trim(), view: size })) {
      if (value && value !== "all" && !(key === "view" && value === CATALOG_DEFAULT_THUMBNAIL_SIZE)) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    history.replaceState(null, "", url);
  }
  function selectProduct(service: CatalogService) {
    setProduct(service); setFilters(DEFAULT_FILTERS); setPage(1); keepUrl(service, kind, DEFAULT_FILTERS);
  }
  function selectKind(next: CatalogKind) {
    setKind(next); setFilters(DEFAULT_FILTERS); setPage(1); keepUrl(product, next, DEFAULT_FILTERS);
  }
  function selectFilter<K extends keyof CatalogFilters>(key: K, value: CatalogFilters[K]) {
    const next = { ...filters, [key]: value };
    setFilters(next); setPage(1); keepUrl(product, kind, next);
  }
  function searchByName(next: string) {
    setQuery(next); setPage(1); keepUrl(product, kind, filters, next);
  }
  function selectThumbnailSize(next: CatalogThumbnailSize) {
    setThumbnailSize(next); keepUrl(product, kind, filters, query, next);
  }
  function clearFilters() {
    setFilters(DEFAULT_FILTERS); setQuery(""); setPage(1); keepUrl(product, kind, DEFAULT_FILTERS, "");
  }

  function renderFilters(presentation: "popover" | "accordion") {
    return [
      ...((kind !== "standard" || product === "display") ? [
        <CatalogFilterSelect key="industry" label="업종" presentation={presentation} icon={<Store aria-hidden="true" />} options={industryOptions} value={filters.industry} onValueChange={value => selectFilter("industry", value)} />,
        <CatalogFilterSelect key="mood" label="분위기" presentation={presentation} icon={<Sparkles aria-hidden="true" />} options={CATALOG_MOODS} value={filters.mood} onValueChange={value => selectFilter("mood", value)} />,
        <CatalogFilterSelect key="color" label="색상" presentation={presentation} appearance="swatches" icon={<Palette aria-hidden="true" />} options={colorOptions} value={filters.color} onValueChange={value => selectFilter("color", value)} />,
      ] : []),
      <CatalogLayoutSelect key="layout" presentation={presentation} value={filters.layout} onValueChange={value => selectFilter("layout", value)} />,
    ];
  }

  return <Tabs purpose="page" value={product} className="site-catalog" onValueChange={value => selectProduct(value as CatalogService)}>
    <TabsList size="lg" className="site-catalog-services" aria-label="서비스 선택">
      {PRODUCT_TABS.map(({ key, label }) => (
        <TabsTrigger key={key} value={key} id={`${tabsId}-${key}`} aria-controls={`${tabsId}-service-panel`}>{label}</TabsTrigger>
      ))}
    </TabsList>
    <div role="tabpanel" id={`${tabsId}-service-panel`} aria-labelledby={`${tabsId}-${product}`}>
      <Tabs ref={galleryStartRef} purpose="section" value={kind} onValueChange={value => selectKind(value as CatalogKind)} className="site-catalog-selection scroll-mt-24">
        <div className="site-stack-group">
          {product !== "display" && (
            <div className="site-catalog-kind-controls">
              <div className="site-catalog-kind-hint"><HintBubble id={`${tabsId}-designer-hint`}>처음이라면 여기부터</HintBubble></div>
              <TabsList size="md" distribution="equal" aria-label="템플릿 종류 선택">
                {KIND_TABS.map(({ key, label }) => (
                  <TabsTrigger key={key} value={key} id={`${tabsId}-${key}`} aria-controls={`${tabsId}-kind-panel`} aria-describedby={key === "designer" ? `${tabsId}-designer-hint` : undefined}>{label}</TabsTrigger>
                ))}
              </TabsList>
            </div>
          )}
          <div role={product !== "display" ? "tabpanel" : undefined} tabIndex={product !== "display" ? 0 : undefined}
            className="site-catalog-panel"
            id={`${tabsId}-kind-panel`} aria-labelledby={product !== "display" ? `${tabsId}-${kind}` : undefined}>
            <div className="site-catalog-results">
              <FilterToolbar collapseFiltersOnMobile hideToolsOnMobile filterLabel="템플릿 필터" search={
                <CatalogFilterSearch search={
                  <form role="search" aria-label="템플릿 이름 검색" className="site-catalog-search" onSubmit={event => event.preventDefault()}>
                    <SearchField id={`${tabsId}-search`} label="템플릿 이름 검색" submitLabel="이름 검색" placeholder="템플릿 이름으로 검색" enterKeyHint="search" maxLength={100} value={query} onValueChange={searchByName} />
                  </form>
                }>{renderFilters("accordion")}</CatalogFilterSearch>
              } filters={renderFilters("popover")} tools={
                <ToggleGroup type="single" appearance="segmented" size="sm" value={thumbnailSize} onValueChange={value => { if (value === "large" || value === "small") selectThumbnailSize(value); }} aria-label="썸네일 크기">
                  <ToggleGroupItem value="large" aria-label="썸네일 크게 보기" title="썸네일 크게 보기"><Grid2X2 aria-hidden="true" /></ToggleGroupItem>
                  <ToggleGroupItem value="small" aria-label="썸네일 작게 보기" title="썸네일 작게 보기"><Grid3X3 aria-hidden="true" /></ToggleGroupItem>
                </ToggleGroup>
              } summary={
                <p className="site-catalog-count" aria-live="polite" aria-atomic="true">
                  {product === "display" ? "디스플레이" : selectedKind.label} · <span>{visibleTemplates.length}개</span>
                </p>
              } />
              <div className="site-stack-group">
                <hr className="site-content-divider" />
                {message && <p role="status" className="type-body-sm text-red-700">{message}</p>}
                {paginatedTemplates.length ? (
                  <div className="site-template-grid" data-thumbnail-size={thumbnailSize}>{paginatedTemplates.map(design => <CatalogDesignCard key={design.id} design={design} liked={favorites.includes(design.id)} busy={busy} onToggle={toggle} />)}</div>
                ) : (
                  <EmptyState icon={<PanelsTopLeft />} title={hasFilters ? "조건에 맞는 템플릿이 없습니다" : "템플릿 준비 중"}
                    description={hasFilters ? "이름이나 필터 조건을 바꿔 다시 찾아보세요." : "매장에 잘 어울리는 새 디자인을 순차적으로 추가하고 있습니다."}
                    action={hasFilters ? <Button variant="outline" size="lg" onClick={clearFilters}>전체 템플릿 보기</Button> : undefined} />
                )}
              </div>
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
