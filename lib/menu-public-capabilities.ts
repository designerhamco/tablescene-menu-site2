import { getMenuEditorServiceType, type MenuEditorServiceType } from "@/lib/menu-editor-capabilities";

export type MenuPublicCapabilities = {
  introPage: boolean;
  menuCoverPage: boolean;
  menuPages: boolean;
  aboutPage: boolean;
  eventPage: boolean;
  chefs: boolean;
  socialLinks: boolean;
};

export const MENU_PUBLIC_CAPABILITIES = {
  menu: {
    introPage: false,
    menuCoverPage: true,
    menuPages: true,
    aboutPage: false,
    eventPage: false,
    chefs: false,
    socialLinks: false,
  },
  screen: {
    introPage: false,
    menuCoverPage: true,
    menuPages: true,
    aboutPage: false,
    eventPage: false,
    chefs: false,
    socialLinks: false,
  },
  order: {
    introPage: true,
    menuCoverPage: true,
    menuPages: true,
    aboutPage: true,
    eventPage: true,
    chefs: true,
    socialLinks: true,
  },
  custom: {
    introPage: false,
    menuCoverPage: false,
    menuPages: false,
    aboutPage: false,
    eventPage: false,
    chefs: false,
    socialLinks: false,
  },
  legacy: {
    introPage: true,
    menuCoverPage: true,
    menuPages: true,
    aboutPage: true,
    eventPage: true,
    chefs: true,
    socialLinks: true,
  },
} as const satisfies Record<MenuEditorServiceType, MenuPublicCapabilities>;

export function getMenuPublicServiceType(productKey?: string | null): MenuEditorServiceType {
  return getMenuEditorServiceType(productKey);
}

export function getMenuPublicCapabilities(serviceType?: MenuEditorServiceType | null) {
  return MENU_PUBLIC_CAPABILITIES[serviceType ?? "legacy"];
}
