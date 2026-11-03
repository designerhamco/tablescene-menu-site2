"use client";

import { useEffect, useMemo, useState } from "react";
import { OPERATIONAL_SOUND_CHANGED, getOperationalBrowserPermission, playOperationalSound, readOperationalSound } from "@/lib/operational-sound";
import { ContentPanel } from "@/app/components/ui/content-panel";

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
}: {
  menuSiteId: string;
  kind: DashboardArrivalKind;
  arrivalIds: readonly string[];
  onBackgroundPollingChange?: (enabled: boolean) => void;
}) {
  const [newCount, setNewCount] = useState(0);
  const [browserPermission, setBrowserPermission] = useState<DashboardBrowserNotificationPermission>("unsupported");
  const [browserNotificationsEnabled, setBrowserNotificationsEnabled] = useState(false);
  const storageKey = `menulink:dashboard-arrivals:${kind}:${menuSiteId}`;
  const serializedIds = useMemo(() => JSON.stringify(arrivalIds), [arrivalIds]);
  const copy = KIND_COPY[kind];

  useEffect(() => {
    onBackgroundPollingChange?.(browserNotificationsEnabled);
  }, [browserNotificationsEnabled, onBackgroundPollingChange]);

  useEffect(() => {
    let active = true;

    const syncPermission = () => {
      if (!active) return;
      setBrowserPermission(getOperationalBrowserPermission());
      setBrowserNotificationsEnabled(readOperationalSound(menuSiteId, kind).receiveEnabled);
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
  }, [menuSiteId, kind]);

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
      if (browserNotificationsEnabled) void playOperationalSound(readOperationalSound(menuSiteId, kind));

      if (shouldShowDashboardBrowserNotification({
        enabled: browserNotificationsEnabled,
        permission: browserPermission,
        newCount: newIds.length,
      })) {
        const notificationCopy = getDashboardBrowserNotificationCopy({ kind, newCount: newIds.length });
        try {
          const notification = new window.Notification(notificationCopy.title, {
            body: notificationCopy.body,
            tag: `menulink:${kind}:${menuSiteId}`,
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
  }, [browserNotificationsEnabled, browserPermission, kind, menuSiteId, serializedIds, storageKey]);

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
