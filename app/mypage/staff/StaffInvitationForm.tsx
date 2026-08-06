"use client";

import { useActionState } from "react";

import {
  createStaffInvitationAction,
  type StaffInvitationActionState,
} from "./actions";
import {
  STAFF_INVITATION_ROLE_LABELS,
  STAFF_INVITATION_ROLES,
} from "@/lib/staff-invitations";

type OwnedMenuSiteOption = {
  id: string;
  name: string;
  slug: string;
};

const initialStaffInvitationActionState: StaffInvitationActionState = {
  status: "idle",
  message: "",
};

export default function StaffInvitationForm({
  menuSites,
  enabled,
}: {
  menuSites: OwnedMenuSiteOption[];
  enabled: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    createStaffInvitationAction,
    initialStaffInvitationActionState,
  );
  const unavailable = !enabled || menuSites.length === 0;

  return (
    <form action={formAction} className="space-y-7 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
      <div>
        <h2 className="text-xl font-black tracking-tight text-zinc-950">직원 초대</h2>
        <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-zinc-500">
          한 번의 이메일로 여러 메뉴판에 같은 역할을 부여할 수 있습니다. 초대는 7일 동안 유효합니다.
        </p>
      </div>

      {!enabled ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-relaxed text-amber-900">
          초대 수락 화면과 이메일 운영 환경을 검증한 뒤 발송 기능이 활성화됩니다. 지금은 실제 이메일을 보내지 않습니다.
        </div>
      ) : null}

      <label className="block space-y-2">
        <span className="text-sm font-black text-zinc-800">직원 이메일</span>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          disabled={unavailable || pending}
          placeholder="staff@example.com"
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-zinc-100"
        />
      </label>

      <label className="block space-y-2">
        <span className="text-sm font-black text-zinc-800">역할</span>
        <select
          name="role"
          defaultValue="editor"
          disabled={unavailable || pending}
          className="w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100 disabled:bg-zinc-100"
        >
          {STAFF_INVITATION_ROLES.map((role) => (
            <option key={role} value={role}>{STAFF_INVITATION_ROLE_LABELS[role]}</option>
          ))}
        </select>
      </label>

      <fieldset disabled={unavailable || pending} className="space-y-3">
        <legend className="text-sm font-black text-zinc-800">초대할 메뉴판</legend>
        {menuSites.length > 0 ? (
          <div className="grid gap-3 md:grid-cols-2">
            {menuSites.map((menuSite, index) => (
              <label
                key={menuSite.id}
                className="flex cursor-pointer items-start gap-3 rounded-2xl border border-zinc-200 p-4 transition hover:border-emerald-300 hover:bg-emerald-50/40"
              >
                <input
                  type="checkbox"
                  name="menuSiteIds"
                  value={menuSite.id}
                  defaultChecked={index === 0}
                  className="mt-1 size-4 accent-emerald-600"
                />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-black text-zinc-900">{menuSite.name}</span>
                  <span className="mt-1 block truncate text-xs font-semibold text-zinc-500">/menu/{menuSite.slug}</span>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="rounded-2xl bg-zinc-100 px-4 py-4 text-sm font-bold text-zinc-600">
            직원을 초대할 활성 메뉴판이 없습니다.
          </p>
        )}
      </fieldset>

      {state.message ? (
        <p
          aria-live="polite"
          className={`rounded-2xl px-4 py-3 text-sm font-bold ${
            state.status === "success"
              ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
              : "border border-rose-200 bg-rose-50 text-rose-800"
          }`}
        >
          {state.message}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={unavailable || pending}
        className="inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-300 md:w-auto"
      >
        {pending ? "초대 처리 중..." : "초대 이메일 보내기"}
      </button>
    </form>
  );
}
