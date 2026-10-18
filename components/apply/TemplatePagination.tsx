"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { getTemplatePageWindow } from "@/lib/template-pagination";

export default function TemplatePagination({ currentPage, totalPages, onSelect }: {
  currentPage: number;
  totalPages: number;
  onSelect: (page: number) => void;
}) {
  if (totalPages < 1) return null;
  const desktopPages = getTemplatePageWindow(currentPage, totalPages, 7);
  const mobilePages = getTemplatePageWindow(currentPage, totalPages, 3);
  const pages = [...new Set([...desktopPages, ...mobilePages])].sort((a, b) => a - b);
  const first = currentPage === 1;
  const last = currentPage === totalPages;

  return (
    <nav className="site-pagination" aria-label="템플릿 페이지">
      <button type="button" onClick={() => onSelect(1)} disabled={first} aria-label="첫 템플릿 페이지"><ChevronsLeft aria-hidden="true" /></button>
      <button type="button" onClick={() => onSelect(currentPage - 1)} disabled={first} aria-label="이전 템플릿 페이지"><ChevronLeft aria-hidden="true" /></button>
      {pages.map(page => (
        <button
          key={page}
          type="button"
          className="site-pagination-number"
          data-mobile-visible={mobilePages.includes(page)}
          data-desktop-visible={desktopPages.includes(page)}
          onClick={() => onSelect(page)}
          aria-current={currentPage === page ? "page" : undefined}
          aria-label={`${page}페이지`}
        >{page}</button>
      ))}
      <button type="button" onClick={() => onSelect(currentPage + 1)} disabled={last} aria-label="다음 템플릿 페이지"><ChevronRight aria-hidden="true" /></button>
      <button type="button" onClick={() => onSelect(totalPages)} disabled={last} aria-label="마지막 템플릿 페이지"><ChevronsRight aria-hidden="true" /></button>
    </nav>
  );
}
