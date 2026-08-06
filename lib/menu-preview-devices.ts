export const MENU_PREVIEW_DEVICES = {
  pc: {
    label: "PC",
    width: 1440,
    height: 900,
  },
  tablet: {
    label: "태블릿",
    width: 820,
    height: 1180,
  },
  mobile: {
    label: "모바일",
    width: 390,
    height: 844,
  },
} as const;

export type MenuPreviewDevice = keyof typeof MENU_PREVIEW_DEVICES;

export type MenuPreviewQuery = {
  debugCafeA?: string;
  lang?: string;
  page?: string;
};

export function normalizeMenuPreviewDevice(value: string | undefined): MenuPreviewDevice {
  return value === "tablet" || value === "mobile" ? value : "pc";
}

export function buildMenuPreviewUrl(
  menuId: string,
  query: MenuPreviewQuery,
  options: { device?: MenuPreviewDevice; embedded?: boolean; actual?: boolean } = {},
) {
  const searchParams = new URLSearchParams();

  for (const key of ["lang", "page", "debugCafeA"] as const) {
    const value = query[key];
    if (value) searchParams.set(key, value);
  }

  if (options.device) searchParams.set("device", options.device);
  if (options.actual) searchParams.set("view", "actual");

  if (options.embedded) searchParams.set("embedded", "1");

  const queryString = searchParams.toString();
  const pathname = `/mypage/menus/${encodeURIComponent(menuId)}/preview`;
  return queryString ? `${pathname}?${queryString}` : pathname;
}
