"use client";

import { useFormStatus } from "react-dom";

import { requestPasswordResetAction } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-2xl bg-zinc-950 px-5 py-4 text-base font-bold text-white transition-transform hover:scale-[1.01] disabled:cursor-wait disabled:bg-zinc-500 disabled:hover:scale-100"
    >
      {pending ? "재설정 메일 보내는 중..." : "재설정 메일 보내기"}
    </button>
  );
}

export default function RequestPasswordResetForm() {
  return (
    <form action={requestPasswordResetAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-sm font-bold">
          이메일 주소
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="w-full rounded-2xl border border-zinc-200 px-4 py-3 text-base outline-none transition-colors focus:border-zinc-950"
          placeholder="owner@example.com"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
