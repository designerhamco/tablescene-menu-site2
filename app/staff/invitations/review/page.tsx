import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";

import { isDeletedAccountStatus } from "@/lib/account-status";
import {
  isValidStaffInvitationToken,
  STAFF_INVITATION_INTENT_COOKIE,
} from "@/lib/staff-invitation-token";
import { createClient } from "@/lib/supabase/server";

import AcceptInvitationForm from "./AcceptInvitationForm";

export const metadata: Metadata = {
  title: "직원 초대 수락 | 메뉴링크",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

type SearchParams = Promise<{ error?: string | string[] }>;

export default async function StaffInvitationReviewPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_INVITATION_INTENT_COOKIE)?.value;
  const hasInvitationIntent = isValidStaffInvitationToken(token) && error !== "invalid";
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const canAccept = Boolean(
    hasInvitationIntent
    && user?.email
    && user.email_confirmed_at
    && !isDeletedAccountStatus(user.app_metadata),
  );
  const returnPath = "/staff/invitations/review";

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 px-4 py-12 text-zinc-950">
      <section className="w-full max-w-lg rounded-[2rem] border border-zinc-200 bg-white p-7 shadow-sm md:p-10">
        <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">MenuLink staff</p>
        <h1 className="mt-4 text-3xl font-black tracking-tight">직원 초대 확인</h1>

        {!hasInvitationIntent ? (
          <>
            <p className="mt-5 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
              초대 정보가 없거나 브라우저에서 만료되었습니다. 받은 이메일의 초대 링크를 다시 열어 주세요.
            </p>
            <Link href="/" className="mt-7 inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-6 py-3.5 text-sm font-black text-zinc-700 hover:bg-zinc-100">
              홈으로 이동
            </Link>
          </>
        ) : !user ? (
          <>
            <p className="mt-5 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
              초대받은 이메일 계정으로 로그인하거나 새 계정을 만든 뒤 이 화면으로 돌아오세요.
            </p>
            <div className="mt-7 grid gap-3 sm:grid-cols-2">
              <Link href={`/sign-in?next=${encodeURIComponent(returnPath)}`} className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white hover:bg-emerald-700">
                로그인
              </Link>
              <Link href={`/sign-up?next=${encodeURIComponent(returnPath)}`} className="inline-flex items-center justify-center rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700 hover:bg-zinc-100">
                회원가입
              </Link>
            </div>
          </>
        ) : !canAccept ? (
          <>
            <p className="mt-5 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
              이메일 확인을 마친 활성 계정만 초대를 수락할 수 있습니다.
            </p>
            <Link href={`/sign-in?next=${encodeURIComponent(returnPath)}`} className="mt-7 inline-flex w-full items-center justify-center rounded-full border border-zinc-200 px-6 py-3.5 text-sm font-black text-zinc-700 hover:bg-zinc-100">
              다른 계정으로 로그인
            </Link>
          </>
        ) : (
          <>
            <div className="mt-5 rounded-2xl bg-emerald-50 px-4 py-4">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-emerald-700">로그인 계정</p>
              <p className="mt-2 break-all text-sm font-black text-emerald-950">{user.email}</p>
            </div>
            <p className="mt-5 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
              수락하면 초대된 메뉴판이 마이페이지에 표시됩니다. 저장된 초대 이메일과 현재 계정 이메일이 정확히 일치해야 합니다.
            </p>
            <AcceptInvitationForm />
          </>
        )}
      </section>
    </main>
  );
}
