"use client";

import { createContext, useContext, useEffect, useRef, type ReactNode } from "react";
import type { MenuLayoutId } from "@/lib/menu-design-policy";

const AlbumContext = createContext(false);
export const useDefaultAlbum = () => useContext(AlbumContext);

const DefaultDesignContext = createContext<MenuLayoutId | undefined>(undefined);
export const useDefaultDesign = () => Boolean(useContext(DefaultDesignContext));
export const useDefaultDesignLayout = () => useContext(DefaultDesignContext);

/** Explicit review scope; never inferred from customer IDs or copy. */
export default function DefaultDesignScope({ children, layout, itemLayout = "list" }: { children: ReactNode; layout: MenuLayoutId; itemLayout?: "list" | "album" }) {
  return <DefaultDesignContext.Provider value={layout}><AlbumContext.Provider value={itemLayout === "album"}>{children}</AlbumContext.Provider></DefaultDesignContext.Provider>;
}

/** Image errors can occur before hydration attaches React's onError handler. */
export function useDefaultDesignLogoImage(url: string | null | undefined, onFailure: () => void) {
  const defaultDesign = useDefaultDesign();
  const imageRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    if (!defaultDesign || !url) return;
    const image = imageRef.current;
    if (!image?.complete || image.naturalWidth > 0) return;
    const frame = requestAnimationFrame(() => {
      if (image.isConnected && image.complete && image.naturalWidth === 0) onFailure();
    });
    return () => cancelAnimationFrame(frame);
  }, [defaultDesign, url, onFailure]);
  return imageRef;
}
