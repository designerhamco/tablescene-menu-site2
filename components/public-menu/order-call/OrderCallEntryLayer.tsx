"use client";

import { Bell, CreditCard, ShoppingBag } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";

import MenuLanguageSwitcher from "@/components/menu-templates/shared/MenuLanguageSwitcher";
import type { SupportedLocale } from "@/lib/locales";
import type { TemplateKey } from "@/lib/templates";

import type { OrderCallEntryConfig } from "./types";
import { getOrderCallEntryVisibility, hasPrepayCheckout, LOCKED_ORDER_CALL_ENTRY_CONFIG } from "./types";
import PostpayOrderCartDrawer from "./PostpayOrderCartDrawer";
import { MenuOrderActionsProvider } from "./MenuOrderAddButton";
import StaffCallDialog from "./StaffCallDialog";

type OrderCallEntryLayerProps = {
  templateKey: TemplateKey;
  config?: OrderCallEntryConfig;
  currentLocale: SupportedLocale;
  enabledLocales: SupportedLocale[];
  children: ReactNode;
};

export default function OrderCallEntryLayer({
  templateKey,
  config = LOCKED_ORDER_CALL_ENTRY_CONFIG,
  currentLocale,
  enabledLocales,
  children,
}: OrderCallEntryLayerProps) {
  const visibility = getOrderCallEntryVisibility(config);
  const [cartOpen, setCartOpen] = useState(false);
  const [callOpen, setCallOpen] = useState(false);
  const [selectedMenuItemId, setSelectedMenuItemId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState("");
  const [cartCount, setCartCount] = useState(() => Math.max(0, Math.floor(config.cartCount ?? 0)));
  const openMenuItem = useCallback((itemId: string) => {
    setSelectedMenuItemId(itemId);
    setCartOpen(true);
  }, []);
  const openCart = useCallback(() => {
    setSelectedMenuItemId(null);
    setCartOpen(true);
  }, []);
  const handleItemAdded = useCallback((itemName: string) => {
    setCartOpen(false);
    setSelectedMenuItemId(null);
    setToastMessage(`${itemName} 장바구니에 담았어요.`);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timeout = window.setTimeout(() => setToastMessage(""), 2400);
    return () => window.clearTimeout(timeout);
  }, [toastMessage]);

  if (!visibility.showHeader) {
    return <>{children}</>;
  }

  const showLanguage = visibility.showLanguage && new Set(enabledLocales).size > 1;
  const canOpenCart = config.mode === "active"
    && Boolean(config.menuSiteId && config.cartScope && config.orderCatalog);
  const canOpenCall = visibility.showCall
    && config.mode === "active"
    && Boolean(config.menuSiteId);
  const prepayEnabled = hasPrepayCheckout(config);
  const usesAubeCallPresentation = templateKey === "dining_aube_table_a";

  return (
    <MenuOrderActionsProvider catalog={config.orderCatalog ?? []} onOpenItem={openMenuItem}>
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
          {visibility.showCall && !usesAubeCallPresentation ? (
            <button
              type="button"
              className="flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-800 shadow-sm"
              aria-label="직원 호출"
              disabled={!canOpenCall}
              onClick={() => setCallOpen(true)}
            >
              <Bell className="h-4.5 w-4.5" aria-hidden="true" />
            </button>
          ) : null}
          {visibility.showCart ? (
            <button
              type="button"
              className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-300 bg-white text-zinc-800 shadow-sm"
              aria-label={`장바구니${cartCount > 0 ? ` ${cartCount}개` : ""}`}
              disabled={!canOpenCart}
              onClick={openCart}
            >
              <ShoppingBag className="h-4.5 w-4.5" aria-hidden="true" />
              {prepayEnabled ? (
                <span
                  className="absolute -bottom-1 -left-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-white bg-zinc-950 text-white"
                  data-public-menu-prepay-enabled=""
                  title="모바일 결제 가능"
                >
                  <CreditCard className="h-2.5 w-2.5" aria-hidden="true" />
                </span>
              ) : null}
              {cartCount > 0 ? (
                <span className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full bg-zinc-950 px-1 text-[10px] font-black leading-none text-white" data-public-menu-cart-count="">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              ) : null}
            </button>
          ) : null}
        </div>
        </header>
        {children}
        {canOpenCall && usesAubeCallPresentation ? (
          <button
            type="button"
            className="fixed bottom-[max(26px,env(safe-area-inset-bottom))] right-[max(24px,env(safe-area-inset-right))] z-[1100] flex h-15 w-15 items-center justify-center rounded-full bg-[#b58c4b] text-white shadow-[0_14px_34px_rgba(17,25,40,0.24)] transition-[transform,box-shadow] duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_18px_42px_rgba(17,25,40,0.3)] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#b58c4b] active:translate-y-0 sm:h-16 sm:w-16"
            aria-label="스마트호출 열기"
            data-smart-call-quick-button=""
            onClick={() => setCallOpen(true)}
          >
            <Bell className="h-5 w-5 sm:h-5.5 sm:w-5.5" strokeWidth={1.65} aria-hidden="true" />
          </button>
        ) : null}
        {canOpenCart ? (
          <PostpayOrderCartDrawer
          open={cartOpen}
          onClose={() => setCartOpen(false)}
          menuSiteId={config.menuSiteId!}
          cartScope={config.cartScope!}
          catalog={config.orderCatalog!}
          checkoutMode={config.checkoutMode ?? "postpay"}
          checkoutModes={config.checkoutModes}
          previewOnly={config.previewOnly ?? false}
          selectedMenuItemId={selectedMenuItemId}
          onCountChange={setCartCount}
          onItemAdded={handleItemAdded}
          />
        ) : null}
        {canOpenCall ? (
          <StaffCallDialog
          open={callOpen}
          onClose={() => setCallOpen(false)}
          menuSiteId={config.menuSiteId!}
          tableLabel={config.tableLabel}
          previewOnly={config.previewOnly ?? false}
          callItems={config.callItems}
          presentation={usesAubeCallPresentation ? "aube" : "default"}
          />
        ) : null}
        {toastMessage ? (
          <div
            className="fixed bottom-[max(20px,env(safe-area-inset-bottom))] left-1/2 z-[1300] flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-zinc-950 px-4 py-3 text-xs font-bold text-white shadow-xl md:hidden"
            role="status"
          >
            {toastMessage}
          </div>
        ) : null}
      </div>
    </MenuOrderActionsProvider>
  );
}
