export function getPublicMenuPath(slug: string) {
  return `/menu/${encodeURIComponent(slug)}`;
}

export function getConfiguredPublicMenuOrigin() {
  const configured = process.env.NEXT_PUBLIC_PUBLIC_MENU_BASE_URL?.trim() || process.env.NEXT_PUBLIC_SITE_URL?.trim();
  try { return configured ? new URL(configured).origin : null; } catch { return null; }
}

export function formatPublicMenuPath(slug: string) {
  return getPublicMenuPath(slug);
}

export function getLegacyMenuPath(slug: string) {
  return `/m/${encodeURIComponent(slug)}`;
}

export function getPublicMenuUrl(slug: string) {
  const encodedSlug = encodeURIComponent(slug);
  const publicBaseUrl = process.env.NEXT_PUBLIC_PUBLIC_MENU_BASE_URL?.trim().replace(/\/+$/, "");

  if (publicBaseUrl) {
    return `${publicBaseUrl}/menu/${encodedSlug}`;
  }

  const legacyBaseUrl = process.env.NEXT_PUBLIC_MENU_BASE_URL?.trim().replace(/\/+$/, "");

  if (legacyBaseUrl) {
    return legacyBaseUrl.endsWith("/menu") ? `${legacyBaseUrl}/${encodedSlug}` : `${legacyBaseUrl}/menu/${encodedSlug}`;
  }

  return getPublicMenuPath(slug);
}
