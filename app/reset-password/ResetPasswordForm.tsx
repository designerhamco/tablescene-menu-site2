"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { createClient } from "@/lib/supabase/client";

type ResetState = "checking" | "ready" | "invalid" | "submitting" | "error";

function getFriendlyErrorMessage() {
  return "비밀번호 변경 중 문제가 발생했습니다. 재설정 링크를 다시 요청해주세요.";
}

export default function ResetPasswordForm() {
  const router = useRouter();
  const [state, setState] = useState<ResetState>("checking");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const supabase = createClient();

    function markReady() {
      if (isMounted) {
        setState("ready");
      }
    }

    function markInvalid() {
      if (isMounted) {
        setState("invalid");
      }
    }

    function clearRecoveryParams() {
      window.history.replaceState({}, "", "/reset-password");
    }

    async function prepareRecoverySession() {
      const queryParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));

      if (queryParams.get("error") || hashParams.get("error")) {
        markInvalid();
        return;
      }

      const code = queryParams.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          markInvalid();
          return;
        }

        clearRecoveryParams();
        markReady();
        return;
      }

      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          markInvalid();
          return;
        }

        clearRecoveryParams();
        markReady();
        return;
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        markReady();
      } else {
        markInvalid();
      }
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") && session) {
        markReady();
      }
    });

    prepareRecoverySession().catch(() => {
      markInvalid();
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("비밀번호는 8자 이상으로 입력해주세요.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("새 비밀번호와 확인값이 일치하지 않습니다.");
      return;
    }

    setState("submitting");

    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      setState("error");
      setErrorMessage(getFriendlyErrorMessage());
      return;
    }

    await supabase.auth.signOut();
    router.replace("/sign-in?message=password-updated");
  }

  if (state === "checking") {
    return <p className="break-keep text-sm font-bold leading-relaxed text-zinc-500">비밀번호 재설정 링크를 확인하고 있습니다.</p>;
  }

  if (state === "invalid") {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm font-medium leading-relaxed text-amber-800">
          비밀번호 재설정 링크가 만료되었거나 유효하지 않습니다. 다시 요청해주세요.
        </div>
        <Link href="/forgot-password" className="block w-full rounded-2xl bg-zinc-950 px-5 py-4 text-center text-base font-bold text-white transition-transform hover:scale-[1.01]">
          재설정 메일 다시 받기
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {errorMessage && <div className="rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{errorMessage}</div>}

      <div>
        <label htmlFor="newPassword" className="mb-2 block text-sm font-bold">
          새 비밀번호
        </label>
        <input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
          placeholder="8자 이상 입력"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="mb-2 block text-sm font-bold">
          새 비밀번호 확인
        </label>
        <input
          id="confirmPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
          placeholder="새 비밀번호를 한 번 더 입력"
        />
      </div>

      <button
        type="submit"
        disabled={state === "submitting"}
        className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-base font-bold text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:hover:scale-100"
      >
        {state === "submitting" ? "변경 중..." : "비밀번호 변경하기"}
      </button>
    </form>
  );
}
