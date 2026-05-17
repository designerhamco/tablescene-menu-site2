import type { CSSProperties } from "react";

import type { BadgeableMenuItem } from "@/lib/menu-badges";
import { getMenuItemBadgeType, normalizeMenuBadgeLabel } from "@/lib/menu-badges";

export type BadgeStyleKey = "best" | "signature" | "new" | "recommended" | "default";

export type BadgeStyle = {
  background_color: string;
  text_color: string;
};

export type BadgeStyles = Record<BadgeStyleKey, BadgeStyle>;

export const BADGE_STYLE_KEYS = ["best", "signature", "new", "recommended", "default"] as const satisfies readonly BadgeStyleKey[];

export const BADGE_STYLE_LABELS: Record<BadgeStyleKey, string> = {
  best: "BEST",
  signature: "SIGNATURE",
  new: "NEW",
  recommended: "추천",
  default: "기타 배지",
};

export const DEFAULT_BADGE_STYLES: BadgeStyles = {
  best: {
    background_color: "#31B44A",
    text_color: "#FFFFFF",
  },
  signature: {
    background_color: "#005C4B",
    text_color: "#FFFFFF",
  },
  new: {
    background_color: "#111111",
    text_color: "#FFFFFF",
  },
  recommended: {
    background_color: "#F4B400",
    text_color: "#111111",
  },
  default: {
    background_color: "#007A5A",
    text_color: "#FFFFFF",
  },
};

export const TEMPLATE_BADGE_STYLE_PRESETS: Record<string, Partial<BadgeStyles>> = {
  cafe_design_a: {
    best: { background_color: "#4CAF50", text_color: "#FFFFFF" },
    signature: { background_color: "#004D40", text_color: "#FFFFFF" },
    new: { background_color: "#191C1B", text_color: "#FFFFFF" },
    recommended: { background_color: "#94D3C1", text_color: "#00201A" },
    default: { background_color: "#29695B", text_color: "#FFFFFF" },
  },
  cafe_design_b: {
    best: { background_color: "#7C2D12", text_color: "#FFFFFF" },
    signature: { background_color: "#EA580C", text_color: "#FFFFFF" },
    new: { background_color: "#FFF7ED", text_color: "#9A3412" },
    recommended: { background_color: "#FED7AA", text_color: "#7C2D12" },
    default: { background_color: "#FB923C", text_color: "#111111" },
  },
  cafe_design_c: {
    best: { background_color: "#111827", text_color: "#FFFFFF" },
    signature: { background_color: "#FDE68A", text_color: "#111827" },
    new: { background_color: "#E5E7EB", text_color: "#111827" },
    recommended: { background_color: "#FBBF24", text_color: "#111827" },
    default: { background_color: "#374151", text_color: "#FFFFFF" },
  },
  fine_dining_design_a: {
    best: { background_color: "#111111", text_color: "#FFFFFF" },
    signature: { background_color: "#7C6A46", text_color: "#FFFFFF" },
    new: { background_color: "#EAEAEA", text_color: "#111111" },
    recommended: { background_color: "#C8A86B", text_color: "#111111" },
    default: { background_color: "#111111", text_color: "#FFFFFF" },
  },
  fast_food_design_a: {
    best: { background_color: "#DC2626", text_color: "#FFFFFF" },
    signature: { background_color: "#111111", text_color: "#FFFFFF" },
    new: { background_color: "#F97316", text_color: "#111111" },
    recommended: { background_color: "#FACC15", text_color: "#111111" },
    default: { background_color: "#EF4444", text_color: "#FFFFFF" },
  },
};

const hexColorPattern = /^#[0-9a-f]{6}$/i;

export function isHexColor(value: string | null | undefined) {
  return Boolean(value && hexColorPattern.test(value));
}

function normalizeHexColor(value: unknown) {
  return typeof value === "string" && isHexColor(value) ? value.toUpperCase() : null;
}

function isBadgeStyle(value: unknown): value is BadgeStyle {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const record = value as Record<string, unknown>;
  return Boolean(normalizeHexColor(record.background_color) && normalizeHexColor(record.text_color));
}

export function getDefaultBadgeStyles(templateKey?: string | null): BadgeStyles {
  const preset = templateKey ? TEMPLATE_BADGE_STYLE_PRESETS[templateKey] : null;

  return BADGE_STYLE_KEYS.reduce<BadgeStyles>((styles, key) => {
    styles[key] = preset?.[key] ?? DEFAULT_BADGE_STYLES[key];
    return styles;
  }, {} as BadgeStyles);
}

export function normalizeBadgeStyles(value: unknown): Partial<BadgeStyles> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, unknown>;
  const styles: Partial<BadgeStyles> = {};

  for (const key of BADGE_STYLE_KEYS) {
    const style = record[key];
    if (!isBadgeStyle(style)) continue;

    styles[key] = {
      background_color: normalizeHexColor(style.background_color) ?? DEFAULT_BADGE_STYLES[key].background_color,
      text_color: normalizeHexColor(style.text_color) ?? DEFAULT_BADGE_STYLES[key].text_color,
    };
  }

  return Object.keys(styles).length > 0 ? styles : null;
}

export function getCustomBadgeStyles(settings: unknown, pageSettings?: unknown): Partial<BadgeStyles> | null {
  const settingsRecord = settings && typeof settings === "object" && !Array.isArray(settings) ? (settings as Record<string, unknown>) : null;
  const pageSettingsRecord =
    pageSettings && typeof pageSettings === "object" && !Array.isArray(pageSettings) ? (pageSettings as Record<string, unknown>) : null;

  return normalizeBadgeStyles(settingsRecord?.badge_styles) ?? normalizeBadgeStyles(pageSettingsRecord?.badge_styles);
}

export function mergeBadgeStyles(templateKey?: string | null, customBadgeStyles?: unknown): BadgeStyles {
  const defaults = getDefaultBadgeStyles(templateKey);
  const custom = normalizeBadgeStyles(customBadgeStyles);

  if (!custom) return defaults;

  return BADGE_STYLE_KEYS.reduce<BadgeStyles>((styles, key) => {
    styles[key] = custom[key] ?? defaults[key];
    return styles;
  }, {} as BadgeStyles);
}

export function getBadgeStyleKey(itemOrLabel: BadgeableMenuItem | string | null | undefined, recommended = false): BadgeStyleKey {
  const item = typeof itemOrLabel === "object" && itemOrLabel !== null ? itemOrLabel : null;
  const label = typeof itemOrLabel === "string" ? itemOrLabel : item?.badge_label;
  const normalizedLabel = normalizeMenuBadgeLabel(label);
  const rawLabel = typeof label === "string" ? label.trim().toLowerCase() : "";
  const badgeType = item ? getMenuItemBadgeType(item) : "none";

  if (normalizedLabel === "BEST" || rawLabel === "best" || badgeType === "best") return "best";
  if (normalizedLabel === "SIGNATURE" || rawLabel === "signature" || badgeType === "signature") return "signature";
  if (normalizedLabel === "NEW" || rawLabel === "new") return "new";
  if (
    recommended ||
    (item?.recommended === true && !rawLabel) ||
    normalizedLabel === "추천" ||
    rawLabel === "recommended" ||
    rawLabel === "recommend" ||
    badgeType === "recommend"
  ) {
    return "recommended";
  }

  return "default";
}

export function getBadgeStyleForItem(
  item: BadgeableMenuItem,
  templateKey?: string | null,
  customBadgeStyles?: unknown
): BadgeStyle {
  const styles = mergeBadgeStyles(templateKey, customBadgeStyles);
  return styles[getBadgeStyleKey(item)];
}

export function getBadgeStyleCss(style: BadgeStyle): CSSProperties {
  return {
    backgroundColor: style.background_color,
    color: style.text_color,
  };
}
