import type { MenuPreviewDevice } from "@/lib/menu-preview-devices";
import type { PageSettings } from "@/types/menu";

type MenuCoverDeviceVisibilitySettings = Pick<
  PageSettings,
  "menu_cover_visible_pc" | "menu_cover_visible_tablet" | "menu_cover_visible_mobile"
>;

export function isMenuCoverVisibleOnDevice(
  settings: Partial<MenuCoverDeviceVisibilitySettings> | null | undefined,
  device: MenuPreviewDevice,
) {
  const key = `menu_cover_visible_${device}` as const;
  return settings?.[key] !== false;
}

export function getMenuCoverResponsiveVisibilityClassName(
  settings: Partial<MenuCoverDeviceVisibilitySettings> | null | undefined,
) {
  const mobile = isMenuCoverVisibleOnDevice(settings, "mobile");
  const tablet = isMenuCoverVisibleOnDevice(settings, "tablet");
  const pc = isMenuCoverVisibleOnDevice(settings, "pc");
  const visibilityKey = `${Number(mobile)}${Number(tablet)}${Number(pc)}`;

  return {
    "000": "hidden",
    "001": "hidden xl:block",
    "010": "hidden md:block xl:hidden",
    "011": "hidden md:block",
    "100": "block md:hidden",
    "101": "block md:hidden xl:block",
    "110": "block xl:hidden",
    "111": "block",
  }[visibilityKey] ?? "block";
}
