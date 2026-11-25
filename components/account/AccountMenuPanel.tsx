"use client";

import Link from "next/link";
import { Badge } from "@/app/components/ui/badge";
import { LoadingState } from "@/app/components/ui/loading-state";
import { signOutAction } from "@/app/auth/actions";
import { isStaffManagementAvailable } from "@/lib/product-focus-policy";
import type { NavigationAccount } from "@/lib/site-navigation";
import ProfileAvatar from "./ProfileAvatar";

export default function AccountMenuPanel({ userId, account, loading, failed, retry, close }: {
  userId: string; account: NavigationAccount; loading: boolean; failed: boolean; retry: () => void; close: () => void;
}) {
  const owner = !loading && !failed && account.role !== "직원";
  const count = (value: number | null | undefined, suffix: string) => typeof value === "number" ? `${value.toLocaleString("ko-KR")}${suffix}` : "—";
  return <div className="site-account-menu site-management-scope">
    <Link href="/mypage?tab=account" className="site-account-menu-identity" onClick={close} aria-label="회원정보 수정">
      <ProfileAvatar userId={userId} imageUrl={account.avatarUrl} size="identity" />
      <div className="site-field-stack">
        <div className="site-action-row"><strong className="type-content-title">{account.name || "내 계정"}</strong>{account.role ? <Badge>{account.role}</Badge> : null}</div>
        <span className="type-body-sm site-copy-muted">{account.email}</span>
      </div>
    </Link>
    <div className="site-account-menu-section">
      <Link href="/mypage?tab=menus" onClick={close} className="site-account-menu-row"><span>내 메뉴판</span><strong>{count(account.menuCount, "개")}</strong></Link>
      {owner ? <>
        <div className="site-account-menu-row"><Link href="/mypage?tab=payments&billingTab=ai-credits" onClick={close}>AI 크레딧</Link><div className="site-action-row"><strong>{count(account.aiCredits, "개")}</strong><Link href="/mypage?tab=payments&billingTab=ai-credits" onClick={close} className="site-button site-button-outline">충전</Link></div></div>
        {isStaffManagementAvailable() ? <Link href="/mypage/staff" onClick={close} className="site-account-menu-row"><span>직원 계정</span><strong>{count(account.staffCount, "명")}</strong></Link> : null}
      </> : null}
      {loading ? <LoadingState label="계정 정보 확인 중" inline /> : failed ? <div className="site-field-stack" role="status"><p className="type-caption site-copy-muted">계정 정보를 불러오지 못했습니다.</p><button type="button" className="site-button site-button-outline" onClick={retry}>다시 시도</button></div> : null}
    </div>
    <div className="site-account-menu-section">
      {owner ? <Link href="/mypage?tab=payments" onClick={close} className="site-account-menu-row">구독/결제 내역</Link> : null}
      <form action={signOutAction}><button type="submit" className="site-account-menu-row site-account-menu-signout">로그아웃</button></form>
    </div>
  </div>;
}
