"use client";
import { createContext, useContext, useCallback, type ReactNode } from "react";
import type { SupportedLocale } from "@/lib/locales";
import { translateMenuText } from "@/lib/menu-ui-copy";
const Context = createContext<SupportedLocale>("ko");
export const useMenuLocale = () => useContext(Context);
export function useMenuText() {
  const locale = useMenuLocale();
  return useCallback((text: string, ...values: unknown[]) => translateMenuText(text, locale).replace(/\{(\d+)\}/g, (_, i: string) => String(values[Number(i)] ?? "")), [locale]);
}
export default function MenuLocaleScope({ locale, children }: { locale: SupportedLocale; children: ReactNode }) {
  return <Context.Provider value={locale}>{children}</Context.Provider>;
}
