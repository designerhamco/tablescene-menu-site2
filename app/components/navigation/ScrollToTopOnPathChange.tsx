"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { shouldResetDocumentScroll } from "@/lib/site-navigation-scroll";

function scrollToDocumentTop() {
  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;

  root.style.scrollBehavior = "auto";
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });

  window.requestAnimationFrame(() => {
    root.style.scrollBehavior = previousScrollBehavior;
  });
}

export default function ScrollToTopOnPathChange() {
  const pathname = usePathname();
  const previousPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    return () => {
      if ("scrollRestoration" in window.history) {
        window.history.scrollRestoration = "auto";
      }
    };
  }, []);

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const previousPathname = previousPathnameRef.current;
    previousPathnameRef.current = pathname;
    if (shouldResetDocumentScroll(previousPathname, pathname, window.location.hash)) {
      scrollToDocumentTop();
    }
  }, [pathname]);

  return null;
}
