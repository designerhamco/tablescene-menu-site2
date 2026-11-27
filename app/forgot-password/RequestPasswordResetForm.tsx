"use client";

import { useFormStatus } from "react-dom";

import { requestPasswordResetAction } from "@/app/auth/actions";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      data-button-width="full"
      className="site-button site-button-primary site-button-lg"
    >
      {pending ? "재설정 메일 보내는 중..." : "재설정 메일 보내기"}
    </button>
  );
}

export default function RequestPasswordResetForm() {
  return (
    <form action={requestPasswordResetAction} className="space-y-5">
      <div>
        <label htmlFor="email" className="mb-2 block text-copy font-medium">
          이메일 주소
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          className="site-field w-full"
          placeholder="owner@example.com"
        />
      </div>

      <SubmitButton />
    </form>
  );
}
