export const SERVICE_DATA_RETENTION_DAYS = 7;
const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 1000 * 60 * 60 * 24;

export function getServiceDataRetentionUntil(expiredAt: string | Date) {
  const date = typeof expiredAt === "string" ? new Date(expiredAt) : new Date(expiredAt);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + SERVICE_DATA_RETENTION_DAYS);
  return date.toISOString();
}

function getKstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function getKstDayStartTime(date: Date) {
  const parts = getKstDateParts(date);

  if (!parts) {
    return null;
  }

  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

export function getRemainingRetentionDaysKst(value: string | null | undefined, now: Date = new Date()) {
  if (!value) return null;
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  const todayStart = getKstDayStartTime(now);
  const retentionStart = getKstDayStartTime(date);

  if (todayStart === null || retentionStart === null) {
    return null;
  }

  return Math.round((retentionStart - todayStart) / DAY_MS);
}

export function isRetentionEndedAfterKstDday(value: string | null | undefined, now: Date = new Date()) {
  const daysLeft = getRemainingRetentionDaysKst(value, now);
  return daysLeft !== null && daysLeft < 0;
}
