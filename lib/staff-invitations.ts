import type { MenuSiteMemberRole } from "@/lib/menu-site-permissions";

export const STAFF_INVITATION_EXPIRY_DAYS = 7;
export const STAFF_INVITATION_MAX_MENU_SITES = 20;
export const STAFF_INVITATION_MAX_ROWS_PER_HOUR = 30;

export const STAFF_INVITATION_ROLES = [
  "manager",
  "editor",
  "order_staff",
  "viewer",
] as const satisfies readonly MenuSiteMemberRole[];

export const STAFF_INVITATION_ROLE_LABELS = {
  manager: "매니저",
  editor: "편집자",
  order_staff: "주문 직원",
  viewer: "조회 전용",
} as const satisfies Readonly<Record<MenuSiteMemberRole, string>>;

export type StaffInvitationEmailTemplate = {
  subject: string;
  text: string;
  html: string;
};

export function normalizeStaffInvitationEmail(value: string) {
  return value.trim().toLowerCase();
}

export function isValidStaffInvitationEmail(value: string) {
  const normalized = normalizeStaffInvitationEmail(value);
  return normalized.length > 3
    && normalized.length <= 254
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
}

export function isStaffInvitationRole(value: unknown): value is MenuSiteMemberRole {
  return typeof value === "string"
    && (STAFF_INVITATION_ROLES as readonly string[]).includes(value);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildStaffInvitationEmail({
  inviterEmail,
  inviteUrl,
  menuSiteNames,
  role,
  expiresAt,
}: {
  inviterEmail: string;
  inviteUrl: string;
  menuSiteNames: string[];
  role: MenuSiteMemberRole;
  expiresAt: Date;
}): StaffInvitationEmailTemplate {
  const roleLabel = STAFF_INVITATION_ROLE_LABELS[role];
  const expiryLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(expiresAt);
  const siteLines = menuSiteNames.map((name) => `- ${name}`).join("\n");
  const text = [
    "안녕하세요, 메뉴링크입니다.",
    "",
    `${inviterEmail} 님이 메뉴판 운영 직원으로 초대했습니다.`,
    `역할: ${roleLabel}`,
    "",
    "초대된 메뉴판",
    siteLines,
    "",
    `초대 유효기간: ${expiryLabel}`,
    "아래 링크에서 로그인 또는 회원가입한 뒤 초대를 수락해 주세요.",
    inviteUrl,
    "",
    "본인이 요청하지 않은 초대라면 이 이메일을 무시해 주세요.",
    "감사합니다.",
    "메뉴링크 드림",
  ].join("\n");
  const siteItems = menuSiteNames
    .map((name) => `<li style="margin:4px 0;">${escapeHtml(name)}</li>`)
    .join("");

  return {
    subject: `[메뉴링크] ${menuSiteNames[0] ?? "메뉴판"} 직원 초대`,
    text,
    html: [
      '<div style="font-family:Arial,\'Apple SD Gothic Neo\',\'Noto Sans KR\',sans-serif;line-height:1.7;color:#18181b;max-width:600px;margin:0 auto;padding:32px;">',
      '<p style="font-size:13px;font-weight:800;letter-spacing:.12em;color:#059669;">MENULINK</p>',
      '<h1 style="font-size:24px;line-height:1.35;margin:12px 0;">메뉴판 운영 직원으로 초대되었습니다</h1>',
      `<p><strong>${escapeHtml(inviterEmail)}</strong> 님이 <strong>${escapeHtml(roleLabel)}</strong> 역할로 초대했습니다.</p>`,
      `<ul style="padding-left:22px;">${siteItems}</ul>`,
      `<p style="color:#71717a;font-size:14px;">초대 유효기간: ${escapeHtml(expiryLabel)}</p>`,
      `<p style="margin:28px 0;"><a href="${escapeHtml(inviteUrl)}" style="display:inline-block;border-radius:999px;background:#18181b;color:#fff;text-decoration:none;font-weight:800;padding:13px 22px;">초대 확인하기</a></p>`,
      '<p style="font-size:13px;color:#71717a;">본인이 요청하지 않은 초대라면 이 이메일을 무시해 주세요.</p>',
      "</div>",
    ].join(""),
  };
}
