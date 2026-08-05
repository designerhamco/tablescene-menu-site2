import type { SupportedLocale } from "@/lib/locales";
import { TIME_SALE_SCHEDULE_TIME_ZONE, getActiveTimeSaleWindowEndMs, isTimeSaleActiveAt, type NormalizedTimeSaleSchedule, type TimeSaleScheduleType } from "@/lib/menu-time-sale-schedule";
import type { TimeSaleDisplayMode } from "@/lib/menu-time-sales";

type MenuTimeSaleDisplaySource = {
  scheduleType: TimeSaleScheduleType;
  startsAt: string;
  endsAt: string;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  timezone: string;
  timeDisplayMode: TimeSaleDisplayMode;
  displayText: string | null;
};

function getTimeSaleSchedule(timeSale: MenuTimeSaleDisplaySource): NormalizedTimeSaleSchedule {
  return {
    active: true,
    scheduleType: timeSale.scheduleType,
    startsAt: timeSale.startsAt,
    endsAt: timeSale.endsAt,
    dailyStartTime: timeSale.dailyStartTime,
    dailyEndTime: timeSale.dailyEndTime,
    timeZone: TIME_SALE_SCHEDULE_TIME_ZONE,
  };
}

function getDatePartsInTimeZone(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(value));

  const getPart = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value);
  return {
    year: getPart("year"),
    month: getPart("month"),
    day: getPart("day"),
    hour: getPart("hour"),
    minute: getPart("minute"),
  };
}

function formatTwoDigit(value: number) {
  return String(value).padStart(2, "0");
}

function formatTimeSaleDateLabel(target: ReturnType<typeof getDatePartsInTimeZone>, today: ReturnType<typeof getDatePartsInTimeZone>, timeText: string, locale: SupportedLocale) {
  if (locale === "en") {
    if (target.year === today.year && target.month === today.month && target.day === today.day) return `Until today ${timeText}`;
    if (target.year === today.year && target.month === today.month) return `Until ${target.day} ${timeText}`;
    if (target.year === today.year) return `Until ${target.month}/${target.day} ${timeText}`;
    return `Until ${target.year}/${target.month}/${target.day} ${timeText}`;
  }

  if (locale === "zh") {
    if (target.year === today.year && target.month === today.month && target.day === today.day) return `今天${timeText}截止`;
    if (target.year === today.year && target.month === today.month) return `${target.day}日${timeText}截止`;
    if (target.year === today.year) return `${target.month}月${target.day}日${timeText}截止`;
    return `${target.year}年${target.month}月${target.day}日${timeText}截止`;
  }

  if (locale === "ja") {
    if (target.year === today.year && target.month === today.month && target.day === today.day) return `本日${timeText}まで`;
    if (target.year === today.year && target.month === today.month) return `${target.day}日${timeText}まで`;
    if (target.year === today.year) return `${target.month}月${target.day}日${timeText}まで`;
    return `${target.year}年${target.month}月${target.day}日${timeText}まで`;
  }

  if (target.year === today.year && target.month === today.month && target.day === today.day) return `오늘 ${timeText}까지`;
  if (target.year === today.year && target.month === today.month) return `${target.day}일 ${timeText}까지`;
  if (target.year === today.year) return `${target.month}월 ${target.day}일 ${timeText}까지`;
  return `${target.year}년 ${target.month}월 ${target.day}일 ${timeText}까지`;
}

export function formatTimeSaleDeadlineLabel(timeSale: Pick<MenuTimeSaleDisplaySource, "timezone">, endsAt: string, nowMs: number, locale: SupportedLocale) {
  const timeZone = timeSale.timezone || TIME_SALE_SCHEDULE_TIME_ZONE;
  const target = getDatePartsInTimeZone(endsAt, timeZone);
  const today = getDatePartsInTimeZone(new Date(nowMs).toISOString(), timeZone);

  if (![target.year, target.month, target.day, target.hour, target.minute].every(Number.isFinite)) {
    if (locale === "en") return "Until closing time";
    if (locale === "zh") return "截止时间前";
    if (locale === "ja") return "終了時間まで";
    return "마감 시간까지";
  }

  return formatTimeSaleDateLabel(target, today, `${formatTwoDigit(target.hour)}:${formatTwoDigit(target.minute)}`, locale);
}

export function formatTimeSaleCountdownLabel(endsAtMs: number, nowMs: number, locale: SupportedLocale) {
  const remainingMs = Math.max(0, endsAtMs - nowMs);
  const totalMinutes = Math.max(1, Math.ceil(remainingMs / 60_000));
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (locale === "en") {
    if (days > 0) return hours > 0 ? `${days}d ${hours}h left` : `${days}d left`;
    if (hours > 0) return minutes > 0 ? `${hours}h ${minutes}m left` : `${hours}h left`;
    return `${minutes}m left`;
  }

  if (locale === "zh") {
    if (days > 0) return hours > 0 ? `剩余${days}天${hours}小时` : `剩余${days}天`;
    if (hours > 0) return minutes > 0 ? `剩余${hours}小时${minutes}分钟` : `剩余${hours}小时`;
    return `剩余${minutes}分钟`;
  }

  if (locale === "ja") {
    if (days > 0) return hours > 0 ? `残り${days}日${hours}時間` : `残り${days}日`;
    if (hours > 0) return minutes > 0 ? `残り${hours}時間${minutes}分` : `残り${hours}時間`;
    return `残り${minutes}分`;
  }

  if (days > 0) return hours > 0 ? `${days}일 ${hours}시간 남음` : `${days}일 남음`;
  if (hours > 0) return minutes > 0 ? `${hours}시간 ${minutes}분 남음` : `${hours}시간 남음`;
  return `${minutes}분 남음`;
}

export function isMenuTimeSaleActive(timeSale: MenuTimeSaleDisplaySource, nowMs: number) {
  return isTimeSaleActiveAt(getTimeSaleSchedule(timeSale), nowMs);
}

export function getActiveMenuTimeSaleEndMs(timeSale: MenuTimeSaleDisplaySource, nowMs: number) {
  return getActiveTimeSaleWindowEndMs(getTimeSaleSchedule(timeSale), nowMs);
}

export function getMenuTimeSaleAuxiliaryLabels(timeSale: MenuTimeSaleDisplaySource, nowMs: number, locale: SupportedLocale) {
  if (!isMenuTimeSaleActive(timeSale, nowMs)) return [];

  const activeEndsAtMs = getActiveMenuTimeSaleEndMs(timeSale, nowMs);
  const displayText = timeSale.displayText?.trim() ?? "";
  const countdownText = activeEndsAtMs != null && activeEndsAtMs > nowMs
    ? formatTimeSaleCountdownLabel(activeEndsAtMs, nowMs, locale)
    : "";

  if (timeSale.timeDisplayMode === "message") return displayText ? [displayText] : [];
  if (timeSale.timeDisplayMode === "countdown") return countdownText ? [countdownText] : [];
  if (timeSale.timeDisplayMode === "message_and_countdown") return [displayText, countdownText].filter(Boolean);

  if (activeEndsAtMs != null && activeEndsAtMs > nowMs) {
    return [formatTimeSaleDeadlineLabel(timeSale, new Date(activeEndsAtMs).toISOString(), nowMs, locale)];
  }

  return [];
}
