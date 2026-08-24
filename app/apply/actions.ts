"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getBusinessTypeLabel } from "@/lib/business-types";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type InquiryInsert = Database["public"]["Tables"]["inquiries"]["Insert"];
type ConsultingServiceType = "order" | "custom";

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStringList(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function getServiceType(value: string): ConsultingServiceType | null {
  return value === "order" || value === "custom" ? value : null;
}

function redirectWithApplyError(serviceType: ConsultingServiceType, message: string): never {
  redirect(`/apply/${serviceType}?error=${encodeURIComponent(message)}`);
}

function buildOrderMessage(formData: FormData) {
  const businessType = getString(formData, "businessCategory");
  const businessTypeLabel = getBusinessTypeLabel(businessType) ?? businessType;

  return [
    "[아티메뉴 오더 1.0 상담 신청]",
    `매장명: ${getString(formData, "storeName")}`,
    `업종: ${businessTypeLabel || "-"}`,
    `담당자명: ${getString(formData, "contactName")}`,
    `연락처: ${getString(formData, "contactPhone")}`,
    `이메일: ${getString(formData, "contactEmail")}`,
    `테이블 수: ${getString(formData, "tableCount") || "-"}`,
    `현재 POS 사용 여부: ${getString(formData, "posUsage") || "-"}`,
    `선불/후불 희망: ${getString(formData, "paymentPreference") || "-"}`,
    `주방 대시보드 필요 여부: ${getString(formData, "kitchenDashboard") || "-"}`,
    "",
    "[문의 내용]",
    getString(formData, "message"),
  ].join("\n");
}

function buildCustomMessage(formData: FormData) {
  const neededFeatures = getStringList(formData, "neededFeatures");
  const businessType = getString(formData, "businessCategory");
  const businessTypeLabel = getBusinessTypeLabel(businessType) ?? businessType;

  return [
    "[아티메뉴 커스텀 견적 문의]",
    `매장명: ${getString(formData, "storeName")}`,
    `업종: ${businessTypeLabel || "-"}`,
    `담당자명: ${getString(formData, "contactName")}`,
    `연락처: ${getString(formData, "contactPhone")}`,
    `이메일: ${getString(formData, "contactEmail")}`,
    `원하는 분위기: ${getString(formData, "desiredMood") || "-"}`,
    `참고 사이트: ${getString(formData, "referenceSite") || "-"}`,
    `필요한 기능: ${neededFeatures.length > 0 ? neededFeatures.join(", ") : "-"}`,
    `예산 범위: ${getString(formData, "budgetRange") || "-"}`,
    `희망 일정: ${getString(formData, "timeline") || "-"}`,
    "",
    "[문의 내용]",
    getString(formData, "message"),
  ].join("\n");
}

export async function createConsultingApplyAction(formData: FormData) {
  const requestedServiceType = getString(formData, "serviceType");
  const serviceType = getServiceType(requestedServiceType);

  if (!serviceType) {
    redirect("/apply/basic");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/apply/${serviceType}`);
  }

  const storeName = getString(formData, "storeName");
  const businessCategory = getString(formData, "businessCategory");
  const contactName = getString(formData, "contactName");
  const contactPhone = getString(formData, "contactPhone");
  const contactEmail = getString(formData, "contactEmail");
  const message = getString(formData, "message");

  if (!storeName) {
    redirectWithApplyError(serviceType, "매장명을 입력해주세요.");
  }

  if (!businessCategory) {
    redirectWithApplyError(serviceType, "업종을 선택해주세요.");
  }

  if (!contactName) {
    redirectWithApplyError(serviceType, "담당자명을 입력해주세요.");
  }

  if (!contactPhone) {
    redirectWithApplyError(serviceType, "연락처를 입력해주세요.");
  }

  if (!contactEmail) {
    redirectWithApplyError(serviceType, "이메일을 입력해주세요.");
  }

  if (!message) {
    redirectWithApplyError(serviceType, "문의 내용을 입력해주세요.");
  }

  const title =
    serviceType === "order"
      ? `[상담 신청] 아티메뉴 오더 1.0 - ${storeName}`
      : `[견적 문의] 아티메뉴 커스텀 - ${storeName}`;

  const payload: InquiryInsert = {
    user_id: user.id,
    title: title.slice(0, 120),
    message: serviceType === "order" ? buildOrderMessage(formData) : buildCustomMessage(formData),
    status: "open",
  };

  const { error } = await supabase.from("inquiries").insert(payload);

  if (error) {
    redirectWithApplyError(serviceType, `상담 신청 접수에 실패했습니다: ${error.message}`);
  }

  revalidatePath("/mypage/inquiries");
  redirect("/mypage/inquiries?message=inquiry-created");
}
