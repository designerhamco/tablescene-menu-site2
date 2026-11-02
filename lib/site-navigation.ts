export type SiteNavItem = { label: string; path: string; activePaths?: readonly string[]; disabled?: boolean };

export const SITE_NAV_ITEMS: readonly SiteNavItem[] = [
  { label: "베이직", path: "/services/basic", activePaths: ["/services/basic", "/services/menu", "/services/signature"] },
  { label: "다이닝", path: "/services/dining", activePaths: ["/services/dining"] },
  { label: "디스플레이", path: "/services/display", activePaths: ["/services/display", "/services/screen", "/services/full-option", "/tablescene-pro"] },
  { label: "디자인 템플릿", path: "/templates", activePaths: ["/templates"] },
  { label: "고객센터", path: "/faq", activePaths: ["/faq", "/guides", "/support/chat"] },
];

export function isSiteNavItemActive(item: SiteNavItem, pathname: string) {
  return (item.activePaths ?? [item.path]).some(path => pathname === path || pathname.startsWith(`${path}/`));
}

export type NavigationAccount = { name: string | null; email: string; role: "사장" | "직원" | null };

/** Display label only; access enforcement stays in the existing server services. */
export function getNavigationRole(sites: readonly { isOwner: boolean; memberRole?: string | null }[]): NavigationAccount["role"] {
  return sites.some(site => site.isOwner) ? "사장" : sites.some(site => !site.isOwner && site.memberRole) ? "직원" : null;
}
