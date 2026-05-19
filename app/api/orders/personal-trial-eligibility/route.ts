import { NextResponse } from "next/server";

import { hasUsedPersonalTrial } from "@/lib/server/personal-trial-eligibility";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const PERSONAL_TRIAL_ALREADY_USED_MESSAGE =
  "개인 1개월 체험은 계정당 1개만 이용할 수 있습니다. 기존 체험 메뉴판을 사업자 플랜으로 전환하거나 새 사업자 메뉴판을 신청해주세요.";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ eligible: false, reason: "LOGIN_REQUIRED", message: "로그인이 필요합니다." }, { status: 401 });
  }

  try {
    const result = await hasUsedPersonalTrial(user.id);

    if (result.used) {
      return NextResponse.json({
        eligible: false,
        reason: "PERSONAL_TRIAL_ALREADY_USED",
        message: PERSONAL_TRIAL_ALREADY_USED_MESSAGE,
        existingMenuSiteId: result.existingMenuSiteId,
        existingEntitlementStatus: result.existingEntitlementStatus,
      });
    }

    return NextResponse.json({ eligible: true });
  } catch (error) {
    console.error("[personal-trial-eligibility] check failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });

    return NextResponse.json(
      {
        eligible: false,
        reason: "CHECK_FAILED",
        message: "개인 체험 이용 가능 여부를 확인하지 못했습니다. 잠시 후 다시 시도해주세요.",
      },
      { status: 500 },
    );
  }
}
