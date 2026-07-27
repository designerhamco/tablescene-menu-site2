import type { Json } from "@/lib/supabase/types";
import { normalizeDailyTime, normalizeTimeSaleScheduleType, type TimeSaleScheduleType } from "@/lib/menu-time-sale-schedule";
import { normalizeTemplateKey } from "@/lib/templates";

export const TIME_SALE_TYPE = "time_sale";
export const TIME_SALE_TIMEZONE = "Asia/Seoul";
export const DEFAULT_TIME_SALE_DISPLAY_MODE = "deadline";
export const DEFAULT_TIME_SALE_BADGE_TEXT = "타임세일";
export const DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR = "#8A5A2B";
export const TIME_SALE_BADGE_TEXT_MAX_LENGTH = 16;
export const TIME_SALE_DISPLAY_TEXT_MAX_LENGTH = 40;

export type TimeSaleDisplayMode = "deadline" | "countdown" | "message" | "message_and_countdown";

export type MenuEditorTimeSale = {
  id: string;
  name: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  timezone: string;
  scheduleType: TimeSaleScheduleType;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  timeDisplayMode: TimeSaleDisplayMode;
  displayText: string | null;
  badgeText: string;
  badgeBackgroundColor: string;
  item: {
    id: string;
    menuItemId: string;
    priceColumnId: string | null;
    salePrice: number | null;
    salePriceLabel: string | null;
    visible: boolean;
  } | null;
  items: Array<{
    id: string;
    menuItemId: string;
    priceColumnId: string | null;
    salePrice: number | null;
    salePriceLabel: string | null;
    visible: boolean;
  }>;
};

export const MENU_TIME_SALE_SAVE_PAYLOAD_SCHEMA_VERSION = 1;

export type MenuTimeSaleSaveMode = "merge" | "replace";

export type MenuTimeSaleManagementTargetDraft = {
  targetId: string | null;
  itemId: string;
  priceColumnId: string | null;
  salePrice: string | number | null;
  salePriceLabel?: string | null;
  visible: boolean;
};

export type MenuTimeSaleManagementDraft = {
  clientKey: string;
  promotionId: string | null;
  enabled: boolean;
  name: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  scheduleType: TimeSaleScheduleType;
  dailyStartTime: string | null;
  dailyEndTime: string | null;
  timeDisplayMode: TimeSaleDisplayMode;
  displayText: string | null;
  badgeText: string;
  badgeBackgroundColor: string;
  targets: MenuTimeSaleManagementTargetDraft[];
};

export type MenuTimeSaleSavePayload = {
  schemaVersion: typeof MENU_TIME_SALE_SAVE_PAYLOAD_SCHEMA_VERSION;
  mode: MenuTimeSaleSaveMode;
  entries: MenuTimeSaleManagementDraft[];
  deletedPromotionIds: string[];
};

function hasValidTimeSaleDateRange(startsAt: string, endsAt: string) {
  if (!startsAt.trim() || !endsAt.trim()) return false;
  const startMs = Date.parse(startsAt);
  const endMs = Date.parse(endsAt);
  return Number.isFinite(startMs) && Number.isFinite(endMs) && endMs > startMs;
}

function hasValidTimeSaleDailyWindow(draft: Pick<MenuTimeSaleManagementDraft, "scheduleType" | "dailyStartTime" | "dailyEndTime">) {
  if (normalizeTimeSaleScheduleType(draft.scheduleType) !== "daily_window") return true;
  const dailyStartTime = normalizeDailyTime(draft.dailyStartTime);
  const dailyEndTime = normalizeDailyTime(draft.dailyEndTime);
  return dailyStartTime != null && dailyEndTime != null && dailyEndTime > dailyStartTime;
}

function hasCompleteTimeSaleTargetDraft(target: MenuTimeSaleManagementTargetDraft) {
  const hasPrice =
    typeof target.salePrice === "number"
      ? Number.isFinite(target.salePrice) && target.salePrice > 0
      : typeof target.salePrice === "string"
        ? target.salePrice.trim().length > 0
        : false;
  return target.visible !== false && target.itemId.trim().length > 0 && hasPrice;
}

export function isEmptyNewMenuTimeSalePlaceholder(draft: MenuTimeSaleManagementDraft) {
  return !draft.promotionId && draft.enabled !== true;
}

export function isCompleteNewMenuTimeSaleDraft(draft: MenuTimeSaleManagementDraft) {
  if (draft.promotionId) return true;
  return (
    draft.enabled === true &&
    hasValidTimeSaleDateRange(draft.startsAt, draft.endsAt) &&
    hasValidTimeSaleDailyWindow(draft) &&
    draft.targets.some(hasCompleteTimeSaleTargetDraft)
  );
}

export function shouldIncludeMenuTimeSaleSaveEntry(draft: MenuTimeSaleManagementDraft) {
  return draft.promotionId ? true : isCompleteNewMenuTimeSaleDraft(draft);
}

const BASIC_TIME_SALE_TEMPLATE_LIMITS = new Map<string, number>([
  ["cafe_design_a", 1],
]);

export function getMaxTimeSalesForTemplate(templateKey?: string | null, templateCategory?: string | null) {
  if (!templateKey) return 0;
  return BASIC_TIME_SALE_TEMPLATE_LIMITS.get(normalizeTemplateKey(templateKey, templateCategory)) ?? 0;
}

export function isBasicTimeSaleTemplate(templateKey?: string | null, templateCategory?: string | null) {
  return getMaxTimeSalesForTemplate(templateKey, templateCategory) > 0;
}

export function normalizeTimeSaleDisplayMode(value: unknown): TimeSaleDisplayMode {
  return value === "countdown" || value === "message" || value === "message_and_countdown"
    ? value
    : DEFAULT_TIME_SALE_DISPLAY_MODE;
}

export function normalizeTimeSaleDisplayText(value: unknown) {
  const text = typeof value === "string" ? value : value == null ? "" : String(value);
  const normalized = text.replace(/[\r\n]+/g, " ").replace(/\s+/g, " ").trim();
  return normalized ? normalized.slice(0, TIME_SALE_DISPLAY_TEXT_MAX_LENGTH) : null;
}

export function normalizeTimeSaleBadgeText(value: unknown) {
  const text = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return (text || DEFAULT_TIME_SALE_BADGE_TEXT).slice(0, TIME_SALE_BADGE_TEXT_MAX_LENGTH);
}

export function isTimeSaleBadgeHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeTimeSaleBadgeBackgroundColor(value: unknown) {
  return isTimeSaleBadgeHexColor(value) ? value.trim().toUpperCase() : DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR;
}

export function getReadableTextColorForTimeSaleBadge(backgroundColor: unknown) {
  const color = normalizeTimeSaleBadgeBackgroundColor(backgroundColor).slice(1);
  const red = Number.parseInt(color.slice(0, 2), 16);
  const green = Number.parseInt(color.slice(2, 4), 16);
  const blue = Number.parseInt(color.slice(4, 6), 16);
  const luminance = (0.299 * red + 0.587 * green + 0.114 * blue) / 255;
  return luminance > 0.62 ? "#191C1B" : "#FFF8EA";
}

export function parseTimeSalePriceInputToWon(value: unknown) {
  const rawValue = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!rawValue) return NaN;

  const numericText = rawValue
    .replace(/[₩원,\s]/g, "")
    .replace(/^\+/, "")
    .trim();
  if (!/^\d+(?:\.\d+)?$/.test(numericText)) return NaN;

  const numericValue = Number(numericText);
  if (!Number.isFinite(numericValue) || numericValue <= 0) return NaN;

  const shouldTreatAsCafePriceLabel = numericText.includes(".") || numericValue < 100;
  const priceInWon = shouldTreatAsCafePriceLabel ? numericValue * 1000 : numericValue;
  return Number.isInteger(priceInWon) ? priceInWon : Math.round(priceInWon);
}

export function getTimeSalePriceLabelForSave(value: unknown, parsedPriceInWon: number) {
  const rawValue = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!rawValue || !Number.isFinite(parsedPriceInWon)) return null;

  const normalizedWonText = rawValue.replace(/[₩원,\s]/g, "").trim();
  return normalizedWonText === String(parsedPriceInWon) ? null : rawValue;
}

export function getTimeSaleDisplayModeFromSettings(settings: Json | null | undefined): TimeSaleDisplayMode {
  const record = settings && typeof settings === "object" && !Array.isArray(settings) ? settings as Record<string, Json> : {};
  return normalizeTimeSaleDisplayMode(record.time_display_mode);
}

export function getTimeSaleBadgeTextFromSettings(settings: Json | null | undefined) {
  const record = settings && typeof settings === "object" && !Array.isArray(settings) ? settings as Record<string, Json> : {};
  return normalizeTimeSaleBadgeText(record.badge_text);
}

export function getTimeSaleBadgeBackgroundColorFromSettings(settings: Json | null | undefined) {
  const record = settings && typeof settings === "object" && !Array.isArray(settings) ? settings as Record<string, Json> : {};
  return normalizeTimeSaleBadgeBackgroundColor(record.badge_background_color);
}

export function getTimeSaleDisplayTextFromSettings(settings: Json | null | undefined) {
  const record = settings && typeof settings === "object" && !Array.isArray(settings) ? settings as Record<string, Json> : {};
  return normalizeTimeSaleDisplayText(record.time_display_text);
}

export function toLocalDateTimeInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}
