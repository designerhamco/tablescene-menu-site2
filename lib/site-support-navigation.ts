export const SITE_SUPPORT_LINKS = [
  { label: "자주 묻는 질문", href: "/faq" },
  { label: "공지사항", href: "/faq/notices" },
  { label: "이용가이드", href: "/guides" },
] as const;

export function isSupportLinkActive(href: string, pathname: string) {
  return href === "/faq" ? pathname === href : pathname === href || pathname.startsWith(href + "/");
}
