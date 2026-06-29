"use client";

import { Globe2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";

import { LOCALE_LABELS, type SupportedLocale } from "@/lib/locales";

type MenuLanguageSwitcherProps = {
  currentLocale: SupportedLocale;
  enabledLocales: SupportedLocale[];
  compact?: boolean;
  menuPlacement?: "top" | "bottom";
};

export default function MenuLanguageSwitcher({ currentLocale, enabledLocales, compact = false, menuPlacement = "bottom" }: MenuLanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const visibleLocales = enabledLocales.filter((locale, index) => enabledLocales.indexOf(locale) === index);
  const menuPlacementClassName = menuPlacement === "top" ? "bottom-12" : "top-12";

  if (visibleLocales.length <= 1) return null;

  const getLocaleHref = (locale: SupportedLocale) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", locale);

    return `${pathname}?${params.toString()}`;
  };

  return (
    <details className="group relative">
      <summary
        className={`flex cursor-pointer list-none items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 [&::-webkit-details-marker]:hidden ${
          compact ? "h-10 w-10" : "h-10 gap-2 px-3 text-xs font-black"
        }`}
        aria-label="언어 변경"
      >
        <Globe2 className="h-5 w-5" aria-hidden="true" />
        {!compact && <span>{LOCALE_LABELS[currentLocale]}</span>}
      </summary>
      <div className={`absolute right-0 z-30 min-w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-left shadow-xl ${menuPlacementClassName}`}>
        {visibleLocales.map((locale) => (
          <a
            key={locale}
            href={getLocaleHref(locale)}
            className={`block px-3 py-2 text-sm font-bold transition hover:bg-zinc-50 ${
              locale === currentLocale ? "text-zinc-950" : "text-zinc-500"
            }`}
          >
            {LOCALE_LABELS[locale]}
          </a>
        ))}
      </div>
    </details>
  );
}
