"use client";

import { useEffect, useState } from "react";
import { isHomeHeroHeaderOverlay, isHomeServiceHeaderOverlay } from "@/lib/site-header-policy";

/** Only the home hero and dark service stack own transparent header boundaries. */
export function useHomeHeroHeader(pathname: string) {
  const [state, setState] = useState({ pathname, overlay: pathname === "/" });
  useEffect(() => {
    if (pathname !== "/") {
      const reset = requestAnimationFrame(() => setState({ pathname, overlay: false }));
      return () => cancelAnimationFrame(reset);
    }
    let scheduled = 0;
    const observed = new Set<Element>();
    const update = () => {
      scheduled = 0;
      const hero = document.querySelector<HTMLElement>("[data-hero-motion]");
      const services = document.querySelector<HTMLElement>("[data-service-stack]");
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      for (const target of [hero, services]) if (target && !observed.has(target)) { resize.observe(target); observed.add(target); }
      if (hero && services) content.disconnect();
      const bounds = services?.getBoundingClientRect(), height = header?.offsetHeight ?? 0;
      const overlay = isHomeHeroHeaderOverlay(pathname, hero?.getBoundingClientRect().bottom ?? null, height)
        || isHomeServiceHeaderOverlay(pathname, bounds?.top ?? null, bounds?.bottom ?? null, height);
      setState(current => current.pathname === pathname && current.overlay === overlay ? current : { pathname, overlay });
    };
    const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(update); };
    const resize = new ResizeObserver(schedule);
    // Also handles streamed home sections arriving after shared navigation hydrates.
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
