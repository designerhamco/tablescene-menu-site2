"use client";

import { useEffect, useId, useState } from "react";
import { Search } from "lucide-react";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PAGE_SIZE, formatAnnouncementDate, type AnnouncementSummary } from "@/lib/announcements";
import { BoardList } from "@/app/components/ui/board-list";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { SitePagination } from "@/app/components/ui/site-pagination";

type AnnouncementResult = { items: AnnouncementSummary[]; count: number; unavailable: boolean };

export default function AnnouncementBoard() {
  const uid = useId();
  const [query, setQuery] = useState("");
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [page, setPage] = useState(1);
  const [retry, setRetry] = useState(0);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<AnnouncementResult>({ items: [], count: 0, unavailable: false });

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    const timer = window.setTimeout(async () => {
      try {
        const params = new URLSearchParams({ q: submittedQuery, category, page: String(page) });
        const response = await fetch(`/api/support/announcements?${params}`, { signal: controller.signal });
        if (!response.ok) throw new Error("unavailable");
        const data = await response.json() as AnnouncementResult;
        if (active) setResult(data);
      } catch {
        if (active) setResult({ items: [], count: 0, unavailable: true });
      } finally {
        if (active) setLoading(false);
      }
    }, 0);
    return () => { active = false; controller.abort(); window.clearTimeout(timer); };
  }, [submittedQuery, category, page, retry]);

  const status = loading ? <p role="status">공지사항을 불러오는 중입니다.</p>
    : result.unavailable ? <div role="status"><p>공지사항을 불러오지 못했습니다.</p><Button variant="outline" onClick={() => { setLoading(true); setRetry(value => value + 1); }}>다시 시도</Button></div>
    : result.items.length === 0 ? <p role="status">{submittedQuery || category !== "all" ? "조건에 맞는 공지사항이 없습니다." : "등록된 공지사항이 없습니다."}</p> : undefined;

  return <section aria-label="공지사항 게시판" aria-busy={loading}>
    <div className="site-board-toolbar">
      <p className="type-body-sm text-zinc-600" role="status">{loading ? "목록 확인 중" : result.unavailable ? "목록 확인 불가" : `${submittedQuery ? "검색 결과" : "전체"} ${result.count}개`}</p>
      <form className="site-board-search" role="search" aria-label="공지사항 검색" onSubmit={event => { event.preventDefault(); setLoading(true); setPage(1); setSubmittedQuery(query.trim()); setRetry(value => value + 1); }}>
        <label className="sr-only" htmlFor={`${uid}-category`}>공지 유형</label>
        <select className="site-field" data-field-size="sm" id={`${uid}-category`} value={category} onChange={event => { setLoading(true); setCategory(event.target.value); setPage(1); }}>
          <option value="all">전체 공지</option>
          {ANNOUNCEMENT_CATEGORIES.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
        </select>
        <label className="sr-only" htmlFor={`${uid}-query`}>공지 제목과 내용 검색</label>
        <Input id={`${uid}-query`} type="search" fieldSize="sm" placeholder="제목과 내용 검색" enterKeyHint="search" value={query} onChange={event => setQuery(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && event.nativeEvent.isComposing) event.preventDefault(); }} />
        <Button type="submit" size="icon" aria-label="공지사항 검색"><Search size={18} aria-hidden="true" /></Button>
      </form>
    </div>
    <BoardList label="공지사항 목록" entries={result.items.map((item, index) => ({ id: item.id, number: item.pinned ? "공지" : result.count - (page - 1) * ANNOUNCEMENT_PAGE_SIZE - index, title: item.title, href: `/faq/notices/${item.id}`, date: formatAnnouncementDate(item.published_at), dateTime: item.published_at ?? undefined }))} status={status} />
    {!loading && !result.unavailable ? <SitePagination showSingle currentPage={page} totalPages={Math.ceil(result.count / ANNOUNCEMENT_PAGE_SIZE)} onSelect={value => { setLoading(true); setPage(value); }} /> : null}
  </section>;
}
