import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSameOriginRequest } from "@/lib/same-origin-request";
import { ACCOUNT_AVATAR_BUCKET, getAccountAvatarPath, getAccountAvatarUrl } from "@/lib/account-profile";
import { prepareAccountAvatarImage, readAccountAvatarFile, saveAccountAvatar } from "@/lib/account-avatar-image";
import { isDeletedAccountStatus } from "@/lib/account-status";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
const fail = (message: string, status: number) => NextResponse.json({ ok: false, message }, { status, headers });

async function updateAvatar(request: Request, remove: boolean) {
  if (!isSameOriginRequest(request)) return fail("회원정보 화면에서 다시 시도해 주세요.", 403);
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return fail("로그인 후 다시 시도해 주세요.", 401);
  if (isDeletedAccountStatus(user.app_metadata)) return fail("프로필을 변경할 수 없는 계정입니다.", 403);
  let image: Uint8Array | null = null;
  if (!remove) {
    try {
      const file = await readAccountAvatarFile(request);
      image = await prepareAccountAvatarImage(new Uint8Array(await file.arrayBuffer()), file.type);
    } catch (error) {
      return fail(error instanceof Error ? error.message : "프로필 사진을 확인해 주세요.", 400);
    }
  }
  try {
    // The session determines the only editable account. No client-supplied user/path is accepted.
    const storage = createAdminClient().storage.from(ACCOUNT_AVATAR_BUCKET);
    const path = await saveAccountAvatar(user.id, getAccountAvatarPath(user.id, user.user_metadata), image, {
      async upload(path, bytes) {
        const { error } = await storage.upload(path, bytes, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
        if (error) throw error;
      },
      async update(path) {
        const { error } = await supabase.auth.updateUser({ data: { profile_avatar_path: path } });
        if (error) throw error;
      },
      async remove(path) {
        const { error } = await storage.remove([path]);
        if (error) throw error;
      },
    });
    return NextResponse.json({ ok: true, avatarUrl: getAccountAvatarUrl(user.id, { profile_avatar_path: path }) }, { headers });
  } catch {
    return fail("프로필 사진을 저장하지 못했습니다. 다시 시도해 주세요.", 500);
  }
}

export const POST = (request: Request) => updateAvatar(request, false);
export const DELETE = (request: Request) => updateAvatar(request, true);
