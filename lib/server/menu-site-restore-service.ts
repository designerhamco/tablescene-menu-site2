import "server-only";

import { getSubscriptionProduct, SUBSCRIPTION_PRODUCTS, type SubscriptionProductKey } from "@/lib/billing-products";
import { formatKrw } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/types";

type AdminClient = ReturnType<typeof createAdminClient>;
type RestoreServiceType = "basic" | "display";
type RestoreReasonCode =
  | "OK"
  | "MENU_SITE_NOT_FOUND"
  | "MENU_SITE_NOT_ARCHIVED"
  | "RETENTION_EXPIRED"
  | "ACTIVE_SERVICE_EXISTS"
  | "REFUND_REVIEW_REQUIRED"
  | "INVALID_PRODUCT"
  | "SERVICE_TYPE_MISMATCH"
  | "UNKNOWN_SERVICE_TYPE";

type MenuSiteRestoreRow = {
  id: string;
  user_id: string;
  name: string | null;
  slug: string | null;
  template_key: string | null;
  status: string | null;
  settings: Json | null;
};

type ServiceEntitlementRestoreRow = {
  id: string;
  menu_site_id: string | null;
  product_key: string | null;
  plan_type: string | null;
  billing_type: string | null;
  billing_cycle: string | null;
  status: string | null;
  access_expires_at: string | null;
  data_retention_until: string | null;
  deleted_scheduled_at: string | null;
  created_at: string | null;
};

type BusinessSubscriptionRestoreRow = {
  id: string;
  menu_site_id: string | null;
  product_key: string | null;
  plan_type: string | null;
  billing_cycle: string | null;
  status: string | null;
};

type RefundRequestRestoreRow = {
  id: string;
  menu_site_id: string | null;
  business_subscription_id: string | null;
  status: string | null;
  created_at: string | null;
};

export class MenuSiteRestorePreflightError extends Error {
  constructor(
    public code: string,
    message: string,
    public status = 400
  ) {
    super(message);
  }
}

function getRemainingDays(value: string | null | undefined) {
  if (!value) return null;
  const time = new Date(value).getTime();
  if (!Number.isFinite(time)) return null;
  return Math.ceil((time - Date.now()) / (1000 * 60 * 60 * 24));
}

function getLatestEntitlement(entitlements: ServiceEntitlementRestoreRow[]) {
  return [...entitlements].sort((a, b) => {
    const aTime = new Date(a.created_at ?? a.access_expires_at ?? 0).getTime();
    const bTime = new Date(b.created_at ?? b.access_expires_at ?? 0).getTime();
    return bTime - aTime;
  })[0] ?? null;
}

function getRestoreServiceType({
  menuSite,
  entitlement,
  subscription,
}: {
  menuSite: MenuSiteRestoreRow;
  entitlement: ServiceEntitlementRestoreRow | null;
  subscription: BusinessSubscriptionRestoreRow | null;
}): RestoreServiceType | null {
  const templateKey = menuSite.template_key ?? "";
  const planType = entitlement?.plan_type ?? subscription?.plan_type ?? "";
  const productKey = entitlement?.product_key ?? subscription?.product_key ?? "";

  if (templateKey.startsWith("display_") || planType === "business_display" || productKey.includes("display")) {
    return "display";
  }

  if (planType === "business_basic" || productKey.includes("basic") || templateKey.startsWith("cafe_") || templateKey.startsWith("restaurant_")) {
    return "basic";
  }

  return null;
}

function getAvailableProductKeys(serviceType: RestoreServiceType): SubscriptionProductKey[] {
  return serviceType === "display"
    ? ["business_display_monthly", "business_display_yearly"]
    : ["business_basic_monthly", "business_basic_yearly"];
}

function getNextBillingDescription(billingCycle: "monthly" | "yearly") {
  return billingCycle === "monthly"
    ? "결제 완료일로부터 1개월 후"
    : "결제 완료일로부터 1년 후";
}

function getReasonMessage(reasonCode: RestoreReasonCode) {
  switch (reasonCode) {
    case "MENU_SITE_NOT_FOUND":
      return "복구할 메뉴판을 찾을 수 없습니다.";
    case "MENU_SITE_NOT_ARCHIVED":
      return "보관 중인 메뉴판만 재구독으로 복구할 수 있습니다.";
    case "RETENTION_EXPIRED":
      return "보관 기간이 지나 메뉴판을 복구할 수 없습니다.";
    case "ACTIVE_SERVICE_EXISTS":
      return "이미 이용 중인 구독 또는 권한이 있어 재구독 복구가 필요하지 않습니다.";
    case "REFUND_REVIEW_REQUIRED":
      return "환불 처리 중이거나 확인이 필요한 상태라 재구독 복구를 진행할 수 없습니다.";
    case "INVALID_PRODUCT":
      return "복구할 구독 상품을 확인할 수 없습니다.";
    case "SERVICE_TYPE_MISMATCH":
      return "보관 중인 메뉴판과 선택한 구독 상품의 서비스 유형이 일치하지 않습니다.";
    case "UNKNOWN_SERVICE_TYPE":
      return "메뉴판의 서비스 유형을 확인할 수 없습니다.";
    case "OK":
      return "보관 기간 안에 재구독하면 기존 메뉴판을 다시 사용할 수 있습니다.";
  }
}

function productSummary(productKey: SubscriptionProductKey) {
  const product = SUBSCRIPTION_PRODUCTS[productKey];
  return {
    productKey: product.productKey,
    label: product.label,
    amount: product.amount,
    amountLabel: formatKrw(product.amount),
    billingCycle: product.billingCycle,
    nextBillingDescription: getNextBillingDescription(product.billingCycle),
  };
}

function result({
  canRestore,
  reasonCode,
  restoreMenuSiteId,
  serviceType,
  currentStatus,
  retentionUntil,
  selectedProductKey,
}: {
  canRestore: boolean;
  reasonCode: RestoreReasonCode;
  restoreMenuSiteId: string;
  serviceType: RestoreServiceType | null;
  currentStatus: string | null;
  retentionUntil: string | null;
  selectedProductKey: SubscriptionProductKey | null;
}) {
  const availableProducts = serviceType ? getAvailableProductKeys(serviceType).map(productSummary) : [];
  const selectedProduct = selectedProductKey ? productSummary(selectedProductKey) : null;

  return {
    canRestore,
    reasonCode,
    message: getReasonMessage(reasonCode),
    restoreMenuSiteId,
    serviceType,
    currentStatus,
    retentionUntil,
    availableProducts,
    selectedProduct,
    selectedProductPrice: selectedProduct?.amount ?? null,
    billingCycle: selectedProduct?.billingCycle ?? null,
    nextBillingDescription: selectedProduct?.nextBillingDescription ?? null,
  };
}

export async function getRestorePreflightSummary({
  adminSupabase = createAdminClient(),
  userId,
  restoreMenuSiteId,
  selectedProductKey,
}: {
  adminSupabase?: AdminClient;
  userId: string;
  restoreMenuSiteId: string;
  selectedProductKey: string;
}) {
  const product = getSubscriptionProduct(selectedProductKey);
  const normalizedProductKey = product?.productKey ?? null;

  if (!product || product.paymentType !== "subscription") {
    return result({
      canRestore: false,
      reasonCode: "INVALID_PRODUCT",
      restoreMenuSiteId,
      serviceType: null,
      currentStatus: null,
      retentionUntil: null,
      selectedProductKey: null,
    });
  }

  const { data: menuSiteData, error: menuSiteError } = await adminSupabase
    .from("menu_sites")
    .select("id, user_id, name, slug, template_key, status, settings")
    .eq("id", restoreMenuSiteId)
    .eq("user_id", userId)
    .maybeSingle();

  if (menuSiteError) {
    throw new MenuSiteRestorePreflightError("MENU_SITE_QUERY_FAILED", "복구 대상 메뉴판 확인에 실패했습니다.", 500);
  }

  const menuSite = menuSiteData as MenuSiteRestoreRow | null;
  if (!menuSite) {
    return result({
      canRestore: false,
      reasonCode: "MENU_SITE_NOT_FOUND",
      restoreMenuSiteId,
      serviceType: null,
      currentStatus: null,
      retentionUntil: null,
      selectedProductKey: normalizedProductKey,
    });
  }

  const [entitlementsResult, subscriptionsResult, refundsResult] = await Promise.all([
    adminSupabase
      .from("service_entitlements")
      .select("id, menu_site_id, product_key, plan_type, billing_type, billing_cycle, status, access_expires_at, data_retention_until, deleted_scheduled_at, created_at")
      .eq("menu_site_id", restoreMenuSiteId),
    adminSupabase
      .from("business_subscriptions" as never)
      .select("id, menu_site_id, product_key, plan_type, billing_cycle, status")
      .eq("menu_site_id" as never, restoreMenuSiteId as never),
    adminSupabase
      .from("refund_requests" as never)
      .select("id, menu_site_id, business_subscription_id, status, created_at")
      .eq("menu_site_id" as never, restoreMenuSiteId as never),
  ]);

  const queryError = entitlementsResult.error ?? subscriptionsResult.error ?? refundsResult.error;
  if (queryError) {
    throw new MenuSiteRestorePreflightError("RESTORE_CONTEXT_QUERY_FAILED", "복구 가능 상태 확인에 실패했습니다.", 500);
  }

  const entitlements = (entitlementsResult.data ?? []) as ServiceEntitlementRestoreRow[];
  const subscriptions = (subscriptionsResult.data ?? []) as unknown as BusinessSubscriptionRestoreRow[];
  const refundRequests = (refundsResult.data ?? []) as unknown as RefundRequestRestoreRow[];
  const latestEntitlement = getLatestEntitlement(entitlements);
  const latestSubscription = [...subscriptions].reverse()[0] ?? null;
  const serviceType = getRestoreServiceType({
    menuSite,
    entitlement: latestEntitlement,
    subscription: latestSubscription,
  });
  const retentionUntil = latestEntitlement?.data_retention_until ?? latestEntitlement?.deleted_scheduled_at ?? null;
  const retentionDays = getRemainingDays(retentionUntil);
  const activeServiceExists =
    entitlements.some((entitlement) => entitlement.status === "active") ||
    subscriptions.some((subscription) => subscription.status === "active");
  const hasBlockingRefund = refundRequests.some((refundRequest) =>
    refundRequest.status === "requested" ||
    refundRequest.status === "processing" ||
    refundRequest.status === "needs_review"
  );

  if (!serviceType) {
    return result({
      canRestore: false,
      reasonCode: "UNKNOWN_SERVICE_TYPE",
      restoreMenuSiteId,
      serviceType,
      currentStatus: menuSite.status,
      retentionUntil,
      selectedProductKey: normalizedProductKey,
    });
  }

  if (menuSite.status !== "archived") {
    return result({
      canRestore: false,
      reasonCode: "MENU_SITE_NOT_ARCHIVED",
      restoreMenuSiteId,
      serviceType,
      currentStatus: menuSite.status,
      retentionUntil,
      selectedProductKey: normalizedProductKey,
    });
  }

  if (typeof retentionDays !== "number" || retentionDays < 0) {
    return result({
      canRestore: false,
      reasonCode: "RETENTION_EXPIRED",
      restoreMenuSiteId,
      serviceType,
      currentStatus: menuSite.status,
      retentionUntil,
      selectedProductKey: normalizedProductKey,
    });
  }

  if (activeServiceExists) {
    return result({
      canRestore: false,
      reasonCode: "ACTIVE_SERVICE_EXISTS",
      restoreMenuSiteId,
      serviceType,
      currentStatus: menuSite.status,
      retentionUntil,
      selectedProductKey: normalizedProductKey,
    });
  }

  if (hasBlockingRefund) {
    return result({
      canRestore: false,
      reasonCode: "REFUND_REVIEW_REQUIRED",
      restoreMenuSiteId,
      serviceType,
      currentStatus: menuSite.status,
      retentionUntil,
      selectedProductKey: normalizedProductKey,
    });
  }

  if (product.serviceType !== serviceType) {
    return result({
      canRestore: false,
      reasonCode: "SERVICE_TYPE_MISMATCH",
      restoreMenuSiteId,
      serviceType,
      currentStatus: menuSite.status,
      retentionUntil,
      selectedProductKey: normalizedProductKey,
    });
  }

  return result({
    canRestore: true,
    reasonCode: "OK",
    restoreMenuSiteId,
    serviceType,
    currentStatus: menuSite.status,
    retentionUntil,
    selectedProductKey: normalizedProductKey,
  });
}
