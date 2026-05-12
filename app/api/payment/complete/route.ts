import { NextResponse } from "next/server";

import {
  isTemplateKey,
  isValidMenuSlug,
  menuCreationProduct,
  normalizeMenuSlug,
  type MenuOrderPayload,
} from "@/lib/payments";
import { portOneMockEnabled, requirePortOneApiSecret } from "@/lib/portone";
import { MENU_LIMITS, createStarterMenuData } from "@/lib/menu-starter-presets";
import { getDefaultBusinessCoverLabel, isBusinessTypeKey } from "@/lib/business-types";
import { isSocialLinkType, validateSocialLinks } from "@/lib/social-links";
import { getTemplateCategoryFromKey, getTemplateCategoryLabel, isTemplateCategoryKey } from "@/lib/templates";
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

function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
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
    amount !== menuCreationProduct.amount
  ) {
    return null;
  }

  const parsedPayload: MenuOrderPayload = {
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
    representativeName: buyerType === "business" ? getNullableString(payload.representativeName) : null,
    businessNumber: buyerType === "business" ? getNullableString(payload.businessNumber) : null,
    businessPhone: buyerType === "business" ? getNullableString(payload.businessPhone) : null,
    termsAccepted: payload.termsAccepted === true,
    privacyAccepted: payload.privacyAccepted === true,
    contentPolicyAccepted: payload.contentPolicyAccepted === true,
    amount,
  };

  const requiredFields = [
    parsedPayload.menuName,
    parsedPayload.restaurantName,
    parsedPayload.restaurantCategory,
    parsedPayload.restaurantAddress,
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
    (!parsedPayload.businessName || !parsedPayload.representativeName || !parsedPayload.businessNumber || !parsedPayload.businessPhone)
  ) {
    return null;
  }

  return parsedPayload;
}

function getPaymentProduct(orderPayload: MenuOrderPayload) {
  if (orderPayload.plan_key === "large_screen") {
    return {
      key: "large_screen",
      name: "테이블씬 스크린 생성권",
    };
  }

  if (orderPayload.plan_key === "qr_order") {
    return {
      key: "qr_order",
      name: "테이블씬 오더 1.0 신청권",
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
  supabase: Awaited<ReturnType<typeof createClient>>,
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
      status: "failed",
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
    status: "failed",
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
    amount: menuCreationProduct.amount,
    customData: {
      product_key: product.key,
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
    amount: menuCreationProduct.amount,
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
  const templateKey = orderPayload?.template_key ?? (typeof body.template_key === "string" ? body.template_key.trim() : "");

  if (!paymentId) {
    return jsonError("paymentId가 없습니다.");
  }

  if (!isTemplateKey(templateKey)) {
    return jsonError("template_key가 올바르지 않습니다.");
  }

  if (!orderPayload) {
    return jsonError("메뉴판 생성을 위한 주문 payload가 올바르지 않습니다.");
  }

  const existingCompletion = await findExistingPaymentCompletion(supabase, paymentId);

  if (existingCompletion?.kind === "completed") {
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
