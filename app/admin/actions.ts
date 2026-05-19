"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function normalizeInquiryStatus(value: string) {
  return value === "answered" || value === "closed" ? value : "open";
}

function redirectWithError(message: string): never {
  redirect(`/admin?error=${encodeURIComponent(message)}`);
}

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/admin");
  }

  const { data: adminUser, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error || !adminUser) {
    redirectWithError("관리자 권한 확인에 실패했습니다.");
  }

  return { supabase, user };
}

export async function replyInquiryAction(formData: FormData) {
  const inquiryId = getString(formData, "inquiryId");
  const adminReply = getString(formData, "admin_reply");

  if (!inquiryId) {
    redirectWithError("문의 ID가 없습니다.");
  }

  if (!adminReply) {
    redirectWithError("답변 내용을 입력해주세요.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("inquiries")
    .update({
      admin_reply: adminReply,
      status: "answered",
      replied_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (error) {
    redirectWithError(`문의 답변 저장에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/mypage/inquiries");
  redirect("/admin?message=inquiry-answered");
}

export async function updateInquiryStatusAction(formData: FormData) {
  const inquiryId = getString(formData, "inquiryId");
  const status = normalizeInquiryStatus(getString(formData, "status"));

  if (!inquiryId) {
    redirectWithError("문의 ID가 없습니다.");
  }

  const { supabase } = await requireAdmin();
  const now = new Date().toISOString();

  const { error } = await supabase
    .from("inquiries")
    .update({
      status,
      updated_at: now,
    })
    .eq("id", inquiryId);

  if (error) {
    redirectWithError(`문의 상태 변경에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/mypage/inquiries");
  redirect("/admin?message=inquiry-status-updated");
}

export async function deleteInquiryReplyAction(formData: FormData) {
  const inquiryId = getString(formData, "inquiryId");

  if (!inquiryId) {
    redirectWithError("문의 ID가 없습니다.");
  }

  const { supabase } = await requireAdmin();

  const { error } = await supabase
    .from("inquiries")
    .update({
      admin_reply: null,
      status: "open",
      replied_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", inquiryId);

  if (error) {
    redirectWithError(`문의 답변 삭제에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/admin");
  revalidatePath("/mypage/inquiries");
  redirect("/admin?message=inquiry-reply-deleted");
}
