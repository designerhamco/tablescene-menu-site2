"use client";

import { useState } from "react";

import { getSafeAuthRedirectPath } from "@/lib/auth-redirect";
import { createClient } from "@/lib/supabase/client";

type OAuthButtonsProps = {
  next?: string | null;
  buttonLabel?: string;
  loadingLabel?: string;
  showDivider?: boolean;
};

export default function OAuthButtons({
  next,
  buttonLabel = "카카오로 계속하기",
  loadingLabel = "카카오로 이동 중...",
  showDivider = true,
}: OAuthButtonsProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleKakaoSignIn = async () => {
    if (isLoading) {
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const safeNext = getSafeAuthRedirectPath(next);
      const origin = window.location.origin.replace(/\/+$/, "");
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

      const supabase = createClient();
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "kakao",
        options: {
          redirectTo,
          skipBrowserRedirect: true,
        },
      });

      if (error) {
        setErrorMessage("카카오 로그인을 시작하지 못했습니다. 잠시 후 다시 시도해주세요.");
        setIsLoading(false);
        return;
      }

      if (data.url) {
        window.location.assign(data.url);
        return;
      }

      setErrorMessage("카카오 로그인 이동 URL을 확인하지 못했습니다.");
      setIsLoading(false);
    } catch {
      setErrorMessage("카카오 로그인 설정을 확인해주세요.");
      setIsLoading(false);
    }
  };

  return (
    <div className={showDivider ? "mt-6" : ""}>
      {showDivider ? (
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-zinc-200" />
          <span className="text-xs font-bold text-zinc-400">
            또는
          </span>
          <div className="h-px flex-1 bg-zinc-200" />
        </div>
      ) : null}

      <button
        type="button"
        onClick={handleKakaoSignIn}
        disabled={isLoading}
        className={`${showDivider ? "mt-5" : ""} flex w-full items-center justify-center rounded-2xl bg-[#FEE500] px-5 py-4 text-base font-bold text-zinc-950 transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-70 disabled:hover:scale-100`}
      >
        {isLoading ? loadingLabel : buttonLabel}
      </button>

      {errorMessage && (
        <p className="mt-3 break-keep text-center text-sm font-semibold text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
