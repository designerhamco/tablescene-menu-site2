import { displayPaymentProducts } from "@/lib/payments";
import { isTemplateSupportedForService } from "@/lib/template-types";

export const DISPLAY_VIDEO_UPLOAD_NAME = "동영상 파일 업로드";
export const DISPLAY_VIDEO_UPLOAD_MAX_ACTIVE_FILES = 2;
export const DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB = 30;
export const DISPLAY_VIDEO_UPLOAD_RECOMMENDED_FILE_SIZE_MB = 20;
export const DISPLAY_VIDEO_UPLOAD_ACCEPTED_MIME_TYPES = ["video/mp4"] as const;
export const DISPLAY_VIDEO_UPLOAD_RECOMMENDED_DURATION = "5~15초";

const displayProductKeys = new Set(displayPaymentProducts.map((product) => product.product_key));

export function isDisplayVideoUploadIncluded({
  templateKey,
  productKey,
  accessReason,
  canEdit,
}: {
  templateKey: string | null | undefined;
  productKey: string | null | undefined;
  accessReason: string | null | undefined;
  canEdit: boolean | null | undefined;
}) {
  return Boolean(
    isTemplateSupportedForService(templateKey, "display") &&
      productKey &&
      displayProductKeys.has(productKey as (typeof displayPaymentProducts)[number]["product_key"]) &&
      accessReason === "active" &&
      canEdit,
  );
}
