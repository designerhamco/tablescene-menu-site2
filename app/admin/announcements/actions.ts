"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAnnouncementClient } from "@/lib/server/announcement-service";
import { validateAnnouncement } from "@/lib/announcements";

export type AnnouncementFormState = { error?: string };

export async function saveAnnouncementAction(
  _previous: AnnouncementFormState,
  formData: FormData,
): Promise<AnnouncementFormState> {
  const supabase = await createAnnouncementClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 만료되었습니다. 다시 로그인해 주세요." };
  const { data: admin, error: adminError } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();
  if (adminError || !admin)
    return { error: "공지사항을 저장할 관리자 권한이 없습니다." };
  const result = validateAnnouncement({
    title: formData.get("title"),
    body: formData.get("body"),
    category: formData.get("category"),
    status: formData.get("status"),
    pinned: formData.get("pinned") === "on",
  });
  if (!result.ok) return { error: result.error };
  const id = String(formData.get("id") ?? "");
  const updatedAt = String(formData.get("updated_at") ?? "");
  const isUpdate = Boolean(id);
  if (
    isUpdate &&
    (!/^[0-9a-f-]{36}$/i.test(id) ||
      !updatedAt ||
      Number.isNaN(Date.parse(updatedAt)))
  )
    return {
      error: "문서 정보를 확인할 수 없습니다. 새로고침 후 다시 시도해 주세요.",
    };
  let publishedAt: string | null = null;
  if (isUpdate) {
    const { data: current, error } = await supabase
      .from("support_announcements")
      .select("published_at,updated_at")
      .eq("id", id)
      .maybeSingle();
    if (error || !current)
      return { error: "수정할 공지사항을 찾을 수 없습니다." };
    if (current.updated_at !== updatedAt)
      return {
        error:
          "다른 화면에서 수정된 글입니다. 현재 내용을 복사한 뒤 새로고침해 주세요.",
      };
    publishedAt = current.published_at;
  }
  if (result.data.status === "published" && !publishedAt)
    publishedAt = new Date().toISOString();
  const payload = { ...result.data, published_at: publishedAt };
  const request = isUpdate
    ? supabase
        .from("support_announcements")
        .update(payload)
        .eq("id", id)
        .eq("updated_at", updatedAt)
    : supabase.from("support_announcements").insert(payload);
  const { data: saved, error } = await request.select("id").maybeSingle();
  if (error) {
    console.error("[announcements] save failed", error.code);
    return {
      error: "공지사항을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.",
    };
  }
  if (!saved)
    return {
      error:
        "글이 변경되어 저장하지 못했습니다. 현재 내용을 복사한 뒤 새로고침해 주세요.",
    };
  revalidatePath("/faq");
  revalidatePath(`/faq/notices/${saved.id}`);
  revalidatePath("/admin/announcements");
  redirect(`/admin/announcements?id=${saved.id}&saved=1`);
}
