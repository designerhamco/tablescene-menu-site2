export const IMAGE_UPLOAD_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type ImageUploadTarget =
  | "site-logo"
  | "site-logo-draft"
  | "site-cover"
  | "site-cover-draft"
  | "site-intro-image-draft"
  | "display-page-image-draft"
  | "menu-item"
  | "menu-item-draft"
  | "menu-event"
  | "menu-chef";

type ImageUploadPolicy = {
  maxBytes: number;
  label: string;
  tooLargeMessage: string;
  invalidTypeMessage: string;
};

const MEGABYTE = 1024 * 1024;

export const IMAGE_UPLOAD_LIMITS = {
  logo: {
    maxBytes: 2 * MEGABYTE,
    label: "PNG, JPG, WebP / 최대 2MB",
    tooLargeMessage: "로고 이미지는 최대 2MB까지 업로드할 수 있습니다.",
    invalidTypeMessage: "PNG, JPG, WebP 형식의 이미지만 업로드할 수 있습니다.",
  },
  menuItem: {
    maxBytes: 5 * MEGABYTE,
    label: "JPG, PNG, WebP / 최대 5MB",
    tooLargeMessage: "메뉴 아이템 이미지는 최대 5MB까지 업로드할 수 있습니다.",
    invalidTypeMessage: "JPG, PNG, WebP 이미지만 업로드할 수 있습니다.",
  },
  standardImage: {
    maxBytes: 5 * MEGABYTE,
    label: "JPG, PNG, WebP / 최대 5MB",
    tooLargeMessage: "이미지는 최대 5MB까지 업로드할 수 있습니다.",
    invalidTypeMessage: "JPG, PNG, WebP 이미지만 업로드할 수 있습니다.",
  },
  displayPageImage: {
    maxBytes: 10 * MEGABYTE,
    label: "JPG, PNG, WebP / 최대 10MB",
    tooLargeMessage: "디스플레이 이미지는 최대 10MB까지 업로드할 수 있습니다.",
    invalidTypeMessage: "JPG, PNG, WebP 이미지만 업로드할 수 있습니다.",
  },
} as const satisfies Record<string, ImageUploadPolicy>;

export function isAllowedImageUploadMimeType(value: string) {
  return (IMAGE_UPLOAD_ALLOWED_MIME_TYPES as readonly string[]).includes(value);
}

export function getImageUploadPolicy(target: ImageUploadTarget): ImageUploadPolicy {
  if (target === "site-logo" || target === "site-logo-draft") return IMAGE_UPLOAD_LIMITS.logo;
  if (target === "menu-item" || target === "menu-item-draft") return IMAGE_UPLOAD_LIMITS.menuItem;
  if (target === "display-page-image-draft") return IMAGE_UPLOAD_LIMITS.displayPageImage;
  return IMAGE_UPLOAD_LIMITS.standardImage;
}

export function validateImageUploadFile(file: { type: string; size: number }, target: ImageUploadTarget) {
  const policy = getImageUploadPolicy(target);

  if (!isAllowedImageUploadMimeType(file.type)) {
    return policy.invalidTypeMessage;
  }

  if (file.size > policy.maxBytes) {
    return policy.tooLargeMessage;
  }

  return null;
}
