import assert from "node:assert/strict";
import test from "node:test";

import {
  DISPLAY_VIDEO_UPLOAD_MAX_ACTIVE_FILES,
  DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB,
  DISPLAY_VIDEO_UPLOAD_RECOMMENDED_DURATION,
  DISPLAY_VIDEO_UPLOAD_RECOMMENDED_FILE_SIZE_MB,
  isDisplayVideoUploadIncluded,
} from "./display-video-upload-policy";

test("활성 Display 월·연 구독에는 동영상 파일 업로드를 기본 포함한다", () => {
  for (const productKey of ["business_display_monthly", "business_display_yearly"]) {
    assert.equal(
      isDisplayVideoUploadIncluded({
        templateKey: "display_menu_a",
        productKey,
        accessReason: "active",
        canEdit: true,
      }),
      true,
    );
  }
});

test("다른 서비스·비활성 lifecycle·읽기 전용 접근은 fail closed 한다", () => {
  const cases = [
    { templateKey: "cafe_design_a", productKey: "business_display_monthly", accessReason: "active", canEdit: true },
    { templateKey: "display_menu_a", productKey: "business_basic_single_monthly", accessReason: "active", canEdit: true },
    { templateKey: "display_menu_a", productKey: "business_display_monthly", accessReason: "inactive_entitlement", canEdit: true },
    { templateKey: "display_menu_a", productKey: "business_display_monthly", accessReason: "active", canEdit: false },
  ] as const;

  cases.forEach((input) => assert.equal(isDisplayVideoUploadIncluded(input), false));
});

test("초기 비용 보호용 동영상 제한을 고정한다", () => {
  assert.equal(DISPLAY_VIDEO_UPLOAD_MAX_ACTIVE_FILES, 2);
  assert.equal(DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB, 30);
  assert.equal(DISPLAY_VIDEO_UPLOAD_RECOMMENDED_FILE_SIZE_MB, 20);
  assert.equal(DISPLAY_VIDEO_UPLOAD_RECOMMENDED_DURATION, "5~15초");
});
