export const PERSONAL_TRIAL_RETENTION_DAYS = 30;
export const PAID_SUBSCRIPTION_RETENTION_DAYS = 90;
export const PAYMENT_ISSUE_RETENTION_DAYS = 30;
export const RETENTION_DDAY_DISPLAY_THRESHOLD_DAYS = 7;
const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 1000 * 60 * 60 * 24;

export type ServiceRetentionLifecycleReason =
  | "personal_trial_ended"
  | "paid_subscription_ended"
  | "payment_issue";

export function getRetentionDaysForLifecycleReason(reason: ServiceRetentionLifecycleReason) {
  if (reason === "paid_subscription_ended") return PAID_SUBSCRIPTION_RETENTION_DAYS;
  if (reason === "personal_trial_ended") return PERSONAL_TRIAL_RETENTION_DAYS;
  return PAYMENT_ISSUE_RETENTION_DAYS;
}

export function getRetentionDeadline(startedAt: string | Date, retentionDays: number) {
  const date = typeof startedAt === "string" ? new Date(startedAt) : new Date(startedAt);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + retentionDays);
  return date.toISOString();
}

export function getServiceDataRetentionUntil(startedAt: string | Date, reason: ServiceRetentionLifecycleReason) {
  return getRetentionDeadline(startedAt, getRetentionDaysForLifecycleReason(reason));
}

export function getPersonalTrialDataRetentionUntil(expiredAt: string | Date) {
  return getServiceDataRetentionUntil(expiredAt, "personal_trial_ended");
}

export function getPaidSubscriptionDataRetentionUntil(endedAt: string | Date) {
  return getServiceDataRetentionUntil(endedAt, "paid_subscription_ended");
}

export function getPaymentIssueDataRetentionUntil(retentionStartedAt: string | Date) {
  return getServiceDataRetentionUntil(retentionStartedAt, "payment_issue");
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

export function isRetentionActiveKst(value: string | null | undefined, now: Date = new Date()) {
  const daysLeft = getRemainingRetentionDaysKst(value, now);
  return daysLeft !== null && daysLeft >= 0;
}
