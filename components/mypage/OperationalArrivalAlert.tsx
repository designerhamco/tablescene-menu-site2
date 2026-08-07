"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getNewDashboardArrivalIds,
  mergeDashboardArrivalSeenIds,
} from "@/lib/dashboard-arrival-alerts";

type AlertKind = "orders" | "calls";

const KIND_COPY: Record<AlertKind, { noun: string; title: string }> = {
  orders: { noun: "주문", title: "새 주문" },
  calls: { noun: "호출", title: "새 호출" },
};

function readSeenIds(storageKey: string) {
  try {
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((value): value is string => typeof value === "string");
  } catch {
    return null;
  }
}

function writeSeenIds(storageKey: string, ids: readonly string[]) {
  try {
    window.sessionStorage.setItem(storageKey, JSON.stringify(ids));
  } catch {
    // The dashboard still works when storage is unavailable.
  }
}

export default function OperationalArrivalAlert({
  menuSiteId,
  kind,
  arrivalIds,
}: {
  menuSiteId: string;
  kind: AlertKind;
  arrivalIds: readonly string[];
}) {
  const [newCount, setNewCount] = useState(0);
  const storageKey = `menulink:dashboard-arrivals:${kind}:${menuSiteId}`;
  const serializedIds = useMemo(() => JSON.stringify(arrivalIds), [arrivalIds]);
  const copy = KIND_COPY[kind];

  useEffect(() => {
    const currentIds = JSON.parse(serializedIds) as string[];
    const seenIds = readSeenIds(storageKey);
    if (seenIds === null) {
      writeSeenIds(storageKey, mergeDashboardArrivalSeenIds({ currentIds, seenIds: [] }));
      return;
    }

    const newIds = getNewDashboardArrivalIds({ currentIds, seenIds });
    writeSeenIds(storageKey, mergeDashboardArrivalSeenIds({ currentIds, seenIds }));
    if (newIds.length > 0) {
      window.queueMicrotask(() => setNewCount((count) => count + newIds.length));
    }
  }, [serializedIds, storageKey]);

  useEffect(() => {
    if (newCount < 1) return;
    const originalTitle = document.title;
    document.title = `(${newCount}) ${copy.title} · ${originalTitle}`;
    return () => {
      document.title = originalTitle;
    };
  }, [copy.title, newCount]);

  if (newCount < 1) return null;

  return (
    <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-950 shadow-sm">
      <p className="text-sm font-black">새 {copy.noun} {newCount.toLocaleString("ko-KR")}건이 접수되었습니다.</p>
      <button
        type="button"
        onClick={() => setNewCount(0)}
        className="rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-black text-violet-800 hover:bg-violet-100"
      >
        확인
      </button>
    </div>
  );
}
