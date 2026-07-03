import type { Json } from "@/lib/supabase/types";

export type DisplayPageType = "menu" | "promotion";
export type DisplayMenuLayoutType = "full_menu" | "split_image_menu";
export type DisplayMediaType = "image" | "video";
export type DisplayVideoSource = "url" | "upload";
export type DisplaySplitImagePosition = "left" | "right";

export type MenuPageDisplaySettings = {
  pageType: DisplayPageType;
  menuLayoutType: DisplayMenuLayoutType | null;
  splitImagePosition: DisplaySplitImagePosition;
  splitImage: {
    url: string | null;
    path: string | null;
    title: string | null;
    description: string | null;
    position: DisplaySplitImagePosition;
  };
  promotion: {
    title: string | null;
    description: string | null;
    mediaType: DisplayMediaType;
    mediaUrl: string | null;
    mediaPath: string | null;
    videoUrl: string | null;
    videoPath: string | null;
    videoSource: DisplayVideoSource | null;
    videoLoop: true;
  };
};

export const DISPLAY_PAGE_TYPES = ["menu", "promotion"] as const satisfies readonly DisplayPageType[];
export const DISPLAY_MENU_LAYOUT_TYPES = ["full_menu", "split_image_menu"] as const satisfies readonly DisplayMenuLayoutType[];
export const DISPLAY_PROMOTION_MEDIA_TYPES = ["image", "video"] as const satisfies readonly DisplayMediaType[];

export const DEFAULT_MENU_PAGE_DISPLAY_SETTINGS: MenuPageDisplaySettings = {
  pageType: "menu",
  menuLayoutType: "full_menu",
  splitImagePosition: "left",
  splitImage: {
    url: null,
    path: null,
    title: null,
    description: null,
    position: "left",
  },
  promotion: {
    title: null,
    description: null,
    mediaType: "image",
    mediaUrl: null,
    mediaPath: null,
    videoUrl: null,
    videoPath: null,
    videoSource: null,
    videoLoop: true,
  },
};

export const DEFAULT_PROMOTION_PAGE_DISPLAY_SETTINGS: MenuPageDisplaySettings = {
  ...DEFAULT_MENU_PAGE_DISPLAY_SETTINGS,
  pageType: "promotion",
  menuLayoutType: null,
};

export function getDisplayPageTypeLabel(type: DisplayPageType) {
  return type === "promotion" ? "프로모션 페이지" : "메뉴 페이지";
}

export function getDisplayMenuLayoutTypeLabel(type: DisplayMenuLayoutType) {
  return type === "split_image_menu" ? "이미지 + 메뉴 분할형" : "전체 메뉴형";
}

export function getDisplayPromotionMediaTypeLabel(type: DisplayMediaType) {
  return type === "video" ? "영상 링크" : "이미지";
}

export function isPromotionDisplayPage(settings: MenuPageDisplaySettings) {
  return settings.pageType === "promotion";
}

export function isMenuDisplayPage(settings: MenuPageDisplaySettings) {
  return settings.pageType === "menu";
}

export function normalizeMenuPageDisplaySettings(input: unknown): MenuPageDisplaySettings {
  const source = isRecord(input) ? input : {};
  const pageType = source.pageType === "promotion" ? "promotion" : "menu";
  const menuLayoutType: DisplayMenuLayoutType | null =
    pageType === "promotion"
      ? null
      : source.menuLayoutType === "split_image_menu"
        ? "split_image_menu"
        : "full_menu";
  const splitImage = isRecord(source.splitImage) ? source.splitImage : {};
  const promotion = isRecord(source.promotion) ? source.promotion : {};
  const promotionMediaType: DisplayMediaType = promotion.mediaType === "video" ? "video" : "image";
  const promotionVideoUrl = normalizeOptionalString(promotion.videoUrl ?? promotion.mediaUrl);
  const promotionVideoPath = normalizeOptionalString(promotion.videoPath);
  const promotionVideoSource = getNormalizedVideoSource(
    pageType === "promotion" && promotionMediaType === "video" ? promotion.videoSource : null,
    promotionVideoUrl,
    promotionVideoPath
  );
  const splitImagePosition: DisplaySplitImagePosition =
    pageType === "menu" && menuLayoutType === "split_image_menu" && source.splitImagePosition === "right" ? "right" : "left";

  return {
    pageType,
    menuLayoutType,
    splitImagePosition,
    splitImage: {
      url: pageType === "menu" && menuLayoutType === "split_image_menu" ? normalizeOptionalString(splitImage.url) : null,
      path: pageType === "menu" && menuLayoutType === "split_image_menu" ? normalizeOptionalString(splitImage.path) : null,
      title: pageType === "menu" && menuLayoutType === "split_image_menu" ? normalizeOptionalString(splitImage.title) : null,
      description: pageType === "menu" && menuLayoutType === "split_image_menu" ? normalizeOptionalString(splitImage.description) : null,
      position: "left",
    },
    promotion: {
      title: pageType === "promotion" ? normalizeOptionalString(promotion.title) : null,
      description: pageType === "promotion" ? normalizeOptionalString(promotion.description) : null,
      mediaType: promotionMediaType,
      mediaUrl: pageType === "promotion" && promotionMediaType === "image" ? normalizeOptionalString(promotion.mediaUrl) : null,
      mediaPath: pageType === "promotion" && promotionMediaType === "image" ? normalizeOptionalString(promotion.mediaPath) : null,
      videoUrl: pageType === "promotion" && promotionMediaType === "video" ? promotionVideoUrl : null,
      videoPath: pageType === "promotion" && promotionMediaType === "video" ? promotionVideoPath : null,
      videoSource: promotionVideoSource,
      videoLoop: true,
    },
  };
}

export function serializeMenuPageDisplaySettings(settings: MenuPageDisplaySettings): Json {
  return normalizeMenuPageDisplaySettings(settings) as unknown as Json;
}

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmedValue = value.trim();
  return trimmedValue || null;
}

function getNormalizedVideoSource(value: unknown, videoUrl: string | null, videoPath: string | null): DisplayVideoSource | null {
  if (value === "upload") return videoPath ? "upload" : null;
  if (value === "url") return "url";
  if (videoUrl) return "url";
  return null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
