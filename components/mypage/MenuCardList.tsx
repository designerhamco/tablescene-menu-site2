"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Popover, PopoverContent, PopoverTrigger } from "@/app/components/ui/popover";
import { SearchField } from "@/app/components/ui/search-field";
import { Search, SlidersHorizontal } from "@/app/components/ui/site-icon";
import { SitePagination } from "@/app/components/ui/site-pagination";
import { EMPTY_MENU_CARD_FILTERS, getMenuCardPage, type MenuCardFilters } from "@/lib/menu-card-pagination";
import { MENU_CARD_VISIBILITY_LABELS, type MenuCardVisibility } from "@/lib/menu-card-visibility";
import { SERVICE_CATEGORY_LABELS, type ServiceCategory } from "@/lib/service-categories";

type MenuCard = {
  key: string;
  title: string;
  serviceCategory: ServiceCategory | null;
  visibility: MenuCardVisibility | null;
  content: ReactNode;
};

/** The server determines permissions and facets for each card. */
export default function MenuCardList({ tabs, cards, allowVisibilityFilter, emptyState, description, notices }: {
  tabs: ReactNode;
  cards: MenuCard[];
  allowVisibilityFilter: boolean;
  emptyState: ReactNode;
  description?: ReactNode;
  notices?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_MENU_CARD_FILTERS);
  const [requestedPage, setRequestedPage] = useState(1);
  const resultsRef = useRef<HTMLElement>(null);
  const pageMovePending = useRef(false);
  const filterCount = Number(Boolean(filters.serviceCategory)) + Number(Boolean(filters.visibility));
  const hasConditions = Boolean(query.trim()) || filterCount > 0;
  const result = getMenuCardPage(cards, query, requestedPage, filters);

  function changeQuery(value: string) {
    setQuery(value);
    setRequestedPage(1);
  }

  function changeFilters(nextFilters: MenuCardFilters) {
    setFilters(nextFilters);
    setRequestedPage(1);
  }

  function selectPage(page: number) {
    pageMovePending.current = true;
    setRequestedPage(page);
  }

  useEffect(() => {
    if (!pageMovePending.current) return;
    pageMovePending.current = false;
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [result.page]);

  return <div className="site-stack-group">
    <div className="site-menu-list-toolbar">
      {tabs}
      <div className="site-form-row site-menu-list-search" data-alignment="center">
        <SearchField label="메뉴판 이름 검색" placeholder="메뉴판 이름 검색" value={query} onValueChange={changeQuery} />
        <Popover>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" aria-label={filterCount ? `필터, 활성 조건 ${filterCount}개` : "필터"}>
              <SlidersHorizontal aria-hidden="true" />필터{filterCount ? ` ${filterCount}` : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" collisionPadding={16} className="site-multiselect-content site-stack-block" aria-label="메뉴판 필터">
            <label className="site-field-stack type-label">
              서비스 유형
              <select className="site-field w-full" value={filters.serviceCategory} onChange={event => changeFilters({ ...filters, serviceCategory: event.target.value as MenuCardFilters["serviceCategory"] })}>
                <option value="">전체</option>
                {Object.entries(SERVICE_CATEGORY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            {allowVisibilityFilter ? <label className="site-field-stack type-label">
              공개 상태
              <select className="site-field w-full" value={filters.visibility} onChange={event => changeFilters({ ...filters, visibility: event.target.value as MenuCardFilters["visibility"] })}>
                <option value="">전체</option>
                {Object.entries(MENU_CARD_VISIBILITY_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label> : null}
            <div className="site-action-row">
              <Button type="button" variant="outline" disabled={!filterCount} onClick={() => changeFilters(EMPTY_MENU_CARD_FILTERS)}>필터 초기화</Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
    {notices}
    {description ? <p className="type-body-sm site-copy-muted">{description}</p> : null}
    <section ref={resultsRef} tabIndex={-1} className="site-stack-block site-menu-results" aria-label="메뉴판 목록">
      <p className={hasConditions ? "type-caption site-copy-muted" : "sr-only"} role="status" aria-live="polite" aria-atomic="true">
        {hasConditions ? `검색 결과 ${result.totalResults.toLocaleString("ko-KR")}개` : null}
        {result.totalPages > 1 ? <span className="sr-only">{hasConditions ? " · " : ""}{result.page}/{result.totalPages}페이지</span> : null}
      </p>
      {result.cards.length ? <div className="site-menu-card-list">{result.cards.map(card => <div key={card.key}>{card.content}</div>)}</div>
        : hasConditions ? <EmptyState headingLevel={2} icon={<Search />} title="조건에 맞는 메뉴판이 없습니다" description="검색어 또는 필터 조건을 확인해 주세요."
          action={<div className="site-action-row">
            {query.trim() ? <Button type="button" variant="outline" onClick={() => changeQuery("")}>검색어 지우기</Button> : null}
            {filterCount ? <Button type="button" variant="outline" onClick={() => changeFilters(EMPTY_MENU_CARD_FILTERS)}>필터 초기화</Button> : null}
          </div>} />
          : emptyState}
      <SitePagination currentPage={result.page} totalPages={result.totalPages} onSelect={selectPage} label="메뉴판 목록 페이지" />
    </section>
  </div>;
}
