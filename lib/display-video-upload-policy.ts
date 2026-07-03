export const DISPLAY_VIDEO_UPLOAD_ADDON_KEY = "display_video_file_upload";
export const DISPLAY_VIDEO_UPLOAD_ADDON_NAME = "동영상 파일 직접 업로드";
export const DISPLAY_VIDEO_UPLOAD_MONTHLY_PRICE = 4_900;
export const DISPLAY_VIDEO_UPLOAD_YEARLY_PRICE = 49_900;
export const DISPLAY_VIDEO_UPLOAD_MAX_ACTIVE_FILES = 2;
export const DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB = 30;
export const DISPLAY_VIDEO_UPLOAD_RECOMMENDED_FILE_SIZE_MB = 20;
export const DISPLAY_VIDEO_UPLOAD_ACCEPTED_MIME_TYPES = ["video/mp4"] as const;
export const DISPLAY_VIDEO_UPLOAD_RECOMMENDED_DURATION = "5~15초";

export function hasDisplayVideoUploadAddon(addonKeys?: readonly string[] | null) {
  return Boolean(addonKeys?.includes(DISPLAY_VIDEO_UPLOAD_ADDON_KEY));
}
