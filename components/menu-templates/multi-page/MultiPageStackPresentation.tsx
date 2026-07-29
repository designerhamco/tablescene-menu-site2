"use client";

import CafeDesignA from "@/components/menu-templates/CafeDesignA";
import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";

import type { MultiPageMenuPage } from "./types";

type MultiPagePresentationPage = {
  page: MultiPageMenuPage;
  data: PublicMenuTemplateProps;
};

type MultiPageStackPresentationProps = {
  pages: MultiPagePresentationPage[];
};

function getPageLabel(page: MultiPageMenuPage, index: number) {
  const title = page.title?.trim();
  return title || `메뉴 페이지 ${index + 1}`;
}

export default function MultiPageStackPresentation({
  pages,
}: MultiPageStackPresentationProps) {
  return (
    <div
      className="min-h-screen bg-white"
      data-multi-page-engine=""
      data-multi-page-presentation="stack"
      data-multi-page-total={pages.length}
    >
      {pages.map(({ page, data }, pageIndex) => (
        <section
          key={page.id}
          aria-label={getPageLabel(page, pageIndex)}
          className={pageIndex > 0 ? "border-t border-[#191c1b]/18" : undefined}
          data-multi-page-stack-section=""
          data-multi-page-index={pageIndex + 1}
        >
          <CafeDesignA {...data} pagePresentation="one" />
        </section>
      ))}
    </div>
  );
}
