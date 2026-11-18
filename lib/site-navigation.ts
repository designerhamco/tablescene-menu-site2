import { SERVICE_HOME_HREFS, SERVICE_HOME_SECTIONS } from "./service-home-navigation";

export type SiteNavItem = { label: string; path: string; sectionId?: string; activePaths?: readonly string[]; disabled?: boolean };

export const SITE_NAV_ITEMS: readonly SiteNavItem[] = [
  { label: "베이직", path: SERVICE_HOME_HREFS.basic, sectionId: SERVICE_HOME_SECTIONS.basic },
  { label: "다이닝", path: SERVICE_HOME_HREFS.dining, sectionId: SERVICE_HOME_SECTIONS.dining },
  { label: "디스플레이", path: SERVICE_HOME_HREFS.display, sectionId: SERVICE_HOME_SECTIONS.display },
  { label: "디자인 템플릿", path: "/templates", activePaths: ["/templates"] },
  { label: "고객센터", path: "/faq", activePaths: ["/faq", "/guides", "/support/chat"] },
];

export function isSiteNavItemActive(item: SiteNavItem, pathname: string, activeSection: string | null = null) {
  if (item.sectionId) return pathname === "/" && item.sectionId === activeSection;
  return (item.activePaths ?? [item.path]).some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export type NavigationAccount = { name: string | null; email: string; role: "사장" | "직원" | null };

/** Display label only; access enforcement stays in the existing server services. */
export function getNavigationRole(sites: readonly { isOwner: boolean; memberRole?: string | null }[]): NavigationAccount["role"] {
  return sites.some(site => site.isOwner) ? "사장" : sites.some(site => !site.isOwner && site.memberRole) ? "직원" : null;
}
