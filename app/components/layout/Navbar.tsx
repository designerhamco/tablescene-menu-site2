import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Bell, ChevronRight, Menu, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { formatNotificationBadgeCount, NOTIFICATION_FALLBACK_HREF, NOTIFICATION_INBOX_HREF, NOTIFICATION_VISIBLE_CHANNELS } from '@/lib/notification-display-policy';
import { createClient } from '@/lib/supabase/client';
import { supportsGlassSiteHeader } from '@/lib/site-header-policy';
import { isStoreOperationsAvailable } from '@/lib/product-focus-policy';
import { NotificationPanel } from '@/app/components/ui/notification-panel';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import styles from './Navbar.module.css';

type NavItem = {
  label: string;
  path: string;
  activePaths?: readonly string[];
  disabled?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  {
    label: '베이직',
    path: '/services/basic',
    activePaths: ['/services/basic', '/services/menu', '/services/signature'],
  },
  { label: '다이닝', path: '/services/dining', activePaths: ['/services/dining'] },
  { label: '디스플레이', path: '/services/display', activePaths: ['/services/display', '/services/screen', '/services/full-option', '/tablescene-pro'] },
  { label: '디자인 템플릿', path: '/templates', activePaths: ['/templates'] },
  { label: '고객센터', path: '/faq', activePaths: ['/faq', '/support/chat'] },
];

function isNavItemActive(item: NavItem, pathname: string) {
  return (item.activePaths ?? [item.path]).some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

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
  const [isTabletOrDesktop, setIsTabletOrDesktop] = useState(false);
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationEvents, setNotificationEvents] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    loading: true,
  });
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
      setIsTabletOrDesktop(window.innerWidth >= 768);
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
          && currentState.loading === nextState.loading
          ? currentState
          : nextState,
      );
    };

    supabase.auth.getUser().then(({ data }) => {
      updateAuthState({
        isAuthenticated: Boolean(data.user),
        userId: data.user?.id ?? null,
        loading: false,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthState({
        isAuthenticated: Boolean(session?.user),
        userId: session?.user.id ?? null,
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

    async function loadNotifications() {
      setNotificationsLoading(true);

      const [eventsResult, countResult] = await Promise.all([
        supabase
          .from('notification_events' as never)
          .select('id, title, message, read_at, created_at, metadata')
          .eq('user_id' as never, authState.userId as never)
          .in('channel' as never, NOTIFICATION_VISIBLE_CHANNELS as unknown as string[])
          .neq('status' as never, 'skipped' as never)
          .order('created_at' as never, { ascending: false } as never)
          .limit(10),
        supabase
          .from('notification_events' as never)
          .select('id', { count: 'exact', head: true })
          .eq('user_id' as never, authState.userId as never)
          .in('channel' as never, NOTIFICATION_VISIBLE_CHANNELS as unknown as string[])
          .neq('status' as never, 'skipped' as never)
          .is('read_at' as never, null),
      ]);

      if (!isMounted) {
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

    loadNotifications();

    return () => {
      isMounted = false;
    };
  }, [authState.userId]);

  const isFloating = supportsGlassSiteHeader(pathname) && isTabletOrDesktop && isScrolled && !isOpen;
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
      <nav aria-label="공식 사이트 메뉴" data-site-header data-floating={isFloating} className={styles.shell}>
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
                  <Link
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
                  </Link>

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
                aria-current={pathname.startsWith('/mypage/operations') ? 'page' : undefined}
                className={`type-nav ${styles.accountLink}`}
                data-site-header-operations
              >
                매장 운영
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
                    className={`relative inline-flex size-10 min-h-10 min-w-10 shrink-0 items-center justify-center p-0 transition-colors ${styles.notificationButton}`}
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
                    <NotificationPanel compact loading={notificationsLoading}
                      items={notificationEvents.map(event=>({id:event.id,title:event.title ?? '알림',message:event.message ?? '알림 내용을 확인할 수 없습니다.',createdAt:event.created_at,unread:!event.read_at,href:getNotificationHref(event.metadata)}))}
                      onActivate={item=>{void markNotificationAsRead(item.id).finally(()=>{setIsNotificationOpen(false);window.location.assign(item.href);});}}
                      footer={<><p className="site-notification-limit">최근 알림을 최대 10개까지 표시합니다.</p><Link href={NOTIFICATION_FALLBACK_HREF} onClick={()=>setIsNotificationOpen(false)}>전체 알림 보기</Link></>} />
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
                className={`relative inline-flex size-9 min-h-9 min-w-9 shrink-0 items-center justify-center rounded-full p-0 transition-opacity md:hidden ${menuButtonClass}`}
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
              className={`inline-flex aspect-square h-9 w-9 shrink-0 items-center justify-center p-0 transition-opacity xl:hidden ${menuButtonClass}`}
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
            <div className={`flex items-center justify-between ${styles.drawerHeader}`}>
              <Link href="/" onClick={closeMobileMenu} className={styles.wordmark}>ArtiMenu</Link>
              <Dialog.Close className="site-button site-button-icon site-button-ghost" aria-label="메뉴 닫기"><X size={24} /></Dialog.Close>
            </div>
            <div className={styles.drawerBody}>
              <div className={styles.drawerMain}>
                <div className={styles.drawerActions}>
                  {showStoreOperations ? (
                    <>
                      <Link
                        href={accountCtaHref}
                        onClick={closeMobileMenu}
                        className={`site-button site-button-secondary ${styles.drawerAction}`}
                      >
                        {accountCtaLabel}
                      </Link>
                      <Link
                        href="/mypage/operations"
                        onClick={closeMobileMenu}
                        className={`site-button site-button-secondary ${styles.drawerAction}`}
                      >
                        매장 운영
                      </Link>
                      <Link
                        href="/apply"
                        onClick={closeMobileMenu}
                        className={`site-button site-button-primary ${styles.drawerAction} ${styles.drawerActionWide}`}
                      >
                        만들기
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link
                        href="/apply"
                        onClick={closeMobileMenu}
                        className={`site-button site-button-primary ${styles.drawerAction} ${styles.drawerActionWide}`}
                      >
                        만들기
                      </Link>
                      {!authState.loading ? (
                        <Link
                          href={accountCtaHref}
                          onClick={closeMobileMenu}
                          className={`site-button site-button-secondary ${styles.drawerAction} ${styles.drawerActionWide}`}
                        >
                          {accountCtaLabel}
                        </Link>
                      ) : null}
                    </>
                  )}
                </div>

                <nav aria-label="모바일 공식 사이트 메뉴" className={styles.drawerNavigation}>
                  {NAV_ITEMS.map((item) => {
                    const isActive = isNavItemActive(item, pathname);

                    return (
                      <Link
                        key={item.path}
                        href={item.path}
                        aria-current={isActive ? 'page' : undefined}
                        aria-disabled={item.disabled ? true : undefined}
                        tabIndex={item.disabled ? -1 : undefined}
                        onClick={(event) => {
                          if (item.disabled) {
                            event.preventDefault();
                            return;
                          }

                          closeMobileMenu();
                        }}
                        data-active={isActive ? 'true' : undefined}
                        className={`${styles.drawerNavLink} ${item.disabled ? styles.drawerNavLinkDisabled : ''}`}
                      >
                        <span>{item.label}</span>
                        <span className={styles.drawerNavMeta}>
                          {item.disabled ? <DisabledChip /> : null}
                          {!item.disabled ? <ChevronRight aria-hidden="true" /> : null}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className={styles.drawerFooter}>
                <div className={styles.drawerSupport}>
                  <div className={styles.drawerSupportLinks}>
                    <Link
                      href="/mypage/inquiries"
                      onClick={closeMobileMenu}
                    >
                      1:1 문의
                    </Link>
                    <Link
                      href="/support/chat"
                      onClick={closeMobileMenu}
                    >
                      채팅상담
                    </Link>
                  </div>
                  <div className={styles.drawerIdentity}>
                    <p>ArtiMenu Studio</p>
                    <p>admin@dndcommerce.co.kr</p>
                    <p>© 2026 ArtiMenu. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </div>
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
