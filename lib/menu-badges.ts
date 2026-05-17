import type { BadgeType } from "@/lib/supabase/types";

export type { BadgeType };

export type MenuBadgeLabel = "추천" | "BEST" | "SIGNATURE" | "NEW" | "인기" | "한정" | "시즌" | "대표" | "신규" | "이벤트";

export const MENU_BADGE_CUSTOM_VALUE = "custom";
export const MENU_BADGE_MAX_LENGTH = 8;

export const MENU_BADGE_OPTIONS = [
  { value: "none", label: "사용 안 함" },
  { value: "BEST", label: "BEST" },
  { value: "SIGNATURE", label: "SIGNATURE" },
  { value: "NEW", label: "NEW" },
  { value: "추천", label: "추천" },
  { value: "인기", label: "인기" },
  { value: "한정", label: "한정" },
  { value: "시즌", label: "시즌" },
  { value: MENU_BADGE_CUSTOM_VALUE, label: "직접 입력" },
] as const;

export const PRICE_LIST_BADGE_OPTIONS = [
  { value: "none", label: "사용 안 함" },
  { value: "추천", label: "추천" },
  { value: "인기", label: "인기" },
  { value: "대표", label: "대표" },
  { value: "신규", label: "신규" },
  { value: "이벤트", label: "이벤트" },
  { value: "한정", label: "한정" },
  { value: MENU_BADGE_CUSTOM_VALUE, label: "직접 입력" },
] as const;

const MENU_BADGE_LABELS = ["추천", "BEST", "SIGNATURE", "NEW", "인기", "한정", "시즌", "대표", "신규", "이벤트"] as const satisfies readonly MenuBadgeLabel[];

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
  badge_label?: MenuBadgeLabel | string | null;
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

export function normalizeMenuBadgeLabel(value: FormDataEntryValue | string | null | undefined): MenuBadgeLabel | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();

  if (!normalized || normalized === "none") {
    return null;
  }

  return MENU_BADGE_LABELS.includes(normalized as MenuBadgeLabel) ? (normalized as MenuBadgeLabel) : null;
}

export function normalizeBadgeLabelForSave(
  selectedValue: FormDataEntryValue | string | null | undefined,
  customValue: FormDataEntryValue | string | null | undefined,
): string | null {
  if (typeof selectedValue !== "string") return null;

  const selected = selectedValue.trim();
  if (!selected || selected === "none") return null;

  if (selected === MENU_BADGE_CUSTOM_VALUE) {
    const customLabel = typeof customValue === "string" ? customValue.trim() : "";
    if (!customLabel) return null;
    if (customLabel.length > MENU_BADGE_MAX_LENGTH) {
      throw new Error(`배지 문구는 최대 ${MENU_BADGE_MAX_LENGTH}자까지 입력할 수 있습니다.`);
    }
    return customLabel;
  }

  const defaultLabel = normalizeMenuBadgeLabel(selected);
  return defaultLabel;
}

export function getLegacyBadgeTypeForLabel(label: string | null): BadgeType | null {
  if (!label) return null;

  if (label === "추천") return "recommend";
  if (label === "인기") return "popular";
  if (label === "BEST") return "best";
  if (label === "SIGNATURE") return "signature";
  if (label === "대표") return "signature";
  if (label === "한정") return "event";
  if (label === "이벤트") return "event";
  if (label === "신규") return "recommend";
  if (label === "시즌") return "event";

  return null;
}

export function getMenuItemBadgeLabel(item: BadgeableMenuItem): string {
  const normalizedLabel = normalizeMenuBadgeLabel(item.badge_label);

  if (normalizedLabel) {
    return normalizedLabel;
  }

  if (typeof item.badge_label === "string" && item.badge_label.trim()) {
    return item.badge_label.trim();
  }

  const badgeType = getMenuItemBadgeType(item);
  if (badgeType === "none") {
    return "";
  }

  if (badgeType === "best") return "BEST";
  if (badgeType === "signature") return "SIGNATURE";
  if (badgeType === "popular") return "인기";
  if (badgeType === "event") return "한정";

  return "추천";
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
  return Boolean(getMenuItemBadgeLabel(item)) || getMenuItemBadgeType(item) !== "none";
}
