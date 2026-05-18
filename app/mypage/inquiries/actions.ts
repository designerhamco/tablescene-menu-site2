"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type InquiryInsert = Database["public"]["Tables"]["inquiries"]["Insert"];
type InquiryUpdate = Database["public"]["Tables"]["inquiries"]["Update"];

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getSafeReturnPath(formData: FormData) {
  const returnTo = getString(formData, "returnTo");

  if (
    returnTo === "/mypage/inquiries" ||
    returnTo.startsWith("/mypage/inquiries?") ||
    returnTo === "/mypage?tab=inquiries" ||
    returnTo.startsWith("/mypage?tab=inquiries&")
  ) {
    return returnTo;
  }

  return "/mypage/inquiries";
}

function withQuery(path: string, key: "error" | "message", value: string) {
  const [pathname, queryString] = path.split("?");
  const searchParams = new URLSearchParams(queryString ?? "");
  searchParams.set(key, value);

  return `${pathname}?${searchParams.toString()}`;
}

function revalidateInquiryViews() {
  revalidatePath("/mypage");
  revalidatePath("/mypage/inquiries");
}

function redirectWithError(formData: FormData, message: string): never {
  redirect(withQuery(getSafeReturnPath(formData), "error", message));
}

function redirectWithMessage(formData: FormData, message: string): never {
  redirect(withQuery(getSafeReturnPath(formData), "message", message));
}

export async function createInquiryAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(getSafeReturnPath(formData))}`);
  }

  const title = getString(formData, "title");
  const message = getString(formData, "message");

  if (!title) {
    redirectWithError(formData, "문의 제목을 입력해주세요.");
  }

  if (title.length > 120) {
    redirectWithError(formData, "문의 제목은 120자 이하로 입력해주세요.");
  }

  if (!message) {
    redirectWithError(formData, "문의 내용을 입력해주세요.");
  }

  const payload: InquiryInsert = {
    user_id: user.id,
    title,
    message,
    status: "open",
  };

  const { error } = await supabase.from("inquiries").insert(payload);

  if (error) {
    redirectWithError(formData, `문의 등록에 실패했습니다: ${error.message}`);
  }

  revalidateInquiryViews();
  redirectWithMessage(formData, "inquiry-created");
}

export async function updateInquiryAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(getSafeReturnPath(formData))}`);
  }

  const inquiryId = getString(formData, "inquiryId");
  const title = getString(formData, "title");
  const message = getString(formData, "message");

  if (!inquiryId) {
    redirectWithError(formData, "수정할 문의를 찾을 수 없습니다.");
  }

  if (!title) {
    redirectWithError(formData, "문의 제목을 입력해주세요.");
  }

  if (title.length > 120) {
    redirectWithError(formData, "문의 제목은 120자 이하로 입력해주세요.");
  }

  if (!message) {
    redirectWithError(formData, "문의 내용을 입력해주세요.");
  }

  const payload: InquiryUpdate = {
    title,
    message,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from("inquiries")
    .update(payload)
    .eq("id", inquiryId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithError(formData, `문의 수정에 실패했습니다: ${error.message}`);
  }

  revalidateInquiryViews();
  revalidatePath("/admin");
  redirectWithMessage(formData, "inquiry-updated");
}

export async function deleteInquiryAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(getSafeReturnPath(formData))}`);
  }

  const inquiryId = getString(formData, "inquiryId");

  if (!inquiryId) {
    redirectWithError(formData, "삭제할 문의를 찾을 수 없습니다.");
  }

  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq("id", inquiryId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithError(formData, `문의 삭제에 실패했습니다: ${error.message}`);
  }

  revalidateInquiryViews();
  revalidatePath("/admin");
  redirectWithMessage(formData, "inquiry-deleted");
}
