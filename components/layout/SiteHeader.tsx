"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { LogIn, Menu, ShoppingCart, User, UserPlus, X } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type AuthState = {
  email: string | null;
  loading: boolean;
};

type SiteHeaderVariant = "solid" | "transparent";

const navItems = [
  { label: "테이블씬 베이직", href: "/services/basic" },
  { label: "비주얼 스튜디오", href: "/branding/visual-studio" },
  { label: "스토어", href: "/store" },
];

function useAuthState() {
  const [authState, setAuthState] = useState<AuthState>({
    email: null,
    loading: true,
  });

  useEffect(() => {
    const supabase = createClient();
    let isMounted = true;

    const updateAuthState = (nextState: AuthState) => {
      if (!isMounted) {
        return;
      }

      setAuthState((currentState) =>
        currentState.email === nextState.email && currentState.loading === nextState.loading
          ? currentState
          : nextState,
      );
    };

    supabase.auth.getUser().then(({ data }) => {
      updateAuthState({
        email: data.user?.email ?? null,
        loading: false,
      });
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      updateAuthState({
        email: session?.user.email ?? null,
        loading: false,
      });
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return authState;
}

function IconLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex items-center justify-center p-1 text-current transition-opacity hover:opacity-70"
    >
      {children}
    </Link>
  );
}

function BrandLogo({ isSolid }: { isSolid: boolean }) {
  const logoTextClass = isSolid ? "text-zinc-950" : "text-white";
  const logoSubTextClass = isSolid ? "text-zinc-500" : "text-white/70";

  return (
    <Link href="/" aria-label="Table Scene 홈" className="flex shrink-0 items-center gap-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8E731]">
        <Image
          src="/assets/tablescene-symbol.png"
          alt=""
          width={24}
          height={24}
          className="rotate-45 object-contain"
          priority
        />
      </span>
      <span className="flex flex-col leading-none">
        <span className={`text-xl font-black tracking-tight transition-colors ${logoTextClass}`}>TABLE SCENE</span>
        <span className={`mt-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] transition-colors ${logoSubTextClass}`}>Studio</span>
      </span>
    </Link>
  );
}

export default function SiteHeader({ variant = "solid" }: { variant?: SiteHeaderVariant }) {
  const authState = useAuthState();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isTransparentVariant = variant === "transparent";
  const isSolid = !isTransparentVariant || isScrolled || isMenuOpen;

  useEffect(() => {
    if (!isTransparentVariant) {
      return;
    }

    const handleScroll = () => {
      const nextIsScrolled = window.scrollY > 24;
      setIsScrolled((current) => (current === nextIsScrolled ? current : nextIsScrolled));
    };

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [isTransparentVariant]);

  const headerClass = isSolid
    ? "border-zinc-100 bg-white/95 text-zinc-900 backdrop-blur"
    : "border-transparent bg-transparent text-white";

  return (
    <header className={`sticky top-0 z-[80] border-b transition-colors duration-300 ${headerClass}`}>
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-5 sm:px-6">
        <BrandLogo isSolid={isSolid} />

        <nav aria-label="공식 사이트 메뉴" className="hidden items-center gap-10 lg:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm font-bold text-current opacity-80 transition-opacity hover:opacity-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {authState.loading ? (
            <>
              <span className="h-5 w-5 rounded-full bg-current opacity-10" aria-hidden="true" />
            </>
          ) : authState.email ? (
            <IconLink href="/mypage" label="마이페이지">
              <User size={20} strokeWidth={2} aria-hidden="true" />
            </IconLink>
          ) : (
            <>
              <IconLink href="/sign-in" label="로그인">
                <LogIn size={20} strokeWidth={2} aria-hidden="true" />
              </IconLink>
              <IconLink href="/sign-up" label="회원가입">
                <UserPlus size={20} strokeWidth={2} aria-hidden="true" />
              </IconLink>
            </>
          )}

          <IconLink href="/store" label="장바구니">
            <ShoppingCart size={20} strokeWidth={2} aria-hidden="true" />
          </IconLink>
        </div>

        <div className="flex items-center gap-3 lg:hidden">
          <IconLink href="/store" label="장바구니">
            <ShoppingCart size={20} strokeWidth={2} aria-hidden="true" />
          </IconLink>
          <button
            type="button"
            aria-label={isMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
            aria-expanded={isMenuOpen}
            onClick={() => setIsMenuOpen((current) => !current)}
            className="inline-flex items-center justify-center p-1 text-current transition-opacity hover:opacity-70"
          >
            {isMenuOpen ? <X size={24} strokeWidth={2} aria-hidden="true" /> : <Menu size={24} strokeWidth={2} aria-hidden="true" />}
          </button>
        </div>
      </div>

      {isMenuOpen && (
        <div className="border-t border-zinc-100 bg-white px-5 py-5 shadow-lg lg:hidden">
          <nav aria-label="모바일 공식 사이트 메뉴" className="mx-auto flex max-w-7xl flex-col gap-2">
            {authState.loading ? (
              <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-400">계정 확인 중</p>
            ) : authState.email ? (
              <Link
                href="/mypage"
                onClick={() => setIsMenuOpen(false)}
                className="flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white"
              >
                마이페이지
                <User size={18} strokeWidth={2} aria-hidden="true" />
              </Link>
            ) : (
              <>
                <Link
                  href="/sign-in"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white"
                >
                  로그인
                  <LogIn size={18} strokeWidth={2} aria-hidden="true" />
                </Link>
                <Link
                  href="/sign-up"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800"
                >
                  회원가입
                  <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
                </Link>
              </>
            )}

            <div className="mt-3 border-t border-zinc-100 pt-3">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMenuOpen(false)}
                  className="block rounded-2xl px-4 py-3 text-base font-bold text-zinc-800 transition-colors hover:bg-zinc-50"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
