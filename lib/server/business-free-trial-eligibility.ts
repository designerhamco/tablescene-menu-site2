import "server-only";

import { isBusinessFreeTrialEnabled } from "@/lib/business-free-trial";
import { hasUsedPersonalTrial } from "@/lib/server/personal-trial-eligibility";
import { createAdminClient } from "@/lib/supabase/admin";

type FreeTrialSubscriptionRow = {
  id: string;
  trial_started_at: string | null;
};

export type BusinessFreeTrialEligibility =
  | { eligible: true }
  | {
      eligible: false;
      reason: "FEATURE_DISABLED" | "LEGACY_TRIAL_ALREADY_USED" | "SUBSCRIPTION_TRIAL_ALREADY_USED";
    };

export async function getBusinessFreeTrialEligibility(
  userId: string,
  adminSupabase = createAdminClient(),
  excludeSubscriptionId?: string,
): Promise<BusinessFreeTrialEligibility> {
  if (!isBusinessFreeTrialEnabled()) {
    return { eligible: false, reason: "FEATURE_DISABLED" };
  }

  const legacyTrial = await hasUsedPersonalTrial(userId);
  if (legacyTrial.used) {
    return { eligible: false, reason: "LEGACY_TRIAL_ALREADY_USED" };
  }

  let query = adminSupabase
    .from("business_subscriptions" as never)
    .select("id, trial_started_at" as never)
    .eq("user_id" as never, userId as never)
    .not("trial_started_at" as never, "is", null)
    .limit(1);
  if (excludeSubscriptionId) {
    query = query.neq("id" as never, excludeSubscriptionId as never);
  }
  const { data, error } = await query;

  if (error) {
    throw Object.assign(new Error(error.message || "정기구독 무료체험 이용 이력 확인에 실패했습니다."), {
      code: error.code,
      details: error.details,
      hint: error.hint,
    });
  }

  const existingTrial = ((data ?? []) as FreeTrialSubscriptionRow[])[0];
  if (existingTrial?.trial_started_at) {
    return { eligible: false, reason: "SUBSCRIPTION_TRIAL_ALREADY_USED" };
  }

  return { eligible: true };
}
