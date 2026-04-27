"use client";

import { useEffect, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AuthState = {
  email: string | null;
  loading: boolean;
};

export default function AuthNav({ dark }: { dark: boolean }) {
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

  const mutedText = dark ? "text-zinc-500" : "text-white/70";
  const buttonClass = dark
    ? "border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-100"
    : "border-white/30 bg-white/10 text-white hover:bg-white/20";

  if (authState.loading) {
    return <span className={`hidden text-xs font-bold lg:inline ${mutedText}`}>...</span>;
  }

  if (authState.email) {
    return (
      <div className="hidden items-center gap-3 lg:flex">
        <a
          href="/mypage"
          className={`max-w-[150px] truncate text-xs font-bold ${mutedText}`}
          title={authState.email}
        >
          마이페이지
        </a>
        <form action="/auth/sign-out" method="post">
          <button
            type="submit"
            className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${buttonClass}`}
          >
            로그아웃
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="hidden items-center gap-2 lg:flex">
      <a href="/sign-in" className={`text-xs font-bold ${mutedText}`}>
        로그인
      </a>
      <a
        href="/sign-up"
        className={`rounded-full border px-4 py-2 text-xs font-bold transition-colors ${buttonClass}`}
      >
        회원가입
      </a>
    </div>
  );
}
