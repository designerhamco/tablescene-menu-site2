"use client";

import { Globe2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LOCALE_LABELS, type SupportedLocale } from "@/lib/locales";

type MenuLanguageSwitcherProps = {
  currentLocale: SupportedLocale;
  enabledLocales: SupportedLocale[];
  compact?: boolean;
  menuPlacement?: "top" | "bottom";
  extraSearchParams?: Record<string, string | null | undefined>;
};

export default function MenuLanguageSwitcher({
  currentLocale,
  enabledLocales,
  compact = false,
  menuPlacement = "bottom",
  extraSearchParams,
}: MenuLanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const visibleLocales = enabledLocales.filter((locale, index) => enabledLocales.indexOf(locale) === index);
  const menuPlacementClassName = menuPlacement === "top" ? "bottom-12" : "top-12";

  useEffect(() => {
    if (!isOpen) return;

    function handlePointerDown(event: PointerEvent) {
      const root = rootRef.current;
      if (!root || root.contains(event.target as Node)) return;
      setIsOpen(false);
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  if (visibleLocales.length <= 1) return null;

  const getLocaleHref = (locale: SupportedLocale) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("lang", locale);
    Object.entries(extraSearchParams ?? {}).forEach(([key, value]) => {
      if (value == null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    return `${pathname}?${params.toString()}`;
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className={`flex cursor-pointer list-none items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 [&::-webkit-details-marker]:hidden ${
          compact ? "h-10 w-10" : "h-10 gap-2 px-3 text-xs font-black"
        }`}
        aria-label="언어 변경"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="언어 변경"
        onClick={() => setIsOpen((current) => !current)}
      >
        <Globe2 className="h-5 w-5" aria-hidden="true" />
        {!compact && <span>{LOCALE_LABELS[currentLocale]}</span>}
      </button>
      {isOpen && (
        <div
          role="menu"
          className={`absolute right-0 z-30 min-w-36 overflow-hidden rounded-lg border border-zinc-200 bg-white py-1 text-left shadow-xl ${menuPlacementClassName}`}
        >
          {visibleLocales.map((locale) => (
            <a
              key={locale}
              href={getLocaleHref(locale)}
              role="menuitem"
              aria-current={locale === currentLocale ? "true" : undefined}
              className={`block px-3 py-2 text-sm font-bold transition hover:bg-zinc-50 ${
                locale === currentLocale ? "text-zinc-950" : "text-zinc-500"
              }`}
            >
              {LOCALE_LABELS[locale]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
