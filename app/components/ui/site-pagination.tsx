"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import { getSitePageItems } from "@/lib/site-pagination";

export function SitePagination({ currentPage, totalPages, onSelect, label = "목록 페이지", showSingle = false }: {
  currentPage: number;
  totalPages: number;
  onSelect: (page: number) => void;
  label?: string;
  showSingle?: boolean;
}) {
  if (totalPages < 1 || (totalPages === 1 && !showSingle)) return null;
  const page = Math.min(totalPages, Math.max(1, currentPage));
  return <nav className="site-pagination" aria-label={label}>
    {([3, 7] as const).map(count => <div key={count} className={`site-pagination-set site-pagination-${count === 3 ? "mobile" : "desktop"}`}>
      <button className="site-pagination-control" type="button" disabled={page === 1} aria-label="첫 페이지" onClick={()=>onSelect(1)}><ChevronsLeft size={20} strokeWidth={2.25} aria-hidden="true" /></button>
      <button className="site-pagination-control" type="button" disabled={page === 1} aria-label="이전 페이지" onClick={()=>onSelect(page - 1)}><ChevronLeft size={20} strokeWidth={2.25} aria-hidden="true" /></button>
      {getSitePageItems(page, totalPages, count).map(item => <button className="site-pagination-control" key={item} type="button" aria-current={page === item ? "page" : undefined} aria-label={`${item}페이지`} onClick={()=>onSelect(item)}>{item}</button>)}
      <button className="site-pagination-control" type="button" disabled={page === totalPages} aria-label="다음 페이지" onClick={()=>onSelect(page + 1)}><ChevronRight size={20} strokeWidth={2.25} aria-hidden="true" /></button>
      <button className="site-pagination-control" type="button" disabled={page === totalPages} aria-label="마지막 페이지" onClick={()=>onSelect(totalPages)}><ChevronsRight size={20} strokeWidth={2.25} aria-hidden="true" /></button>
    </div>)}
  </nav>;
}
