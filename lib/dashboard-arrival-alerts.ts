export const DASHBOARD_ARRIVAL_SEEN_LIMIT = 200;

export type DashboardArrivalKind = "orders" | "calls";
export type DashboardBrowserNotificationPermission = NotificationPermission | "unsupported";

function uniqueIds(ids: readonly string[]) {
  return [...new Set(ids.filter((id) => typeof id === "string" && id.length > 0))];
}

export function getNewDashboardArrivalIds({
  currentIds,
  seenIds,
}: {
  currentIds: readonly string[];
  seenIds: readonly string[];
}) {
  const seen = new Set(uniqueIds(seenIds));
  return uniqueIds(currentIds).filter((id) => !seen.has(id));
}

export function mergeDashboardArrivalSeenIds({
  currentIds,
  seenIds,
  limit = DASHBOARD_ARRIVAL_SEEN_LIMIT,
}: {
  currentIds: readonly string[];
  seenIds: readonly string[];
  limit?: number;
}) {
  if (!Number.isSafeInteger(limit) || limit < 1) return [];
  return uniqueIds([...currentIds, ...seenIds]).slice(0, limit);
}

export function getDashboardBrowserNotificationPreferenceKey({
  menuSiteId,
  kind,
}: {
  menuSiteId: string;
  kind: DashboardArrivalKind;
}) {
  return `menulink:dashboard-browser-notifications:${kind}:${menuSiteId}`;
}

export function shouldShowDashboardBrowserNotification({
  enabled,
  permission,
  pageHasAttention,
  newCount,
}: {
  enabled: boolean;
  permission: DashboardBrowserNotificationPermission;
  pageHasAttention: boolean;
  newCount: number;
}) {
  return enabled
    && permission === "granted"
    && !pageHasAttention
    && Number.isSafeInteger(newCount)
    && newCount > 0;
}

export function shouldRefreshArrivalDashboard({
  pageVisible,
  browserNotificationsEnabled,
  mutationPending,
}: {
  pageVisible: boolean;
  browserNotificationsEnabled: boolean;
  mutationPending: boolean;
}) {
  return !mutationPending && (pageVisible || browserNotificationsEnabled);
}

export function getDashboardBrowserNotificationCopy({
  kind,
  newCount,
}: {
  kind: DashboardArrivalKind;
  newCount: number;
}) {
  const noun = kind === "orders" ? "주문" : "호출";
  return {
    title: `새 ${noun} ${newCount.toLocaleString("ko-KR")}건`,
    body: `메뉴링크 ${noun}관리 화면에서 확인해 주세요.`,
  };
}
