import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { formatNotificationBadgeCount } from "@/lib/notification-display-policy";

export type MypageNavigationKey =
  | "menus"
  | "payments"
  | "staff"
  | "inquiries"
  | "notifications"
  | "account";

function getNavigationClassName(isActive: boolean) {
  return isActive
    ? "flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-black text-white"
    : "flex items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950";
}

function NavigationCount({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`text-xs ${active ? "text-white/60" : "text-zinc-400"}`}>{children}</span>;
}

function DisabledNavigationItem({ label, reason }: { label: string; reason: string }) {
  return (
    <span
      aria-disabled="true"
      aria-label={`${label} 권한 없음: ${reason}`}
      title={reason}
      className="flex cursor-not-allowed items-center justify-between rounded-2xl px-4 py-3 text-sm font-bold text-zinc-300"
    >
      <span>{label}</span>
      <span className="text-[10px] font-black">권한 없음</span>
    </span>
  );
}

export function MypageAccountCard({
  email,
  userId,
  roleLabel,
  canShowOwnerCommerce,
  accountAiCreditRemaining,
}: {
  email: string;
  userId: string;
  roleLabel?: "사장" | "직원" | null;
  canShowOwnerCommerce: boolean;
  accountAiCreditRemaining?: number;
}) {
  return (
    <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <h2 className="break-all text-lg font-black tracking-tight">{email}</h2>
      <p className="mt-3 break-all text-xs font-semibold leading-relaxed text-zinc-500">사용자 ID: {userId}</p>
      {roleLabel ? (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="계정 역할">
          <span
            className={roleLabel === "사장"
              ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-800"
              : "rounded-full bg-sky-50 px-3 py-1 text-xs font-black text-sky-700"}
          >
            {roleLabel}
          </span>
        </div>
      ) : null}
      {canShowOwnerCommerce && accountAiCreditRemaining !== undefined ? (
        <div className="mt-5 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-emerald-700">AI 도우미 크레딧</p>
          <p className="mt-2 text-lg font-black tracking-tight text-zinc-950">
            잔여 {accountAiCreditRemaining.toLocaleString("ko-KR")} 크레딧
          </p>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-emerald-800/80">
            설명 작성, 메뉴 정리, 번역에 사용할 수 있어요.
          </p>
          <Link
            href="/mypage?tab=payments&billingTab=ai-credits"
            className="mt-3 inline-flex text-xs font-black text-emerald-800 underline decoration-emerald-300 underline-offset-4 transition-colors hover:text-emerald-950"
          >
            AI 충전내역 보기
          </Link>
        </div>
      ) : null}
      <form action={signOutAction} className="mt-5">
        <button
          type="submit"
          className="inline-flex w-full items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
        >
          로그아웃
        </button>
      </form>
    </section>
  );
}

export function MypageNavigation({
  active,
  totalMenuCount,
  canShowOwnerCommerce,
  hasOwnedMenuSites,
  unreadNotificationCount = 0,
}: {
  active: MypageNavigationKey;
  totalMenuCount: number;
  canShowOwnerCommerce: boolean;
  hasOwnedMenuSites: boolean;
  unreadNotificationCount?: number;
}) {
  return (
    <nav className="rounded-3xl border border-zinc-200 bg-white p-3 shadow-sm" aria-label="마이페이지 메뉴">
      <Link href="/mypage?tab=menus" className={getNavigationClassName(active === "menus")}>
        <span>내 메뉴판</span>
        <NavigationCount active={active === "menus"}>{totalMenuCount.toLocaleString("ko-KR")}</NavigationCount>
      </Link>
      <div className="mt-2 space-y-1">
        {canShowOwnerCommerce ? (
          <Link href="/mypage?tab=payments" className={getNavigationClassName(active === "payments")}>
            <span>구독/결제 내역</span>
          </Link>
        ) : (
          <DisabledNavigationItem label="구독/결제 내역" reason="사장 계정만 구독과 결제 내역을 관리할 수 있습니다." />
        )}
        {hasOwnedMenuSites ? (
          <Link href="/mypage/staff" className={getNavigationClassName(active === "staff")}>
            <span>직원 관리</span>
          </Link>
        ) : (
          <DisabledNavigationItem label="직원 관리" reason="소유한 메뉴판의 사장만 직원을 관리할 수 있습니다." />
        )}
        <Link href="/mypage?tab=inquiries" className={getNavigationClassName(active === "inquiries")}>
          <span>문의 내역</span>
        </Link>
        <Link href="/mypage?tab=notifications" className={getNavigationClassName(active === "notifications")}>
          <span>알림 내역</span>
          {unreadNotificationCount > 0 ? (
            <NavigationCount active={active === "notifications"}>
              {formatNotificationBadgeCount(unreadNotificationCount)}
            </NavigationCount>
          ) : null}
        </Link>
        <Link href="/mypage?tab=account" className={getNavigationClassName(active === "account")}>
          <span>계정 정보</span>
        </Link>
      </div>
    </nav>
  );
}
