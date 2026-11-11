import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Bell, Menu, X } from "@/app/components/ui/site-icon";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { formatNotificationBadgeCount, getNotificationDisplaySince, NOTIFICATION_COMPACT_NOTICE, NOTIFICATION_FALLBACK_HREF, NOTIFICATION_INBOX_HREF, NOTIFICATION_VISIBLE_CHANNELS } from '@/lib/notification-display-policy';
import { createClient } from '@/lib/supabase/client';
import { getSiteHeaderSurface } from '@/lib/site-header-policy';
import { applyNotificationsReadAll, getNotificationsReadAll, NOTIFICATIONS_READ_ALL_EVENT, requestNotificationsReadAll } from '@/lib/notification-read-state';
import { isStoreOperationsAvailable } from '@/lib/product-focus-policy';
import { NotificationPanel } from '@/app/components/ui/notification-panel';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import styles from './Navbar.module.css';
import { NewWindowIndicator } from '@/app/components/ui/new-window-indicator';
import SupportNavigation from '@/components/layout/SupportNavigation';
import { SITE_NAV_ITEMS as NAV_ITEMS, isSiteNavItemActive as isNavItemActive, type NavigationAccount } from '@/lib/site-navigation';
import MobileSiteMenu from '@/components/layout/MobileSiteMenu';

function DisabledChip() {
  return (
    <span className="type-caption inline-flex shrink-0 rounded-full bg-zinc-200 px-1.5 py-0.5 text-zinc-500">
      준비중
    </span>
  );
}

function HeaderBellIcon() {
  return <Bell size={23} strokeWidth={2.1} aria-hidden="true" />;
}

type AuthState = {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  loading: boolean;
};

type NotificationEvent = {
  id: string;
  title: string | null;
  message: string | null;
  read_at: string | null;
  created_at: string | null;
  metadata: unknown;
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationEvents, setNotificationEvents] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
    name: null,
    loading: true,
  });
  const [navigationAccount, setNavigationAccount] = useState<{ userId: string; account: NavigationAccount | null } | null>(null);
  const scrolledRef = useRef(false);
  const pathname = usePathname();

  const closeMobileMenu = () => {
    setIsOpen(false);
    setIsNotificationOpen(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Close transient navigation when Next Link changes the route.
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const nextIsScrolled = window.scrollY > 24;
      if (nextIsScrolled === scrolledRef.current) return;
      scrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
      if (nextIsScrolled) setIsNotificationOpen(false);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const updateAuthState = (nextState: AuthState) => {
      if (!isMounted) {
        return;
      }

      setAuthState((currentState) =>
        currentState.isAuthenticated === nextState.isAuthenticated
          && currentState.userId === nextState.userId
          && currentState.email === nextState.email
          && currentState.name === nextState.name
          && currentState.loading === nextState.loading
          ? currentState
          : nextState,
      );
    };

    supabase.auth.getUser().then(({ data }) => {
      updateAuthState({
        isAuthenticated: Boolean(data.user),
        userId: data.user?.id ?? null,
        email: data.user?.email ?? null,
        name: typeof data.user?.user_metadata?.display_name === "string" ? data.user.user_metadata.display_name : null,
        loading: false,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthState({
        isAuthenticated: Boolean(session?.user),
        userId: session?.user.id ?? null,
        email: session?.user.email ?? null,
        name: typeof session?.user.user_metadata?.display_name === "string" ? session.user.user_metadata.display_name : null,
        loading: false,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authState.userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the previous account's transient notification UI after sign-out.
      setNotificationEvents([]);
      setUnreadCount(0);
      setIsNotificationOpen(false);
      return;
    }

    const supabase = createClient();
    let isMounted = true;

    let loadVersion = 0;
    async function loadNotifications(showLoading = true) {
      const version = ++loadVersion;
      const displaySince = getNotificationDisplaySince();
      if (showLoading) setNotificationsLoading(true);

      const [eventsResult, countResult] = await Promise.all([
        supabase
          .from('notification_events' as never)
          .select('id, title, message, read_at, created_at, metadata')
          .eq('user_id' as never, authState.userId as never)
          .in('channel' as never, NOTIFICATION_VISIBLE_CHANNELS as unknown as string[])
          .neq('status' as never, 'skipped' as never)
          .gte('created_at' as never, displaySince as never)
          .order('created_at' as never, { ascending: false } as never)
          .limit(10),
        supabase
          .from('notification_events' as never)
          .select('id', { count: 'exact', head: true })
          .eq('user_id' as never, authState.userId as never)
          .in('channel' as never, NOTIFICATION_VISIBLE_CHANNELS as unknown as string[])
          .neq('status' as never, 'skipped' as never)
          .gte('created_at' as never, displaySince as never)
          .is('read_at' as never, null),
      ]);

      if (!isMounted || version !== loadVersion) {
        return;
      }

      if (!eventsResult.error) {
        setNotificationEvents((eventsResult.data ?? []) as unknown as NotificationEvent[]);
      } else {
        setNotificationEvents([]);
      }

      setUnreadCount(countResult.error ? 0 : countResult.count ?? 0);
      setNotificationsLoading(false);
    }

    const handleReadAll = (event: Event) => {
      const result = getNotificationsReadAll(event);
      if (!result || result.userId !== authState.userId) return;
      setNotificationEvents(events => applyNotificationsReadAll(events, result.readAt));
      setUnreadCount(0);
      void loadNotifications(false);
    };
    void loadNotifications();
    window.addEventListener(NOTIFICATIONS_READ_ALL_EVENT, handleReadAll);
    return () => {
      isMounted = false;
      window.removeEventListener(NOTIFICATIONS_READ_ALL_EVENT, handleReadAll);
    };
  }, [authState.userId]);

  useEffect(() => {
    if (!isOpen || !authState.userId) return;
    const userId = authState.userId;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/account/navigation', { signal: controller.signal, cache: 'no-store' });
        const result = response.ok ? await response.json() as { account: NavigationAccount | null } : { account: null };
        if (!controller.signal.aborted) setNavigationAccount({ userId, account: result.account });
      } catch {
        if (!controller.signal.aborted) setNavigationAccount({ userId, account: null });
      }
    }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [isOpen, authState.userId]);

  const navTextClass = styles.navLink;
  const menuButtonClass = 'text-current hover:opacity-70';
  const accountCtaHref = authState.isAuthenticated ? '/mypage' : '/sign-in';
  const accountCtaLabel = authState.isAuthenticated ? '마이 메뉴' : '로그인·회원가입';
  const showStoreOperations = authState.isAuthenticated && isStoreOperationsAvailable();
  const unreadBadgeLabel = formatNotificationBadgeCount(unreadCount);

  const markNotificationAsRead = async (notificationId: string) => {
    const event = notificationEvents.find((item) => item.id === notificationId);

    if (!event || event.read_at) {
      return;
    }

    setNotificationEvents((events) =>
      events.map((item) => item.id === notificationId ? { ...item, read_at: new Date().toISOString() } : item)
    );
    setUnreadCount((count) => Math.max(0, count - 1));

    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('read failed');
      }
    } catch {
      setNotificationEvents((events) =>
        events.map((item) => item.id === notificationId ? { ...item, read_at: event.read_at } : item)
      );
      setUnreadCount((count) => count + 1);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <nav aria-label="공식 사이트 메뉴" data-site-header data-header-surface={getSiteHeaderSurface(pathname)} data-scrolled={isScrolled} className={styles.shell}>
        <div className={`site-container relative flex h-full items-center justify-between ${styles.panel}`}>
          <Link href="/" className={`group z-50 flex shrink-0 items-center ${styles.brand}`}>
            <span className={styles.wordmark}>ArtiMenu</span>
          </Link>

          <div className={styles.primaryNav}>
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(item, pathname);

              return (
                <div
                  key={item.path}
                  className="relative flex h-full items-center"
                >
                  {item.path === "/faq" ? <SupportNavigation pathname={pathname} /> : <Link
                    href={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={item.disabled ? true : undefined}
                    tabIndex={item.disabled ? -1 : undefined}
                    onClick={(event) => {
                      if (item.disabled) {
                        event.preventDefault();
                      }
                    }}
                    className={`type-nav relative inline-flex items-center gap-1.5 py-2 transition-opacity duration-200 ${
                      item.disabled
                        ? 'pointer-events-none cursor-not-allowed text-current opacity-35'
                        : navTextClass
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.disabled ? <DisabledChip /> : null}
                  </Link>}

                </div>
              );
            })}
          </div>

          <div className={`z-50 flex shrink-0 items-center ${styles.actions}`} data-site-header-actions>
            {!authState.loading ? (
              <Link
                href={accountCtaHref}
                className={`type-nav ${styles.accountLink}`}
                data-site-header-account
              >
                {accountCtaLabel}
              </Link>
            ) : null}
            {showStoreOperations ? (
              <Link
                href="/mypage/operations"
                target="_blank"
                rel="noopener noreferrer"
                aria-current={pathname.startsWith('/mypage/operations') ? 'page' : undefined}
                className={`type-nav gap-1 ${styles.accountLink}`}
                data-site-header-operations
              >
                매장 운영 <NewWindowIndicator />
              </Link>
            ) : null}
            {authState.isAuthenticated ? (
              <div className={styles.notificationGroup}>
                <span className={styles.accountDivider} aria-hidden="true" />
                <Popover open={isNotificationOpen} onOpenChange={setIsNotificationOpen}>
                  <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label="알림"
                    data-site-notification-trigger
                    aria-expanded={isNotificationOpen}
                    className={`site-icon-control relative inline-flex shrink-0 items-center justify-center transition-colors ${styles.notificationButton} `}
                  >
                    <HeaderBellIcon />
                    {unreadCount > 0 ? (
                      <span className="type-caption absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-white">
                        {unreadBadgeLabel}
                      </span>
                    ) : null}
                  </button>

                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={12} collisionPadding={16} className="site-notification-popover" aria-label="알림" data-site-notification-popover>
                    <NotificationPanel compact loading={notificationsLoading} unreadCount={unreadCount} onReadAll={requestNotificationsReadAll}
                      items={notificationEvents.map(event=>({id:event.id,title:event.title ?? '알림',message:event.message ?? '알림 내용을 확인할 수 없습니다.',createdAt:event.created_at,unread:!event.read_at,href:getNotificationHref(event.metadata)}))}
                      onActivate={item=>{void markNotificationAsRead(item.id).finally(()=>{setIsNotificationOpen(false);window.location.assign(item.href);});}}
                      footer={<><p className="site-notification-limit">{NOTIFICATION_COMPACT_NOTICE}</p><Link href={NOTIFICATION_FALLBACK_HREF} onClick={()=>setIsNotificationOpen(false)}>전체 알림 보기</Link></>} />
                  </PopoverContent>
                </Popover>
              </div>
            ) : null}
            <Link
              href="/apply"
              className={`site-button site-button-primary site-button-header`}
            >
              만들기
            </Link>
            {authState.isAuthenticated ? (
              <Link
                href={NOTIFICATION_INBOX_HREF}
                data-site-notification-link
                aria-label={unreadCount > 0 ? `알림, 읽지 않음 ${unreadBadgeLabel}개` : '알림'}
                className={`site-icon-control relative inline-flex shrink-0 items-center justify-center transition-opacity md:hidden ${menuButtonClass} `}
              >
                <HeaderBellIcon />
                {unreadCount > 0 ? (
                  <span className="type-caption absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-white">
                    {unreadBadgeLabel}
                  </span>
                ) : null}
              </Link>
            ) : null}

            <Dialog.Trigger asChild><button
              className={`site-icon-control inline-flex aspect-square shrink-0 items-center justify-center transition-opacity xl:hidden ${menuButtonClass} `}
              aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button></Dialog.Trigger>
          </div>
        </div>
      </nav>

      <Dialog.Portal>
          <Dialog.Overlay className={styles.drawerOverlay} />
          <Dialog.Content className={styles.drawer}>
            <Dialog.Title className="sr-only">아티메뉴 전체 메뉴</Dialog.Title>
            <Dialog.Description className="sr-only">서비스와 계정 메뉴를 선택하세요.</Dialog.Description>
            <MobileSiteMenu pathname={pathname} authenticated={authState.isAuthenticated} loading={authState.loading}
              account={navigationAccount?.userId === authState.userId && navigationAccount.account ? navigationAccount.account : { name: authState.name, email: authState.email ?? '', role: null }}
              accountLoading={Boolean(authState.userId && navigationAccount?.userId !== authState.userId)}
              showOperations={showStoreOperations} unreadCount={unreadCount} close={closeMobileMenu}
              closeButton={<Dialog.Close className="site-button site-button-icon site-button-ghost" aria-label="메뉴 닫기"><X size={24} aria-hidden="true" /></Dialog.Close>} />
          </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default Navbar;

function getNotificationHref(metadata: unknown) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) {
    return NOTIFICATION_FALLBACK_HREF;
  }

  const value = (metadata as { href?: unknown; action_url?: unknown }).href ?? (metadata as { action_url?: unknown }).action_url;

  if (typeof value !== 'string') {
    return NOTIFICATION_FALLBACK_HREF;
  }

  const trimmed = value.trim();

  if (!trimmed || !trimmed.startsWith('/') || trimmed.startsWith('//')) {
    return NOTIFICATION_FALLBACK_HREF;
  }

  return trimmed;
}
