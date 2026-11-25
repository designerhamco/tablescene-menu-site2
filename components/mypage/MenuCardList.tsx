"use client";

import { useState, type ReactNode } from "react";
import { SearchField } from "@/app/components/ui/search-field";
import { EmptyState } from "@/app/components/ui/empty-state";
import { Search } from "@/app/components/ui/site-icon";
import { matchesMenuName } from "@/lib/menu-name-search";

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
  const filtered = cards.filter(card => matchesMenuName(card.title, query));

  return <div className="site-stack-group">
    <div className="site-menu-list-toolbar">
      {tabs}
      <div className="site-menu-list-search">
        <SearchField label="메뉴판 이름 검색" placeholder="메뉴판 이름 검색" value={query} onValueChange={setQuery} />
      </div>
    </div>
    {notices}
    {description ? <p className="type-body-sm site-copy-muted">{description}</p> : null}
    <section className="site-stack-block" aria-label="메뉴판 목록">
      <p className="type-caption site-copy-muted" role="status" aria-live="polite" aria-atomic="true">
        {query.trim() ? `검색 결과 ${filtered.length.toLocaleString("ko-KR")}개 · 전체 ${cards.length.toLocaleString("ko-KR")}개` : `전체 ${cards.length.toLocaleString("ko-KR")}개`}
      </p>
      {filtered.length ? <div className="site-menu-card-list">{filtered.map(card => <div key={card.key}>{card.content}</div>)}</div>
        : query.trim() ? <EmptyState headingLevel={3} icon={<Search />} title="검색한 메뉴판이 없습니다" description="메뉴판 이름을 확인하거나 검색어를 지워 주세요."
          action={<button type="button" className="site-button site-button-outline" onClick={() => setQuery("")}>검색어 지우기</button>} />
          : emptyState}
    </section>
  </div>;
}
