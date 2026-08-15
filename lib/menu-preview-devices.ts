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

export const MENU_PREVIEW_ORIENTATIONS = {
  portrait: "세로",
  landscape: "가로",
} as const;

export type MenuPreviewOrientation = keyof typeof MENU_PREVIEW_ORIENTATIONS;

export type MenuPreviewQuery = {
  debugCafeA?: string;
  lang?: string;
  page?: string;
};

export function normalizeMenuPreviewDevice(value: string | undefined): MenuPreviewDevice {
  return value === "tablet" || value === "mobile" ? value : "pc";
}

export function normalizeMenuPreviewOrientation(value: string | undefined): MenuPreviewOrientation {
  return value === "landscape" ? "landscape" : "portrait";
}

export function getMenuPreviewFrame(device: MenuPreviewDevice, orientation: MenuPreviewOrientation) {
  const frame = MENU_PREVIEW_DEVICES[device];

  if (device !== "tablet" || orientation === "portrait") return frame;

  return {
    ...frame,
    width: frame.height,
    height: frame.width,
  };
}

export function buildMenuPreviewUrl(
  menuId: string,
  query: MenuPreviewQuery,
  options: {
    device?: MenuPreviewDevice;
    orientation?: MenuPreviewOrientation;
    embedded?: boolean;
    actual?: boolean;
  } = {},
) {
  const searchParams = new URLSearchParams();

  for (const key of ["lang", "page", "debugCafeA"] as const) {
    const value = query[key];
    if (value) searchParams.set(key, value);
  }

  if (options.device) searchParams.set("device", options.device);
  if (options.device === "tablet" && options.orientation === "landscape") {
    searchParams.set("orientation", options.orientation);
  }
  if (options.actual) searchParams.set("view", "actual");

  if (options.embedded) searchParams.set("embedded", "1");

  const queryString = searchParams.toString();
  const pathname = `/mypage/menus/${encodeURIComponent(menuId)}/preview`;
  return queryString ? `${pathname}?${queryString}` : pathname;
}
