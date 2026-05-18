import { NextResponse } from "next/server";

import {
  callNtsBusinessVerificationApi,
  maskBusinessRegistrationNumber,
  normalizeBusinessVerificationInput,
  normalizeNtsBusinessVerificationResponse,
  type BusinessVerificationInput,
  type NormalizedBusinessVerificationInput,
  type NormalizedNtsBusinessVerificationResponse,
} from "@/lib/business-verification";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

// TODO(legal): 개인정보처리방침 및 이용약관에 사업자등록번호, 대표자명, 개업일자 수집 및 국세청 진위확인 목적을 반영해야 합니다.

type BusinessVerifyRequestBody = Partial<BusinessVerificationInput>;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, verified: false, message }, { status });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getRequestPayload(input: NormalizedBusinessVerificationInput) {
  return {
    business_registration_number: input.businessRegistrationNumber,
    representative_name: input.representativeName,
    opening_date: input.openingDate,
    business_name: input.businessName,
    phone: input.phone,
  };
}

async function recordVerificationHistory({
  userId,
  businessProfileId,
  input,
  result,
  normalizedResponse,
  errorMessage,
}: {
  userId: string;
  businessProfileId?: string | null;
  input: NormalizedBusinessVerificationInput;
  result: "verified" | "failed" | "error";
  normalizedResponse?: NormalizedNtsBusinessVerificationResponse | null;
  errorMessage?: string | null;
}) {
  const adminSupabase = createAdminClient();

  await adminSupabase.from("business_verifications").insert(({
    user_id: userId,
    business_profile_id: businessProfileId ?? null,
    request_type: "identity_check",
    request_payload: getRequestPayload(input) as Json,
    response_payload: (normalizedResponse?.safeRaw ?? null) as Json | null,
    result,
    error_message: errorMessage ?? null,
  }) as never);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  let body: BusinessVerifyRequestBody;

  try {
    body = (await request.json()) as BusinessVerifyRequestBody;
  } catch {
    return jsonError("요청 본문이 올바른 JSON이 아닙니다.");
  }

  let normalizedInput: NormalizedBusinessVerificationInput;

  try {
    normalizedInput = normalizeBusinessVerificationInput({
      businessRegistrationNumber: getString(body.businessRegistrationNumber),
      representativeName: getString(body.representativeName),
      openingDate: getString(body.openingDate),
      businessName: getString(body.businessName),
      phone: getString(body.phone),
    });
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "사업자 정보 입력값이 올바르지 않습니다.");
  }

  if (!process.env.DATA_GO_KR_SERVICE_KEY?.trim() && !process.env.NTS_BUSINESS_API_KEY?.trim()) {
    try {
      await recordVerificationHistory({
        userId: user.id,
        input: normalizedInput,
        result: "error",
        errorMessage: "사업자 인증 API 키가 설정되어 있지 않습니다.",
      });
    } catch {
      // Verification history is best-effort for configuration failures.
    }

    return jsonError("사업자 인증 API 설정이 필요합니다. 관리자에게 문의해주세요.", 500);
  }

  let normalizedResponse: NormalizedNtsBusinessVerificationResponse;

  try {
    const ntsResponse = await callNtsBusinessVerificationApi(normalizedInput);
    normalizedResponse = normalizeNtsBusinessVerificationResponse(ntsResponse);
  } catch {
    try {
      await recordVerificationHistory({
        userId: user.id,
        input: normalizedInput,
        result: "error",
        errorMessage: "사업자 인증 API 요청에 실패했습니다.",
      });
    } catch {
      // Verification history is best-effort when the external API is unavailable.
    }

    return jsonError("사업자 인증 API 요청에 실패했습니다. 잠시 후 다시 시도해주세요.", 502);
  }

  const adminSupabase = createAdminClient();
  let businessProfileId: string | null = null;

  if (normalizedResponse.verified) {
    const nowIso = new Date().toISOString();
    const { data: profile, error: profileError } = await adminSupabase
      .from("business_profiles")
      .upsert(({
        user_id: user.id,
        business_registration_number: normalizedInput.businessRegistrationNumber,
        business_name: normalizedInput.businessName,
        representative_name: normalizedInput.representativeName,
        opening_date: normalizedInput.openingDate,
        business_status: normalizedResponse.businessStatus,
        tax_type: normalizedResponse.taxType,
        verification_status: "verified",
        verification_source: "nts",
        verified_at: nowIso,
        last_verified_at: nowIso,
        updated_at: nowIso,
      }) as never, {
        onConflict: "user_id",
      })
      .select("id")
      .single();

    if (profileError || !profile) {
      await recordVerificationHistory({
        userId: user.id,
        input: normalizedInput,
        normalizedResponse,
        result: "error",
        errorMessage: "사업자 인증 결과 저장에 실패했습니다.",
      });

      return jsonError("사업자 인증 결과 저장에 실패했습니다. 관리자에게 문의해주세요.", 500);
    }

    businessProfileId = (profile as { id: string }).id;
  }

  try {
    await recordVerificationHistory({
      userId: user.id,
      businessProfileId,
      input: normalizedInput,
      normalizedResponse,
      result: normalizedResponse.verified ? "verified" : "failed",
      errorMessage: normalizedResponse.verified ? null : normalizedResponse.message,
    });
  } catch {
    // Do not fail a successful verification only because audit history insert failed.
  }

  if (!normalizedResponse.verified) {
    return NextResponse.json(
      {
        ok: false,
        verified: false,
        message: normalizedResponse.message,
      },
      { status: 400 }
    );
  }

  return NextResponse.json({
    ok: true,
    verified: true,
    businessProfileId,
    businessName: normalizedInput.businessName,
    representativeName: normalizedInput.representativeName,
    businessRegistrationNumberMasked: maskBusinessRegistrationNumber(normalizedInput.businessRegistrationNumber),
    businessStatus: normalizedResponse.businessStatus,
    taxType: normalizedResponse.taxType,
    verifiedAt: new Date().toISOString(),
    message: "사업자 인증이 완료되었습니다.",
  });
}
