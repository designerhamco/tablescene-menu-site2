"use client";

import { useEffect, useState } from "react";
import { LogIn, User, UserPlus } from "lucide-react";

import { createClient } from "@/lib/supabase/client";

type AuthState = {
  email: string | null;
  loading: boolean;
};

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

function getIconButtonClassName(dark: boolean) {
  return dark ? "text-zinc-900 hover:opacity-70" : "text-white hover:opacity-80";
}

export default function AuthNav({ dark }: { dark: boolean }) {
  const authState = useAuthState();
  const iconButtonClass = getIconButtonClassName(dark);

  if (authState.loading) {
    return <span className="hidden h-5 w-5 rounded-full bg-current opacity-10 lg:inline-block" aria-hidden="true" />;
  }

  if (authState.email) {
    return (
      <div className="hidden items-center gap-3 lg:flex">
        <a
          href="/mypage"
          aria-label="마이페이지"
          className={`inline-flex items-center justify-center p-1 transition-opacity ${iconButtonClass}`}
          title={authState.email}
        >
          <User size={20} strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-3 lg:flex">
      <a
        href="/sign-in"
        aria-label="로그인"
        title="로그인"
        className={`inline-flex items-center justify-center p-1 transition-opacity ${iconButtonClass}`}
      >
        <LogIn size={20} strokeWidth={2} aria-hidden="true" />
      </a>
      <a
        href="/sign-up"
        aria-label="회원가입"
        title="회원가입"
        className={`inline-flex items-center justify-center p-1 transition-opacity ${iconButtonClass}`}
      >
        <UserPlus size={20} strokeWidth={2} aria-hidden="true" />
      </a>
    </div>
  );
}

export function MobileAuthLinks({ onNavigate }: { onNavigate?: () => void }) {
  const authState = useAuthState();

  if (authState.loading) {
    return <p className="rounded-2xl bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-400">계정 확인 중</p>;
  }

  if (authState.email) {
    return (
      <a
        href="/mypage"
        onClick={onNavigate}
      className="flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white"
    >
      마이페이지
      <User size={18} strokeWidth={2} aria-hidden="true" />
    </a>
    );
  }

  return (
    <div className="grid gap-2">
      <a
        href="/sign-in"
        onClick={onNavigate}
        className="flex items-center justify-between rounded-2xl bg-zinc-950 px-4 py-3 text-sm font-bold text-white"
      >
        로그인
        <LogIn size={18} strokeWidth={2} aria-hidden="true" />
      </a>
      <a
        href="/sign-up"
        onClick={onNavigate}
        className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800"
      >
        회원가입
        <UserPlus size={18} strokeWidth={2} aria-hidden="true" />
      </a>
    </div>
  );
}
