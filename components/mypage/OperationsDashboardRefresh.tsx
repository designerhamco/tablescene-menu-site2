"use client";

import { useEffect, useTransition } from "react";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { useRouter } from "next/navigation";

export default function OperationsDashboardRefresh() {
  const router = useRouter(), [pending, refresh] = useTransition();
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible" && !pending) refresh(() => router.refresh()); };
    const timer = window.setInterval(update, 15_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, [pending, router]);
  return <div className="site-content-heading-row"><p className="type-footnote site-copy-muted">최근 내역과 매출은 화면을 열어 둔 동안 15초마다 갱신합니다.</p><RefreshButton loading={pending} onClick={() => refresh(() => router.refresh())} /></div>;
}
