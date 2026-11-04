"use client";

import { useEffect, useTransition, type ReactNode } from "react";
import { RefreshButton } from "@/app/components/ui/refresh-button";
import { useRouter } from "next/navigation";

export default function OperationsDashboardRefresh({ title, action }: { title?: string; action?: ReactNode } = {}) {
  const router = useRouter(), [pending, refresh] = useTransition();
  useEffect(() => {
    const update = () => { if (document.visibilityState === "visible" && !pending) refresh(() => router.refresh()); };
    const timer = window.setInterval(update, 15_000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update); };
  }, [pending, router]);
  const control = <RefreshButton loading={pending} onClick={() => refresh(() => router.refresh())} />;
  if (!title) return <div className="site-action-row" data-distribution="end">{control}</div>;
  return <div className="site-content-heading-row"><div className="site-action-row"><h3 className="type-subsection-title">{title}</h3>{control}</div>{action}</div>;
}
