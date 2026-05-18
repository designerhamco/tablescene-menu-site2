const DEFAULT_AUTH_REDIRECT_PATH = "/mypage";

export function getSafeAuthRedirectPath(value: string | null | undefined) {
  const path = value?.trim();

  if (!path || !path.startsWith("/") || path.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }

  try {
    const parsedUrl = new URL(path, "http://tablescene.local");

    if (parsedUrl.origin !== "http://tablescene.local") {
      return DEFAULT_AUTH_REDIRECT_PATH;
    }

    return `${parsedUrl.pathname}${parsedUrl.search}${parsedUrl.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT_PATH;
  }
}
