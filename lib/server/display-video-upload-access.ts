import "server-only";

import { isDisplayVideoUploadIncluded } from "@/lib/display-video-upload-policy";
import type { MenuSiteAccessState } from "@/lib/server/menu-site-access-service";

type DisplayVideoUploadAccessOptions = {
  templateKey: string | null | undefined;
  productKey?: string | null;
  accessState?: MenuSiteAccessState | null;
};

export type DisplayVideoUploadAccessResult = {
  canUse: boolean;
  reason: "included" | "not_display";
};

export function getDisplayVideoUploadAccess({
  templateKey,
  productKey,
  accessState,
}: DisplayVideoUploadAccessOptions): DisplayVideoUploadAccessResult {
  const hasActiveDisplayAccess = isDisplayVideoUploadIncluded({
    templateKey,
    productKey,
    accessReason: accessState?.reason,
    canEdit: accessState?.canEdit,
  });

  if (!hasActiveDisplayAccess) {
    return {
      canUse: false,
      reason: "not_display",
    };
  }

  return {
    canUse: true,
    reason: "included",
  };
}
