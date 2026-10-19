"use client";

import { createContext, useContext, type ReactNode } from "react";

const DefaultDesignContext = createContext(false);
export const useDefaultDesign = () => useContext(DefaultDesignContext);

/** Appearance-only preview scope; never inferred from customer IDs or copy. */
export default function DefaultDesignScope({ children }: { children: ReactNode }) {
  return <DefaultDesignContext.Provider value>{children}</DefaultDesignContext.Provider>;
}
