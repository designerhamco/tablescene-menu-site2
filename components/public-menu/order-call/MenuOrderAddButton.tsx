"use client";

import { ShoppingCart } from "lucide-react";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { PostpayOrderCatalogItem } from "./types";

type MenuOrderActions = {
  orderableItemIds: ReadonlySet<string>;
  openItem: (itemId: string) => void;
};

const MenuOrderActionsContext = createContext<MenuOrderActions | null>(null);

export function MenuOrderActionsProvider({
  catalog,
  onOpenItem,
  children,
}: {
  catalog: PostpayOrderCatalogItem[];
  onOpenItem: (itemId: string) => void;
  children: ReactNode;
}) {
  const value = useMemo<MenuOrderActions>(() => ({
    orderableItemIds: new Set(catalog.map((item) => item.id)),
    openItem: onOpenItem,
  }), [catalog, onOpenItem]);

  return <MenuOrderActionsContext.Provider value={value}>{children}</MenuOrderActionsContext.Provider>;
}

export default function MenuOrderAddButton({
  itemId,
  itemName,
  className = "",
}: {
  itemId: string;
  itemName: string;
  className?: string;
}) {
  const actions = useContext(MenuOrderActionsContext);
  if (!actions?.orderableItemIds.has(itemId)) return null;

  return (
    <button
      type="button"
      className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center border-0 bg-transparent p-0 text-inherit shadow-none transition-opacity hover:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 ${className}`}
      data-menu-order-add={itemId}
      aria-label={`${itemName} 담기`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        actions.openItem(itemId);
      }}
    >
      <ShoppingCart className="h-5 w-5" strokeWidth={1.8} aria-hidden="true" />
    </button>
  );
}
