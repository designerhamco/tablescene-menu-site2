import { getBasicPricingCapabilities } from "@/lib/template-capabilities";

export const PRICE_DISPLAY_MODES = ["compact_decimal", "krw"] as const;

export type PriceDisplayMode = (typeof PRICE_DISPLAY_MODES)[number];

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function getDefaultPriceDisplayModeForTemplate(templateKey?: string | null): PriceDisplayMode {
  return getBasicPricingCapabilities(templateKey).defaultPriceDisplayMode;
}

export function isPriceDisplayMode(value: unknown): value is PriceDisplayMode {
  return value === "compact_decimal" || value === "krw";
}

export function normalizePriceDisplayMode(value: unknown, templateKey?: string | null): PriceDisplayMode {
  return isPriceDisplayMode(value) ? value : getDefaultPriceDisplayModeForTemplate(templateKey);
}

export function getPriceDisplayModeFromSettings(settings: unknown, templateKey?: string | null): PriceDisplayMode {
  const record = isRecord(settings) ? settings : null;
  return normalizePriceDisplayMode(record?.price_display_mode, templateKey);
}

export function formatMenuPriceByMode(price: number | null | undefined, mode: PriceDisplayMode): string {
  if (typeof price !== "number" || !Number.isFinite(price) || price <= 0) return "";

  if (mode === "compact_decimal") {
    const compactValue = price / 1000;
    return compactValue.toFixed(1);
  }

  return `${new Intl.NumberFormat("ko-KR").format(price)}원`;
}

export function formatMenuPriceWithOverride({
  price,
  priceLabel,
  mode,
}: {
  price: number | null | undefined;
  priceLabel?: string | null;
  mode: PriceDisplayMode;
}) {
  const label = priceLabel?.trim();
  if (label) return label;

  return formatMenuPriceByMode(price, mode);
}
