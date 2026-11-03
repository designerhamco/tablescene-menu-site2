export const NOTIFICATION_VISIBLE_CHANNELS = ["in_app", "email"] as const;
export const NOTIFICATION_FALLBACK_HREF = "/mypage?tab=notifications";
export const NOTIFICATION_INBOX_HREF = "/notifications";
// A display window, not a database deletion/retention policy.
export const NOTIFICATION_DISPLAY_DAYS = 90;
export const NOTIFICATION_DISPLAY_NOTICE = `최근 ${NOTIFICATION_DISPLAY_DAYS}일 동안 받은 알림을 확인할 수 있습니다. 결제·구독 및 문의 내역은 각 메뉴에서 확인해주세요.`;
export const NOTIFICATION_COMPACT_NOTICE = `최근 ${NOTIFICATION_DISPLAY_DAYS}일의 알림 중 최대 10개를 표시합니다.`;

export function getNotificationDisplaySince(now: string | Date | number = Date.now()) {
  const time = new Date(now).getTime();
  if (!Number.isFinite(time)) throw new RangeError("Invalid notification reference time");
  return new Date(time - NOTIFICATION_DISPLAY_DAYS * 24 * 60 * 60 * 1000).toISOString();
}

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
