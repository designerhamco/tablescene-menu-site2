"use client";

import { useEffect, useEffectEvent } from "react";
import { useRouter } from "next/navigation";
import { publishOrderStatusUpdate, readOrderStatusUpdate } from "@/lib/order-status-update";
import { createClient } from "@/lib/supabase/client";

export default function OrderUpdateRefresh({ userId, menuSiteId, kitchen = false }: {
  userId: string;
  menuSiteId?: string;
  kitchen?: boolean;
}) {
  const router = useRouter();
  const refreshPage = useEffectEvent(() => router.refresh());
  useEffect(() => {
    const supabase = createClient();
    let queued: ReturnType<typeof setTimeout> | undefined;
    let channel: ReturnType<typeof supabase.channel> | undefined;
    let disposed = false;
    function refresh() {
      if (document.visibilityState === "hidden") return;
      clearTimeout(queued);
      queued = setTimeout(() => refreshPage(), 100);
    }

    void supabase.realtime.setAuth().then(() => {
      if (disposed) return;
      channel = supabase.channel(`artimenu-orders:${userId}`, { config: { private: true } })
        .on("broadcast", { event: "orders-changed" }, ({ payload }) => {
          if (typeof payload?.menuSiteId !== "string" || (menuSiteId && menuSiteId !== payload.menuSiteId)) return;
          const statusUpdate = readOrderStatusUpdate(payload);
          if (statusUpdate) publishOrderStatusUpdate(statusUpdate);
          if (kitchen || payload.itemProgress !== true) refresh();
        })
        .subscribe(status => {
          if (status === "SUBSCRIBED") refresh();
        });
    }).catch(() => {
      // Existing polling and visibility refresh cover a missed subscription.
    });
    const timer = kitchen ? window.setInterval(refresh, 15_000) : undefined;
    document.addEventListener("visibilitychange", refresh);

    return () => {
      disposed = true;
      clearTimeout(queued);
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [userId, menuSiteId, kitchen]);
  return null;
}
