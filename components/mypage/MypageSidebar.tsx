import Link from "next/link";
import { signOutAction } from "@/app/auth/actions";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { ContentPanel } from "@/app/components/ui/content-panel";
import ProfileAvatar from "@/components/account/ProfileAvatar";

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

export function MypageAccountCard({ userId, avatarUrl, name, email, role, aiCredits, staffCount }: {
  userId: string;
  avatarUrl?: string | null;
  name: string;
  email?: string;
  role: "사장" | "직원" | null;
  aiCredits?: number;
  staffCount?: number;
}) {
  return (
    <ContentPanel surface="muted" density="compact" aria-label="회원정보 요약" data-mypage-account-summary>
      <Link href="/mypage?tab=account" className="site-mypage-account-identity" aria-label={`${name} 회원정보 수정`}>
        <ProfileAvatar userId={userId} imageUrl={avatarUrl} name={name} email={email} size="identity" />
        <div className="site-stack-detail">
          <div className="site-action-row">
            <strong className="type-menu-title">{name}</strong>
            {role ? <Badge>{role}</Badge> : null}
          </div>
          {email ? <span className="type-body-sm site-copy-muted">{email}</span> : null}
        </div>
      </Link>
      {aiCredits !== undefined || staffCount !== undefined ? (
        <div>
          {aiCredits !== undefined ? (
            <Link href="/mypage?tab=payments&billingTab=ai-credits" className="site-account-menu-row">
              <span>AI 크레딧</span><strong>{aiCredits.toLocaleString("ko-KR")}개</strong>
            </Link>
          ) : null}
          {staffCount !== undefined ? (
            <Link href="/mypage/staff" className="site-account-menu-row">
              <span>직원 계정</span><strong>{staffCount.toLocaleString("ko-KR")}명</strong>
            </Link>
          ) : null}
        </div>
      ) : null}
      <form action={signOutAction} className="site-action-row" data-distribution="end">
        <Button type="submit" variant="link" data-purpose="navigation">로그아웃</Button>
      </form>
    </ContentPanel>
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
        <Link href="/mypage?tab=payments&billingTab=alimtalk" aria-current={active === "payments" ? "page" : undefined} className={getNavigationClassName(active === "payments")}>
          <span>구독/결제 내역</span>
        </Link>
      )}
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
