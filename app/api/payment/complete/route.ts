import { NextResponse } from "next/server";

import {
  getBasicPaymentProduct,
  isTemplateKey,
  isValidMenuSlug,
  menuCreationProduct,
  normalizeMenuSlug,
  personalTrialBasicProduct,
  type MenuOrderPayload,
} from "@/lib/payments";
import { portOneMockEnabled, requirePortOneApiSecret } from "@/lib/portone";
import { grantAiCreditsForMenuSiteCreation } from "@/lib/server/ai-credits-service";
import { createInAppNotificationOnce } from "@/lib/server/in-app-notification-service";
import { hasUsedPersonalTrial } from "@/lib/server/personal-trial-eligibility";
import { getPersonalTrialDataRetentionUntil } from "@/lib/service-retention-policy";
import { MENU_LIMITS, createStarterMenuData } from "@/lib/menu-starter-presets";
import { getDefaultBusinessCoverLabel, isBusinessTypeKey } from "@/lib/business-types";
import { isSocialLinkType, validateSocialLinks } from "@/lib/social-links";
import { getTemplateCategoryFromKey, getTemplateCategoryLabel, isTemplateCategoryKey, isTemplateSupportedForService } from "@/lib/templates";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Database, Json } from "@/lib/supabase/types";
import type { PaymentCompleteResponse } from "@/types/payment";

export const runtime = "nodejs";

type CompletePaymentRequest = {
  paymentId?: unknown;
  template_category?: unknown;
  template_key?: unknown;
  order?: unknown;
  orderPayload?: unknown;
};

type PortOnePayment = {
  id?: string;
  paymentId?: string;
  status?: string;
  orderName?: string;
  currency?: string;
  amount?: number | {
    total?: number;
    paid?: number;
  };
  paidAmount?: number;
  customData?: Record<string, unknown>;
};

type VerifiedPayment = {
  id: string;
  amount: number;
  status: "PAID";
  raw: PortOnePayment;
};

type MenuSiteResult = {
  id: string;
  slug: string;
};

type OrderResult = {
  id: string;
};

type PaymentResult = {
  id: string;
};

type TrialAccessPeriod = {
  accessStartsAt: string;
  accessExpiresAt: string;
  dataRetentionUntil: string;
};

type LooseInsert = Record<string, unknown>;
type ExistingPaymentCompletion =
  | {
      kind: "completed";
      orderId: string;
      paymentRecordId?: string;
      menuSiteId: string;
      slug: string;
    }
  | {
      kind: "incomplete";
      message: string;
    };

const SLUG_DUPLICATE_AFTER_PAYMENT_MESSAGE = "결제는 확인되었지만 공개 주소가 중복되어 메뉴판 생성에 실패했습니다. 관리자에게 문의해주세요.";
const PAYMENT_COMPLETE_RECOVERY_MESSAGE =
  "결제는 확인되었지만 AI 크레딧 지급 중 문제가 발생했습니다. 재결제하지 말고 고객지원으로 문의해주세요.";
const DUPLICATE_PERSONAL_TRIAL_PAYMENT_MESSAGE =
  "결제는 완료되었으나 개인 체험 중복 신청으로 메뉴판이 생성되지 않았습니다. 고객지원으로 문의해주세요.";

async function createPaymentPaidNotification({
  userId,
  paymentId,
  orderId,
  paymentRecordId,
  menuSiteId,
  productKey,
  amount,
}: {
  userId: string;
  paymentId: string;
  orderId?: string | null;
  paymentRecordId?: string | null;
  menuSiteId?: string | null;
  productKey: string;
  amount: number;
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
        payment_record_id: paymentRecordId ?? null,
        menu_site_id: menuSiteId ?? null,
        product_key: productKey,
        amount,
      },
    });

    if (!result.ok) {
      console.error("[payment-complete] payment_paid in-app notification failed", {
        userId,
        paymentId,
        orderId,
        error: result.error,
      });
    }
  } catch (error) {
    console.error("[payment-complete] payment_paid in-app notification failed", {
      userId,
      paymentId,
      orderId,
      error: error instanceof Error ? error.message : error,
    });
  }
}

type PaymentCompleteDebugStep =
  | "auth_user_check"
  | "request_body_parse"
  | "payment_verification"
  | "menu_site_create"
  | "order_insert"
  | "payment_insert"
  | "service_entitlement_insert"
  | "ai_menu_creation_grant_rpc";

type SafePaymentCompleteError = {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
};

type PaymentCompleteDebugContext = {
  step: PaymentCompleteDebugStep;
  debugCode: string;
  paymentId?: string;
  userId?: string;
  menuSiteId?: string;
  productKey?: string;
  planType?: string;
  error?: SafePaymentCompleteError | Error | null;
};

function readSafePaymentCompleteError(error: SafePaymentCompleteError | Error | null | undefined) {
  const source = error as SafePaymentCompleteError | undefined;
  return {
    code: source?.code,
    message: error?.message,
    details: source?.details,
    hint: source?.hint,
  };
}

function logSafePaymentCompleteError({
  step,
  debugCode,
  error,
  paymentId,
  userId,
  menuSiteId,
  productKey,
  planType,
}: PaymentCompleteDebugContext) {
  const safeError = readSafePaymentCompleteError(error);
  console.error("[payment-complete]", {
    step,
    debugCode,
    userId,
    paymentId,
    menuSiteId,
    productKey,
    planType,
    supabaseCode: safeError.code,
    supabaseMessage: safeError.message,
    supabaseDetails: safeError.details,
    supabaseHint: safeError.hint,
    hasPaymentId: Boolean(paymentId),
    hasUserId: Boolean(userId),
    hasMenuSiteId: Boolean(menuSiteId),
  });
}

function getTemplateServiceTypeForPlan(planKey: string) {
  return planKey === "large_screen" || planKey === "display" ? "display" : "basic";
}

function getPaymentAmount(payment: PortOnePayment) {
  if (typeof payment.amount === "number") {
    return payment.amount;
  }

  if (typeof payment.amount?.total === "number") {
    return payment.amount.total;
  }

  if (typeof payment.amount?.paid === "number") {
    return payment.amount.paid;
  }

  if (typeof payment.paidAmount === "number") {
    return payment.paidAmount;
  }

  return null;
}

function getTrialAccessPeriod(now = new Date()): TrialAccessPeriod {
  const accessStartsAt = new Date(now);
  const accessExpiresAt = new Date(accessStartsAt);
  accessExpiresAt.setMonth(accessExpiresAt.getMonth() + personalTrialBasicProduct.duration_months);

  const dataRetentionUntil = getPersonalTrialDataRetentionUntil(accessExpiresAt) ?? accessExpiresAt.toISOString();

  return {
    accessStartsAt: accessStartsAt.toISOString(),
    accessExpiresAt: accessExpiresAt.toISOString(),
    dataRetentionUntil,
  };
}

function isMissingRelationError(error: { code?: string; message?: string } | null | undefined) {
  return error?.code === "42P01" || Boolean(error?.message?.includes("service_entitlements"));
}

async function hasExistingPersonalTrial(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  void supabase;
  const result = await hasUsedPersonalTrial(userId);
  return result.used;
}

function jsonError(message: string, status = 400, context?: PaymentCompleteDebugContext) {
  const payload: Record<string, unknown> = { ok: false, message };

  if (process.env.NODE_ENV !== "production" && context) {
    const safeError = readSafePaymentCompleteError(context.error);
    payload.step = context.step;
    payload.debugCode = context.debugCode;
    payload.safeDebug = {
      productKey: context.productKey,
      planType: context.planType,
      hasPaymentId: Boolean(context.paymentId),
      paymentId: context.paymentId,
      hasUserId: Boolean(context.userId),
      hasMenuSiteId: Boolean(context.menuSiteId),
      menuSiteId: context.menuSiteId,
      supabaseCode: safeError.code,
      supabaseMessage: safeError.message,
      supabaseDetails: safeError.details,
      supabaseHint: safeError.hint,
    };
  }

  return NextResponse.json(payload, { status });
}

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown) {
  const stringValue = getString(value);
  return stringValue || null;
}

function isMenuSiteSlugDuplicateError(error: { code?: string; message?: string } | null | undefined) {
  if (!error) return false;

  const message = error.message ?? "";
  return error.code === "23505" || message.includes("menu_sites_slug_key") || message.includes("duplicate key value");
}

function getOrderSetupPayload(value: unknown): MenuOrderPayload["orderSetup"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;

  return {
    tableCount: getNullableString(payload.tableCount),
    posUsage: getNullableString(payload.posUsage),
    paymentPreference: getNullableString(payload.paymentPreference),
    kitchenDashboard: getNullableString(payload.kitchenDashboard),
    callFeature: getNullableString(payload.callFeature),
    launchTimeline: getNullableString(payload.launchTimeline),
    additionalRequests: getNullableString(payload.additionalRequests),
  };
}

function getScreenSetupPayload(value: unknown): MenuOrderPayload["screenSetup"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;

  return {
    purpose: getNullableString(payload.purpose),
    templateCategory: getNullableString(payload.templateCategory),
    orientation: getNullableString(payload.orientation),
    device: getNullableString(payload.device),
  };
}

function parseOrderPayload(value: unknown): MenuOrderPayload | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const payload = value as Record<string, unknown>;
  const templateKey = getString(payload.template_key);
  const templateCategoryInput = getString(payload.template_category);
  const templateCategory = isTemplateCategoryKey(templateCategoryInput)
    ? templateCategoryInput
    : getTemplateCategoryFromKey(templateKey);
  const mappedRestaurantCategory = templateCategory ? getTemplateCategoryLabel(templateCategory) : "";
  const requestedRestaurantCategory = getString(payload.restaurantCategory);
  const desiredSlug = normalizeMenuSlug(getString(payload.desiredSlug));
  const amount = typeof payload.amount === "number" ? payload.amount : Number(payload.amount);
  const productKey = getString(payload.product_key);
  const requestedProduct = getBasicPaymentProduct(productKey);
  const planType = getString(payload.plan_type);
  const paymentType = getString(payload.payment_type);
  const billingCycle = getString(payload.billing_cycle);
  const planKey = getString(payload.plan_key) || "basic";
  const buyerTypeInput = getString(payload.buyerType);
  const buyerType = buyerTypeInput === "business" ? "business" : "individual";
  const legacyInstagramUrl = getNullableString(payload.instagramUrl);
  const rawSocialLinks = Array.isArray(payload.socialLinks) ? payload.socialLinks.slice(0, 3) : [];
  const socialLinksValidation = validateSocialLinks(
    rawSocialLinks.map((link) => {
      const socialLink = link && typeof link === "object" ? (link as Record<string, unknown>) : {};

      const type = getString(socialLink.type);

      return {
        type: isSocialLinkType(type) ? type : "",
        display_name: getString(socialLink.display_name),
        url: getString(socialLink.url),
      };
    })
  );

  if (!socialLinksValidation.ok) {
    return null;
  }

  const socialLinks =
    socialLinksValidation.socialLinks.length > 0 || !legacyInstagramUrl
      ? socialLinksValidation.socialLinks
      : validateSocialLinks([{ type: "instagram", display_name: "인스타그램", url: legacyInstagramUrl }]).socialLinks;
  const instagramUrl = socialLinks.find((link) => link.type === "instagram")?.url ?? legacyInstagramUrl;

  if (
    (planKey !== "basic" && planKey !== "large_screen" && planKey !== "qr_order") ||
    !isTemplateKey(templateKey) ||
    !templateCategory ||
    !isValidMenuSlug(desiredSlug) ||
    !requestedProduct ||
    amount !== requestedProduct.amount ||
    planType !== requestedProduct.plan_type ||
    paymentType !== requestedProduct.payment_type ||
    billingCycle !== requestedProduct.billing_cycle
  ) {
    return null;
  }

  if (!isTemplateSupportedForService(templateKey, getTemplateServiceTypeForPlan(planKey))) {
    return null;
  }

  const parsedPayload: MenuOrderPayload = {
    product_key: requestedProduct.product_key,
    plan_type: requestedProduct.plan_type,
    payment_type: requestedProduct.payment_type,
    billing_cycle: requestedProduct.billing_cycle,
    plan_key: planKey === "large_screen" ? "large_screen" : planKey === "qr_order" ? "qr_order" : "basic",
    template_category: templateCategory,
    template_key: templateKey,
    menuName: getString(payload.menuName),
    desiredSlug,
    restaurantName: getString(payload.restaurantName),
    restaurantCategory: planKey === "large_screen" && requestedRestaurantCategory ? requestedRestaurantCategory : mappedRestaurantCategory,
    restaurantType: isBusinessTypeKey(getString(payload.restaurantType)) ? getString(payload.restaurantType) : templateCategory,
    restaurantAddress: getString(payload.restaurantAddress),
    restaurantPhone: getString(payload.restaurantPhone),
    openingHours: getNullableString(payload.openingHours),
    mapUrl: getNullableString(payload.mapUrl),
    introTitle: getNullableString(payload.introTitle),
    introDescription: getNullableString(payload.introDescription),
    brandDescription: getNullableString(payload.brandDescription),
    menuCoverTitle: getNullableString(payload.menuCoverTitle),
    menuCoverDescription: getNullableString(payload.menuCoverDescription),
    menuCoverLabel: getNullableString(payload.menuCoverLabel) ?? getDefaultBusinessCoverLabel(templateCategory),
    aboutDescription: getNullableString(payload.aboutDescription),
    instagramUrl,
    socialLinks,
    orderSetup: planKey === "qr_order" ? getOrderSetupPayload(payload.orderSetup) : null,
    screenSetup: planKey === "large_screen" ? getScreenSetupPayload(payload.screenSetup) : null,
    notes: getNullableString(payload.notes),
    buyerType,
    buyerName: getString(payload.buyerName),
    buyerPhone: getString(payload.buyerPhone),
    buyerEmail: getString(payload.buyerEmail),
    businessName: buyerType === "business" ? getNullableString(payload.businessName) : null,
    businessProfileId: buyerType === "business" ? getNullableString(payload.businessProfileId) : null,
    representativeName: buyerType === "business" ? getNullableString(payload.representativeName) : null,
    businessNumber: buyerType === "business" ? getNullableString(payload.businessNumber) : null,
    businessOpeningDate: buyerType === "business" ? getNullableString(payload.businessOpeningDate) : null,
    businessPhone: buyerType === "business" ? getNullableString(payload.businessPhone) : null,
    termsAccepted: payload.termsAccepted === true,
    privacyAccepted: payload.privacyAccepted === true,
    contentPolicyAccepted: payload.contentPolicyAccepted === true,
    marketingAccepted: payload.marketingAccepted === true,
    consentAgreedAt: getNullableString(payload.consentAgreedAt),
    consentContext: getNullableString(payload.consentContext),
    amount,
  };

  const requiredFields = [
    parsedPayload.menuName,
    parsedPayload.restaurantName,
    parsedPayload.restaurantCategory,
    parsedPayload.restaurantPhone,
    parsedPayload.buyerName,
    parsedPayload.buyerPhone,
    parsedPayload.buyerEmail,
  ];

  if (requiredFields.some((field) => !field)) {
    return null;
  }

  if (!parsedPayload.termsAccepted || !parsedPayload.privacyAccepted || !parsedPayload.contentPolicyAccepted) {
    return null;
  }

  if (
    parsedPayload.buyerType === "business" &&
    (!parsedPayload.businessName ||
      !parsedPayload.representativeName ||
      !parsedPayload.businessNumber ||
      !parsedPayload.businessOpeningDate ||
      !parsedPayload.businessPhone)
  ) {
    return null;
  }

  return parsedPayload;
}

function getPaymentProduct(orderPayload: MenuOrderPayload) {
  const basicProduct = getBasicPaymentProduct(orderPayload.product_key);

  if (basicProduct) {
    return {
      key: basicProduct.product_key,
      name: basicProduct.name,
      amount: basicProduct.amount,
    };
  }

  if (orderPayload.plan_key === "large_screen") {
    return {
      key: "large_screen",
      name: "메뉴링크 디스플레이 생성권",
    };
  }

  if (orderPayload.plan_key === "qr_order") {
    return {
      key: "qr_order",
      name: "메뉴링크 오더 1.0 신청권",
    };
  }

  return {
    key: menuCreationProduct.key,
    name: menuCreationProduct.name,
  };
}

async function getCompletedMenuFromOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orderId: string,
  menuSiteId: string | null,
  paymentRecordId?: string
): Promise<ExistingPaymentCompletion> {
  if (!menuSiteId) {
    return {
      kind: "incomplete",
      message: "결제 처리 흔적은 있지만 연결된 메뉴판이 없습니다. 관리자 확인이 필요합니다.",
    };
  }

  const { data: existingSite } = await supabase
    .from("menu_sites")
    .select("id, slug")
    .eq("id", menuSiteId)
    .maybeSingle();

  if (!existingSite) {
    return {
      kind: "incomplete",
      message: "결제 처리 흔적은 있지만 메뉴판 정보를 찾지 못했습니다. 관리자 확인이 필요합니다.",
    };
  }

  return {
    kind: "completed",
    orderId,
    paymentRecordId,
    menuSiteId: existingSite.id,
    slug: existingSite.slug,
  };
}

async function findExistingPaymentCompletion(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string
): Promise<ExistingPaymentCompletion | null> {
  const { data: existingOrder, error: orderError } = await supabase
    .from("orders")
    .select("id, menu_site_id")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (orderError) {
    console.error("[payment-complete] existing order check failed", {
      paymentId,
      message: orderError.message,
    });
  }

  if (existingOrder) {
    return getCompletedMenuFromOrder(supabase, existingOrder.id, existingOrder.menu_site_id);
  }

  const paymentQueries = [
    supabase.from("payments").select("id, status, order_id").eq("payment_id", paymentId).maybeSingle(),
    supabase.from("payments").select("id, status, order_id").eq("portone_payment_id", paymentId).maybeSingle(),
  ];
  const [paymentByIdResult, paymentByPortOneIdResult] = await Promise.all(paymentQueries);
  const existingPayment = paymentByIdResult.data ?? paymentByPortOneIdResult.data;
  const paymentError = paymentByIdResult.error ?? paymentByPortOneIdResult.error;

  if (paymentError) {
    console.error("[payment-complete] existing payment check failed", {
      paymentId,
      message: paymentError.message,
    });
  }

  if (!existingPayment) {
    return null;
  }

  if (!existingPayment.order_id) {
    return {
      kind: "incomplete",
      message: "결제 기록은 이미 존재하지만 연결된 주문이 없습니다. 관리자 확인이 필요합니다.",
    };
  }

  const { data: orderForPayment, error: orderForPaymentError } = await supabase
    .from("orders")
    .select("id, menu_site_id")
    .eq("id", existingPayment.order_id)
    .maybeSingle();

  if (orderForPaymentError || !orderForPayment) {
    return {
      kind: "incomplete",
      message: "결제 기록은 이미 존재하지만 연결된 주문을 찾지 못했습니다. 관리자 확인이 필요합니다.",
    };
  }

  return getCompletedMenuFromOrder(supabase, orderForPayment.id, orderForPayment.menu_site_id, existingPayment.id);
}

async function findExistingPaymentRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paymentId: string
) {
  const { data, error } = await supabase
    .from("payments")
    .select("id, status")
    .eq("payment_id", paymentId)
    .maybeSingle();

  if (error) {
    return null;
  }

  return data;
}

async function cleanupMenuSiteAfterPaymentFailure(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuSite: MenuSiteResult,
  paymentId: string,
  reason: string
) {
  const { error } = await supabase.from("menu_sites").delete().eq("id", menuSite.id);

  if (error) {
    console.error("[payment-complete] menu site cleanup failed", {
      paymentId,
      menuSiteId: menuSite.id,
      slug: menuSite.slug,
      reason,
      message: error.message,
    });
  }
}

async function createIncompletePaymentRecords(
  supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>,
  userId: string,
  userEmail: string | null | undefined,
  paymentId: string,
  orderPayload: MenuOrderPayload,
  verifiedPayment: VerifiedPayment,
  failureMessage: string
) {
  const product = getPaymentProduct(orderPayload);
  const rawPayload = JSON.parse(
    JSON.stringify({
      failure_reason: failureMessage,
      manual_review_required: true,
      desired_slug: orderPayload.desiredSlug,
      portone_payment: verifiedPayment.raw,
      order_payload: orderPayload,
    })
  ) as Json;

  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      menu_site_id: null,
      product_key: product.key,
      template_key: orderPayload.template_key,
      order_name: product.name,
      payment_id: paymentId,
      customer_name: userEmail ?? null,
      buyer_name: orderPayload.buyerName,
      buyer_phone: orderPayload.buyerPhone,
      buyer_email: orderPayload.buyerEmail,
      business_name: orderPayload.businessName,
      business_number: orderPayload.businessNumber,
      raw_payload: rawPayload,
      status: "paid",
      total_amount: verifiedPayment.amount,
    })
    .select("id")
    .single();

  if (orderError) {
    console.error("[payment-complete] incomplete order record failed", {
      paymentId,
      desiredSlug: orderPayload.desiredSlug,
      message: orderError.message,
    });
    return;
  }

  const { error: paymentError } = await supabase.from("payments").insert({
    user_id: userId,
    order_id: order.id,
    product_key: product.key,
    template_key: orderPayload.template_key,
    payment_id: paymentId,
    portone_payment_id: paymentId,
    status: "paid",
    amount: verifiedPayment.amount,
    raw_payload: rawPayload,
  });

  if (paymentError) {
    console.error("[payment-complete] incomplete payment record failed", {
      paymentId,
      orderId: order.id,
      desiredSlug: orderPayload.desiredSlug,
      message: paymentError.message,
    });
  }
}

async function createMenuSiteWithStarterPreset(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  orderPayload: MenuOrderPayload
) {
  const trialAccessPeriod = getTrialAccessPeriod();
  const product = getBasicPaymentProduct(orderPayload.product_key) ?? personalTrialBasicProduct;
  const menuSiteInsert: Database["public"]["Tables"]["menu_sites"]["Insert"] = {
    user_id: userId,
    name: orderPayload.menuName,
    slug: orderPayload.desiredSlug,
    template_key: orderPayload.template_key,
    template_category: orderPayload.template_category,
    status: "draft",
    restaurant_name: orderPayload.restaurantName,
    restaurant_category: orderPayload.restaurantCategory,
    restaurant_type: orderPayload.restaurantType,
    restaurant_address: orderPayload.restaurantAddress,
    restaurant_phone: orderPayload.restaurantPhone,
    opening_hours: orderPayload.openingHours,
    map_url: orderPayload.mapUrl,
    intro_title: orderPayload.introTitle,
    intro_description: orderPayload.introDescription,
    brand_description: orderPayload.brandDescription,
    menu_cover_title: orderPayload.menuCoverTitle,
    menu_cover_description: orderPayload.menuCoverDescription,
    menu_cover_label: orderPayload.menuCoverLabel,
    about_description: orderPayload.aboutDescription,
    business_name: orderPayload.businessName,
    instagram_url: orderPayload.instagramUrl,
    notes: orderPayload.notes,
    settings: {
      source: "payment_complete",
      product_key: product.product_key,
      plan_type: product.plan_type,
      payment_type: product.payment_type,
      billing_cycle: product.billing_cycle,
      access_starts_at: trialAccessPeriod.accessStartsAt,
      access_expires_at: trialAccessPeriod.accessExpiresAt,
      data_retention_until: trialAccessPeriod.dataRetentionUntil,
      auto_renewal: product.is_subscription,
      buyer_email: orderPayload.buyerEmail,
    },
  };

  let { data: menuSite, error: menuSiteError } = await supabase
    .from("menu_sites")
    .insert(menuSiteInsert)
    .select("id, slug")
    .single();

  if (menuSiteError) {
    if (isMenuSiteSlugDuplicateError(menuSiteError)) {
      throw new Error(SLUG_DUPLICATE_AFTER_PAYMENT_MESSAGE);
    }

    const minimalMenuSiteInsert: LooseInsert = {
      user_id: userId,
      name: orderPayload.menuName,
      slug: orderPayload.desiredSlug,
      template_key: orderPayload.template_key,
      status: "draft",
      restaurant_name: orderPayload.restaurantName,
      restaurant_category: orderPayload.restaurantCategory,
      restaurant_address: orderPayload.restaurantAddress,
      restaurant_phone: orderPayload.restaurantPhone,
      opening_hours: orderPayload.openingHours,
      map_url: orderPayload.mapUrl,
      intro_title: orderPayload.introTitle,
      intro_description: orderPayload.introDescription,
      brand_description: orderPayload.brandDescription,
      menu_cover_title: orderPayload.menuCoverTitle,
      menu_cover_description: orderPayload.menuCoverDescription,
      about_description: orderPayload.aboutDescription,
      instagram_url: orderPayload.instagramUrl,
      notes: orderPayload.notes,
    };
    const fallbackResult = await supabase
      .from("menu_sites")
      .insert(minimalMenuSiteInsert as never)
      .select("id, slug")
      .single();

    menuSite = fallbackResult.data;
    menuSiteError = fallbackResult.error;

    if (menuSiteError) {
      if (isMenuSiteSlugDuplicateError(menuSiteError)) {
        throw new Error(SLUG_DUPLICATE_AFTER_PAYMENT_MESSAGE);
      }

      throw new Error(`메뉴판 생성에 실패했습니다: ${menuSiteError.message}`);
    }
  }

  const createdMenuSite = menuSite as MenuSiteResult;
  await createStarterMenuData(
    supabase,
    createdMenuSite.id,
    orderPayload.template_key,
    orderPayload.restaurantCategory,
    orderPayload.template_category,
    orderPayload.plan_key
  );
  await createMenuSocialLinks(supabase, createdMenuSite.id, orderPayload.socialLinks);

  return createdMenuSite;
}

async function createMenuSocialLinks(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuSiteId: string,
  socialLinks: MenuOrderPayload["socialLinks"]
) {
  const normalizedSocialLinks = socialLinks ?? [];

  if (normalizedSocialLinks.length === 0) {
    return;
  }

  const { data: existingLinks, error: existingLinksError } = await supabase
    .from("menu_social_links")
    .select("type")
    .eq("menu_site_id", menuSiteId);

  if (existingLinksError) {
    console.error("menu_social_links existing check failed", {
      menuSiteId,
      message: existingLinksError.message,
    });
    return;
  }

  const usedTypes = new Set((existingLinks ?? []).map((link) => link.type));
  const availableSlots = Math.max(0, MENU_LIMITS.maxSocialLinksPerSite - usedTypes.size);
  const nextLinks = normalizedSocialLinks.filter((link) => !usedTypes.has(link.type)).slice(0, availableSlots);

  if (nextLinks.length === 0) {
    return;
  }

  const inserts: Database["public"]["Tables"]["menu_social_links"]["Insert"][] = nextLinks.map((link, index) => ({
    menu_site_id: menuSiteId,
    type: link.type,
    label: link.label,
    display_name: link.display_name,
    url: link.url,
    visible: true,
    sort_order: usedTypes.size + index,
  }));

  const { error } = await supabase.from("menu_social_links").insert(inserts);

  if (!error) {
    return;
  }

  const fallbackInserts: Database["public"]["Tables"]["menu_social_links"]["Insert"][] = nextLinks.map((link, index) => ({
    menu_site_id: menuSiteId,
    type: link.type,
    label: link.display_name || link.label,
    url: link.url,
    visible: true,
    sort_order: usedTypes.size + index,
  }));
  const { error: fallbackError } = await supabase.from("menu_social_links").insert(fallbackInserts);

  if (fallbackError) {
    console.error("menu_social_links insert failed", {
      menuSiteId,
      message: fallbackError.message,
    });
  }
}

async function createOrderRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  userEmail: string | null | undefined,
  paymentId: string,
  menuSiteId: string,
  orderPayload: MenuOrderPayload,
  verifiedPayment: VerifiedPayment
): Promise<OrderResult> {
  const product = getPaymentProduct(orderPayload);

  let { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      user_id: userId,
      menu_site_id: menuSiteId,
      product_key: product.key,
      template_key: orderPayload.template_key,
      order_name: product.name,
      payment_id: paymentId,
      customer_name: userEmail ?? null,
      buyer_name: orderPayload.buyerName,
      buyer_phone: orderPayload.buyerPhone,
      buyer_email: orderPayload.buyerEmail,
      business_name: orderPayload.businessName,
      business_number: orderPayload.businessNumber,
      raw_payload: orderPayload as unknown as Json,
      status: "paid",
      total_amount: verifiedPayment.amount,
    })
    .select("id")
    .single();

  if (orderError) {
    const fallbackResult = await supabase
      .from("orders")
      .insert(({
        user_id: userId,
        menu_site_id: menuSiteId,
        payment_id: paymentId,
        amount: verifiedPayment.amount,
        status: "paid",
        template_key: orderPayload.template_key,
      } satisfies LooseInsert) as never)
      .select("id")
      .single();

    order = fallbackResult.data;
    orderError = fallbackResult.error;

    if (orderError) {
      throw new Error(`주문 기록 저장에 실패했습니다: ${orderError.message}`);
    }
  }

  return order as OrderResult;
}

async function createPaymentRecord(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  paymentId: string,
  orderId: string,
  orderPayload: MenuOrderPayload,
  verifiedPayment: VerifiedPayment
): Promise<PaymentResult> {
  const product = getPaymentProduct(orderPayload);
  const rawPayload = JSON.parse(
    JSON.stringify({
      portone_payment: verifiedPayment.raw,
      product_key: product.key,
      order_payload: orderPayload,
    })
  ) as Json;

  let { data: paymentRecord, error: paymentError } = await supabase
    .from("payments")
    .insert({
      user_id: userId,
      order_id: orderId,
      product_key: product.key,
      template_key: orderPayload.template_key,
      payment_id: paymentId,
      portone_payment_id: paymentId,
      status: "paid",
      amount: verifiedPayment.amount,
      raw_payload: rawPayload,
    })
    .select("id")
    .single();

  if (paymentError) {
    const fallbackResult = await supabase
      .from("payments")
      .insert(({
        user_id: userId,
        payment_id: paymentId,
        status: "paid",
        amount: verifiedPayment.amount,
        raw_data: rawPayload,
      } satisfies LooseInsert) as never)
      .select("id")
      .single();

    paymentRecord = fallbackResult.data;
    paymentError = fallbackResult.error;

    if (paymentError) {
      throw new Error(`결제 기록 저장에 실패했습니다: ${paymentError.message}`);
    }
  }

  return paymentRecord as PaymentResult;
}

async function createServiceEntitlement(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  menuSiteId: string,
  orderPayload: MenuOrderPayload
) {
  const period = getTrialAccessPeriod();
  const { error } = await supabase.from("service_entitlements").insert({
    user_id: userId,
    menu_site_id: menuSiteId,
    business_profile_id: null,
    plan_type: orderPayload.plan_type ?? personalTrialBasicProduct.plan_type,
    billing_type: orderPayload.payment_type ?? personalTrialBasicProduct.payment_type,
    status: "active",
    access_starts_at: period.accessStartsAt,
    access_expires_at: period.accessExpiresAt,
    expired_at: null,
    data_retention_until: period.dataRetentionUntil,
    deleted_scheduled_at: null,
  });

  if (!error) {
    return;
  }

  if (isMissingRelationError(error)) {
    console.warn("[payment-complete] service_entitlements table is not available yet", {
      menuSiteId,
      message: error.message,
    });
    return;
  }

  throw new Error(`개인 체험 이용 상태 저장에 실패했습니다: ${error.message}`);
}

function createMockPortOnePayment(paymentId: string, orderPayload: MenuOrderPayload): VerifiedPayment {
  // development 전용 DB 생성 흐름 테스트입니다. production에서는 portOneMockEnabled가 절대 true가 되지 않습니다.
  if (!portOneMockEnabled || !paymentId.startsWith("mock_")) {
    throw new Error("mock 결제 검증은 development 환경에서 PORTONE_MOCK_ENABLED=true와 mock_ paymentId로만 사용할 수 있습니다.");
  }

  const product = getPaymentProduct(orderPayload);
  const raw: PortOnePayment = {
    id: paymentId,
    paymentId,
    status: "PAID",
    orderName: product.name,
    currency: menuCreationProduct.currency,
    amount: product.amount ?? orderPayload.amount,
    customData: {
      product_key: product.key,
      plan_type: orderPayload.plan_type,
      payment_type: orderPayload.payment_type,
      billing_cycle: orderPayload.billing_cycle,
      plan_key: orderPayload.plan_key,
      buyer_type: orderPayload.buyerType,
      template_key: orderPayload.template_key,
      template_category: orderPayload.template_category,
      desired_slug: orderPayload.desiredSlug,
      mock: true,
    },
  };

  return {
    id: paymentId,
    amount: product.amount ?? orderPayload.amount,
    status: "PAID",
    raw,
  };
}

async function getPortOnePayment(paymentId: string) {
  const apiSecret = requirePortOneApiSecret();
  const response = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: `PortOne ${apiSecret}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PortOne 결제 조회 실패: ${response.status} ${body}`);
  }

  return (await response.json()) as PortOnePayment;
}

async function verifyPayment(paymentId: string, orderPayload: MenuOrderPayload): Promise<VerifiedPayment> {
  if (portOneMockEnabled && paymentId.startsWith("mock_")) {
    return createMockPortOnePayment(paymentId, orderPayload);
  }

  const portOnePayment = await getPortOnePayment(paymentId);
  const verifiedPaymentId = portOnePayment.id ?? portOnePayment.paymentId;
  const verifiedAmount = getPaymentAmount(portOnePayment);
  const product = getPaymentProduct(orderPayload);
  const verifiedCurrency = portOnePayment.currency;
  const customProductKey = portOnePayment.customData?.product_key ?? portOnePayment.customData?.productKey;
  const customPlanType = portOnePayment.customData?.plan_type ?? portOnePayment.customData?.planType;
  const customPaymentType = portOnePayment.customData?.payment_type ?? portOnePayment.customData?.paymentType;
  const customBillingCycle = portOnePayment.customData?.billing_cycle ?? portOnePayment.customData?.billingCycle;
  const customPlanKey = portOnePayment.customData?.plan_key ?? portOnePayment.customData?.planKey;
  const customTemplateKey = portOnePayment.customData?.template_key ?? portOnePayment.customData?.templateKey;
  const customTemplateCategory = portOnePayment.customData?.template_category ?? portOnePayment.customData?.templateCategory;
  const customDesiredSlug = portOnePayment.customData?.desired_slug ?? portOnePayment.customData?.desiredSlug;

  if (verifiedPaymentId && verifiedPaymentId !== paymentId) {
    throw new Error("조회한 결제 ID가 요청한 paymentId와 일치하지 않습니다.");
  }

  if (portOnePayment.status !== "PAID") {
    throw new Error(`결제가 완료 상태가 아닙니다. 현재 상태: ${portOnePayment.status ?? "unknown"}`);
  }

  if (verifiedAmount !== orderPayload.amount) {
    throw new Error(`결제 금액이 일치하지 않습니다. 요청 금액: ${orderPayload.amount}, 결제 금액: ${verifiedAmount ?? "unknown"}`);
  }

  if (verifiedCurrency && verifiedCurrency !== menuCreationProduct.currency && verifiedCurrency !== `CURRENCY_${menuCreationProduct.currency}`) {
    throw new Error(`결제 통화가 일치하지 않습니다. 요청 통화: ${menuCreationProduct.currency}, 결제 통화: ${verifiedCurrency}`);
  }

  if (portOnePayment.orderName && portOnePayment.orderName !== product.name) {
    throw new Error("결제 주문명이 요청 상품과 일치하지 않습니다.");
  }

  if (customProductKey && customProductKey !== product.key) {
    throw new Error("결제 요청의 product_key와 완료 요청의 product_key가 일치하지 않습니다.");
  }

  if (customPlanType && customPlanType !== orderPayload.plan_type) {
    throw new Error("결제 요청의 plan_type과 완료 요청의 plan_type이 일치하지 않습니다.");
  }

  if (customPaymentType && customPaymentType !== orderPayload.payment_type) {
    throw new Error("결제 요청의 payment_type과 완료 요청의 payment_type이 일치하지 않습니다.");
  }

  if (customBillingCycle && customBillingCycle !== orderPayload.billing_cycle) {
    throw new Error("결제 요청의 billing_cycle과 완료 요청의 billing_cycle이 일치하지 않습니다.");
  }

  if (customPlanKey && customPlanKey !== orderPayload.plan_key) {
    throw new Error("결제 요청의 plan_key와 완료 요청의 plan_key가 일치하지 않습니다.");
  }

  if (customTemplateKey && customTemplateKey !== orderPayload.template_key) {
    throw new Error("결제 요청의 template_key와 완료 요청의 template_key가 일치하지 않습니다.");
  }

  if (customTemplateCategory && customTemplateCategory !== orderPayload.template_category) {
    throw new Error("결제 요청의 template_category와 완료 요청의 template_category가 일치하지 않습니다.");
  }

  if (customDesiredSlug && customDesiredSlug !== orderPayload.desiredSlug) {
    throw new Error("결제 요청의 desired_slug와 완료 요청의 desired_slug가 일치하지 않습니다.");
  }

  return {
    id: paymentId,
    amount: verifiedAmount,
    status: "PAID",
    raw: portOnePayment,
  };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  let body: CompletePaymentRequest;

  try {
    body = (await request.json()) as CompletePaymentRequest;
  } catch {
    return jsonError("요청 본문이 올바른 JSON이 아닙니다.");
  }

  const paymentId = typeof body.paymentId === "string" ? body.paymentId.trim() : "";
  const orderSource = body.order ?? body.orderPayload;
  const orderPayload = parseOrderPayload(orderSource);
  const requestedPlanKey = orderSource && typeof orderSource === "object"
    ? getString((orderSource as Record<string, unknown>).plan_key) || "basic"
    : "basic";
  const requestedTemplateKey = orderSource && typeof orderSource === "object"
    ? getString((orderSource as Record<string, unknown>).template_key)
    : typeof body.template_key === "string"
      ? body.template_key.trim()
      : "";
  const templateKey = orderPayload?.template_key ?? requestedTemplateKey;

  if (!paymentId) {
    return jsonError("paymentId가 없습니다.");
  }

  if (!isTemplateKey(templateKey)) {
    return jsonError("template_key가 올바르지 않습니다.");
  }

  if (!isTemplateSupportedForService(templateKey, getTemplateServiceTypeForPlan(requestedPlanKey))) {
    return jsonError("선택한 상품에서 사용할 수 없는 템플릿입니다.");
  }

  if (!orderPayload) {
    return jsonError("메뉴판 생성을 위한 주문 payload가 올바르지 않습니다.");
  }

  if (orderPayload.payment_type === "subscription") {
    // TODO(billing): 사업자 자동결제 구현 시 businessProfileId 소유권, verified 상태,
    // business_profiles.verification_status, business_basic/display 월/연 product_key,
    // billing_cycle 매칭, billing key 생성 성공, subscription 생성 성공 후 entitlement 생성,
    // subscription renewal 처리를 별도 API에서 검증합니다.
    return jsonError(
      "사업자 월/연 자동결제는 아직 준비 중입니다.",
      501
    );
  }

  const existingCompletion = await findExistingPaymentCompletion(supabase, paymentId);

  if (existingCompletion?.kind === "completed") {
    let adminSupabaseForExisting: ReturnType<typeof createAdminClient>;

    try {
      adminSupabaseForExisting = createAdminClient();
      const aiCreditGrant = await grantAiCreditsForMenuSiteCreation({
        adminSupabase: adminSupabaseForExisting,
        userId: user.id,
        menuSiteId: existingCompletion.menuSiteId,
        serviceType: "basic",
        productKey: orderPayload.product_key ?? personalTrialBasicProduct.product_key,
        planType: orderPayload.plan_type ?? personalTrialBasicProduct.plan_type,
        reason: "personal_trial_created",
      });
      if (!aiCreditGrant.ok) {
        throw Object.assign(new Error("AI 크레딧 테이블 migration 적용이 필요합니다."), aiCreditGrant.error ?? {});
      }
    } catch (error) {
      const debugContext = {
        step: "ai_menu_creation_grant_rpc" as const,
        debugCode: "AI_MENU_CREATION_GRANT_RPC_FAILED",
        paymentId,
        userId: user.id,
        menuSiteId: existingCompletion.menuSiteId,
        productKey: orderPayload.product_key ?? personalTrialBasicProduct.product_key,
        planType: orderPayload.plan_type ?? personalTrialBasicProduct.plan_type,
        error: error instanceof Error ? error : null,
      };
      logSafePaymentCompleteError(debugContext);
      return jsonError(PAYMENT_COMPLETE_RECOVERY_MESSAGE, 500, debugContext);
    }

    await createPaymentPaidNotification({
      userId: user.id,
      paymentId,
      orderId: existingCompletion.orderId,
      paymentRecordId: existingCompletion.paymentRecordId ?? null,
      menuSiteId: existingCompletion.menuSiteId,
      productKey: orderPayload.product_key ?? personalTrialBasicProduct.product_key,
      amount: orderPayload.amount,
    });

    return NextResponse.json({
      ok: true,
      message: "이미 처리된 결제입니다.",
      paymentId,
      orderId: existingCompletion.orderId,
      paymentRecordId: existingCompletion.paymentRecordId,
      menuSiteId: existingCompletion.menuSiteId,
      slug: existingCompletion.slug,
      alreadyProcessed: true,
    });
  }

  if (existingCompletion?.kind === "incomplete") {
    return jsonError(existingCompletion.message, 409);
  }

  const existingPayment = await findExistingPaymentRecord(supabase, paymentId);

  if (existingPayment?.status === "paid") {
    return jsonError("결제 기록은 이미 존재하지만 연결된 메뉴판을 찾지 못했습니다. 관리자 확인이 필요합니다.", 409);
  }

  let verifiedPayment: VerifiedPayment;

  try {
    verifiedPayment = await verifyPayment(paymentId, orderPayload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "결제 검증에 실패했습니다.", 502);
  }

  try {
    const hasPersonalTrial = await hasExistingPersonalTrial(supabase, user.id);

    if (hasPersonalTrial) {
      let writeSupabase: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>> = supabase;

      try {
        writeSupabase = createAdminClient();
      } catch {
        writeSupabase = supabase;
      }

      await createIncompletePaymentRecords(writeSupabase, user.id, user.email, paymentId, orderPayload, verifiedPayment, DUPLICATE_PERSONAL_TRIAL_PAYMENT_MESSAGE);
      return jsonError(DUPLICATE_PERSONAL_TRIAL_PAYMENT_MESSAGE, 409, {
        step: "payment_verification",
        debugCode: "PERSONAL_TRIAL_ALREADY_USED_AFTER_PAYMENT",
        paymentId,
        userId: user.id,
        productKey: orderPayload.product_key ?? personalTrialBasicProduct.product_key,
        planType: orderPayload.plan_type ?? personalTrialBasicProduct.plan_type,
      });
    }
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "개인 체험 이용 이력 확인에 실패했습니다.", 500);
  }

  let adminSupabase: ReturnType<typeof createAdminClient>;

  try {
    adminSupabase = createAdminClient();
  } catch {
    return jsonError("메뉴판 주소 확인 설정에 문제가 있습니다. 관리자 확인이 필요합니다.", 500);
  }

  const { data: existingSlug, error: existingSlugError } = await adminSupabase.from("menu_sites").select("id").eq("slug", orderPayload.desiredSlug).maybeSingle();

  if (existingSlugError) {
    console.error("[payment-complete] slug check failed after payment verification", {
      paymentId,
      desiredSlug: orderPayload.desiredSlug,
      message: existingSlugError.message,
    });
    return jsonError("메뉴판 주소 확인 중 문제가 발생했습니다. 관리자 확인이 필요합니다.", 500);
  }

  if (existingSlug) {
    await createIncompletePaymentRecords(supabase, user.id, user.email, paymentId, orderPayload, verifiedPayment, SLUG_DUPLICATE_AFTER_PAYMENT_MESSAGE);
    return jsonError(SLUG_DUPLICATE_AFTER_PAYMENT_MESSAGE, 409);
  }

  let menuSite: MenuSiteResult;

  try {
    menuSite = await createMenuSiteWithStarterPreset(supabase, user.id, orderPayload);
  } catch (error) {
    const message = error instanceof Error ? error.message : "메뉴판 생성 중 오류가 발생했습니다.";
    if (message === SLUG_DUPLICATE_AFTER_PAYMENT_MESSAGE) {
      await createIncompletePaymentRecords(supabase, user.id, user.email, paymentId, orderPayload, verifiedPayment, message);
      return jsonError(message, 409);
    }

    return jsonError(message.includes("duplicate key value") ? SLUG_DUPLICATE_AFTER_PAYMENT_MESSAGE : message, 500);
  }

  let order: OrderResult;

  try {
    order = await createOrderRecord(supabase, user.id, user.email, paymentId, menuSite.id, orderPayload, verifiedPayment);
  } catch (error) {
    await cleanupMenuSiteAfterPaymentFailure(
      supabase,
      menuSite,
      paymentId,
      error instanceof Error ? error.message : "주문 기록 저장 중 알 수 없는 오류가 발생했습니다."
    );
    return jsonError(error instanceof Error ? error.message : "주문 기록 저장 중 오류가 발생했습니다.", 500);
  }

  let paymentRecord: PaymentResult;

  try {
    paymentRecord = await createPaymentRecord(supabase, user.id, paymentId, order.id, orderPayload, verifiedPayment);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "결제 기록 저장 중 오류가 발생했습니다.", 500);
  }

  try {
    await createServiceEntitlement(adminSupabase, user.id, menuSite.id, orderPayload);
  } catch (error) {
    return jsonError(error instanceof Error ? error.message : "개인 체험 이용 상태 저장 중 오류가 발생했습니다.", 500);
  }

  try {
    const aiCreditGrant = await grantAiCreditsForMenuSiteCreation({
      adminSupabase,
      userId: user.id,
      menuSiteId: menuSite.id,
      serviceType: "basic",
      productKey: orderPayload.product_key ?? personalTrialBasicProduct.product_key,
      planType: orderPayload.plan_type ?? personalTrialBasicProduct.plan_type,
      reason: "personal_trial_created",
    });
    if (!aiCreditGrant.ok) {
      throw Object.assign(new Error("AI 크레딧 테이블 migration 적용이 필요합니다."), aiCreditGrant.error ?? {});
    }
  } catch (error) {
    const debugContext = {
      step: "ai_menu_creation_grant_rpc" as const,
      debugCode: "AI_MENU_CREATION_GRANT_RPC_FAILED",
      paymentId,
      userId: user.id,
      menuSiteId: menuSite.id,
      productKey: orderPayload.product_key ?? personalTrialBasicProduct.product_key,
      planType: orderPayload.plan_type ?? personalTrialBasicProduct.plan_type,
      error: error instanceof Error ? error : null,
    };
    logSafePaymentCompleteError(debugContext);
    return jsonError(PAYMENT_COMPLETE_RECOVERY_MESSAGE, 500, debugContext);
  }

  await createPaymentPaidNotification({
    userId: user.id,
    paymentId,
    orderId: order.id,
    paymentRecordId: paymentRecord.id,
    menuSiteId: menuSite.id,
    productKey: orderPayload.product_key ?? personalTrialBasicProduct.product_key,
    amount: verifiedPayment.amount,
  });

  return NextResponse.json({
    ok: true,
    message: "결제 검증이 완료되어 주문과 결제 기록을 저장했습니다.",
    paymentId,
    orderId: order.id,
    paymentRecordId: paymentRecord.id,
    menuSiteId: menuSite.id,
    slug: menuSite.slug,
  } satisfies PaymentCompleteResponse);
}
