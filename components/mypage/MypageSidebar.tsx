import Link from "next/link";
import { ExternalLink } from "lucide-react";

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
    ? "site-nav-item site-nav-item-active"
    : "site-nav-item";
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
      className="site-nav-item site-nav-item-disabled"
    >
      <span>{label}</span>
      <span className="text-xs font-bold">권한 없음</span>
    </span>
  );
}

export function MypageAccountCard({
  email,
  roleLabel,
  canShowOwnerCommerce,
  accountAiCreditRemaining,
}: {
  email: string;
  roleLabel?: "사장" | "직원" | null;
  canShowOwnerCommerce: boolean;
  accountAiCreditRemaining?: number;
}) {
  return (
    <section className="site-card p-6">
      <h2 className="type-content-title min-w-0 truncate" title={email}>{email}</h2>
      {roleLabel ? (
        <div className="mt-4 flex flex-wrap gap-2" aria-label="계정 역할">
          <span
            className={roleLabel === "사장"
              ? "rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800"
              : "rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700"}
          >
            {roleLabel}
          </span>
        </div>
      ) : null}
      {canShowOwnerCommerce && accountAiCreditRemaining !== undefined ? (
        <div className="mt-5 border-t border-zinc-100 pt-4">
          <p className="text-xs font-bold text-zinc-400">AI 도우미 크레딧</p>
          <p className="mt-1 text-sm font-bold text-zinc-950">잔여 {accountAiCreditRemaining.toLocaleString("ko-KR")}개</p>
          <Link
            href="/mypage?tab=payments&billingTab=ai-credits"
            className="mt-2 inline-flex text-xs font-bold text-zinc-500 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-950"
          >
            AI 충전/사용내역
          </Link>
        </div>
      ) : null}
      <form action={signOutAction} className="mt-5">
        <button
          type="submit"
          className="site-button site-button-secondary w-full"
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
    <nav className="site-card p-3" aria-label="마이페이지 메뉴">
      <Link href="/mypage?tab=menus" className={getNavigationClassName(active === "menus")}>
        <span>내 메뉴판</span>
        <NavigationCount active={active === "menus"}>{totalMenuCount.toLocaleString("ko-KR")}</NavigationCount>
      </Link>
      <div className="mt-2 space-y-1">
        <Link
          href="/mypage/operations"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="매장 운영 새 창 열기"
          className={getNavigationClassName(false)}
        >
          <span className="inline-flex items-center gap-1.5">
            매장 운영
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" strokeWidth={1.9} aria-hidden="true" />
          </span>
        </Link>
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
