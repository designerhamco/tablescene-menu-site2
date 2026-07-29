"use client";

import { useCallback, useState } from "react";

import CafeDesignA from "@/components/menu-templates/CafeDesignA";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";

import MultiPageControls from "./MultiPageControls";
import type { MultiPageMenuPage } from "./types";

type MultiPagePresentationPage = {
  page: MultiPageMenuPage;
  data: PublicMenuTemplateProps;
};

type MultiPageDesktopPresentationProps = {
  pages: MultiPagePresentationPage[];
};

export default function MultiPageDesktopPresentation({
  pages,
}: MultiPageDesktopPresentationProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const safePageIndex = Math.min(Math.max(currentPageIndex, 0), Math.max(0, pages.length - 1));
  const currentPage = pages[safePageIndex];
  const goPrevious = useCallback(() => {
    setCurrentPageIndex((pageIndex) => Math.max(0, pageIndex - 1));
  }, []);
  const goNext = useCallback(() => {
    setCurrentPageIndex((pageIndex) => Math.min(pages.length - 1, pageIndex + 1));
  }, [pages.length]);

  if (!currentPage) return null;

  return (
    <div
      className="group/multi-page relative min-h-screen overflow-hidden"
      data-multi-page-engine=""
      data-multi-page-presentation="desktop"
      data-multi-page-current={safePageIndex + 1}
      data-multi-page-total={pages.length}
    >
      <CafeDesignA {...currentPage.data} pagePresentation="one" />
      <MultiPageControls
        currentPage={safePageIndex}
        totalPages={pages.length}
        onPrevious={goPrevious}
        onNext={goNext}
      />
    </div>
  );
}
