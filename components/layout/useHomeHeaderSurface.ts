"use client";

import { useEffect, useState } from "react";
import { isHomeBasicHeaderApproach, isHomeHeroHeaderOverlay, isHomeServiceHeaderOverlay } from "@/lib/site-header-policy";

type HomeHeaderSurface = "default" | "dark-overlay" | "clear";

export function useHomeHeaderSurface(pathname: string): HomeHeaderSurface {
  const [state, setState] = useState<{ pathname: string; surface: HomeHeaderSurface }>({
    pathname,
    surface: pathname === "/" ? "dark-overlay" : "default",
  });
  useEffect(() => {
    if (pathname !== "/") {
      const reset = requestAnimationFrame(() => setState({ pathname, surface: "default" }));
      return () => cancelAnimationFrame(reset);
    }
    let scheduled = 0;
    const observed = new Set<Element>();
    const update = () => {
      scheduled = 0;
      const hero = document.querySelector<HTMLElement>("[data-hero-motion]");
      const services = document.querySelector<HTMLElement>("[data-service-stack]");
      const header = document.querySelector<HTMLElement>("[data-site-header]");
      const deviceStage = document.querySelector<HTMLElement>("[data-device-stage]");
      for (const target of [hero, services, deviceStage]) if (target && !observed.has(target)) { resize.observe(target); observed.add(target); }
      if (hero && services && deviceStage) content.disconnect();
      const bounds = services?.getBoundingClientRect(), height = header?.offsetHeight ?? 0;
      const overlay = isHomeHeroHeaderOverlay(pathname, hero?.getBoundingClientRect().bottom ?? null, height)
        || isHomeServiceHeaderOverlay(pathname, bounds?.top ?? null, bounds?.bottom ?? null, height);
      const approachingBasic = isHomeBasicHeaderApproach(pathname, bounds?.top ?? null, deviceStage ? deviceStage.offsetHeight + height : 0);
      const surface = overlay ? "dark-overlay" : approachingBasic ? "clear" : "default";
      setState(current => current.pathname === pathname && current.surface === surface ? current : { pathname, surface });
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
  if (pathname !== "/") return "default";
  return state.pathname === pathname ? state.surface : "dark-overlay";
}
