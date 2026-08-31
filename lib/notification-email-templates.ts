import type { Json } from "@/lib/supabase/types";

export type NotificationEmailTemplate = {
  subject: string;
  text: string;
  html?: string;
  previewText?: string;
};

type TemplateEvent = {
  event_type: string;
  title: string;
  message: string;
  metadata: Json;
};

function getMetadataValue(metadata: Json, key: string) {
  if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;

  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function textToHtml(text: string) {
  return `<div style="font-family:Arial,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;font-size:15px;line-height:1.7;color:#18181b;white-space:pre-wrap;">${escapeHtml(text)}</div>`;
}

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

export function buildDataRetentionEndingEmail({
  menuSiteName,
  slug,
  retentionUntil,
  daysLeft,
}: {
  menuSiteName: string;
  slug: string | null;
  retentionUntil: string;
  daysLeft: number;
}): NotificationEmailTemplate {
  const publicPath = formatPublicMenuPath(slug);
  const retentionLabel = formatKoreanDate(retentionUntil);
  const daysLeftLabel = daysLeft === 0 ? "오늘" : `${daysLeft}일`;
  const subject = daysLeft === 0 ? "[아티메뉴] 데이터 보관 기간이 오늘 종료 예정입니다" : "[아티메뉴] 데이터 보관 기간 종료 예정 안내";
  const text = [
    "안녕하세요, 아티메뉴입니다.",
    "",
    "회원님의 메뉴판 데이터 보관 기간이 곧 종료될 예정입니다.",
    "",
    `* 메뉴판: ${menuSiteName}`,
    `* 메뉴판 주소: ${publicPath}`,
    `* 보관 종료 예정일: ${retentionLabel}`,
    `* 남은 기간: ${daysLeftLabel}`,
    "",
    "보관 기간이 종료되면 메뉴판 데이터와 업로드 이미지는 정책에 따라 삭제될 수 있습니다.",
    "",
    "계속 이용을 원하시면 보관 기간 종료 전 사업자 플랜으로 전환하거나 재구독해 주세요.",
    "",
    "감사합니다.",
    "아티메뉴 드림",
  ].join("\n");

  return {
    subject,
    text,
    html: textToHtml(text),
    previewText: "메뉴판 데이터 보관 기간 종료 예정 안내입니다.",
  };
}

export function buildDataRetentionStartedEmail({
  menuSiteName,
  slug,
  retentionUntil,
}: {
  menuSiteName: string;
  slug: string | null;
  retentionUntil: string;
}): NotificationEmailTemplate {
  const publicPath = formatPublicMenuPath(slug);
  const retentionLabel = formatKoreanDate(retentionUntil);
  const subject = "[아티메뉴] 메뉴판 데이터 보관 안내";
  const text = [
    "안녕하세요, 아티메뉴입니다.",
    "",
    "서비스 이용기간이 종료되어 메뉴판이 보관 상태로 전환되었습니다.",
    "",
    `* 메뉴판: ${menuSiteName}`,
    `* 메뉴판 주소: ${publicPath}`,
    `* 보관 종료 예정일: ${retentionLabel}`,
    "",
    "보관 종료 예정일까지 복구할 수 있습니다.",
    "보관 기간 내 사업자 플랜으로 전환하거나 재구독하면 기존 메뉴판을 이어서 사용할 수 있습니다.",
    "",
    "보관 기간이 종료되면 메뉴판 데이터와 업로드 이미지는 정책에 따라 삭제될 수 있습니다.",
    "",
    "감사합니다.",
    "아티메뉴 드림",
  ].join("\n");

  return {
    subject,
    text,
    html: textToHtml(text),
    previewText: "메뉴판 데이터 보관 시작 안내입니다.",
  };
}

export function buildAccountDeletionRequestedEmail(): NotificationEmailTemplate {
  const subject = "[아티메뉴] 회원탈퇴 신청 안내";
  const text = [
    "안녕하세요, 아티메뉴입니다.",
    "",
    "회원탈퇴 신청이 접수되었습니다.",
    "",
    "탈퇴 처리 후에는 아티메뉴 서비스 이용이 중단되며, 메뉴판 데이터는 보관·삭제 정책에 따라 처리됩니다.",
    "",
    "결제·정산·분쟁 대응에 필요한 기록은 관계 법령에 따라 일정 기간 보관될 수 있습니다.",
    "",
    "감사합니다.",
    "아티메뉴 드림",
  ].join("\n");

  return {
    subject,
    text,
    html: textToHtml(text),
    previewText: "회원탈퇴 신청 접수 안내입니다.",
  };
}

export function buildPersonalTrialExpiringEmail({
  menuSiteName,
  slug,
  expiresAt,
  daysLeft,
}: {
  menuSiteName: string;
  slug: string | null;
  expiresAt: string;
  daysLeft: number;
}): NotificationEmailTemplate {
  const publicPath = formatPublicMenuPath(slug);
  const expiresLabel = formatKoreanDate(expiresAt);
  const daysLeftLabel = daysLeft === 0 ? "오늘" : `${daysLeft}일`;
  const subject = "[아티메뉴] 개인 체험 기간 종료 예정 안내";
  const text = [
    "안녕하세요, 아티메뉴입니다.",
    "",
    "개인 1개월 체험 기간이 곧 종료될 예정입니다.",
    "",
    `* 메뉴판: ${menuSiteName}`,
    `* 메뉴판 주소: ${publicPath}`,
    `* 체험 종료 예정일: ${expiresLabel}`,
    `* 남은 기간: ${daysLeftLabel}`,
    "",
    "체험 종료 전 사업자 플랜으로 전환하면 기존 메뉴판을 그대로 이어서 사용할 수 있습니다.",
    "",
    "체험 종료 후에는 30일 동안 복구 가능한 상태로 보관되며, 보관 기간이 지나면 메뉴판 데이터와 업로드 이미지는 정책에 따라 삭제될 수 있습니다.",
    "",
    "감사합니다.",
    "아티메뉴 드림",
  ].join("\n");

  return {
    subject,
    text,
    html: textToHtml(text),
    previewText: "개인 체험 기간 종료 예정 안내입니다.",
  };
}

export function buildSubscriptionAccessEndingEmail({
  menuSiteName,
  slug,
  accessEndsAt,
  daysLeft,
}: {
  menuSiteName: string;
  slug: string | null;
  accessEndsAt: string;
  daysLeft: number;
}): NotificationEmailTemplate {
  const publicPath = formatPublicMenuPath(slug);
  const accessEndsLabel = formatKoreanDate(accessEndsAt);
  const daysLeftLabel = daysLeft === 0 ? "오늘" : `${daysLeft}일`;
  const subject = "[아티메뉴] 구독 이용 종료 예정 안내";
  const text = [
    "안녕하세요, 아티메뉴입니다.",
    "",
    "해지 예약된 구독의 이용 종료일이 곧 다가옵니다.",
    "",
    `* 메뉴판: ${menuSiteName}`,
    `* 메뉴판 주소: ${publicPath}`,
    `* 이용 종료 예정일: ${accessEndsLabel}`,
    `* 남은 기간: ${daysLeftLabel}`,
    "",
    "이용 종료 후 메뉴판은 보관 상태로 전환되며, 유료 구독 종료 후에는 90일 동안 복구할 수 있습니다.",
    "",
    "보관 기간 내 재구독하면 기존 메뉴판을 이어서 사용할 수 있습니다.",
    "",
    "감사합니다.",
    "아티메뉴 드림",
  ].join("\n");

  return {
    subject,
    text,
    html: textToHtml(text),
    previewText: "해지 예약된 구독의 이용 종료 예정 안내입니다.",
  };
}

export function buildSubscriptionExpiringEmail(event: TemplateEvent): NotificationEmailTemplate {
  const text = event.message || [
    "안녕하세요, 아티메뉴입니다.",
    "",
    "이용 중인 구독의 만료 예정일이 다가오고 있습니다.",
    "서비스 이용을 계속하려면 마이페이지에서 구독 상태와 결제 정보를 확인해 주세요.",
    "",
    "감사합니다.",
    "아티메뉴 드림",
  ].join("\n");

  return {
    subject: event.title || "[아티메뉴] 구독 만료 예정 안내",
    text,
    html: textToHtml(text),
    previewText: "구독 만료 예정 안내입니다.",
  };
}

export function buildPaymentFailedEmail(): NotificationEmailTemplate {
  const text = [
    "안녕하세요, 아티메뉴입니다.",
    "",
    "결제 처리가 정상적으로 완료되지 않았습니다.",
    "",
    "카드 한도, 유효기간, 결제수단 상태를 확인한 뒤 마이페이지의 구독/결제 내역을 확인해 주세요.",
    "",
    "결제가 계속 실패하면 이용 중인 서비스가 제한될 수 있습니다.",
    "",
    "감사합니다.",
    "아티메뉴 드림",
  ].join("\n");

  return {
    subject: "[아티메뉴] 결제 실패 안내",
    text,
    html: textToHtml(text),
    previewText: "결제 실패 안내입니다.",
  };
}

export function buildTestEmail(): NotificationEmailTemplate {
  const subject = "[아티메뉴] 이메일 고지 발송 테스트";
  const text = "아티메뉴 이메일 고지 발송 설정이 정상적으로 연결되었는지 확인하기 위한 테스트 메일입니다.";

  return {
    subject,
    text,
    html: textToHtml(text),
    previewText: "아티메뉴 이메일 고지 발송 테스트입니다.",
  };
}

export function buildNotificationEmail(event: TemplateEvent): NotificationEmailTemplate {
  if (getMetadataValue(event.metadata, "test") === "true" || event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) && event.metadata.test === true) {
    return buildTestEmail();
  }

  if (event.event_type === "account_deletion_requested") {
    return buildAccountDeletionRequestedEmail();
  }

  if (event.event_type === "data_retention_ending_soon" || event.event_type === "data_deletion_scheduled") {
    const menuSiteName = getMetadataValue(event.metadata, "menu_site_name") ?? "메뉴판";
    const slug = getMetadataValue(event.metadata, "slug");
    const retentionUntil = getMetadataValue(event.metadata, "retention_until") ?? "";
    const daysLeftValue = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata.days_left : null;
    const daysLeft = typeof daysLeftValue === "number" ? daysLeftValue : Number(daysLeftValue ?? 0);

    return buildDataRetentionEndingEmail({
      menuSiteName,
      slug,
      retentionUntil,
      daysLeft: Number.isFinite(daysLeft) ? daysLeft : 0,
    });
  }

  if (event.event_type === "data_retention_started") {
    const menuSiteName = getMetadataValue(event.metadata, "menu_site_name") ?? "메뉴판";
    const slug = getMetadataValue(event.metadata, "slug");
    const retentionUntil = getMetadataValue(event.metadata, "retention_until") ?? "";

    return buildDataRetentionStartedEmail({ menuSiteName, slug, retentionUntil });
  }

  if (event.event_type === "personal_trial_expiring_soon") {
    const menuSiteName = getMetadataValue(event.metadata, "menu_site_name") ?? "메뉴판";
    const slug = getMetadataValue(event.metadata, "slug");
    const expiresAt = getMetadataValue(event.metadata, "access_expires_at") ?? "";
    const daysLeftValue = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata.days_left : null;
    const daysLeft = typeof daysLeftValue === "number" ? daysLeftValue : Number(daysLeftValue ?? 0);

    return buildPersonalTrialExpiringEmail({
      menuSiteName,
      slug,
      expiresAt,
      daysLeft: Number.isFinite(daysLeft) ? daysLeft : 0,
    });
  }

  if (event.event_type === "subscription_access_ending_soon") {
    const menuSiteName = getMetadataValue(event.metadata, "menu_site_name") ?? "메뉴판";
    const slug = getMetadataValue(event.metadata, "slug");
    const accessEndsAt = getMetadataValue(event.metadata, "access_ends_at") ?? "";
    const daysLeftValue = event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata) ? event.metadata.days_left : null;
    const daysLeft = typeof daysLeftValue === "number" ? daysLeftValue : Number(daysLeftValue ?? 0);

    return buildSubscriptionAccessEndingEmail({
      menuSiteName,
      slug,
      accessEndsAt,
      daysLeft: Number.isFinite(daysLeft) ? daysLeft : 0,
    });
  }

  if (event.event_type === "subscription_expiring_soon" || event.event_type === "subscription_expired") {
    return buildSubscriptionExpiringEmail(event);
  }

  if (event.event_type === "payment_failed") {
    return buildPaymentFailedEmail();
  }

  return {
    subject: event.title,
    text: event.message,
    html: textToHtml(event.message),
  };
}
