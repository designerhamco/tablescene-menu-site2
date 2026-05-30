import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import { signOutAction } from "@/app/auth/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import AccountDeletionPanel from "@/components/mypage/AccountDeletionPanel";
import AiCreditRechargePanel from "@/components/mypage/AiCreditRechargePanel";
import ContactProfileEditor from "@/components/mypage/ContactProfileEditor";
import MarketingConsentSettings from "@/components/mypage/MarketingConsentSettings";
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
import { getAiCreditBalanceForMenuSite } from "@/lib/server/ai-credits-service";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { getAiCreditPack, type AiCreditBalance } from "@/lib/ai-credits";
import { getSubscriptionProduct } from "@/lib/billing-products";
import { formatNotificationBadgeCount, NOTIFICATION_VISIBLE_CHANNELS } from "@/lib/notification-display-policy";
import { formatKrw, getBasicPaymentProduct, personalTrialBasicProduct } from "@/lib/payments";
import { SERVICE_DATA_RETENTION_DAYS } from "@/lib/service-retention-policy";
import { getTemplateDisplayName } from "@/lib/templates";
import type { Json } from "@/lib/supabase/types";

type SearchParams = Promise<{
  tab?: string | string[];
  menuTab?: string | string[];
  billingTab?: string | string[];
  error?: string | string[];
  message?: string | string[];
  inquiryPage?: string | string[];
}>;

export const dynamic = "force-dynamic";
export const revalidate = 0;

const MYPAGE_QUERY_TIMEOUT_MS = 5000;
const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 1000 * 60 * 60 * 24;

type MyPageTab = "menus" | "payments" | "inquiries" | "notifications" | "account";
type MenuTab = "active" | "archived";
type BillingTab = "active" | "expired" | "ai-credits";

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
    archived: "보관됨",
    expired: "만료됨",
  };

  return status ? labels[status] ?? status : "상태 미확인";
}

function getStatusClassName(status: MenuSite["status"]) {
  const classes: Record<string, string> = {
    draft: "bg-zinc-100 text-zinc-600",
    published: "bg-emerald-50 text-emerald-700",
    archived: "bg-amber-50 text-amber-700",
  };

  return status ? classes[status] ?? "bg-zinc-100 text-zinc-600" : "bg-zinc-100 text-zinc-600";
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

function getSafeString(value: string | null | undefined) {
  return typeof value === "string" ? value.trim() : "";
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

  return tab === "archived" ? "archived" : "active";
}

function getBillingTab(value: string | string[] | undefined): BillingTab {
  const tab = Array.isArray(value) ? value[0] : value;

  if (tab === "expired") {
    return "expired";
  }

  if (tab === "ai-credits") {
    return "ai-credits";
  }

  return "active";
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
    pending_delete: "삭제 예정",
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
  if (subscription?.status === "active" && subscription.cancel_at_period_end) return "해지 예약됨";
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
    refunded: "환불됨",
  };

  return status ? labels[status] ?? status : "상태 확인 필요";
}

function getStateBadgeClassName(status: string | null | undefined) {
  if (status === "active" || status === "paid" || status === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (status === "failed" || status === "past_due" || status === "payment_failed") return "bg-red-50 text-red-700 ring-red-100";
  if (status === "expired" || status === "archived" || status === "pending_delete" || status === "cancelled" || status === "canceled" || status === "refunded") {
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

function addDaysIso(dateValue: string | Date | null | undefined, days: number) {
  if (!dateValue) {
    return null;
  }

  const date = typeof dateValue === "string" ? new Date(dateValue) : new Date(dateValue);

  if (!Number.isFinite(date.getTime())) {
    return null;
  }

  date.setDate(date.getDate() + days);
  return date.toISOString();
}

function getRetentionMessage(daysUntilRetentionEnds: number | null) {
  if (daysUntilRetentionEnds === null) {
    return "데이터 보관 기간을 확인 중입니다.";
  }

  if (daysUntilRetentionEnds > 0) {
    return `데이터 보관 만료까지 ${daysUntilRetentionEnds}일 남았습니다.`;
  }

  if (daysUntilRetentionEnds === 0) {
    return "데이터 보관 기간이 오늘 종료됩니다.";
  }

  return "데이터 보관 기간이 종료되어 삭제 예정 상태입니다.";
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
      .select("id, menu_site_id, product_key, plan_key, plan_type, billing_type, billing_cycle, status, access_starts_at, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at, created_at")
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
      .select("id, menu_site_id, product_key, plan_key, plan_type, billing_type, status, access_starts_at, access_expires_at, expired_at, data_retention_until, deleted_scheduled_at, created_at")
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
  const { tab, menuTab, billingTab, error, message, inquiryPage } = await searchParams;
  const activeTab = getActiveTab(tab);
  const activeMenuTab = getMenuTab(menuTab);
  const activeBillingTab = getBillingTab(billingTab);
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
  const menuSiteIds = sites
    .map((site) => getSafeString(site.id))
    .filter(Boolean);
  const { data: serviceEntitlements, error: serviceEntitlementsError } = await getServiceEntitlementsForMenuSites(supabase, menuSiteIds);
  const aiCreditContextMenuSite = sites.find((site) => site.id && site.name);
  const portOneConfig = getPublicPortOneConfig();
  let accountAiCreditBalance: AiCreditBalance | null = null;

  if (aiCreditContextMenuSite?.id) {
    try {
      accountAiCreditBalance = await runMypageQuery(
        "ai_credit_balance",
        getAiCreditBalanceForMenuSite(aiCreditContextMenuSite.id)
      );
    } catch (error) {
      console.error("[mypage] AI credit balance query failed", {
        userId: user.id,
        message: error instanceof Error ? error.message : "unknown",
      });
      accountAiCreditBalance = null;
    }
  }
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
    let inquiriesResult = await runMypageQuery(
      "inquiries",
      supabase
        .from("inquiries")
        .select("id, title, message, status, category, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(inquiryFrom, inquiryTo)
    );

    if (inquiriesResult?.error?.code === "42703") {
      inquiriesResult = await runMypageQuery(
        "inquiries_without_category",
        supabase
          .from("inquiries")
          .select("id, title, message, status, admin_reply, replied_at, created_at, updated_at", { count: "exact" })
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .range(inquiryFrom, inquiryTo)
      );
    }

    const inquiriesData = inquiriesResult?.data ?? [];
    const inquiriesError = inquiriesResult?.error ?? null;
    const inquiryCount = inquiriesResult?.count ?? 0;

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
      const subscription = businessSubscriptions.find((item) => item.menu_site_id && item.menu_site_id === entitlement.menu_site_id);

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

  function getServiceItemMenuSiteId(item: (typeof serviceItems)[number]) {
    return item.menuSite?.id ?? item.entitlement?.menu_site_id ?? item.subscription?.menu_site_id ?? "";
  }

  function isActiveServiceItem({ entitlement, menuSite, subscription }: (typeof serviceItems)[number]) {
    const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
    const isMenuArchived = menuSite?.status === "archived";

    if (isMenuArchived) {
      return false;
    }

    if (planType === "personal_trial" || planType === "personal_trial_basic_1month") {
      return entitlement?.status === "active";
    }

    if (planType === "business_basic" || planType === "business_display") {
      return subscription?.status === "active" || (!subscription && entitlement?.status === "active");
    }

    return false;
  }

  function isExpiredOrArchivedServiceItem({ entitlement, menuSite, subscription }: (typeof serviceItems)[number]) {
    const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
    const entitlementStatus = entitlement?.status ?? null;
    const subscriptionStatus = subscription?.status ?? null;

    if (menuSite?.status === "archived") {
      return true;
    }

    if (entitlementStatus && entitlementStatus !== "active") {
      return true;
    }

    if (subscriptionStatus && subscriptionStatus !== "active") {
      return true;
    }

    return planType === "personal_trial" || planType === "personal_trial_basic_1month" || planType === "business_basic" || planType === "business_display";
  }

  function getArchivedServiceStatusLabel({ entitlement, menuSite, subscription }: (typeof serviceItems)[number]) {
    const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
    const entitlementStatus = entitlement?.status ?? null;
    const subscriptionStatus = subscription?.status ?? null;

    if (entitlementStatus === "pending_delete") return "복구 기간 종료";
    if (menuSite?.status === "archived" || entitlementStatus === "archived") return "보관됨";
    if ((planType === "personal_trial" || planType === "personal_trial_basic_1month") && entitlementStatus === "expired") return "체험 기간 종료";
    if (subscriptionStatus === "canceled" || subscriptionStatus === "cancelled") return "해지 완료";
    if (subscriptionStatus === "expired" || entitlementStatus === "expired") return "구독 만료";

    return subscription ? getSubscriptionStatusLabel(subscriptionStatus) : getEntitlementStatusLabel(entitlementStatus);
  }

  const activeServiceItems = serviceItems.filter(isActiveServiceItem);
  const activeServiceMenuSiteIds = new Set(activeServiceItems.map(getServiceItemMenuSiteId).filter(Boolean));
  const expiredServiceItems = serviceItems.filter((item) => {
    const menuSiteId = getServiceItemMenuSiteId(item);

    if (menuSiteId && activeServiceMenuSiteIds.has(menuSiteId)) {
      return false;
    }

    return !isActiveServiceItem(item) && isExpiredOrArchivedServiceItem(item);
  });

  const paymentHistory = payments.map((payment) => {
    const order = payment.order_id ? orderById.get(payment.order_id) : orderByPaymentId.get(getSafeString(payment.payment_id));
    const productKey = payment.product_key || order?.product_key || null;
    const menuSite = order?.menu_site_id ? siteById.get(order.menu_site_id) : undefined;

    return { payment, order, productKey, menuSite };
  });
  const displayedAiCreditPurchases = aiCreditPurchases.slice(0, 8);
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
    const billingCycle = trialDisplayInfo?.billingCycle ?? "";
    const entitlementStatus = trialDisplayInfo?.status ?? "";
    const isPersonalTrial = planType === "personal_trial" || planType === "personal_trial_basic_1month";
    const isBusinessService = planType === "business_basic" || planType === "business_display";
    const activeBusinessSubscription = siteId
      ? businessSubscriptions.find((subscription) => subscription.menu_site_id === siteId && subscription.status === "active")
      : undefined;
    const anyBusinessSubscription = siteId
      ? businessSubscriptions.find((subscription) => subscription.menu_site_id === siteId)
      : undefined;
    const cancelAtPeriodEnd = Boolean(activeBusinessSubscription?.cancel_at_period_end);
    const isPublished = site.status === "published";
    const isMenuArchived = site.status === "archived";
    const accessExpiresAt = trialDisplayInfo?.accessExpiresAt ?? "";
    const dataRetentionUntil = trialDisplayInfo?.dataRetentionUntil ?? "";
    const daysUntilExpiry = accessExpiresAt ? getRemainingDaysUntilKst(accessExpiresAt) : null;
    const daysUntilRetentionEnds = dataRetentionUntil ? getRemainingDaysUntilKst(dataRetentionUntil) : null;
    const isTrialPendingDelete = entitlementStatus === "pending_delete" || Boolean(trialDisplayInfo?.deletedScheduledAt);
    const isTrialExpired = isTrialPendingDelete || entitlementStatus === "expired" || (typeof daysUntilExpiry === "number" && daysUntilExpiry < 0);
    const hasActiveEntitlement = entitlementStatus === "active";
    const hasActiveBusinessService = isBusinessService && entitlementStatus === "active";
    const hasInactiveEntitlement = ["expired", "archived", "pending_delete"].includes(entitlementStatus);
    const isAccessRestricted = isMenuArchived || !hasActiveEntitlement || (!hasActiveBusinessService && (isTrialExpired || hasInactiveEntitlement));
    const canOpenPublicPage = isPublished && Boolean(slug) && !isAccessRestricted;
    const serviceStatusLabel = cancelAtPeriodEnd
      ? "해지 예약됨"
      : isBusinessService && hasActiveEntitlement
        ? "사업자 플랜"
        : isTrialPendingDelete
          ? "복구 필요"
          : isPersonalTrial && isTrialExpired
            ? "체험 종료"
            : isPersonalTrial
              ? "개인 체험"
              : isAccessRestricted
                ? "공개 중지"
                : "이용 중";
    const menuStatusLabel = isAccessRestricted && !isMenuArchived
      ? "공개 중지"
      : getStatusLabel(site.status);
    const section = isMenuArchived || isTrialPendingDelete || anyBusinessSubscription?.status === "expired" || anyBusinessSubscription?.status === "canceled"
      ? "archived"
      : isTrialExpired || hasInactiveEntitlement || anyBusinessSubscription?.status === "failed" || anyBusinessSubscription?.status === "payment_failed" || anyBusinessSubscription?.status === "past_due"
        ? "needs_action"
        : "active";
    const periodEnd = activeBusinessSubscription?.current_period_end ?? activeBusinessSubscription?.next_billing_at ?? entitlement?.access_expires_at ?? null;
    const activeBusinessProfile = activeBusinessSubscription?.business_profile_id
      ? businessProfileById.get(activeBusinessSubscription.business_profile_id) ?? businessProfile
      : businessProfile;
    const metaItems: Array<{ label: string; value: string }> = [];
    let primaryMessage = "";

    if (activeBusinessSubscription) {
      primaryMessage = cancelAtPeriodEnd
        ? "해지 예약된 구독입니다. 이용 종료일까지 메뉴판을 사용할 수 있습니다."
        : `${billingCycle === "yearly" ? "메뉴링크 베이직 연결제" : "메뉴링크 베이직 월결제"}로 이용 중입니다.`;
      metaItems.push({
        label: cancelAtPeriodEnd ? "이용 종료 예정일" : "다음 결제 예정일",
        value: formatDate(cancelAtPeriodEnd ? periodEnd : activeBusinessSubscription.next_billing_at),
      });
      metaItems.push({ label: "결제수단", value: "NHN KCP 카드 정기결제" });
      metaItems.push({ label: "인증 사업자", value: activeBusinessProfile?.business_name ?? "인증 사업자 정보 확인 중" });
    } else if (isPersonalTrial && !isTrialExpired) {
      primaryMessage = "개인 1개월 체험으로 이용 중입니다.";
      metaItems.push({ label: "체험 만료일", value: formatDate(accessExpiresAt || null) });
      metaItems.push({ label: "남은 기간", value: daysUntilExpiry === 0 ? "오늘 만료" : typeof daysUntilExpiry === "number" ? `${Math.max(0, daysUntilExpiry)}일` : "확인 중" });
    } else if (isTrialExpired) {
      primaryMessage = isTrialPendingDelete
        ? "복구 가능 기간이 종료되었습니다. 고객지원으로 문의해주세요."
        : "체험 기간이 종료되어 공개와 편집이 제한되었습니다.";
      metaItems.push({ label: isTrialPendingDelete ? "복구 가능 기간" : "보관 만료", value: dataRetentionUntil ? getRetentionMessage(daysUntilRetentionEnds) : "보관 기간 정보 없음" });
    } else {
      primaryMessage = isAccessRestricted ? "현재 공개와 편집이 제한된 메뉴판입니다." : "메뉴판을 편집하고 공개할 수 있습니다.";
      metaItems.push({ label: "생성일", value: formatDate(site.created_at) });
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
      menuStatusLabel,
      serviceStatusLabel,
      menuStatusClassName: isAccessRestricted ? "bg-amber-50 text-amber-700" : getStatusClassName(site.status),
      serviceStatusClassName: cancelAtPeriodEnd || section !== "active" ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700",
      primaryMessage,
      metaItems: metaItems.slice(0, 3),
      isAccessRestricted,
      isTrialPendingDelete,
      isPersonalTrial,
      canConvertToBusiness: isPersonalTrial && !isTrialPendingDelete && Boolean(siteId),
      actions: {
        canEdit: Boolean(siteId) && !isTrialPendingDelete,
        canPreview: Boolean(siteId) && !isTrialPendingDelete,
        canViewPublic: canOpenPublicPage,
        canDownloadQr: canOpenPublicPage && Boolean(qrDownloadUrl),
      },
      subscription: activeBusinessSubscription,
      entitlement,
      billingCycle,
      periodEnd,
    };
  }

  const menuCardViewModels = sites.map(buildMenuCardViewModel);
  const activeMenuCards = menuCardViewModels.filter((card) => card.section === "active");
  const needsActionMenuCards = menuCardViewModels.filter((card) => card.section === "needs_action");
  const archivedMenuCards = menuCardViewModels.filter((card) => card.section === "archived");
  const inactiveMenuCards = [...needsActionMenuCards, ...archivedMenuCards];
  const visibleMenuCards = activeMenuTab === "active" ? activeMenuCards : inactiveMenuCards;

  function renderMenuCard(card: (typeof menuCardViewModels)[number]) {
    return (
      <article key={card.key} className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h3 className="text-xl font-black tracking-tight">{card.title}</h3>
            <p className="mt-1 break-all text-sm font-bold text-zinc-500">{card.publicPath}</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <span className={`rounded-full px-3 py-1 text-xs font-black ${card.menuStatusClassName}`}>{card.menuStatusLabel}</span>
            <span className={`rounded-full px-3 py-1 text-xs font-black ${card.serviceStatusClassName}`}>{card.serviceStatusLabel}</span>
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

        <div className="mt-5 flex flex-wrap gap-2">
          {card.actions.canEdit ? (
            <Link href={`/mypage/menus/${card.siteId}/edit`} className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-zinc-800">
              {card.isAccessRestricted ? "내용 확인" : "편집하기"}
            </Link>
          ) : null}
          {card.actions.canPreview ? (
            <Link href={`/mypage/menus/${card.siteId}/preview`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100">
              미리보기
            </Link>
          ) : null}
          {card.actions.canViewPublic ? (
            <Link href={card.publicPath} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100">
              공개 메뉴판 보기
            </Link>
          ) : null}
          {card.actions.canDownloadQr && card.qrDownloadUrl ? (
            <Link href={card.qrDownloadUrl} className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100">
              QR 다운로드
            </Link>
          ) : null}
          {card.canConvertToBusiness ? (
            <Link href={`/mypage/menus/${card.siteId}/convert`} className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100">
              {card.isAccessRestricted ? "사업자 플랜으로 전환하고 복구" : "사업자 플랜 전환"}
            </Link>
          ) : null}
          {card.isTrialPendingDelete ? (
            <Link href="/mypage/inquiries" className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100">
              고객지원 문의
            </Link>
          ) : null}
        </div>
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
                메뉴판 운영 현황과 고객지원, 결제 관련 정보를 한곳에서 확인합니다.
              </p>
            </div>
          </header>

        <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)] lg:items-start">
          <aside className="space-y-4 lg:sticky lg:top-28">
            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h2 className="break-all text-lg font-black tracking-tight">{user.email}</h2>
              <p className="mt-3 break-all text-xs font-semibold leading-relaxed text-zinc-500">사용자 ID: {user.id}</p>
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
                <span className={`text-xs ${activeTab === "menus" ? "text-white/60" : "text-zinc-400"}`}>{sites.length.toLocaleString("ko-KR")}</span>
              </Link>
              <div className="mt-2 space-y-1">
                <Link href="/mypage?tab=payments" className={getTabLinkClassName(activeTab === "payments")}>
                  <span>구독/결제 내역</span>
                </Link>
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

                <Link
                  href="/apply"
                  className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
                >
                  새 메뉴판 만들기
                </Link>
              </div>

              <nav className="mb-5 flex gap-2 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200" aria-label="내 메뉴판 탭">
                <Link href="/mypage?tab=menus&menuTab=active" className={getBillingTabClassName(activeMenuTab === "active")}>
                  이용 중
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{activeMenuCards.length.toLocaleString("ko-KR")}</span>
                </Link>
                <Link href="/mypage?tab=menus&menuTab=archived" className={getBillingTabClassName(activeMenuTab === "archived")}>
                  보관·만료
                  <span className="ml-2 rounded-full bg-white/20 px-2 py-0.5 text-xs">{inactiveMenuCards.length.toLocaleString("ko-KR")}</span>
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

          {sites.length > 0 ? (
            <section className="space-y-3">
              <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                <div>
                  <h3 className="text-xl font-black tracking-tight">
                    {activeMenuTab === "active" ? "이용 중인 메뉴판" : "보관·만료된 메뉴판"}
                  </h3>
                  <p className="mt-1 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                    {activeMenuTab === "active"
                      ? "현재 편집과 운영이 가능한 메뉴판입니다."
                      : "만료, 보관, 복구 필요 상태의 메뉴판입니다."}
                  </p>
                </div>
                <span className="text-xs font-black text-zinc-400">
                  {visibleMenuCards.length.toLocaleString("ko-KR")}개 · 전체 {sites.length.toLocaleString("ko-KR")}개
                </span>
              </div>

              {visibleMenuCards.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {visibleMenuCards.map(renderMenuCard)}
                </div>
              ) : (
                <div className="rounded-3xl border border-dashed border-zinc-200 bg-white p-10 text-center shadow-sm">
                  <h3 className="text-2xl font-bold">
                    {activeMenuTab === "active" ? "현재 이용 중인 메뉴판이 없습니다" : "보관 또는 만료된 메뉴판이 없습니다"}
                  </h3>
                  <p className="mx-auto mt-3 max-w-md break-keep text-sm font-medium leading-relaxed text-zinc-500">
                    {activeMenuTab === "active"
                      ? "새 메뉴판을 만들거나 기존 메뉴판을 복구해 이용할 수 있습니다."
                      : "만료되거나 보관 중인 메뉴판이 생기면 이곳에 표시됩니다."}
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
              <Link
                href="/apply"
                className="mt-7 inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-bold text-white transition-colors hover:bg-zinc-800"
              >
                새 메뉴판 만들기
              </Link>
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
                      이용 중인 서비스, 만료·보관된 메뉴판, AI 크레딧 충전 내역을 확인할 수 있습니다.
                    </p>
                  </div>
                </div>

                <nav className="mb-5 flex gap-2 overflow-x-auto rounded-full bg-white p-1 shadow-sm ring-1 ring-zinc-200" aria-label="구독/결제 내역 탭">
                  <Link href="/mypage?tab=payments&billingTab=active" className={getBillingTabClassName(activeBillingTab === "active")}>
                    이용 중
                  </Link>
                  <Link href="/mypage?tab=payments&billingTab=expired" className={getBillingTabClassName(activeBillingTab === "expired")}>
                    만료·보관
                  </Link>
                  <Link href="/mypage?tab=payments&billingTab=ai-credits" className={getBillingTabClassName(activeBillingTab === "ai-credits")}>
                    AI 크레딧 충전
                  </Link>
                </nav>

                {paymentsErrors.length > 0 ? (
                  <div className="mb-5 rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold leading-relaxed text-amber-800">
                    {Array.from(new Set(paymentsErrors)).map((paymentsError) => (
                      <p key={paymentsError}>{paymentsError}</p>
                    ))}
                  </div>
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
                        const subscriptionCardStatusLabel = isBusinessSubscription
                          ? getBusinessSubscriptionCardStatusLabel(subscription, status)
                          : isPersonalTrial
                            ? entitlement?.status === "active"
                              ? "개인 체험 이용 중"
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
                                  <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getStateBadgeClassName(status)}`}>
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
                                    <dd className="mt-1 font-bold text-zinc-900">{isPersonalTrial ? "자동결제 없음" : getBillingCycleLabel(billingCycle)} · {typeof amount === "number" ? formatKrw(amount) : "-"}</dd>
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
                                    구독을 해지하면 다음 결제일부터 결제가 중단됩니다. 이미 결제된 이용기간은 종료일까지 계속 이용할 수 있으며, 이용기간 종료 후 메뉴판은 비공개 처리되고 7일이 지나면 메뉴판 데이터와 업로드 이미지가 삭제될 수 있습니다.
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

                {activeBillingTab === "expired" ? (
                  <>
                <section className="space-y-4">
                  <div className="flex flex-col justify-between gap-2 md:flex-row md:items-end">
                    <div>
                      <h3 className="text-2xl font-black tracking-tight">만료·보관된 메뉴판</h3>
                      <p className="mt-2 max-w-2xl break-keep text-sm font-bold leading-relaxed text-amber-700">
                        체험 또는 서비스 종료 후 7일 동안 복구할 수 있습니다. 보관 기간 종료 전 사업자 플랜으로 전환하면 기존 메뉴판을 이어서 사용할 수 있습니다.
                      </p>
                    </div>
                    {expiredServiceItems.length > 6 ? (
                      <p className="text-xs font-bold text-zinc-400">최근 6개 우선 표시 · 전체 {expiredServiceItems.length.toLocaleString("ko-KR")}개</p>
                    ) : null}
                  </div>

                  {expiredServiceItems.length > 0 ? (
                    <div className="grid gap-3">
                      {expiredServiceItems.slice(0, 6).map(({ key, entitlement, menuSite, subscription }) => {
                        const publicMenuPath = formatPublicMenuPath(menuSite?.slug);
                        const planType = entitlement?.plan_type ?? subscription?.plan_type ?? null;
                        const billingCycle = entitlement?.billing_cycle ?? subscription?.billing_cycle ?? null;
                        const productKey = subscription?.product_key ?? entitlement?.product_key ?? null;
                        const product = productKey ? getSubscriptionProduct(productKey) : null;
                        const isPersonalTrial = planType === "personal_trial" || planType === "personal_trial_basic_1month";
                        const latestPayment = getLatestPaymentForService({ menuSiteId: menuSite?.id, productKey });
                        const amount = subscription?.amount ?? product?.amount ?? (isPersonalTrial ? personalTrialBasicProduct.amount : null);
                        const statusForTone = entitlement?.status ?? subscription?.status ?? menuSite?.status ?? null;
                        const statusLabel = getArchivedServiceStatusLabel({ key, entitlement, menuSite, subscription });
                        const dataRetentionUntil = entitlement?.data_retention_until ?? entitlement?.deleted_scheduled_at ?? null;
                        const daysUntilRetentionEnds = dataRetentionUntil ? getRemainingDaysUntilKst(dataRetentionUntil) : null;
                        const expiresAt = entitlement?.access_expires_at ?? subscription?.current_period_end ?? subscription?.next_billing_at ?? null;
                        const dataDeletionScheduledAt = dataRetentionUntil ?? addDaysIso(entitlement?.expired_at ?? expiresAt, SERVICE_DATA_RETENTION_DAYS);
                        const paymentDetailProductName = productKey ? getProductLabel(productKey) : getServiceName(planType, billingCycle);
                        const paymentDetailDate = latestPayment?.payment.created_at ?? subscription?.last_paid_at ?? entitlement?.created_at ?? null;
                        const paymentDetailId = getSafeString(latestPayment?.payment.payment_id ?? latestPayment?.payment.portone_payment_id ?? subscription?.portone_payment_id ?? latestPayment?.order?.payment_id ?? null);
                        const paymentDetailPgLabel = isPersonalTrial ? "PortOne 일반 결제" : subscription ? "NHN KCP 카드 정기결제" : "결제수단 확인 필요";
                        const paymentDetailReceiptUrl = getPaymentReceiptUrl(latestPayment?.payment, latestPayment?.order);

                        return (
                          <article key={key} className="rounded-2xl border border-amber-100 bg-white p-4 shadow-sm">
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
                                    <dt className="text-xs font-black text-zinc-400">보관 상태</dt>
                                    <dd className="mt-1 break-keep font-bold text-zinc-900">{dataDeletionScheduledAt ? getRetentionMessage(dataRetentionUntil ? daysUntilRetentionEnds : getRemainingDaysUntilKst(dataDeletionScheduledAt)) : "보관 기간 정보 없음"}</dd>
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
                                <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-4 text-xs font-bold leading-relaxed text-amber-800">
                                  <p>이 메뉴판의 이용기간이 종료되어 비공개 처리되었습니다.</p>
                                  <p className="mt-2">종료 후 7일 이내 사업자 플랜으로 전환하거나 구독을 재개하면 기존 메뉴판을 복구할 수 있습니다.</p>
                                  <p className="mt-2">보관 기간이 종료되면 메뉴판 데이터와 업로드 이미지는 정책에 따라 삭제될 수 있습니다.</p>
                                  <p className="mt-3 font-black text-amber-950">데이터 삭제 예정일: {formatDate(dataDeletionScheduledAt)}</p>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                                {menuSite?.id && isPersonalTrial ? (
                                  <Link href={`/mypage/menus/${menuSite.id}/convert`} className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100">
                                    기존 메뉴판 유지하고 유료 전환하기
                                  </Link>
                                ) : subscription ? (
                                  <Link href="/mypage/inquiries" className="inline-flex items-center justify-center rounded-full border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs font-black text-amber-800 transition-colors hover:bg-amber-100">
                                    구독 재개하기
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
                      <h4 className="text-xl font-black">만료·보관된 메뉴판이 없습니다</h4>
                      <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">체험 종료, 보관, 해지 완료 상태의 서비스가 생기면 이곳에 표시됩니다.</p>
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
                      사업자 월/연 결제를 이용하려면 /apply/basic에서 사업자 인증을 먼저 진행해주세요.
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
