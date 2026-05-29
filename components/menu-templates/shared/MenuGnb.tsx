/* eslint-disable @next/next/no-img-element */
import { Menu } from "lucide-react";

import type { PublicMenuTemplateProps } from "@/components/menu-templates/types";
import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";

type MenuGnbProps = {
  site: PublicMenuTemplateProps["menuSite"];
  currentLocale: PublicMenuTemplateProps["locale"];
  enabledLocales: PublicMenuTemplateProps["enabledLocales"];
};

function getBrandName(site: PublicMenuTemplateProps["menuSite"]) {
  return site.restaurant_name || site.name || "MenuLink";
}

export default function MenuGnb({ site, currentLocale, enabledLocales }: MenuGnbProps) {
  const brandName = getBrandName(site);

  return (
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/95 px-5 py-3 backdrop-blur">
      <div className="mx-auto flex h-10 w-full max-w-3xl items-center justify-between gap-4">
        <a href="#intro" className="flex min-w-0 shrink-0 items-center max-w-[120px] sm:max-w-40 md:max-w-[180px]" aria-label={`${brandName} 홈으로 이동`}>
          {site.logo_url ? (
            <img src={site.logo_url} alt={`${brandName} logo`} className="h-auto max-h-8 w-auto max-w-[120px] object-contain sm:max-h-10 sm:max-w-40 md:max-h-12 md:max-w-[180px]" />
          ) : (
            <span className="truncate text-base font-black tracking-normal text-zinc-950 sm:text-lg">{brandName}</span>
          )}
        </a>
        <div className="flex shrink-0 items-center gap-1.5">
          <MenuLanguageSwitcher currentLocale={currentLocale} enabledLocales={enabledLocales} compact />
          <button
            type="button"
            aria-label="메뉴 열기"
            className="inline-flex h-10 w-10 items-center justify-center rounded-full text-zinc-700 transition-colors hover:bg-zinc-100"
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
