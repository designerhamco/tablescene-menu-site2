import type { Json } from "@/lib/supabase/types";
import {
  buildDataRetentionEndingEmail,
  formatKoreanDate,
  formatPublicMenuPath,
} from "@/lib/notification-email-templates";

export const RETENTION_NOTICE_DAY_OFFSETS = [3, 1, 0] as const;
export const EMAIL_BATCH_LIMIT = Number(process.env.EMAIL_BATCH_LIMIT ?? 10);
export const EMAIL_SEND_DELAY_MS = Number(process.env.EMAIL_SEND_DELAY_MS ?? 700);
export const EMAIL_MAX_RETRY_COUNT = Number(process.env.EMAIL_MAX_RETRY_COUNT ?? 3);

export const LONG_INACTIVE_ACCOUNT_NOTICE = {
  enabled: false,
  inactiveAfterDays: 365,
  eventType: "account_inactive_1year_notice",
  basis: "가입 후 1년이 아니라 auth.users.last_sign_in_at 기준 1년 이상 미접속 계정을 검토합니다.",
  exclusions: [
    "active 유료 구독 계정",
    "active 개인 체험 계정",
    "active 메뉴판 또는 서비스 권한이 있는 계정",
  ],
  todo: "장기 미접속 1년 고지는 event_type/DB 정책 확정 후 dry-run부터 활성화합니다.",
} as const;

export const ACCOUNT_DELETION_RETENTION_POLICY = {
  enabled: false,
  todo: "회원탈퇴 후 데이터 파기 기준일은 탈퇴 기능/보관 정책 확정 후 연결합니다.",
} as const;

export type NotificationEventType =
  | "subscription_expiring_soon"
  | "subscription_expired"
  | "payment_failed"
  | "data_retention_ending_soon"
  | "data_deletion_scheduled"
  | "data_deleted"
  | "account_deletion_requested"
  | "account_data_deletion_scheduled"
  | "account_deleted"
  | "terms_updated"
  | "security_notice"
  | "service_incident";

export type NotificationEventStatus = "pending" | "sent" | "failed" | "skipped" | "read";

export type NotificationEventRecord = {
  id: string;
  user_id: string;
  menu_site_id: string | null;
  subscription_id: string | null;
  event_type: NotificationEventType;
  channel: "email" | "in_app";
  title: string;
  message: string;
  status: NotificationEventStatus;
  scheduled_for: string | null;
  sent_at: string | null;
  read_at: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
};

export { formatKoreanDate, formatPublicMenuPath };

export function getRetentionNoticePeriodKey(menuSiteId: string, daysLeft: number, retentionUntil: string) {
  return `data_retention:${menuSiteId}:${daysLeft}:${retentionUntil.slice(0, 10)}`;
}

export function buildDataRetentionNoticeMessage({
  menuSiteName,
  slug,
  retentionUntil,
  daysLeft,
}: {
  menuSiteName: string;
  slug: string | null;
  retentionUntil: string;
  daysLeft: number;
}) {
  return buildDataRetentionEndingEmail({ menuSiteName, slug, retentionUntil, daysLeft }).text;
}

export function getRetentionNoticeTitle(daysLeft: number) {
  return buildDataRetentionEndingEmail({
    menuSiteName: "메뉴판",
    slug: null,
    retentionUntil: new Date().toISOString(),
    daysLeft,
  }).subject;
}
