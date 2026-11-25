import Link from "next/link";

import { formatNotificationBadgeCount } from "@/lib/notification-display-policy";
import { MypageNavigationRail } from "@/components/mypage/MypageNavigationRail";
import { isStaffManagementAvailable } from "@/lib/product-focus-policy";

export type MypageNavigationKey =
  | "menus"
  | "payments"
  | "staff"
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
    <MypageNavigationRail activeKey={active}>
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
      <Link href="/mypage/alimtalk" className={getNavigationClassName(false)}><span>알림톡 잔액</span></Link>
      {isStaffManagementAvailable() ? canShowOwnerCommerce ? (
        <Link href="/mypage/staff" aria-current={active === "staff" ? "page" : undefined} className={getNavigationClassName(active === "staff")}>
          <span>직원 관리</span>
        </Link>
      ) : (
        <DisabledNavigationItem label="직원 관리" reason="사장 계정만 직원을 초대하고 권한을 관리할 수 있습니다." />
      ) : null}
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
    </MypageNavigationRail>
  );
}
