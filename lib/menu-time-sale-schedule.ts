export const TIME_SALE_SCHEDULE_TIME_ZONE = "Asia/Seoul" as const;

const SEOUL_UTC_OFFSET_HOURS = 9;

export type TimeSaleScheduleType = "once" | "daily_window";

export type NormalizedTimeSaleSchedule = {
  active?: boolean;
  scheduleType: TimeSaleScheduleType;
  startsAt: string;
  endsAt: string;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  timeZone: typeof TIME_SALE_SCHEDULE_TIME_ZONE;
};

export type TimeSaleWindow = {
  startMs: number;
  endMs: number;
};

type KstDateParts = {
  year: number;
  month: number;
  day: number;
};

const kstDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_SALE_SCHEDULE_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export function normalizeTimeSaleScheduleType(value: unknown): TimeSaleScheduleType {
  return value === "daily_window" ? "daily_window" : "once";
}

export function normalizeDailyTime(value: unknown) {
  const rawValue = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(rawValue);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = Number(match[2]);
  const second = match[3] == null ? 0 : Number(match[3]);
  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    !Number.isInteger(second) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59 ||
    second < 0 ||
    second > 59
  ) {
    return null;
  }

  return `${formatTwoDigits(hour)}:${formatTwoDigits(minute)}:${formatTwoDigits(second)}`;
}

export function isTimeSaleActiveAt(schedule: NormalizedTimeSaleSchedule, nowMs: number) {
  return getCurrentTimeSaleWindow(schedule, nowMs) != null;
}

export function getCurrentTimeSaleWindow(schedule: NormalizedTimeSaleSchedule, nowMs: number): TimeSaleWindow | null {
  const campaign = getValidCampaignWindow(schedule);
  if (!campaign || !Number.isFinite(nowMs) || schedule.active === false) return null;

  if (schedule.scheduleType === "once") {
    return campaign.startMs <= nowMs && nowMs < campaign.endMs ? campaign : null;
  }

  const today = getKstDateParts(nowMs);
  if (!today) return null;

  const window = getDailyWindowForKstDate(schedule, today, campaign);
  return window && window.startMs <= nowMs && nowMs < window.endMs ? window : null;
}

export function getNextTimeSaleBoundaryMs(schedule: NormalizedTimeSaleSchedule, nowMs: number) {
  const campaign = getValidCampaignWindow(schedule);
  if (!campaign || !Number.isFinite(nowMs) || schedule.active === false) return null;

  if (schedule.scheduleType === "once") {
    if (nowMs < campaign.startMs) return campaign.startMs;
    if (campaign.startMs <= nowMs && nowMs < campaign.endMs) return campaign.endMs;
    return null;
  }

  const currentWindow = getCurrentTimeSaleWindow(schedule, nowMs);
  if (currentWindow) return currentWindow.endMs;

  return getNextTimeSaleStartMs(schedule, nowMs);
}

export function getNextTimeSaleStartMs(schedule: NormalizedTimeSaleSchedule, nowMs: number) {
  const campaign = getValidCampaignWindow(schedule);
  if (!campaign || !Number.isFinite(nowMs) || schedule.active === false) return null;

  if (schedule.scheduleType === "once") {
    return nowMs < campaign.startMs ? campaign.startMs : null;
  }

  const searchFromMs = Math.max(nowMs, campaign.startMs);
  const baseDate = getKstDateParts(searchFromMs);
  if (!baseDate) return null;

  for (let offsetDays = 0; offsetDays <= 2; offsetDays += 1) {
    const candidateDate = addDaysToKstDate(baseDate, offsetDays);
    const window = getDailyWindowForKstDate(schedule, candidateDate, campaign);
    if (!window) continue;
    if (window.endMs <= searchFromMs) continue;
    if (window.startMs > nowMs) return window.startMs;
    if (window.startMs <= nowMs && nowMs < window.endMs) {
      continue;
    }
  }

  return null;
}

export function getActiveTimeSaleWindowEndMs(schedule: NormalizedTimeSaleSchedule, nowMs: number) {
  return getCurrentTimeSaleWindow(schedule, nowMs)?.endMs ?? null;
}

export function getTimeSaleCountdownTargetMs(schedule: NormalizedTimeSaleSchedule, nowMs: number) {
  return getActiveTimeSaleWindowEndMs(schedule, nowMs);
}

function getValidCampaignWindow(schedule: NormalizedTimeSaleSchedule): TimeSaleWindow | null {
  const startMs = parseDateMs(schedule.startsAt);
  const endMs = parseDateMs(schedule.endsAt);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return { startMs, endMs };
}

function getDailyWindowForKstDate(
  schedule: NormalizedTimeSaleSchedule,
  date: KstDateParts,
  campaign: TimeSaleWindow,
): TimeSaleWindow | null {
  if (schedule.scheduleType !== "daily_window") return null;

  const startSeconds = parseDailyTimeToSeconds(schedule.dailyStartTime);
  const endSeconds = parseDailyTimeToSeconds(schedule.dailyEndTime);
  if (startSeconds == null || endSeconds == null || endSeconds <= startSeconds) return null;

  const dailyStartMs = getKstDateTimeMs(date, startSeconds);
  const dailyEndMs = getKstDateTimeMs(date, endSeconds);
  const startMs = Math.max(campaign.startMs, dailyStartMs);
  const endMs = Math.min(campaign.endMs, dailyEndMs);
  return startMs < endMs ? { startMs, endMs } : null;
}

function parseDateMs(value: string) {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : NaN;
}

function parseDailyTimeToSeconds(value: string | null) {
  const normalized = normalizeDailyTime(value);
  if (!normalized) return null;

  const [hour, minute, second] = normalized.split(":").map(Number);
  return hour * 3600 + minute * 60 + second;
}

function getKstDateParts(ms: number): KstDateParts | null {
  if (!Number.isFinite(ms)) return null;

  const parts = kstDateFormatter.formatToParts(new Date(ms));
  const getPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  const date = {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
  };

  return Object.values(date).every(Number.isFinite) ? date : null;
}

function addDaysToKstDate(date: KstDateParts, days: number): KstDateParts {
  const nextDate = new Date(Date.UTC(date.year, date.month - 1, date.day + days));
  return {
    year: nextDate.getUTCFullYear(),
    month: nextDate.getUTCMonth() + 1,
    day: nextDate.getUTCDate(),
  };
}

function getKstDateTimeMs(date: KstDateParts, secondsFromMidnight: number) {
  const hour = Math.floor(secondsFromMidnight / 3600);
  const minute = Math.floor((secondsFromMidnight % 3600) / 60);
  const second = secondsFromMidnight % 60;
  return Date.UTC(date.year, date.month - 1, date.day, hour - SEOUL_UTC_OFFSET_HOURS, minute, second);
}

function formatTwoDigits(value: number) {
  return String(value).padStart(2, "0");
}
