import { NextResponse } from "next/server";

import { getSubscriptionProduct, type SubscriptionProduct } from "@/lib/billing-products";
import {
  getBusinessFreeTrialPeriod,
  isBusinessFreeTrialProduct,
} from "@/lib/business-free-trial";
import { isDiningProductCompatibleWithTemplate } from "@/lib/dining-product-tiers";
import {
  DISPLAY_CHECKOUT_QA_PLAN_TYPE,
  DISPLAY_CHECKOUT_QA_PRODUCT_KEYS,
  DISPLAY_CHECKOUT_QA_TEMPLATE_CATEGORY,
  DISPLAY_CHECKOUT_QA_TEMPLATE_KEY,
} from "@/lib/display-checkout-qa-constants";
import { isDisplayCheckoutQaEnabled, isDisplayCheckoutQaMockBillingKey } from "@/lib/display-checkout-qa";
import {
  isTemplateKey,
  isValidMenuSlug,
  normalizeMenuSlug,
  type MenuOrderPayload,
} from "@/lib/payments";
import { validatePromotionForOrder } from "@/lib/promotions";
import { getPaidBillingPayment, payWithBillingKey, PortOneBillingError } from "@/lib/portone-billing";
import { portOneMockEnabled } from "@/lib/portone";
import { grantAiWelcomeCreditsForFirstMenuCreation } from "@/lib/server/ai-credits-service";
import { getBusinessFreeTrialEligibility } from "@/lib/server/business-free-trial-eligibility";
import { createInAppNotificationOnce } from "@/lib/server/in-app-notification-service";
import { ensurePurchasedMenuStarter } from "@/lib/server/purchased-menu-provisioning";
import { createStarterMenuData } from "@/lib/menu-starter-presets";
import { getDefaultBusinessCoverLabel, isBusinessTypeKey } from "@/lib/business-types";
import { getTemplateCategoryFromKey, getTemplateCategoryLabel, isTemplateCategoryKey } from "@/lib/templates";
import { isTemplateSupportedForCheckout } from "@/lib/server/mocha-forest-checkout-qa";
import {
  getBusinessProvisioningAction,
  getInitialSubscriptionPaymentId,
  normalizePurchaseAttemptId,
} from "@/lib/payment-provisioning-idempotency";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";

export const runtime = "nodejs";

type StartBusinessSubscriptionRequest = {
  mode?: unknown;
  billingKey?: unknown;
  businessProfileId?: unknown;
  product_key?: unknown;
  productKey?: unknown;
  billingCycle?: unknown;
  menuSiteId?: unknown;
  recoverPaymentId?: unknown;
  recoverSubscriptionId?: unknown;
  purchaseAttemptId?: unknown;
  order?: unknown;
  consentSnapshot?: unknown;
  startWithFreeTrial?: unknown;
};

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

type BusinessProfile = {
  id: string;
  user_id: string;
  business_registration_number: string | null;
  business_name: string | null;
  representative_name: string | null;
  verification_status: string | null;
};

type MenuSiteResult = {
  id: string;
  slug: string;
};

type ExistingMenuSite = {
  id: string;
  user_id: string;
  slug: string | null;
  status: string | null;
  settings: Json | null;
};

type ServiceEntitlement = {
  id: string;
  menu_site_id: string;
  plan_type: string | null;
  billing_type: string | null;
  status: string | null;
  data_retention_until: string | null;
};

type SubscriptionBillingPeriod = {
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingAt: string;
};

type RecoverableSubscription = {
  id: string;
  user_id: string;
  business_profile_id: string | null;
  product_key: string;
  plan_type: string;
  billing_cycle: string;
  status: string;
  amount: number;
  menu_site_id: string | null;
  portone_payment_id: string | null;
};

type NormalizedBusinessOrder = MenuOrderPayload & {
  product_key:
    | "business_basic_monthly"
    | "business_basic_yearly"
    | "business_basic_single_monthly"
    | "business_basic_single_yearly"
    | "business_basic_multi_monthly"
    | "business_basic_multi_yearly"
    | "business_display_monthly"
    | "business_display_yearly";
  plan_type: "business_basic" | typeof DISPLAY_CHECKOUT_QA_PLAN_TYPE;
  payment_type: "subscription";
  billing_cycle: "monthly" | "yearly";
  template_key: NonNullable<MenuOrderPayload["template_key"]>;
};

type DebugStep =
  | "auth_user_check"
  | "request_body_parse"
  | "product_key_validation"
  | "business_profile_check"
  | "business_profile_verified_check"
  | "free_trial_eligibility_check"
  | "mode_validation"
  | "new_or_convert_precheck"
  | "menu_site_slug_validation"
  | "billing_key_presence_check"
  | "portone_first_payment_request"
  | "portone_first_payment_response"
  | "menu_site_create"
  | "starter_preset_create"
  | "business_subscription_insert"
  | "service_entitlement_insert"
  | "final_response";

type SafeDebugValue = boolean | number | string | null | undefined | { [key: string]: SafeDebugValue };
type SafeDebug = Record<string, SafeDebugValue>;

class BusinessSubscriptionRouteError extends Error {
  constructor(
    public step: DebugStep,
    public debugCode: string,
    message: string,
    public status = 500,
    public safeDebug: SafeDebug = {}
  ) {
    super(message);
  }
}

function isUniqueViolation(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "23505" || Boolean(error?.message?.includes("duplicate key value"));
}

function waitForProvisioningReplay(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function createBusinessPaymentPaidNotification({
  userId,
  paymentId,
  orderId,
  menuSiteId,
  subscriptionId,
  product,
  mode,
}: {
  userId: string;
  paymentId: string;
  orderId?: string | null;
  menuSiteId: string;
  subscriptionId: string;
  product: SubscriptionProduct;
  mode: "new" | "convert";
}) {
  try {
    const result = await createInAppNotificationOnce({
      userId,
      eventType: "payment_paid",
      title: "결제가 완료되었습니다.",
      message: "결제가 정상적으로 완료되었습니다. 결제/구독 내역에서 상세 내용을 확인할 수 있습니다.",
      href: "/mypage?tab=payments",
      periodKey: `payment_paid:${paymentId}`,
      metadata: {
        payment_id: paymentId,
        order_id: orderId ?? null,
        menu_site_id: menuSiteId,
        subscription_id: subscriptionId,
        product_key: product.productKey,
        amount: product.amount,
        mode,
      },
    });

    if (!result.ok) {
      console.error("[business-subscriptions/start] payment_paid in-app notification failed", {
        userId,
        paymentId,
        orderId,
        subscriptionId,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[business-subscriptions/start] payment_paid in-app notification failed", {
      userId,
      paymentId,
      orderId,
      subscriptionId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

function getSupabaseSafeDebug(error: { code?: string; message?: string; details?: string; hint?: string } | null | undefined) {
  if (!error) return {};

  return {
    supabaseCode: error.code,
    supabaseMessage: error.message,
    supabaseDetails: error.details,
    supabaseHint: error.hint,
  };
}

function logBusinessSubscriptionError({
  step,
  debugCode,
  message,
  userId,
  mode,
  productKey,
  billingCycle,
  safeDebug,
}: {
  step: DebugStep;
  debugCode: string;
  message: string;
  userId?: string | null;
  mode?: string | null;
  productKey?: string | null;
  billingCycle?: string | null;
  safeDebug?: SafeDebug;
}) {
  console.error("[business-subscriptions/start]", JSON.stringify({
    step,
    debugCode,
    message,
    userId,
    mode,
    productKey,
    billingCycle,
    ...(safeDebug ?? {}),
  }));
}

function logBusinessSubscriptionDebug(event: string, safeDebug: SafeDebug = {}) {
  if (process.env.NODE_ENV === "production") return;

  console.info("[business-subscriptions/start]", JSON.stringify({
    event,
    ...safeDebug,
  }));
}

function jsonStepError({
  step,
  debugCode,
  message,
  status = 400,
  userId,
  mode,
  productKey,
  billingCycle,
  safeDebug,
}: {
  step: DebugStep;
  debugCode: string;
  message: string;
  status?: number;
  userId?: string | null;
  mode?: string | null;
  productKey?: string | null;
  billingCycle?: string | null;
  safeDebug?: SafeDebug;
}) {
  logBusinessSubscriptionError({ step, debugCode, message, userId, mode, productKey, billingCycle, safeDebug });

  return NextResponse.json(
    {
      ok: false,
      step,
      message,
      debugCode,
      ...(process.env.NODE_ENV !== "production"
        ? {
            safeDebug: safeDebug ?? {},
            debug: {
              mode,
              productKey,
              billingCycle,
              ...(safeDebug ?? {}),
            },
          }
        : {}),
    },
    { status }
  );
}

function jsonCaughtError({
  error,
  fallbackStep,
  fallbackDebugCode,
  fallbackMessage,
  fallbackStatus = 500,
  userId,
  mode,
  productKey,
  billingCycle,
  safeDebug,
}: {
  error: unknown;
  fallbackStep: DebugStep;
  fallbackDebugCode: string;
  fallbackMessage: string;
  fallbackStatus?: number;
  userId?: string | null;
  mode?: string | null;
  productKey?: string | null;
  billingCycle?: string | null;
  safeDebug?: SafeDebug;
}) {
  if (error instanceof BusinessSubscriptionRouteError) {
    return jsonStepError({
      step: error.step,
      debugCode: error.debugCode,
      message: error.message,
      status: error.status,
      userId,
      mode,
      productKey,
      billingCycle,
      safeDebug: { ...safeDebug, ...error.safeDebug },
    });
  }

  return jsonStepError({
    step: fallbackStep,
    debugCode: fallbackDebugCode,
    message: error instanceof Error ? error.message : fallbackMessage,
    status: fallbackStatus,
    userId,
    mode,
    productKey,
    billingCycle,
    safeDebug,
  });
}

function getPortOneDebugCode(error: unknown) {
  if (error instanceof PortOneBillingError) return "PORTONE_BILLING_PAYMENT_FAILED";

  const message = error instanceof Error ? error.message : "";

  if (message.includes("payment id mismatch")) return "PORTONE_PAYMENT_ID_MISMATCH";
  if (message.includes("is not paid")) return "PORTONE_PAYMENT_NOT_PAID";
  if (message.includes("amount mismatch")) return "PORTONE_AMOUNT_MISMATCH";
  if (message.includes("request failed")) return "PORTONE_REQUEST_FAILED";

  return "PORTONE_FIRST_PAYMENT_FAILED";
}

function getPortOneStep(error: unknown): DebugStep {
  if (error instanceof PortOneBillingError) return "portone_first_payment_response";

  const message = error instanceof Error ? error.message : "";

  if (message.includes("payment id mismatch") || message.includes("is not paid") || message.includes("amount mismatch")) {
    return "portone_first_payment_response";
  }

  return "portone_first_payment_request";
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getRecoverablePaymentId(value: unknown) {
  const paymentId = getString(value);

  if (!paymentId || paymentId.length > 120 || !/^[A-Za-z0-9._:-]+$/.test(paymentId)) {
    return "";
  }

  return paymentId;
}

function getPortOneSafeDebug(error: unknown): SafeDebug {
  return error instanceof PortOneBillingError ? error.safeDebug : {};
}

function getNullableString(value: unknown) {
  const valueString = getString(value);
  return valueString || null;
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function isDisplayCheckoutQaProduct(product: SubscriptionProduct | null | undefined) {
  return Boolean(
    product &&
    DISPLAY_CHECKOUT_QA_PRODUCT_KEYS.some((productKey) => product.productKey === productKey) &&
    product.planType === DISPLAY_CHECKOUT_QA_PLAN_TYPE &&
    (product.billingCycle === "monthly" || product.billingCycle === "yearly") &&
    product.serviceType === "display" &&
    isDisplayCheckoutQaEnabled()
  );
}

function normalizeBusinessOrder(value: unknown): NormalizedBusinessOrder | null {
  const payload = getRecord(value);
  const product = getSubscriptionProduct(getString(payload.product_key));
  const isDisplayQaOrder = isDisplayCheckoutQaProduct(product);
  const templateKey = getString(payload.template_key);
  const templateCategoryInput = getString(payload.template_category);
  const templateCategory = isTemplateCategoryKey(templateCategoryInput)
    ? templateCategoryInput
    : getTemplateCategoryFromKey(templateKey);
  const desiredSlug = normalizeMenuSlug(getString(payload.desiredSlug));
  const amount = typeof payload.amount === "number" ? payload.amount : Number(payload.amount);
  const planKey = getString(payload.plan_key) || "basic";
  const restaurantType = getString(payload.restaurantType);
  const promotionValidation = validatePromotionForOrder({
    productKey: product?.productKey,
    promotionCode: payload.promotionCode,
    promotion: payload.promotion,
  });

  if (
    !product ||
    product.paymentType !== "subscription" ||
    product.serviceType !== (isDisplayQaOrder ? "display" : "basic") ||
    !isTemplateKey(templateKey) ||
    !templateCategory ||
    !isValidMenuSlug(desiredSlug) ||
    amount !== product.amount ||
    getString(payload.plan_type) !== product.planType ||
    getString(payload.payment_type) !== product.paymentType ||
    getString(payload.billing_cycle) !== product.billingCycle ||
    (isDisplayQaOrder && getString(payload.buyerType) !== "business") ||
    planKey !== (isDisplayQaOrder ? "large_screen" : "basic") ||
    (isDisplayQaOrder
      ? templateKey !== DISPLAY_CHECKOUT_QA_TEMPLATE_KEY || templateCategory !== DISPLAY_CHECKOUT_QA_TEMPLATE_CATEGORY
      : !isTemplateSupportedForCheckout(templateKey, "basic") || !isDiningProductCompatibleWithTemplate(product.productKey, templateKey))
  ) {
    return null;
  }

  if (!promotionValidation.ok) {
    return null;
  }

  const order: NormalizedBusinessOrder = {
    product_key: product.productKey as NormalizedBusinessOrder["product_key"],
    plan_type: product.planType,
    payment_type: product.paymentType,
    billing_cycle: product.billingCycle,
    plan_key: isDisplayQaOrder ? "large_screen" : "basic",
    template_category: templateCategory,
    template_key: templateKey,
    menuName: getString(payload.menuName),
    desiredSlug,
    restaurantName: getString(payload.restaurantName),
    restaurantCategory: getTemplateCategoryLabel(templateCategory),
    restaurantType: isBusinessTypeKey(restaurantType) ? restaurantType : templateCategory,
    restaurantAddress: getString(payload.restaurantAddress),
    restaurantPhone: getString(payload.restaurantPhone),
    openingHours: null,
    mapUrl: null,
    introTitle: null,
    introDescription: null,
    brandDescription: null,
    menuCoverTitle: null,
    menuCoverDescription: null,
    menuCoverLabel: getNullableString(payload.menuCoverLabel) ?? getDefaultBusinessCoverLabel(templateCategory),
    aboutDescription: null,
    instagramUrl: getNullableString(payload.instagramUrl),
    socialLinks: [],
    orderSetup: null,
    screenSetup: null,
    notes: getNullableString(payload.notes),
    buyerType: "business",
    buyerName: getString(payload.buyerName),
    buyerPhone: getString(payload.buyerPhone),
    buyerEmail: getString(payload.buyerEmail),
    businessName: getNullableString(payload.businessName),
    businessProfileId: getNullableString(payload.businessProfileId),
    representativeName: getNullableString(payload.representativeName),
    businessNumber: getNullableString(payload.businessNumber),
    businessOpeningDate: getNullableString(payload.businessOpeningDate),
    businessPhone: getNullableString(payload.businessPhone),
    termsAccepted: payload.termsAccepted === true,
    privacyAccepted: payload.privacyAccepted === true,
    contentPolicyAccepted: payload.contentPolicyAccepted === true,
    marketingAccepted: payload.marketingAccepted === true,
    consentAgreedAt: getNullableString(payload.consentAgreedAt),
    consentContext: getNullableString(payload.consentContext),
    promotionCode: promotionValidation.promotion?.promotionCode ?? null,
    promotion: promotionValidation.promotion,
    amount,
  };

  const requiredFields = [
    order.menuName,
    order.restaurantName,
    order.restaurantCategory,
    order.restaurantPhone,
    order.buyerName,
    order.buyerPhone,
    order.buyerEmail,
    order.businessName,
    order.businessProfileId,
    order.representativeName,
    order.businessNumber,
    order.businessOpeningDate,
  ];

  if (requiredFields.some((field) => !field) || !order.termsAccepted || !order.privacyAccepted || !order.contentPolicyAccepted) {
    return null;
  }

  return order;
}

function getSubscriptionBillingPeriod(
  product: SubscriptionProduct,
  now = new Date(),
  startsWithFreeTrial = false,
): SubscriptionBillingPeriod {
  const periodStart = new Date(now);
  const periodEnd = new Date(periodStart);

  if (startsWithFreeTrial) {
    const trialPeriod = getBusinessFreeTrialPeriod(periodStart);
    return {
      currentPeriodStart: trialPeriod.startsAt,
      currentPeriodEnd: trialPeriod.endsAt,
      nextBillingAt: trialPeriod.endsAt,
    };
  } else if (product.billingCycle === "yearly") {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  } else {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  }

  return {
    currentPeriodStart: periodStart.toISOString(),
    currentPeriodEnd: periodEnd.toISOString(),
    nextBillingAt: periodEnd.toISOString(),
  };
}

function getSubscriptionOrderName(product: SubscriptionProduct) {
  return product.name;
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined, relationName: string) {
  return error?.code === "42P01" || Boolean(error?.message?.includes(relationName));
}

async function ensureBillingTables(adminSupabase: ReturnType<typeof createAdminClient>) {
  const subscriptionCheck = await adminSupabase.from("business_subscriptions" as never).select("id").limit(1);

  if (subscriptionCheck.error && isMissingRelationError(subscriptionCheck.error, "business_subscriptions")) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "BUSINESS_SUBSCRIPTIONS_TABLE_MISSING",
      "business_subscriptions 테이블 migration 적용이 필요합니다.",
      500,
      getSupabaseSafeDebug(subscriptionCheck.error)
    );
  }

  if (subscriptionCheck.error) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "BUSINESS_SUBSCRIPTIONS_TABLE_CHECK_FAILED",
      "business_subscriptions 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(subscriptionCheck.error)
    );
  }

  const entitlementCheck = await adminSupabase.from("service_entitlements").select("id").limit(1);

  if (entitlementCheck.error && isMissingRelationError(entitlementCheck.error, "service_entitlements")) {
    throw new BusinessSubscriptionRouteError(
      "service_entitlement_insert",
      "SERVICE_ENTITLEMENTS_TABLE_MISSING",
      "service_entitlements 테이블 migration 적용이 필요합니다.",
      500,
      getSupabaseSafeDebug(entitlementCheck.error)
    );
  }

  if (entitlementCheck.error) {
    throw new BusinessSubscriptionRouteError(
      "service_entitlement_insert",
      "SERVICE_ENTITLEMENTS_TABLE_CHECK_FAILED",
      "service_entitlements 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(entitlementCheck.error)
    );
  }
}

async function getVerifiedBusinessProfile(
  adminSupabase: ReturnType<typeof createAdminClient>,
  userId: string,
  businessProfileId: string
) {
  const { data, error } = await adminSupabase
    .from("business_profiles")
    .select("id, user_id, business_registration_number, business_name, representative_name, verification_status")
    .eq("id", businessProfileId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "business_profile_check",
      "BUSINESS_PROFILE_QUERY_FAILED",
      "사업자 인증 정보 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  return data as BusinessProfile | null;
}

async function createPendingSubscription({
  adminSupabase,
  subscriptionId,
  userId,
  businessProfileId,
  billingKey,
  product,
  menuSiteId,
  trialPeriod,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscriptionId: string;
  userId: string;
  businessProfileId: string;
  billingKey: string;
  product: SubscriptionProduct;
  menuSiteId?: string | null;
  trialPeriod?: SubscriptionBillingPeriod | null;
}) {
  const trialFields = trialPeriod
    ? {
        trial_started_at: trialPeriod.currentPeriodStart,
        trial_ends_at: trialPeriod.currentPeriodEnd,
      }
    : {};
  const { data, error } = await adminSupabase
    .from("business_subscriptions" as never)
    .insert(({
      id: subscriptionId,
      user_id: userId,
      menu_site_id: menuSiteId ?? null,
      business_profile_id: businessProfileId,
      product_key: product.productKey,
      plan_type: product.planType,
      billing_cycle: product.billingCycle,
      billing_key_ref: billingKey,
      status: "pending",
      amount: product.amount,
      currency: product.currency,
      ...trialFields,
    }) as never)
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      throw new BusinessSubscriptionRouteError(
        "business_subscription_insert",
        "PURCHASE_ATTEMPT_ALREADY_EXISTS",
        "동일 구매 시도가 이미 처리 중입니다. 새 결제를 시작하지 말고 잠시 후 기존 결과를 확인해주세요.",
        409,
        { subscriptionId }
      );
    }

    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "BUSINESS_SUBSCRIPTION_INSERT_FAILED",
      "구독 준비 기록 생성에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  return (data as { id: string }).id;
}

async function getCompletedBusinessProvisioning({
  adminSupabase,
  subscriptionId,
  userId,
  product,
  paymentId,
  isFreeTrial,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscriptionId: string;
  userId: string;
  product: SubscriptionProduct;
  paymentId: string;
  isFreeTrial: boolean;
}) {
  const subscriptionSelection = isFreeTrial
    ? "id, user_id, product_key, plan_type, billing_cycle, status, menu_site_id, portone_payment_id, next_billing_at, trial_started_at, trial_ends_at"
    : "id, user_id, product_key, plan_type, billing_cycle, status, menu_site_id, portone_payment_id, next_billing_at";
  const { data, error } = await adminSupabase
    .from("business_subscriptions" as never)
    .select(subscriptionSelection as never)
    .eq("id" as never, subscriptionId as never)
    .eq("user_id" as never, userId as never)
    .maybeSingle();

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "PURCHASE_ATTEMPT_QUERY_FAILED",
      "기존 구매 처리 상태 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  const subscription = data as {
    id: string;
    user_id: string;
    product_key: string;
    plan_type: string;
    billing_cycle: string;
    status: string;
    menu_site_id: string | null;
    portone_payment_id: string | null;
    next_billing_at: string | null;
    trial_started_at?: string | null;
    trial_ends_at?: string | null;
  } | null;

  if (!subscription) return null;

  if (
    subscription.product_key !== product.productKey ||
    subscription.plan_type !== product.planType ||
    subscription.billing_cycle !== product.billingCycle
  ) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "PURCHASE_ATTEMPT_CONTEXT_MISMATCH",
      "같은 구매 시도 ID가 다른 상품에 연결되어 있습니다. 관리자 확인이 필요합니다.",
      409,
      { subscriptionId, paymentId }
    );
  }

  const hasExpectedPaymentState = isFreeTrial
    ? subscription.portone_payment_id === null && Boolean(subscription.trial_started_at) && Boolean(subscription.trial_ends_at)
    : subscription.portone_payment_id === paymentId;

  if (subscription.status !== "active" || !subscription.menu_site_id || !hasExpectedPaymentState) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "PURCHASE_ATTEMPT_INCOMPLETE",
      "동일 구매 시도가 이미 진행됐지만 완료되지 않았습니다. 새 결제를 시작하지 말고 기존 결제 후처리를 복구해주세요.",
      409,
      {
        subscriptionId,
        paymentId,
        status: subscription.status,
        hasMenuSiteId: Boolean(subscription.menu_site_id),
        hasPaymentId: Boolean(subscription.portone_payment_id),
      }
    );
  }

  const [{ data: menuSite, error: menuSiteError }, orderResult, paymentResult, entitlementResult] = await Promise.all([
    adminSupabase.from("menu_sites").select("id, slug").eq("id", subscription.menu_site_id).eq("user_id", userId).maybeSingle(),
    adminSupabase.from("orders").select("id").eq("payment_id", paymentId).eq("menu_site_id", subscription.menu_site_id).limit(1),
    adminSupabase.from("payments").select("id").eq("payment_id", paymentId).limit(1),
    adminSupabase
      .from("service_entitlements")
      .select("id")
      .eq("subscription_id", subscriptionId)
      .eq("menu_site_id", subscription.menu_site_id)
      .limit(1),
  ]);
  const relationError = menuSiteError ?? orderResult.error ?? paymentResult.error ?? entitlementResult.error;

  if (relationError) {
    throw new BusinessSubscriptionRouteError(
      "final_response",
      "PURCHASE_ATTEMPT_COMPLETION_QUERY_FAILED",
      "기존 구매 결과 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(relationError)
    );
  }

  const provisioningAction = isFreeTrial
    ? (entitlementResult.data?.length ?? 0) > 0 ? "return_existing" : "recover"
    : getBusinessProvisioningAction({
        expectedPaymentId: paymentId,
        snapshot: {
          status: subscription.status,
          menuSiteId: subscription.menu_site_id,
          paymentId: subscription.portone_payment_id,
          hasOrder: (orderResult.data?.length ?? 0) > 0,
          hasPayment: (paymentResult.data?.length ?? 0) > 0,
          hasEntitlement: (entitlementResult.data?.length ?? 0) > 0,
        },
      });

  if (!menuSite || provisioningAction !== "return_existing") {
    throw new BusinessSubscriptionRouteError(
      "final_response",
      "PURCHASE_ATTEMPT_REQUIRES_RECOVERY",
      "결제는 확인되었지만 일부 연결 정보가 완료되지 않았습니다. 새 결제를 시작하지 말고 기존 결제 후처리를 복구해주세요.",
      409,
      {
        subscriptionId,
        paymentId,
        hasMenuSite: Boolean(menuSite),
        hasOrder: (orderResult.data?.length ?? 0) > 0,
        hasPayment: (paymentResult.data?.length ?? 0) > 0,
        hasEntitlement: (entitlementResult.data?.length ?? 0) > 0,
      }
    );
  }

  return {
    menuSiteId: menuSite.id,
    slug: menuSite.slug,
    subscriptionId,
    paymentId: isFreeTrial ? null : paymentId,
    nextBillingAt: subscription.next_billing_at,
    trialEndsAt: isFreeTrial ? subscription.trial_ends_at : null,
  };
}

async function waitForCompletedBusinessProvisioning({
  adminSupabase,
  subscriptionId,
  userId,
  product,
  paymentId,
  isFreeTrial,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscriptionId: string;
  userId: string;
  product: SubscriptionProduct;
  paymentId: string;
  isFreeTrial: boolean;
}) {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const completed = await getCompletedBusinessProvisioning({
        adminSupabase,
        subscriptionId,
        userId,
        product,
        paymentId,
        isFreeTrial,
      });
      if (completed) return completed;
    } catch (error) {
      const isStillRunning =
        error instanceof BusinessSubscriptionRouteError &&
        (error.debugCode === "PURCHASE_ATTEMPT_INCOMPLETE" ||
          error.debugCode === "PURCHASE_ATTEMPT_REQUIRES_RECOVERY");
      if (!isStillRunning) throw error;
    }

    await waitForProvisioningReplay(250);
  }

  return null;
}

async function getRecoverableSubscription({
  adminSupabase,
  subscriptionId,
  userId,
  businessProfileId,
  product,
  paymentId,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscriptionId: string;
  userId: string;
  businessProfileId: string;
  product: SubscriptionProduct;
  paymentId: string;
}) {
  const { data, error } = await adminSupabase
    .from("business_subscriptions" as never)
    .select("id, user_id, business_profile_id, product_key, plan_type, billing_cycle, status, amount, menu_site_id, portone_payment_id")
    .eq("id" as never, subscriptionId as never)
    .eq("user_id" as never, userId as never)
    .maybeSingle();

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "RECOVERY_SUBSCRIPTION_QUERY_FAILED",
      "복구할 구독 준비 기록 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  const subscription = data as RecoverableSubscription | null;

  if (
    !subscription ||
    subscription.business_profile_id !== businessProfileId ||
    subscription.product_key !== product.productKey ||
    subscription.plan_type !== product.planType ||
    subscription.billing_cycle !== product.billingCycle ||
    !["pending", "failed", "active"].includes(subscription.status) ||
    subscription.amount !== product.amount ||
    (subscription.portone_payment_id !== null && subscription.portone_payment_id !== paymentId)
  ) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "RECOVERY_SUBSCRIPTION_NOT_RECOVERABLE",
      "복구 가능한 구독 기록을 찾지 못했습니다.",
      409,
      {
        hasSubscription: Boolean(subscription),
        status: subscription?.status,
        productKey: subscription?.product_key,
        billingCycle: subscription?.billing_cycle,
        amount: subscription?.amount,
        hasMenuSiteId: Boolean(subscription?.menu_site_id),
        hasPortonePaymentId: Boolean(subscription?.portone_payment_id),
      }
    );
  }

  return subscription;
}

async function ensureNoConflictingPaymentRecords({
  adminSupabase,
  paymentId,
  subscriptionId,
  menuSiteId,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  paymentId: string;
  subscriptionId: string;
  menuSiteId: string | null;
}) {
  const [orderResult, paymentResult, subscriptionResult] = await Promise.all([
    adminSupabase.from("orders").select("id, menu_site_id").eq("payment_id", paymentId).limit(1),
    adminSupabase.from("payments").select("id, order_id").or(`payment_id.eq.${paymentId},portone_payment_id.eq.${paymentId}`).limit(1),
    adminSupabase.from("business_subscriptions" as never).select("id").eq("portone_payment_id" as never, paymentId as never).limit(2),
  ]);

  const error = orderResult.error ?? paymentResult.error ?? subscriptionResult.error;

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "RECOVERY_CONFLICT_CHECK_FAILED",
      "기존 결제 연결 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  const order = orderResult.data?.[0] ?? null;
  const subscriptionIds = (subscriptionResult.data ?? []).map((row) => (row as { id: string }).id);
  const hasConflictingOrder = Boolean(order?.menu_site_id && menuSiteId && order.menu_site_id !== menuSiteId);
  const hasConflictingSubscription = subscriptionIds.some((id) => id !== subscriptionId);

  if (hasConflictingOrder || hasConflictingSubscription) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "RECOVERY_PAYMENT_CONTEXT_CONFLICT",
      "결제가 다른 구독 또는 메뉴판에 연결되어 있어 관리자 확인이 필요합니다.",
      409,
      {
        hasOrder: Boolean(order),
        hasPayment: (paymentResult.data?.length ?? 0) > 0,
        hasConflictingOrder,
        hasConflictingSubscription,
      }
    );
  }
}

async function markSubscriptionFailed(adminSupabase: ReturnType<typeof createAdminClient>, subscriptionId: string) {
  await adminSupabase.from("business_subscriptions" as never).update(({ status: "failed" }) as never).eq("id" as never, subscriptionId as never);
}

async function markSubscriptionActive({
  adminSupabase,
  subscriptionId,
  menuSiteId,
  paymentId,
  billingPeriod,
  isFreeTrial,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  subscriptionId: string;
  menuSiteId: string;
  paymentId: string | null;
  billingPeriod: SubscriptionBillingPeriod;
  isFreeTrial: boolean;
}) {
  const trialFields = isFreeTrial
    ? {
        trial_started_at: billingPeriod.currentPeriodStart,
        trial_ends_at: billingPeriod.currentPeriodEnd,
      }
    : {};
  const { error } = await adminSupabase
    .from("business_subscriptions" as never)
    .update(({
      menu_site_id: menuSiteId,
      status: "active",
      portone_payment_id: paymentId,
      last_paid_at: isFreeTrial ? null : billingPeriod.currentPeriodStart,
      current_period_start: billingPeriod.currentPeriodStart,
      current_period_end: billingPeriod.currentPeriodEnd,
      next_billing_at: billingPeriod.nextBillingAt,
      ...trialFields,
    }) as never)
    .eq("id" as never, subscriptionId as never);

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "business_subscription_insert",
      "BUSINESS_SUBSCRIPTION_ACTIVATE_FAILED",
      "구독 기록 활성화에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }
}

async function ensureSlugAvailable(adminSupabase: ReturnType<typeof createAdminClient>, slug: string) {
  const { data, error } = await adminSupabase.from("menu_sites").select("id").eq("slug", slug).maybeSingle();

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "menu_site_slug_validation",
      "MENU_SITE_SLUG_QUERY_FAILED",
      "메뉴판 주소 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  if (data) {
    throw new BusinessSubscriptionRouteError(
      "menu_site_slug_validation",
      "MENU_SITE_SLUG_ALREADY_EXISTS",
      "이미 사용 중인 공개 메뉴판 주소입니다.",
      409,
      { hasExistingMenuSite: true }
    );
  }
}

async function createBusinessMenuSite({
  supabase,
  userId,
  order,
  product,
  subscriptionId,
  billingPeriod,
}: {
  supabase: ServerSupabaseClient;
  userId: string;
  order: NormalizedBusinessOrder;
  product: SubscriptionProduct;
  subscriptionId: string;
  billingPeriod: SubscriptionBillingPeriod;
}) {
  const settings = {
    source: "business_subscription",
    product_key: product.productKey,
    plan_type: product.planType,
    payment_type: product.paymentType,
    billing_cycle: product.billingCycle,
    subscription_id: subscriptionId,
    access_starts_at: billingPeriod.currentPeriodStart,
    access_expires_at: billingPeriod.currentPeriodEnd,
    current_period_start: billingPeriod.currentPeriodStart,
    current_period_end: billingPeriod.currentPeriodEnd,
    next_billing_at: billingPeriod.nextBillingAt,
    auto_renewal: true,
    buyer_email: order.buyerEmail,
  };
  const insertPayload: Database["public"]["Tables"]["menu_sites"]["Insert"] = {
    user_id: userId,
    name: order.menuName,
    slug: order.desiredSlug,
    template_key: order.template_key,
    template_category: order.template_category,
    status: "draft",
    restaurant_name: order.restaurantName,
    restaurant_category: order.restaurantCategory,
    restaurant_type: order.restaurantType,
    restaurant_address: order.restaurantAddress,
    restaurant_phone: order.restaurantPhone,
    menu_cover_label: order.menuCoverLabel,
    business_name: order.businessName,
    instagram_url: order.instagramUrl,
    notes: order.notes,
    settings,
  };
  const { data: insertedMenuSite, error } = await supabase.from("menu_sites").insert(insertPayload).select("id, slug").single();
  let data = insertedMenuSite;

  if (error) {
    if (isUniqueViolation(error)) {
      const { data: existingProvisionedMenu, error: existingProvisionedMenuError } = await supabase
        .from("menu_sites")
        .select("id")
        .eq("user_id", userId)
        .contains("settings", { subscription_id: subscriptionId })
        .maybeSingle();

      if (existingProvisionedMenuError) {
        throw new BusinessSubscriptionRouteError(
          "menu_site_create",
          "MENU_SITE_PROVISIONING_QUERY_FAILED",
          "동일 구독의 메뉴판 생성 상태 확인에 실패했습니다.",
          500,
          getSupabaseSafeDebug(existingProvisionedMenuError)
        );
      }

      if (existingProvisionedMenu) {
        throw new BusinessSubscriptionRouteError(
          "menu_site_create",
          "MENU_SITE_PROVISIONING_IN_PROGRESS",
          "동일 구독의 메뉴판 생성이 이미 진행 중입니다.",
          409,
          { subscriptionId, menuSiteId: existingProvisionedMenu.id }
        );
      }

      if (error.message.includes("slug")) {
        throw new BusinessSubscriptionRouteError(
          "menu_site_create",
          "MENU_SITE_SLUG_ALREADY_EXISTS",
          "이미 사용 중인 공개 메뉴판 주소입니다.",
          409
        );
      }
    }

    const minimalInsertPayload: Record<string, unknown> = {
      user_id: userId,
      name: order.menuName,
      slug: order.desiredSlug,
      template_key: order.template_key,
      status: "draft",
      restaurant_name: order.restaurantName,
      restaurant_category: order.restaurantCategory,
      restaurant_address: order.restaurantAddress,
      restaurant_phone: order.restaurantPhone,
      instagram_url: order.instagramUrl,
      notes: order.notes,
      settings,
    };
    const fallbackResult = await supabase.from("menu_sites").insert(minimalInsertPayload as never).select("id, slug").single();

    data = fallbackResult.data;

    if (fallbackResult.error || !data) {
      const finalError = fallbackResult.error ?? error;
      if (isUniqueViolation(finalError)) {
        const { data: existingProvisionedMenu } = await supabase
          .from("menu_sites")
          .select("id")
          .eq("user_id", userId)
          .contains("settings", { subscription_id: subscriptionId })
          .maybeSingle();

        if (existingProvisionedMenu) {
          throw new BusinessSubscriptionRouteError(
            "menu_site_create",
            "MENU_SITE_PROVISIONING_IN_PROGRESS",
            "동일 구독의 메뉴판 생성이 이미 진행 중입니다.",
            409,
            { subscriptionId, menuSiteId: existingProvisionedMenu.id }
          );
        }
      }

      throw new BusinessSubscriptionRouteError(
        "menu_site_create",
        "MENU_SITE_CREATE_FAILED",
        "사업자 메뉴판 생성에 실패했습니다.",
        500,
        {
          ...getSupabaseSafeDebug(finalError),
          initialSupabaseCode: error.code,
          initialSupabaseMessage: error.message,
          insertPayloadKeys: Object.keys(insertPayload).join(","),
          fallbackInsertPayloadKeys: Object.keys(minimalInsertPayload).join(","),
          productKey: product.productKey,
          planType: product.planType,
          serviceType: product.serviceType,
          templateKey: order.template_key,
          slug: order.desiredSlug,
          hasUserId: Boolean(userId),
          hasBusinessProfileId: Boolean(order.businessProfileId),
        }
      );
    }
  }

  if (!data) {
    throw new BusinessSubscriptionRouteError(
      "menu_site_create",
      "MENU_SITE_CREATE_FAILED",
      "사업자 메뉴판 생성에 실패했습니다.",
      500,
      {
        insertPayloadKeys: Object.keys(insertPayload).join(","),
        productKey: product.productKey,
        planType: product.planType,
        serviceType: product.serviceType,
        templateKey: order.template_key,
        slug: order.desiredSlug,
        hasUserId: Boolean(userId),
        hasBusinessProfileId: Boolean(order.businessProfileId),
      }
    );
  }

  const menuSite = data as MenuSiteResult;
  try {
    await createStarterMenuData(
      supabase,
      menuSite.id,
      order.template_key,
      order.restaurantCategory,
      order.template_category,
      product.productKey
    );
  } catch (error) {
    throw new BusinessSubscriptionRouteError(
      "starter_preset_create",
      "STARTER_PRESET_CREATE_FAILED",
      error instanceof Error ? error.message : "스타터 메뉴 데이터 생성에 실패했습니다.",
      500,
      { menuSiteId: menuSite.id }
    );
  }

  return menuSite;
}

async function getConvertibleMenuSite(adminSupabase: ReturnType<typeof createAdminClient>, userId: string, menuSiteId: string) {
  const { data, error } = await adminSupabase
    .from("menu_sites")
    .select("id, user_id, slug, status, settings")
    .eq("id", menuSiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "new_or_convert_precheck",
      "CONVERT_MENU_SITE_QUERY_FAILED",
      "전환 대상 메뉴판 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  return data as ExistingMenuSite | null;
}

async function getEntitlements(adminSupabase: ReturnType<typeof createAdminClient>, menuSiteId: string) {
  const { data, error } = await adminSupabase
    .from("service_entitlements")
    .select("id, menu_site_id, plan_type, billing_type, status, data_retention_until")
    .eq("menu_site_id", menuSiteId);

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "new_or_convert_precheck",
      "CONVERT_ENTITLEMENTS_QUERY_FAILED",
      "이용 상태 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  return (data ?? []) as ServiceEntitlement[];
}

function isPersonalTrialConvertible(entitlements: ServiceEntitlement[]) {
  return entitlements.some((entitlement) => {
    if (entitlement.plan_type !== "personal_trial") return false;
    if (entitlement.status === "pending_delete" || entitlement.status === "deleted") return false;

    const retentionTime = entitlement.data_retention_until ? new Date(entitlement.data_retention_until).getTime() : null;
    return retentionTime === null || !Number.isFinite(retentionTime) || retentionTime >= Date.now();
  });
}

function removeRetentionSettings(settings: Record<string, unknown>) {
  const nextSettings = { ...settings };
  const legacyRetentionKeys = [
    "data_retention_until",
    "deleted_scheduled_at",
    "retention_until",
    "expired_at",
    "data_deletion_scheduled_at",
  ];

  for (const key of legacyRetentionKeys) {
    delete nextSettings[key];
  }

  return nextSettings;
}

async function updateConvertedMenuSite({
  supabase,
  menuSite,
  product,
  subscriptionId,
  billingPeriod,
}: {
  supabase: ServerSupabaseClient;
  menuSite: ExistingMenuSite;
  product: SubscriptionProduct;
  subscriptionId: string;
  billingPeriod: SubscriptionBillingPeriod;
}) {
  const currentSettings = removeRetentionSettings(getRecord(menuSite.settings));
  const { data, error } = await supabase
    .from("menu_sites")
    .update({
      status: menuSite.status === "published" ? "published" : "draft",
      settings: {
        ...currentSettings,
        source: "business_subscription_conversion",
        product_key: product.productKey,
        plan_type: product.planType,
        payment_type: product.paymentType,
        billing_cycle: product.billingCycle,
        subscription_id: subscriptionId,
        access_starts_at: billingPeriod.currentPeriodStart,
        access_expires_at: billingPeriod.currentPeriodEnd,
        current_period_start: billingPeriod.currentPeriodStart,
        current_period_end: billingPeriod.currentPeriodEnd,
        next_billing_at: billingPeriod.nextBillingAt,
        auto_renewal: true,
      },
    })
    .eq("id", menuSite.id)
    .select("id, slug")
    .single();

  if (error || !data) {
    throw new BusinessSubscriptionRouteError(
      "menu_site_create",
      "CONVERT_MENU_SITE_UPDATE_FAILED",
      "기존 메뉴판 전환 상태 저장에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }

  return data as MenuSiteResult;
}

async function archivePersonalTrialEntitlements(adminSupabase: ReturnType<typeof createAdminClient>, menuSiteId: string) {
  const { error } = await adminSupabase
    .from("service_entitlements")
    .update({ status: "archived" })
    .eq("menu_site_id", menuSiteId)
    .eq("plan_type", "personal_trial")
    .neq("status", "deleted");

  if (error) {
    throw new BusinessSubscriptionRouteError(
      "service_entitlement_insert",
      "PERSONAL_TRIAL_ARCHIVE_FAILED",
      "개인 체험 보관 상태 처리에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }
}

async function createBusinessEntitlement({
  adminSupabase,
  userId,
  menuSiteId,
  businessProfileId,
  product,
  subscriptionId,
  billingPeriod,
}: {
  adminSupabase: ReturnType<typeof createAdminClient>;
  userId: string;
  menuSiteId: string;
  businessProfileId: string;
  product: SubscriptionProduct;
  subscriptionId: string;
  billingPeriod: SubscriptionBillingPeriod;
}) {
  const { data: existingEntitlements, error: existingEntitlementError } = await adminSupabase
    .from("service_entitlements")
    .select("id")
    .eq("user_id", userId)
    .eq("menu_site_id", menuSiteId)
    .eq("subscription_id", subscriptionId)
    .limit(1);

  if (existingEntitlementError) {
    throw new BusinessSubscriptionRouteError(
      "service_entitlement_insert",
      "BUSINESS_ENTITLEMENT_QUERY_FAILED",
      "기존 사업자 이용 상태 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(existingEntitlementError)
    );
  }

  if ((existingEntitlements?.length ?? 0) > 0) {
    return;
  }

  const { error } = await adminSupabase.from("service_entitlements").insert({
    user_id: userId,
    menu_site_id: menuSiteId,
    business_profile_id: businessProfileId,
    product_key: product.productKey,
    plan_key: product.serviceType,
    plan_type: product.planType,
    billing_type: product.paymentType,
    billing_cycle: product.billingCycle,
    subscription_id: subscriptionId,
    status: "active",
    access_starts_at: billingPeriod.currentPeriodStart,
    access_expires_at: billingPeriod.currentPeriodEnd,
    expired_at: null,
    data_retention_until: null,
    deleted_scheduled_at: null,
  });

  if (error) {
    if (isUniqueViolation(error)) {
      const { data: concurrentEntitlements, error: concurrentEntitlementError } = await adminSupabase
        .from("service_entitlements")
        .select("id")
        .eq("user_id", userId)
        .eq("menu_site_id", menuSiteId)
        .eq("subscription_id", subscriptionId)
        .limit(1);

      if (!concurrentEntitlementError && (concurrentEntitlements?.length ?? 0) > 0) {
        return;
      }
    }

    throw new BusinessSubscriptionRouteError(
      "service_entitlement_insert",
      "BUSINESS_ENTITLEMENT_INSERT_FAILED",
      "사업자 이용 상태 생성에 실패했습니다.",
      500,
      getSupabaseSafeDebug(error)
    );
  }
}

async function createOrderAndPaymentRecords({
  supabase,
  userId,
  paymentId,
  menuSiteId,
  product,
  businessProfile,
  portonePayment,
  consentSnapshot,
  promotionSnapshot,
}: {
  supabase: ServerSupabaseClient;
  userId: string;
  paymentId: string;
  menuSiteId: string;
  product: SubscriptionProduct;
  businessProfile: BusinessProfile;
  portonePayment?: unknown;
  consentSnapshot?: Json | null;
  promotionSnapshot?: Json | null;
}) {
  const safeRawPayload = JSON.parse(
    JSON.stringify({
      payment_type: product.paymentType,
      billing_cycle: product.billingCycle,
      product_key: product.productKey,
      plan_type: product.planType,
      promotion: promotionSnapshot ?? null,
      consent_snapshot: consentSnapshot ?? null,
      portone_payment_id: paymentId,
      portone_payment: portonePayment ?? null,
    })
  ) as Json;
  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("id, user_id, menu_site_id, product_key")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingOrderError) {
    throw new BusinessSubscriptionRouteError(
      "final_response",
      "ORDER_RECORD_QUERY_FAILED",
      "기존 사업자 주문 기록 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(existingOrderError)
    );
  }

  let orderId: string;

  if (existingOrder) {
    if (
      existingOrder.user_id !== userId ||
      existingOrder.product_key !== product.productKey ||
      (existingOrder.menu_site_id && existingOrder.menu_site_id !== menuSiteId)
    ) {
      throw new BusinessSubscriptionRouteError(
        "final_response",
        "ORDER_RECORD_CONTEXT_MISMATCH",
        "동일 결제의 주문 연결 정보가 일치하지 않아 관리자 확인이 필요합니다.",
        409,
        { paymentId, menuSiteId }
      );
    }

    orderId = existingOrder.id;
    if (!existingOrder.menu_site_id) {
      const { error: orderLinkError } = await supabase
        .from("orders")
        .update({ menu_site_id: menuSiteId, status: "paid" })
        .eq("id", orderId)
        .eq("user_id", userId);

      if (orderLinkError) {
        throw new BusinessSubscriptionRouteError(
          "final_response",
          "ORDER_RECORD_LINK_FAILED",
          "기존 사업자 주문과 메뉴판 연결에 실패했습니다.",
          500,
          getSupabaseSafeDebug(orderLinkError)
        );
      }
    }
  } else {
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .insert({
        user_id: userId,
        menu_site_id: menuSiteId,
        product_key: product.productKey,
        order_name: product.name,
        payment_id: paymentId,
        customer_name: businessProfile.business_name,
        buyer_name: businessProfile.representative_name,
        business_name: businessProfile.business_name,
        business_number: businessProfile.business_registration_number,
        raw_payload: safeRawPayload,
        status: "paid",
        total_amount: product.amount,
      })
      .select("id")
      .single();

    if (orderError || !order) {
      if (isUniqueViolation(orderError)) {
        const { data: concurrentOrder, error: concurrentOrderError } = await supabase
          .from("orders")
          .select("id, user_id, menu_site_id, product_key")
          .eq("payment_id", paymentId)
          .maybeSingle();

        if (
          !concurrentOrderError &&
          concurrentOrder?.user_id === userId &&
          concurrentOrder.product_key === product.productKey &&
          concurrentOrder.menu_site_id === menuSiteId
        ) {
          orderId = concurrentOrder.id;
        } else {
          throw new BusinessSubscriptionRouteError(
            "final_response",
            "ORDER_RECORD_UNIQUE_CONFLICT",
            "동일 결제의 주문 연결을 재확인할 수 없어 관리자 확인이 필요합니다.",
            409,
            { paymentId, menuSiteId }
          );
        }
      } else {
        throw new BusinessSubscriptionRouteError(
          "final_response",
          "ORDER_RECORD_INSERT_FAILED",
          "사업자 주문 기록 저장에 실패했습니다.",
          500,
          getSupabaseSafeDebug(orderError)
        );
      }
    } else {
      orderId = (order as { id: string }).id;
    }
  }

  const { data: existingPayment, error: existingPaymentError } = await supabase
    .from("payments")
    .select("id, user_id, order_id, product_key")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (existingPaymentError) {
    throw new BusinessSubscriptionRouteError(
      "final_response",
      "PAYMENT_RECORD_QUERY_FAILED",
      "기존 사업자 결제 기록 확인에 실패했습니다.",
      500,
      getSupabaseSafeDebug(existingPaymentError)
    );
  }

  if (existingPayment) {
    if (
      existingPayment.user_id !== userId ||
      existingPayment.product_key !== product.productKey ||
      (existingPayment.order_id && existingPayment.order_id !== orderId)
    ) {
      throw new BusinessSubscriptionRouteError(
        "final_response",
        "PAYMENT_RECORD_CONTEXT_MISMATCH",
        "동일 결제의 주문 연결 정보가 일치하지 않아 관리자 확인이 필요합니다.",
        409,
        { paymentId, orderId }
      );
    }

    if (!existingPayment.order_id) {
      const { error: paymentLinkError } = await supabase
        .from("payments")
        .update({ order_id: orderId, status: "paid" })
        .eq("id", existingPayment.id)
        .eq("user_id", userId);

      if (paymentLinkError) {
        throw new BusinessSubscriptionRouteError(
          "final_response",
          "PAYMENT_RECORD_LINK_FAILED",
          "기존 사업자 결제와 주문 연결에 실패했습니다.",
          500,
          getSupabaseSafeDebug(paymentLinkError)
        );
      }
    }
  } else {
    const { error: paymentError } = await supabase.from("payments").insert({
      user_id: userId,
      order_id: orderId,
      product_key: product.productKey,
      payment_id: paymentId,
      portone_payment_id: paymentId,
      status: "paid",
      amount: product.amount,
      raw_payload: safeRawPayload,
    });

    if (paymentError) {
      if (isUniqueViolation(paymentError)) {
        const { data: concurrentPayment, error: concurrentPaymentError } = await supabase
          .from("payments")
          .select("id, user_id, order_id, product_key, payment_id, portone_payment_id")
          .or(`payment_id.eq.${paymentId},portone_payment_id.eq.${paymentId},order_id.eq.${orderId}`)
          .limit(2);
        const matchingPayment = (concurrentPayment ?? []).find((row) =>
          row.user_id === userId &&
          row.product_key === product.productKey &&
          row.order_id === orderId &&
          (row.payment_id === paymentId || row.portone_payment_id === paymentId)
        );

        if (!concurrentPaymentError && matchingPayment) {
          return { orderId };
        }

        throw new BusinessSubscriptionRouteError(
          "final_response",
          "PAYMENT_RECORD_UNIQUE_CONFLICT",
          "동일 결제의 결제 기록 연결을 재확인할 수 없어 관리자 확인이 필요합니다.",
          409,
          { paymentId, orderId }
        );
      }

      throw new BusinessSubscriptionRouteError(
        "final_response",
        "PAYMENT_RECORD_INSERT_FAILED",
        "사업자 결제 기록 저장에 실패했습니다.",
        500,
        getSupabaseSafeDebug(paymentError)
      );
    }
  }

  return { orderId };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonStepError({
      step: "auth_user_check",
      debugCode: "AUTH_REQUIRED",
      message: "로그인이 필요합니다.",
      status: 401,
    });
  }

  let body: StartBusinessSubscriptionRequest;

  try {
    body = (await request.json()) as StartBusinessSubscriptionRequest;
  } catch {
    return jsonStepError({
      step: "request_body_parse",
      debugCode: "INVALID_JSON_BODY",
      message: "요청 본문이 올바른 JSON이 아닙니다.",
      status: 400,
      userId: user.id,
    });
  }

  const mode = getString(body.mode);
  const billingKey = getString(body.billingKey);
  const businessProfileId = getString(body.businessProfileId);
  const requestedProductKey = getString(body.product_key) || getString(body.productKey);
  const requestedBillingCycle = getString(body.billingCycle);
  const recoverPaymentId = getRecoverablePaymentId(body.recoverPaymentId);
  const recoverSubscriptionId = getString(body.recoverSubscriptionId);
  const isPaymentRecovery = Boolean(recoverPaymentId || recoverSubscriptionId);
  const requestedFreeTrial = body.startWithFreeTrial === true;
  const purchaseAttemptId = normalizePurchaseAttemptId(body.purchaseAttemptId);
  const product = getSubscriptionProduct(requestedProductKey);
  const baseDebug = {
    hasBillingKey: Boolean(billingKey),
    hasBusinessProfileId: Boolean(businessProfileId),
    hasMenuSiteId: Boolean(getString(body.menuSiteId)),
    hasRecoverPaymentId: Boolean(recoverPaymentId),
    hasRecoverSubscriptionId: Boolean(recoverSubscriptionId),
    hasPurchaseAttemptId: Boolean(purchaseAttemptId),
    requestedFreeTrial,
    amount: product?.amount ?? null,
  };

  if (!product || product.paymentType !== "subscription") {
    return jsonStepError({
      step: "product_key_validation",
      debugCode: "INVALID_SUBSCRIPTION_PRODUCT",
      message: "사업자 월/연 상품만 구독 결제로 처리할 수 있습니다.",
      status: 400,
      userId: user.id,
      mode,
      productKey: requestedProductKey,
      billingCycle: requestedBillingCycle,
      safeDebug: baseDebug,
    });
  }

  if (mode !== "new" && mode !== "convert") {
    return jsonStepError({
      step: "mode_validation",
      debugCode: "INVALID_MODE",
      message: "구독 시작 모드가 올바르지 않습니다.",
      status: 400,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: requestedBillingCycle,
      safeDebug: baseDebug,
    });
  }

  if (
    requestedFreeTrial &&
    (mode !== "new" || isPaymentRecovery || !isBusinessFreeTrialProduct(product.productKey))
  ) {
    return jsonStepError({
      step: "free_trial_eligibility_check",
      debugCode: "FREE_TRIAL_PRODUCT_NOT_ELIGIBLE",
      message: "30일 무료체험은 신규 단일페이지 월결제에만 적용할 수 있습니다.",
      status: 400,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  if (mode === "new" && !isPaymentRecovery && !product.allowNewMenuSiteCreation) {
    return jsonStepError({
      step: "new_or_convert_precheck",
      debugCode: "LEGACY_PRODUCT_NEW_PURCHASE_NOT_ALLOWED",
      message: "기존 고객 전용 상품은 새로 신청할 수 없습니다. 현재 판매 중인 단일·멀티페이지 상품을 선택해주세요.",
      status: 409,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  if (isPaymentRecovery && (!recoverPaymentId || !recoverSubscriptionId)) {
    return jsonStepError({
      step: "billing_key_presence_check",
      debugCode: "RECOVERY_PAYMENT_CONTEXT_MISSING",
      message: "후처리 복구에는 paymentId와 실패 구독 기록 ID가 모두 필요합니다.",
      status: 400,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  if (!isPaymentRecovery && !purchaseAttemptId) {
    return jsonStepError({
      step: "request_body_parse",
      debugCode: "PURCHASE_ATTEMPT_ID_REQUIRED",
      message: "구매 시도 식별자가 없습니다. 결제창을 다시 열지 말고 신청 화면을 새로고침한 뒤 다시 진행해주세요.",
      status: 400,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  const canonicalSubscriptionId = isPaymentRecovery ? recoverSubscriptionId : (purchaseAttemptId as string);
  const canonicalPaymentId = isPaymentRecovery
    ? (recoverPaymentId as string)
    : getInitialSubscriptionPaymentId(purchaseAttemptId as string);

  if (requestedBillingCycle && requestedBillingCycle !== product.billingCycle) {
    return jsonStepError({
      step: "product_key_validation",
      debugCode: "BILLING_CYCLE_MISMATCH",
      message: "상품과 결제 주기가 일치하지 않습니다.",
      status: 400,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: requestedBillingCycle,
      safeDebug: { ...baseDebug, expectedBillingCycle: product.billingCycle },
    });
  }

  if (mode === "convert" && !product.allowConvertFromPersonalTrial) {
    return jsonStepError({
      step: "new_or_convert_precheck",
      debugCode: "DISPLAY_CONVERT_NOT_ALLOWED",
      message: "아티메뉴 디스플레이 플랜은 기존 아티메뉴 다이닝 체험 메뉴판에서 바로 전환할 수 없습니다. 아티메뉴 디스플레이는 신규 신청으로 이용해주세요.",
      status: 409,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  if (mode === "new" && product.serviceType === "display" && !isDisplayCheckoutQaProduct(product)) {
    return jsonStepError({
      step: "new_or_convert_precheck",
      debugCode: "DISPLAY_NEW_NOT_READY",
      message: "아티메뉴 디스플레이 신규 사업자 신청은 전용 템플릿 준비 후 제공됩니다.",
      status: 409,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: { ...baseDebug, displayCheckoutQaEnabled: isDisplayCheckoutQaEnabled() },
    });
  }

  if (!businessProfileId) {
    return jsonStepError({
      step: "business_profile_check",
      debugCode: "BUSINESS_PROFILE_ID_MISSING",
      message: "사업자 인증 정보가 필요합니다.",
      status: 400,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;

  try {
    adminSupabase = createAdminClient();
    await ensureBillingTables(adminSupabase);
  } catch (error) {
    return jsonCaughtError({
      error,
      fallbackStep: "business_subscription_insert",
      fallbackDebugCode: "BILLING_TABLE_PRECHECK_FAILED",
      fallbackMessage: "구독 결제 설정을 확인해주세요.",
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  let businessProfile: BusinessProfile | null;

  try {
    businessProfile = await getVerifiedBusinessProfile(adminSupabase, user.id, businessProfileId);
  } catch (error) {
    return jsonCaughtError({
      error,
      fallbackStep: "business_profile_check",
      fallbackDebugCode: "BUSINESS_PROFILE_QUERY_FAILED",
      fallbackMessage: "사업자 인증 정보 확인에 실패했습니다.",
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  if (!businessProfile) {
    return jsonStepError({
      step: "business_profile_check",
      debugCode: "BUSINESS_PROFILE_NOT_FOUND",
      message: "사업자 인증 정보를 확인할 수 없습니다.",
      status: 404,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  if (businessProfile.verification_status !== "verified") {
    return jsonStepError({
      step: "business_profile_verified_check",
      debugCode: "BUSINESS_PROFILE_NOT_VERIFIED",
      message: "인증 완료된 사업자 정보가 필요합니다.",
      status: 403,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: { ...baseDebug, verificationStatus: businessProfile.verification_status },
    });
  }

  const startsWithFreeTrial = requestedFreeTrial;

  if (startsWithFreeTrial) {
    try {
      const eligibility = await getBusinessFreeTrialEligibility(
        user.id,
        adminSupabase,
        canonicalSubscriptionId,
      );

      if (!eligibility.eligible) {
        return jsonStepError({
          step: "free_trial_eligibility_check",
          debugCode: eligibility.reason,
          message: eligibility.reason === "FEATURE_DISABLED"
            ? "30일 무료체험은 현재 신청할 수 없습니다. 일반 월결제를 이용해주세요."
            : "30일 무료체험은 계정당 최초 1회만 이용할 수 있습니다.",
          status: 409,
          userId: user.id,
          mode,
          productKey: product.productKey,
          billingCycle: product.billingCycle,
          safeDebug: baseDebug,
        });
      }
    } catch (error) {
      return jsonCaughtError({
        error,
        fallbackStep: "free_trial_eligibility_check",
        fallbackDebugCode: "FREE_TRIAL_ELIGIBILITY_CHECK_FAILED",
        fallbackMessage: "30일 무료체험 이용 가능 여부를 확인하지 못했습니다.",
        userId: user.id,
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        safeDebug: baseDebug,
      });
    }
  }

  try {
    const completedProvisioning = await getCompletedBusinessProvisioning({
      adminSupabase,
      subscriptionId: canonicalSubscriptionId,
      userId: user.id,
      product,
      paymentId: canonicalPaymentId,
      isFreeTrial: startsWithFreeTrial,
    });

    if (completedProvisioning) {
      logBusinessSubscriptionDebug("provisioning_replay_returned", {
        subscriptionId: completedProvisioning.subscriptionId,
        paymentId: completedProvisioning.paymentId,
        menuSiteId: completedProvisioning.menuSiteId,
      });
      return NextResponse.json({
        ok: true,
        step: "final_response",
        message: "이미 처리된 구독 결제입니다.",
        mode,
        ...completedProvisioning,
        alreadyProcessed: true,
      });
    }
  } catch (error) {
    const canContinueExplicitRecovery =
      isPaymentRecovery &&
      error instanceof BusinessSubscriptionRouteError &&
      (error.debugCode === "PURCHASE_ATTEMPT_INCOMPLETE" || error.debugCode === "PURCHASE_ATTEMPT_REQUIRES_RECOVERY");

    if (!canContinueExplicitRecovery) {
      return jsonCaughtError({
        error,
        fallbackStep: "business_subscription_insert",
        fallbackDebugCode: "PURCHASE_ATTEMPT_QUERY_FAILED",
        fallbackMessage: "기존 구매 처리 상태 확인에 실패했습니다.",
        userId: user.id,
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        safeDebug: {
          ...baseDebug,
          subscriptionId: canonicalSubscriptionId,
          paymentId: canonicalPaymentId,
        },
      });
    }
  }

  if (!billingKey && !isPaymentRecovery) {
    return jsonStepError({
      step: "billing_key_presence_check",
      debugCode: "BILLING_KEY_MISSING",
      message: "빌링키가 없습니다.",
      status: 400,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  let order: NormalizedBusinessOrder | null = null;
  let existingMenuSite: ExistingMenuSite | null = null;
  let recoveredSubscriptionMenuSite: MenuSiteResult | null = null;

  try {
    if (mode === "new") {
      if (isDisplayCheckoutQaProduct(product) && getString(getRecord(body.order).buyerType) !== "business") {
        return jsonStepError({
          step: "new_or_convert_precheck",
          debugCode: "DISPLAY_BUSINESS_BUYER_REQUIRED",
          message: "아티메뉴 디스플레이는 사업자 전용 상품입니다.",
          status: 400,
          userId: user.id,
          mode,
          productKey: product.productKey,
          billingCycle: product.billingCycle,
          safeDebug: baseDebug,
        });
      }

      order = normalizeBusinessOrder(body.order);

      if (!order || order.product_key !== product.productKey || order.businessProfileId !== businessProfile.id) {
        return jsonStepError({
          step: "new_or_convert_precheck",
          debugCode: "INVALID_NEW_ORDER_PAYLOAD",
          message: "사업자 신청 정보가 올바르지 않습니다.",
          status: 400,
          userId: user.id,
          mode,
          productKey: product.productKey,
          billingCycle: product.billingCycle,
          safeDebug: {
            ...baseDebug,
            hasOrder: Boolean(body.order),
            hasNormalizedOrder: Boolean(order),
            orderProductMatches: order?.product_key === product.productKey,
            orderBusinessProfileMatches: order?.businessProfileId === businessProfile.id,
          },
        });
      }

      if (!isPaymentRecovery) {
        await ensureSlugAvailable(adminSupabase, order.desiredSlug);
      }
    } else {
      const menuSiteId = getString(body.menuSiteId);

      if (!menuSiteId) {
        return jsonStepError({
          step: "new_or_convert_precheck",
          debugCode: "MENU_SITE_ID_MISSING",
          message: "전환할 메뉴판 정보가 없습니다.",
          status: 400,
          userId: user.id,
          mode,
          productKey: product.productKey,
          billingCycle: product.billingCycle,
          safeDebug: baseDebug,
        });
      }

      existingMenuSite = await getConvertibleMenuSite(adminSupabase, user.id, menuSiteId);

      if (!existingMenuSite) {
        return jsonStepError({
          step: "new_or_convert_precheck",
          debugCode: "CONVERT_MENU_SITE_NOT_FOUND",
          message: "전환할 수 있는 메뉴판을 찾지 못했습니다.",
          status: 404,
          userId: user.id,
          mode,
          productKey: product.productKey,
          billingCycle: product.billingCycle,
          safeDebug: baseDebug,
        });
      }

      const entitlements = await getEntitlements(adminSupabase, menuSiteId);

      if (entitlements.some((entitlement) => entitlement.plan_type === "business_basic" && entitlement.status === "active")) {
        return jsonStepError({
          step: "new_or_convert_precheck",
          debugCode: "ALREADY_BUSINESS_PLAN",
          message: "이미 사업자 플랜으로 전환된 메뉴판입니다.",
          status: 409,
          userId: user.id,
          mode,
          productKey: product.productKey,
          billingCycle: product.billingCycle,
          safeDebug: baseDebug,
        });
      }

      if (!isPersonalTrialConvertible(entitlements)) {
        return jsonStepError({
          step: "new_or_convert_precheck",
          debugCode: "PERSONAL_TRIAL_NOT_CONVERTIBLE",
          message: "개인 체험에서 전환 가능한 상태가 아닙니다.",
          status: 409,
          userId: user.id,
          mode,
          productKey: product.productKey,
          billingCycle: product.billingCycle,
          safeDebug: { ...baseDebug, entitlementCount: entitlements.length },
        });
      }
    }
  } catch (error) {
    return jsonCaughtError({
      error,
      fallbackStep: "new_or_convert_precheck",
      fallbackDebugCode: "PRECHECK_FAILED",
      fallbackMessage: "구독 결제 전 검증에 실패했습니다.",
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: baseDebug,
    });
  }

  const paymentId = canonicalPaymentId;
  const billingPeriod = getSubscriptionBillingPeriod(product, new Date(), startsWithFreeTrial);
  const nextBillingAt = billingPeriod.nextBillingAt;
  let subscriptionId = canonicalSubscriptionId;

  if (isPaymentRecovery) {
    try {
      const recoverableSubscription = await getRecoverableSubscription({
        adminSupabase,
        subscriptionId: recoverSubscriptionId,
        userId: user.id,
        businessProfileId: businessProfile.id,
        product,
        paymentId,
      });
      await ensureNoConflictingPaymentRecords({
        adminSupabase,
        paymentId,
        subscriptionId: recoverableSubscription.id,
        menuSiteId: recoverableSubscription.menu_site_id,
      });

      const recoveredMenuSiteQuery = recoverableSubscription.menu_site_id
        ? adminSupabase
            .from("menu_sites")
            .select("id, slug")
            .eq("id", recoverableSubscription.menu_site_id)
            .eq("user_id", user.id)
            .maybeSingle()
        : adminSupabase
            .from("menu_sites")
            .select("id, slug")
            .eq("user_id", user.id)
            .contains("settings", { subscription_id: recoverableSubscription.id })
            .maybeSingle();
      const { data: recoveredMenuSite, error: recoveredMenuSiteError } = await recoveredMenuSiteQuery;

      if (recoveredMenuSiteError) {
        throw new BusinessSubscriptionRouteError(
          "menu_site_create",
          "RECOVERY_MENU_SITE_QUERY_FAILED",
          "구독과 연결된 복구 대상 메뉴판 확인에 실패했습니다.",
          500,
          getSupabaseSafeDebug(recoveredMenuSiteError)
        );
      }

      if (recoverableSubscription.menu_site_id && !recoveredMenuSite) {
        throw new BusinessSubscriptionRouteError(
          "menu_site_create",
          "RECOVERY_LINKED_MENU_SITE_NOT_FOUND",
          "구독에 연결된 메뉴판 기록을 찾지 못해 자동 복구할 수 없습니다.",
          409,
          { subscriptionId: recoverableSubscription.id }
        );
      }

      if (recoveredMenuSite) {
        recoveredSubscriptionMenuSite = recoveredMenuSite as MenuSiteResult;
        await ensureNoConflictingPaymentRecords({
          adminSupabase,
          paymentId,
          subscriptionId: recoverableSubscription.id,
          menuSiteId: recoveredSubscriptionMenuSite.id,
        });
      }
      subscriptionId = recoverableSubscription.id;
    } catch (error) {
      return jsonCaughtError({
        error,
        fallbackStep: "business_subscription_insert",
        fallbackDebugCode: error instanceof BusinessSubscriptionRouteError ? error.debugCode : "RECOVERY_SUBSCRIPTION_CHECK_FAILED",
        fallbackMessage: "복구할 구독 결제 상태 확인에 실패했습니다.",
        userId: user.id,
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        safeDebug: { ...baseDebug, paymentId, recoverSubscriptionId },
      });
    }
  } else {
    try {
      subscriptionId = await createPendingSubscription({
        adminSupabase,
        subscriptionId,
        userId: user.id,
        businessProfileId: businessProfile.id,
        billingKey,
        product,
        menuSiteId: existingMenuSite?.id ?? null,
        trialPeriod: startsWithFreeTrial ? billingPeriod : null,
      });
    } catch (error) {
      if (error instanceof BusinessSubscriptionRouteError && error.debugCode === "PURCHASE_ATTEMPT_ALREADY_EXISTS") {
        try {
          const concurrentCompletion = await waitForCompletedBusinessProvisioning({
            adminSupabase,
            subscriptionId,
            userId: user.id,
            product,
            paymentId,
            isFreeTrial: startsWithFreeTrial,
          });

          if (concurrentCompletion) {
            return NextResponse.json({
              ok: true,
              step: "final_response",
              message: "이미 처리된 구독 결제입니다.",
              mode,
              ...concurrentCompletion,
              alreadyProcessed: true,
            });
          }
        } catch (replayError) {
          return jsonCaughtError({
            error: replayError,
            fallbackStep: "business_subscription_insert",
            fallbackDebugCode: "PURCHASE_ATTEMPT_REPLAY_FAILED",
            fallbackMessage: "동일 구매 시도의 완료 결과 확인에 실패했습니다.",
            userId: user.id,
            mode,
            productKey: product.productKey,
            billingCycle: product.billingCycle,
            safeDebug: { ...baseDebug, paymentId, subscriptionId },
          });
        }
      }

      return jsonCaughtError({
        error,
        fallbackStep: "business_subscription_insert",
        fallbackDebugCode: "BUSINESS_SUBSCRIPTION_INSERT_FAILED",
        fallbackMessage: "구독 준비 기록 생성에 실패했습니다.",
        userId: user.id,
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        safeDebug: { ...baseDebug, paymentId },
      });
    }
  }

  let billingPayment: Awaited<ReturnType<typeof payWithBillingKey>> | null = null;

  try {
    if (startsWithFreeTrial) {
      logBusinessSubscriptionDebug("free_trial_billing_key_registered", {
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        subscriptionId,
        trialEndsAt: billingPeriod.currentPeriodEnd,
      });
    } else if (isPaymentRecovery) {
      logBusinessSubscriptionDebug("portone_existing_payment_verify_start", {
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        paymentId,
        subscriptionId,
      });
      billingPayment = await getPaidBillingPayment({
        paymentId,
        orderName: getSubscriptionOrderName(product),
        amount: product.amount,
      });
      logBusinessSubscriptionDebug("portone_existing_payment_verify_done", {
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        paymentId,
        subscriptionId,
      });
    } else if (isDisplayCheckoutQaProduct(product) && portOneMockEnabled && isDisplayCheckoutQaMockBillingKey(billingKey)) {
      billingPayment = {
        paymentId,
        status: "PAID",
        amount: product.amount,
        rawPayment: {
          id: paymentId,
          paymentId,
          status: "PAID",
          amount: product.amount,
        },
      };
    } else {
      logBusinessSubscriptionDebug("portone_first_payment_request_start", {
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        paymentId,
        subscriptionId,
        hasBillingKey: Boolean(billingKey),
      });
      billingPayment = await payWithBillingKey({
        paymentId,
        billingKey,
        orderName: getSubscriptionOrderName(product),
        amount: product.amount,
        customer: {
          id: user.id,
          name: businessProfile.business_name ?? businessProfile.representative_name ?? undefined,
          email: user.email,
          phoneNumber: order?.buyerPhone,
        },
      });
      logBusinessSubscriptionDebug("portone_first_payment_done", {
        mode,
        productKey: product.productKey,
        billingCycle: product.billingCycle,
        paymentId,
        subscriptionId,
      });
    }
  } catch (error) {
    if (!isPaymentRecovery) {
      await markSubscriptionFailed(adminSupabase, subscriptionId);
    }
    return jsonCaughtError({
      error,
      fallbackStep: getPortOneStep(error),
      fallbackDebugCode: getPortOneDebugCode(error),
      fallbackMessage: "빌링키 첫 결제에 실패했습니다.",
      fallbackStatus: 502,
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: { ...baseDebug, ...getPortOneSafeDebug(error), paymentId, subscriptionId },
    });
  }

  try {
    logBusinessSubscriptionDebug("display_menu_site_create_start", {
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      paymentId,
      subscriptionId,
      isDisplayCheckoutQa: isDisplayCheckoutQaProduct(product),
    });
    const menuSite = mode === "new"
      ? recoveredSubscriptionMenuSite ?? await createBusinessMenuSite({
          supabase,
          userId: user.id,
          order: order as NormalizedBusinessOrder,
          product,
          subscriptionId,
          billingPeriod,
        })
      : await updateConvertedMenuSite({
          supabase,
          menuSite: existingMenuSite as ExistingMenuSite,
          product,
          subscriptionId,
          billingPeriod,
      });

    if (mode === "new" && recoveredSubscriptionMenuSite) {
      await ensurePurchasedMenuStarter(supabase, {
        menuSiteId: menuSite.id,
        templateKey: (order as NormalizedBusinessOrder).template_key,
        restaurantCategory: (order as NormalizedBusinessOrder).restaurantCategory,
        templateCategory: (order as NormalizedBusinessOrder).template_category,
        productKey: product.productKey,
      });
    }

    logBusinessSubscriptionDebug("display_menu_site_create_done", {
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      paymentId,
      subscriptionId,
      menuSiteId: menuSite.id,
      slug: menuSite.slug,
    });

    await markSubscriptionActive({
      adminSupabase,
      subscriptionId,
      menuSiteId: menuSite.id,
      paymentId: startsWithFreeTrial ? null : paymentId,
      billingPeriod,
      isFreeTrial: startsWithFreeTrial,
    });

    if (mode === "convert") {
      await archivePersonalTrialEntitlements(adminSupabase, menuSite.id);
    }

    await createBusinessEntitlement({
      adminSupabase,
      userId: user.id,
      menuSiteId: menuSite.id,
      businessProfileId: businessProfile.id,
      product,
      subscriptionId,
      billingPeriod,
    });

    if (mode === "new") {
      const aiCreditGrant = await grantAiWelcomeCreditsForFirstMenuCreation({
        adminSupabase,
        userId: user.id,
        menuSiteId: menuSite.id,
      });
      if (!aiCreditGrant.ok) {
        throw new BusinessSubscriptionRouteError(
          "final_response",
          "AI_CREDIT_GRANT_TABLE_MISSING",
          "AI 크레딧 테이블 migration 적용이 필요합니다.",
          500,
          { menuSiteId: menuSite.id, productKey: product.productKey, serviceType: product.serviceType }
        );
      }
    }

    const requestConsentSnapshot = body.consentSnapshot && typeof body.consentSnapshot === "object" ? body.consentSnapshot : null;

    if (!startsWithFreeTrial) {
      const paymentRecords = await createOrderAndPaymentRecords({
        supabase,
        userId: user.id,
        paymentId,
        menuSiteId: menuSite.id,
        product,
        businessProfile,
        portonePayment: billingPayment?.rawPayment,
        promotionSnapshot: (order?.promotion ?? null) as Json | null,
        consentSnapshot: (order ? {
          termsAccepted: order.termsAccepted,
          privacyAccepted: order.privacyAccepted,
          contentPolicyAccepted: order.contentPolicyAccepted,
          marketingAccepted: order.marketingAccepted,
          consentAgreedAt: order.consentAgreedAt,
          consentContext: order.consentContext,
        } : requestConsentSnapshot ?? {
          consentContext: "personal_trial_convert",
          capturedFromRequest: true,
        }) as Json,
      });

      await createBusinessPaymentPaidNotification({
        userId: user.id,
        paymentId,
        orderId: paymentRecords.orderId,
        menuSiteId: menuSite.id,
        subscriptionId,
        product,
        mode,
      });
    }

    return NextResponse.json({
      ok: true,
      step: "final_response",
      message: startsWithFreeTrial
        ? "결제수단 등록이 완료되어 30일 무료체험이 시작되었습니다."
        : mode === "convert"
          ? "기존 메뉴판이 사업자 플랜으로 전환되었습니다."
          : "아티메뉴 다이닝 메뉴판이 생성되었습니다.",
      mode,
      menuSiteId: menuSite.id,
      slug: menuSite.slug,
      subscriptionId,
      paymentId: startsWithFreeTrial ? null : paymentId,
      nextBillingAt,
      trialEndsAt: startsWithFreeTrial ? billingPeriod.currentPeriodEnd : null,
    });
  } catch (error) {
    if (error instanceof BusinessSubscriptionRouteError && error.debugCode === "MENU_SITE_PROVISIONING_IN_PROGRESS") {
      try {
        const concurrentCompletion = await waitForCompletedBusinessProvisioning({
          adminSupabase,
          subscriptionId,
          userId: user.id,
          product,
          paymentId,
          isFreeTrial: startsWithFreeTrial,
        });

        if (concurrentCompletion) {
          return NextResponse.json({
            ok: true,
            step: "final_response",
            message: "이미 처리된 구독 결제입니다.",
            mode,
            ...concurrentCompletion,
            alreadyProcessed: true,
          });
        }
      } catch (replayError) {
        return jsonCaughtError({
          error: replayError,
          fallbackStep: "final_response",
          fallbackDebugCode: "MENU_SITE_PROVISIONING_REPLAY_FAILED",
          fallbackMessage: "동일 구독의 메뉴판 완료 결과 확인에 실패했습니다.",
          userId: user.id,
          mode,
          productKey: product.productKey,
          billingCycle: product.billingCycle,
          safeDebug: { ...baseDebug, paymentId, subscriptionId },
        });
      }
    }

    return jsonCaughtError({
      error,
      fallbackStep: "final_response",
      fallbackDebugCode: "POST_PAYMENT_PERSISTENCE_FAILED",
      fallbackMessage: "구독 결제 후 저장 처리에 실패했습니다. 관리자 확인이 필요합니다.",
      userId: user.id,
      mode,
      productKey: product.productKey,
      billingCycle: product.billingCycle,
      safeDebug: { ...baseDebug, paymentId, subscriptionId },
    });
  }
}
