const KST_TIME_ZONE = "Asia/Seoul";
const DAY_MS = 1000 * 60 * 60 * 24;

export type LifecycleMenuSite = {
  status?: string | null;
} | null | undefined;

export type LifecycleEntitlement = {
  status?: string | null;
  access_expires_at?: string | null;
  data_retention_until?: string | null;
  deleted_scheduled_at?: string | null;
} | null | undefined;

export type LifecycleSubscription = {
  status?: string | null;
  cancel_at_period_end?: boolean | null;
  current_period_end?: string | null;
  next_billing_at?: string | null;
} | null | undefined;

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

export function getRemainingDaysUntilKst(expiresAt: string | Date, now: Date = new Date()) {
  const expiresAtDate = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);

  if (Number.isNaN(expiresAtDate.getTime())) {
    return null;
  }

  const todayStart = getKstDayStartTime(now);
  const expiresStart = getKstDayStartTime(expiresAtDate);

  if (todayStart === null || expiresStart === null) {
    return null;
  }

  return Math.round((expiresStart - todayStart) / DAY_MS);
}

export function getLifecycleSubscriptionPeriodEnd(subscription: LifecycleSubscription) {
  return subscription?.current_period_end ?? subscription?.next_billing_at ?? null;
}

export function hasCurrentOrFutureKstDate(value: string | null | undefined, now: Date = new Date()) {
  if (!value) return false;
  const days = getRemainingDaysUntilKst(value, now);
  return typeof days === "number" && days >= 0;
}

export function resolveServiceLifecycle({
  entitlement,
  subscription,
  menuSite,
  now = new Date(),
}: {
  entitlement?: LifecycleEntitlement;
  subscription?: LifecycleSubscription;
  menuSite?: LifecycleMenuSite;
  now?: Date;
}) {
  const subscriptionPeriodEnd = getLifecycleSubscriptionPeriodEnd(subscription);
  const entitlementAccessDays = entitlement?.access_expires_at
    ? getRemainingDaysUntilKst(entitlement.access_expires_at, now)
    : null;
  const subscriptionAccessDays = subscriptionPeriodEnd
    ? getRemainingDaysUntilKst(subscriptionPeriodEnd, now)
    : null;
  const retentionEndsAt = entitlement?.data_retention_until ?? entitlement?.deleted_scheduled_at ?? null;
  const retentionDays = retentionEndsAt ? getRemainingDaysUntilKst(retentionEndsAt, now) : null;
  const hasExpiredEntitlementAccess = typeof entitlementAccessDays === "number" && entitlementAccessDays < 0;
  const hasExpiredSubscriptionAccess = typeof subscriptionAccessDays === "number" && subscriptionAccessDays < 0;
  const hasActiveEntitlement = entitlement?.status === "active"
    && (!entitlement?.access_expires_at || !hasExpiredEntitlementAccess);
  const hasActiveSubscription = subscription?.status === "active"
    && Boolean(subscriptionPeriodEnd)
    && !hasExpiredSubscriptionAccess;
  const hasPaymentIssue = subscription?.status === "failed"
    || subscription?.status === "payment_failed"
    || subscription?.status === "past_due"
    || subscription?.status === "needs_action";
  const isMenuArchived = menuSite?.status === "archived";
  const isEntitlementInactive = Boolean(entitlement?.status && entitlement.status !== "active");
  const isSubscriptionInactive = Boolean(subscription?.status && subscription.status !== "active");
  const isCancelScheduled = subscription?.status === "active"
    && Boolean(subscription.cancel_at_period_end)
    && hasCurrentOrFutureKstDate(subscriptionPeriodEnd, now);
  const isPastCancelScheduled = Boolean(subscription?.cancel_at_period_end)
    && !hasCurrentOrFutureKstDate(subscriptionPeriodEnd ?? entitlement?.access_expires_at, now);
  const hasActiveRetention = typeof retentionDays === "number" && retentionDays >= 0;
  const hasCurrentAccess = !isMenuArchived
    && !hasPaymentIssue
    && !isEntitlementInactive
    && !isSubscriptionInactive
    && (!entitlement || hasActiveEntitlement)
    && (!subscription || hasActiveSubscription)
    && (hasActiveEntitlement || hasActiveSubscription);

  return {
    subscriptionPeriodEnd,
    retentionEndsAt,
    hasActiveEntitlement,
    hasActiveSubscription,
    hasCurrentAccess,
    hasActiveRetention,
    hasExpiredEntitlementAccess,
    hasExpiredSubscriptionAccess,
    hasExpiredAccessWindow: hasExpiredEntitlementAccess || hasExpiredSubscriptionAccess,
    hasPaymentIssue,
    isMenuArchived,
    isEntitlementInactive,
    isSubscriptionInactive,
    isCancelScheduled,
    isPastCancelScheduled,
    isKnownInactive:
      isMenuArchived
      || hasPaymentIssue
      || isEntitlementInactive
      || isSubscriptionInactive
      || hasExpiredEntitlementAccess
      || hasExpiredSubscriptionAccess
      || isPastCancelScheduled,
  };
}

export type ServiceLifecycleBucket =
  | "active"
  | "cancel_scheduled"
  | "needs_review"
  | "archived"
  | "unrecoverable"
  | "unknown";

export function getServiceLifecycleBucket(args: Parameters<typeof resolveServiceLifecycle>[0]): ServiceLifecycleBucket {
  const lifecycle = resolveServiceLifecycle(args);

  if (lifecycle.isCancelScheduled && lifecycle.hasCurrentAccess) return "cancel_scheduled";
  if (lifecycle.hasPaymentIssue) return "needs_review";
  if (lifecycle.hasCurrentAccess) return "active";
  if (lifecycle.hasActiveRetention) return "archived";
  if (lifecycle.isKnownInactive) return "unrecoverable";
  return "unknown";
}
