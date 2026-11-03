"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { OrderCallEntryConfig } from "./types";

/** Keep an already-open customer screen in sync; submission still rechecks saved permissions. */
export function useLiveOrderPointAccess(config: OrderCallEntryConfig) {
  const router = useRouter();
  const [live, setLive] = useState<{ config: OrderCallEntryConfig; order: boolean; call: boolean; valid: boolean } | null>(null);
  useEffect(() => {
    if (config.previewOnly || config.mode !== "active" || !config.menuSiteId) return;
    let disposed = false, pending = false, lastRefresh = "";
    const controller = new AbortController();
    async function check() {
      if (disposed || pending || document.visibilityState === "hidden") return;
      pending = true;
      try {
        const response = await fetch(`/api/public-menu/order-session?menuSiteId=${encodeURIComponent(config.menuSiteId!)}`, { credentials: "same-origin", cache: "no-store", signal: controller.signal });
        if (!response.ok && response.status !== 401) return;
        const data = await response.json();
        if (disposed) return;
        const valid = data.ok === true && data.tableLabel === config.tableLabel && data.channel === (config.channel ?? "customer");
        if (data.ok === true && (typeof data.orderAllowed !== "boolean" || typeof data.callAllowed !== "boolean")) return;
        const order = valid && data.orderAllowed === true, call = valid && data.callAllowed === true;
        setLive({ config, order, call, valid });
        const signature = JSON.stringify([valid, order, call, data.tableLabel, data.channel]);
        if ((order !== config.orderEnabled || call !== config.callEnabled || !valid) && signature !== lastRefresh) {
          lastRefresh = signature;
          router.refresh();
        }
      } catch { /* Offline keeps the current view; server-side reception never trusts this cache. */ }
      finally { pending = false; }
    }
    void check();
    const timer = setInterval(() => { void check(); }, 30_000);
    const onFocus = () => { void check(); };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => { disposed = true; controller.abort(); clearInterval(timer); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, [config, router]);
  return live?.config === config ? live : { order: config.orderEnabled, call: config.callEnabled, valid: config.hasValidTableSession };
}
