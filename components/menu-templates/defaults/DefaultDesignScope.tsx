"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MenuLayoutId } from "@/lib/menu-design-policy";

const DefaultDesignContext = createContext<MenuLayoutId | undefined>(undefined);
export const useDefaultDesign = () => Boolean(useContext(DefaultDesignContext));
export const useDefaultDesignLayout = () => useContext(DefaultDesignContext);

/** Explicit review scope; never inferred from customer IDs or copy. */
export default function DefaultDesignScope({ children, layout }: { children: ReactNode; layout: MenuLayoutId }) {
  return <DefaultDesignContext.Provider value={layout}>{children}</DefaultDesignContext.Provider>;
}
