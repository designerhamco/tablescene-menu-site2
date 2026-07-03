import "server-only";

import { DISPLAY_VIDEO_UPLOAD_ADDON_KEY, hasDisplayVideoUploadAddon } from "@/lib/display-video-upload-policy";
import { displayPaymentProducts } from "@/lib/payments";
import type { MenuSiteAccessState } from "@/lib/server/menu-site-access-service";

export const DISPLAY_VIDEO_UPLOAD_QA_FLAG = "ENABLE_DISPLAY_VIDEO_UPLOAD_QA";

type DisplayVideoUploadAccessOptions = {
  templateKey: string | null | undefined;
  productKey?: string | null;
  accessState?: MenuSiteAccessState | null;
  addonKeys?: readonly string[] | null;
};

export type DisplayVideoUploadAccessResult = {
  canUse: boolean;
  reason: "addon" | "qa_flag" | "locked" | "not_display";
  addonKey: typeof DISPLAY_VIDEO_UPLOAD_ADDON_KEY;
  qaEnabled: boolean;
};

const displayProductKeys = new Set(displayPaymentProducts.map((product) => product.product_key));

export function isDisplayVideoUploadQaEnabled() {
  return process.env.NODE_ENV !== "production" && process.env[DISPLAY_VIDEO_UPLOAD_QA_FLAG] === "true";
}

export function getDisplayVideoUploadAccess({
  templateKey,
  productKey,
  accessState,
  addonKeys,
}: DisplayVideoUploadAccessOptions): DisplayVideoUploadAccessResult {
  const qaEnabled = isDisplayVideoUploadQaEnabled();
  const isDisplayTemplate = templateKey === "display_menu_a";
  const isDisplayProduct = productKey ? displayProductKeys.has(productKey as (typeof displayPaymentProducts)[number]["product_key"]) : false;
  const hasActiveDisplayAccess = Boolean(isDisplayTemplate && isDisplayProduct && accessState?.reason === "active" && accessState.canEdit);

  if (!hasActiveDisplayAccess) {
    return {
      canUse: false,
      reason: "not_display",
      addonKey: DISPLAY_VIDEO_UPLOAD_ADDON_KEY,
      qaEnabled,
    };
  }

  if (hasDisplayVideoUploadAddon(addonKeys)) {
    return {
      canUse: true,
      reason: "addon",
      addonKey: DISPLAY_VIDEO_UPLOAD_ADDON_KEY,
      qaEnabled,
    };
  }

  if (qaEnabled) {
    return {
      canUse: true,
      reason: "qa_flag",
      addonKey: DISPLAY_VIDEO_UPLOAD_ADDON_KEY,
      qaEnabled,
    };
  }

  return {
    canUse: false,
    reason: "locked",
    addonKey: DISPLAY_VIDEO_UPLOAD_ADDON_KEY,
    qaEnabled,
  };
}
