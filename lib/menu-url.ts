export function getPublicMenuPath(slug: string) {
  return `/menu/${encodeURIComponent(slug)}`;
}

export function getLegacyMenuPath(slug: string) {
  return `/m/${encodeURIComponent(slug)}`;
}

export function getPublicMenuUrl(slug: string) {
  const baseUrl = process.env.NEXT_PUBLIC_MENU_BASE_URL?.replace(/\/+$/, "") || "/menu";

  if (baseUrl.startsWith("http://") || baseUrl.startsWith("https://")) {
    return `${baseUrl}/${encodeURIComponent(slug)}`;
  }

  return `${baseUrl}/${encodeURIComponent(slug)}`;
}
