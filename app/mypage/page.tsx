import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import { signOutAction } from "@/app/auth/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import AccountDeletionPanel from "@/components/mypage/AccountDeletionPanel";
import AiCreditRechargePanel from "@/components/mypage/AiCreditRechargePanel";
import ContactProfileEditor from "@/components/mypage/ContactProfileEditor";
import MarketingConsentSettings from "@/components/mypage/MarketingConsentSettings";
import BillingHistoryPanel, { type BillingHistoryEntry } from "@/components/mypage/BillingHistoryPanel";
import NotificationHistorySection, { type MypageNotificationEvent } from "@/components/mypage/NotificationHistorySection";
import PaymentDetailModal from "@/components/mypage/PaymentDetailModal";
import SubscriptionManagementModal from "@/components/mypage/SubscriptionManagementModal";
import {
  getInquiryErrorMessage,
  getInquiryNoticeMessage,
  InquirySection,
  inquiryPageSize,
  normalizeInquiryPage,
  type InquirySectionInquiry,
} from "@/components/mypage/InquirySection";
import { isDeletedAccountStatus } from "@/lib/account-status";
import { maskBusinessRegistrationNumber } from "@/lib/business-verification";
import { getPublicMenuPath } from "@/lib/menu-url";
import { getPublicPortOneConfig } from "@/lib/portone";
import { getAiCreditBalanceForUser } from "@/lib/server/ai-credits-service";
import {
  getAccessibleMenuSiteList,
  type AccessibleMenuSiteListItem,
} from "@/lib/server/menu-site-access-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAiCreditPack, type AiCreditBalance } from "@/lib/ai-credits";
import { getSubscriptionProduct } from "@/lib/billing-products";
import { formatNotificationBadgeCount, NOTIFICATION_VISIBLE_CHANNELS } from "@/lib/notification-display-policy";
import { formatKrw, getBasicPaymentProduct, personalTrialBasicProduct } from "@/lib/payments";
import { RETENTION_DDAY_DISPLAY_THRESHOLD_DAYS } from "@/lib/service-retention-policy";
import { getTemplateDisplayName } from "@/lib/templates";
import type { Json } from "@/lib/supabase/types";
import type { MenuSiteMemberRole } from "@/lib/menu-site-permissions";
import { isYearlyRefundConfirmQaEnabled } from "@/lib/yearly-refund-confirm-qa";
import { isRestoreSubscriptionQaEnabled } from "@/lib/restore-subscription-qa";

type SearchParams = Promise<{
  tab?: string | string[];
  menuTab?: string | string[];
  billingTab?: string | string[];
  error?: string | string[];
  message?: string | string[];
  inquiryPage?: string | string[];
  subscriptionId?: string | string[];
  modal?: string | string[];
}>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MYPAGE_QUERY_TIMEOUT_MS = 5000;
const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 1000 * 60 * 60 * 24;

type MyPageTab = "menus" | "payments" | "inquiries" | "notifications" | "account";
type MenuTab = "active" | "holding" | "deleted";
type BillingTab = "history" | "active" | "holding" | "deleted" | "ai-credits";

const MENU_SITE_MEMBER_ROLE_LABELS: Record<MenuSiteMemberRole, string> = {
  manager: "매니저",
  editor: "에디터",
  order_staff: "주문 직원",
  viewer: "조회자",
};

type MenuSite = {
  id: string | null;
  name: string | null;
  slug: string | null;
  template_key: string | null;
  status: string | null;
  created_at: string | null;
  updated_at: string | null;
  settings: Json | null;
};

type ServiceEntitlement = {
  id: string | null;
  menu_site_id: string | null;
  subscription_id?: string | null;
  product_key?: string | null;
  plan_key?: string | null;
  plan_type: string | null;
  billing_type: string | null;
  billing_cycle?: string | null;
  status: string | null;
  access_starts_at?: string | null;
  access_expires_at: string | null;
  expired_at: string | null;
  data_retention_until: string | null;
  deleted_scheduled_at: string | null;
  created_at?: string | null;
};

type BusinessSubscription = {
  id: string | null;
  menu_site_id: string | null;
  business_profile_id: string | null;
  product_key: string | null;
  plan_type: string | null;
  billing_cycle: string | null;
  status: string | null;
  amount: number | null;
  currency: string | null;
  portone_payment_id: string | null;
  next_billing_at: string | null;
  last_paid_at: string | null;
  cancel_at_period_end?: boolean | null;
  cancel_requested_at?: string | null;
  canceled_at?: string | null;
  cancellation_reason?: string | null;
  current_period_start?: string | null;
  current_period_end?: string | null;
  created_at: string | null;
};

type ServiceItem = {
  key: string;
  entitlement: ServiceEntitlement | null;
  menuSite: MenuSite | undefined;
  subscription: BusinessSubscription | null | undefined;
};

type PaymentRecord = {
  id: string | null;
  order_id: string | null;
  product_key: string | null;
  payment_id: string | null;
  portone_payment_id: string | null;
  status: string | null;
  amount: number | null;
  raw_payload: Json | null;
  created_at: string | null;
};

type OrderRecord = {
  id: string | null;
  menu_site_id: string | null;
  product_key: string | null;
  order_name: string | null;
  payment_id: string | null;
  status: string | null;
  total_amount: number | null;
  raw_payload: Json | null;
  created_at: string | null;
};

type AiCreditPurchaseTransaction = {
  id: string | null;
  menu_site_id: string | null;
  product_key: string | null;
  payment_id: string | null;
  credit_amount: number | null;
  balance_after: number | null;
  created_at: string | null;
};

type RefundRequestRecord = {
  id: string | null;
  business_subscription_id: string | null;
  menu_site_id: string | null;
  payment_id: string | null;
  portone_payment_id: string | null;
  status: string | null;
  estimated_refund_amount: number | null;
  final_refund_amount: number | null;
  processed_at: string | null;
  failure_reason: string | null;
  created_at: string | null;
};

type BusinessProfile = {
  id: string | null;
  business_registration_number: string | null;
  business_name: string | null;
  representative_name: string | null;
  business_status: string | null;
  tax_type: string | null;
  verification_status: string | null;
  verified_at: string | null;
  last_verified_at: string | null;
};

type UserContactProfile = {
  user_id: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  notification_email: string | null;
  updated_at: string | null;
};

type QueryErrorLike = {
  code?: string;
  message?: string;
};

type SupabaseContactProfileReader = {
  from(table: "user_contact_profiles"): {
    select(columns: string): {
      eq(column: "user_id", value: string): {
        maybeSingle(): Promise<{ data: UserContactProfile | null; error: QueryErrorLike | null }>;
      };
    };
  };
};

function isMissingRelationError(error: QueryErrorLike | null | undefined, relationName: string) {
  return error?.code === "42P01" || Boolean(error?.message?.includes(relationName));
}

function isMissingOptionalMypageRelation(error: QueryErrorLike | null | undefined) {
  return Boolean(
    error
      && (
        error.code === "42P01"
        || error.code === "42703"
        || error.message?.includes("service_entitlements")
        || error.message?.includes("business_subscriptions")
        || error.message?.includes("ai_account_credit_balances")
        || error.message?.includes("ai_credit_transactions")
        || error.message?.includes("inquiries")
        || error.message?.includes("user_contact_profiles")
        || error.message?.includes("notification_events")
      )
  );
}

function withTimeout<T>(promise: PromiseLike<T>, timeoutMs: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
  });

  return Promise.race([Promise.resolve(promise), timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

async function runMypageQuery<T>(label: string, promise: PromiseLike<T>) {
  try {
    return await withTimeout(promise, MYPAGE_QUERY_TIMEOUT_MS, label);
  } catch (error) {
    console.error("[mypage] query failed or timed out", {
      label,
      message: error instanceof Error ? error.message : "unknown",
    });
    return null;
  }
}

type TrialDisplayInfo = {
  source: "service_entitlements" | "settings";
  planType: string;
  billingType: string;
  billingCycle: string;
  status: string;
  accessExpiresAt: string;
  expiredAt: string;
  dataRetentionUntil: string;
  deletedScheduledAt: string;
};

function getStatusLabel(status: MenuSite["status"]) {
  const labels: Record<string, string> = {
    draft: "작성중",
    published: "공개중",
    private: "비공개",
    unpublished: "비공개",
    archived: "보관 중",
    expired: "만료됨",
  };

  return status ? labels[status] ?? status : "상태 미확인";
}

function formatDate(date: string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(date));
}

function formatDateTime(date: string | null) {
  if (!date) {
    return "-";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(date));
}

function getSafeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function getSearchParamString(value: string | string[] | undefined) {
  return getSafeString(Array.isArray(value) ? value[0] : value);
}

function getRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : {};
}

function getMetadataString(metadata: unknown, keys: string[]) {
  const record = getRecord(metadata);

  for (const key of keys) {
    const value = record[key];

    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return "";
}

function getProviderLabel(provider: string | null | undefined) {
  const normalizedProvider = getSafeString(provider).toLowerCase();
  const labels: Record<string, string> = {
    email: "이메일",
    kakao: "카카오",
    google: "구글",
  };

  return normalizedProvider ? labels[normalizedProvider] ?? normalizedProvider : "확인 필요";
}

function getActiveTab(value: string | string[] | undefined): MyPageTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (tab === "payments" || tab === "inquiries" || tab === "notifications" || tab === "account") {
    return tab;
  }

  return "menus";
}

function getMenuTab(value: string | string[] | undefined): MenuTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (tab === "holding" || tab === "archived") {
    return "holding";
  }

  if (tab === "deleted") {
    return "deleted";
  }

  return "active";
}

function getBillingTab(value: string | string[] | undefined): BillingTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (tab === "ai-credits") {
    return "ai-credits";
  }

  return "history";
}

function getBillingTabClassName(isActive: boolean) {
  return isActive
    ? "inline-flex flex-1 items-center justify-center rounded-full bg-zinc-950 px-4 py-2.5 text-sm font-black text-white sm:flex-none"
    : "inline-flex flex-1 items-center justify-center rounded-full bg-zinc-100 px-4 py-2.5 text-sm font-black text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 sm:flex-none";
}

function getTabLinkClassName(isActive: boolean) {
  return isActive
    ? "flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
    : "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950";
}

function getPrimaryProvider(appMetadata: unknown, identityProviders: string[]) {
  const metadata = getRecord(appMetadata);
  const provider = typeof metadata.provider === "string" ? metadata.provider : "";

  if (provider) {
    return provider;
  }

  return identityProviders[0] ?? "email";
}

function getIdentityProviders(identities: Array<{ provider?: string | null }> | null | undefined) {
  const providers = (identities ?? [])
    .map((identity) => getSafeString(identity.provider))
    .filter(Boolean);

  return Array.from(new Set(providers));
}

function getMenuSiteSettings(settings: Json | null | undefined) {
  return getRecord(settings);
}

function getSettingsString(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === "string" ? value : "";
}

function getEntitlementString(entitlement: ServiceEntitlement | undefined, key: keyof ServiceEntitlement) {
  const value = entitlement?.[key];
  return typeof value === "string" ? value : "";
}

function getEntitlementPriority(entitlement: ServiceEntitlement) {
  if (entitlement.plan_type === "business_basic" && entitlement.status === "active") return 0;
  if (entitlement.plan_type === "business_basic") return 1;
  if (entitlement.plan_type === "personal_trial" && entitlement.status === "active") return 2;
  if (entitlement.plan_type === "personal_trial") return 3;
  return 4;
}

function getProductLabel(productKey: string | null | undefined) {
  const key = getSafeString(productKey);
  const aiCreditPack = getAiCreditPack(key);

  if (aiCreditPack) return `${aiCreditPack.name} 충전`;

  const subscriptionProduct = getSubscriptionProduct(key);

  if (subscriptionProduct) return subscriptionProduct.name;

  const basicProduct = getBasicPaymentProduct(key);

  if (basicProduct) return basicProduct.name;

  if (key === personalTrialBasicProduct.product_key) return "메뉴링크 베이직 개인 1개월 체험";

  return key || "상품명 확인 필요";
}

function getServiceName(planType: string | null | undefined, billingCycle: string | null | undefined) {
  if (planType === "personal_trial" || planType === "personal_trial_basic_1month") return "메뉴링크 베이직 개인 체험";
  if (planType === "business_display") return billingCycle === "yearly" ? "메뉴링크 디스플레이 연결제" : "메뉴링크 디스플레이 월결제";
  if (planType === "business_basic") return billingCycle === "yearly" ? "메뉴링크 베이직 연결제" : "메뉴링크 베이직 월결제";

  return "메뉴링크 이용권";
}

function getMenuServiceBadge({
  productKey,
  planType,
  templateKey,
}: {
  productKey: string | null | undefined;
  planType: string | null | undefined;
  templateKey: string | null | undefined;
}) {
  const normalizedProductKey = getSafeString(productKey);
  const normalizedPlanType = getSafeString(planType);
  const normalizedTemplateKey = getSafeString(templateKey);
  const isDisplayService =
    normalizedPlanType === "business_display"
    || normalizedProductKey === "business_display_monthly"
    || normalizedProductKey === "business_display_yearly"
    || normalizedTemplateKey.startsWith("display_");

  if (isDisplayService) {
    return {
      label: "메뉴링크 디스플레이",
      className: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-100",
    };
  }

  return {
    label: "메뉴링크 베이직",
    className: "bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-100",
  };
}

type MenuCardBadge = {
  key: string;
  label: string;
  className: string;
};

type RecoveryCta = {
  label: string;
  href: string;
};

type RetentionDdayInfo = {
  days: number;
  label: string;
  message: string;
};

type ArchivedDisplayState = {
  key: string;
  label: string;
  className: string;
  message: string;
  cta: RecoveryCta | null;
  ddayInfo: RetentionDdayInfo | null;
};

function getMenuVisibilityBadge(status: MenuSite["status"]): MenuCardBadge | null {
  if (status === "draft") {
    return {
      key: "visibility:draft",
      label: "작성중",
      className: "bg-zinc-100 text-zinc-600",
    };
  }

  if (status === "published") {
    return {
      key: "visibility:published",
      label: "공개중",
      className: "bg-emerald-50 text-emerald-700",
    };
  }

  if (status === "private" || status === "unpublished") {
    return {
      key: "visibility:private",
      label: "비공개",
      className: "bg-zinc-100 text-zinc-600",
    };
  }

  if (!status) {
    return {
      key: "visibility:unknown",
      label: "상태 미확인",
      className: "bg-zinc-100 text-zinc-600",
    };
  }

  return null;
}

function getUniqueMenuCardBadges(
  badges: MenuCardBadge[],
) {
  const seenKeys = new Set<string>();
  const seenLabels = new Set<string>();

  return badges.filter((badge) => {
    if (seenKeys.has(badge.key)) {
      return false;
    }

    if (seenLabels.has(badge.label)) {
      return false;
    }

    seenKeys.add(badge.key);
    seenLabels.add(badge.label);
    return true;
  });
}

function getBillingCycleLabel(billingCycle: string | null | undefined) {
  if (billingCycle === "trial_1_month") return "1개월 체험";
  if (billingCycle === "monthly") return "월결제";
  if (billingCycle === "yearly") return "연결제";
  return "결제 주기 확인 필요";
}

function getEntitlementStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    active: "이용 중",
    expired: "만료됨",
    archived: "보관 중",
    pending_delete: "삭제됨",
    deleted: "삭제됨",
  };

  return status ? labels[status] ?? status : "상태 확인 필요";
}

function getSubscriptionStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    pending: "처리 중",
    active: "이용 중",
    failed: "결제 실패",
    payment_failed: "결제 실패",
    canceled: "해지됨",
    past_due: "결제 확인 필요",
    expired: "만료됨",
  };

  return status ? labels[status] ?? status : "상태 확인 필요";
}

function getBusinessSubscriptionCardStatusLabel(subscription: BusinessSubscription | null | undefined, fallbackStatus: string | null | undefined) {
  if (isActiveCancelScheduledSubscription(subscription)) return "해지 예약";
  if (subscription?.cancel_at_period_end) return "해지 종료";
  return getSubscriptionStatusLabel(subscription?.status ?? fallbackStatus);
}

function getPaymentStatusLabel(status: string | null | undefined) {
  const labels: Record<string, string> = {
    paid: "결제 완료",
    completed: "결제 완료",
    active: "결제 완료",
    pending: "처리 중",
    ready: "처리 중",
    failed: "결제 실패",
    cancelled: "취소됨",
    canceled: "취소됨",
    refunded: "환불 처리 완료",
  };

  return status ? labels[status] ?? status : "상태 확인 필요";
}

function getBillingPaymentStatusFromRefund(refundRequest: RefundRequestRecord | null | undefined) {
  const status = refundRequest?.status ?? null;

  if (status === "needs_review") {
    return {
      bucket: "needs_review" as const,
      label: "처리확인 필요",
      tone: "warning" as const,
      message: "자동 처리 확인이 필요합니다. 추가 결제나 재요청 없이 고객지원에서 확인 후 안내드리겠습니다.",
    };
  }

  if (status === "requested" || status === "processing") {
    return {
      bucket: "refund_processing" as const,
      label: "환불처리중",
      tone: "warning" as const,
      message: "환불 처리를 진행 중입니다.",
    };
  }

  if (status === "completed") {
    return {
      bucket: "refunded" as const,
      label: "환불 처리 완료",
      tone: "warning" as const,
      message: "카드사 또는 결제수단에 따라 실제 취소 반영까지 영업일 기준 3~7일이 걸릴 수 있습니다.",
    };
  }

  return null;
}

function getStateBadgeClassName(status: string | null | undefined) {
  if (status === "active" || status === "paid" || status === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "failed" || status === "past_due" || status === "payment_failed") return "bg-red-50 text-red-700 ring-red-100";
  if (
    status === "cancel_scheduled"
    || status === "cancel_ended"
    || status === "admin_archived"
    || status === "archived_fallback"
    || status === "public_restricted"
    || status === "expired"
    || status === "archived"
    || status === "pending_delete"
    || status === "deleted"
    || status === "cancelled"
    || status === "canceled"
    || status === "refunded"
  ) {
    return "bg-amber-50 text-amber-700 ring-amber-100";
  }

  return "bg-zinc-100 text-zinc-600 ring-zinc-200";
}

function getPaymentStatusTone(status: string | null | undefined): "success" | "warning" | "danger" | "neutral" {
  if (status === "active" || status === "paid" || status === "completed") return "success";
  if (status === "failed" || status === "past_due") return "danger";
  if (status === "expired" || status === "archived" || status === "pending_delete" || status === "cancelled" || status === "canceled" || status === "refunded") {
    return "warning";
  }

  return "neutral";
}

function getPaymentStatusBucket(status: string | null | undefined): BillingHistoryEntry["statusBucket"] {
  if (status === "paid" || status === "completed" || status === "active") return "paid";
  if (status === "failed" || status === "payment_failed" || status === "past_due") return "failed";
  if (status === "cancelled" || status === "canceled") return "cancelled";
  if (status === "refunded") return "refunded";
  if (status === "pending" || status === "ready") return "pending";
  return "unknown";
}

function getBillingServiceStatus({
  refundRequest,
  subscription,
  entitlement,
  menuSite,
  hasNewerActiveService = false,
}: {
  refundRequest?: RefundRequestRecord | null;
  subscription?: BusinessSubscription | null;
  entitlement?: ServiceEntitlement | null;
  menuSite?: MenuSite | null;
  hasNewerActiveService?: boolean;
}): {
  bucket: BillingHistoryEntry["serviceStatusBucket"];
  label: string;
  tone: BillingHistoryEntry["serviceStatusTone"];
  message: string | null;
} {
  const refundStatus = refundRequest?.status ?? null;

  if (refundStatus === "needs_review") {
    return {
      bucket: "needs_review",
      label: "처리확인 필요",
      tone: "warning",
      message: "자동 처리 확인이 필요합니다. 추가 결제나 재요청 없이 고객지원에서 확인 후 안내드리겠습니다.",
    };
  }

  if (refundStatus === "requested" || refundStatus === "processing") {
    return {
      bucket: "refund_processing",
      label: "환불처리중",
      tone: "warning",
      message: "환불 처리를 진행 중입니다.",
    };
  }

  const retentionEnd = entitlement?.data_retention_until ?? entitlement?.deleted_scheduled_at ?? null;
  const retentionDays = retentionEnd ? getRemainingDaysUntilKst(retentionEnd) : null;
  const hasRetentionWindow = typeof retentionDays === "number" && retentionDays >= 0;
  const isArchived = menuSite?.status === "archived" || entitlement?.status === "archived";

  if (refundStatus === "completed") {
    if (hasNewerActiveService) {
      return {
        bucket: "restored",
        label: "재구독 완료",
        tone: "success",
        message: "기존 메뉴판이 새 구독으로 복구되었습니다.",
      };
    }

    if (isArchived && hasRetentionWindow) {
      return {
        bucket: "archived",
        label: "보관중",
        tone: "warning",
        message: `${formatDate(retentionEnd)}까지 복구 가능`,
      };
    }

    return {
      bucket: "unrecoverable",
      label: "복구불가",
      tone: "neutral",
      message: "보관 기간이 지나 메뉴판을 복구할 수 없습니다.",
    };
  }

  if (subscription?.status === "active" && subscription.cancel_at_period_end) {
    return {
      bucket: "cancel_scheduled",
      label: "해지예약중",
      tone: "warning",
      message: "다음 결제일부터 자동결제가 중단될 예정이며, 현재는 이용할 수 있습니다.",
    };
  }

  if (isArchived) {
    if (hasRetentionWindow) {
      return {
        bucket: "archived",
        label: "보관중",
        tone: "warning",
        message: `${formatDate(retentionEnd)}까지 복구 가능`,
      };
    }

    return {
      bucket: "unrecoverable",
      label: "복구불가",
      tone: "neutral",
      message: "보관 기간이 지나 메뉴판을 복구할 수 없습니다.",
    };
  }

  if (entitlement?.status === "active" && menuSite?.status !== "archived") {
    return {
      bucket: "active",
      label: "이용중",
      tone: "success",
      message: null,
    };
  }

  if (subscription?.status === "failed" || subscription?.status === "payment_failed" || subscription?.status === "past_due") {
    return {
      bucket: "needs_review",
      label: "처리확인 필요",
      tone: "warning",
      message: "결제 상태 확인이 필요합니다. 추가 결제나 재요청 전에 고객지원 안내를 확인해주세요.",
    };
  }

  return {
    bucket: "unknown",
    label: "상태 확인 필요",
    tone: "neutral",
    message: null,
  };
}

function getBillingHistoryServiceType(productKey: string | null | undefined, templateKey?: string | null): BillingHistoryEntry["serviceType"] {
  const key = getSafeString(productKey);
  const template = getSafeString(templateKey);

  if (key.includes("trial")) return "trial";
  if (key.includes("display") || template.startsWith("display_")) return "display";
  if (key.includes("basic") || template.startsWith("cafe_") || template.startsWith("restaurant_")) return "basic";
  return "other";
}

function getBillingHistoryServiceTypeLabel(serviceType: BillingHistoryEntry["serviceType"]) {
  if (serviceType === "trial") return "체험";
  if (serviceType === "display") return "Display";
  if (serviceType === "basic") return "Basic";
  return "기타";
}

function getBillingHistoryMethod(productKey: string | null | undefined, billingCycle: string | null | undefined): BillingHistoryEntry["billingMethod"] {
  const key = getSafeString(productKey);

  if (billingCycle === "monthly" || key.endsWith("_monthly")) return "monthly";
  if (billingCycle === "yearly" || key.endsWith("_yearly")) return "yearly";
  if (billingCycle === "trial_1_month" || key.includes("trial")) return "trial";
  if (key.includes("ai_credit")) return "one_time";
  return "unknown";
}

function getBillingHistoryMethodLabel(method: BillingHistoryEntry["billingMethod"]) {
  if (method === "monthly") return "월결제 · 정기결제";
  if (method === "yearly") return "연결제 · 연 정기결제";
  if (method === "trial") return "체험 결제";
  if (method === "one_time") return "1회 결제";
  return "결제 방식 확인 필요";
}

function getRestoreSubscriptionOptions(serviceType: BillingHistoryEntry["serviceType"]) {
  const productKeys = serviceType === "basic"
    ? ["business_basic_monthly", "business_basic_yearly"]
    : serviceType === "display"
      ? ["business_display_monthly", "business_display_yearly"]
      : [];

  return productKeys
    .map((productKey) => getSubscriptionProduct(productKey))
    .filter((product): product is NonNullable<ReturnType<typeof getSubscriptionProduct>> => Boolean(product))
    .map((product) => ({
      productKey: product.productKey,
      label: product.label,
      amountLabel: formatKrw(product.amount),
      billingCycle: product.billingCycle,
      nextBillingDescription: product.billingCycle === "monthly"
        ? "결제 완료일로부터 1개월 후"
        : "결제 완료일로부터 1년 후",
      renewalDescription: product.billingCycle === "monthly"
        ? "새 구독은 결제 완료일 기준으로 시작되며, 다음 결제 예정일은 결제 완료일로부터 1개월 후입니다."
        : "새 구독은 결제 완료일 기준으로 시작되며, 다음 결제 예정일은 결제 완료일로부터 1년 후입니다.",
    }));
}

function getRestoreSubscriptionCta({
  serviceType,
  serviceStatusBucket,
  menuSite,
  retentionEndDate,
  hasActiveSubscription,
}: {
  serviceType: BillingHistoryEntry["serviceType"];
  serviceStatusBucket: BillingHistoryEntry["serviceStatusBucket"];
  menuSite?: MenuSite | null;
  retentionEndDate?: string | null;
  hasActiveSubscription: boolean;
}): BillingHistoryEntry["restoreSubscription"] {
  if (serviceStatusBucket !== "archived") return null;
  if (serviceType !== "basic" && serviceType !== "display") return null;
  if (!menuSite?.id) return null;
  if (hasActiveSubscription) return null;

  const daysUntilRetentionEnds = retentionEndDate ? getRemainingDaysUntilKst(retentionEndDate) : null;
  if (typeof daysUntilRetentionEnds !== "number" || daysUntilRetentionEnds < 0) return null;

  const options = getRestoreSubscriptionOptions(serviceType);
  if (options.length === 0) return null;

  return {
    menuSiteId: menuSite.id,
    menuName: menuSite.name ?? "이름 없는 메뉴판",
    menuPath: formatPublicMenuPath(menuSite.slug),
    serviceTypeLabel: getBillingHistoryServiceTypeLabel(serviceType),
    retentionLabel: `${formatDate(retentionEndDate ?? null)}까지 복구 가능`,
    options,
  };
}

function getSubscriptionPeriodEnd(subscription: BusinessSubscription | null | undefined) {
  return subscription?.current_period_end ?? subscription?.next_billing_at ?? null;
}

function hasTodayOrFutureDate(value: string | null | undefined) {
  if (!value) return false;
  const days = getRemainingDaysUntilKst(value);
  return typeof days === "number" && days >= 0;
}

function isActiveCancelScheduledSubscription(subscription: BusinessSubscription | null | undefined) {
  return subscription?.status === "active" && Boolean(subscription.cancel_at_period_end) && hasTodayOrFutureDate(getSubscriptionPeriodEnd(subscription));
}

function isPastCancelScheduledSubscription(subscription: BusinessSubscription | null | undefined, accessExpiresAt?: string | null) {
  if (!subscription?.cancel_at_period_end) return false;
  const periodEnd = getSubscriptionPeriodEnd(subscription) ?? accessExpiresAt ?? null;
  return !hasTodayOrFutureDate(periodEnd);
}

function hasActiveAccessDate(value: string | null | undefined) {
  return hasTodayOrFutureDate(value);
}

function isPaymentBlockedSubscriptionStatus(status: string | null | undefined) {
  return status === "failed" || status === "payment_failed" || status === "past_due";
}

function isInactiveSubscriptionStatus(status: string | null | undefined) {
  return Boolean(status && status !== "active");
}

function isInactiveEntitlementStatus(status: string | null | undefined) {
  return Boolean(status && status !== "active");
}

function getServiceItemHasActiveEntitlement(entitlement: ServiceEntitlement | null | undefined) {
  if (!entitlement || entitlement.status !== "active") {
    return false;
  }

  if (entitlement.access_expires_at) {
    return hasActiveAccessDate(entitlement.access_expires_at);
  }

  return true;
}

function getServiceItemHasActiveSubscription(subscription: BusinessSubscription | null | undefined) {
  if (!subscription || subscription.status !== "active" || isPaymentBlockedSubscriptionStatus(subscription.status)) {
    return false;
  }

  return hasActiveAccessDate(getSubscriptionPeriodEnd(subscription));
}

function getServiceItemHasExpiredAccessWindow(entitlement: ServiceEntitlement | null | undefined, subscription: BusinessSubscription | null | undefined) {
  const entitlementAccessDays = entitlement?.access_expires_at ? getRemainingDaysUntilKst(entitlement.access_expires_at) : null;
  const subscriptionPeriodEnd = getSubscriptionPeriodEnd(subscription);
  const subscriptionAccessDays = subscriptionPeriodEnd ? getRemainingDaysUntilKst(subscriptionPeriodEnd) : null;

  return (
    (typeof entitlementAccessDays === "number" && entitlementAccessDays < 0) ||
    (typeof subscriptionAccessDays === "number" && subscriptionAccessDays < 0)
  );
}

function getServiceItemHasActiveRetention({ entitlement }: ServiceItem) {
  const retentionEndsAt = entitlement?.data_retention_until ?? entitlement?.deleted_scheduled_at ?? null;
  const daysUntilRetentionEnds = retentionEndsAt ? getRemainingDaysUntilKst(retentionEndsAt) : null;
  return typeof daysUntilRetentionEnds === "number" && daysUntilRetentionEnds >= 0;
}

function maskPaymentId(paymentId: string | null | undefined) {
  const value = getSafeString(paymentId);

  if (!value) return "-";
  if (value.length <= 12) return value;

  return `${value.slice(0, 8)}...${value.slice(-4)}`;
}

function formatPublicMenuPath(slug: string | null | undefined) {
  const safeSlug = getSafeString(slug);
  return safeSlug ? getPublicMenuPath(safeSlug) : "-";
}

function getNullableRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function getSafeReceiptUrl(value: unknown) {
  const url = getSafeString(value);

  if (!url) return null;

  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? parsed.toString() : null;
  } catch {
    return null;
  }
}

function extractReceiptUrlFromPayload(payload: Json | null | undefined): string | null {
  const root = getNullableRecord(payload);
  if (!root) return null;

  const portonePayment = getNullableRecord(root.portone_payment) ?? getNullableRecord(root.payment);
  const cashReceipt = getNullableRecord(root.cashReceipt) ?? getNullableRecord(root.cash_receipt) ?? getNullableRecord(portonePayment?.cashReceipt) ?? getNullableRecord(portonePayment?.cash_receipt);
  const transaction = getNullableRecord(root.transaction) ?? getNullableRecord(portonePayment?.transaction);

  return (
    getSafeReceiptUrl(root.receiptUrl) ??
    getSafeReceiptUrl(root.receipt_url) ??
    getSafeReceiptUrl(root.pgReceiptUrl) ??
    getSafeReceiptUrl(root.pg_receipt_url) ??
    getSafeReceiptUrl(root.cashReceiptUrl) ??
    getSafeReceiptUrl(root.cash_receipt_url) ??
    getSafeReceiptUrl(portonePayment?.receiptUrl) ??
    getSafeReceiptUrl(portonePayment?.receipt_url) ??
    getSafeReceiptUrl(portonePayment?.pgReceiptUrl) ??
    getSafeReceiptUrl(portonePayment?.pg_receipt_url) ??
    getSafeReceiptUrl(portonePayment?.cashReceiptUrl) ??
    getSafeReceiptUrl(portonePayment?.cash_receipt_url) ??
    getSafeReceiptUrl(cashReceipt?.receiptUrl) ??
    getSafeReceiptUrl(cashReceipt?.receipt_url) ??
    getSafeReceiptUrl(transaction?.receiptUrl) ??
    getSafeReceiptUrl(transaction?.receipt_url)
  );
}

function getPaymentReceiptUrl(payment?: PaymentRecord | null, order?: OrderRecord | null) {
  return extractReceiptUrlFromPayload(payment?.raw_payload) ?? extractReceiptUrlFromPayload(order?.raw_payload);
}

function getTrialDisplayInfo(settings: Record<string, unknown>, entitlement?: ServiceEntitlement): TrialDisplayInfo | null {
  const entitlementPlanType = getEntitlementString(entitlement, "plan_type");

  if (entitlementPlanType) {
    return {
      source: "service_entitlements",
      planType: entitlementPlanType,
      billingType: getEntitlementString(entitlement, "billing_type"),
      billingCycle: getEntitlementString(entitlement, "billing_cycle"),
      status: getEntitlementString(entitlement, "status"),
      accessExpiresAt: getEntitlementString(entitlement, "access_expires_at"),
      expiredAt: getEntitlementString(entitlement, "expired_at"),
      dataRetentionUntil: getEntitlementString(entitlement, "data_retention_until"),
      deletedScheduledAt: getEntitlementString(entitlement, "deleted_scheduled_at"),
    };
  }

  const settingsPlanType = getSettingsString(settings, "plan_type");

  if (!settingsPlanType) {
    return null;
  }

  return {
    source: "settings",
    planType: settingsPlanType,
    billingType: getSettingsString(settings, "payment_type"),
    billingCycle: getSettingsString(settings, "billing_cycle"),
    status: "",
    accessExpiresAt: getSettingsString(settings, "access_expires_at"),
    expiredAt: "",
    dataRetentionUntil: getSettingsString(settings, "data_retention_until"),
    deletedScheduledAt: "",
  };
}

function getKstDateParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = new Map(parts.map((part) => [part.type, part.value]));
  const year = Number(values.get("year"));
  const month = Number(values.get("month"));
  const day = Number(values.get("day"));

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  return { year, month, day };
}

function getKstDayStartTime(date: Date) {
  const parts = getKstDateParts(date);

  if (!parts) {
    return null;
  }

  return Date.UTC(parts.year, parts.month - 1, parts.day);
}

function getRemainingDaysUntilKst(expiresAt: string | Date, now: Date = new Date()) {
  const expiresAtDate = typeof expiresAt === "string" ? new Date(expiresAt) : expiresAt;
  const expiresAtTime = expiresAtDate.getTime();

  if (!Number.isFinite(expiresAtTime)) {
    return null;
  }

  const todayStart = getKstDayStartTime(now);
  const expiresStart = getKstDayStartTime(expiresAtDate);

  if (todayStart === null || expiresStart === null) {
    return null;
  }

  return Math.round((expiresStart - todayStart) / DAY_MS);
}

function getRetentionDdayInfo(retentionEndsAt: string | null | undefined): RetentionDdayInfo | null {
  if (!retentionEndsAt) {
    return null;
  }

  const days = getRemainingDaysUntilKst(retentionEndsAt);

  if (days === null) {
    return null;
  }

  if (days > RETENTION_DDAY_DISPLAY_THRESHOLD_DAYS || days < 0) {
    return null;
  }

  if (days > 0) {
    return {
      days,
      label: `보관 만료 D-${days}`,
      message: `보관 만료 D-${days}`,
    };
  }

  if (days === 0) {
    return {
      days,
      label: "보관 만료 D-Day",
      message: "보관 만료 D-Day",
    };
  }

  return null;
}

function getRetentionDdayMessage(
  baseMessage: string,
  ddayInfo: RetentionDdayInfo | null,
  ddayMessage: string,
) {
  return ddayInfo?.days === 0 ? `${baseMessage} ${ddayMessage}` : baseMessage;
}

function getArchivedDisplayState({
  isRetentionDue,
  hasPaymentIssue,
  isCancelScheduledEnded,
  isTrialEnded,
  isAdminArchived,
  isAccessRestricted,
  siteId,
  ddayInfo,
}: {
  isRetentionDue: boolean;
  hasPaymentIssue: boolean;
  isCancelScheduledEnded: boolean;
  isTrialEnded: boolean;
  isAdminArchived: boolean;
  isAccessRestricted: boolean;
  siteId: string;
  ddayInfo: RetentionDdayInfo | null;
}): ArchivedDisplayState | null {
  if (isRetentionDue) {
    return {
      key: "deleted",
      label: "삭제됨",
      className: "bg-zinc-100 text-zinc-600",
      message: "보관 기간이 종료되어 복구할 수 없습니다.",
      cta: null,
      ddayInfo: null,
    };
  }

  if (hasPaymentIssue) {
    const message = getRetentionDdayMessage(
      "자동 결제가 완료되지 않아 공개와 편집이 제한되었습니다.",
      ddayInfo,
      "오늘까지 결제를 정상화하면 기존 메뉴판을 복구할 수 있습니다.",
    );

    return {
      key: "payment-needed",
      label: "결제 확인 필요",
      className: "bg-red-50 text-red-700",
      message,
      cta: null,
      ddayInfo,
    };
  }

  if (isCancelScheduledEnded) {
    const message = getRetentionDdayMessage(
      "해지 예약에 따라 이용이 종료되어 보관 중입니다.",
      ddayInfo,
      "오늘까지 결제하면 기존 메뉴판을 복구할 수 있습니다.",
    );

    return {
      key: "cancel-ended",
      label: "해지 종료",
      className: "bg-amber-50 text-amber-700",
      message,
      cta: null,
      ddayInfo,
    };
  }

  if (isTrialEnded) {
    const message = getRetentionDdayMessage(
      "무료 체험 기간이 종료되어 보관 중입니다.",
      ddayInfo,
      "오늘까지 사업자 플랜으로 전환하면 기존 메뉴판을 유지할 수 있습니다.",
    );

    return {
      key: "trial-ended",
      label: "체험 종료",
      className: "bg-amber-50 text-amber-700",
      message,
      cta: siteId
        ? { label: "사업자 플랜으로 전환", href: `/mypage/menus/${siteId}/convert` }
        : null,
      ddayInfo,
    };
  }

  if (isAdminArchived) {
    return {
      key: "admin-archived",
      label: "관리자 보관",
      className: "bg-amber-50 text-amber-700",
      message: "관리자에 의해 보관 처리된 메뉴판입니다.",
      cta: null,
      ddayInfo: null,
    };
  }

  if (isAccessRestricted) {
    return {
      key: "archived-fallback",
      label: "보관 중",
      className: "bg-amber-50 text-amber-700",
      message: "현재 보관 상태입니다.",
      cta: null,
      ddayInfo,
    };
  }

  return null;
}

async function getServiceEntitlementsForMenuSites(
  supabase: Awaited<ReturnType<typeof createClient>>,
  menuSiteIds: string[]
) {
  if (menuSiteIds.length === 0) {
    return { data: [] as ServiceEntitlement[], error: null };
  }

  const result = await runMypageQuery(
    "service_entitlements",
    supabase
      .from("service_entitlements")
      .select("id, menu_site_id, subscription_id, product_key, plan_key, plan_type, billing_type, billing_cycle, status, access_starts_at, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at, created_at")
      .in("menu_site_id", menuSiteIds)
  );

  if (!result) {
    return {
      data: [] as ServiceEntitlement[],
      error: { message: "이용 상태 정보를 불러오는 데 시간이 오래 걸려 건너뛰었습니다." },
    };
  }

  if (isMissingRelationError(result.error, "service_entitlements")) {
    return {
      data: [] as ServiceEntitlement[],
      error: null,
    };
  }

  if (!result.error || !result.error.message.includes("billing_cycle")) {
    return {
      data: (result.data ?? []) as ServiceEntitlement[],
      error: result.error,
    };
  }

  const fallbackResult = await runMypageQuery(
    "service_entitlements_fallback",
    supabase
      .from("service_entitlements")
      .select("id, menu_site_id, subscription_id, product_key, plan_key, plan_type, billing_type, status, access_starts_at, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at, created_at")
      .in("menu_site_id", menuSiteIds)
  );

  if (!fallbackResult) {
    return {
      data: [] as ServiceEntitlement[],
      error: { message: "이용 상태 정보를 불러오는 데 시간이 오래 걸려 건너뛰었습니다." },
    };
  }

  return {
    data: (fallbackResult.data ?? []) as ServiceEntitlement[],
    error: fallbackResult.error,
  };
}

export default async function MyPage({ searchParams }: { searchParams: SearchParams }) {
  const { tab, menuTab, billingTab, error, message, inquiryPage, subscriptionId, modal } = await searchParams;
  const yearlyRefundConfirmEnabled = isYearlyRefundConfirmQaEnabled();
  const restoreSubscriptionQaEnabled = isRestoreSubscriptionQaEnabled();
  const activeTab = getActiveTab(tab);
  const activeMenuTab = getMenuTab(menuTab);
  const activeBillingTab = getBillingTab(billingTab);
  const requestedSubscriptionId = getSearchParamString(subscriptionId);
  const requestedModal = getSearchParamString(modal);
  const shouldAutoOpenSubscriptionModal = activeTab === "payments" && requestedModal === "subscription-management" && Boolean(requestedSubscriptionId);
  const supabase = await createClient();
  const userResult = await runMypageQuery("auth.getUser", supabase.auth.getUser());
  const user = userResult?.data.user ?? null;

  if (!user) {
    redirect("/sign-in?next=/mypage");
  }

  if (isDeletedAccountStatus(user.app_metadata)) {
    await supabase.auth.signOut();
    redirect(`/sign-in?error=${encodeURIComponent("탈퇴 처리된 계정입니다.")}`);
  }

  const menuSitesResult = await runMypageQuery(
    "menu_sites",
    supabase
      .from("menu_sites")
      .select("id, name, slug, template_key, status, created_at, updated_at, settings")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
  );
  const menuSites = menuSitesResult?.data ?? [];
  const menuSitesError = menuSitesResult?.error ?? (
    menuSitesResult
      ? null
      : { message: "메뉴판 목록을 불러오는 데 시간이 오래 걸려 건너뛰었습니다." }
  );

  const sites = (menuSites ?? []) as MenuSite[];
  const accessibleMenuSitesResult = await runMypageQuery(
    "accessible_menu_sites",
    getAccessibleMenuSiteList(),
  );
  const accessibleMenuSites = accessibleMenuSitesResult ?? [];
  const staffMenuSites = accessibleMenuSites
    .filter((menuSite) => !menuSite.isOwner && menuSite.memberRole) as Array<
      AccessibleMenuSiteListItem & { isOwner: false; memberRole: MenuSiteMemberRole }
    >;
  const staffMenuSitesError = accessibleMenuSitesResult === null
    ? { message: "직원으로 참여한 메뉴판 목록을 불러오는 데 시간이 오래 걸려 건너뛰었습니다." }
    : null;
  const isStaffOnlyAccount = staffMenuSites.length > 0 && !accessibleMenuSites.some((menuSite) => menuSite.isOwner);

  if (isStaffOnlyAccount && activeTab === "payments") {
    redirect("/mypage?tab=menus");
  }

  const menuSiteIds = sites
    .map((site) => getSafeString(site.id))
    .filter(Boolean);
  const { data: serviceEntitlements, error: serviceEntitlementsError } = await getServiceEntitlementsForMenuSites(supabase, menuSiteIds);
  const portOneConfig = getPublicPortOneConfig();
  let accountAiCreditBalance: AiCreditBalance | null = null;

  try {
    accountAiCreditBalance = await runMypageQuery(
      "ai_credit_balance",
      getAiCreditBalanceForUser(user.id)
    );
  } catch (error) {
    console.error("[mypage] AI credit balance query failed", {
      userId: user.id,
      message: error instanceof Error ? error.message : "unknown",
    });
    accountAiCreditBalance = null;
  }
  const aiCreditContextMenuSite = sites.find((site) => site.id && site.name);
  const accountAiCreditRemaining = Math.max(0, Math.floor(accountAiCreditBalance?.totalRemainingCredits ?? 0));
  const businessProfilesResult = await runMypageQuery(
    "business_profiles",
    supabase
      .from("business_profiles")
      .select("id, business_registration_number, business_name, representative_name, business_status, tax_type, verification_status, verified_at, last_verified_at")
      .eq("user_id", user.id)
      .eq("verification_status", "verified")
      .order("last_verified_at", { ascending: false })
  );
  const businessProfiles = businessProfilesResult?.data ?? [];
  const businessProfilesError = businessProfilesResult?.error ?? null;
  const contactProfileResult = await runMypageQuery(
    "user_contact_profiles",
    (supabase as unknown as SupabaseContactProfileReader)
      .from("user_contact_profiles")
      .select("user_id, contact_name, contact_phone, notification_email, updated_at")
      .eq("user_id", user.id)
      .maybeSingle()
  );
  const contactProfile = contactProfileResult?.error && !isMissingOptionalMypageRelation(contactProfileResult.error)
    ? null
    : contactProfileResult?.data ?? null;
  const contactProfileError = contactProfileResult?.error ?? null;
  let notificationEvents: MypageNotificationEvent[] = [];
  let unreadNotificationCount = 0;

  try {
    const adminSupabase = createAdminClient();
    const unreadNotificationsResult = await runMypageQuery(
      "notification_events_unread_count",
      adminSupabase
        .from("notification_events" as never)
        .select("id", { count: "exact", head: true })
        .eq("user_id" as never, user.id as never)
        .in("channel" as never, NOTIFICATION_VISIBLE_CHANNELS as unknown as string[])
        .neq("status" as never, "skipped" as never)
        .is("read_at" as never, null)
    );

    if (!unreadNotificationsResult?.error) {
      unreadNotificationCount = unreadNotificationsResult?.count ?? 0;
    } else if (!isMissingOptionalMypageRelation(unreadNotificationsResult.error)) {
      console.error("[mypage] notification unread count query failed", {
        userId: user.id,
        code: unreadNotificationsResult.error.code,
        message: unreadNotificationsResult.error.message,
      });
    }

    const notificationEventsResult = activeTab === "notifications" ? await runMypageQuery(
      "notification_events",
      adminSupabase
        .from("notification_events" as never)
        .select("id, title, message, status, channel, sent_at, read_at, created_at, metadata")
        .eq("user_id" as never, user.id as never)
        .in("channel" as never, NOTIFICATION_VISIBLE_CHANNELS as unknown as string[])
        .neq("status" as never, "skipped" as never)
        .order("created_at" as never, { ascending: false } as never)
        .limit(50)
    ) : null;

    if (!notificationEventsResult?.error) {
      notificationEvents = (notificationEventsResult?.data ?? []) as unknown as MypageNotificationEvent[];
    } else if (!isMissingOptionalMypageRelation(notificationEventsResult.error)) {
      console.error("[mypage] notification events query failed", {
        userId: user.id,
        code: notificationEventsResult.error.code,
        message: notificationEventsResult.error.message,
      });
    }
  } catch (notificationError) {
    console.error("[mypage] notification events query failed", {
      userId: user.id,
      message: notificationError instanceof Error ? notificationError.message : "unknown",
    });
  }

  const activeInquiryPage = normalizeInquiryPage(inquiryPage);
  const inquiryFrom = (activeInquiryPage - 1) * inquiryPageSize;
  const inquiryTo = inquiryFrom + inquiryPageSize - 1;
  let inquiries: InquirySectionInquiry[] = [];
  let inquiryTotalCount = 0;
  let inquiriesErrorMessage: string | null = null;

  if (activeTab === "inquiries") {
    const inquiriesResult = await runMypageQuery(
      "inquiries",
      supabase
        .from("inquiries")
        .select("id, title, message, status, category, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(inquiryFrom, inquiryTo)
    );
    let inquiriesData = inquiriesResult?.data ?? [];
    let inquiriesError = inquiriesResult?.error ?? null;
    let inquiryCount = inquiriesResult?.count ?? 0;

    if (inquiriesResult?.error?.code === "42703") {
      const fallbackInquiriesResult = await runMypageQuery(
        "inquiries_without_category",
        supabase
          .from("inquiries")
          .select("id, title, message, status, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(inquiryFrom, inquiryTo)
      );
      inquiriesData = fallbackInquiriesResult?.data as typeof inquiriesData;
      inquiriesError = fallbackInquiriesResult?.error ?? null;
      inquiryCount = fallbackInquiriesResult?.count ?? 0;
    }

    inquiries = (inquiriesData ?? []) as InquirySectionInquiry[];
    inquiryTotalCount = inquiryCount ?? 0;
    inquiriesErrorMessage = isMissingOptionalMypageRelation(inquiriesError)
      ? null
      : inquiriesError?.message ?? (inquiriesResult ? null : "문의 목록을 불러오는 데 시간이 오래 걸려 건너뛰었습니다.");
  }

  const inquiryTotalPages = Math.max(1, Math.ceil(inquiryTotalCount / inquiryPageSize));
  const businessProfile = businessProfilesError ? null : ((businessProfiles ?? [])[0] as BusinessProfile | undefined ?? null);
  const businessProfileById = new Map<string, BusinessProfile>();
  const entitlementByMenuSiteId = new Map<string, ServiceEntitlement>();
  const siteById = new Map<string, MenuSite>();

  if (!businessProfilesError) {
    for (const profile of (businessProfiles ?? []) as BusinessProfile[]) {
      const profileId = getSafeString(profile.id);

      if (profileId) {
        businessProfileById.set(profileId, profile);
      }
    }
  }

  if (!serviceEntitlementsError) {
    for (const entitlement of (serviceEntitlements ?? []) as ServiceEntitlement[]) {
      const menuSiteId = getSafeString(entitlement.menu_site_id);

      const currentEntitlement = entitlementByMenuSiteId.get(menuSiteId);

      if (menuSiteId && (!currentEntitlement || getEntitlementPriority(entitlement) < getEntitlementPriority(currentEntitlement))) {
        entitlementByMenuSiteId.set(menuSiteId, entitlement);
      }
    }
  }

  for (const site of sites) {
    const siteId = getSafeString(site.id);

    if (siteId) {
      siteById.set(siteId, site);
    }
  }

  let businessSubscriptions: BusinessSubscription[] = [];
  let payments: PaymentRecord[] = [];
  let orders: OrderRecord[] = [];
  let aiCreditPurchases: AiCreditPurchaseTransaction[] = [];
  let refundRequests: RefundRequestRecord[] = [];
  const paymentsErrors: string[] = [];

  try {
    const adminSupabase = createAdminClient();
    const businessSubscriptionsResult = await runMypageQuery(
      "business_subscriptions_for_menu_cards",
      adminSupabase
        .from("business_subscriptions" as never)
        .select("id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, cancel_at_period_end, cancel_requested_at, canceled_at, cancellation_reason, current_period_start, current_period_end, created_at")
        .eq("user_id" as never, user.id as never)
        .order("created_at" as never, { ascending: false } as never)
    );

    if (!businessSubscriptionsResult?.error) {
      businessSubscriptions = (businessSubscriptionsResult?.data ?? []) as unknown as BusinessSubscription[];
    } else if (businessSubscriptionsResult.error?.code === "42703") {
      const fallbackResult = await runMypageQuery(
        "business_subscriptions_for_menu_cards_fallback",
        adminSupabase
          .from("business_subscriptions" as never)
          .select("id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, created_at")
          .eq("user_id" as never, user.id as never)
          .order("created_at" as never, { ascending: false } as never)
      );

      businessSubscriptions = (fallbackResult?.data ?? []) as unknown as BusinessSubscription[];
    }
  } catch (subscriptionError) {
    console.error("[mypage] business subscription menu card query failed", {
      userId: user.id,
      message: subscriptionError instanceof Error ? subscriptionError.message : "unknown",
    });
  }

  if (activeTab === "payments") {
    try {
      const adminSupabase = createAdminClient();
      const [
        businessSubscriptionsResult,
        paymentsResult,
        ordersResult,
        aiCreditPurchasesResult,
        refundRequestsResult,
      ] = await Promise.all([
        runMypageQuery(
          "business_subscriptions",
          adminSupabase
            .from("business_subscriptions" as never)
            .select("id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, cancel_at_period_end, cancel_requested_at, canceled_at, cancellation_reason, current_period_start, current_period_end, created_at")
            .eq("user_id" as never, user.id as never)
            .order("created_at" as never, { ascending: false } as never)
        ),
        runMypageQuery(
          "payments",
          supabase
            .from("payments")
            .select("id, order_id, product_key, payment_id, portone_payment_id, status, amount, raw_payload, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
        ),
        runMypageQuery(
          "orders",
          supabase
            .from("orders")
            .select("id, menu_site_id, product_key, order_name, payment_id, status, total_amount, raw_payload, created_at")
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
        ),
        runMypageQuery(
          "ai_credit_transactions_purchases",
          adminSupabase
            .from("ai_credit_transactions" as never)
            .select("id, menu_site_id, product_key, payment_id, credit_amount, balance_after, created_at")
            .eq("user_id" as never, user.id as never)
            .eq("transaction_type" as never, "purchase" as never)
            .order("created_at" as never, { ascending: false } as never)
        ),
        runMypageQuery(
          "refund_requests",
          adminSupabase
            .from("refund_requests" as never)
            .select("id, business_subscription_id, menu_site_id, payment_id, portone_payment_id, status, estimated_refund_amount, final_refund_amount, processed_at, failure_reason, created_at")
            .eq("user_id" as never, user.id as never)
            .order("created_at" as never, { ascending: false } as never)
        ),
      ]);

      if (!businessSubscriptionsResult) {
        paymentsErrors.push("구독 정보를 불러오는 데 시간이 오래 걸려 건너뛰었습니다.");
      } else if (businessSubscriptionsResult.error?.code === "42703") {
        const fallbackResult = await runMypageQuery(
          "business_subscriptions_fallback",
          adminSupabase
            .from("business_subscriptions" as never)
            .select("id, menu_site_id, business_profile_id, product_key, plan_type, billing_cycle, status, amount, currency, portone_payment_id, next_billing_at, last_paid_at, created_at")
            .eq("user_id" as never, user.id as never)
            .order("created_at" as never, { ascending: false } as never)
        );

        businessSubscriptions = (fallbackResult?.data ?? []) as unknown as BusinessSubscription[];
        paymentsErrors.push("구독 관리 컬럼 migration 적용 전이라 해지 예약 기능은 비활성화됩니다.");
      } else if (businessSubscriptionsResult.error && !isMissingRelationError(businessSubscriptionsResult.error, "business_subscriptions")) {
        console.error("[mypage/payments] business subscriptions query failed", {
          userId: user.id,
          code: businessSubscriptionsResult.error.code,
          message: businessSubscriptionsResult.error.message,
        });
        paymentsErrors.push("구독 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }

      if (!paymentsResult) {
        paymentsErrors.push("결제 내역을 불러오는 데 시간이 오래 걸려 건너뛰었습니다.");
      } else if (paymentsResult.error) {
        console.error("[mypage/payments] payments query failed", {
          userId: user.id,
          code: paymentsResult.error.code,
          message: paymentsResult.error.message,
        });
        paymentsErrors.push("결제 내역을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }

      if (!ordersResult) {
        paymentsErrors.push("주문 내역을 불러오는 데 시간이 오래 걸려 건너뛰었습니다.");
      } else if (ordersResult.error) {
        console.error("[mypage/payments] orders query failed", {
          userId: user.id,
          code: ordersResult.error.code,
          message: ordersResult.error.message,
        });
        paymentsErrors.push("결제 내역을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }

      if (!aiCreditPurchasesResult) {
        paymentsErrors.push("AI 크레딧 충전 내역을 불러오는 데 시간이 오래 걸려 건너뛰었습니다.");
      } else if (aiCreditPurchasesResult.error && !isMissingRelationError(aiCreditPurchasesResult.error, "ai_credit_transactions")) {
        console.error("[mypage/payments] AI credit purchase query failed", {
          userId: user.id,
          code: aiCreditPurchasesResult.error.code,
          message: aiCreditPurchasesResult.error.message,
        });
        paymentsErrors.push("AI 크레딧 충전 내역을 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      }

      if (!refundRequestsResult) {
        paymentsErrors.push("환불 처리 상태를 불러오는 데 시간이 오래 걸려 건너뛰었습니다.");
      } else if (isMissingRelationError(refundRequestsResult.error, "refund_requests")) {
        refundRequests = [];
      } else if (refundRequestsResult.error) {
        console.error("[mypage/payments] refund requests query failed", {
          userId: user.id,
          code: refundRequestsResult.error.code,
          message: refundRequestsResult.error.message,
        });
        paymentsErrors.push("환불 처리 상태를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
      } else {
        refundRequests = (refundRequestsResult.data ?? []) as unknown as RefundRequestRecord[];
      }

      if (businessSubscriptions.length === 0) {
        businessSubscriptions = (businessSubscriptionsResult?.data ?? []) as unknown as BusinessSubscription[];
      }
      payments = (paymentsResult?.data ?? []) as PaymentRecord[];
      orders = (ordersResult?.data ?? []) as OrderRecord[];
      aiCreditPurchases = (aiCreditPurchasesResult?.data ?? []) as unknown as AiCreditPurchaseTransaction[];
    } catch (paymentsError) {
      console.error("[mypage/payments] payment tab query failed", {
        userId: user.id,
        message: paymentsError instanceof Error ? paymentsError.message : "unknown",
      });
      paymentsErrors.push("결제 정보를 불러오는 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
    }
  }

  const orderById = new Map<string, OrderRecord>();
  const orderByPaymentId = new Map<string, OrderRecord>();

  for (const order of orders) {
    const orderId = getSafeString(order.id);
    const paymentId = getSafeString(order.payment_id);

    if (orderId) orderById.set(orderId, order);
    if (paymentId) orderByPaymentId.set(paymentId, order);
  }

  const entitlementServiceItems = (serviceEntitlementsError ? [] : serviceEntitlements)
    .map((entitlement) => {
      const menuSite = entitlement.menu_site_id ? siteById.get(entitlement.menu_site_id) : undefined;
      const subscription = businessSubscriptions.find((item) =>
        (entitlement.subscription_id && item.id === entitlement.subscription_id) ||
        (item.menu_site_id && item.menu_site_id === entitlement.menu_site_id)
      );

      return { key: entitlement.id ?? `entitlement-${entitlement.menu_site_id}`, entitlement, menuSite, subscription };
    })
    .filter(
      ({ entitlement }) =>
        entitlement.plan_type === "personal_trial"
        || entitlement.plan_type === "personal_trial_basic_1month"
        || entitlement.plan_type === "business_basic"
        || entitlement.plan_type === "business_display",
    );

  const entitlementMenuSiteIds = new Set(entitlementServiceItems.map((item) => item.entitlement.menu_site_id).filter(Boolean));
  const subscriptionOnlyServiceItems = businessSubscriptions
    .filter((subscription) => subscription.menu_site_id && !entitlementMenuSiteIds.has(subscription.menu_site_id))
    .map((subscription) => {
      const menuSite = subscription.menu_site_id ? siteById.get(subscription.menu_site_id) : undefined;

      return { key: subscription.id ?? `subscription-${subscription.menu_site_id}`, entitlement: null, menuSite, subscription };
    });

  const serviceItemMenuSiteIds = new Set(
    [...entitlementServiceItems, ...subscriptionOnlyServiceItems]
      .map((item) => item.menuSite?.id ?? item.entitlement?.menu_site_id ?? item.subscription?.menu_site_id)
      .filter(Boolean),
  );
  const archivedMenuOnlyServiceItems = sites
    .filter((site) => site.id && site.status === "archived" && !serviceItemMenuSiteIds.has(site.id))
    .map((menuSite) => ({ key: `archived-menu-site-${menuSite.id}`, entitlement: null, menuSite, subscription: null }));

  const serviceItems = [...entitlementServiceItems, ...subscriptionOnlyServiceItems, ...archivedMenuOnlyServiceItems].sort((a, b) => {
    const aDate = a.entitlement?.created_at ?? a.entitlement?.access_starts_at ?? a.subscription?.created_at ?? a.menuSite?.created_at ?? "";
    const bDate = b.entitlement?.created_at ?? b.entitlement?.access_starts_at ?? b.subscription?.created_at ?? b.menuSite?.created_at ?? "";

    return new Date(bDate).getTime() - new Date(aDate).getTime();
  });

  function getServiceItemMenuSiteId(item: ServiceItem) {
    return item.menuSite?.id ?? item.entitlement?.menu_site_id ?? item.subscription?.menu_site_id ?? "";
  }

  function isActiveServiceItem({ entitlement, menuSite, subscription }: ServiceItem) {
    const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
    const isMenuArchived = menuSite?.status === "archived";
    const hasActiveEntitlement = getServiceItemHasActiveEntitlement(entitlement);
    const hasActiveSubscription = getServiceItemHasActiveSubscription(subscription);

    if (isMenuArchived) {
      return false;
    }

    if (planType === "personal_trial" || planType === "personal_trial_basic_1month") {
      return hasActiveEntitlement;
    }

    if (planType === "business_basic" || planType === "business_display") {
      if (isPastCancelScheduledSubscription(subscription, entitlement?.access_expires_at ?? null)) {
        return false;
      }

      if (subscription && subscription.status !== "active") {
        return false;
      }

      if (entitlement && !hasActiveEntitlement) {
        return false;
      }

      return hasActiveSubscription || hasActiveEntitlement;
    }

    return false;
  }

  function isExpiredOrArchivedServiceItem({ entitlement, menuSite, subscription }: ServiceItem) {
    const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
    const entitlementStatus = entitlement?.status ?? null;
    const subscriptionStatus = subscription?.status ?? null;
    const hasExpiredAccessWindow = getServiceItemHasExpiredAccessWindow(entitlement, subscription);

    if (menuSite?.status === "archived") {
      return true;
    }

    if (isInactiveEntitlementStatus(entitlementStatus)) {
      return true;
    }

    if (isInactiveSubscriptionStatus(subscriptionStatus)) {
      return true;
    }

    if (isPastCancelScheduledSubscription(subscription, entitlement?.access_expires_at ?? null)) {
      return true;
    }

    if (hasExpiredAccessWindow) {
      return true;
    }

    return planType === "personal_trial" || planType === "personal_trial_basic_1month" || planType === "business_basic" || planType === "business_display";
  }

  function getArchivedServiceStatusLabel({ entitlement, menuSite, subscription }: ServiceItem) {
    const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
    const entitlementStatus = entitlement?.status ?? null;
    const subscriptionStatus = subscription?.status ?? null;

    if (entitlementStatus === "pending_delete" || entitlementStatus === "deleted") return "삭제됨";
    if (menuSite?.status === "archived" || entitlementStatus === "archived") return "보관 중";
    if ((planType === "personal_trial" || planType === "personal_trial_basic_1month") && entitlementStatus === "expired") return "체험 기간 종료";
    if (isPastCancelScheduledSubscription(subscription, entitlement?.access_expires_at ?? null)) return "해지 종료";
    if (subscriptionStatus === "canceled" || subscriptionStatus === "cancelled") return "해지 완료";
    if (subscriptionStatus === "expired" || entitlementStatus === "expired") return "구독 만료";

    return subscription ? getSubscriptionStatusLabel(subscriptionStatus) : getEntitlementStatusLabel(entitlementStatus);
  }

  const activeServiceItems = serviceItems.filter(isActiveServiceItem);
  const activeServiceMenuSiteIds = new Set(activeServiceItems.map(getServiceItemMenuSiteId).filter(Boolean));
  const holdingServiceMenuSiteIds = new Set<string>();
  const holdingServiceItems = serviceItems.filter((item) => {
    const menuSiteId = getServiceItemMenuSiteId(item);

    if (menuSiteId && activeServiceMenuSiteIds.has(menuSiteId)) {
      return false;
    }

    if (menuSiteId && holdingServiceMenuSiteIds.has(menuSiteId)) {
      return false;
    }

    const isHoldingService = !isActiveServiceItem(item) && isExpiredOrArchivedServiceItem(item) && getServiceItemHasActiveRetention(item);

    if (isHoldingService && menuSiteId) {
      holdingServiceMenuSiteIds.add(menuSiteId);
    }

    return isHoldingService;
  });
  const deletedServiceMenuSiteIds = new Set<string>();
  const deletedServiceItems = serviceItems.filter((item) => {
    const menuSiteId = getServiceItemMenuSiteId(item);

    if (menuSiteId && (activeServiceMenuSiteIds.has(menuSiteId) || holdingServiceMenuSiteIds.has(menuSiteId))) {
      return false;
    }

    if (menuSiteId && deletedServiceMenuSiteIds.has(menuSiteId)) {
      return false;
    }

    const isDeletedService = !isActiveServiceItem(item) && isExpiredOrArchivedServiceItem(item);

    if (isDeletedService && menuSiteId) {
      deletedServiceMenuSiteIds.add(menuSiteId);
    }

    return isDeletedService;
  });

  const paymentHistory = payments.map((payment) => {
    const order = payment.order_id ? orderById.get(payment.order_id) : orderByPaymentId.get(getSafeString(payment.payment_id));
    const productKey = payment.product_key || order?.product_key || null;
    const menuSite = order?.menu_site_id ? siteById.get(order.menu_site_id) : undefined;

    return { payment, order, productKey, menuSite };
  });
  const refundRequestByPaymentRowId = new Map<string, RefundRequestRecord>();
  const refundRequestByPortonePaymentId = new Map<string, RefundRequestRecord>();
  const refundRequestBySubscriptionId = new Map<string, RefundRequestRecord>();

  for (const refundRequest of refundRequests) {
    const paymentRowId = getSafeString(refundRequest.payment_id);
    const portonePaymentId = getSafeString(refundRequest.portone_payment_id);
    const businessSubscriptionId = getSafeString(refundRequest.business_subscription_id);

    if (paymentRowId && !refundRequestByPaymentRowId.has(paymentRowId)) {
      refundRequestByPaymentRowId.set(paymentRowId, refundRequest);
    }

    if (portonePaymentId && !refundRequestByPortonePaymentId.has(portonePaymentId)) {
      refundRequestByPortonePaymentId.set(portonePaymentId, refundRequest);
    }

    if (businessSubscriptionId && !refundRequestBySubscriptionId.has(businessSubscriptionId)) {
      refundRequestBySubscriptionId.set(businessSubscriptionId, refundRequest);
    }
  }
  const displayedAiCreditPurchases = aiCreditPurchases.slice(0, 8);
  const billingHistoryEntries: BillingHistoryEntry[] = paymentHistory
    .filter(({ productKey }) => !getSafeString(productKey).startsWith("ai_credit"))
    .map(({ payment, order, productKey, menuSite }) => {
      const paymentId = getSafeString(payment.payment_id ?? payment.portone_payment_id ?? order?.payment_id ?? null);
      const paymentRowId = getSafeString(payment.id);
      const matchingSubscription = businessSubscriptions.find((subscription) => {
        const subscriptionPaymentId = getSafeString(subscription.portone_payment_id);
        const subscriptionMenuSiteId = getSafeString(subscription.menu_site_id);
        const menuSiteId = getSafeString(menuSite?.id ?? order?.menu_site_id);
        const productMatches = productKey ? subscription.product_key === productKey : true;

        if (paymentId && subscriptionPaymentId && paymentId === subscriptionPaymentId) return true;
        return Boolean(menuSiteId && subscriptionMenuSiteId === menuSiteId && productMatches);
      });
      const refundRequest =
        (paymentRowId ? refundRequestByPaymentRowId.get(paymentRowId) : undefined) ??
        (paymentId ? refundRequestByPortonePaymentId.get(paymentId) : undefined) ??
        (matchingSubscription?.id ? refundRequestBySubscriptionId.get(matchingSubscription.id) : undefined) ??
        null;
      const resolvedMenuSite =
        menuSite ??
        (refundRequest?.menu_site_id ? siteById.get(refundRequest.menu_site_id) : undefined) ??
        (matchingSubscription?.menu_site_id ? siteById.get(matchingSubscription.menu_site_id) : undefined);
      const entitlement = resolvedMenuSite?.id ? entitlementByMenuSiteId.get(resolvedMenuSite.id) : undefined;
      const billingCycle = entitlement?.billing_cycle ?? matchingSubscription?.billing_cycle ?? null;
      const billingMethod = getBillingHistoryMethod(productKey, billingCycle);
      const serviceType = getBillingHistoryServiceType(productKey, resolvedMenuSite?.template_key ?? null);
      const pgLabel = matchingSubscription ? "NHN KCP 카드 정기결제" : "PortOne 일반 결제";
      const amount = payment.amount ?? order?.total_amount ?? matchingSubscription?.amount ?? null;
      const status = payment.status ?? order?.status ?? null;
      const subscriptionPeriodEnd = matchingSubscription?.current_period_end ?? matchingSubscription?.next_billing_at ?? entitlement?.access_expires_at ?? null;
      const paymentStatusFromRefund = getBillingPaymentStatusFromRefund(refundRequest);
      const paymentStatusBucket = paymentStatusFromRefund?.bucket ?? getPaymentStatusBucket(status);
      const paymentStatusLabel = paymentStatusFromRefund?.label ?? getPaymentStatusLabel(status);
      const paymentStatusTone = paymentStatusFromRefund?.tone ?? getPaymentStatusTone(status);
      const activeSubscriptionForMenu = resolvedMenuSite?.id
        ? businessSubscriptions.find((subscription) => subscription.menu_site_id === resolvedMenuSite.id && subscription.status === "active")
        : null;
      const activeEntitlementForMenu = resolvedMenuSite?.id
        ? (serviceEntitlements ?? []).find((serviceEntitlement) => serviceEntitlement.menu_site_id === resolvedMenuSite.id && serviceEntitlement.status === "active")
        : null;
      const hasActiveSubscriptionForMenu = Boolean(activeSubscriptionForMenu);
      const hasNewerActiveServiceForRefundedMenu =
        refundRequest?.status === "completed" &&
        Boolean(activeSubscriptionForMenu || activeEntitlementForMenu);
      const serviceStatus = getBillingServiceStatus({
        refundRequest,
        subscription: matchingSubscription,
        entitlement,
        menuSite: resolvedMenuSite,
        hasNewerActiveService: hasNewerActiveServiceForRefundedMenu,
      });
      const retentionEndDate = entitlement?.data_retention_until ?? entitlement?.deleted_scheduled_at ?? null;
      const restoreSubscription = getRestoreSubscriptionCta({
        serviceType,
        serviceStatusBucket: serviceStatus.bucket,
        menuSite: resolvedMenuSite,
        retentionEndDate,
        hasActiveSubscription: hasActiveSubscriptionForMenu,
      });
      const renewalLabel = serviceStatus.bucket === "restored"
        ? "복구 완료일"
        : serviceStatus.bucket === "archived" || serviceStatus.bucket === "unrecoverable"
        ? "보관 만료일"
        : billingMethod === "one_time" || billingMethod === "trial"
          ? "이용 만료일"
          : "다음 결제 예정일";
      const renewalDate = serviceStatus.bucket === "restored"
        ? activeSubscriptionForMenu?.current_period_start ?? activeEntitlementForMenu?.access_starts_at ?? null
        : serviceStatus.bucket === "archived" || serviceStatus.bucket === "unrecoverable"
        ? retentionEndDate ?? subscriptionPeriodEnd
        : billingMethod === "one_time" || billingMethod === "trial"
          ? entitlement?.access_expires_at ?? matchingSubscription?.current_period_end ?? null
          : matchingSubscription?.next_billing_at ?? matchingSubscription?.current_period_end ?? entitlement?.access_expires_at ?? null;
      const refundAmount = refundRequest?.final_refund_amount ?? refundRequest?.estimated_refund_amount ?? null;
      const supportMessage = paymentStatusFromRefund?.message ?? serviceStatus.message;

      return {
        id: getSafeString(payment.id) || paymentId || `${productKey ?? "payment"}-${payment.created_at ?? "unknown"}`,
        productName: productKey ? getProductLabel(productKey) : getServiceName(entitlement?.plan_type ?? matchingSubscription?.plan_type ?? null, billingCycle),
        productKey: getSafeString(productKey),
        serviceType,
        serviceTypeLabel: getBillingHistoryServiceTypeLabel(serviceType),
        billingMethod,
        billingMethodLabel: getBillingHistoryMethodLabel(billingMethod),
        paymentMethod: pgLabel,
        paymentMethodLabel: pgLabel,
        statusBucket: paymentStatusBucket,
        statusLabel: paymentStatusLabel,
        statusTone: paymentStatusTone,
        serviceStatusBucket: serviceStatus.bucket,
        serviceStatusLabel: serviceStatus.label,
        serviceStatusTone: serviceStatus.tone,
        paymentStatusBucket,
        paymentStatusLabel,
        paymentStatusTone,
        paidAt: payment.created_at ?? order?.created_at ?? matchingSubscription?.last_paid_at ?? null,
        paidAtLabel: formatDateTime(payment.created_at ?? order?.created_at ?? matchingSubscription?.last_paid_at ?? null),
        amountLabel: typeof amount === "number" ? formatKrw(amount) : "-",
        originalAmountLabel: typeof amount === "number" ? formatKrw(amount) : "-",
        refundAmountLabel: typeof refundAmount === "number" ? formatKrw(refundAmount) : null,
        pgLabel,
        paymentIdLabel: paymentId || "결제번호 확인 필요",
        receiptUrl: getPaymentReceiptUrl(payment, order),
        menuName: resolvedMenuSite?.name ?? null,
        menuSlug: resolvedMenuSite?.slug ?? null,
        menuPath: formatPublicMenuPath(resolvedMenuSite?.slug),
        renewalLabel,
        renewalDateLabel: formatDate(renewalDate),
        supportMessage,
        restoreSubscription,
        subscriptionManagement: matchingSubscription?.id && (billingMethod === "monthly" || billingMethod === "yearly")
          ? {
              subscriptionId: matchingSubscription.id,
              productName: getServiceName(matchingSubscription.plan_type, matchingSubscription.billing_cycle),
              menuName: resolvedMenuSite?.name ?? "연결된 메뉴판 확인 필요",
              menuStatus: resolvedMenuSite?.status ? getStatusLabel(resolvedMenuSite.status) : "상태 확인 필요",
              amountLabel: typeof matchingSubscription.amount === "number" ? formatKrw(matchingSubscription.amount) : "-",
              billingCycleLabel: getBillingCycleLabel(matchingSubscription.billing_cycle),
              nextBillingLabel: formatDate(matchingSubscription.next_billing_at ?? null),
              periodEndLabel: formatDate(subscriptionPeriodEnd),
              status: matchingSubscription.status ?? "",
              statusLabel: getSubscriptionStatusLabel(matchingSubscription.status),
              cancelAtPeriodEnd: Boolean(matchingSubscription.cancel_at_period_end),
              cancelRequestedLabel: formatDateTime(matchingSubscription.cancel_requested_at ?? null),
              pgLabel: "NHN KCP 카드 정기결제",
              serviceEntitlementLabel: getEntitlementStatusLabel(entitlement?.status),
              canManage: Boolean(typeof matchingSubscription.cancel_at_period_end === "boolean"),
              defaultOpen: shouldAutoOpenSubscriptionModal && requestedSubscriptionId === matchingSubscription.id,
              billingMethod: billingMethod === "yearly" ? "yearly" : billingMethod === "monthly" ? "monthly" : "unknown",
              refundConfirmEnabled: yearlyRefundConfirmEnabled,
              restoredNotice: serviceStatus.bucket === "restored"
                ? {
                    title: "재구독 완료",
                    message: "기존 메뉴판이 새 구독으로 복구되었습니다.",
                  }
                : null,
            }
          : null,
      };
    });
  function getLatestPaymentForService({
    menuSiteId,
    productKey,
  }: {
    menuSiteId?: string | null;
    productKey?: string | null;
  }) {
    return paymentHistory.find(({ productKey: paymentProductKey, menuSite }) => {
      const productMatches = productKey ? paymentProductKey === productKey : true;
      const menuMatches = menuSiteId ? menuSite?.id === menuSiteId : true;
      return productMatches && menuMatches;
    });
  }

  function buildMenuCardViewModel(site: MenuSite) {
    const siteId = getSafeString(site.id);
    const slug = getSafeString(site.slug);
    const publicPath = formatPublicMenuPath(slug);
    const qrDownloadUrl = slug ? `/api/qr?slug=${encodeURIComponent(slug)}` : null;
    const settings = getMenuSiteSettings(site.settings);
    const entitlement = siteId ? entitlementByMenuSiteId.get(siteId) : undefined;
    const trialDisplayInfo = getTrialDisplayInfo(settings, entitlement);
    const planType = trialDisplayInfo?.planType ?? "";
    const billingType = trialDisplayInfo?.billingType ?? "";
    const billingCycle = trialDisplayInfo?.billingCycle ?? "";
    const entitlementStatus = trialDisplayInfo?.status ?? "";
    const isPersonalTrial = planType === "personal_trial" || planType === "personal_trial_basic_1month";
    const isBusinessService = planType === "business_basic" || planType === "business_display";
    const isOneTimeBusinessService = isBusinessService && billingType === "one_time" && billingCycle !== "yearly";
    const activeBusinessSubscription = siteId
      ? businessSubscriptions.find((subscription) =>
          subscription.status === "active" &&
          (subscription.menu_site_id === siteId || Boolean(entitlement?.subscription_id && subscription.id === entitlement.subscription_id))
        )
      : undefined;
    const anyBusinessSubscription = siteId
      ? businessSubscriptions.find((subscription) =>
          subscription.menu_site_id === siteId || Boolean(entitlement?.subscription_id && subscription.id === entitlement.subscription_id)
        )
      : undefined;
    const cancelAtPeriodEnd = Boolean(activeBusinessSubscription?.cancel_at_period_end);
    const isPublished = site.status === "published";
    const isMenuArchived = site.status === "archived";
    const accessExpiresAt = trialDisplayInfo?.accessExpiresAt ?? "";
    const dataRetentionUntil = trialDisplayInfo?.dataRetentionUntil ?? "";
    const daysUntilExpiry = accessExpiresAt ? getRemainingDaysUntilKst(accessExpiresAt) : null;
    const subscriptionAccessExpiresAt = activeBusinessSubscription?.current_period_end ?? activeBusinessSubscription?.next_billing_at ?? "";
    const daysUntilSubscriptionExpiry = subscriptionAccessExpiresAt ? getRemainingDaysUntilKst(subscriptionAccessExpiresAt) : null;
    const retentionEndDate = dataRetentionUntil || trialDisplayInfo?.deletedScheduledAt || "";
    const retentionDdayInfo = getRetentionDdayInfo(retentionEndDate);
    const daysUntilRetentionEnds = retentionEndDate ? getRemainingDaysUntilKst(retentionEndDate) : null;
    const isRetentionActive = typeof daysUntilRetentionEnds === "number" && daysUntilRetentionEnds >= 0;
    const isRetentionDue = typeof daysUntilRetentionEnds === "number" && daysUntilRetentionEnds < 0;
    const isRecoveryWindowOpen = isRetentionActive;
    const isTrialPendingDelete = (entitlementStatus === "pending_delete" && !isRecoveryWindowOpen) || isRetentionDue;
    const isAccessExpired = typeof daysUntilExpiry === "number" && daysUntilExpiry < 0;
    const isSubscriptionExpired = typeof daysUntilSubscriptionExpiry === "number" && daysUntilSubscriptionExpiry < 0;
    const isTrialExpired = isTrialPendingDelete || entitlementStatus === "expired" || isAccessExpired;
    const hasActiveEntitlement = entitlementStatus === "active";
    const hasInactiveEntitlement = ["expired", "archived", "pending_delete"].includes(entitlementStatus);
    const subscriptionStatus = anyBusinessSubscription?.status ?? null;
    const hasPaymentIssue = subscriptionStatus === "failed" || subscriptionStatus === "payment_failed" || subscriptionStatus === "past_due";
    const hasValidBusinessWindow =
      !isBusinessService ||
      (!hasPaymentIssue &&
        (isOneTimeBusinessService
          ? hasActiveEntitlement && (accessExpiresAt ? !isAccessExpired : true)
          : activeBusinessSubscription?.status === "active" &&
            (accessExpiresAt ? !isAccessExpired : Boolean(subscriptionAccessExpiresAt) && !isSubscriptionExpired)));
    const isAccessRestricted = isMenuArchived || !hasActiveEntitlement || hasInactiveEntitlement || isTrialExpired || !hasValidBusinessWindow;
    const canOpenPublicPage = isPublished && Boolean(slug) && !isAccessRestricted && !hasPaymentIssue;
    const canOwnerPreview = Boolean(siteId) && (!isAccessRestricted || isRecoveryWindowOpen);
    const canUseMenuActions = Boolean(siteId) && !isAccessRestricted && !hasPaymentIssue && !isTrialPendingDelete;
    const isCancelScheduledActive = isActiveCancelScheduledSubscription(activeBusinessSubscription);
    const isCancelScheduledEnded = isPastCancelScheduledSubscription(activeBusinessSubscription ?? anyBusinessSubscription, accessExpiresAt);
    const isRecoveryUnavailable = isAccessRestricted && !isRecoveryWindowOpen;
    const isAdminArchived = (isMenuArchived || entitlementStatus === "archived") && !hasPaymentIssue && !isCancelScheduledEnded && !(isPersonalTrial && isTrialExpired);
    const archivedDisplayState = getArchivedDisplayState({
      isRetentionDue: isTrialPendingDelete || isRetentionDue || isRecoveryUnavailable,
      hasPaymentIssue,
      isCancelScheduledEnded,
      isTrialEnded: isPersonalTrial && isTrialExpired,
      isAdminArchived,
      isAccessRestricted,
      siteId,
      ddayInfo: retentionDdayInfo,
    });
    const isRetentionEnded = isTrialPendingDelete || (dataRetentionUntil ? daysUntilRetentionEnds !== null && daysUntilRetentionEnds < 0 : false);
    const serviceBadge = getMenuServiceBadge({
      productKey: entitlement?.product_key ?? activeBusinessSubscription?.product_key ?? anyBusinessSubscription?.product_key ?? null,
      planType: planType || activeBusinessSubscription?.plan_type || anyBusinessSubscription?.plan_type || null,
      templateKey: site.template_key,
    });
    const visibilityBadge = isAccessRestricted ? null : getMenuVisibilityBadge(site.status);
    const serviceTypeBadge: MenuCardBadge = {
      key: serviceBadge.label === "메뉴링크 디스플레이" ? "service:display" : "service:basic",
      label: serviceBadge.label,
      className: serviceBadge.className,
    };
    const section: MenuTab = isAccessRestricted || hasPaymentIssue || isTrialExpired || hasInactiveEntitlement
      ? isRecoveryWindowOpen ? "holding" : "deleted"
      : "active";
    const unavailableActionReason = isTrialPendingDelete
      ? "복구 가능 기간이 종료되어 사용할 수 없습니다."
      : section === "deleted"
        ? "삭제된 메뉴판은 사용할 수 없습니다."
        : isAccessRestricted || hasPaymentIssue
        ? "보관 중에는 사용할 수 없습니다. 보관 기간 안에 재구독하면 다시 사용할 수 있습니다."
        : "현재 상태에서는 사용할 수 없습니다.";
    const unpublishedActionReason = "아직 공개 전입니다. 공개 후 사용할 수 있습니다.";
    const noMenuSiteReason = "메뉴판 정보를 확인할 수 없어 사용할 수 없습니다.";
    let accessBadge: MenuCardBadge | null = null;

    if (isCancelScheduledActive) {
      accessBadge = { key: "subscription:cancel-scheduled", label: "해지 예약", className: "bg-amber-50 text-amber-700" };
    } else if (archivedDisplayState) {
      accessBadge = {
        key: `access:${archivedDisplayState.key}`,
        label: archivedDisplayState.label,
        className: archivedDisplayState.className,
      };
    } else if (isBusinessService && hasActiveEntitlement && !isAccessRestricted) {
      accessBadge = { key: "plan:business", label: "사업자 플랜", className: "bg-emerald-50 text-emerald-700" };
    } else if (isPersonalTrial && !isTrialExpired) {
      accessBadge = { key: "plan:trial-active", label: "체험 중", className: "bg-emerald-50 text-emerald-700" };
    }

    const badges = getUniqueMenuCardBadges([
      ...(visibilityBadge ? [visibilityBadge] : []),
      serviceTypeBadge,
      ...(accessBadge ? [accessBadge] : []),
    ]);
    const periodEnd = activeBusinessSubscription?.current_period_end ?? activeBusinessSubscription?.next_billing_at ?? entitlement?.access_expires_at ?? null;
    const activeBusinessProfile = activeBusinessSubscription?.business_profile_id
      ? businessProfileById.get(activeBusinessSubscription.business_profile_id) ?? businessProfile
      : businessProfile;
    const metaItems: Array<{ label: string; value: string }> = [];
    let primaryMessage = "";

    if (archivedDisplayState && !isCancelScheduledActive) {
      primaryMessage = archivedDisplayState.message;
      if (archivedDisplayState.key !== "deleted" && archivedDisplayState.ddayInfo && archivedDisplayState.ddayInfo.days >= 0) {
        metaItems.push({ label: "보관 만료", value: archivedDisplayState.ddayInfo.label });
      }
      if (retentionEndDate) {
        metaItems.push({ label: "보관 종료일", value: formatDate(retentionEndDate) });
      } else if (periodEnd) {
        metaItems.push({ label: "이용 종료일", value: formatDate(periodEnd) });
      }
    } else if (isOneTimeBusinessService && hasActiveEntitlement && !isAccessRestricted) {
      primaryMessage = site.status === "published"
        ? "현재 손님에게 공개 중입니다."
        : site.status === "draft"
          ? "아직 공개 전입니다. 편집 후 공개할 수 있습니다."
          : `${serviceBadge.label} 일회성 결제로 이용 중입니다.`;
      if (accessExpiresAt) {
        metaItems.push({ label: "이용 만료일", value: formatDate(accessExpiresAt) });
      } else {
        metaItems.push({ label: "생성일", value: formatDate(site.created_at) });
      }
      metaItems.push({ label: "결제방식", value: "체험 결제" });
      metaItems.push({ label: "인증 사업자", value: businessProfile?.business_name ?? "인증 사업자 정보 확인 중" });
    } else if (activeBusinessSubscription) {
      primaryMessage = isCancelScheduledActive
        ? "해지 예약된 메뉴판입니다. 이용 종료일까지 편집과 공개가 가능합니다."
        : site.status === "published"
          ? "현재 손님에게 공개 중입니다."
          : site.status === "draft"
            ? "아직 공개 전입니다. 편집 후 공개할 수 있습니다."
            : `${serviceBadge.label}으로 이용 중입니다.`;
      if (cancelAtPeriodEnd && periodEnd) {
        metaItems.push({ label: "이용 종료 예정일", value: formatDate(periodEnd) });
      } else if (activeBusinessSubscription.next_billing_at) {
        metaItems.push({ label: "다음 결제 예정일", value: formatDate(activeBusinessSubscription.next_billing_at) });
      } else if (periodEnd) {
        metaItems.push({ label: "이용 기간 종료일", value: formatDate(periodEnd) });
      } else {
        metaItems.push({ label: "생성일", value: formatDate(site.created_at) });
      }
      metaItems.push({ label: "결제수단", value: "NHN KCP 카드 정기결제" });
      metaItems.push({ label: "인증 사업자", value: activeBusinessProfile?.business_name ?? "인증 사업자 정보 확인 중" });
    } else if (isPersonalTrial && !isTrialExpired) {
      primaryMessage = "무료 체험으로 이용 중입니다.";
      metaItems.push({ label: "체험 종료일", value: formatDate(accessExpiresAt || null) });
      metaItems.push({ label: "남은 기간", value: daysUntilExpiry === 0 ? "오늘 만료" : typeof daysUntilExpiry === "number" ? `${Math.max(0, daysUntilExpiry)}일` : "확인 중" });
    } else if (isTrialExpired) {
      primaryMessage = isRetentionEnded
        ? "보관 기간이 종료되어 복구할 수 없습니다."
        : trialDisplayInfo?.source === "service_entitlements" && dataRetentionUntil && isRetentionActive
          ? "이용 기간이 종료되어 보관 중입니다. 보관 기간 안에 다시 구독하면 기존 메뉴판을 이어서 사용할 수 있습니다."
          : isPersonalTrial
            ? "무료 체험 기간이 종료되어 편집과 공개가 제한됩니다."
            : "이용 기간이 종료되어 공개와 편집이 제한되었습니다.";
      if (trialDisplayInfo?.source === "service_entitlements" && dataRetentionUntil) {
        metaItems.push({ label: "보관 종료일", value: formatDate(dataRetentionUntil) });
      } else if (accessExpiresAt) {
        metaItems.push({ label: "이용 종료일", value: formatDate(accessExpiresAt) });
      } else {
        metaItems.push({ label: "생성일", value: formatDate(site.created_at) });
      }
    } else {
      primaryMessage = hasPaymentIssue
        ? "자동 결제가 완료되지 않았습니다. 결제 확인 후 다시 이용할 수 있습니다."
        : isAccessRestricted
          ? isCancelScheduledEnded
            ? "해지 예약에 따라 이용이 종료되었습니다. 보관 기간 안에 재구독하면 기존 링크와 QR을 다시 사용할 수 있습니다."
            : "보관 기간 동안 미리보기만 가능하며, 재구독하면 기존 메뉴판을 복구할 수 있습니다."
          : site.status === "published"
            ? "현재 손님에게 공개 중입니다."
            : site.status === "private" || site.status === "unpublished"
              ? "현재 공개되지 않은 메뉴판입니다. 편집 후 다시 공개할 수 있습니다."
              : "아직 공개 전입니다. 편집 후 공개할 수 있습니다.";
      if (trialDisplayInfo?.source === "service_entitlements" && dataRetentionUntil && isAccessRestricted) {
        metaItems.push({ label: "보관 종료일", value: formatDate(dataRetentionUntil) });
      } else if (accessExpiresAt) {
        metaItems.push({ label: "이용 기간 종료일", value: formatDate(accessExpiresAt) });
      } else if (entitlement?.expired_at) {
        metaItems.push({ label: "이용 종료일", value: formatDate(entitlement.expired_at) });
      } else {
        metaItems.push({ label: "생성일", value: formatDate(site.created_at) });
      }
    }

    return {
      key: siteId || `${slug || "menu-site"}-${site.created_at ?? "unknown"}`,
      section,
      siteId,
      title: getSafeString(site.name) || "이름 없는 메뉴판",
      slug,
      publicPath,
      qrDownloadUrl,
      templateLabel: site.template_key ? getTemplateDisplayName(site.template_key) : "-",
      serviceBadge,
      badges,
      primaryMessage,
      metaItems: metaItems.slice(0, 3),
      isAccessRestricted,
      isTrialPendingDelete,
      isPersonalTrial,
      actions: {
        canEdit: canUseMenuActions,
        canOwnerPreview,
        canViewPublic: canOpenPublicPage,
        canDownloadQr: canOpenPublicPage && Boolean(qrDownloadUrl),
        editDisabledReason: canUseMenuActions ? null : siteId ? unavailableActionReason : noMenuSiteReason,
        previewDisabledReason: canOwnerPreview ? null : siteId ? unavailableActionReason : noMenuSiteReason,
        publicDisabledReason: canOpenPublicPage
          ? null
          : !slug
            ? "공개 주소가 없어 사용할 수 없습니다."
            : !isPublished && !isAccessRestricted && !hasPaymentIssue
              ? unpublishedActionReason
              : unavailableActionReason,
        qrDisabledReason: canOpenPublicPage && qrDownloadUrl
          ? null
          : !slug
            ? "공개 주소가 없어 QR을 다운로드할 수 없습니다."
            : !isPublished && !isAccessRestricted && !hasPaymentIssue
              ? unpublishedActionReason
              : unavailableActionReason,
      },
      subscription: activeBusinessSubscription,
      entitlement,
      billingCycle,
      periodEnd,
    };
  }

  const menuCardViewModels = sites.map(buildMenuCardViewModel);
  const staffMenuCardViewModels = staffMenuSites.map((site) => {
    const publicPath = formatPublicMenuPath(site.slug);
    return {
      key: `staff-${site.menuSiteId}`,
      siteId: site.menuSiteId,
      title: site.name || "이름 없는 메뉴판",
      publicPath,
      templateLabel: site.templateKey ? getTemplateDisplayName(site.templateKey) : "-",
      roleLabel: MENU_SITE_MEMBER_ROLE_LABELS[site.memberRole],
      statusLabel: getStatusLabel(site.status),
      updatedAt: site.updatedAt,
      canEdit: site.memberRole === "manager" || site.memberRole === "editor",
      canViewPublic: site.status === "published" && Boolean(site.slug),
    };
  });
  const activeMenuCards = menuCardViewModels.filter((card) => card.section === "active");
  const holdingMenuCards = menuCardViewModels.filter((card) => card.section === "holding");
  const deletedMenuCards = menuCardViewModels.filter((card) => card.section === "deleted");
  const visibleMenuCards = activeMenuTab === "active"
    ? activeMenuCards
    : activeMenuTab === "holding"
      ? holdingMenuCards
      : deletedMenuCards;
  const activeMenuCardCount = activeMenuCards.length + staffMenuCardViewModels.length;
  const visibleMenuCardCount = visibleMenuCards.length + (activeMenuTab === "active" ? staffMenuCardViewModels.length : 0);
  const totalMenuCardCount = sites.length + staffMenuCardViewModels.length;
  const hasAnyMenuCards = totalMenuCardCount > 0;
  const canShowOwnerCommerce = !isStaffOnlyAccount;
  function renderCreateMenuButton(extraClassName = "") {
    const className = `${extraClassName} inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800`.trim();

    return (
      <Link href="/apply/basic" className={className}>
        메뉴판 추가 구매
      </Link>
    );
  }

  function renderMenuCard(card: (typeof menuCardViewModels)[number]) {
    const primaryActionClassName = "inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-zinc-800";
    const secondaryActionClassName = "inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100";
    const disabledActionClassName = "inline-flex cursor-not-allowed items-center justify-center rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-xs font-black text-zinc-400 opacity-70";

    function renderActionButton({
      label,
      href,
      enabled,
      disabledReason,
      primary = false,
      newWindow = false,
    }: {
      label: string;
      href: string | null;
      enabled: boolean;
      disabledReason: string | null;
      primary?: boolean;
      newWindow?: boolean;
    }) {
      if (enabled && href) {
        return (
          <Link
            href={href}
            target={newWindow ? "_blank" : undefined}
            rel={newWindow ? "noopener noreferrer" : undefined}
            className={primary ? primaryActionClassName : secondaryActionClassName}
          >
            {label}
          </Link>
        );
      }

      const reason = disabledReason ?? "현재 상태에서는 사용할 수 없습니다.";
      return (
        <button
          type="button"
          disabled
          title={reason}
          aria-label={`${label} 비활성화: ${reason}`}
          className={disabledActionClassName}
        >
          {label}
        </button>
      );
    }

    return (
      <article key={card.key} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight">{card.title}</h3>
            <p className="mt-1 break-all text-sm font-bold text-zinc-500">{card.publicPath}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {card.badges.map((badge) => (
              <span key={badge.key} className={`rounded-full px-3 py-1 text-xs font-black ${badge.className}`}>
                {badge.label}
              </span>
            ))}
          </div>
        </div>

        <p className="mt-4 break-keep text-sm font-bold leading-relaxed text-zinc-700">{card.primaryMessage}</p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs font-black text-zinc-400">템플릿</dt>
            <dd className="mt-1 font-bold text-zinc-900">{card.templateLabel}</dd>
          </div>
          {card.metaItems.map((item) => (
            <div key={item.label}>
              <dt className="text-xs font-black text-zinc-400">{item.label}</dt>
              <dd className="mt-1 break-keep font-bold text-zinc-900">{item.value}</dd>
            </div>
          ))}
        </dl>

        {card.section === "deleted" ? (
          <p className="mt-5 rounded-2xl bg-zinc-50 px-4 py-3 text-xs font-bold leading-relaxed text-zinc-500">
            복구 가능 기간이 종료되어 메뉴판 작업 버튼은 제공되지 않습니다.
          </p>
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {renderActionButton({
              label: "편집하기",
              href: card.siteId ? `/mypage/menus/${card.siteId}/edit` : null,
              enabled: card.actions.canEdit,
              disabledReason: card.actions.editDisabledReason,
              primary: true,
            })}
            {renderActionButton({
              label: "미리보기",
              href: card.siteId ? `/mypage/menus/${card.siteId}/preview` : null,
              enabled: card.actions.canOwnerPreview,
              disabledReason: card.actions.previewDisabledReason,
              newWindow: true,
            })}
            {renderActionButton({
              label: "공개 메뉴판 보기",
              href: card.publicPath,
              enabled: card.actions.canViewPublic,
              disabledReason: card.actions.publicDisabledReason,
              newWindow: true,
            })}
            {renderActionButton({
              label: "QR 다운로드",
              href: card.qrDownloadUrl,
              enabled: card.actions.canDownloadQr,
              disabledReason: card.actions.qrDisabledReason,
            })}
          </div>
        )}
      </article>
    );
  }

  function renderStaffMenuCard(card: (typeof staffMenuCardViewModels)[number]) {
    return (
      <article key={card.key} className="rounded-2xl border border-sky-100 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight">{card.title}</h3>
            <p className="mt-1 break-all text-sm font-bold text-zinc-500">{card.publicPath}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700">직원 참여</span>
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-700">{card.roleLabel}</span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">{card.statusLabel}</span>
          </div>
        </div>

        <p className="mt-4 break-keep text-sm font-bold leading-relaxed text-zinc-700">
          직원 권한으로 참여한 메뉴판입니다. 사장 전용 결제·구독·보관·삭제 기능은 표시되지 않습니다.
        </p>

        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs font-black text-zinc-400">템플릿</dt>
            <dd className="mt-1 font-bold text-zinc-900">{card.templateLabel}</dd>
          </div>
          <div>
            <dt className="text-xs font-black text-zinc-400">최근 업데이트</dt>
            <dd className="mt-1 font-bold text-zinc-900">{formatDate(card.updatedAt)}</dd>
          </div>
        </dl>

        <div className="mt-5 flex flex-wrap gap-2">
          {card.canEdit ? (
            <Link
              href={`/mypage/menus/${card.siteId}/edit`}
              className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-zinc-800"
            >
              메뉴 편집
            </Link>
          ) : null}
          <Link
            href={`/mypage/menus/${card.siteId}/preview`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-full border border-sky-200 bg-sky-50 px-4 py-2.5 text-xs font-black text-sky-800 transition-colors hover:bg-sky-100"
          >
            미리보기
          </Link>
          {card.canViewPublic ? (
            <Link
              href={card.publicPath}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100"
            >
              공개 메뉴판 보기
            </Link>
          ) : null}
        </div>
        {!card.canViewPublic ? (
          <p className="mt-5 rounded-2xl bg-zinc-50 px-4 py-3 text-xs font-bold leading-relaxed text-zinc-500">
            현재 공개되지 않은 메뉴판입니다. 직원 미리보기에서는 공개 전 화면을 확인할 수 있습니다.
          </p>
        ) : null}
      </article>
    );
  }

  const identityProviders = getIdentityProviders(user.identities);
  const primaryProvider = getPrimaryProvider(user.app_metadata, identityProviders);
  const displayName = getMetadataString(user.user_metadata, ["display_name", "full_name", "name", "nickname"]);
  const connectedAccounts = identityProviders.length > 0 ? identityProviders : [primaryProvider];
  const contactName = contactProfile?.contact_name?.trim() || displayName || businessProfile?.representative_name || "";
  const contactPhone = contactProfile?.contact_phone?.trim() || "";
  const notificationEmail = contactProfile?.notification_email?.trim() || user.email || "";
  const marketingAccepted = user.user_metadata?.marketing_accepted === true;
  const marketingConsentedAt = getMetadataString(user.user_metadata, ["marketing_consented_at"]);
  const marketingWithdrawnAt = getMetadataString(user.user_metadata, ["marketing_withdrawn_at"]);
  const hasActiveBusinessSubscriptionForDeletion = businessSubscriptions.some((subscription) =>
    subscription.status === "active" || subscription.status === "past_due"
  );

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-5 py-10 text-zinc-950">
        <div className="mx-auto w-full max-w-7xl">
          <header className="mb-6 flex flex-col justify-between gap-6 border-b border-zinc-200 pb-8 md:flex-row md:items-end">
            <div>
              <h1 className="text-4xl font-bold tracking-tight md:text-5xl">마이페이지</h1>
              <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">
                {isStaffOnlyAccount
                  ? "직원으로 참여한 메뉴판과 고객지원 정보를 한곳에서 확인합니다."
                  : "메뉴판 운영 현황과 고객지원, 결제 관련 정보를 한곳에서 확인합니다."}
              </p>
            </div>
          </header>

        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-28">
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="break-all text-lg font-black tracking-tight">{user.email}</h2>
              <p className="mt-3 break-all text-xs font-semibold leading-relaxed text-zinc-500">사용자 ID: {user.id}</p>
              {canShowOwnerCommerce ? (
              <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">AI 도우미 크레딧</p>
                    <p className="mt-2 text-lg font-black tracking-tight text-zinc-950">
                      잔여 {accountAiCreditRemaining.toLocaleString("ko-KR")} 크레딧
                    </p>
                  </div>
                </div>
                <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-emerald-800/80">
                  설명 작성, 메뉴 정리, 번역에 사용할 수 있어요.
                </p>
                <Link
                  href="/mypage?tab=payments&billingTab=ai-credits"
                  className="mt-3 inline-flex text-xs font-black text-emerald-800 underline decoration-emerald-300 underline-offset-4 transition-colors hover:text-emerald-950"
                >
                  AI 충전내역 보기
                </Link>
              </div>
              ) : null}
              <form action={signOutAction} className="mt-5">
                <button
                  type="submit"
                  className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                >
                  로그아웃
                </button>
              </form>
            </section>

            <nav className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm" aria-label="마이페이지 메뉴">
              <Link href="/mypage?tab=menus" className={getTabLinkClassName(activeTab === "menus")}>
                <span>내 메뉴판</span>
                <span className={`text-xs ${activeTab === "menus" ? "text-white/60" : "text-zinc-400"}`}>{totalMenuCardCount.toLocaleString("ko-KR")}</span>
              </Link>
              <div className="mt-2 space-y-1">
                {canShowOwnerCommerce ? (
                <Link href="/mypage?tab=payments" className={getTabLinkClassName(activeTab === "payments")}>
                  <span>구독/결제 내역</span>
                </Link>
                ) : null}
                {sites.length > 0 ? (
                <Link href="/mypage/staff" className={getTabLinkClassName(false)}>
                  <span>직원 관리</span>
                </Link>
                ) : null}
                <Link href="/mypage?tab=inquiries" className={getTabLinkClassName(activeTab === "inquiries")}>
                  <span>문의 내역</span>
                </Link>
                <Link href="/mypage?tab=notifications" className={getTabLinkClassName(activeTab === "notifications")}>
                  <span>알림 내역</span>
                  {unreadNotificationCount > 0 ? (
                    <span className={`text-xs ${activeTab === "notifications" ? "text-white/60" : "text-zinc-400"}`}>
                      {formatNotificationBadgeCount(unreadNotificationCount)}
                    </span>
                  ) : null}
                </Link>
                <Link href="/mypage?tab=account" className={getTabLinkClassName(activeTab === "account")}>
                  <span>계정 정보</span>
                </Link>
              </div>
            </nav>
          </aside>

          <div className="min-w-0 space-y-10">
            {activeTab === "menus" ? (
            <section id="my-menus" className="scroll-mt-28">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="text-3xl font-bold tracking-tight">메뉴판 관리</h2>
                  <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                    생성한 메뉴판을 편집하고 공개 상태를 확인할 수 있습니다.
                  </p>
                </div>

                {canShowOwnerCommerce ? renderCreateMenuButton() : null}
              </div>

              <nav className="mb-5 flex gap-2 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200" aria-label="내 메뉴판 탭">
                <Link href="/mypage?tab=menus&menuTab=active" className={getBillingTabClassName(activeMenuTab === "active")}>
                  이용 중
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{activeMenuCardCount.toLocaleString("ko-KR")}</span>
                </Link>
                <Link href="/mypage?tab=menus&menuTab=holding" className={getBillingTabClassName(activeMenuTab === "holding")}>
                  보관 중
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{holdingMenuCards.length.toLocaleString("ko-KR")}</span>
                </Link>
                <Link href="/mypage?tab=menus&menuTab=deleted" className={getBillingTabClassName(activeMenuTab === "deleted")}>
                  삭제됨
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{deletedMenuCards.length.toLocaleString("ko-KR")}</span>
                </Link>
              </nav>

          {menuSitesError && (
            <div className="mb-5 rounded-3xl border border-red-100 bg-red-50 p-6 text-sm font-medium text-red-700">
              메뉴판 목록을 불러오지 못했습니다: {menuSitesError.message}
            </div>
          )}

          {serviceEntitlementsError && (
            <div className="mb-5 rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm font-medium text-amber-800">
              이용 상태 정보를 불러오지 못해 일부 메뉴판은 기존 저장값 기준으로 표시됩니다: {serviceEntitlementsError.message}
            </div>
          )}

          {staffMenuSitesError && (
            <div className="mb-5 rounded-3xl border border-amber-100 bg-amber-50 p-6 text-sm font-medium text-amber-800">
              {staffMenuSitesError.message}
            </div>
          )}

          {hasAnyMenuCards ? (
            <section className="space-y-3">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-xl font-black tracking-tight">
                    {activeMenuTab === "active" ? "이용 중인 메뉴판" : activeMenuTab === "holding" ? "보관 중인 메뉴판" : "삭제된 메뉴판"}
                  </h3>
                  <p className="mt-1 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                    {activeMenuTab === "active"
                      ? "현재 편집과 운영이 가능한 메뉴판입니다."
                      : activeMenuTab === "holding"
                        ? "이용이 종료되었지만 보관 기간 안에 있어 미리보기와 재구독 복구 흐름을 사용할 수 있습니다."
                        : "보관 기간이 끝났거나 복구 가능한 보관 기준을 확인할 수 없는 메뉴판입니다."}
                  </p>
                </div>
                <span className="text-xs font-black text-zinc-400">
                  {visibleMenuCardCount.toLocaleString("ko-KR")}개 · 전체 {totalMenuCardCount.toLocaleString("ko-KR")}개
                </span>
              </div>

              {visibleMenuCardCount > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleMenuCards.map(renderMenuCard)}
                  {activeMenuTab === "active" ? staffMenuCardViewModels.map(renderStaffMenuCard) : null}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
                  <h3 className="text-2xl font-bold">
                    {activeMenuTab === "active" ? "현재 이용 중인 메뉴판이 없습니다" : activeMenuTab === "holding" ? "보관 중인 메뉴판이 없습니다" : "삭제된 메뉴판이 없습니다"}
                  </h3>
                  <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">
                    {activeMenuTab === "active"
                      ? "새 메뉴판을 추가 구매하거나 기존 메뉴판을 복구해 이용할 수 있습니다."
                      : activeMenuTab === "holding"
                        ? "복구 가능한 보관 기간 안의 메뉴판이 생기면 이곳에 표시됩니다."
                        : "복구 가능 기간이 지난 메뉴판이 생기면 이곳에 표시됩니다."}
                  </p>
                </div>
              )}
            </section>
          ) : (
            <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
              <h3 className="text-2xl font-bold">아직 만든 메뉴판이 없습니다</h3>
              <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">
                상품을 선택하고 신청을 완료하면 이곳에서 메뉴판을 편집하고 관리할 수 있습니다.
              </p>
              {canShowOwnerCommerce ? renderCreateMenuButton("mt-7") : null}
            </div>
          )}
            </section>
            ) : null}

            {activeTab === "payments" ? (
              <section id="payment-history" className="scroll-mt-28">
                <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                  <div>
                    <h2 className="text-3xl font-bold tracking-tight">구독/결제 내역</h2>
                    <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                      결제 기록과 AI 크레딧 충전 내역을 확인할 수 있습니다. 구독 해지, 환불 요청, 재구독 복구는 구독/결제 내역에서 관리하고, 메뉴판 운영은 내 메뉴판 탭에서 확인해주세요.
                    </p>
                  </div>
                </div>

                <nav className="mb-5 flex gap-2 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200" aria-label="구독/결제 내역 탭">
                  <Link href="/mypage?tab=payments&billingTab=history" className={getBillingTabClassName(activeBillingTab === "history")}>
                    결제내역
                  </Link>
                  <Link href="/mypage?tab=payments&billingTab=ai-credits" className={getBillingTabClassName(activeBillingTab === "ai-credits")}>
                    AI 충전내역
                  </Link>
                </nav>

                {paymentsErrors.length > 0 ? (
                  <div className="mb-5 rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold leading-relaxed text-amber-800">
                    {Array.from(new Set(paymentsErrors)).map((paymentsError) => (
                      <p key={paymentsError}>{paymentsError}</p>
                    ))}
                  </div>
                ) : null}

                {activeBillingTab === "history" ? (
                  <BillingHistoryPanel
                    entries={billingHistoryEntries}
                    restoreCheckoutEnabled={restoreSubscriptionQaEnabled}
                    restoreCheckoutConfig={{
                      userId: user.id,
                      userEmail: user.email,
                      storeId: portOneConfig.storeId,
                      billingChannelKey: portOneConfig.billingChannelKey,
                    }}
                  />
                ) : null}

                {activeBillingTab === "active" ? (
                  <>
                <section className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">이용 중인 서비스</h3>
                    </div>
                    {activeServiceItems.length > 4 ? (
                      <p className="text-xs font-bold text-zinc-400">최근 4개 우선 표시 · 전체 {activeServiceItems.length.toLocaleString("ko-KR")}개</p>
                    ) : null}
                  </div>

                  {activeServiceItems.length > 0 ? (
                    <div className="grid gap-3">
                      {activeServiceItems.slice(0, 4).map(({ key, entitlement, menuSite, subscription }) => {
                        const publicMenuPath = formatPublicMenuPath(menuSite?.slug);
                        const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
                        const billingCycle = entitlement?.billing_cycle ?? subscription?.billing_cycle ?? null;
                        const status = subscription?.status ?? entitlement?.status ?? null;
                        const productKey = subscription?.product_key ?? entitlement?.product_key ?? null;
                        const product = productKey ? getSubscriptionProduct(productKey) : null;
                        const isPersonalTrial = planType === "personal_trial" || planType === "personal_trial_basic_1month";
                        const amount = subscription?.amount ?? product?.amount ?? (isPersonalTrial ? personalTrialBasicProduct.amount : null);
                        const latestPayment = getLatestPaymentForService({ menuSiteId: menuSite?.id, productKey });
                        const latestPaymentStatus = latestPayment?.payment.status ?? null;
                        const isBusinessSubscription = Boolean(subscription?.id && !isPersonalTrial);
                        const paymentDetailProductName = productKey ? getProductLabel(productKey) : getServiceName(planType, billingCycle);
                        const paymentDetailAmount = latestPayment?.payment.amount ?? amount;
                        const paymentDetailDate = latestPayment?.payment.created_at ?? subscription?.last_paid_at ?? entitlement?.created_at ?? null;
                        const paymentDetailId = getSafeString(latestPayment?.payment.payment_id ?? latestPayment?.payment.portone_payment_id ?? subscription?.portone_payment_id ?? latestPayment?.order?.payment_id ?? null);
                        const paymentDetailPgLabel = isPersonalTrial ? "PortOne 일반 결제" : "NHN KCP 카드 정기결제";
                        const paymentDetailReceiptUrl = getPaymentReceiptUrl(latestPayment?.payment, latestPayment?.order);
                        const cancelAtPeriodEnd = Boolean(subscription?.cancel_at_period_end);
                        const periodEnd = subscription?.current_period_end ?? subscription?.next_billing_at ?? entitlement?.access_expires_at ?? null;
                        const subscriptionBadgeTone = isActiveCancelScheduledSubscription(subscription) ? "cancel_scheduled" : status;
                        const subscriptionCardStatusLabel = isBusinessSubscription
                          ? getBusinessSubscriptionCardStatusLabel(subscription, status)
                          : isPersonalTrial
                            ? entitlement?.status === "active"
                              ? "체험 중"
                              : entitlement?.status === "expired"
                                ? "체험 종료"
                                : getEntitlementStatusLabel(entitlement?.status)
                            : getEntitlementStatusLabel(entitlement?.status);

                        return (
                          <article key={key} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-black tracking-tight">{getServiceName(planType, billingCycle)}</h4>
                                  <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStateBadgeClassName(subscriptionBadgeTone)}`}>
                                    {subscriptionCardStatusLabel}
                                  </span>
                                </div>
                                <dl className="mt-4 grid gap-x-5 gap-y-2 text-sm md:grid-cols-2 xl:grid-cols-3">
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">메뉴판</dt>
                                    <dd className="mt-1 break-keep font-bold text-zinc-900">{menuSite?.name ?? "연결된 메뉴판 확인 필요"}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">공개 주소</dt>
                                    <dd className="mt-1 break-all font-bold text-zinc-900">{publicMenuPath}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">결제 주기 / 금액</dt>
                                    <dd className="mt-1 font-bold text-zinc-900">{isPersonalTrial ? "체험 결제" : getBillingCycleLabel(billingCycle)} · {typeof amount === "number" ? formatKrw(amount) : "-"}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">{isPersonalTrial ? "체험 만료일" : cancelAtPeriodEnd ? "이용 종료 예정일" : "다음 결제 예정일"}</dt>
                                    <dd className="mt-1 font-bold text-zinc-900">{formatDate(isPersonalTrial ? entitlement?.access_expires_at ?? null : cancelAtPeriodEnd ? periodEnd : subscription?.next_billing_at ?? null)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">최근 결제일</dt>
                                    <dd className="mt-1 font-bold text-zinc-900">{formatDate(latestPayment?.payment.created_at ?? subscription?.last_paid_at ?? null)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">결제수단 / PG</dt>
                                    <dd className="mt-1 font-bold text-zinc-900">{paymentDetailPgLabel}</dd>
                                  </div>
                                </dl>
                                {isPersonalTrial ? (
                                  <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-amber-700">
                                    체험 종료 전 사업자 플랜으로 전환하면 현재 메뉴판을 이어서 사용할 수 있습니다.
                                  </p>
                                ) : null}
                                {isBusinessSubscription ? (
                                  <div className="mt-3 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs font-bold leading-relaxed text-zinc-500">
                                    구독을 해지하면 다음 결제일부터 결제가 중단됩니다. 이미 결제된 이용기간은 종료일까지 계속 이용할 수 있으며, 이용기간 종료 후 메뉴판은 비공개 처리되고 90일 보관 기간이 지나면 메뉴판 데이터와 업로드 이미지가 삭제될 수 있습니다.
                                  </div>
                                ) : null}
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                                {isBusinessSubscription && subscription?.id ? (
                                  <SubscriptionManagementModal
                                    subscriptionId={subscription.id}
                                    productName={getServiceName(planType, billingCycle)}
                                    menuName={menuSite?.name ?? "연결된 메뉴판 확인 필요"}
                                    menuStatus={menuSite?.status ? getStatusLabel(menuSite.status) : "상태 확인 필요"}
                                    amountLabel={typeof amount === "number" ? formatKrw(amount) : "-"}
                                    billingCycleLabel={getBillingCycleLabel(billingCycle)}
                                    nextBillingLabel={formatDate(subscription.next_billing_at ?? null)}
                                    periodEndLabel={formatDate(periodEnd)}
                                    status={subscription.status ?? ""}
                                    statusLabel={getSubscriptionStatusLabel(subscription.status)}
                                    cancelAtPeriodEnd={cancelAtPeriodEnd}
                                    cancelRequestedLabel={formatDateTime(subscription.cancel_requested_at ?? null)}
                                    pgLabel="NHN KCP 카드 정기결제"
                                    serviceEntitlementLabel={getEntitlementStatusLabel(entitlement?.status)}
                                    canManage={Boolean(typeof subscription.cancel_at_period_end === "boolean")}
                                    defaultOpen={shouldAutoOpenSubscriptionModal && requestedSubscriptionId === subscription.id}
                                    billingMethod={billingCycle === "yearly" ? "yearly" : billingCycle === "monthly" ? "monthly" : "unknown"}
                                    refundConfirmEnabled={yearlyRefundConfirmEnabled}
                                  />
                                ) : null}
                                <PaymentDetailModal
                                  productName={paymentDetailProductName}
                                  statusLabel={getPaymentStatusLabel(latestPaymentStatus)}
                                  statusTone={getPaymentStatusTone(latestPaymentStatus)}
                                  paidAtLabel={formatDateTime(paymentDetailDate)}
                                  amountLabel={typeof paymentDetailAmount === "number" ? formatKrw(paymentDetailAmount) : "-"}
                                  pgLabel={paymentDetailPgLabel}
                                  paymentIdLabel={paymentDetailId || "결제번호 확인 필요"}
                                  receiptUrl={paymentDetailReceiptUrl}
                                  menuName={menuSite?.name ?? null}
                                />
                                {menuSite?.id ? (
                                  <Link href={`/mypage/menus/${menuSite.id}/edit`} className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
                                    연결 메뉴판 보기
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <article className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
                      <h4 className="text-xl font-black">현재 이용 중인 서비스가 없습니다</h4>
                      <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">메뉴판을 만들거나 사업자 플랜을 시작하면 이곳에 표시됩니다.</p>
                    </article>
                  )}
                </section>
                  </>
                ) : null}

                {activeBillingTab === "holding" || activeBillingTab === "deleted" ? (
                  <>
                <section className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">
                        {activeBillingTab === "holding" ? "보관 중인 메뉴판" : "삭제된 메뉴판"}
                      </h3>
                      <p className="mt-2 max-w-2xl break-keep text-sm font-bold leading-relaxed text-amber-700">
                        {activeBillingTab === "holding"
                          ? "이용이 종료되었지만 보관 기간 안에 있는 메뉴판입니다. 보관 만료 D-Day까지 복구할 수 있습니다."
                          : "보관 기간이 끝났거나 복구 가능한 보관 기준을 확인할 수 없는 메뉴판입니다."}
                      </p>
                    </div>
                    {(activeBillingTab === "holding" ? holdingServiceItems : deletedServiceItems).length > 6 ? (
                      <p className="text-xs font-bold text-zinc-400">최근 6개 우선 표시 · 전체 {(activeBillingTab === "holding" ? holdingServiceItems : deletedServiceItems).length.toLocaleString("ko-KR")}개</p>
                    ) : null}
                  </div>

                  {(activeBillingTab === "holding" ? holdingServiceItems : deletedServiceItems).length > 0 ? (
                    <div className="grid gap-3">
                      {(activeBillingTab === "holding" ? holdingServiceItems : deletedServiceItems).slice(0, 6).map(({ key, entitlement, menuSite, subscription }) => {
                        const isDeletedTab = activeBillingTab === "deleted";
                        const publicMenuPath = formatPublicMenuPath(menuSite?.slug);
                        const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
                        const billingCycle = entitlement?.billing_cycle ?? subscription?.billing_cycle ?? null;
                        const productKey = subscription?.product_key ?? entitlement?.product_key ?? null;
                        const product = productKey ? getSubscriptionProduct(productKey) : null;
                        const isPersonalTrial = planType === "personal_trial" || planType === "personal_trial_basic_1month";
                        const latestPayment = getLatestPaymentForService({ menuSiteId: menuSite?.id, productKey });
                        const amount = subscription?.amount ?? product?.amount ?? (isPersonalTrial ? personalTrialBasicProduct.amount : null);
                        const entitlementStatus = entitlement?.status ?? null;
                        const subscriptionStatus = subscription?.status ?? null;
                        const retentionEndDate = entitlement?.data_retention_until ?? entitlement?.deleted_scheduled_at ?? null;
                        const retentionDdayInfo = getRetentionDdayInfo(retentionEndDate);
                        const daysUntilRetentionEnds = retentionEndDate ? getRemainingDaysUntilKst(retentionEndDate) : null;
                        const isPaymentIssue = subscriptionStatus === "failed" || subscriptionStatus === "payment_failed" || subscriptionStatus === "past_due";
                        const isCancelScheduledEnded = isPastCancelScheduledSubscription(subscription, entitlement?.access_expires_at ?? null);
                        const daysUntilTrialAccessEnds = entitlement?.access_expires_at ? getRemainingDaysUntilKst(entitlement.access_expires_at) : null;
                        const isTrialEnded = isPersonalTrial && (entitlementStatus === "expired" || (daysUntilTrialAccessEnds !== null && daysUntilTrialAccessEnds < 0));
                        const isRecoveryWindowOpen = typeof daysUntilRetentionEnds === "number" && daysUntilRetentionEnds >= 0;
                        const isRetentionDue = isDeletedTab || (entitlementStatus === "pending_delete" && !isRecoveryWindowOpen) || !isRecoveryWindowOpen;
                        const isAdminArchived = (menuSite?.status === "archived" || entitlementStatus === "archived") && !isPaymentIssue && !isCancelScheduledEnded && !isTrialEnded;
                        const archivedDisplayState = getArchivedDisplayState({
                          isRetentionDue,
                          hasPaymentIssue: isPaymentIssue,
                          isCancelScheduledEnded,
                          isTrialEnded,
                          isAdminArchived,
                          isAccessRestricted: true,
                          siteId: menuSite?.id ?? "",
                          ddayInfo: retentionDdayInfo,
                        });
                        const statusForTone = archivedDisplayState?.key === "payment-needed"
                          ? "payment_failed"
                          : archivedDisplayState?.key === "cancel-ended"
                            ? "cancel_ended"
                            : archivedDisplayState?.key === "deleted"
                              ? "deleted"
                              : archivedDisplayState?.key === "admin-archived"
                                ? "admin_archived"
                                : archivedDisplayState?.key === "archived-fallback"
                                  ? "archived_fallback"
                                  : entitlement?.status ?? subscription?.status ?? menuSite?.status ?? null;
                        const statusLabel = archivedDisplayState?.label ?? getArchivedServiceStatusLabel({ key, entitlement, menuSite, subscription });
                        const dataRetentionUntil = entitlement?.data_retention_until ?? entitlement?.deleted_scheduled_at ?? null;
                        const expiresAt = entitlement?.access_expires_at ?? subscription?.current_period_end ?? subscription?.next_billing_at ?? null;
                        const dataDeletionScheduledAt = dataRetentionUntil;
                        const paymentDetailProductName = productKey ? getProductLabel(productKey) : getServiceName(planType, billingCycle);
                        const paymentDetailDate = latestPayment?.payment.created_at ?? subscription?.last_paid_at ?? entitlement?.created_at ?? null;
                        const paymentDetailId = getSafeString(latestPayment?.payment.payment_id ?? latestPayment?.payment.portone_payment_id ?? subscription?.portone_payment_id ?? latestPayment?.order?.payment_id ?? null);
                        const paymentDetailPgLabel = isPersonalTrial ? "PortOne 일반 결제" : subscription ? "NHN KCP 카드 정기결제" : "결제수단 확인 필요";
                        const paymentDetailReceiptUrl = getPaymentReceiptUrl(latestPayment?.payment, latestPayment?.order);
                        const retentionDisplayLabel = archivedDisplayState?.ddayInfo && archivedDisplayState.ddayInfo.days >= 0
                          ? archivedDisplayState.ddayInfo.label
                          : daysUntilRetentionEnds !== null && daysUntilRetentionEnds <= 0
                            ? "복구 불가"
                            : daysUntilRetentionEnds !== null && daysUntilRetentionEnds > RETENTION_DDAY_DISPLAY_THRESHOLD_DAYS
                              ? `${formatDate(dataRetentionUntil)}까지 복구 가능`
                              : "보관 기간 정보 없음";

                        return (
                          <article key={key} className={`rounded-2xl border bg-white p-4 shadow-sm ${isDeletedTab ? "border-zinc-200" : "border-amber-100"}`}>
                            <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <h4 className="text-lg font-black tracking-tight">{menuSite?.name ?? "연결된 메뉴판 확인 필요"}</h4>
                                  <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStateBadgeClassName(statusForTone)}`}>
                                    {statusLabel}
                                  </span>
                                </div>
                                <dl className="mt-4 grid gap-x-5 gap-y-2 text-sm md:grid-cols-2 xl:grid-cols-3">
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">과거 상품</dt>
                                    <dd className="mt-1 break-keep font-bold text-zinc-900">{paymentDetailProductName}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">공개 주소</dt>
                                    <dd className="mt-1 break-all font-bold text-zinc-900">{publicMenuPath}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">결제일</dt>
                                    <dd className="mt-1 font-bold text-zinc-900">{formatDate(latestPayment?.payment.created_at ?? subscription?.last_paid_at ?? null)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">만료일</dt>
                                    <dd className="mt-1 font-bold text-zinc-900">{formatDate(expiresAt)}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">보관 만료</dt>
                                    <dd className="mt-1 break-keep font-bold text-zinc-900">
                                      {retentionDisplayLabel}
                                    </dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">결제수단 / PG</dt>
                                    <dd className="mt-1 font-bold text-zinc-900">{paymentDetailPgLabel}</dd>
                                  </div>
                                  <div>
                                    <dt className="text-xs font-black text-zinc-400">금액</dt>
                                    <dd className="mt-1 font-bold text-zinc-900">{typeof amount === "number" ? formatKrw(amount) : "-"}</dd>
                                  </div>
                                </dl>
                                <div className={`mt-4 rounded-xl border p-4 text-xs font-bold leading-relaxed ${isDeletedTab ? "border-zinc-100 bg-zinc-50 text-zinc-600" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
                                  <p>{archivedDisplayState?.message ?? "이 메뉴판의 이용기간이 종료되어 비공개 처리되었습니다."}</p>
                                  {isDeletedTab ? (
                                    <p className="mt-2">결제 기록은 관련 법령 및 운영 정책에 따라 보관될 수 있습니다.</p>
                                  ) : (
                                    <>
                                      <p className="mt-2">보관 기간 안에 실제 연결된 결제 또는 전환 흐름이 있는 경우 기존 메뉴판을 이어서 사용할 수 있습니다.</p>
                                      <p className="mt-2">보관 기간이 종료되면 메뉴판 데이터와 업로드 이미지는 정책에 따라 삭제될 수 있습니다.</p>
                                    </>
                                  )}
                                  {dataDeletionScheduledAt ? (
                                    <p className={`mt-3 font-black ${isDeletedTab ? "text-zinc-800" : "text-amber-950"}`}>보관 종료일: {formatDate(dataDeletionScheduledAt)}</p>
                                  ) : null}
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                                {!isDeletedTab && archivedDisplayState?.cta ? (
                                  <Link href={archivedDisplayState.cta.href} className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100">
                                    {archivedDisplayState.cta.label}
                                  </Link>
                                ) : null}
                                {latestPayment ? (
                                  <PaymentDetailModal
                                    productName={paymentDetailProductName}
                                    statusLabel={getPaymentStatusLabel(latestPayment.payment.status)}
                                    statusTone={getPaymentStatusTone(latestPayment.payment.status)}
                                    paidAtLabel={formatDateTime(paymentDetailDate)}
                                    amountLabel={typeof latestPayment.payment.amount === "number" ? formatKrw(latestPayment.payment.amount) : typeof amount === "number" ? formatKrw(amount) : "-"}
                                    pgLabel={paymentDetailPgLabel}
                                    paymentIdLabel={paymentDetailId || "결제번호 확인 필요"}
                                    receiptUrl={paymentDetailReceiptUrl}
                                    menuName={menuSite?.name ?? null}
                                  />
                                ) : null}
                                {!isDeletedTab && menuSite?.id ? (
                                  <Link href={`/mypage/menus/${menuSite.id}/preview`} className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900">
                                    연결 메뉴판 보기
                                  </Link>
                                ) : null}
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <article className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
                      <h4 className="text-xl font-black">
                        {activeBillingTab === "holding" ? "보관 중인 메뉴판이 없습니다" : "삭제된 메뉴판이 없습니다"}
                      </h4>
                      <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                        {activeBillingTab === "holding"
                          ? "복구 가능한 보관 기간 안의 서비스가 생기면 이곳에 표시됩니다."
                          : "복구 가능 기간이 지난 서비스가 생기면 이곳에 표시됩니다."}
                      </p>
                    </article>
                  )}
                </section>
                  </>
                ) : null}

                {activeBillingTab === "ai-credits" ? (
                  <>
                {aiCreditContextMenuSite?.id ? (
                  <AiCreditRechargePanel
                    menuSiteId={aiCreditContextMenuSite.id}
                    menuName={aiCreditContextMenuSite.name ?? "내 메뉴판"}
                    userId={user.id}
                    userEmail={user.email}
                    storeId={portOneConfig.storeId ?? undefined}
                    channelKey={portOneConfig.channelKey ?? undefined}
                    initialBalance={accountAiCreditBalance}
                    accountSummaryOnly
                  />
                ) : (
                  <article className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
                    <h3 className="text-base font-black text-zinc-950">보유 AI 크레딧 0개</h3>
                    <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                      충전한 AI 크레딧은 내 계정의 모든 메뉴판에서 사용할 수 있습니다.
                    </p>
                  </article>
                )}
                <section className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">AI 크레딧 충전 내역</h3>
                      <p className="mt-2 max-w-2xl break-keep text-xs font-bold leading-relaxed text-amber-700">
                        AI 크레딧은 계정 공용으로 충전되며, 지급 후 단순 변심에 따른 취소/환불이 제한됩니다. 중복 결제 또는 미지급 건은 고객지원으로 문의해주세요.
                      </p>
                    </div>
                    {aiCreditPurchases.length > displayedAiCreditPurchases.length ? (
                      <p className="text-xs font-bold text-zinc-400">최근 {displayedAiCreditPurchases.length.toLocaleString("ko-KR")}건 표시</p>
                    ) : null}
                  </div>

                  {displayedAiCreditPurchases.length > 0 ? (
                    <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
                      {displayedAiCreditPurchases.map((purchase, index) => {
                        const product = getAiCreditPack(purchase.product_key);
                        const payment = payments.find((item) => {
                          const paymentId = getSafeString(purchase.payment_id);
                          return paymentId && (item.payment_id === paymentId || item.portone_payment_id === paymentId);
                        });
                        const productName = product?.name ? `${product.name} 충전` : getProductLabel(purchase.product_key);
                        const paymentStatus = payment?.status ?? "paid";
                        const paymentId = getSafeString(purchase.payment_id ?? payment?.payment_id ?? payment?.portone_payment_id ?? null);
                        const order = payment?.order_id ? orderById.get(payment.order_id) : orderByPaymentId.get(paymentId);
                        const receiptUrl = getPaymentReceiptUrl(payment, order);

                        return (
                          <article key={purchase.id ?? `${purchase.payment_id}-${purchase.created_at}`} className={`p-4 ${index > 0 ? "border-t border-zinc-100" : ""}`}>
                            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                              <div>
                                <h4 className="text-base font-black text-zinc-950">{productName}</h4>
                                <p className="mt-1 text-xs font-bold text-zinc-500">
                                  {formatDateTime(purchase.created_at)} · 계정 공용 크레딧 충전
                                </p>
                                <p className="mt-1 font-mono text-[11px] font-bold text-zinc-400">결제번호 {maskPaymentId(paymentId)}</p>
                              </div>
                              <div className="text-left md:text-right">
                                <p className="text-sm font-black text-zinc-950">{product ? formatKrw(product.amount) : "-"}</p>
                                <p className="mt-1 text-xs font-black text-emerald-700">AI 크레딧 {Math.max(0, purchase.credit_amount ?? product?.credits ?? 0).toLocaleString("ko-KR")}개 충전</p>
                                <div className="mt-2 flex flex-wrap gap-2 md:justify-end">
                                  <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStateBadgeClassName(paymentStatus)}`}>
                                    {getPaymentStatusLabel(paymentStatus)}
                                  </span>
                                  <PaymentDetailModal
                                    productName={productName}
                                    statusLabel={getPaymentStatusLabel(paymentStatus)}
                                    statusTone={getPaymentStatusTone(paymentStatus)}
                                    paidAtLabel={formatDateTime(purchase.created_at ?? payment?.created_at ?? null)}
                                    amountLabel={product ? formatKrw(product.amount) : typeof payment?.amount === "number" ? formatKrw(payment.amount) : "-"}
                                    pgLabel="PortOne 일반 결제"
                                    paymentIdLabel={paymentId || "결제번호 확인 필요"}
                                    receiptUrl={receiptUrl}
                                    menuName={null}
                                    isAiCreditPurchase
                                  />
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  ) : (
                    <article className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
                      <h4 className="text-xl font-black">아직 AI 크레딧 충전 내역이 없습니다</h4>
                      <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">AI 크레딧을 충전하면 결제 완료 내역과 충전 크레딧이 이곳에 표시됩니다.</p>
                    </article>
                  )}
                </section>
                  </>
                ) : null}
              </section>
            ) : null}

            {activeTab === "inquiries" ? (
              <section id="inquiry-history" className="scroll-mt-28">
                <InquirySection
                  inquiries={inquiries}
                  activeInquiryPage={activeInquiryPage}
                  inquiryTotalPages={inquiryTotalPages}
                  inquiryTotalCount={inquiryTotalCount}
                  inquiryFrom={inquiryFrom}
                  noticeMessage={getInquiryNoticeMessage(message)}
                  errorMessage={getInquiryErrorMessage(error)}
                  inquiriesErrorMessage={inquiriesErrorMessage}
                  paginationBasePath="/mypage?tab=inquiries"
                  returnToPath={`/mypage?tab=inquiries${activeInquiryPage > 1 ? `&inquiryPage=${activeInquiryPage}` : ""}`}
                />
              </section>
            ) : null}

            {activeTab === "notifications" ? (
              <NotificationHistorySection events={notificationEvents} />
            ) : null}

            {activeTab === "account" ? (
            <section id="account-info" className="scroll-mt-28">
              <div className="mb-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
                <div>
                  <h2 className="text-2xl font-bold tracking-tight">로그인 및 가입 정보</h2>
                  <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                    현재 계정의 로그인 방식과 연결된 인증 정보를 확인합니다.
                  </p>
                </div>
                <Link
                  href="/forgot-password"
                  className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-bold text-zinc-700 transition-colors hover:bg-zinc-100"
                >
                  비밀번호 재설정
                </Link>
              </div>

              <article className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <dl className="grid gap-5 md:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">로그인 이메일</dt>
                    <dd className="mt-2 break-all text-sm font-bold text-zinc-900">{user.email ?? "이메일 정보 없음"}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">가입 방식</dt>
                    <dd className="mt-2 text-sm font-bold text-zinc-900">{getProviderLabel(primaryProvider)}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">연결된 소셜 계정</dt>
                    <dd className="mt-2 flex flex-wrap gap-2">
                      {connectedAccounts.map((provider) => (
                        <span key={provider} className="rounded-full bg-white px-3 py-1 text-xs font-black text-zinc-700 ring-1 ring-zinc-200">
                          {getProviderLabel(provider)}
                        </span>
                      ))}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">가입일</dt>
                    <dd className="mt-2 text-sm font-bold text-zinc-900">{formatDate(user.created_at ?? null)}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">최근 로그인일</dt>
                    <dd className="mt-2 text-sm font-bold text-zinc-900">{formatDate(user.last_sign_in_at ?? null)}</dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">이름 또는 매장명</dt>
                    <dd className="mt-2 break-keep text-sm font-bold text-zinc-900">
                      {displayName || "아직 등록된 업체 정보가 없습니다."}
                    </dd>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4 md:col-span-2">
                    <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">사용자 ID</dt>
                    <dd className="mt-2 break-all font-mono text-xs font-bold text-zinc-600">{user.id}</dd>
                  </div>
                </dl>
                <section className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-zinc-950">
                        {businessProfile?.business_name || "아직 인증된 사업자 정보가 없습니다."}
                      </h3>
                      <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                        사업자 인증 정보는 결제 및 서비스 이용 기준 정보로 사용됩니다. 변경이 필요한 경우 고객지원으로 문의해주세요.
                      </p>
                    </div>
                    <Link
                      href="/mypage?tab=inquiries"
                      className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
                    >
                      고객지원 문의
                    </Link>
                  </div>

                  {businessProfile ? (
                    <dl className="mt-5 grid gap-3 md:grid-cols-2">
                      <div className="rounded-2xl bg-white p-4">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">대표자명</dt>
                        <dd className="mt-2 text-sm font-bold text-zinc-900">{businessProfile.representative_name ?? "-"}</dd>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">사업자등록번호</dt>
                        <dd className="mt-2 text-sm font-bold text-zinc-900">
                          {businessProfile.business_registration_number ? maskBusinessRegistrationNumber(businessProfile.business_registration_number) : "-"}
                        </dd>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">사업자 상태</dt>
                        <dd className="mt-2 text-sm font-bold text-zinc-900">{businessProfile.business_status ?? "-"}</dd>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">과세 유형</dt>
                        <dd className="mt-2 text-sm font-bold text-zinc-900">{businessProfile.tax_type ?? "-"}</dd>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">인증 상태</dt>
                        <dd className="mt-2 text-sm font-bold text-zinc-900">{businessProfile.verification_status === "verified" ? "인증 완료" : businessProfile.verification_status ?? "-"}</dd>
                      </div>
                      <div className="rounded-2xl bg-white p-4">
                        <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">인증일</dt>
                        <dd className="mt-2 text-sm font-bold text-zinc-900">{formatDate(businessProfile.last_verified_at ?? businessProfile.verified_at)}</dd>
                      </div>
                    </dl>
                  ) : (
                    <p className="mt-5 break-keep rounded-2xl bg-white p-4 text-sm font-bold leading-relaxed text-zinc-500">
                      사업자 월결제/연결제를 이용하려면 /apply/basic에서 사업자 인증을 먼저 진행해주세요.
                    </p>
                  )}

                  {businessProfilesError && (
                    <p className="mt-4 break-keep text-xs font-bold leading-relaxed text-amber-700">
                      사업자 정보 테이블이 아직 적용되지 않았거나 조회 권한이 없습니다.
                    </p>
                  )}
                </section>
                <section className="mt-6 rounded-2xl border border-zinc-100 bg-white p-5">
                  <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
                    <div>
                      <h3 className="text-lg font-black tracking-tight text-zinc-950">서비스 안내 및 문의 수신 정보</h3>
                      <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
                        문의 답변과 서비스 안내는 담당자 정보 기준으로 전달됩니다.
                      </p>
                    </div>
                    <ContactProfileEditor
                      contactName={contactName}
                      contactPhone={contactPhone}
                      notificationEmail={notificationEmail}
                    />
                  </div>
                  <dl className="mt-5 grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">담당자명</dt>
                      <dd className="mt-2 break-keep text-sm font-bold text-zinc-900">{contactName || "등록된 담당자명 없음"}</dd>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">담당자 연락처</dt>
                      <dd className="mt-2 text-sm font-bold text-zinc-900">{contactPhone || "등록된 연락처 없음"}</dd>
                    </div>
                    <div className="rounded-2xl bg-zinc-50 p-4">
                      <dt className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">문의/알림 수신 이메일</dt>
                      <dd className="mt-2 break-all text-sm font-bold text-zinc-900">{notificationEmail || "이메일 정보 없음"}</dd>
                    </div>
                  </dl>
                  {contactProfileError && !isMissingOptionalMypageRelation(contactProfileError) ? (
                    <p className="mt-4 break-keep text-xs font-semibold leading-relaxed text-amber-700">
                      담당자 정보 조회에 실패했습니다. 저장된 정보가 보이지 않으면 잠시 후 다시 시도해주세요.
                    </p>
                  ) : (
                    <p className="mt-4 break-keep text-xs font-semibold leading-relaxed text-zinc-400">
                      사업자 인증 정보는 읽기 전용이며, 담당자 정보만 직접 등록하거나 수정할 수 있습니다.
                    </p>
                  )}
                </section>
                <MarketingConsentSettings
                  initialAccepted={marketingAccepted}
                  consentedAt={marketingConsentedAt}
                  withdrawnAt={marketingWithdrawnAt}
                />
                <AccountDeletionPanel
                  hasActiveBusinessSubscription={hasActiveBusinessSubscriptionForDeletion}
                  hasAnyMenuSite={sites.length > 0}
                />
              </article>
            </section>
            ) : null}
          </div>
        </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
