import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isDeletedAccountStatus } from "@/lib/account-status";
import { isStaffInvitationCreationEnabled } from "@/lib/server/staff-invitation-service";
import { isStaffInvitationRole, STAFF_INVITATION_ROLE_LABELS } from "@/lib/staff-invitations";
import { createClient } from "@/lib/supabase/server";

import StaffInvitationForm from "./StaffInvitationForm";

export const metadata: Metadata = {
  title: "직원 관리 | 메뉴링크",
  robots: { index: false, follow: false },
};

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

export default async function StaffManagementPage() {
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
  const menuSiteIds = menuSites.map((menuSite) => menuSite.id);
  const invitationResult = menuSiteIds.length > 0
    ? await supabase
      .from("menu_site_invitations")
      .select("id, menu_site_id, email_normalized, role, expires_at, created_at")
      .in("menu_site_id", menuSiteIds)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
    : { data: [], error: null };
  const pendingInvitations = invitationResult.data ?? [];
  const menuSiteNameById = new Map(menuSites.map((menuSite) => [menuSite.id, menuSite.name]));

  return (
    <main className="min-h-screen bg-zinc-50 px-4 py-10 text-zinc-950 md:px-8 md:py-16">
      <div className="mx-auto max-w-5xl space-y-8">
        <header className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
          <div>
            <Link href="/mypage?tab=menus" className="text-sm font-black text-emerald-700 hover:text-emerald-900">
              ← 마이페이지로 돌아가기
            </Link>
            <h1 className="mt-5 text-4xl font-black tracking-tight md:text-5xl">직원 관리</h1>
            <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              사장으로 소유한 메뉴판에 직원을 초대하고 대기 중인 초대를 확인합니다.
            </p>
          </div>
        </header>

        {menuSitesError ? (
          <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
            메뉴판 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.
          </p>
        ) : null}

        <StaffInvitationForm
          enabled={isStaffInvitationCreationEnabled()}
          menuSites={menuSites.map((menuSite) => ({
            id: menuSite.id,
            name: menuSite.name,
            slug: menuSite.slug,
          }))}
        />

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div>
            <h2 className="text-xl font-black tracking-tight">대기 중인 초대</h2>
            <p className="mt-2 text-sm font-medium text-zinc-500">재전송과 취소는 다음 안전한 작업 범위에서 연결됩니다.</p>
          </div>

          {invitationResult.error ? (
            <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
              초대 목록을 불러오지 못했습니다.
            </p>
          ) : pendingInvitations.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-zinc-100 px-4 py-5 text-sm font-bold text-zinc-600">대기 중인 초대가 없습니다.</p>
          ) : (
            <div className="mt-5 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
              {pendingInvitations.map((invitation) => (
                <div key={invitation.id} className="grid gap-2 px-4 py-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-zinc-900">{invitation.email_normalized}</p>
                    <p className="mt-1 truncate text-xs font-semibold text-zinc-500">
                      {menuSiteNameById.get(invitation.menu_site_id) ?? "메뉴판"}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-zinc-600">역할: {getRoleLabel(invitation.role)}</p>
                  <p className="text-xs font-bold text-zinc-500">{formatExpiry(invitation.expires_at)} 만료</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
