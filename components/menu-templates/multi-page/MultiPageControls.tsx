"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type MultiPageControlsProps = {
  currentPage: number;
  totalPages: number;
  onPrevious: () => void;
  onNext: () => void;
};

export default function MultiPageControls({
  currentPage,
  totalPages,
  onPrevious,
  onNext,
}: MultiPageControlsProps) {
  const isFirstPage = currentPage <= 0;
  const isLastPage = currentPage >= totalPages - 1;

  if (totalPages <= 1) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-1/2 z-[70] hidden -translate-y-1/2 items-center justify-between px-[clamp(16px,2vw,32px)] opacity-0 transition-opacity duration-200 group-hover/multi-page:opacity-100 group-focus-within/multi-page:opacity-100 lg:flex"
      data-multi-page-controls=""
    >
      <button
        type="button"
        aria-label="이전 메뉴 페이지"
        className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-[#191c1b]/25 bg-white/78 text-sm font-black text-[#191c1b] shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191c1b] disabled:cursor-not-allowed disabled:opacity-25"
        disabled={isFirstPage}
        onClick={onPrevious}
      >
        <ChevronLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <div className="pointer-events-auto rounded-full border border-[#191c1b]/15 bg-white/72 px-3 py-1 text-[11px] font-bold tabular-nums text-[#191c1b]/70 shadow-sm backdrop-blur">
        {currentPage + 1} / {totalPages}
      </div>
      <button
        type="button"
        aria-label="다음 메뉴 페이지"
        className="pointer-events-auto grid h-9 w-9 place-items-center rounded-full border border-[#191c1b]/25 bg-white/78 text-sm font-black text-[#191c1b] shadow-sm backdrop-blur transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#191c1b] disabled:cursor-not-allowed disabled:opacity-25"
        disabled={isLastPage}
        onClick={onNext}
      >
        <ChevronRight aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
