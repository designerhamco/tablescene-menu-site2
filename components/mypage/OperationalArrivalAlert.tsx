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

async function playArrivalChime() {
  try {
    const context = new window.AudioContext();
    if (context.state === "suspended") await context.resume();
    const gain = context.createGain();
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.62);
    gain.connect(context.destination);

    [0, 0.18].forEach((offset, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(index === 0 ? 659.25 : 783.99, context.currentTime + offset);
      oscillator.connect(gain);
      oscillator.start(context.currentTime + offset);
      oscillator.stop(context.currentTime + offset + 0.42);
    });
    window.setTimeout(() => void context.close(), 900);
  } catch {
    // Visual and browser notifications remain available if audio is blocked.
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
        setBrowserNotificationsEnabled(readBrowserNotificationPreference(browserPreferenceKey));
        return;
      }
      const permission = window.Notification.permission;
      setBrowserPermission(permission);
      setBrowserNotificationsEnabled(readBrowserNotificationPreference(browserPreferenceKey));
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
      if (browserNotificationsEnabled) void playArrivalChime();

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
            silent: false,
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
    if (permissionPending) return;

    if (browserNotificationsEnabled) {
      writeBrowserNotificationPreference(browserPreferenceKey, false);
      setBrowserNotificationsEnabled(false);
      return;
    }

    setPermissionPending(true);
    try {
      let permission: DashboardBrowserNotificationPermission = "unsupported";
      if ("Notification" in window) {
        permission = window.Notification.permission === "granted"
          ? "granted"
          : await window.Notification.requestPermission();
      }
      setBrowserPermission(permission);
      writeBrowserNotificationPreference(browserPreferenceKey, true);
      setBrowserNotificationsEnabled(true);
      await playArrivalChime();
    } finally {
      setPermissionPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-zinc-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-bold text-zinc-900">새 {copy.noun} 알림·소리</p>
          <p className="mt-1 max-w-2xl break-keep text-xs font-bold leading-relaxed text-zinc-500">
            새 {copy.noun}은 보고 있는 화면에 항상 표시합니다. 알림·소리를 켜면 이 화면을 열어둔 동안 브라우저 알림과 안내음을 함께 받을 수 있습니다.
          </p>
          {browserPermission === "denied" ? (
            <p className="mt-1 text-xs font-bold text-rose-700">브라우저 알림은 차단되어 있지만 화면 알림과 안내음은 사용할 수 있습니다.</p>
          ) : null}
          {browserPermission === "unsupported" ? (
            <p className="mt-1 text-xs font-bold text-zinc-500">이 브라우저에서는 시스템 알림을 지원하지 않아 화면 알림과 안내음만 제공합니다.</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={toggleBrowserNotifications}
          disabled={permissionPending}
          aria-pressed={browserNotificationsEnabled}
          className="rounded-full border border-zinc-200 bg-zinc-950 px-4 py-2 text-xs font-bold text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {permissionPending ? "권한 확인 중" : browserNotificationsEnabled ? "알림·소리 끄기" : "알림·소리 켜기"}
        </button>
      </section>

      {newCount > 0 ? (
        <div role="status" aria-live="polite" className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-violet-200 bg-violet-50 px-4 py-3 text-violet-950">
          <p className="text-sm font-bold">새 {copy.noun} {newCount.toLocaleString("ko-KR")}건이 접수되었습니다.</p>
          <button
            type="button"
            onClick={() => setNewCount(0)}
            className="rounded-full border border-violet-200 bg-white px-4 py-2 text-xs font-bold text-violet-800 hover:bg-violet-100"
          >
            확인
          </button>
        </div>
      ) : null}
    </div>
  );
}
