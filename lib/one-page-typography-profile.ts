import type { MenuPreviewDevice } from "./menu-preview-devices";

export type OnePageTypographyProfileKey = "standard" | "heavy-display";

type OnePageTypographyProfile = {
  key: OnePageTypographyProfileKey;
};

const ONE_PAGE_ITEM_NAME_CEILING_REM: Partial<Record<MenuPreviewDevice, number>> = {
  pc: 1.35,
  tablet: 1.3,
};

const ONE_PAGE_TYPOGRAPHY_PROFILES: Record<OnePageTypographyProfileKey, OnePageTypographyProfile> = {
  standard: {
    key: "standard",
  },
  "heavy-display": {
    key: "heavy-display",
  },
};

const ONE_PAGE_TYPOGRAPHY_PROFILE_BY_TEMPLATE: Record<string, OnePageTypographyProfileKey> = {
  fast_food_loop_bagel_a: "heavy-display",
};

export function getOnePageTypographyProfile(templateKey: string | null | undefined): OnePageTypographyProfile {
  return ONE_PAGE_TYPOGRAPHY_PROFILES[ONE_PAGE_TYPOGRAPHY_PROFILE_BY_TEMPLATE[templateKey ?? ""] ?? "standard"];
}

export function getOnePageItemNameCeilingRem(
  device: MenuPreviewDevice,
): number | undefined {
  return ONE_PAGE_ITEM_NAME_CEILING_REM[device];
}
