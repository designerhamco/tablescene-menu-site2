import { NextResponse } from "next/server";

import { isDisplayCheckoutQaEnabled } from "@/lib/display-checkout-qa";
import {
  getPaymentProductDefinition,
  isTemplateKey,
  isValidMenuSlug,
  normalizeMenuSlug,
} from "@/lib/payments";
import { validatePromotionForOrder } from "@/lib/promotions";
import { createClient } from "@/lib/supabase/server";
import {
  getTemplateCategoryFromKey,
  isTemplateCategoryKey,
  isTemplateSupportedForService,
} from "@/lib/templates";

export const runtime = "nodejs";

function getString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getNullableString(value: unknown) {
  const stringValue = getString(value);
  return stringValue || null;
}

function getTemplateServiceTypeForPlan(planKey: string) {
  return planKey === "large_screen" || planKey === "display" ? "display" : "basic";
}

function jsonError(message: string, status = 400, context?: Record<string, unknown>) {
  if (process.env.NODE_ENV !== "production" && context) {
    console.error("[payment-preflight]", {
      message,
      ...context,
    });
  }

  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return jsonError("로그인이 필요합니다.", 401);
  }

  let body: { order?: unknown; orderPayload?: unknown };

  try {
    body = (await request.json()) as { order?: unknown; orderPayload?: unknown };
  } catch {
    return jsonError("요청 본문이 올바른 JSON이 아닙니다.");
  }

  const orderSource = body.order ?? body.orderPayload;

  if (!orderSource || typeof orderSource !== "object") {
    return jsonError("결제 전 검증을 위한 주문 정보가 없습니다.");
  }

  const order = orderSource as Record<string, unknown>;
  const productKey = getString(order.product_key);
  const product = getPaymentProductDefinition(productKey);
  const planKey = getString(order.plan_key) || "basic";
  const templateKey = getString(order.template_key);
  const templateCategoryInput = getString(order.template_category);
  const templateCategory = isTemplateCategoryKey(templateCategoryInput)
    ? templateCategoryInput
    : getTemplateCategoryFromKey(templateKey);
  const desiredSlug = normalizeMenuSlug(getString(order.desiredSlug));
  const amount = typeof order.amount === "number" ? order.amount : Number(order.amount);
  const templateServiceType = getTemplateServiceTypeForPlan(planKey);
  const buyerType = getString(order.buyerType) === "business" ? "business" : "individual";
  const promotionValidation = validatePromotionForOrder({
    productKey,
    promotionCode: order.promotionCode,
    promotion: order.promotion,
  });

  if (!product) {
    return jsonError("선택한 상품 정보가 올바르지 않습니다.", 400, { productKey });
  }

  if (!promotionValidation.ok) {
    return jsonError(promotionValidation.message || "사용할 수 없는 프로모션 코드입니다.", 400, {
      productKey,
      hasPromotionCode: Boolean(getString(order.promotionCode)),
    });
  }

  if (product.template_service === "display" && !isDisplayCheckoutQaEnabled()) {
    return jsonError("메뉴링크 디스플레이 신청은 아직 준비 중입니다.", 403, {
      productKey,
      templateKey,
      planKey,
    });
  }

  if (
    (planKey !== "basic" && planKey !== "large_screen" && planKey !== "qr_order") ||
    !isTemplateKey(templateKey) ||
    !templateCategory ||
    !isValidMenuSlug(desiredSlug) ||
    amount !== product.amount ||
    getString(order.plan_type) !== product.plan_type ||
    getString(order.payment_type) !== product.payment_type ||
    getString(order.billing_cycle) !== product.billing_cycle
  ) {
    return jsonError("결제 전 검증에 실패했습니다. 선택한 상품과 신청 정보를 다시 확인해주세요.", 400, {
      productKey,
      templateKey,
      planKey,
      hasTemplateCategory: Boolean(templateCategory),
      amount,
      expectedAmount: product.amount,
    });
  }

  const hasRequiredBusinessFields =
    buyerType !== "business" ||
    Boolean(
      getNullableString(order.businessName) &&
        getNullableString(order.representativeName) &&
        getNullableString(order.businessNumber) &&
        getNullableString(order.businessOpeningDate)
    );
  const hasRequiredFields = Boolean(
    getString(order.menuName) &&
      getString(order.restaurantName) &&
      (getString(order.restaurantCategory) || templateCategory) &&
      getString(order.restaurantPhone) &&
      getString(order.buyerName) &&
      getString(order.buyerPhone) &&
      getString(order.buyerEmail) &&
      hasRequiredBusinessFields &&
      (!product.requires_business_verification || getNullableString(order.businessProfileId)) &&
      order.termsAccepted === true &&
      order.privacyAccepted === true &&
      order.contentPolicyAccepted === true
  );

  if (!hasRequiredFields) {
    return jsonError("결제 전 검증에 실패했습니다. 신청 필수 정보를 다시 확인해주세요.", 400, {
      productKey,
      templateKey,
      planKey,
      buyerType,
      hasBusinessProfileId: Boolean(getNullableString(order.businessProfileId)),
      hasRequiredBusinessFields,
    });
  }

  if (product.template_service !== templateServiceType) {
    return jsonError("선택한 상품과 서비스 유형이 일치하지 않습니다.", 400, {
      productKey,
      productTemplateService: product.template_service,
      templateServiceType,
      planKey,
    });
  }

  if (!isTemplateSupportedForService(templateKey, templateServiceType)) {
    return jsonError("선택한 상품에서 사용할 수 없는 템플릿입니다.", 400, {
      productKey,
      templateKey,
      templateServiceType,
      planKey,
    });
  }

  return NextResponse.json({
    ok: true,
    productKey: product.product_key,
    templateKey,
    templateServiceType,
    promotion: promotionValidation.promotion,
  });
}
