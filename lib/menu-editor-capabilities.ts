import type { MenuEditorTabKey } from "@/lib/menu-editor";

export type MenuEditorServiceType = "menu" | "screen" | "order" | "custom" | "legacy";

export type MenuEditorCapabilities = {
  basicInfo: boolean;
  pageSettings: boolean;
  introPage: boolean;
  menuCoverPage: boolean;
  menuPages: boolean;
  canManageMenuPages: boolean;
  aboutPage: boolean;
  eventPage: boolean;
  chefs: boolean;
  socialLinks: boolean;
  design: boolean;
  localization: boolean;
  publish: boolean;
};

export const MENU_EDITOR_CAPABILITIES = {
  menu: {
    basicInfo: true,
    pageSettings: true,
    introPage: false,
    menuCoverPage: true,
    menuPages: true,
    canManageMenuPages: false,
    aboutPage: true,
    eventPage: true,
    chefs: true,
    socialLinks: true,
    design: true,
    localization: true,
    publish: true,
  },
  screen: {
    basicInfo: true,
    pageSettings: true,
    introPage: false,
    menuCoverPage: true,
    menuPages: true,
    canManageMenuPages: true,
    aboutPage: true,
    eventPage: true,
    chefs: true,
    socialLinks: true,
    design: true,
    localization: true,
    publish: true,
  },
  order: {
    basicInfo: true,
    pageSettings: true,
    introPage: true,
    menuCoverPage: true,
    menuPages: true,
    canManageMenuPages: true,
    aboutPage: true,
    eventPage: true,
    chefs: true,
    socialLinks: true,
    design: true,
    localization: true,
    publish: true,
  },
  custom: {
    basicInfo: false,
    pageSettings: false,
    introPage: false,
    menuCoverPage: false,
    menuPages: false,
    canManageMenuPages: false,
    aboutPage: false,
    eventPage: false,
    chefs: false,
    socialLinks: false,
    design: false,
    localization: false,
    publish: false,
  },
  legacy: {
    basicInfo: true,
    pageSettings: true,
    introPage: true,
    menuCoverPage: true,
    menuPages: true,
    canManageMenuPages: true,
    aboutPage: true,
    eventPage: true,
    chefs: true,
    socialLinks: true,
    design: true,
    localization: true,
    publish: true,
  },
} as const satisfies Record<MenuEditorServiceType, MenuEditorCapabilities>;

export function getMenuEditorServiceType(productKey?: string | null): MenuEditorServiceType {
  if (productKey === "basic") return "menu";
  if (productKey === "personal_trial_basic_1month") return "menu";
  if (productKey === "business_basic_monthly") return "menu";
  if (productKey === "business_basic_yearly") return "menu";
  if (productKey === "large_screen") return "screen";
  if (productKey === "business_display_monthly") return "screen";
  if (productKey === "business_display_yearly") return "screen";
  if (productKey === "qr_order") return "order";
  if (productKey === "custom") return "custom";

  return "legacy";
}

export function getMenuEditorServiceTypeForMenuSite(productKey?: string | null, templateType?: string | null): MenuEditorServiceType {
  if (productKey) return getMenuEditorServiceType(productKey);
  if (templateType === "menu") return "menu";

  return "legacy";
}

export function isMenuEditorTabEnabled(tabKey: MenuEditorTabKey, capabilities: MenuEditorCapabilities) {
  switch (tabKey) {
    case "basic":
      return capabilities.basicInfo;
    case "pages":
      return capabilities.pageSettings;
    case "intro":
      return capabilities.introPage;
    case "cover":
      return capabilities.menuCoverPage;
    case "menu":
      return capabilities.menuPages;
    case "schedule":
      return capabilities.menuPages;
    case "about":
      return capabilities.aboutPage;
    case "events":
      return capabilities.eventPage;
    case "design":
      return capabilities.design;
    case "localization":
      return capabilities.localization;
    case "publish":
      return capabilities.publish;
    default:
      return false;
  }
}
