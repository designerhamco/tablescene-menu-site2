import type { Json } from "@/lib/supabase/types";

export const RETENTION_NOTICE_DAY_OFFSETS = [30, 7, 1, 0] as const;

export const LONG_INACTIVE_ACCOUNT_NOTICE = {
  enabled: false,
  inactiveAfterDays: 365,
  todo: "장기 미접속 1년 기준은 정책 확정 후 활성화합니다.",
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

export function formatPublicMenuPath(slug: string | null | undefined) {
  return slug ? `/menu/${slug}` : "-";
}

export function formatKoreanDate(value: string | null | undefined) {
  if (!value) return "-";

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) return "-";

  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

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
  const publicPath = formatPublicMenuPath(slug);
  const retentionLabel = formatKoreanDate(retentionUntil);
  const daysLeftLabel = daysLeft === 0 ? "오늘" : `${daysLeft}일`;

  return [
    "안녕하세요, 메뉴링크입니다.",
    "",
    "회원님의 메뉴판 데이터 보관 기간이 곧 종료될 예정입니다.",
    "",
    `* 메뉴판: ${menuSiteName}`,
    `* 공개 주소: ${publicPath}`,
    `* 보관 종료 예정일: ${retentionLabel}`,
    `* 남은 기간: ${daysLeftLabel}`,
    "",
    "보관 기간이 종료되면 해당 메뉴판의 편집, 공개, QR, AI 기능 이용이 제한되며, 정책에 따라 데이터가 삭제될 수 있습니다.",
    "",
    "계속 이용을 원하시면 보관 종료 전 사업자 플랜으로 전환해 주세요.",
    "",
    "감사합니다.",
    "메뉴링크 드림",
  ].join("\n");
}

export function getRetentionNoticeTitle(daysLeft: number) {
  if (daysLeft === 0) {
    return "[메뉴링크] 데이터 보관 기간이 오늘 종료됩니다";
  }

  return "[메뉴링크] 데이터 보관 기간 종료 예정 안내";
}
