"use client";

import { useEffect } from "react";
import { TERMINAL_KEEPALIVE_INTERVAL_MS } from "@/lib/order-session-policy";

export function useTerminalConnection(menuSiteId: string, enabled: boolean, previewOnly: boolean) {
  useEffect(() => {
    if (!enabled || previewOnly) return;
    let disposed = false;
    let lastActivity = Date.now();
    let lastAttempt = -Infinity;
    let pending = false;
    const controller = new AbortController();

    async function refresh() {
      const now = Date.now();
      if (disposed || pending || document.visibilityState === "hidden"
        || now - lastActivity > TERMINAL_KEEPALIVE_INTERVAL_MS
        || now - lastAttempt < TERMINAL_KEEPALIVE_INTERVAL_MS) return;
      pending = true;
      lastAttempt = now;
      try {
        await fetch("/api/public-menu/order-session", {
          method: "POST", credentials: "same-origin", cache: "no-store", signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ menuSiteId, intent: "terminal-keepalive" }),
        });
      } catch { /* An offline or revoked connection is never replaced with a new visit. */ }
      finally { pending = false; }
    }
    function interact() { lastActivity = Date.now(); void refresh(); }
    function visible() { if (document.visibilityState === "visible") interact(); }
    void refresh();
    const timer = setInterval(() => { void refresh(); }, TERMINAL_KEEPALIVE_INTERVAL_MS);
    for (const name of ["pointerdown", "keydown", "scroll"]) document.addEventListener(name, interact, { passive: true, capture: true });
    document.addEventListener("visibilitychange", visible);
    return () => {
      disposed = true;
      controller.abort();
      clearInterval(timer);
      for (const name of ["pointerdown", "keydown", "scroll"]) document.removeEventListener(name, interact, true);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [menuSiteId, enabled, previewOnly]);
}
