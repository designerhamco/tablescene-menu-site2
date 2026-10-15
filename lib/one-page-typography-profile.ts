import type { MenuPreviewDevice } from "./menu-preview-devices";

export type OnePageTypographyProfileKey = "standard" | "heavy-display";

type OnePageTypographyProfile = {
  key: OnePageTypographyProfileKey;
  itemNameCeilingRem: Partial<Record<MenuPreviewDevice, number>>;
};

const ONE_PAGE_TYPOGRAPHY_PROFILES: Record<OnePageTypographyProfileKey, OnePageTypographyProfile> = {
  standard: {
    key: "standard",
    itemNameCeilingRem: {},
  },
  "heavy-display": {
    key: "heavy-display",
    itemNameCeilingRem: { pc: 1.25 },
  },
};

const ONE_PAGE_TYPOGRAPHY_PROFILE_BY_TEMPLATE: Record<string, OnePageTypographyProfileKey> = {
  fast_food_loop_bagel_a: "heavy-display",
};

export function getOnePageTypographyProfile(templateKey: string | null | undefined): OnePageTypographyProfile {
  return ONE_PAGE_TYPOGRAPHY_PROFILES[ONE_PAGE_TYPOGRAPHY_PROFILE_BY_TEMPLATE[templateKey ?? ""] ?? "standard"];
}

export function getOnePageItemNameCeilingRem(
  profile: OnePageTypographyProfile,
  device: MenuPreviewDevice,
): number | undefined {
  return profile.itemNameCeilingRem[device];
}
