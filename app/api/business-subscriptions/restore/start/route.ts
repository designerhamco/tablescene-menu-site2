import { randomUUID } from "node:crypto";

import { NextResponse } from "next/server";

import { payWithBillingKey, PortOneBillingError } from "@/lib/portone-billing";
import { isRestoreSubscriptionQaEnabled } from "@/lib/restore-subscription-qa";
import {
  activateRestoreSubscriptionAfterPayment,
  getRestoreSubscriptionBillingPeriod,
  MenuSiteRestorePreflightError,
  validateRestorableMenuSiteForPayment,
  type RestoreBusinessProfile,
} from "@/lib/server/menu-site-restore-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RestoreStartBody = {
  restoreMenuSiteId?: unknown;
  selectedProductKey?: unknown;
  billingKey?: unknown;
  acceptedRestoreTerms?: unknown;
  customerMemo?: unknown;
};

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function jsonError(code: string, message: string, status = 400, debug?: Record<string, unknown>) {
  console.error("[business-subscriptions/restore/start]", JSON.stringify({ code, message, ...(debug ?? {}) }));
  return NextResponse.json(
    {
      ok: false,
      code,
      message,
      ...(process.env.NODE_ENV !== "production" && debug ? { debug } : {}),
    },
    { status }
  );
}

async function getVerifiedBusinessProfile({
  adminSupabase,
  userId,
  businessProfileId,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  userId: string;
  businessProfileId: string;
}) {
  const { data, error } = await adminSupabase
    .from("business_profiles")
    .select("id, business_registration_number, business_name, representative_name, verification_status")
    .eq("id", businessProfileId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`BUSINESS_PROFILE_QUERY_FAILED: ${error.message}`);
  }

  const profile = data as (RestoreBusinessProfile & { verification_status?: string | null }) | null;

  if (!profile) {
    throw new Error("BUSINESS_PROFILE_NOT_FOUND");
  }

  if (profile.verification_status !== "verified") {
    throw new Error("BUSINESS_PROFILE_NOT_VERIFIED");
  }

  return profile;
}

async function createPendingRestoreSubscription({
  adminSupabase,
  userId,
  menuSiteId,
  businessProfileId,
  billingKey,
  productKey,
  planType,
  billingCycle,
  amount,
  currency,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  userId: string;
  menuSiteId: string;
  businessProfileId: string;
  billingKey: string;
  productKey: string;
  planType: string;
  billingCycle: string;
  amount: number;
  currency: string;
}) {
  const { data, error } = await adminSupabase
    .from("business_subscriptions" as never)
    .insert(({
      user_id: userId,
      menu_site_id: menuSiteId,
      business_profile_id: businessProfileId,
      product_key: productKey,
      plan_type: planType,
      billing_cycle: billingCycle,
      billing_key_ref: billingKey,
      status: "pending",
      amount,
      currency,
    }) as never)
    .select("id")
    .single();

  if (error || !data) {
    throw new Error(`RESTORE_SUBSCRIPTION_INSERT_FAILED: ${error?.message ?? "no subscription row returned"}`);
  }

  return (data as { id: string }).id;
}

async function markRestoreSubscriptionFailed(adminSupabase: ReturnType<typeof createAdminClient>, subscriptionId: string) {
  await adminSupabase
    .from("business_subscriptions" as never)
    .update(({ status: "failed", updated_at: new Date().toISOString() }) as never)
    .eq("id" as never, subscriptionId as never);
}

function getPortOneDebug(error: unknown) {
  return error instanceof PortOneBillingError ? error.safeDebug : {};
}

export async function POST(request: Request) {
  if (!isRestoreSubscriptionQaEnabled()) {
    return jsonError("RESTORE_SUBSCRIPTION_QA_DISABLED", "재구독 복구 결제는 현재 QA 준비 중입니다.", 503);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("UNAUTHORIZED", "로그인이 필요합니다.", 401);
  }

  let body: RestoreStartBody;
  try {
    body = (await request.json()) as RestoreStartBody;
  } catch {
    return jsonError("INVALID_JSON_BODY", "요청 본문이 올바른 JSON이 아닙니다.", 400, { userId: user.id });
  }

  const restoreMenuSiteId = getString(body.restoreMenuSiteId);
  const selectedProductKey = getString(body.selectedProductKey);
  const billingKey = getString(body.billingKey);
  const acceptedRestoreTerms = body.acceptedRestoreTerms === true;

  if (!restoreMenuSiteId) {
    return jsonError("RESTORE_MENU_SITE_ID_REQUIRED", "복구할 메뉴판 정보를 확인할 수 없습니다.", 400, { userId: user.id });
  }

  if (!selectedProductKey) {
    return jsonError("RESTORE_PRODUCT_KEY_REQUIRED", "복구할 구독 상품을 선택해주세요.", 400, { userId: user.id, restoreMenuSiteId });
  }

  if (!acceptedRestoreTerms) {
    return jsonError("RESTORE_TERMS_REQUIRED", "재구독 복구 결제 조건 확인이 필요합니다.", 400, { userId: user.id, restoreMenuSiteId, selectedProductKey });
  }

  if (!billingKey) {
    return jsonError("BILLING_KEY_REQUIRED", "빌링키가 없습니다.", 400, { userId: user.id, restoreMenuSiteId, selectedProductKey });
  }

  const adminSupabase = createAdminClient();
  let restore: Awaited<ReturnType<typeof validateRestorableMenuSiteForPayment>>;

  try {
    restore = await validateRestorableMenuSiteForPayment({
      adminSupabase,
      userId: user.id,
      restoreMenuSiteId,
      selectedProductKey,
    });
  } catch (error) {
    if (error instanceof MenuSiteRestorePreflightError) {
      return jsonError(error.code, error.message, error.status, { userId: user.id, restoreMenuSiteId, selectedProductKey });
    }

    return jsonError("RESTORE_PREFLIGHT_FAILED", "복구 가능 상태 확인에 실패했습니다.", 500, {
      userId: user.id,
      restoreMenuSiteId,
      selectedProductKey,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const businessProfileId = restore.latestSubscription?.business_profile_id ?? null;
  if (!businessProfileId) {
    return jsonError("BUSINESS_PROFILE_ID_MISSING", "기존 구독의 사업자 인증 정보를 확인할 수 없습니다.", 409, {
      userId: user.id,
      restoreMenuSiteId,
      selectedProductKey,
    });
  }

  let businessProfile: RestoreBusinessProfile;
  try {
    businessProfile = await getVerifiedBusinessProfile({ adminSupabase, userId: user.id, businessProfileId });
  } catch (error) {
    return jsonError("BUSINESS_PROFILE_NOT_VERIFIED", "인증 완료된 사업자 정보가 필요합니다.", 403, {
      userId: user.id,
      businessProfileId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  const paymentId = `restore_${Date.now()}_${randomUUID()}`;
  const billingPeriod = getRestoreSubscriptionBillingPeriod(restore.product);
  let subscriptionId: string | null = null;

  try {
    subscriptionId = await createPendingRestoreSubscription({
      adminSupabase,
      userId: user.id,
      menuSiteId: restore.menuSite.id,
      businessProfileId: businessProfile.id,
      billingKey,
      productKey: restore.product.productKey,
      planType: restore.product.planType,
      billingCycle: restore.product.billingCycle,
      amount: restore.product.amount,
      currency: restore.product.currency,
    });
  } catch (error) {
    return jsonError("RESTORE_SUBSCRIPTION_INSERT_FAILED", "재구독 준비 기록 생성에 실패했습니다.", 500, {
      userId: user.id,
      restoreMenuSiteId,
      selectedProductKey,
      message: error instanceof Error ? error.message : "unknown",
    });
  }

  let billingPayment: Awaited<ReturnType<typeof payWithBillingKey>>;
  try {
    billingPayment = await payWithBillingKey({
      paymentId,
      billingKey,
      orderName: restore.product.name,
      amount: restore.product.amount,
      customer: {
        id: user.id,
        email: user.email,
        name: businessProfile.business_name ?? businessProfile.representative_name ?? undefined,
      },
    });
  } catch (error) {
    await markRestoreSubscriptionFailed(adminSupabase, subscriptionId);
    return jsonError("PORTONE_RESTORE_FIRST_PAYMENT_FAILED", "재구독 첫 결제에 실패했습니다.", 502, {
      userId: user.id,
      restoreMenuSiteId,
      selectedProductKey,
      paymentId,
      subscriptionId,
      ...getPortOneDebug(error),
    });
  }

  try {
    const result = await activateRestoreSubscriptionAfterPayment({
      adminSupabase,
      userId: user.id,
      restore,
      businessProfile,
      subscriptionId,
      billingKey,
      paymentId,
      billingPeriod,
      portonePayment: billingPayment.rawPayment,
    });

    return NextResponse.json({
      ok: true,
      message: "재구독 결제가 완료되어 메뉴판을 다시 이용할 수 있습니다.",
      menuSiteId: result.menuSiteId,
      slug: result.slug,
      subscriptionId,
      paymentId,
      aiCreditGrant: {
        grantedCredits: result.aiCreditGrant.grantedCredits,
        alreadyProcessed: result.aiCreditGrant.alreadyProcessed,
      },
    });
  } catch (error) {
    return jsonError("RESTORE_AFTER_PAYMENT_FAILED", "결제는 승인되었지만 메뉴판 복구 처리에 실패했습니다. 재결제하지 말고 고객지원으로 문의해주세요.", 500, {
      userId: user.id,
      restoreMenuSiteId,
      selectedProductKey,
      paymentId,
      subscriptionId,
      message: error instanceof Error ? error.message : "unknown",
    });
  }
}
