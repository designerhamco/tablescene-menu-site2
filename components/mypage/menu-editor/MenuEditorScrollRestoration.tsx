"use client";

import { useEffect } from "react";

const SCROLL_KEY_PREFIX = "tablescene:menu-editor:scroll";
const MAX_RESTORE_AGE_MS = 60_000;

export function saveMenuEditorScrollPosition(menuId: string) {
  if (typeof window === "undefined") return;

  try {
    window.sessionStorage.setItem(
      `${SCROLL_KEY_PREFIX}:${menuId}`,
      JSON.stringify({
        path: window.location.pathname,
        scrollY: window.scrollY,
        savedAt: Date.now(),
      })
    );
  } catch {
    // Session storage can be unavailable in private browsing or strict modes.
  }
}

export default function MenuEditorScrollRestoration({ menuId }: { menuId: string }) {
  useEffect(() => {
    const key = `${SCROLL_KEY_PREFIX}:${menuId}`;

    function saveFromSubmit() {
      saveMenuEditorScrollPosition(menuId);
    }

    document.addEventListener("submit", saveFromSubmit, true);

    try {
      const rawValue = window.sessionStorage.getItem(key);
      if (!rawValue) return () => document.removeEventListener("submit", saveFromSubmit, true);

      const value = JSON.parse(rawValue) as { path?: string; scrollY?: number; savedAt?: number };
      const isFresh = typeof value.savedAt === "number" && Date.now() - value.savedAt < MAX_RESTORE_AGE_MS;
      const isSamePath = !value.path || value.path === window.location.pathname;
      const scrollY = typeof value.scrollY === "number" ? value.scrollY : null;

      if (isFresh && isSamePath && scrollY !== null) {
        const restore = () => window.scrollTo({ top: scrollY, left: 0, behavior: "auto" });
        requestAnimationFrame(restore);
        window.setTimeout(restore, 80);
        window.setTimeout(restore, 240);
      }

      window.sessionStorage.removeItem(key);
    } catch {
      window.sessionStorage.removeItem(key);
    }

    return () => document.removeEventListener("submit", saveFromSubmit, true);
  }, [menuId]);

  return null;
}
