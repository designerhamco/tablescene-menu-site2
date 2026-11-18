"use client";

import { useEffect, useState } from "react";
import { isHomeHeroHeaderOverlay } from "@/lib/site-header-policy";

/** The home story owns the overlay boundary; other routes keep their existing header. */
export function useHomeHeroHeader(pathname: string) {
  const [state, setState] = useState({ pathname, overlay: pathname === "/" });
  useEffect(() => {
    if (pathname !== "/") {
      const reset = requestAnimationFrame(() => setState({ pathname, overlay: false }));
      return () => cancelAnimationFrame(reset);
    }
    let scheduled = 0;
    let observedHero: Element | null = null;
    const update = () => {
      scheduled = 0;
      const hero = document.querySelector<HTMLElement>("[data-hero-motion]");
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      if (hero && hero !== observedHero) {
        if (observedHero) resize.unobserve(observedHero);
        resize.observe(hero); observedHero = hero; content.disconnect();
      }
      const overlay = isHomeHeroHeaderOverlay(pathname, hero?.getBoundingClientRect().bottom ?? null, header?.offsetHeight ?? 0);
      setState(current => current.pathname === pathname && current.overlay === overlay ? current : { pathname, overlay });
    };
    const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    // Also handles a streamed hero arriving after the shared navigation hydrates.
    const content = new MutationObserver(schedule);
    content.observe(document.querySelector("main") ?? document.body, { childList: true, subtree: true });
    const header = document.querySelector("[data-site-header]"); if (header) resize.observe(header);
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    return () => {
      cancelAnimationFrame(scheduled); resize.disconnect(); content.disconnect();
      window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule);
    };
  }, [pathname]);
  return pathname === "/" && (state.pathname === pathname ? state.overlay : true);
}
