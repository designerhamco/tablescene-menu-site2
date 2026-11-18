"use client";

import { useEffect, useState } from "react";
import { activeHomeService } from "@/lib/service-home-navigation";

export function useActiveHomeService(pathname: string) {
  const [state, setState] = useState<{ pathname: string; id: string | null }>({ pathname, id: null });
  useEffect(() => {
    if (pathname !== "/") return;
    let scheduled = 0;
    const update = () => {
      scheduled = 0;
      const stack = document.querySelector<HTMLElement>("[data-service-stack]");
      const anchors = [...document.querySelectorAll<HTMLElement>("[data-service-anchor]")].map(anchor => ({ id: anchor.id, top: anchor.getBoundingClientRect().top }));
      const id = activeHomeService(anchors, stack?.getBoundingClientRect().bottom ?? NaN, document.querySelector<HTMLElement>("[data-site-header]")?.offsetHeight ?? 0);
      setState(current => current.pathname === pathname && current.id === id ? current : { pathname, id });
    };
    const schedule = () => { if (!scheduled) scheduled = requestAnimationFrame(update); };
    schedule();
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", schedule);
    window.addEventListener("hashchange", schedule);
    return () => { cancelAnimationFrame(scheduled); window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); window.removeEventListener("hashchange", schedule); };
  }, [pathname]);
  return pathname === "/" && state.pathname === pathname ? state.id : null;
}
