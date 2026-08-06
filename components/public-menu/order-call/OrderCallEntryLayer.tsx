"use client";

import { Bell, ShoppingBag } from "lucide-react";
import type { ReactNode } from "react";

import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { SupportedLocale } from "@/lib/locales";

import type { OrderCallEntryConfig } from "./types";
import { getOrderCallEntryVisibility, LOCKED_ORDER_CALL_ENTRY_CONFIG } from "./types";

type OrderCallEntryLayerProps = {
  config?: OrderCallEntryConfig;
  currentLocale: SupportedLocale;
  enabledLocales: SupportedLocale[];
  children: ReactNode;
};

export default function OrderCallEntryLayer({
  config = LOCKED_ORDER_CALL_ENTRY_CONFIG,
  currentLocale,
  enabledLocales,
  children,
}: OrderCallEntryLayerProps) {
  const visibility = getOrderCallEntryVisibility(config);

  if (!visibility.showHeader) {
    return <>{children}</>;
  }

  const cartCount = Math.max(0, Math.floor(config.cartCount ?? 0));
  const showLanguage = visibility.showLanguage && new Set(enabledLocales).size > 1;

  return (
    <div data-public-menu-entry-layer="" data-order-call-mode={config.mode}>
      <header
        className="sticky top-0 z-[900] grid min-h-14 grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 border-b border-zinc-200/80 bg-white/95 px-3 pb-2 pt-[max(8px,env(safe-area-inset-top))] text-zinc-950 shadow-sm backdrop-blur md:hidden"
        data-public-menu-mobile-header=""
      >
        <div className="flex min-w-0 items-center justify-start" data-public-menu-header-language="">
          {showLanguage ? (
            <MenuLanguageSwitcher currentLocale={currentLocale} enabledLocales={enabledLocales} compact />
          ) : null}
        </div>

        <div className="min-w-0 text-center" data-public-menu-header-context="">
          {config.storeName ? <p className="truncate text-[13px] font-black leading-tight">{config.storeName}</p> : null}
          {visibility.showTableLabel ? <p className="mt-0.5 truncate text-[11px] font-bold leading-tight text-zinc-500">{config.tableLabel}</p> : null}
        </div>

        <div className="flex min-w-0 items-center justify-end gap-1.5" data-public-menu-header-actions="">
          {visibility.showCall ? (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-sm"
              aria-label="직원 호출"
              disabled
            >
              <Bell className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          ) : null}
          {visibility.showCart ? (
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-zinc-950 text-white shadow-sm"
              aria-label={`장바구니${cartCount > 0 ? ` ${cartCount}개` : ""}`}
              disabled
            >
              <ShoppingBag className="h-4.5 w-4.5" aria-hidden="true" />
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-black leading-none text-white" data-public-menu-cart-count="">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
      </header>
      {children}
    </div>
  );
}
