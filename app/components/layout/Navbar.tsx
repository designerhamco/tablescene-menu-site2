import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { formatNotificationBadgeCount, formatNotificationDateTime, NOTIFICATION_FALLBACK_HREF, NOTIFICATION_VISIBLE_CHANNELS } from '@/lib/notification-display-policy';
import { createClient } from '@/lib/supabase/client';

const logoImage = '/assets/tablescene-symbol.png';

type NavItem = {
  label: string;
  path: string;
  activePaths?: readonly string[];
  discount?: boolean;
  disabled?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  {
    label: '아티메뉴 다이닝',
    path: '/',
    activePaths: ['/', '/services/basic', '/services/menu', '/services/signature'],
    discount: true,
  },
  { label: '아티메뉴 디스플레이', path: '/services/display', activePaths: ['/services/display', '/services/screen', '/services/full-option', '/tablescene-pro'] },
  { label: '고객센터', path: '/faq', activePaths: ['/faq', '/support/chat'] },
];

function DiscountChip() {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-[#F8E731] px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
      오픈할인
    </span>
  );
}

function DisabledChip() {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-zinc-200 px-1.5 py-0.5 text-[10px] font-bold leading-none text-zinc-500">
      준비중
    </span>
  );
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
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [notificationEvents, setNotificationEvents] = useState<NotificationEvent[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    userId: null,
    loading: true,
  });
  const isScrolledRef = useRef(false);
  const notificationLayerRef = useRef<HTMLDivElement | null>(null);
  const location = useLocation();
  const pathname = location.pathname;

  const closeMobileMenu = () => {
    setIsOpen(false);
    setIsNotificationOpen(false);
  };

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsOpen(false);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
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

  useEffect(() => {
    if (!isNotificationOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!notificationLayerRef.current?.contains(event.target as Node)) {
        setIsNotificationOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);

    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [isNotificationOpen]);

  useEffect(() => {
    const handleScroll = () => {
      const nextIsScrolled = window.scrollY > 50;

      if (isScrolledRef.current === nextIsScrolled) {
        return;
      }

      isScrolledRef.current = nextIsScrolled;
      setIsScrolled(nextIsScrolled);
    };

    handleScroll();
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const transparentNavPaths = ['/', '/services/basic', '/services/display', '/services/menu', '/services/screen', '/services/signature', '/store'];
  const solidNavPaths = ['/custom', '/services/order', '/services/custom', '/services/simple-template', '/services/pro-v1', '/services/design-customizing'];
  const isApplyPath = pathname === '/apply' || pathname.startsWith('/apply/');
  const navVariant = isApplyPath || solidNavPaths.includes(pathname)
    ? 'solid'
    : transparentNavPaths.includes(pathname)
      ? 'transparent'
      : 'solid';
  const shouldShowSolidNav = navVariant === 'solid' || isScrolled || isOpen;
  const shouldShowDarkNav = navVariant === 'transparent' && isScrolled && !isOpen;

  const navBgClass = shouldShowDarkNav
    ? 'bg-zinc-950/95 backdrop-blur-md border-b border-white/10'
    : shouldShowSolidNav
    ? 'bg-white/90 backdrop-blur-md border-b border-zinc-100'
    : 'bg-transparent border-transparent';
  const navToneClass = shouldShowDarkNav ? 'text-white' : shouldShowSolidNav ? 'text-black' : 'text-white';
  const logoTextClass = 'text-current';
  const navTextClass = shouldShowSolidNav
    ? 'text-current opacity-70 hover:opacity-100'
    : 'text-current opacity-90 hover:opacity-100';
  const menuButtonClass = shouldShowSolidNav ? 'text-current hover:opacity-70' : 'text-current hover:opacity-80';
  const primaryButtonClass = shouldShowDarkNav
    ? 'bg-white hover:bg-zinc-100'
    : shouldShowSolidNav
    ? 'bg-zinc-950 hover:bg-zinc-800'
    : 'bg-white hover:bg-zinc-100';
  const primaryButtonStyle = { color: shouldShowDarkNav ? '#09090b' : shouldShowSolidNav ? '#ffffff' : '#09090b' };
  const secondaryButtonClass = shouldShowDarkNav
    ? 'border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800'
    : shouldShowSolidNav
    ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
    : 'border-zinc-700 bg-zinc-950 text-white hover:bg-zinc-800';
  const accountCtaHref = authState.isAuthenticated ? '/mypage' : '/sign-in';
  const accountCtaLabel = authState.isAuthenticated ? 'MY/메뉴판' : '로그인';
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
    <>
      <nav className={`fixed left-0 right-0 top-0 z-50 h-20 transition-all duration-300 ${navBgClass} ${navToneClass}`}>
        <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link to="/" className="group z-50 flex shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F8E731] transition-transform duration-300 group-hover:scale-105 md:h-10 md:w-10 md:rounded-xl">
              <img
                src={logoImage}
                alt="ArtiMenu Symbol"
                className="h-5 w-5 rotate-45 object-contain md:h-6 md:w-6"
              />
            </div>

            <div className="flex flex-col items-start leading-none">
              <span className={`text-xl font-bold tracking-tighter transition-colors duration-300 md:text-2xl ${logoTextClass}`}>
                ArtiMenu
              </span>
            </div>
          </Link>

          <div className="absolute left-1/2 top-1/2 hidden h-full -translate-x-1/2 -translate-y-1/2 items-center gap-5 lg:flex xl:gap-8">
            {NAV_ITEMS.map((item) => {
              const isActive = (item.activePaths ?? [item.path]).includes(pathname);

              return (
                <div
                  key={item.path}
                  className="relative flex h-full items-center"
                >
                  <Link
                    to={item.path}
                    aria-current={isActive ? 'page' : undefined}
                    aria-disabled={item.disabled ? true : undefined}
                    tabIndex={item.disabled ? -1 : undefined}
                    onClick={(event) => {
                      if (item.disabled) {
                        event.preventDefault();
                      }
                    }}
                    className={`relative inline-flex items-center gap-1.5 py-2 text-[15px] font-bold tracking-tight transition-opacity duration-200 after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:-translate-x-1/2 after:rounded-full after:bg-current after:transition-all ${
                      item.disabled
                        ? 'pointer-events-none cursor-not-allowed text-current opacity-35 after:w-0'
                        : isActive
                          ? 'opacity-100 after:w-6'
                          : `${navTextClass} after:w-0`
                    }`}
                  >
                    <span>{item.label}</span>
                    {item.discount ? <DiscountChip /> : null}
                    {item.disabled ? <DisabledChip /> : null}
                  </Link>

                </div>
              );
            })}
          </div>

          <div className="z-50 flex shrink-0 items-center gap-2 md:gap-3">
            <a
              href="/apply"
              className={`hidden rounded-full px-5 py-2.5 text-sm font-bold transition-colors lg:inline-flex ${primaryButtonClass}`}
              style={primaryButtonStyle}
            >
              만들기
            </a>
            {authState.isAuthenticated ? (
              <div ref={notificationLayerRef} className="relative hidden lg:block">
                <button
                  type="button"
                  aria-label="알림"
                  aria-expanded={isNotificationOpen}
                  onClick={() => setIsNotificationOpen((current) => !current)}
                  className={`relative inline-flex h-10 w-10 items-center justify-center rounded-full border transition-colors ${secondaryButtonClass}`}
                >
                  <Bell size={18} strokeWidth={2.2} aria-hidden="true" />
                  {unreadCount > 0 ? (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-black leading-none text-white">
                      {unreadBadgeLabel}
                    </span>
                  ) : null}
                </button>

                {isNotificationOpen ? (
                  <div className="absolute right-0 top-12 w-[360px] overflow-hidden rounded-2xl border border-zinc-200 bg-white text-zinc-950 shadow-2xl">
                    <div className="flex items-center justify-between border-b border-zinc-100 px-4 py-3">
                      <p className="text-sm font-black">알림</p>
                      {unreadCount > 0 ? <p className="text-xs font-bold text-zinc-400">읽지 않음 {unreadBadgeLabel}</p> : null}
                    </div>
                    <div className="max-h-[420px] overflow-y-auto">
                      {notificationsLoading ? (
                        <p className="px-4 py-8 text-center text-sm font-bold text-zinc-400">알림을 불러오는 중입니다.</p>
                      ) : notificationEvents.length > 0 ? (
                        <div className="divide-y divide-zinc-100">
                          {notificationEvents.map((event) => (
                            <NotificationItem
                              key={event.id}
                              event={event}
                              onRead={markNotificationAsRead}
                              onNavigate={() => setIsNotificationOpen(false)}
                            />
                          ))}
                        </div>
                      ) : (
                        <p className="px-4 py-8 text-center text-sm font-bold text-zinc-400">새 알림이 없습니다.</p>
                      )}
                    </div>
                    <a
                      href={NOTIFICATION_FALLBACK_HREF}
                      onClick={() => setIsNotificationOpen(false)}
                      className="block border-t border-zinc-100 px-4 py-3 text-center text-sm font-black text-zinc-900 transition-colors hover:bg-zinc-50"
                    >
                      전체 알림 보기
                    </a>
                  </div>
                ) : null}
              </div>
            ) : null}
            {!authState.loading ? (
              <a
                href={accountCtaHref}
                className={`hidden rounded-full border px-5 py-2.5 text-sm font-bold transition-colors lg:inline-flex ${secondaryButtonClass}`}
              >
                {accountCtaLabel}
              </a>
            ) : null}
            {authState.isAuthenticated ? (
              <a
                href={NOTIFICATION_FALLBACK_HREF}
                aria-label={unreadCount > 0 ? `알림, 읽지 않음 ${unreadBadgeLabel}개` : '알림'}
                className={`relative inline-flex p-1 transition-opacity lg:hidden ${menuButtonClass}`}
              >
                <Bell size={23} strokeWidth={2.1} aria-hidden="true" />
                {unreadCount > 0 ? (
                  <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-black leading-none text-white">
                    {unreadBadgeLabel}
                  </span>
                ) : null}
              </a>
            ) : null}

            <button
              className={`p-1 transition-opacity lg:hidden ${menuButtonClass}`}
              onClick={() => setIsOpen((currentIsOpen) => !currentIsOpen)}
              aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
              aria-expanded={isOpen}
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>
      </nav>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 top-20 z-40 bg-white"
          >
            <div className="flex h-full flex-col overflow-y-auto pb-10">
              <div className="flex-1 px-6 py-6">
                <div className="mb-6 grid grid-cols-2 gap-2 border-b border-zinc-100 pb-6">
                  <a
                    href="/apply"
                    onClick={closeMobileMenu}
                    className={`flex items-center justify-center rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white ${authState.isAuthenticated ? 'col-span-2' : ''}`}
                  >
                    만들기
                  </a>
                  {!authState.loading ? (
                    <a
                      href={accountCtaHref}
                      onClick={closeMobileMenu}
                      className="flex items-center justify-center rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800"
                    >
                      {accountCtaLabel}
                    </a>
                  ) : null}
                </div>

                <nav aria-label="모바일 공식 사이트 메뉴" className="grid gap-1">
                  {NAV_ITEMS.map((item) => {
                    const isActive = (item.activePaths ?? [item.path]).includes(pathname);

                    return (
                      <Link
                        key={item.path}
                        to={item.path}
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
                        className={`flex items-center justify-between gap-3 border-b border-zinc-100 py-6 text-2xl font-bold leading-[1.2] tracking-tight transition-colors ${
                          item.disabled ? 'pointer-events-none cursor-not-allowed text-zinc-400' : isActive ? 'text-zinc-950' : 'text-zinc-600 active:text-zinc-950'
                        }`}
                      >
                        <span>{item.label}</span>
                        <span className="flex shrink-0 items-center gap-2">
                          {item.discount ? <DiscountChip /> : null}
                          {item.disabled ? <DisabledChip /> : null}
                        </span>
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="mt-auto px-6 py-8">
                <div className="border-t border-zinc-100 pt-6">
                  <div className="mb-5 flex items-center gap-4 text-xs font-bold text-zinc-500">
                    <a
                      href="/mypage/inquiries"
                      onClick={closeMobileMenu}
                      className="underline decoration-zinc-300 underline-offset-4 transition-colors active:text-zinc-950"
                    >
                      1:1 문의
                    </a>
                    <a
                      href="/support/chat"
                      onClick={closeMobileMenu}
                      className="underline decoration-zinc-300 underline-offset-4 transition-colors active:text-zinc-950"
                    >
                      채팅상담
                    </a>
                  </div>
                  <div className="flex flex-col gap-1 text-xs font-medium tracking-tight text-zinc-400">
                    <p className="mb-1 text-sm font-bold text-zinc-900">ArtiMenu Studio</p>
                    <p>admin@dndcommerce.co.kr</p>
                    <p className="mt-1 opacity-60">© 2026 ArtiMenu. All rights reserved.</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
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

function formatNotificationTime(value: string | null) {
  if (!value) {
    return '방금 전';
  }

  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return '방금 전';
  }

  const diffMs = Date.now() - date.getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) return '방금 전';
  if (diffMinutes < 60) return `${diffMinutes}분 전`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}시간 전`;

  return formatNotificationDateTime(date);
}

function NotificationItem({
  event,
  onRead,
  onNavigate,
}: {
  event: NotificationEvent;
  onRead: (notificationId: string) => Promise<void>;
  onNavigate: () => void;
}) {
  const href = getNotificationHref(event.metadata);

  return (
    <a
      href={href}
      onClick={(clickEvent) => {
        clickEvent.preventDefault();
        onRead(event.id).finally(() => {
          onNavigate();
          window.location.assign(href);
        });
      }}
      className="flex gap-3 px-4 py-3 text-left transition-colors hover:bg-zinc-50"
    >
      <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${event.read_at ? 'bg-zinc-200' : 'bg-red-500'}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-black text-zinc-900">{event.title ?? '알림'}</span>
        <span className="mt-1 line-clamp-2 break-keep text-xs font-semibold leading-relaxed text-zinc-500">
          {event.message ?? '알림 내용을 확인할 수 없습니다.'}
        </span>
        <span className="mt-2 block text-[11px] font-bold text-zinc-400">{formatNotificationTime(event.created_at)}</span>
      </span>
    </a>
  );
}
