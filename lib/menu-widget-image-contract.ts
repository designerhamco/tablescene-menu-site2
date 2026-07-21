import { validateImageUploadFile } from "@/lib/image-upload-policy";
import type { MenuWidgetType } from "@/lib/menu-widgets";
import { isUuid } from "@/lib/menu-widget-save-contract";

export const MENU_WIDGET_IMAGES_BUCKET = "menu-images";
export const MENU_WIDGET_IMAGE_CACHE_CONTROL = "31536000";
export const MENU_WIDGET_IMAGE_UPLOAD_TARGET = "menu-item-draft";
export const MENU_WIDGET_IMAGE_UPLOAD_TYPES = ["image", "image_text"] as const;
export const MENU_WIDGET_IMAGE_UPLOAD_EXTENSIONS = ["jpg", "png", "webp"] as const;

export type MenuWidgetImageUploadWidgetType = Extract<MenuWidgetType, "image" | "image_text">;
export type MenuWidgetImageUploadExtension = (typeof MENU_WIDGET_IMAGE_UPLOAD_EXTENSIONS)[number];
export type MenuWidgetImageUploadMimeType = "image/jpeg" | "image/png" | "image/webp";

export type MenuWidgetImageErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "UNSUPPORTED_TEMPLATE"
  | "INVALID_MENU_SITE"
  | "INVALID_MENU_PAGE"
  | "INVALID_WIDGET_ID"
  | "INVALID_WIDGET_TYPE"
  | "INVALID_FILE"
  | "INVALID_IMAGE_PATH"
  | "IMAGE_IN_USE"
  | "UPLOAD_FAILED"
  | "DELETE_FAILED"
  | "DATABASE_ERROR";

export type MenuWidgetImageError = {
  code: MenuWidgetImageErrorCode;
  message: string;
  field?: string;
};

export type MenuWidgetImageUploadResult =
  | {
      ok: true;
      imageUrl: string;
      imagePath: string;
    }
  | {
      ok: false;
      error: MenuWidgetImageError;
    };

export type MenuWidgetImageDeleteResult =
  | {
      ok: true;
      imagePath: string;
    }
  | {
      ok: false;
      error: MenuWidgetImageError;
    };

export function isMenuWidgetImageUploadWidgetType(value: unknown): value is MenuWidgetImageUploadWidgetType {
  return value === "image" || value === "image_text";
}

export function getMenuWidgetImageUploadExtension(mimeType: string): MenuWidgetImageUploadExtension | null {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  return null;
}

export function getMenuWidgetImageVersionPrefix(args: {
  menuSiteId: string;
  widgetId: string;
}) {
  return `menu-sites/${args.menuSiteId}/widgets/${args.widgetId}/versions/`;
}

export function createMenuWidgetImageVersionPath(args: {
  menuSiteId: string;
  widgetId: string;
  assetId: string;
  extension: MenuWidgetImageUploadExtension;
}) {
  return `${getMenuWidgetImageVersionPrefix(args)}${args.assetId}.${args.extension}`;
}

export function isMenuWidgetImageVersionPath(args: {
  menuSiteId: string;
  widgetId: string;
  imagePath: string | null | undefined;
}) {
  if (!args.imagePath) return false;
  const prefix = getMenuWidgetImageVersionPrefix(args);
  if (!args.imagePath.startsWith(prefix)) return false;
  const filename = args.imagePath.slice(prefix.length);
  const [assetId, extension, ...rest] = filename.split(".");
  return rest.length === 0 && isUuid(assetId) && isMenuWidgetImageUploadExtension(extension);
}

export function validateMenuWidgetImageUploadFile(file: { type: string; size: number }): MenuWidgetImageError | null {
  if (file.size <= 0) {
    return createMenuWidgetImageError("INVALID_FILE", "빈 이미지 파일은 업로드할 수 없습니다.", "file");
  }

  const validationMessage = validateImageUploadFile(file, MENU_WIDGET_IMAGE_UPLOAD_TARGET);
  if (validationMessage) {
    return createMenuWidgetImageError("INVALID_FILE", validationMessage, "file");
  }

  return null;
}

export function detectMenuWidgetImageMimeType(bytes: Uint8Array): MenuWidgetImageUploadMimeType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }

  return null;
}

export function validateMenuWidgetImageBytes(args: {
  bytes: Uint8Array;
  expectedMimeType: string;
}): MenuWidgetImageError | null {
  const detectedMimeType = detectMenuWidgetImageMimeType(args.bytes);
  if (!detectedMimeType || detectedMimeType !== args.expectedMimeType) {
    return createMenuWidgetImageError("INVALID_FILE", "이미지 파일만 업로드할 수 있습니다.", "file");
  }

  return null;
}

export function createMenuWidgetImageError(
  code: MenuWidgetImageErrorCode,
  message: string,
  field?: string,
): MenuWidgetImageError {
  return {
    code,
    message,
    ...(field ? { field } : {}),
  };
}

function isMenuWidgetImageUploadExtension(value: unknown): value is MenuWidgetImageUploadExtension {
  return (MENU_WIDGET_IMAGE_UPLOAD_EXTENSIONS as readonly unknown[]).includes(value);
}
