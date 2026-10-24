"use client";

import { BookOpen, Check, Coffee, Fish, LayoutGrid, Monitor, PanelsTopLeft, Sandwich, Tablet, Utensils, Wine } from "lucide-react";
import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  CATALOG_INDUSTRIES,
  CATALOG_LAYOUT_FILTERS,
  filterCatalogDesigns,
  getCatalogPricing,
  normalizeCatalogLayoutFilter,
  type CatalogKind,
  type CatalogLayoutFilter,
  type CatalogService,
} from "@/lib/catalog-designs";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/empty-state";
import { ChoiceTile } from "@/app/components/ui/choice-tile";
import CatalogDesignCard from "@/components/templates/CatalogDesignCard";
import CatalogLayoutIcon from "@/components/templates/CatalogLayoutIcon";
import CatalogLayoutSelect from "@/components/templates/CatalogLayoutSelect";
import useTemplateFavorites from "@/components/templates/useTemplateFavorites";
import TemplatePagination from "./TemplatePagination";

const TEMPLATES_PER_PAGE = 6;
const PRODUCT_TABS = [
  { key: "basic", label: "베이직", description: "한 화면에 담는 매장 메뉴", icon: Tablet },
  { key: "dining", label: "다이닝", description: "커버와 여러 페이지로 전하는 메뉴", icon: BookOpen },
  { key: "display", label: "디스플레이", description: "매장의 큰 화면을 위한 메뉴보드", icon: Monitor },
] as const;
const KIND_TABS = [
  { key: "designer", label: "디자인 템플릿", description: "완성된 스타일에 우리 매장 메뉴를 넣어 시작하세요." },
  { key: "standard", label: "기본 템플릿", description: "기본 레이아웃에서 색상과 글꼴을 매장에 맞게 직접 설정하세요." },
] as const;
const FILTER_ICONS = {
  all: LayoutGrid, cafe_bakery: Coffee,
  restaurant_dining: Utensils, japanese: Fish, pub_bar: Wine, quick_meal: Sandwich,
};

function navigateTabs(event: KeyboardEvent<HTMLDivElement>, current: number, count: number, select: (index: number) => void) {
  const next = event.key === "ArrowRight" ? (current + 1) % count
    : event.key === "ArrowLeft" ? (current + count - 1) % count
    : event.key === "Home" ? 0 : event.key === "End" ? count - 1 : -1;
  if (next < 0) return;
  event.preventDefault();
  select(next);
  const tab = event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];
  tab?.focus();
  tab?.scrollIntoView({ block: "nearest", inline: "nearest" });
}

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
  const pricing = product === "display" ? null : getCatalogPricing(product, kind);
  const productTitle = product === "display" ? "아티메뉴 디스플레이" : `${product === "basic" ? "베이직" : "다이닝"} ${selectedKind.label}`;
  const money = (amount: number) => `${amount.toLocaleString("ko-KR")}원`;

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
  function filterButtons(mobile: boolean) {
    return filters.map(item => {
      let icon;
      if (item.key === "list" || item.key === "album") icon = <CatalogLayoutIcon layout={item.key} />;
      else {
        const Icon = FILTER_ICONS[item.key];
        icon = <Icon aria-hidden="true" />;
      }
      if (mobile) return <ChoiceTile key={item.key} icon={icon} label={item.label} selected={filter === item.key} onClick={() => selectFilter(item.key)} />;
      return (
        <button key={item.key} type="button" aria-pressed={filter === item.key}
          className={kind === "standard" ? "site-catalog-layout-category" : undefined}
          onClick={() => selectFilter(item.key)}>
          {kind === "standard" ? icon : null}
          <span>{item.label}</span>
        </button>
      );
    });
  }

  return <>
    <div className="site-catalog-services" role="tablist" aria-label="서비스 및 페이지 유형 선택"
      onKeyDown={event => navigateTabs(event, PRODUCT_TABS.findIndex(item => item.key === product), PRODUCT_TABS.length, index => selectProduct(PRODUCT_TABS[index].key))}>
      {PRODUCT_TABS.map(({ key, label, description, icon: Icon }) => (
        <ChoiceTile key={key} role="tab" icon={<Icon aria-hidden="true" />} label={label} description={description} presentation="feature" selected={product === key}
          id={`${tabsId}-${key}`} aria-controls={`${tabsId}-service-panel`}
          aria-selected={product === key} tabIndex={product === key ? 0 : -1}
          onClick={() => selectProduct(key)} />
      ))}
    </div>
    <div role="tabpanel" id={`${tabsId}-service-panel`} aria-labelledby={`${tabsId}-${product}`}>
      <div ref={galleryStartRef} className="site-catalog-selection scroll-mt-24">
        {product !== "display" && (
          <div className="site-topic-tabs site-topic-tabs-lg" role="tablist" aria-label="템플릿 종류 선택"
            onKeyDown={event => navigateTabs(event, KIND_TABS.findIndex(item => item.key === kind), KIND_TABS.length, index => selectKind(KIND_TABS[index].key))}>
            {KIND_TABS.map(({ key, label }) => (
              <button key={key} role="tab" type="button" className="site-topic-tab"
                id={`${tabsId}-${key}`} aria-controls={`${tabsId}-kind-panel`}
                aria-selected={kind === key} tabIndex={kind === key ? 0 : -1}
                onClick={() => selectKind(key)}>{label}</button>
            ))}
          </div>
        )}
        <div role={product !== "display" ? "tabpanel" : undefined}
          id={`${tabsId}-kind-panel`} aria-labelledby={product !== "display" ? `${tabsId}-${kind}` : undefined}>
          <section className="site-catalog-plan" aria-label="템플릿 이용 안내">
            <p className="type-body site-catalog-kind-description">
              {product === "display" ? "매장 모니터에 어울리는 디자인을 미리 확인하세요. 신규 신청은 준비 중입니다." : selectedKind.description}
            </p>
            <div className="site-catalog-price" aria-live="polite" aria-atomic="true">
              <p className="type-caption text-zinc-600">{productTitle}</p>
              <p className="type-content-title mt-1">
                {pricing ? <>얼리버드 월 {money(pricing.earlyBirdMonthly)} <span className="site-catalog-regular-price">· 정상가 {money(pricing.regularMonthly)}</span></> : "신청 준비 중"}
              </p>
              {pricing && <p className="type-caption site-catalog-access mt-2"><Check size={16} aria-hidden="true" />
                메뉴판 1개당 월 구독 · {kind === "standard" ? "기본 디자인끼리 교체 가능" : "기본·디자인 템플릿 교체 가능"}
              </p>}
            </div>
          </section>
          <div className="site-catalog-layout" data-with-filters={product !== "display"}>
            {product !== "display" && (
              <aside className="site-catalog-filters" aria-label={`템플릿 ${filterHeading} 필터`}>
                <div className="site-category-desktop">
                  <h2 className="type-item-title mb-3">{filterHeading}</h2>
                  <div className="site-category-list" role="group" aria-label={`${filterHeading} 선택`}>{filterButtons(false)}</div>
                </div>
                <div className="site-category-tablet">
                  <label className="type-label" htmlFor={`${tabsId}-filter`}>{filterHeading}</label>
                  {kind === "standard" ? (
                    <CatalogLayoutSelect id={`${tabsId}-filter`} label="화면 구성" value={normalizeCatalogLayoutFilter(filter)}
                      onValueChange={selectFilter} allLabel="전체" />
                  ) : <select className="site-category-select" id={`${tabsId}-filter`} value={filter} onChange={event => selectFilter(event.target.value)}>
                    {filters.map(item => <option key={item.key} value={item.key}>{item.label}</option>)}
                  </select>}
                </div>
                <div className="site-category-mobile">
                  <h2 className="type-item-title mb-3">{filterHeading}</h2>
                  <div className="site-catalog-mobile-choices" role="group" aria-label={`모바일 ${filterHeading} 선택`}>{filterButtons(true)}</div>
                </div>
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
      </div>
    </div>
  </>;
}
