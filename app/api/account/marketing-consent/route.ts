import { NextResponse } from "next/server";

import { CONSENT_POLICY_VERSION } from "@/lib/consent-records";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, message: "로그인이 필요합니다." }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ ok: false, message: "요청 형식이 올바르지 않습니다." }, { status: 400 });
  }

  const marketingAccepted = body.marketingAccepted === true;
  const now = new Date().toISOString();
  const currentMetadata = user.user_metadata ?? {};
  const nextMetadata = {
    ...currentMetadata,
    marketing_accepted: marketingAccepted,
    marketing_channels: {
      email: marketingAccepted,
      sms: marketingAccepted,
      kakao: marketingAccepted,
    },
    marketing_consented_at: marketingAccepted ? (currentMetadata.marketing_consented_at ?? now) : currentMetadata.marketing_consented_at ?? null,
    marketing_withdrawn_at: marketingAccepted ? null : now,
    marketing_consent_version: {
      terms: CONSENT_POLICY_VERSION.terms,
      privacy: CONSENT_POLICY_VERSION.privacy,
    },
  };

  const { error } = await supabase.auth.updateUser({ data: nextMetadata });

  if (error) {
    return NextResponse.json({ ok: false, message: error.message || "마케팅 수신 설정 저장에 실패했습니다." }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    message: marketingAccepted ? "광고성 정보 수신에 동의했습니다." : "광고성 정보 수신 동의를 철회했습니다.",
    marketingAccepted,
    updatedAt: now,
  });
}
