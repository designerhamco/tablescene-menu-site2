"use client";

import { useActionState } from "react";

import ActionFeedbackToast from "@/components/ui/ActionFeedbackToast";
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
      <ActionFeedbackToast
        message={state.message}
        tone="error"
        eventKey={state}
      />
      {state.message ? (
        <p aria-live="polite" className="site-notice site-notice-error mb-4 px-4 py-3 text-copy font-medium leading-relaxed">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="site-button site-button-primary inline-flex w-full items-center justify-center"
      >
        {pending ? "초대 확인 중..." : "직원 초대 수락하기"}
      </button>
    </form>
  );
}
