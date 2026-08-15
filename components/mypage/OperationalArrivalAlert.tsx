"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getDashboardBrowserNotificationCopy,
  getDashboardBrowserNotificationPreferenceKey,
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

function readBrowserNotificationPreference(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === "enabled";
  } catch {
    return false;
  }
}

function writeBrowserNotificationPreference(storageKey: string, enabled: boolean) {
  try {
    if (enabled) {
      window.localStorage.setItem(storageKey, "enabled");
    } else {
      window.localStorage.removeItem(storageKey);
    }
  } catch {
    // The dashboard and in-app arrival banner still work when storage is unavailable.
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
  const [permissionPending, setPermissionPending] = useState(false);
  const storageKey = `menulink:dashboard-arrivals:${kind}:${menuSiteId}`;
  const browserPreferenceKey = getDashboardBrowserNotificationPreferenceKey({ menuSiteId, kind });
  const serializedIds = useMemo(() => JSON.stringify(arrivalIds), [arrivalIds]);
  const copy = KIND_COPY[kind];

  useEffect(() => {
    onBackgroundPollingChange?.(browserNotificationsEnabled);
  }, [browserNotificationsEnabled, onBackgroundPollingChange]);

  useEffect(() => {
    let active = true;

    const syncPermission = () => {
      if (!active) return;
      if (!("Notification" in window)) {
        setBrowserPermission("unsupported");
        setBrowserNotificationsEnabled(false);
        return;
      }
      const permission = window.Notification.permission;
      setBrowserPermission(permission);
      setBrowserNotificationsEnabled(permission === "granted" && readBrowserNotificationPreference(browserPreferenceKey));
    };

    window.queueMicrotask(syncPermission);
    window.addEventListener("focus", syncPermission);
    document.addEventListener("visibilitychange", syncPermission);
    return () => {
      active = false;
      window.removeEventListener("focus", syncPermission);
      document.removeEventListener("visibilitychange", syncPermission);
    };
  }, [browserPreferenceKey]);

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

      if (shouldShowDashboardBrowserNotification({
        enabled: browserNotificationsEnabled,
        permission: browserPermission,
        pageHasAttention: document.visibilityState === "visible" && document.hasFocus(),
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

  async function toggleBrowserNotifications() {
    if (!("Notification" in window) || permissionPending) return;

    if (browserNotificationsEnabled) {
      writeBrowserNotificationPreference(browserPreferenceKey, false);
      setBrowserNotificationsEnabled(false);
      return;
    }

    setPermissionPending(true);
    try {
      const permission = window.Notification.permission === "granted"
        ? "granted"
        : await window.Notification.requestPermission();
      setBrowserPermission(permission);
      const enabled = permission === "granted";
      writeBrowserNotificationPreference(browserPreferenceKey, enabled);
      setBrowserNotificationsEnabled(enabled);
    } finally {
      setPermissionPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-sm">
        <div>
          <p className="text-sm font-black text-zinc-900">브라우저 새 {copy.noun} 알림</p>
          <p className="mt-1 max-w-2xl break-keep text-xs font-bold leading-relaxed text-zinc-500">
            이 관리 화면을 열어둔 동안 다른 탭이나 창을 보고 있을 때만 표시합니다. 백그라운드 push·소리·외부 전송은 사용하지 않습니다.
          </p>
          {browserPermission === "denied" ? (
            <p className="mt-1 text-xs font-black text-rose-700">브라우저 설정에서 이 사이트의 알림 권한을 허용해야 켤 수 있습니다.</p>
          ) : null}
          {browserPermission === "unsupported" ? (
            <p className="mt-1 text-xs font-black text-zinc-500">이 브라우저에서는 알림을 지원하지 않습니다.</p>
          ) : null}
        </div>
        {browserPermission !== "unsupported" ? (
          <button
            type="button"
            onClick={toggleBrowserNotifications}
            disabled={permissionPending || browserPermission === "denied"}
            aria-pressed={browserNotificationsEnabled}
            className="rounded-full border border-zinc-200 bg-zinc-950 px-4 py-2 text-xs font-black text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {permissionPending ? "권한 확인 중" : browserNotificationsEnabled ? "알림 끄기" : "알림 켜기"}
          </button>
        ) : null}
      </section>

      {newCount > 0 ? (
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
      ) : null}
    </div>
  );
}
