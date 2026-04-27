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

function redirectWithError(message: string): never {
  redirect(`/mypage/inquiries?error=${encodeURIComponent(message)}`);
}

export async function createInquiryAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/inquiries");
  }

  const title = getString(formData, "title");
  const message = getString(formData, "message");

  if (!title) {
    redirectWithError("문의 제목을 입력해주세요.");
  }

  if (title.length > 120) {
    redirectWithError("문의 제목은 120자 이하로 입력해주세요.");
  }

  if (!message) {
    redirectWithError("문의 내용을 입력해주세요.");
  }

  const payload: InquiryInsert = {
    user_id: user.id,
    title,
    message,
    status: "open",
  };

  const { error } = await supabase.from("inquiries").insert(payload);

  if (error) {
    redirectWithError(`문의 등록에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/mypage/inquiries");
  redirect("/mypage/inquiries?message=inquiry-created");
}

export async function updateInquiryAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/inquiries");
  }

  const inquiryId = getString(formData, "inquiryId");
  const title = getString(formData, "title");
  const message = getString(formData, "message");

  if (!inquiryId) {
    redirectWithError("수정할 문의를 찾을 수 없습니다.");
  }

  if (!title) {
    redirectWithError("문의 제목을 입력해주세요.");
  }

  if (title.length > 120) {
    redirectWithError("문의 제목은 120자 이하로 입력해주세요.");
  }

  if (!message) {
    redirectWithError("문의 내용을 입력해주세요.");
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
    redirectWithError(`문의 수정에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/mypage/inquiries");
  revalidatePath("/admin");
  redirect("/mypage/inquiries?message=inquiry-updated");
}

export async function deleteInquiryAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/mypage/inquiries");
  }

  const inquiryId = getString(formData, "inquiryId");

  if (!inquiryId) {
    redirectWithError("삭제할 문의를 찾을 수 없습니다.");
  }

  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq("id", inquiryId)
    .eq("user_id", user.id);

  if (error) {
    redirectWithError(`문의 삭제에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/mypage/inquiries");
  revalidatePath("/admin");
  redirect("/mypage/inquiries?message=inquiry-deleted");
}
