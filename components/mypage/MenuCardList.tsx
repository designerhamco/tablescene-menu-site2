"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { SearchField } from "@/app/components/ui/search-field";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Search } from "@/app/components/ui/site-icon";
import { getMenuCardPage } from "@/lib/menu-card-pagination";
import { SitePagination } from "@/app/components/ui/site-pagination";

type MenuCard = { key: string; title: string; content: ReactNode };

/** Server-rendered cards retain their permission gates; this component only filters visible names. */
export default function MenuCardList({ tabs, cards, emptyState, description, notices }: {
  tabs: ReactNode;
  cards: MenuCard[];
  emptyState: ReactNode;
  description?: ReactNode;
  notices?: ReactNode;
}) {
  const [query, setQuery] = useState("");
  const [requestedPage, setRequestedPage] = useState(1);
  const resultsRef = useRef<HTMLParagraphElement>(null);
  const pageMovePending = useRef(false);
  const result = getMenuCardPage(cards, query, requestedPage);
  const changeQuery = (value: string) => { setQuery(value); setRequestedPage(1); };
  const selectPage = (page: number) => {
    pageMovePending.current = true;
    setRequestedPage(page);
  };
  useEffect(() => {
    if (!pageMovePending.current) return;
    pageMovePending.current = false;
    resultsRef.current?.focus({ preventScroll: true });
    resultsRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
  }, [result.page]);

  return <div className="site-stack-group">
    <div className="site-menu-list-toolbar">
      {tabs}
      <div className="site-menu-list-search">
        <SearchField label="메뉴판 이름 검색" placeholder="메뉴판 이름 검색" value={query} onValueChange={changeQuery} />
      </div>
    </div>
    {notices}
    {description ? <p className="type-body-sm site-copy-muted">{description}</p> : null}
    <section className="site-stack-block site-menu-results" aria-label="메뉴판 목록">
      <p ref={resultsRef} tabIndex={-1} className="type-caption site-copy-muted site-menu-result-count" role="status" aria-live="polite" aria-atomic="true">
        {query.trim() ? `검색 결과 ${result.totalResults.toLocaleString("ko-KR")}개 · 전체 ${cards.length.toLocaleString("ko-KR")}개` : `전체 ${cards.length.toLocaleString("ko-KR")}개`}
        {result.totalPages > 1 ? <span className="sr-only"> · {result.page}/{result.totalPages}페이지</span> : null}
      </p>
      {result.cards.length ? <div className="site-menu-card-list">{result.cards.map(card => <div key={card.key}>{card.content}</div>)}</div>
        : query.trim() ? <EmptyState headingLevel={2} icon={<Search />} title="검색한 메뉴판이 없습니다" description="메뉴판 이름을 확인하거나 검색어를 지워 주세요."
          action={<button type="button" className="site-button site-button-outline" onClick={() => changeQuery("")}>검색어 지우기</button>} />
          : emptyState}
      <SitePagination currentPage={result.page} totalPages={result.totalPages} onSelect={selectPage} label="메뉴판 목록 페이지" />
    </section>
  </div>;
}
