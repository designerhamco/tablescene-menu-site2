"use client";

import { useEffect, useMemo, useState } from "react";
import { OPERATIONAL_SOUND_CHANGED, getOperationalBrowserPermission, playOperationalSound, readOperationalSound } from "@/lib/operational-sound";
import { ContentPanel } from "@/app/components/ui/content-panel";
import type { OperationArrivalGroup } from "@/lib/all-menu-operations";

import {
  getDashboardBrowserNotificationCopy,
  getNewDashboardArrivalIds,
  mergeDashboardArrivalSeenIds,
  shouldShowDashboardBrowserNotification,
  type DashboardArrivalKind,
  type DashboardBrowserNotificationPermission,
} from "@/lib/dashboard-arrival-alerts";

const KIND_COPY: Record<DashboardArrivalKind, { noun: string; title: string }> = {
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
  onBackgroundPollingChange,
  arrivalGroups,
}: {
  menuSiteId: string;
  kind: DashboardArrivalKind;
  arrivalIds: readonly string[];
  onBackgroundPollingChange?: (enabled: boolean) => void;
  arrivalGroups?: OperationArrivalGroup[];
}) {
  const [newCount, setNewCount] = useState(0);
  const [browserPermission, setBrowserPermission] = useState<DashboardBrowserNotificationPermission>("unsupported");
  const [enabledSiteIds, setEnabledSiteIds] = useState<string[]>([]);
  const browserNotificationsEnabled = enabledSiteIds.length > 0;
  const serializedGroups = useMemo(() => JSON.stringify(arrivalGroups ?? [{ menuSiteId, menuSiteName: "", arrivalIds }]), [arrivalGroups, arrivalIds, menuSiteId]);
  const copy = KIND_COPY[kind];

  useEffect(() => {
    onBackgroundPollingChange?.(browserNotificationsEnabled);
  }, [browserNotificationsEnabled, onBackgroundPollingChange]);

  useEffect(() => {
    let active = true;

    const syncPermission = () => {
      if (!active) return;
      setBrowserPermission(getOperationalBrowserPermission());
      const groups = JSON.parse(serializedGroups) as OperationArrivalGroup[];
      const enabled = groups.filter(group => readOperationalSound(group.menuSiteId, kind).receiveEnabled).map(group => group.menuSiteId);
      setEnabledSiteIds(previous => JSON.stringify(previous) === JSON.stringify(enabled) ? previous : enabled);
    };

    window.queueMicrotask(syncPermission);
    window.addEventListener("focus", syncPermission);
    window.addEventListener("storage", syncPermission);
    window.addEventListener(OPERATIONAL_SOUND_CHANGED, syncPermission);
    document.addEventListener("visibilitychange", syncPermission);
    return () => {
      active = false;
      window.removeEventListener("focus", syncPermission);
      window.removeEventListener("storage", syncPermission);
      window.removeEventListener(OPERATIONAL_SOUND_CHANGED, syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, [serializedGroups, kind]);

  useEffect(() => {
    const groups = JSON.parse(serializedGroups) as OperationArrivalGroup[];
    let count = 0, soundSiteId: string | undefined;
    for (const group of groups) {
      // Individual and aggregate views share the same per-site seen IDs and preferences.
      const storageKey = `menulink:dashboard-arrivals:${kind}:${group.menuSiteId}`;
      const currentIds = group.arrivalIds, seenIds = readSeenIds(storageKey);
      const newIds = seenIds === null ? [] : getNewDashboardArrivalIds({ currentIds, seenIds });
      writeSeenIds(storageKey, mergeDashboardArrivalSeenIds({ currentIds, seenIds: seenIds ?? [] }));
      if (!newIds.length) continue;
      count += newIds.length;
      const enabled = enabledSiteIds.includes(group.menuSiteId);
      if (enabled) soundSiteId ??= group.menuSiteId;
      if (shouldShowDashboardBrowserNotification({
        enabled,
        permission: browserPermission,
        newCount: newIds.length,
      })) {
        const notificationCopy = getDashboardBrowserNotificationCopy({ kind, newCount: newIds.length });
        try {
          const notification = new window.Notification(notificationCopy.title, {
            body: notificationCopy.body,
            tag: `menulink:${kind}:${group.menuSiteId}`,
            silent: true,
          });
          notification.onclick = () => {
            window.focus();
            notification.close();
          };
        } catch {
          // Permission or browser policy can change between polling and display.
        }
      }
    }
    if (count) window.queueMicrotask(() => setNewCount(previous => previous + count));
    if (soundSiteId) void playOperationalSound(readOperationalSound(soundSiteId, kind));
  }, [enabledSiteIds, browserPermission, kind, serializedGroups]);

  useEffect(() => {
    if (newCount < 1) return;
    const originalTitle = document.title;
    document.title = `(${newCount}) ${copy.title} · ${originalTitle}`;
    return () => {
      document.title = originalTitle;
    };
  }, [copy.title, newCount]);

  return (
    <>
      {newCount > 0 ? (
        <ContentPanel surface="notice" density="compact"><div role="status" aria-live="polite" className="site-content-heading-row">
          <p className="type-body">새 {copy.noun} {newCount.toLocaleString("ko-KR")}건이 접수되었습니다.</p>
          <button
            type="button"
            onClick={() => setNewCount(0)}
            className="site-button site-button-outline"
          >
            확인
          </button>
        </div></ContentPanel>
      ) : null}
    </>
  );
}
