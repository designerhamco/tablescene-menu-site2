import { NextResponse } from "next/server";

import {
  DISPLAY_VIDEO_UPLOAD_ACCEPTED_MIME_TYPES,
  DISPLAY_VIDEO_UPLOAD_MAX_ACTIVE_FILES,
  DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB,
} from "@/lib/display-video-upload-policy";
import { normalizeMenuPageDisplaySettings } from "@/lib/display-page-settings";
import { getDisplayVideoUploadAccess } from "@/lib/server/display-video-upload-access";
import { getMenuSiteAccessStateForMenuSite, MENU_SITE_INACTIVE_EDIT_MESSAGE } from "@/lib/server/menu-site-access-service";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const BUCKET = "menu-videos";
const MEGABYTE = 1024 * 1024;
const MAX_FILE_SIZE_BYTES = DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB * MEGABYTE;

type MenuPageRow = {
  id: string;
  display_settings: unknown;
};

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isAcceptedMp4File(file: File) {
  const filename = file.name.trim().toLowerCase();
  return (DISPLAY_VIDEO_UPLOAD_ACCEPTED_MIME_TYPES as readonly string[]).includes(file.type) && filename.endsWith(".mp4");
}

function getVideoPath(menuId: string, pageId: string) {
  return `menu-sites/${menuId}/draft/display-videos/${pageId}-${crypto.randomUUID()}.mp4`;
}

function countStoredUploadedVideos(pages: MenuPageRow[]) {
  const paths = new Set<string>();

  pages.forEach((page) => {
    const settings = normalizeMenuPageDisplaySettings(page.display_settings);
    const videoPath = settings.promotion.videoPath;

    if (settings.promotion.videoSource === "upload" || videoPath) {
      if (videoPath) paths.add(videoPath);
    }
  });

  return paths.size;
}

function getStoredUploadPathForPage(page: MenuPageRow) {
  const settings = normalizeMenuPageDisplaySettings(page.display_settings);
  return settings.promotion.videoSource === "upload" || settings.promotion.videoPath ? settings.promotion.videoPath : null;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const formData = await request.formData();
  const file = formData.get("file");
  const menuId = getString(formData.get("menuId"));
  const pageId = getString(formData.get("pageId"));

  if (!menuId) {
    return jsonError("menuId가 없습니다.");
  }

  if (!pageId) {
    return jsonError("pageId가 없습니다.");
  }

  if (!(file instanceof File)) {
    return jsonError("업로드할 파일이 없습니다.");
  }

  if (!isAcceptedMp4File(file)) {
    return jsonError("MP4 파일만 업로드할 수 있습니다.");
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return jsonError(`동영상 파일은 최대 ${DISPLAY_VIDEO_UPLOAD_MAX_FILE_SIZE_MB}MB까지 업로드할 수 있습니다.`, 413);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  const { data: menuSite, error: menuSiteError } = await supabase
    .from("menu_sites")
    .select("id, user_id, slug, template_key")
    .eq("id", menuId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (menuSiteError) {
    return jsonError(`메뉴판 권한 확인에 실패했습니다: ${menuSiteError.message}`, 500);
  }

  if (!menuSite) {
    return jsonError("메뉴판을 찾을 수 없거나 권한이 없습니다.", 404);
  }

  const accessState = await getMenuSiteAccessStateForMenuSite({ menuSiteId: menuId, userId: user.id });

  if (!accessState?.canUseWriteActions) {
    return jsonError(MENU_SITE_INACTIVE_EDIT_MESSAGE, 403);
  }

  const { data: orderData, error: orderError } = await supabase
    .from("orders")
    .select("product_key")
    .eq("menu_site_id", menuId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (orderError) {
    return jsonError(`구독 상품 확인에 실패했습니다: ${orderError.message}`, 500);
  }

  const videoUploadAccess = getDisplayVideoUploadAccess({
    templateKey: menuSite.template_key,
    productKey: orderData?.product_key,
    accessState,
    addonKeys: null,
  });

  if (!videoUploadAccess.canUse) {
    return jsonError("동영상 파일 직접 업로드 권한이 없습니다.", 403);
  }

  const { data: page, error: pageError } = await supabase
    .from("menu_pages")
    .select("id, display_settings")
    .eq("id", pageId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (pageError) {
    return jsonError(`메뉴판 페이지 확인에 실패했습니다: ${pageError.message}`, 500);
  }

  if (!page) {
    return jsonError("해당 메뉴판 페이지를 찾을 수 없습니다.", 404);
  }

  const { data: pagesData, error: pagesError } = await supabase
    .from("menu_pages")
    .select("id, display_settings")
    .eq("menu_site_id", menuId);

  if (pagesError) {
    return jsonError(`동영상 업로드 개수 확인에 실패했습니다: ${pagesError.message}`, 500);
  }

  const storedUploadedVideoCount = countStoredUploadedVideos((pagesData ?? []) as MenuPageRow[]);
  const currentPageUploadPath = getStoredUploadPathForPage(page as MenuPageRow);

  if (storedUploadedVideoCount >= DISPLAY_VIDEO_UPLOAD_MAX_ACTIVE_FILES && !currentPageUploadPath) {
    return jsonError("이 메뉴판에 업로드할 수 있는 동영상 수를 초과했습니다.", 400);
  }

  const path = getVideoPath(menuId, pageId);
  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, bytes, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    return jsonError(`동영상 업로드에 실패했습니다: ${uploadError.message}`, 500);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(path);

  return NextResponse.json({
    ok: true,
    path,
    publicUrl,
    size: file.size,
    contentType: file.type,
  });
}
