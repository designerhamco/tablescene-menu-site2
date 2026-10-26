import Link from "next/link";

import { signOutAction } from "@/app/auth/actions";
import { formatNotificationBadgeCount } from "@/lib/notification-display-policy";
import { Badge } from "@/app/components/ui/badge";

export type MypageNavigationKey =
  | "menus"
  | "payments"
  | "inquiries"
  | "notifications"
  | "account"
  | "favorites";

function getNavigationClassName(isActive: boolean) {
  return isActive
    ? "site-nav-item site-nav-item-active"
    : "site-nav-item";
}

function NavigationCount({ active, children }: { active: boolean; children: React.ReactNode }) {
  return <span className={`text-support ${active ? "text-white/60" : "text-zinc-600"}`}>{children}</span>;
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
      <span className="text-support font-medium">권한 없음</span>
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
    <section className="site-account-summary">
      <div className="site-account-heading">
        <div className="min-w-0">
          <h2 className="type-content-title min-w-0 truncate" title={email}>{email}</h2>
          {roleLabel ? (
            <div className="mt-2 flex flex-wrap gap-2" aria-label="계정 역할">
              <Badge

              >
                {roleLabel}
              </Badge>
            </div>
          ) : null}
        </div>
        <form action={signOutAction}>
          <button type="submit" className="site-button site-button-rounded site-button-outline site-account-signout">
            로그아웃
          </button>
        </form>
      </div>
      {canShowOwnerCommerce && accountAiCreditRemaining !== undefined ? (
        <div className="site-account-credits">
          <div>
            <p className="text-support font-medium text-zinc-600">AI 도우미 크레딧</p>
            <p className="mt-1 text-copy font-medium text-zinc-950">잔여 {accountAiCreditRemaining.toLocaleString("ko-KR")}개</p>
          </div>
          <Link
            href="/mypage?tab=payments&billingTab=ai-credits"
            className="inline-flex text-support font-medium text-zinc-600 underline decoration-zinc-300 underline-offset-4 transition-colors hover:text-zinc-950"
          >
            AI 충전/사용내역
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function MypageNavigation({
  active,
  totalMenuCount,
  canShowOwnerCommerce,
  unreadNotificationCount = 0,
}: {
  active: MypageNavigationKey;
  totalMenuCount: number;
  canShowOwnerCommerce: boolean;
  unreadNotificationCount?: number;
}) {
  return (
    <nav className="site-account-nav" aria-label="마이페이지 메뉴">
      <Link href="/mypage?tab=menus" aria-current={active === "menus" ? "page" : undefined} className={getNavigationClassName(active === "menus")}>
        <span>내 메뉴판</span>
        <NavigationCount active={active === "menus"}>{totalMenuCount.toLocaleString("ko-KR")}</NavigationCount>
      </Link>
      {canShowOwnerCommerce ? (
        <Link href="/mypage?tab=payments" aria-current={active === "payments" ? "page" : undefined} className={getNavigationClassName(active === "payments")}>
          <span>구독/결제 내역</span>
        </Link>
      ) : (
        <DisabledNavigationItem label="구독/결제 내역" reason="사장 계정만 구독과 결제 내역을 관리할 수 있습니다." />
      )}
      <Link href="/mypage?tab=inquiries" aria-current={active === "inquiries" ? "page" : undefined} className={getNavigationClassName(active === "inquiries")}>
        <span>문의 내역</span>
      </Link>
      <Link href="/mypage?tab=notifications" aria-current={active === "notifications" ? "page" : undefined} className={getNavigationClassName(active === "notifications")}>
        <span>알림 내역</span>
        {unreadNotificationCount > 0 ? (
          <NavigationCount active={active === "notifications"}>
            {formatNotificationBadgeCount(unreadNotificationCount)}
          </NavigationCount>
        ) : null}
      </Link>
      <Link href="/mypage?tab=favorites" aria-current={active === "favorites" ? "page" : undefined} className={getNavigationClassName(active === "favorites")}><span>좋아요한 템플릿</span></Link>
      <Link href="/mypage?tab=account" aria-current={active === "account" ? "page" : undefined} className={getNavigationClassName(active === "account")}>
        <span>계정 정보</span>
      </Link>
    </nav>
  );
}
