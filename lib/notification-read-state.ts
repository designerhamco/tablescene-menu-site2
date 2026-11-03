import { getNotificationDisplaySince } from "./notification-display-policy";

export const NOTIFICATIONS_READ_ALL_EVENT = "artimenu:notifications-read-all";
export type NotificationsReadAll = { readAt: string; userId: string };

function parseReadAll(value: unknown): NotificationsReadAll | null {
  if (!value || typeof value !== "object") return null;
  const { readAt, userId } = value as Record<string, unknown>;
  return typeof readAt === "string" && Number.isFinite(Date.parse(readAt)) && typeof userId === "string" && userId.length > 0
    ? { readAt, userId } : null;
}

export function getNotificationsReadAll(event: Event) {
  return parseReadAll((event as CustomEvent<unknown>).detail);
}

export function applyNotificationsReadAll<T extends { read_at: string | null; created_at: string | null }>(items: T[], readAt: string): T[] {
  const cutoff = Date.parse(readAt);
  const since = Date.parse(getNotificationDisplaySince(readAt));
  return items.map(item => !item.read_at && item.created_at && Date.parse(item.created_at) >= since && Date.parse(item.created_at) <= cutoff
    ? { ...item, read_at: readAt } : item);
}

export async function requestNotificationsReadAll() {
  const response = await fetch("/api/notifications/read-all", { method: "POST" });
  if (!response.ok) throw new Error("Notification read failed");
  const data = await response.json();
  const result = data.ok === true ? parseReadAll(data) : null;
  if (!result) throw new Error("Invalid notification read response");
  window.dispatchEvent(new CustomEvent(NOTIFICATIONS_READ_ALL_EVENT, { detail: result }));
}
