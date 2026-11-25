import React, { useEffect, useRef, useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Menu, X } from "@/app/components/ui/site-icon";
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { formatNotificationBadgeCount, getNotificationDisplaySince, NOTIFICATION_COMPACT_NOTICE, NOTIFICATION_FALLBACK_HREF, NOTIFICATION_VISIBLE_CHANNELS } from '@/lib/notification-display-policy';
import { createClient } from '@/lib/supabase/client';
import { getSiteHeaderSurface } from '@/lib/site-header-policy';
import { useHomeHeaderSurface } from '@/components/layout/useHomeHeaderSurface';
import { useActiveHomeService } from '@/components/layout/useActiveHomeService';
import ServiceHomeLink from '@/components/layout/ServiceHomeLink';
import { applyNotificationsReadAll, getNotificationsReadAll, NOTIFICATIONS_READ_ALL_EVENT, requestNotificationsReadAll } from '@/lib/notification-read-state';
import { isStoreOperationsAvailable } from '@/lib/product-focus-policy';
import { NotificationPanel } from '@/app/components/ui/notification-panel';
import { NotificationSheet } from '@/app/components/ui/notification-sheet';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import styles from './Navbar.module.css';
import { NewWindowIndicator } from '@/app/components/ui/new-window-indicator';
import SupportNavigation from '@/components/layout/SupportNavigation';
import { SITE_NAV_ITEMS as NAV_ITEMS, isSiteNavItemActive as isNavItemActive, type NavigationAccount } from '@/lib/site-navigation';
import MobileSiteMenu from '@/components/layout/MobileSiteMenu';
import HomeStartLink from '@/components/layout/HomeStartLink';
import { NotificationBellIcon } from '@/app/components/ui/notification-bell-icon';
import AccountMenuPanel from '@/components/account/AccountMenuPanel';
import ProfileAvatar from '@/components/account/ProfileAvatar';
import { ACCOUNT_PROFILE_UPDATED_EVENT, getAccountAvatarUrl } from '@/lib/account-profile';

function DisabledChip() {
  return (
    <span className="type-caption inline-flex shrink-0 rounded-full bg-zinc-200 px-1.5 py-0.5 text-zinc-500">
      준비중
    </span>
  );
}

type AuthState = {
  isAuthenticated: boolean;
  userId: string | null;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
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
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [accountLoadVersion, setAccountLoadVersion] = useState(0);
  const isMobile = useIsMobile();
  const mobileNotificationTrigger = useRef<HTMLButtonElement>(null);
  const desktopNotificationTrigger = useRef<HTMLButtonElement>(null);
  const [notificationEvents, setNotificationEvents] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    email: null,
    name: null,
    avatarUrl: null,
    loading: true,
  });
  const [navigationAccount, setNavigationAccount] = useState<{ userId: string; account: NavigationAccount | null; failed?: boolean } | null>(null);
  const scrolledRef = useRef(false);
  const pathname = usePathname();
  const homeHeaderSurface = useHomeHeaderSurface(pathname);
  const homeHeroHeader = homeHeaderSurface === "dark-overlay";
  const activeHomeService = useActiveHomeService(pathname);

  const closeMobileMenu = () => {
    setIsOpen(false);
    setIsNotificationOpen(false);
    setIsAccountMenuOpen(false);
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Close transient navigation when Next Link changes the route.
    setIsOpen(false);
    setIsNotificationOpen(false);
    setIsAccountMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1280) {
        setIsOpen(false);
      } else {
        setIsAccountMenuOpen(false);
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
      if (nextIsScrolled && !isMobile) setIsNotificationOpen(false);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isMobile]);

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
          && currentState.avatarUrl === nextState.avatarUrl
          && currentState.loading === nextState.loading
          ? currentState
          : nextState,
      );
    };

    const loadAuth = () => supabase.auth.getUser().then(({ data }) => {
      updateAuthState({
        isAuthenticated: Boolean(data.user),
        userId: data.user?.id ?? null,
        email: data.user?.email ?? null,
        name: typeof data.user?.user_metadata?.display_name === "string" ? data.user.user_metadata.display_name : null,
        avatarUrl: data.user ? getAccountAvatarUrl(data.user.id, data.user.user_metadata) : null,
        loading: false,
      });
    });
    void loadAuth();
    const profileUpdated = () => { void loadAuth(); setNavigationAccount(null); setAccountLoadVersion(version => version + 1); };
    window.addEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, profileUpdated);

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthState({
        isAuthenticated: Boolean(session?.user),
        userId: session?.user.id ?? null,
        email: session?.user.email ?? null,
        name: typeof session?.user.user_metadata?.display_name === "string" ? session.user.user_metadata.display_name : null,
        avatarUrl: session?.user ? getAccountAvatarUrl(session.user.id, session.user.user_metadata) : null,
        loading: false,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      window.removeEventListener(ACCOUNT_PROFILE_UPDATED_EVENT, profileUpdated);
    };
  }, []);

  useEffect(() => {
    if (!authState.userId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- Clear the previous account's transient notification UI after sign-out.
      setNotificationEvents([]);
      setUnreadCount(0);
      setIsNotificationOpen(false);
      setIsAccountMenuOpen(false);
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
    if ((!isOpen && !isAccountMenuOpen) || !authState.userId) return;
    const userId = authState.userId;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/account/navigation', { signal: controller.signal, cache: 'no-store' });
        const result = response.ok ? await response.json() as { account: NavigationAccount | null } : { account: null };
        if (!controller.signal.aborted) setNavigationAccount({ userId, account: result.account, failed: !response.ok });
      } catch {
        if (!controller.signal.aborted) setNavigationAccount({ userId, account: null, failed: true });
      }
    }, 0);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [isOpen, isAccountMenuOpen, authState.userId, accountLoadVersion]);

  const currentAccount = navigationAccount?.userId === authState.userId ? navigationAccount : null;
  const accountIdentity: NavigationAccount = currentAccount?.account
    ? { ...currentAccount.account, avatarUrl: authState.avatarUrl }
    : { name: authState.name, email: authState.email ?? '', role: null, avatarUrl: authState.avatarUrl };

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

  const notificationPanel = (sheet = false) => <NotificationPanel compact layout={sheet ? "sheet" : undefined}
    loading={notificationsLoading} unreadCount={unreadCount} onReadAll={requestNotificationsReadAll}
    items={notificationEvents.map(event=>({id:event.id,title:event.title ?? '알림',message:event.message ?? '알림 내용을 확인할 수 없습니다.',createdAt:event.created_at,unread:!event.read_at,href:getNotificationHref(event.metadata)}))}
    onActivate={item=>{void markNotificationAsRead(item.id).finally(()=>{setIsNotificationOpen(false);window.location.assign(item.href);});}}
    footer={<><p className="site-notification-limit">{NOTIFICATION_COMPACT_NOTICE}</p><Link href={NOTIFICATION_FALLBACK_HREF} onClick={()=>setIsNotificationOpen(false)}>전체 알림 보기</Link></>} />;

  const openNotificationsFromMenu = () => {
    setIsOpen(false);
    setIsNotificationOpen(true);
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={setIsOpen}>
      <nav aria-label="공식 사이트 메뉴" data-site-header data-header-surface={getSiteHeaderSurface(pathname)} data-scrolled={isScrolled} data-home-hero={homeHeroHeader} data-home-basic-approach={homeHeaderSurface === "clear" || undefined} className={styles.shell}>
        <div className={`site-container relative flex h-full items-center justify-between ${styles.panel}`}>
          <HomeStartLink className={`group z-50 flex shrink-0 items-center ${styles.brand}`}>
            <span className={styles.wordmark}>ArtiMenu</span>
          </HomeStartLink>

          <div className={styles.primaryNav}>
            {NAV_ITEMS.map((item) => {
              const isActive = isNavItemActive(item, pathname, activeHomeService);

              return (
                <div
                  key={item.path}
                  className="relative flex h-full items-center"
                >
                  {item.path === "/faq" ? <SupportNavigation pathname={pathname} /> : <ServiceHomeLink
                    href={item.path}
                    instant
                    aria-current={isActive ? item.sectionId ? 'location' : 'page' : undefined}
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
                  </ServiceHomeLink>}

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
                <Popover open={!isMobile && isNotificationOpen} onOpenChange={open => { setIsNotificationOpen(open); if (open) setIsAccountMenuOpen(false); }}>
                  <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={unreadCount > 0 ? `알림, 읽지 않음 ${unreadBadgeLabel}개` : '알림'}
                    ref={desktopNotificationTrigger}
                    data-site-notification-trigger
                    aria-expanded={isNotificationOpen}
                    className={`site-icon-control relative inline-flex shrink-0 items-center justify-center transition-colors ${styles.notificationButton} `}
                  >
                    <NotificationBellIcon unreadCount={unreadCount} />
                  </button>

                  </PopoverTrigger>
                  <PopoverContent align="end" sideOffset={12} collisionPadding={16} className="site-notification-popover" aria-label="알림" data-site-notification-popover>
                    {notificationPanel()}
                  </PopoverContent>
                </Popover>
              </div>
            ) : null}
            <Link
              href="/apply"
              className={`site-button ${homeHeroHeader ? "site-button-secondary" : "site-button-primary"} site-button-header`}
            >
              만들기
            </Link>
            {authState.isAuthenticated && authState.userId ? <Popover open={isAccountMenuOpen} onOpenChange={open => { setIsAccountMenuOpen(open); if (open) setIsNotificationOpen(false); }}>
              <PopoverTrigger asChild><button type="button" aria-label="프로필 · 계정 메뉴" className={`site-icon-control ${styles.profileTrigger}`} data-site-profile-trigger>
                <ProfileAvatar userId={authState.userId} imageUrl={authState.avatarUrl} />
              </button></PopoverTrigger>
              <PopoverContent align="end" sideOffset={12} collisionPadding={16} className="site-account-popover" aria-label="계정 메뉴">
                <AccountMenuPanel userId={authState.userId} account={accountIdentity} loading={!currentAccount}
                  failed={Boolean(currentAccount?.failed)} retry={() => { setNavigationAccount(null); setAccountLoadVersion(version => version + 1); }} close={() => setIsAccountMenuOpen(false)} />
              </PopoverContent>
            </Popover> : null}
            {authState.isAuthenticated ? (
              <button
                type="button"
                ref={mobileNotificationTrigger}
                onClick={() => setIsNotificationOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={isMobile && isNotificationOpen}
                data-site-notification-mobile-trigger
                aria-label={unreadCount > 0 ? `알림, 읽지 않음 ${unreadBadgeLabel}개` : '알림'}
                className={`site-icon-control relative inline-flex shrink-0 items-center justify-center transition-opacity md:hidden ${menuButtonClass} `}
              >
                <NotificationBellIcon unreadCount={unreadCount} compact />
              </button>
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
          <Dialog.Content className={styles.drawer} onCloseAutoFocus={event => { if (isNotificationOpen) event.preventDefault(); }}>
            <Dialog.Title className="sr-only">아티메뉴 전체 메뉴</Dialog.Title>
            <Dialog.Description className="sr-only">서비스와 계정 메뉴를 선택하세요.</Dialog.Description>
            <MobileSiteMenu pathname={pathname} activeSection={activeHomeService} authenticated={authState.isAuthenticated} loading={authState.loading}
              account={accountIdentity} userId={authState.userId}
              accountLoading={Boolean(authState.userId && navigationAccount?.userId !== authState.userId)}
              showOperations={showStoreOperations} unreadCount={unreadCount} close={closeMobileMenu} onNotifications={openNotificationsFromMenu}
              closeButton={<Dialog.Close className="site-button site-button-icon site-button-ghost" aria-label="메뉴 닫기"><X size={24} aria-hidden="true" /></Dialog.Close>} />
          </Dialog.Content>
      </Dialog.Portal>
      <NotificationSheet open={isMobile && isNotificationOpen} onOpenChange={setIsNotificationOpen}
        returnFocusRef={isMobile ? mobileNotificationTrigger : desktopNotificationTrigger}>
        {notificationPanel(true)}
      </NotificationSheet>
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
