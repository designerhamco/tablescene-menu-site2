import type { Json } from "@/lib/supabase/types";
import { normalizeTemplateKey } from "@/lib/templates";

export const TIME_SALE_TYPE = "time_sale";
export const TIME_SALE_TIMEZONE = "Asia/Seoul";
export const DEFAULT_TIME_SALE_DISPLAY_MODE = "deadline";
export const DEFAULT_TIME_SALE_BADGE_TEXT = "타임세일";
export const DEFAULT_TIME_SALE_BADGE_BACKGROUND_COLOR = "#8A5A2B";
export const TIME_SALE_BADGE_TEXT_MAX_LENGTH = 16;

export type TimeSaleDisplayMode = "deadline" | "countdown";

export type MenuEditorTimeSale = {
  id: string;
  name: string;
  active: boolean;
  startsAt: string;
  endsAt: string;
  timezone: string;
  timeDisplayMode: TimeSaleDisplayMode;
  badgeText: string;
  badgeBackgroundColor: string;
  item: {
    id: string;
    menuItemId: string;
    salePrice: number | null;
    salePriceLabel: string | null;
    visible: boolean;
  } | null;
};

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
  return value === "countdown" ? "countdown" : DEFAULT_TIME_SALE_DISPLAY_MODE;
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

export function toLocalDateTimeInputValue(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}
