import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

import { MenuSiteAccessError } from "@/lib/menu-site-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  validateImageUploadFile,
  type ImageUploadTarget as SharedImageUploadTarget,
} from "@/lib/image-upload-policy";
import { getLegacyMenuPath, getPublicMenuPath } from "@/lib/menu-url";
import { requireMenuSiteWriteAccess } from "@/lib/server/menu-site-access-service";

export const runtime = "nodejs";

const BUCKET = "menu-images";

type ImageTarget = SharedImageUploadTarget;
type SupabaseDataClient = ReturnType<typeof createAdminClient>;
type PersistentImageTarget = Exclude<
  ImageTarget,
  "site-logo-draft" | "site-cover-draft" | "site-intro-image-draft" | "display-page-image-draft" | "menu-item-draft"
>;

type TargetRecord = {
  menuId: string;
  slug: string;
  imageUrl: string | null;
  imagePath: string | null;
};

function isImageTarget(value: string): value is ImageTarget {
  return (
    value === "site-logo" ||
    value === "site-logo-draft" ||
    value === "site-cover" ||
    value === "site-cover-draft" ||
    value === "site-intro-image-draft" ||
    value === "display-page-image-draft" ||
    value === "menu-item" ||
    value === "menu-item-draft" ||
    value === "menu-event" ||
    value === "menu-chef"
  );
}

function isDraftImageTarget(target: ImageTarget) {
  return (
    target === "site-logo-draft" ||
    target === "site-cover-draft" ||
    target === "site-intro-image-draft" ||
    target === "display-page-image-draft" ||
    target === "menu-item-draft"
  );
}

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

function getString(value: FormDataEntryValue | null) {
  return typeof value === "string" ? value.trim() : "";
}

function isSafeDraftRecordId(value: string) {
  return value.length <= 128 && /^[A-Za-z0-9_-]*$/.test(value);
}

function getExtension(file: File) {
  if (file.type === "image/jpeg") {
    return "jpg";
  }

  if (file.type === "image/png") {
    return "png";
  }

  if (file.type === "image/webp") {
    return "webp";
  }

  return "";
}

function getPath(target: ImageTarget, menuId: string, recordId: string, extension: string) {
  switch (target) {
    case "site-logo":
      return `menu-sites/${menuId}/brand/logo.${extension}`;
    case "site-logo-draft":
      return `menu-sites/${menuId}/draft/logo-${crypto.randomUUID()}.${extension}`;
    case "site-cover":
      return `menu-sites/${menuId}/brand/cover.${extension}`;
    case "site-cover-draft":
      return `menu-sites/${menuId}/draft/cover-${crypto.randomUUID()}.${extension}`;
    case "site-intro-image-draft":
      return `menu-sites/${menuId}/draft/intro-${crypto.randomUUID()}.${extension}`;
    case "display-page-image-draft":
      return `menu-sites/${menuId}/draft/display-pages/${recordId || "page"}-${crypto.randomUUID()}.${extension}`;
    case "menu-item":
      return `menu-sites/${menuId}/items/${recordId}/main.${extension}`;
    case "menu-item-draft":
      return `menu-sites/${menuId}/draft/items/${recordId || "item"}-${crypto.randomUUID()}.${extension}`;
    case "menu-event":
      return `menu-sites/${menuId}/events/${recordId}/main.${extension}`;
    case "menu-chef":
      return `menu-sites/${menuId}/chefs/${recordId}/main.${extension}`;
  }
}

function getPathPrefix(target: ImageTarget, menuId: string, recordId: string) {
  switch (target) {
    case "site-logo":
      return `menu-sites/${menuId}/brand/logo.`;
    case "site-logo-draft":
      return `menu-sites/${menuId}/draft/logo-`;
    case "site-cover":
      return `menu-sites/${menuId}/brand/cover.`;
    case "site-cover-draft":
      return `menu-sites/${menuId}/draft/cover-`;
    case "site-intro-image-draft":
      return `menu-sites/${menuId}/draft/intro-`;
    case "display-page-image-draft":
      return `menu-sites/${menuId}/draft/display-pages/`;
    case "menu-item":
      return `menu-sites/${menuId}/items/${recordId}/main.`;
    case "menu-item-draft":
      return `menu-sites/${menuId}/draft/items/`;
    case "menu-event":
      return `menu-sites/${menuId}/events/${recordId}/main.`;
    case "menu-chef":
      return `menu-sites/${menuId}/chefs/${recordId}/main.`;
  }
}

function withCacheBust(publicUrl: string) {
  return `${publicUrl}?v=${Date.now()}`;
}

function revalidateMenuPaths(menuId: string, slug: string) {
  revalidatePath("/mypage");
  revalidatePath(`/mypage/menus/${menuId}/edit`);
  revalidatePath(`/mypage/menus/${menuId}/preview`);
  revalidatePath(getPublicMenuPath(slug));
  revalidatePath(getLegacyMenuPath(slug));
}

async function requireMenuImageAccess(menuId: string) {
  let writeAccess: Awaited<ReturnType<typeof requireMenuSiteWriteAccess>>;

  try {
    writeAccess = await requireMenuSiteWriteAccess(menuId, "menu.edit");
  } catch (error) {
    if (error instanceof MenuSiteAccessError) {
      return {
        error: jsonError(error.message, error.status),
        menuSite: null,
        supabase: null,
      };
    }

    return {
      error: jsonError("메뉴판 권한을 확인하지 못했습니다.", 500),
      menuSite: null,
      supabase: null,
    };
  }

  const { supabase } = writeAccess;

  const { data: menuSite, error } = await supabase
    .from("menu_sites")
    .select("id, user_id, slug, logo_url, logo_path, cover_image_url, cover_image_path, intro_image_url, intro_image_path")
    .eq("id", menuId)
    .maybeSingle();

  if (error) {
    return { error: jsonError(`메뉴판 권한 확인에 실패했습니다: ${error.message}`, 500), menuSite: null, supabase: null };
  }

  if (!menuSite) {
    return { error: jsonError("메뉴판을 찾을 수 없거나 권한이 없습니다.", 404), menuSite: null, supabase: null };
  }

  return { error: null, menuSite, supabase };
}

async function getTargetRecord(
  supabase: SupabaseDataClient,
  menuSite: NonNullable<Awaited<ReturnType<typeof requireMenuImageAccess>>["menuSite"]>,
  target: ImageTarget,
  menuId: string,
  recordId: string
): Promise<{ record: TargetRecord | null; error: NextResponse | null }> {
  if (target === "site-logo") {
    return {
      error: null,
      record: {
        menuId,
        slug: menuSite.slug,
        imageUrl: menuSite.logo_url,
        imagePath: menuSite.logo_path,
      },
    };
  }

  if (target === "site-logo-draft") {
    return {
      error: null,
      record: {
        menuId,
        slug: menuSite.slug,
        imageUrl: null,
        imagePath: null,
      },
    };
  }

  if (target === "site-cover") {
    // Legacy immediate-update target. New edit UI should use draft targets
    // such as site-cover-draft or site-intro-image-draft.
    return {
      error: null,
      record: {
        menuId,
        slug: menuSite.slug,
        imageUrl: menuSite.cover_image_url,
        imagePath: menuSite.cover_image_path,
      },
    };
  }

  if (target === "site-cover-draft") {
    return {
      error: null,
      record: {
        menuId,
        slug: menuSite.slug,
        imageUrl: null,
        imagePath: null,
      },
    };
  }

  if (target === "site-intro-image-draft") {
    return {
      error: null,
      record: {
        menuId,
        slug: menuSite.slug,
        imageUrl: null,
        imagePath: null,
      },
    };
  }

  if (target === "display-page-image-draft") {
    return {
      error: null,
      record: {
        menuId,
        slug: menuSite.slug,
        imageUrl: null,
        imagePath: null,
      },
    };
  }

  if (target === "menu-item-draft") {
    return {
      error: null,
      record: {
        menuId,
        slug: menuSite.slug,
        imageUrl: null,
        imagePath: null,
      },
    };
  }

  if (!recordId) {
    return { record: null, error: jsonError("recordId가 없습니다.") };
  }

  if (target === "menu-item") {
    const { data, error } = await supabase
      .from("menu_items")
      .select("id, menu_site_id, image_url, image_path")
      .eq("id", recordId)
      .eq("menu_site_id", menuId)
      .maybeSingle();

    if (error) {
      return { record: null, error: jsonError(`메뉴 아이템 확인에 실패했습니다: ${error.message}`, 500) };
    }

    return {
      error: data ? null : jsonError("메뉴 아이템을 찾을 수 없습니다.", 404),
      record: data ? { menuId, slug: menuSite.slug, imageUrl: data.image_url, imagePath: data.image_path } : null,
    };
  }

  if (target === "menu-event") {
    const { data, error } = await supabase
      .from("menu_events")
      .select("id, menu_site_id, event_image_url, event_image_path")
      .eq("id", recordId)
      .eq("menu_site_id", menuId)
      .maybeSingle();

    if (error) {
      return { record: null, error: jsonError(`이벤트 확인에 실패했습니다: ${error.message}`, 500) };
    }

    return {
      error: data ? null : jsonError("이벤트를 찾을 수 없습니다.", 404),
      record: data ? { menuId, slug: menuSite.slug, imageUrl: data.event_image_url, imagePath: data.event_image_path } : null,
    };
  }

  const { data, error } = await supabase
    .from("menu_chefs")
    .select("id, menu_site_id, chef_image_url, chef_image_path")
    .eq("id", recordId)
    .eq("menu_site_id", menuId)
    .maybeSingle();

  if (error) {
    return { record: null, error: jsonError(`셰프/인물 확인에 실패했습니다: ${error.message}`, 500) };
  }

  return {
    error: data ? null : jsonError("셰프/인물 정보를 찾을 수 없습니다.", 404),
    record: data ? { menuId, slug: menuSite.slug, imageUrl: data.chef_image_url, imagePath: data.chef_image_path } : null,
  };
}

async function updateImageRecord(
  supabase: SupabaseDataClient,
  target: PersistentImageTarget,
  menuId: string,
  recordId: string,
  imageUrl: string | null,
  imagePath: string | null
) {
  const updatedAt = new Date().toISOString();

  if (target === "site-logo") {
    return supabase
      .from("menu_sites")
      .update({ logo_url: imageUrl, logo_path: imagePath, updated_at: updatedAt })
      .eq("id", menuId);
  }

  if (target === "site-cover") {
    return supabase
      .from("menu_sites")
      .update({ cover_image_url: imageUrl, cover_image_path: imagePath, updated_at: updatedAt })
      .eq("id", menuId);
  }

  if (target === "menu-item") {
    return supabase
      .from("menu_items")
      .update({ image_url: imageUrl, image_path: imagePath, updated_at: updatedAt })
      .eq("id", recordId)
      .eq("menu_site_id", menuId);
  }

  if (target === "menu-event") {
    return supabase
      .from("menu_events")
      .update({ event_image_url: imageUrl, event_image_path: imagePath, updated_at: updatedAt })
      .eq("id", recordId)
      .eq("menu_site_id", menuId);
  }

  return supabase
    .from("menu_chefs")
    .update({ chef_image_url: imageUrl, chef_image_path: imagePath, updated_at: updatedAt })
    .eq("id", recordId)
    .eq("menu_site_id", menuId);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const target = getString(formData.get("target"));
  const menuId = getString(formData.get("menuId"));
  const recordId = getString(formData.get("recordId"));
  const file = formData.get("file");

  if (!isImageTarget(target)) {
    return jsonError("이미지 대상이 올바르지 않습니다.");
  }

  if (!menuId) {
    return jsonError("menuId가 없습니다.");
  }

  if (!isSafeDraftRecordId(recordId)) {
    return jsonError("이미지 대상 ID가 올바르지 않습니다.");
  }

  if (!(file instanceof File)) {
    return jsonError("업로드할 파일이 없습니다.");
  }

  const validationMessage = validateImageUploadFile(file, target);
  if (validationMessage) {
    return jsonError(validationMessage);
  }

  const extension = getExtension(file);
  const access = await requireMenuImageAccess(menuId);
  if (access.error || !access.menuSite || !access.supabase) return access.error;
  const { supabase, menuSite } = access;
  const { record, error } = await getTargetRecord(supabase, menuSite, target, menuId, recordId);

  if (error || !record) {
    return error ?? jsonError("이미지 정보를 찾을 수 없습니다.", 404);
  }

  const expectedPrefix = getPathPrefix(target, menuId, recordId);
  const previousPath = record.imagePath;
  const safePreviousPath = previousPath?.startsWith(expectedPrefix) ? previousPath : null;
  const nextPath = safePreviousPath?.endsWith(`.${extension}`)
    ? safePreviousPath
    : getPath(target, menuId, recordId, extension);

  const bytes = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(nextPath, bytes, {
    cacheControl: "31536000",
    contentType: file.type,
    upsert: true,
  });

  if (uploadError) {
    return jsonError(`이미지 업로드에 실패했습니다: ${uploadError.message}`, 500);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(nextPath);
  const imageUrl = withCacheBust(publicUrl);

  if (isDraftImageTarget(target)) {
    // TODO: 저장 없이 이탈한 임시 이미지는 만료 정책 또는 정리 작업으로 제거합니다.
    return NextResponse.json({ ok: true, imageUrl, imagePath: nextPath });
  }

  const { error: updateError } = await updateImageRecord(supabase, target, menuId, recordId, imageUrl, nextPath);

  if (updateError) {
    // TODO: 같은 path를 upsert한 경우에는 이전 파일을 복원할 수 없으므로, 필요하면 temp path 업로드 후 DB 저장 성공 시 이동하는 보상 흐름을 추가합니다.
    if (!safePreviousPath || safePreviousPath !== nextPath) {
      await supabase.storage.from(BUCKET).remove([nextPath]);
    }

    return jsonError(`이미지 정보 저장에 실패했습니다: ${updateError.message}`, 500);
  }

  if (safePreviousPath && safePreviousPath !== nextPath) {
    await supabase.storage.from(BUCKET).remove([safePreviousPath]);
  }

  revalidateMenuPaths(menuId, record.slug);

  return NextResponse.json({ ok: true, imageUrl, imagePath: nextPath });
}

export async function DELETE(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    target?: unknown;
    menuId?: unknown;
    recordId?: unknown;
  } | null;
  const target = typeof body?.target === "string" ? body.target.trim() : "";
  const menuId = typeof body?.menuId === "string" ? body.menuId.trim() : "";
  const recordId = typeof body?.recordId === "string" ? body.recordId.trim() : "";

  if (!isImageTarget(target)) {
    return jsonError("이미지 대상이 올바르지 않습니다.");
  }

  if (!menuId) {
    return jsonError("menuId가 없습니다.");
  }

  if (!isSafeDraftRecordId(recordId)) {
    return jsonError("이미지 대상 ID가 올바르지 않습니다.");
  }

  if (isDraftImageTarget(target)) {
    return jsonError("임시 이미지는 저장 전 삭제 API를 사용하지 않습니다.");
  }

  const access = await requireMenuImageAccess(menuId);
  if (access.error || !access.menuSite || !access.supabase) return access.error;
  const { supabase, menuSite } = access;
  const { record, error } = await getTargetRecord(supabase, menuSite, target, menuId, recordId);

  if (error || !record) {
    return error ?? jsonError("이미지 정보를 찾을 수 없습니다.", 404);
  }

  if (record.imagePath) {
    if (!record.imagePath.startsWith(getPathPrefix(target, menuId, recordId))) {
      return jsonError("저장된 이미지 경로가 해당 메뉴판에 속하지 않습니다.", 409);
    }
    const { error: removeError } = await supabase.storage.from(BUCKET).remove([record.imagePath]);

    if (removeError) {
      return jsonError(`Storage 이미지 삭제에 실패했습니다: ${removeError.message}`, 500);
    }
  }

  const { error: updateError } = await updateImageRecord(supabase, target, menuId, recordId, null, null);

  if (updateError) {
    return jsonError(`이미지 정보 삭제에 실패했습니다: ${updateError.message}`, 500);
  }

  revalidateMenuPaths(menuId, record.slug);

  return NextResponse.json({ ok: true, imageUrl: null, imagePath: null });
}
