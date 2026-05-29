import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { Link, useLocation } from 'react-router';

import { KAKAO_CHANNEL_URL } from '../ui/ScrollToTop';
import { createClient } from '@/lib/supabase/client';

const logoImage = '/assets/tablescene-symbol.png';

const NAV_ITEMS = [
  { label: '메뉴링크 베이직', path: '/services/basic', discount: true },
  { label: '메뉴링크 디스플레이', path: '/services/display', discount: true },
  { label: '비주얼 스튜디오', path: '/branding/visual-studio', disabled: true },
] as const;

function DiscountChip() {
  return (
    <span className="inline-flex shrink-0 rounded-full bg-[#F8E731] px-1.5 py-0.5 text-[10px] font-bold leading-none text-black">
      50%
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
  loading: boolean;
};

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    loading: true,
  });
  const isScrolledRef = useRef(false);
  const location = useLocation();
  const pathname = location.pathname;

  const closeMobileMenu = () => setIsOpen(false);

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
        currentState.isAuthenticated === nextState.isAuthenticated && currentState.loading === nextState.loading
          ? currentState
          : nextState,
      );
    };

    supabase.auth.getUser().then(({ data }) => {
      updateAuthState({
        isAuthenticated: Boolean(data.user),
        loading: false,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthState({
        isAuthenticated: Boolean(session?.user),
        loading: false,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

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
  const solidNavPaths = ['/services/order', '/services/custom', '/services/simple-template', '/services/pro-v1', '/services/design-customizing'];
  const isApplyPath = pathname === '/apply' || pathname.startsWith('/apply/');
  const navVariant = isApplyPath || solidNavPaths.includes(pathname)
    ? 'solid'
    : transparentNavPaths.includes(pathname)
      ? 'transparent'
      : 'solid';
  const shouldShowSolidNav = navVariant === 'solid' || isScrolled || isOpen;

  const navBgClass = shouldShowSolidNav
    ? 'bg-white/90 backdrop-blur-md border-b border-zinc-100'
    : 'bg-transparent border-transparent';
  const navToneClass = shouldShowSolidNav ? 'text-black' : 'text-white';
  const logoTextClass = 'text-current';
  const navTextClass = shouldShowSolidNav
    ? 'text-current opacity-70 hover:opacity-100'
    : 'text-current opacity-90 hover:opacity-100';
  const menuButtonClass = shouldShowSolidNav ? 'text-current hover:opacity-70' : 'text-current hover:opacity-80';
  const primaryButtonClass = shouldShowSolidNav
    ? 'bg-zinc-950 hover:bg-zinc-800'
    : 'bg-white hover:bg-white/90';
  const primaryButtonStyle = { color: shouldShowSolidNav ? '#ffffff' : '#09090b' };
  const secondaryButtonClass = shouldShowSolidNav
    ? 'border-zinc-200 bg-white text-zinc-800 hover:bg-zinc-50'
    : 'border-white/30 bg-white/10 text-white hover:bg-white/15';
  const accountCtaHref = authState.isAuthenticated ? '/mypage' : '/sign-in';
  const accountCtaLabel = authState.isAuthenticated ? '마이페이지' : '로그인';

  return (
    <>
      <nav className={`fixed left-0 right-0 top-0 z-50 h-20 transition-all duration-300 ${navBgClass} ${navToneClass}`}>
        <div className="relative mx-auto flex h-full max-w-7xl items-center justify-between px-6">
          <Link to="/" className="group z-50 flex shrink-0 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-[#F8E731] transition-transform duration-300 group-hover:scale-105 md:h-10 md:w-10 md:rounded-xl">
              <img
                src={logoImage}
                alt="MenuLink Symbol"
                className="h-5 w-5 rotate-45 object-contain md:h-6 md:w-6"
              />
            </div>

            <div className="flex flex-col items-start leading-none">
              <span className={`text-xl font-bold tracking-tighter transition-colors duration-300 md:text-2xl ${logoTextClass}`}>
                MENULINK
              </span>
            </div>
          </Link>

          <div className="absolute left-1/2 top-1/2 hidden h-full -translate-x-1/2 -translate-y-1/2 items-center gap-5 lg:flex xl:gap-8">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                aria-disabled={item.disabled ? true : undefined}
                tabIndex={item.disabled ? -1 : undefined}
                onClick={(event) => {
                  if (item.disabled) {
                    event.preventDefault();
                  }
                }}
                className={`inline-flex items-center gap-1.5 py-2 text-[15px] font-bold tracking-tight transition-opacity duration-200 ${
                  item.disabled ? 'pointer-events-none cursor-not-allowed text-current opacity-35' : navTextClass
                }`}
              >
                <span>{item.label}</span>
                {item.discount ? <DiscountChip /> : null}
                {item.disabled ? <DisabledChip /> : null}
              </Link>
            ))}
          </div>

          <div className="z-50 flex shrink-0 items-center gap-2 md:gap-3">
            <a
              href="/apply"
              className={`hidden rounded-full px-5 py-2.5 text-sm font-bold transition-colors lg:inline-flex ${primaryButtonClass}`}
              style={primaryButtonStyle}
            >
              만들기
            </a>
            {!authState.loading ? (
              <a
                href={accountCtaHref}
                className={`hidden rounded-full border px-5 py-2.5 text-sm font-bold transition-colors lg:inline-flex ${secondaryButtonClass}`}
              >
                {accountCtaLabel}
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
                    className="flex items-center justify-center rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white"
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
                  <a
                    href={KAKAO_CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={closeMobileMenu}
                    className="col-span-2 flex items-center justify-center rounded-2xl border border-[#F8E731]/70 bg-[#F8E731]/15 px-4 py-3 text-sm font-bold text-zinc-900"
                  >
                    카카오톡 상담
                  </a>
                </div>

                <nav aria-label="모바일 공식 사이트 메뉴" className="grid gap-1">
                  {NAV_ITEMS.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      aria-disabled={item.disabled ? true : undefined}
                      tabIndex={item.disabled ? -1 : undefined}
                      onClick={(event) => {
                        if (item.disabled) {
                          event.preventDefault();
                          return;
                        }

                        closeMobileMenu();
                      }}
                      className={`flex items-center justify-between gap-3 border-b border-zinc-100 py-5 text-2xl font-bold tracking-tight transition-colors ${
                        item.disabled ? 'pointer-events-none cursor-not-allowed text-zinc-400' : 'text-zinc-900 active:text-zinc-500'
                      }`}
                    >
                      <span>{item.label}</span>
                      <span className="flex shrink-0 items-center gap-1.5">
                        {item.discount ? <DiscountChip /> : null}
                        {item.disabled ? <DisabledChip /> : null}
                      </span>
                    </Link>
                  ))}
                </nav>
              </div>

              <div className="mt-auto px-6 py-8">
                <div className="border-t border-zinc-100 pt-6">
                  <div className="flex flex-col gap-0.5 text-[10px] font-medium tracking-tight text-zinc-400">
                    <p className="mb-1 text-xs font-bold text-zinc-900">MENULINK Studio</p>
                    <p>admin@dndcommerce.co.kr</p>
                    <p className="mt-1 opacity-60">© 2026 MenuLink. All rights reserved.</p>
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
