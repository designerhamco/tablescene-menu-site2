"use client";

import { useId, useState, type ReactNode } from "react";
import Link from "next/link";
import { Bell, Minus, Plus } from "lucide-react";
import { Badge } from "@/app/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/app/components/ui/collapsible";
import { LoadingState } from "@/app/components/ui/loading-state";
import { signOutAction } from "@/app/auth/actions";
import { NewWindowIndicator } from "@/app/components/ui/new-window-indicator";
import { SITE_NAV_ITEMS, isSiteNavItemActive, type NavigationAccount } from "@/lib/site-navigation";
import { SITE_SUPPORT_LINKS, isSupportLinkActive } from "@/lib/site-support-navigation";
import { NOTIFICATION_INBOX_HREF, formatNotificationBadgeCount } from "@/lib/notification-display-policy";
import styles from "@/app/components/layout/Navbar.module.css";

export default function MobileSiteMenu({ pathname, authenticated, loading, account, accountLoading = false, showOperations, unreadCount, close, closeButton, signOutControl }: {
  pathname: string; authenticated: boolean; loading: boolean; account: NavigationAccount | null;
  accountLoading?: boolean; showOperations: boolean; unreadCount: number; close: () => void; closeButton: ReactNode; signOutControl?: ReactNode;
}) {
  const [supportOpen, setSupportOpen] = useState(false);
  const supportId = useId();
  return <>
    <div className={styles.drawerHeader}>
      <Link href="/" onClick={close} className={styles.wordmark}>ArtiMenu</Link>
      <div className={styles.drawerHeaderActions}>
        <Link href={NOTIFICATION_INBOX_HREF} onClick={close} className="site-button site-button-icon site-button-ghost" aria-label={unreadCount ? `알림, 읽지 않음 ${formatNotificationBadgeCount(unreadCount)}개` : "알림"}><Bell size={23} strokeWidth={2.1} aria-hidden="true" />{unreadCount ? <span className={styles.drawerUnread} aria-hidden="true" /> : null}</Link>
        <Link href="/apply" onClick={close} className="site-button site-button-primary site-button-header">만들기</Link>
        {closeButton}
      </div>
    </div>
    <div className={styles.drawerBody}>
      <section className={styles.drawerAccount} aria-label="계정 정보">
        {loading ? <LoadingState label="계정 확인 중입니다." inline /> : authenticated ? <>
          <Link href="/mypage?tab=account" onClick={close} className={styles.drawerAccountLink}>
            <span className="type-content-title">{account?.name || "내 계정"}</span>
            {account?.role ? <Badge>{account.role}</Badge> : null}
            <span className={styles.drawerEmail}>{account?.email}</span>
          </Link>
          {accountLoading ? <LoadingState label="계정 정보를 확인 중입니다." inline /> : null}
          <div className={styles.drawerAccountActions}>
            <Link href="/mypage" onClick={close} className="site-button site-button-outline">마이 메뉴</Link>
            {showOperations ? <Link href="/mypage/operations" target="_blank" rel="noopener noreferrer" onClick={close} className="site-button site-button-outline">매장 운영 <NewWindowIndicator /></Link> : null}
          </div>
        </> : <div className={styles.drawerGuest}><p className="type-body-sm">로그인하고 매장 메뉴판을 관리하세요.</p><div className={styles.drawerGuestLinks}><Link href="/sign-in" onClick={close}>로그인</Link><span aria-hidden="true">/</span><Link href="/sign-up" onClick={close}>회원가입</Link></div></div>}
      </section>
      <nav aria-label="모바일 공식 사이트 메뉴" className={styles.drawerNavigation}>
        {SITE_NAV_ITEMS.map(item => item.path === "/faq" ? <Collapsible key={item.path} open={supportOpen} onOpenChange={setSupportOpen}>
          <CollapsibleTrigger asChild><button type="button" className={styles.drawerNavLink} data-active={isSiteNavItemActive(item, pathname) || undefined} aria-controls={supportId}>고객센터{supportOpen ? <Minus size={20} aria-hidden="true" /> : <Plus size={20} aria-hidden="true" />}</button></CollapsibleTrigger>
          <CollapsibleContent id={supportId}><div className={styles.drawerSupportNavigation}>{SITE_SUPPORT_LINKS.map(link => <Link key={link.href} href={link.href} onClick={close} aria-current={isSupportLinkActive(link.href, pathname) ? "page" : undefined} className={styles.drawerSupportLink}>{link.label}</Link>)}</div></CollapsibleContent>
        </Collapsible> : <Link key={item.path} href={item.path} onClick={close} className={styles.drawerNavLink} aria-current={isSiteNavItemActive(item, pathname) ? "page" : undefined} data-active={isSiteNavItemActive(item, pathname) || undefined}>{item.label}</Link>)}
      </nav>
      <div className={styles.drawerFooter}>
        <div className={styles.drawerSupportLinks}><Link href="/mypage/inquiries" onClick={close}>1:1 문의</Link><Link href="/support/chat" onClick={close}>채팅상담</Link></div>
        {authenticated ? signOutControl ?? <form action={signOutAction}><button type="submit" className="site-button site-button-ghost">로그아웃</button></form> : null}
      </div>
    </div>
  </>;
}
