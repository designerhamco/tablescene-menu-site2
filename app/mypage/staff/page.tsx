import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
import { MypageAccountCard, MypageNavigation } from "@/components/mypage/MypageSidebar";
import { isDeletedAccountStatus } from "@/lib/account-status";
import { isStaffManagementAvailable } from "@/lib/product-focus-policy";
import {
  MENU_SITE_STAFF_CUSTOMIZABLE_PERMISSIONS,
  MENU_SITE_STAFF_PERMISSION_LABELS,
  resolvePermissionsForAccessRole,
} from "@/lib/menu-site-permissions";
import { isStaffInvitationCreationEnabled } from "@/lib/server/staff-invitation-service";
import {
  isStaffInvitationRole,
  STAFF_INVITATION_ROLE_DESCRIPTIONS,
  STAFF_INVITATION_ROLE_LABELS,
  STAFF_INVITATION_ROLES,
} from "@/lib/staff-invitations";
import { createClient } from "@/lib/supabase/server";

import StaffInvitationForm from "./StaffInvitationForm";
import {
  cancelStaffInvitationAction,
  resendStaffInvitationAction,
  revokeStaffMembershipAction,
  updateStaffMembershipPermissionsAction,
  updateStaffMembershipRoleAction,
} from "./actions";

export const metadata: Metadata = {
  title: "직원 관리 | 아티메뉴",
  robots: { index: false, follow: false },
};

type SearchParams = Promise<{ result?: string | string[] }>;

function formatExpiry(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Seoul",
  }).format(date);
}

function getRoleLabel(value: string) {
  return isStaffInvitationRole(value) ? STAFF_INVITATION_ROLE_LABELS[value] : "알 수 없음";
}

function getResultNotice(value: string | string[] | undefined) {
  const result = Array.isArray(value) ? value[0] : value;
  if (result === "resent") return { tone: "success", message: "초대 링크를 새로 만들어 이메일을 다시 보냈습니다." } as const;
  if (result === "cancelled") return { tone: "success", message: "대기 중인 초대를 취소했습니다." } as const;
  if (result === "role-updated") return { tone: "success", message: "직원 역할 프리셋을 변경하고 개별 권한을 초기화했습니다." } as const;
  if (result === "permissions-updated") return { tone: "success", message: "직원의 개별 권한을 저장했습니다." } as const;
  if (result === "access-revoked") return { tone: "success", message: "직원의 메뉴판 접근을 회수했습니다." } as const;
  if (result === "delivery-disabled") return { tone: "warning", message: "실제 이메일 환경 검증 전에는 재전송할 수 없습니다." } as const;
  if (result === "rate-limited") return { tone: "error", message: "초대 요청이 너무 많습니다. 1시간 뒤 다시 시도해 주세요." } as const;
  if (result === "invitation-changed") return { tone: "error", message: "초대 상태가 변경되었습니다. 목록을 새로 확인해 주세요." } as const;
  if (result === "member-changed") return { tone: "error", message: "직원 상태가 변경되었습니다. 목록을 새로 확인해 주세요." } as const;
  if (result === "invalid-role") return { tone: "error", message: "올바른 직원 역할을 선택해 주세요." } as const;
  if (result === "invalid-permissions") return { tone: "error", message: "변경할 수 없는 직원 권한이 포함되어 있습니다." } as const;
  if (result === "menu-unavailable") return { tone: "error", message: "보관된 메뉴판의 초대는 다시 보낼 수 없습니다." } as const;
  if (result === "access-denied") return { tone: "error", message: "이 초대를 관리할 사장 권한이 없습니다." } as const;
  if (result === "auth-required") return { tone: "error", message: "로그인 정보를 다시 확인해 주세요." } as const;
  if (result === "operation-failed" || result === "unexpected") return { tone: "error", message: "초대 작업을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." } as const;
  return null;
}

export default async function StaffManagementPage({ searchParams }: { searchParams: SearchParams }) {
  if (!isStaffManagementAvailable()) redirect("/mypage?tab=menus");

  const { result } = await searchParams;
  const resultNotice = getResultNotice(result);
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/sign-in?next=/mypage/staff");
  if (isDeletedAccountStatus(user.app_metadata)) {
    await supabase.auth.signOut();
    redirect(`/sign-in?error=${encodeURIComponent("탈퇴 처리된 계정입니다.")}`);
  }

  const { data: menuSitesData, error: menuSitesError } = await supabase
    .from("menu_sites")
    .select("id, name, slug, status")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false });
  const menuSites = menuSitesData ?? [];
  if (!menuSitesError && menuSites.length === 0) {
    redirect("/mypage?tab=menus&message=staff-management-permission-required");
  }
  const menuSiteIds = menuSites.map((menuSite) => menuSite.id);
  const invitationResult = menuSiteIds.length > 0
    ? await supabase
      .from("menu_site_invitations")
      .select("id, invite_batch_id, menu_site_id, email_normalized, role, expires_at, created_at")
      .in("menu_site_id", menuSiteIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    : { data: [], error: null };
  const pendingInvitations = invitationResult.data ?? [];
  const membershipResult = menuSiteIds.length > 0
    ? await supabase
      .from("menu_site_members")
      .select("id, menu_site_id, user_id, role, permission_overrides, accepted_at, updated_at")
      .in("menu_site_id", menuSiteIds)
      .eq("status", "active")
      .order("updated_at", { ascending: false })
    : { data: [], error: null };
  const acceptedInvitationResult = menuSiteIds.length > 0
    ? await supabase
      .from("menu_site_invitations")
      .select("menu_site_id, accepted_by, email_normalized, accepted_at")
      .in("menu_site_id", menuSiteIds)
      .eq("status", "accepted")
      .not("accepted_by", "is", null)
      .order("accepted_at", { ascending: false })
    : { data: [], error: null };
  const activeMemberships = membershipResult.data ?? [];
  const menuSiteNameById = new Map(menuSites.map((menuSite) => [menuSite.id, menuSite.name]));
  const memberEmailBySiteAndUser = new Map<string, string>();
  for (const invitation of acceptedInvitationResult.data ?? []) {
    if (!invitation.accepted_by) continue;
    const key = `${invitation.menu_site_id}:${invitation.accepted_by}`;
    if (!memberEmailBySiteAndUser.has(key)) memberEmailBySiteAndUser.set(key, invitation.email_normalized);
  }
  const pendingInvitationBatches = [...pendingInvitations.reduce((batches, invitation) => {
    const current = batches.get(invitation.invite_batch_id) ?? {
      inviteBatchId: invitation.invite_batch_id,
      email: invitation.email_normalized,
      role: invitation.role,
      expiresAt: invitation.expires_at,
      menuSiteNames: [] as string[],
    };
    current.menuSiteNames.push(menuSiteNameById.get(invitation.menu_site_id) ?? "메뉴판");
    if (Date.parse(invitation.expires_at) < Date.parse(current.expiresAt)) current.expiresAt = invitation.expires_at;
    batches.set(invitation.invite_batch_id, current);
    return batches;
  }, new Map<string, {
    inviteBatchId: string;
    email: string;
    role: string;
    expiresAt: string;
    menuSiteNames: string[];
  }>()).values()];
  const invitationDeliveryEnabled = isStaffInvitationCreationEnabled();

  return (
    <>
      <OfficialSiteNavbar />
      <main className="site-management-scope site-gutter site-page-spacing-compact min-h-screen bg-white text-zinc-950">
        <div className="site-account-layout mx-auto w-full max-w-[var(--site-content-width)]">
          <aside className="site-account-sidebar min-w-0">
            <MypageAccountCard email={user.email ?? "이메일 정보 없음"} roleLabel="사장" canShowOwnerCommerce staffAccountCount={new Set(activeMemberships.map(member => member.user_id)).size} />
            <MypageNavigation active="staff" totalMenuCount={menuSites.length} canShowOwnerCommerce />
          </aside>
          <section className="min-w-0 space-y-8">
        <ActionFeedbackToast
          message={resultNotice?.message}
          tone={resultNotice?.tone ?? "success"}
        />
        <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Link href="/mypage?tab=menus" className="text-copy font-medium text-emerald-700 hover:text-emerald-900">
              ← 마이페이지로 돌아가기
            </Link>
            <h1 className="type-page-title mt-5">직원 관리</h1>
            <p className="type-page-description mt-3 text-zinc-500">
              메뉴판별로 직원을 초대하고 역할과 개별 권한을 관리합니다.
            </p>
          </div>
        </header>

        {menuSitesError ? (
          <p className="site-notice site-notice-error px-4 py-3 text-copy font-medium">
            메뉴판 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}

        {resultNotice ? (
          <p className={`site-notice   px-4 py-3 text-copy font-medium ${
            resultNotice.tone === "success"
              ? "site-notice-success"
              : resultNotice.tone === "warning"
                ? "site-notice-warning"
                : "site-notice-error"
          }`}>
            {resultNotice.message}
          </p>
        ) : null}

        <StaffInvitationForm
          enabled={invitationDeliveryEnabled}
          menuSites={menuSites.map((menuSite) => ({
            id: menuSite.id,
            name: menuSite.name,
            slug: menuSite.slug,
          }))}
        />

        <section className="site-section p-6 md:p-8">
          <div>
            <h2 className="type-content-title">활동 중인 직원</h2>
            <p className="mt-2 text-copy font-medium text-zinc-500">메뉴판별 역할 프리셋을 변경하거나 접근을 즉시 회수할 수 있습니다.</p>
          </div>

          {membershipResult.error || acceptedInvitationResult.error ? (
            <p className="site-notice site-notice-error mt-5 px-4 py-3 text-copy font-medium">
              직원 목록을 불러오지 못했습니다.
            </p>
          ) : activeMemberships.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-zinc-100 px-4 py-5 text-copy font-medium text-zinc-600">활동 중인 직원이 없습니다.</p>
          ) : (
            <div className="site-section mt-5 divide-y divide-zinc-100 overflow-hidden">
              {activeMemberships.map((membership) => {
                const email = memberEmailBySiteAndUser.get(`${membership.menu_site_id}:${membership.user_id}`);
                const effectivePermissions = resolvePermissionsForAccessRole(
                  membership.role,
                  membership.permission_overrides,
                );
                return (
                  <div key={membership.id} className="px-4 py-5">
                    <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr_auto] lg:items-center">
                      <div className="min-w-0">
                        <p className="truncate text-copy font-medium text-zinc-900">{email ?? `직원 ${membership.user_id.slice(0, 8)}`}</p>
                        <p className="mt-1 truncate text-support font-semibold text-zinc-500">
                          {menuSiteNameById.get(membership.menu_site_id) ?? "메뉴판"}
                        </p>
                        {isStaffInvitationRole(membership.role) ? (
                          <p className="mt-2 text-support font-semibold leading-relaxed text-zinc-500">
                            {STAFF_INVITATION_ROLE_DESCRIPTIONS[membership.role]}
                          </p>
                        ) : null}
                      </div>
                      <form action={updateStaffMembershipRoleAction} className="flex gap-2">
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <select name="role" defaultValue={membership.role} className="site-field min-w-0 flex-1 border-zinc-200 px-3 py-2 text-zinc-700">
                          {STAFF_INVITATION_ROLES.map((role) => (
                            <option key={role} value={role}>{STAFF_INVITATION_ROLE_LABELS[role]}</option>
                          ))}
                        </select>
                        <button type="submit" className="site-button site-button-secondary">
                          프리셋 변경
                        </button>
                      </form>
                      <form action={revokeStaffMembershipAction} className="lg:text-right">
                        <input type="hidden" name="membershipId" value={membership.id} />
                        <button type="submit" className="site-button site-button-outline">
                          접근 회수
                        </button>
                      </form>
                    </div>

                    <form action={updateStaffMembershipPermissionsAction} className="mt-5 border-t border-zinc-100 pt-5">
                      <input type="hidden" name="membershipId" value={membership.id} />
                      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
                        <div>
                          <p className="text-copy font-medium text-zinc-900">직원별 권한</p>
                          <p className="mt-1 text-support font-semibold text-zinc-500">
                            역할 프리셋을 기준으로 이 직원에게 필요한 기능만 켜거나 끕니다.
                          </p>
                          <p className="mt-1 text-support font-semibold text-amber-700">
                            역할 프리셋을 변경하면 개별 체크 설정은 새 프리셋 기본값으로 초기화됩니다.
                          </p>
                        </div>
                        <button type="submit" className="site-button site-button-primary">
                          개별 권한 저장
                        </button>
                      </div>
                      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {MENU_SITE_STAFF_CUSTOMIZABLE_PERMISSIONS.map((permission) => (
                          <label
                            key={permission}
                            className="flex cursor-pointer items-center gap-3 rounded-2xl border border-zinc-200 bg-white px-3 py-3 text-support font-medium text-zinc-700"
                          >
                            <input
                              type="checkbox"
                              name="permissions"
                              value={permission}
                              defaultChecked={effectivePermissions.has(permission)}
                              className="size-4 accent-zinc-950"
                            />
                            <span>{MENU_SITE_STAFF_PERMISSION_LABELS[permission]}</span>
                          </label>
                        ))}
                      </div>
                      <p className="mt-3 text-support font-semibold leading-relaxed text-zinc-500">
                        결제·구독, 직원 관리, 메뉴판 보관·삭제는 사장만 사용할 수 있습니다.
                      </p>
                    </form>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="site-section p-6 md:p-8">
          <div>
            <h2 className="type-content-title">대기 중인 초대</h2>
            <p className="mt-2 text-copy font-medium text-zinc-500">아직 수락하지 않은 초대를 확인하고 재전송하거나 취소할 수 있습니다.</p>
          </div>

          {invitationResult.error ? (
            <p className="site-notice site-notice-error mt-5 px-4 py-3 text-copy font-medium">
              초대 목록을 불러오지 못했습니다.
            </p>
          ) : pendingInvitationBatches.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-zinc-100 px-4 py-5 text-copy font-medium text-zinc-600">대기 중인 초대가 없습니다.</p>
          ) : (
            <div className="site-section mt-5 divide-y divide-zinc-100 overflow-hidden">
              {pendingInvitationBatches.map((invitation) => (
                <div key={invitation.inviteBatchId} className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-copy font-medium text-zinc-900">{invitation.email}</p>
                    <p className="mt-1 text-support font-semibold leading-relaxed text-zinc-500">
                      {invitation.menuSiteNames.join(" · ")}
                    </p>
                  </div>
                  <p className="text-support font-medium text-zinc-600">역할: {getRoleLabel(invitation.role)}</p>
                  <div className="space-y-2 md:text-right">
                    <p className="text-support font-medium text-zinc-500">{formatExpiry(invitation.expiresAt)} 만료</p>
                    <div className="flex gap-2 md:justify-end">
                      <form action={resendStaffInvitationAction}>
                        <input type="hidden" name="inviteBatchId" value={invitation.inviteBatchId} />
                        <button
                          type="submit"
                          disabled={!invitationDeliveryEnabled}
                          className="site-button site-button-secondary"
                        >
                          재전송
                        </button>
                      </form>
                      <form action={cancelStaffInvitationAction}>
                        <input type="hidden" name="inviteBatchId" value={invitation.inviteBatchId} />
                        <button type="submit" className="site-button site-button-outline">
                          취소
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
          </section>
        </div>
      </main>
      <Footer />
    </>
  );
}
