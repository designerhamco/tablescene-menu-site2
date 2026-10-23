import { NextResponse } from "next/server";
import {
  ANNOUNCEMENT_IMAGE_BUCKET,
  ANNOUNCEMENT_IMAGE_MAX_BYTES,
} from "@/lib/announcement-content";
import { prepareAnnouncementImage } from "@/lib/announcement-image-upload";
import { createAnnouncementClient } from "@/lib/server/announcement-service";
import { isSameOriginRequest } from "@/lib/same-origin-request";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
const fail = (message: string, status = 400) =>
  NextResponse.json({ ok: false, message }, { status });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request))
    return fail("올바른 작성 화면에서 다시 시도해 주세요.", 403);
  const supabase = await createAnnouncementClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail("로그인이 만료되었습니다. 다시 로그인해 주세요.", 401);
  const { data: admin, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (error || !admin)
    return fail("공지사항 이미지를 첨부할 관리자 권한이 없습니다.", 403);

  const maxRequestBytes = ANNOUNCEMENT_IMAGE_MAX_BYTES + 64 * 1024;
  if (Number(request.headers.get("content-length")) > maxRequestBytes)
    return fail("이미지는 3MB 이하로 첨부해 주세요.", 413);
  const reader = request.body?.getReader();
  if (!reader) return fail("첨부할 이미지를 선택해 주세요.");
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > maxRequestBytes) {
        await reader.cancel();
        return fail("이미지는 3MB 이하로 첨부해 주세요.", 413);
      }
      chunks.push(value);
    }
  } catch {
    return fail("이미지를 전송하지 못했습니다. 다시 첨부해 주세요.");
  }
  let file: FormDataEntryValue | null;
  try {
    const body = Buffer.concat(chunks);
    const form = await new Response(body, {
      headers: { "content-type": request.headers.get("content-type") ?? "" },
    }).formData();
    file = form.get("file");
  } catch {
    return fail("첨부 요청을 확인해 주세요.");
  }
  if (!(file instanceof File)) return fail("첨부할 이미지를 선택해 주세요.");
  let bytes: Buffer;
  try {
    bytes = await prepareAnnouncementImage(
      new Uint8Array(await file.arrayBuffer()),
      file.type,
    );
  } catch (error) {
    return fail(
      error instanceof Error ? error.message : "이미지를 확인해 주세요.",
    );
  }

  const path = `support-announcements/${user.id}/${crypto.randomUUID()}.webp`;
  try {
    const storage = createAdminClient().storage.from(ANNOUNCEMENT_IMAGE_BUCKET);
    const { error: uploadError } = await storage.upload(path, bytes, {
      contentType: "image/webp",
      cacheControl: "31536000",
      upsert: false,
    });
    if (uploadError) {
      console.error("[announcement-images] upload failed", uploadError.name);
      return fail(
        "이미지를 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
        500,
      );
    }
    return NextResponse.json({
      ok: true,
      imageUrl: storage.getPublicUrl(path).data.publicUrl,
    });
  } catch {
    return fail(
      "이미지 저장소에 연결하지 못했습니다. 잠시 후 다시 시도해 주세요.",
      500,
    );
  }
}
