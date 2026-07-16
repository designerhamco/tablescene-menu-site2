import { normalizeDailyTime, normalizeTimeSaleScheduleType, TIME_SALE_SCHEDULE_TIME_ZONE, type TimeSaleScheduleType } from "@/lib/menu-time-sale-schedule";

export const MAX_TIME_SALES_PER_MENU_SITE = 50;

const SEOUL_UTC_OFFSET_HOURS = 9;
const DAY_MS = 24 * 60 * 60 * 1000;

export type TimeSaleValidationTarget = {
  menuItemId: string;
  itemName: string;
  priceColumnId: string | null;
  priceColumnLabel?: string | null;
};

export type TimeSaleValidationEntry = {
  id: string;
  name: string;
  scheduleType: TimeSaleScheduleType | string | null | undefined;
  startsAt: string;
  endsAt: string;
  dailyStartTime?: string | null;
  dailyEndTime?: string | null;
  targets: TimeSaleValidationTarget[];
};

type TimeSaleWindow = {
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

export function getTimeSaleTargetKey(target: Pick<TimeSaleValidationTarget, "menuItemId" | "priceColumnId">) {
  return `${target.menuItemId}:${target.priceColumnId ?? "single"}`;
}

export function validateTimeSaleLimit(count: number) {
  if (count <= MAX_TIME_SALES_PER_MENU_SITE) return null;
  return `한 메뉴판에는 타임세일을 최대 ${MAX_TIME_SALES_PER_MENU_SITE}개까지 등록할 수 있습니다. 사용하지 않는 타임세일을 정리한 후 다시 저장해주세요.`;
}

export function validateTimeSaleSchedule(entry: Pick<TimeSaleValidationEntry, "scheduleType" | "startsAt" | "endsAt" | "dailyStartTime" | "dailyEndTime">) {
  const campaign = getCampaignWindow(entry);
  if (!campaign) return "타임세일 시작/종료 일시를 확인해주세요.";

  if (normalizeTimeSaleScheduleType(entry.scheduleType) === "daily_window") {
    const dailyWindow = getDailyWindowSeconds(entry);
    if (!dailyWindow) return "매일 종료 시간은 시작 시간보다 늦어야 합니다. 자정을 넘기는 반복 할인은 아직 지원하지 않습니다.";
  }

  return null;
}

export function doTimeSaleSchedulesOverlap(left: TimeSaleValidationEntry, right: TimeSaleValidationEntry) {
  const leftCampaign = getCampaignWindow(left);
  const rightCampaign = getCampaignWindow(right);
  if (!leftCampaign || !rightCampaign || !doWindowsOverlap(leftCampaign, rightCampaign)) return false;

  const leftScheduleType = normalizeTimeSaleScheduleType(left.scheduleType);
  const rightScheduleType = normalizeTimeSaleScheduleType(right.scheduleType);

  if (leftScheduleType === "once" && rightScheduleType === "once") {
    return true;
  }

  if (leftScheduleType === "daily_window" && rightScheduleType === "daily_window") {
    const leftDailyWindow = getDailyWindowSeconds(left);
    const rightDailyWindow = getDailyWindowSeconds(right);
    return Boolean(leftDailyWindow && rightDailyWindow && doWindowsOverlap(leftDailyWindow, rightDailyWindow));
  }

  const onceEntry = leftScheduleType === "once" ? left : right;
  const dailyEntry = leftScheduleType === "daily_window" ? left : right;
  const onceWindow = getCampaignWindow(onceEntry);
  return Boolean(onceWindow && doesOnceWindowOverlapDailyWindow(onceWindow, dailyEntry));
}

export function findOverlappingTimeSales(entries: TimeSaleValidationEntry[]) {
  for (const entry of entries) {
    const scheduleError = validateTimeSaleSchedule(entry);
    if (scheduleError) {
      return scheduleError;
    }

    const targetKeys = new Set<string>();
    for (const target of entry.targets) {
      const targetKey = getTimeSaleTargetKey(target);
      if (targetKeys.has(targetKey)) {
        return `“${target.itemName}”의 ${formatTargetLabel(target)}에 같은 타임세일 대상이 중복되어 있습니다.`;
      }
      targetKeys.add(targetKey);
    }
  }

  for (let leftIndex = 0; leftIndex < entries.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < entries.length; rightIndex += 1) {
      const left = entries[leftIndex];
      const right = entries[rightIndex];
      if (!doTimeSaleSchedulesOverlap(left, right)) continue;

      const leftTargetsByKey = new Map(left.targets.map((target) => [getTimeSaleTargetKey(target), target]));
      const overlappingTarget = right.targets.find((target) => leftTargetsByKey.has(getTimeSaleTargetKey(target)));
      if (!overlappingTarget) continue;

      const leftTarget = leftTargetsByKey.get(getTimeSaleTargetKey(overlappingTarget)) ?? overlappingTarget;
      return formatOverlapMessage(left, right, leftTarget);
    }
  }

  return null;
}

function formatOverlapMessage(left: TimeSaleValidationEntry, right: TimeSaleValidationEntry, target: TimeSaleValidationTarget) {
  const targetLabel = formatTargetLabel(target);
  if (target.priceColumnId) {
    return `“${target.itemName}”의 ${targetLabel}에 적용된 “${left.name}”과 “${right.name}”의 시간이 겹칩니다. 시간을 조정한 후 다시 저장해주세요.`;
  }

  return `“${target.itemName}”의 타임세일 “${left.name}”과 “${right.name}”의 시간이 겹칩니다. 시간을 조정한 후 다시 저장해주세요.`;
}

function formatTargetLabel(target: TimeSaleValidationTarget) {
  return target.priceColumnId ? `${target.priceColumnLabel || "옵션"} 가격` : "단일 가격";
}

function doesOnceWindowOverlapDailyWindow(onceWindow: TimeSaleWindow, dailyEntry: TimeSaleValidationEntry) {
  const dailyCampaign = getCampaignWindow(dailyEntry);
  const dailyWindow = getDailyWindowSeconds(dailyEntry);
  if (!dailyCampaign || !dailyWindow) return false;

  const overlapStartMs = Math.max(onceWindow.startMs, dailyCampaign.startMs);
  const overlapEndMs = Math.min(onceWindow.endMs, dailyCampaign.endMs);
  if (overlapEndMs <= overlapStartMs) return false;
  if (overlapEndMs - overlapStartMs >= DAY_MS) return true;

  return getCandidateKstDates(overlapStartMs, overlapEndMs).some((date) => {
    const dailyStartMs = getKstDateTimeMs(date, dailyWindow.startMs);
    const dailyEndMs = getKstDateTimeMs(date, dailyWindow.endMs);
    return doWindowsOverlap({ startMs: overlapStartMs, endMs: overlapEndMs }, { startMs: dailyStartMs, endMs: dailyEndMs });
  });
}

function getCandidateKstDates(startMs: number, endMs: number) {
  const dates = new Map<string, KstDateParts>();
  const addDate = (date: KstDateParts | null) => {
    if (!date) return;
    dates.set(`${date.year}-${date.month}-${date.day}`, date);
  };

  const startDate = getKstDateParts(startMs);
  addDate(startDate);
  if (startDate) addDate(addDaysToKstDate(startDate, 1));
  addDate(getKstDateParts(Math.max(startMs, endMs - 1)));

  return Array.from(dates.values());
}

function getCampaignWindow(entry: Pick<TimeSaleValidationEntry, "startsAt" | "endsAt">): TimeSaleWindow | null {
  const startMs = new Date(entry.startsAt).getTime();
  const endMs = new Date(entry.endsAt).getTime();
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs) return null;
  return { startMs, endMs };
}

function getDailyWindowSeconds(entry: Pick<TimeSaleValidationEntry, "dailyStartTime" | "dailyEndTime">): TimeSaleWindow | null {
  const startSeconds = parseDailyTimeToSeconds(entry.dailyStartTime);
  const endSeconds = parseDailyTimeToSeconds(entry.dailyEndTime);
  if (startSeconds == null || endSeconds == null || endSeconds <= startSeconds) return null;
  return { startMs: startSeconds, endMs: endSeconds };
}

function doWindowsOverlap(left: TimeSaleWindow, right: TimeSaleWindow) {
  return left.startMs < right.endMs && right.startMs < left.endMs;
}

function parseDailyTimeToSeconds(value: string | null | undefined) {
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
