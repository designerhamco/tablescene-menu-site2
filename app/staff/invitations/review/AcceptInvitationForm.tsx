"use client";

import { useActionState } from "react";

import {
  acceptStaffInvitationAction,
  type StaffInvitationAcceptanceState,
} from "./actions";

const initialState: StaffInvitationAcceptanceState = {
  status: "idle",
  message: "",
};

export default function AcceptInvitationForm() {
  const [state, formAction, pending] = useActionState(acceptStaffInvitationAction, initialState);

  return (
    <form action={formAction} className="mt-7">
      {state.message ? (
        <p aria-live="polite" className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold leading-relaxed text-rose-800">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-6 py-3.5 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300"
      >
        {pending ? "초대 확인 중..." : "직원 초대 수락하기"}
      </button>
    </form>
  );
}
