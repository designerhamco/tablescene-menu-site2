import { NextResponse } from "next/server";

import {
  createMenuWidgetImageError,
  createMenuWidgetImageVersionPath,
  getMenuWidgetImageUploadExtension,
  isMenuWidgetImageUploadWidgetType,
  isMenuWidgetImageVersionPath,
  MENU_WIDGET_IMAGE_CACHE_CONTROL,
  MENU_WIDGET_IMAGES_BUCKET,
  validateMenuWidgetImageBytes,
  validateMenuWidgetImageUploadFile,
  type MenuWidgetImageDeleteResult,
  type MenuWidgetImageError,
  type MenuWidgetImageErrorCode,
  type MenuWidgetImageUploadResult,
} from "@/lib/menu-widget-image-contract";
import { isUuid } from "@/lib/menu-widget-save-contract";
import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { requireMenuSiteWriteAccess } from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTemplateCapabilities } from "@/lib/template-capabilities";

export const runtime = "nodejs";

type SupabaseServerClient = ReturnType<typeof createAdminClient>;

type MenuWidgetImageContext = {
  menuSiteId: string;
  widgetId: string;
  existingWidgetImagePath: string | null;
};

export async function POST(request: Request) {
  const formData = await request.formData();
  const menuSiteId = getString(formData.get("menuSiteId"));
  const menuPageId = getString(formData.get("menuPageId"));
  const widgetId = getString(formData.get("widgetId"));
  const widgetType = getString(formData.get("widgetType"));
  const previousUnsavedImagePath = getString(formData.get("previousUnsavedImagePath"));
  const file = formData.get("file");

  const contextResult = await requireMenuWidgetImageContext({
    menuSiteId,
    menuPageId,
    widgetId,
    widgetType,
  });
  if (!contextResult.ok) return jsonError(contextResult.error);
  const { supabase } = contextResult;

  if (!(file instanceof File)) {
    return jsonError(createMenuWidgetImageError("INVALID_FILE", "업로드할 이미지 파일이 없습니다.", "file"));
  }

  const fileError = validateMenuWidgetImageUploadFile(file);
  if (fileError) return jsonError(fileError);

  const extension = getMenuWidgetImageUploadExtension(file.type);
  if (!extension) {
    return jsonError(createMenuWidgetImageError("INVALID_FILE", "이미지 파일만 업로드할 수 있습니다.", "file"));
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const byteError = validateMenuWidgetImageBytes({
    bytes,
    expectedMimeType: file.type,
  });
  if (byteError) return jsonError(byteError);

  const nextPath = createMenuWidgetImageVersionPath({
    menuSiteId: contextResult.context.menuSiteId,
    widgetId: contextResult.context.widgetId,
    assetId: crypto.randomUUID(),
    extension,
  });

  const { error: uploadError } = await supabase.storage.from(MENU_WIDGET_IMAGES_BUCKET).upload(nextPath, bytes, {
    cacheControl: MENU_WIDGET_IMAGE_CACHE_CONTROL,
    contentType: file.type,
    upsert: false,
  });

  if (uploadError) {
    console.warn("[menu-widget-images] upload failed", {
      menuSiteId: contextResult.context.menuSiteId,
      widgetId: contextResult.context.widgetId,
      code: uploadError.name,
      message: uploadError.message,
    });
    return jsonError(createMenuWidgetImageError("UPLOAD_FAILED", "이미지 업로드 중 문제가 발생했습니다."), 500);
  }

  if (previousUnsavedImagePath) {
    const cleanupResult = await removePreviousUnsavedWidgetImageIfSafe({
      supabase,
      menuSiteId: contextResult.context.menuSiteId,
      widgetId: contextResult.context.widgetId,
      previousUnsavedImagePath,
      nextPath,
      currentDbImagePath: contextResult.context.existingWidgetImagePath,
    });

    if (!cleanupResult.ok) {
      console.warn("[menu-widget-images] previous unsaved cleanup skipped", {
        menuSiteId: contextResult.context.menuSiteId,
        widgetId: contextResult.context.widgetId,
        code: cleanupResult.error.code,
        field: cleanupResult.error.field,
      });
    }
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(MENU_WIDGET_IMAGES_BUCKET).getPublicUrl(nextPath);

  return NextResponse.json({
    ok: true,
    imageUrl: publicUrl,
    imagePath: nextPath,
  } satisfies MenuWidgetImageUploadResult);
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    menuSiteId?: unknown;
    widgetId?: unknown;
    imagePath?: unknown;
  } | null;
  const menuSiteId = typeof body?.menuSiteId === "string" ? body.menuSiteId.trim() : "";
  const widgetId = typeof body?.widgetId === "string" ? body.widgetId.trim() : "";
  const imagePath = typeof body?.imagePath === "string" ? body.imagePath.trim() : "";

  if (!imagePath) {
    return jsonError(createMenuWidgetImageError("INVALID_IMAGE_PATH", "삭제할 이미지 경로가 없습니다.", "imagePath"));
  }

  const contextResult = await requireMenuWidgetImageContext({
    menuSiteId,
    menuPageId: null,
    widgetId,
    widgetType: null,
  });
  if (!contextResult.ok) return jsonError(contextResult.error);
  const { supabase } = contextResult;

  const deleteSafety = await validateUnsavedWidgetImageRemoval({
    supabase,
    menuSiteId: contextResult.context.menuSiteId,
    widgetId: contextResult.context.widgetId,
    imagePath,
    currentDbImagePath: contextResult.context.existingWidgetImagePath,
  });
  if (!deleteSafety.ok) return jsonError(deleteSafety.error, deleteSafety.error.code === "IMAGE_IN_USE" ? 409 : 400);

  const { error: removeError } = await supabase.storage.from(MENU_WIDGET_IMAGES_BUCKET).remove([imagePath]);
  if (removeError) {
    console.warn("[menu-widget-images] delete failed", {
      menuSiteId: contextResult.context.menuSiteId,
      widgetId: contextResult.context.widgetId,
      code: removeError.name,
      message: removeError.message,
    });
    return jsonError(createMenuWidgetImageError("DELETE_FAILED", "이미지 삭제 중 문제가 발생했습니다."), 500);
  }

  return NextResponse.json({
    ok: true,
    imagePath,
  } satisfies MenuWidgetImageDeleteResult);
}

async function requireMenuWidgetImageContext(args: {
  menuSiteId: string;
  menuPageId: string | null;
  widgetId: string;
  widgetType: string | null;
}): Promise<
  | { ok: true; context: MenuWidgetImageContext; supabase: SupabaseServerClient }
  | { ok: false; error: MenuWidgetImageError }
> {
  if (!args.menuSiteId) {
    return imageFailure("INVALID_MENU_SITE", "menuSiteId가 없습니다.", "menuSiteId");
  }

  if (!isUuid(args.widgetId)) {
    return imageFailure("INVALID_WIDGET_ID", "위젯 ID가 올바르지 않습니다.", "widgetId");
  }

  if (args.widgetType !== null && !isMenuWidgetImageUploadWidgetType(args.widgetType)) {
    return imageFailure("INVALID_WIDGET_TYPE", "이미지형 위젯에서만 이미지를 업로드할 수 있습니다.", "widgetType");
  }

  let writeAccess: Awaited<ReturnType<typeof requireMenuSiteWriteAccess>>;
  try {
    writeAccess = await requireMenuSiteWriteAccess(args.menuSiteId, "menu.edit");
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      return imageFailure(
        error.code === "AUTH_REQUIRED" ? "UNAUTHENTICATED" : "FORBIDDEN",
        error.message,
        "menuSiteId",
      );
    }
    return imageFailure("DATABASE_ERROR", "메뉴판 권한을 확인하지 못했습니다.");
  }

  const { supabase } = writeAccess;

  const { data: menuSite, error: menuSiteError } = await supabase
    .from("menu_sites")
    .select("id, user_id, template_key")
    .eq("id", args.menuSiteId)
    .maybeSingle();

  if (menuSiteError) {
    console.warn("[menu-widget-images] menu site query failed", {
      menuSiteId: args.menuSiteId,
      code: menuSiteError.code,
      message: menuSiteError.message,
    });
    return imageFailure("DATABASE_ERROR", "메뉴판 권한을 확인하지 못했습니다.");
  }

  if (!menuSite) {
    return imageFailure("INVALID_MENU_SITE", "메뉴판을 찾을 수 없거나 권한이 없습니다.", "menuSiteId");
  }

  const capabilities = getTemplateCapabilities(menuSite.template_key);
  const supportsWidgetImageUploads =
    capabilities.menuWidgets.enabled &&
    (args.widgetType === null || capabilities.menuWidgets.supportedTypes.includes(args.widgetType));
  if (!supportsWidgetImageUploads) {
    return imageFailure("UNSUPPORTED_TEMPLATE", "이 메뉴판에는 위젯 이미지를 업로드할 수 없습니다.", "template");
  }

  if (args.menuPageId) {
    const { data: page, error: pageError } = await supabase
      .from("menu_pages")
      .select("id, menu_site_id")
      .eq("id", args.menuPageId)
      .maybeSingle();

    if (pageError) {
      console.warn("[menu-widget-images] menu page query failed", {
        menuSiteId: args.menuSiteId,
        menuPageId: args.menuPageId,
        code: pageError.code,
        message: pageError.message,
      });
      return imageFailure("DATABASE_ERROR", "메뉴 페이지를 확인하지 못했습니다.");
    }

    if (!page || page.menu_site_id !== args.menuSiteId) {
      return imageFailure("INVALID_MENU_PAGE", "메뉴 페이지가 해당 메뉴판에 속하지 않습니다.", "menuPageId");
    }
  }

  const widgetResult = await getExistingWidgetImagePath(supabase, args.widgetId, args.menuSiteId);
  if (!widgetResult.ok) return widgetResult;

  return {
    ok: true,
    supabase,
    context: {
      menuSiteId: args.menuSiteId,
      widgetId: args.widgetId,
      existingWidgetImagePath: widgetResult.imagePath,
    },
  };
}

async function getExistingWidgetImagePath(
  adminSupabase: SupabaseServerClient,
  widgetId: string,
  menuSiteId: string,
): Promise<
  | { ok: true; imagePath: string | null }
  | { ok: false; error: MenuWidgetImageError }
> {
  const { data: widget, error } = await adminSupabase
    .from("menu_widgets")
    .select("id, menu_site_id, image_path")
    .eq("id", widgetId)
    .maybeSingle();

  if (error) {
    console.warn("[menu-widget-images] widget query failed", {
      menuSiteId,
      widgetId,
      code: error.code,
      message: error.message,
    });
    return imageFailure("DATABASE_ERROR", "위젯 정보를 확인하지 못했습니다.");
  }

  if (widget && widget.menu_site_id !== menuSiteId) {
    return imageFailure("INVALID_WIDGET_ID", "위젯 ID가 해당 메뉴판에 속하지 않습니다.", "widgetId");
  }

  return {
    ok: true,
    imagePath: widget?.image_path ?? null,
  };
}

async function removePreviousUnsavedWidgetImageIfSafe(args: {
  supabase: SupabaseServerClient;
  menuSiteId: string;
  widgetId: string;
  previousUnsavedImagePath: string;
  nextPath: string;
  currentDbImagePath: string | null;
}) {
  if (args.previousUnsavedImagePath === args.nextPath) {
    return { ok: true as const };
  }

  const safety = await validateUnsavedWidgetImageRemoval({
    supabase: args.supabase,
    menuSiteId: args.menuSiteId,
    widgetId: args.widgetId,
    imagePath: args.previousUnsavedImagePath,
    currentDbImagePath: args.currentDbImagePath,
  });
  if (!safety.ok) return safety;

  const { error } = await args.supabase.storage.from(MENU_WIDGET_IMAGES_BUCKET).remove([args.previousUnsavedImagePath]);
  if (error) {
    return imageFailure("DELETE_FAILED", "이전 임시 이미지를 정리하지 못했습니다.");
  }

  return { ok: true as const };
}

async function validateUnsavedWidgetImageRemoval(args: {
  supabase: SupabaseServerClient;
  menuSiteId: string;
  widgetId: string;
  imagePath: string;
  currentDbImagePath: string | null;
}) {
  if (!isMenuWidgetImageVersionPath(args)) {
    return imageFailure("INVALID_IMAGE_PATH", "삭제할 수 없는 이미지 경로입니다.", "imagePath");
  }

  if (args.currentDbImagePath && args.currentDbImagePath === args.imagePath) {
    return imageFailure("IMAGE_IN_USE", "현재 저장된 이미지는 여기서 삭제할 수 없습니다.", "imagePath");
  }

  const { data, error } = await args.supabase
    .from("menu_widgets")
    .select("id")
    .eq("menu_site_id", args.menuSiteId)
    .eq("image_path", args.imagePath)
    .limit(1);

  if (error) {
    console.warn("[menu-widget-images] image reference query failed", {
      menuSiteId: args.menuSiteId,
      widgetId: args.widgetId,
      code: error.code,
      message: error.message,
    });
    return imageFailure("DATABASE_ERROR", "이미지 사용 여부를 확인하지 못했습니다.");
  }

  if ((data ?? []).length > 0) {
    return imageFailure("IMAGE_IN_USE", "현재 저장된 이미지는 여기서 삭제할 수 없습니다.", "imagePath");
  }

  return { ok: true as const };
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function jsonError(error: MenuWidgetImageError, status = getStatusForError(error.code)) {
  return NextResponse.json({
    ok: false,
    error,
  } satisfies MenuWidgetImageUploadResult | MenuWidgetImageDeleteResult, { status });
}

function getStatusForError(code: MenuWidgetImageErrorCode) {
  if (code === "UNAUTHENTICATED") return 401;
  if (code === "FORBIDDEN" || code === "UNSUPPORTED_TEMPLATE") return 403;
  if (code === "IMAGE_IN_USE") return 409;
  if (code === "DATABASE_ERROR" || code === "UPLOAD_FAILED" || code === "DELETE_FAILED") return 500;
  return 400;
}

function imageFailure(
  code: MenuWidgetImageErrorCode,
  message: string,
  field?: string,
): { ok: false; error: MenuWidgetImageError } {
  return {
    ok: false,
    error: createMenuWidgetImageError(code, message, field),
  };
}
