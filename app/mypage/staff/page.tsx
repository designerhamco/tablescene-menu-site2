import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isDeletedAccountStatus } from "@/lib/account-status";
import { isStaffInvitationCreationEnabled } from "@/lib/server/staff-invitation-service";
import { isStaffInvitationRole, STAFF_INVITATION_ROLE_LABELS } from "@/lib/staff-invitations";
import { createClient } from "@/lib/supabase/server";

import StaffInvitationForm from "./StaffInvitationForm";
import { cancelStaffInvitationAction, resendStaffInvitationAction } from "./actions";

export const metadata: Metadata = {
  title: "직원 관리 | 메뉴링크",
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
  if (result === "delivery-disabled") return { tone: "warning", message: "실제 이메일 환경 검증 전에는 재전송할 수 없습니다." } as const;
  if (result === "rate-limited") return { tone: "error", message: "초대 요청이 너무 많습니다. 1시간 뒤 다시 시도해 주세요." } as const;
  if (result === "invitation-changed") return { tone: "error", message: "초대 상태가 변경되었습니다. 목록을 새로 확인해 주세요." } as const;
  if (result === "menu-unavailable") return { tone: "error", message: "보관된 메뉴판의 초대는 다시 보낼 수 없습니다." } as const;
  if (result === "access-denied") return { tone: "error", message: "이 초대를 관리할 사장 권한이 없습니다." } as const;
  if (result === "auth-required") return { tone: "error", message: "로그인 정보를 다시 확인해 주세요." } as const;
  if (result === "operation-failed" || result === "unexpected") return { tone: "error", message: "초대 작업을 완료하지 못했습니다. 잠시 후 다시 시도해 주세요." } as const;
  return null;
}

export default async function StaffManagementPage({ searchParams }: { searchParams: SearchParams }) {
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
  const menuSiteNameById = new Map(menuSites.map((menuSite) => [menuSite.id, menuSite.name]));
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

        {resultNotice ? (
          <p className={`rounded-2xl border px-4 py-3 text-sm font-bold ${
            resultNotice.tone === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
              : resultNotice.tone === "warning"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-rose-200 bg-rose-50 text-rose-800"
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

        <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
          <div>
            <h2 className="text-xl font-black tracking-tight">대기 중인 초대</h2>
            <p className="mt-2 text-sm font-medium text-zinc-500">재전송과 취소는 다음 안전한 작업 범위에서 연결됩니다.</p>
          </div>

          {invitationResult.error ? (
            <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">
              초대 목록을 불러오지 못했습니다.
            </p>
          ) : pendingInvitationBatches.length === 0 ? (
            <p className="mt-5 rounded-2xl bg-zinc-100 px-4 py-5 text-sm font-bold text-zinc-600">대기 중인 초대가 없습니다.</p>
          ) : (
            <div className="mt-5 divide-y divide-zinc-100 overflow-hidden rounded-2xl border border-zinc-200">
              {pendingInvitationBatches.map((invitation) => (
                <div key={invitation.inviteBatchId} className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-black text-zinc-900">{invitation.email}</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed text-zinc-500">
                      {invitation.menuSiteNames.join(" · ")}
                    </p>
                  </div>
                  <p className="text-xs font-bold text-zinc-600">역할: {getRoleLabel(invitation.role)}</p>
                  <div className="space-y-2 md:text-right">
                    <p className="text-xs font-bold text-zinc-500">{formatExpiry(invitation.expiresAt)} 만료</p>
                    <div className="flex gap-2 md:justify-end">
                      <form action={resendStaffInvitationAction}>
                        <input type="hidden" name="inviteBatchId" value={invitation.inviteBatchId} />
                        <button
                          type="submit"
                          disabled={!invitationDeliveryEnabled}
                          className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-700 hover:bg-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-300"
                        >
                          재전송
                        </button>
                      </form>
                      <form action={cancelStaffInvitationAction}>
                        <input type="hidden" name="inviteBatchId" value={invitation.inviteBatchId} />
                        <button type="submit" className="rounded-full border border-rose-200 px-3 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-50">
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
      </div>
    </main>
  );
}
