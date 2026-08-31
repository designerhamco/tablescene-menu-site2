"use client";

import { ChevronDown, Globe2 } from "lucide-react";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { LOCALE_LABELS, type SupportedLocale } from "@/lib/locales";

type MenuLanguageSwitcherProps = {
  currentLocale: SupportedLocale;
  enabledLocales: SupportedLocale[];
  compact?: boolean;
  menuPlacement?: "top" | "bottom";
  extraSearchParams?: Record<string, string | null | undefined>;
  triggerVariant?: "default" | "cafe" | "aube";
  menuAlign?: "left" | "right";
};

const SHORT_LOCALE_LABELS: Record<SupportedLocale, string> = {
  ko: "KR",
  en: "EN",
  zh: "CN",
  ja: "JP",
};

function CafeWireframeGlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <path d="M12 3c2.5 2.5 4 5.5 4 9s-1.5 6.5-4 9" />
      <path d="M12 3c-2.5 2.5-4 5.5-4 9s1.5 6.5 4 9" />
      <path d="M5.5 6.5C7.4 7.5 9.7 8 12 8s4.6-.5 6.5-1.5" />
      <path d="M5.5 17.5C7.4 16.5 9.7 16 12 16s4.6.5 6.5 1.5" />
    </svg>
  );
}

export default function MenuLanguageSwitcher({
  currentLocale,
  enabledLocales,
  compact = false,
  menuPlacement = "bottom",
  extraSearchParams,
  triggerVariant = "default",
  menuAlign = "right",
}: MenuLanguageSwitcherProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const visibleLocales = enabledLocales.filter((locale, index) => enabledLocales.indexOf(locale) === index);
  const menuPlacementClassName = menuPlacement === "top" ? "bottom-12" : "top-12";
  const menuAlignClassName = menuAlign === "left" ? "left-0" : "right-0";

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

  const triggerClassName =
    triggerVariant === "cafe"
      ? `inline-flex cursor-pointer list-none items-center justify-center border border-transparent bg-transparent text-[#191c1b] shadow-none transition-colors hover:bg-black/[0.04] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 [&::-webkit-details-marker]:hidden ${
          compact ? "h-9 gap-1.5 rounded-md px-1.5 text-[13px] font-medium" : "h-10 gap-2 rounded-md px-2.5 text-xs font-bold"
        }`
      : triggerVariant === "aube"
        ? "inline-flex h-10 min-w-10 cursor-pointer items-center justify-start gap-1 border-0 bg-transparent px-0 text-[13px] font-medium tracking-[0.1em] text-zinc-900 shadow-none transition-colors hover:text-[#c5a165] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#c5a165]"
        : `flex cursor-pointer list-none items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-700 shadow-sm transition hover:bg-zinc-50 [&::-webkit-details-marker]:hidden ${
            compact ? "h-10 w-10" : "h-10 gap-2 px-3 text-xs font-black"
          }`;
  const iconClassName = triggerVariant === "cafe" ? "h-[18px] w-[18px]" : "h-5 w-5";
  const chevronClassName = `h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`;

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
        className={triggerClassName}
        aria-label="언어 변경"
        aria-haspopup="menu"
        aria-expanded={isOpen}
        title="언어 변경"
        onClick={() => setIsOpen((current) => !current)}
      >
        {triggerVariant === "cafe" ? (
          <CafeWireframeGlobeIcon className={iconClassName} />
        ) : triggerVariant === "default" ? (
          <Globe2 className={iconClassName} strokeWidth={2} aria-hidden="true" />
        ) : null}
        {triggerVariant === "cafe" ? (
          <>
            <span className="leading-none">{SHORT_LOCALE_LABELS[currentLocale]}</span>
            <ChevronDown className={chevronClassName} strokeWidth={1.8} aria-hidden="true" />
          </>
        ) : triggerVariant === "aube" ? (
          <>
            <span className="leading-none">{SHORT_LOCALE_LABELS[currentLocale]}</span>
            <ChevronDown className={chevronClassName} strokeWidth={1.6} aria-hidden="true" />
          </>
        ) : (
          !compact && <span>{LOCALE_LABELS[currentLocale]}</span>
        )}
      </button>
      {isOpen && (
        <div
          role="menu"
          className={`absolute z-30 overflow-hidden border border-zinc-200 bg-white py-1 text-left ${menuPlacementClassName} ${menuAlignClassName} ${
            triggerVariant === "aube" ? "min-w-20 rounded-md shadow-none" : "min-w-36 rounded-lg shadow-xl"
          }`}
        >
          {visibleLocales.map((locale) => (
            <a
              key={locale}
              href={getLocaleHref(locale)}
              role="menuitem"
              aria-current={locale === currentLocale ? "true" : undefined}
              className={`block px-3 py-2 transition hover:bg-zinc-50 ${
                triggerVariant === "aube" ? "text-[13px] font-medium tracking-[0.1em]" : "text-sm font-bold"
              } ${
                locale === currentLocale ? "text-zinc-950" : "text-zinc-500"
              }`}
            >
              {triggerVariant === "aube" ? SHORT_LOCALE_LABELS[locale] : LOCALE_LABELS[locale]}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
