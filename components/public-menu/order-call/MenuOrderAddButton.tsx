"use client";

import { Plus } from "lucide-react";
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
      className={`inline-flex min-h-8 shrink-0 items-center gap-1 rounded-full bg-emerald-700 px-3 py-1.5 text-[11px] font-black leading-none text-white shadow-sm transition-colors hover:bg-emerald-800 md:hidden ${className}`}
      aria-label={`${itemName} 담기`}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        actions.openItem(itemId);
      }}
    >
      <Plus className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
      담기
    </button>
  );
}
