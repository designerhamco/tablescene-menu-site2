"use client";

import { MenuOrderIcon, type MenuOrderIconVariant } from "./MenuActionIcons";
import { createContext, type ReactNode, useContext, useMemo } from "react";

import type { PostpayOrderCatalogItem } from "./types";

type MenuOrderActions = {
  iconVariant: MenuOrderIconVariant;
  orderableItemIds: ReadonlySet<string>;
  openItem: (itemId: string) => void;
};

const MenuOrderActionsContext = createContext<MenuOrderActions | null>(null);

export function MenuOrderActionsProvider({
  iconVariant = "cart",
  catalog,
  onOpenItem,
  children,
}: {
  iconVariant?: MenuOrderIconVariant;
  catalog: PostpayOrderCatalogItem[];
  onOpenItem: (itemId: string) => void;
  children: ReactNode;
}) {
  const value = useMemo<MenuOrderActions>(() => ({
    iconVariant,
    orderableItemIds: new Set(catalog.map((item) => item.id)),
    openItem: onOpenItem,
  }), [catalog, onOpenItem, iconVariant]);

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
      <MenuOrderIcon variant={actions.iconVariant} className="h-5 w-5" />
    </button>
  );
}
