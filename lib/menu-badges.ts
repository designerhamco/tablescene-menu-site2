import type { BadgeType } from "@/lib/supabase/types";

export type { BadgeType };

export const BADGE_TYPES = [
  "none",
  "recommend",
  "popular",
  "best",
  "discount",
  "event",
  "signature",
] as const satisfies readonly BadgeType[];

export const BADGE_LABELS: Record<BadgeType, string> = {
  none: "",
  recommend: "추천",
  popular: "인기",
  best: "베스트",
  discount: "할인",
  event: "이벤트",
  signature: "시그니처",
};

export type BadgeableMenuItem = {
  badge_type?: BadgeType | string | null;
  recommended?: boolean | null;
};

export function isBadgeType(value: string | null | undefined): value is BadgeType {
  return BADGE_TYPES.includes(value as BadgeType);
}

export function normalizeBadgeType(value: FormDataEntryValue | string | null | undefined): BadgeType | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized === "none") {
    return null;
  }

  return isBadgeType(normalized) ? normalized : null;
}

export function getMenuItemBadgeType(item: BadgeableMenuItem): BadgeType {
  if (item.badge_type && item.badge_type !== "none" && isBadgeType(item.badge_type)) {
    return item.badge_type;
  }

  if (item.recommended === true) {
    return "recommend";
  }

  return "none";
}

export function getBadgeLabel(badgeType: BadgeType | null | undefined) {
  return BADGE_LABELS[badgeType ?? "none"] ?? "";
}

export function shouldShowBadge(item: BadgeableMenuItem) {
  return getMenuItemBadgeType(item) !== "none";
}
