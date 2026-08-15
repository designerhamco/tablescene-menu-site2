"use client";

import { Plus, ShoppingBasket } from "lucide-react";
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
      className={`relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-zinc-300 bg-white/90 text-zinc-800 shadow-sm transition-colors hover:border-zinc-500 hover:bg-zinc-50 md:hidden ${className}`}
      aria-label={`${itemName} 담기`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        actions.openItem(itemId);
      }}
    >
      <ShoppingBasket className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
      <span className="absolute -right-0.5 -top-0.5 flex h-3.5 w-3.5 items-center justify-center rounded-full border border-white bg-zinc-900 text-white">
        <Plus className="h-2.5 w-2.5" strokeWidth={3} aria-hidden="true" />
      </span>
    </button>
  );
}
