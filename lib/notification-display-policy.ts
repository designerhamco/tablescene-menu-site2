export const NOTIFICATION_VISIBLE_CHANNELS = ["in_app", "email"] as const;
export const NOTIFICATION_FALLBACK_HREF = "/mypage?tab=notifications";
const NOTIFICATION_TIME_ZONE = "Asia/Seoul";

export function formatNotificationBadgeCount(count: number) {
  return count > 9 ? "9+" : String(Math.max(0, count));
}

export function formatNotificationDateTime(value: string | Date | null) {
  if (!value) {
    return "-";
  }

  const date = value instanceof Date ? value : new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "-";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: NOTIFICATION_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const getPart = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";

  return `${getPart("year")}. ${getPart("month")}. ${getPart("day")}. ${getPart("hour")}:${getPart("minute")}`;
}
