"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";

type AccountDeletionPanelProps = {
  hasActiveBusinessSubscription: boolean;
  hasAnyMenuSite: boolean;
};

export default function AccountDeletionPanel({
  hasActiveBusinessSubscription,
  hasAnyMenuSite,
}: AccountDeletionPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmationText, setConfirmationText] = useState("");
  const [acceptedPolicy, setAcceptedPolicy] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const canSubmit = acceptedPolicy && confirmationText.trim() === "회원탈퇴" && !isSubmitting;

  const submitDeletionRequest = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          confirmationText,
          acceptedPolicy,
        }),
      });

      const data = await response.json().catch(() => null) as { message?: string } | null;

      if (!response.ok) {
        setErrorMessage(data?.message ?? "회원탈퇴 신청을 처리하지 못했습니다.");
        setIsSubmitting(false);
        return;
      }

      const supabase = createClient();
      await supabase.auth.signOut();
      window.location.assign("/sign-in?error=" + encodeURIComponent("회원탈퇴 신청이 접수되어 계정 이용이 중단되었습니다."));
    } catch {
      setErrorMessage("회원탈퇴 신청 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <section className="mt-6 rounded-2xl border border-red-100 bg-red-50 p-5">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div>
            <h3 className="text-lg font-black tracking-tight text-red-950">회원탈퇴</h3>
            <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-red-700">
              회원탈퇴 시 아티메뉴 서비스 이용이 중단되며, 메뉴판 데이터는 보관·삭제 정책에 따라 처리됩니다. 결제 및 정산, 분쟁 대응에 필요한 기록은 관계 법령에 따라 일정 기간 보관될 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsOpen(true)}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-red-600 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-red-700"
          >
            회원탈퇴 신청
          </button>
        </div>
      </section>

      {isOpen ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center bg-zinc-950/50 p-0 md:items-center md:p-6" onClick={() => setIsOpen(false)}>
          <section
            role="dialog"
            aria-modal="true"
            aria-label="회원탈퇴 신청"
            className="max-h-[90vh] w-full overflow-y-auto rounded-t-3xl bg-white p-6 text-zinc-950 shadow-2xl md:max-w-2xl md:rounded-3xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-2xl font-black tracking-tight">회원탈퇴를 신청하시겠어요?</h3>
                <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                  탈퇴 신청 즉시 계정 이용과 메뉴판 편집, 공개, QR, AI 기능 이용이 제한됩니다.
                </p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-500">
                닫기
              </button>
            </div>

            <div className="mt-6 space-y-4 rounded-2xl bg-zinc-50 p-5 text-sm font-bold leading-relaxed text-zinc-600">
              {hasActiveBusinessSubscription ? (
                <p className="break-keep text-red-700">
                  현재 이용 중인 유료서비스가 있습니다. 회원탈퇴를 진행하면 현재 이용 중인 메뉴판은 즉시 비공개 처리되며, 남은 이용기간 동안 서비스를 사용할 수 없습니다. 구독 자동갱신은 중단되며, 이미 결제된 금액의 환불은 환불 정책에 따라 처리됩니다.
                </p>
              ) : null}
              {hasAnyMenuSite ? (
                <p className="break-keep">
                  보유한 메뉴판은 비공개 및 삭제 예정 상태로 전환됩니다. 실제 데이터와 업로드 이미지는 정책에 따른 보관 기간 및 별도 삭제 절차에 따라 처리됩니다.
                </p>
              ) : null}
              <p className="break-keep">
                결제·정산·분쟁 대응 및 관계 법령상 보관이 필요한 기록은 탈퇴 후에도 정해진 기간 동안 별도 보관될 수 있습니다.
              </p>
              <p className="break-keep">
                auth 사용자와 Supabase Storage 파일의 실제 hard delete는 즉시 실행하지 않으며, 별도 데이터 파기 절차에서 처리합니다.
              </p>
            </div>

            <label className="mt-5 flex items-start gap-3 rounded-2xl border border-zinc-200 p-4 text-sm font-bold text-zinc-700">
              <input
                type="checkbox"
                checked={acceptedPolicy}
                onChange={(event) => setAcceptedPolicy(event.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-950"
              />
              <span className="break-keep">위 내용을 확인했으며 회원탈퇴를 진행합니다.</span>
            </label>

            <label className="mt-5 block">
              <span className="text-sm font-black text-zinc-900">확인 문구 입력</span>
              <input
                type="text"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder="회원탈퇴"
                className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-950 outline-none transition focus:border-zinc-950"
              />
              <span className="mt-2 block text-xs font-bold text-zinc-400">정확히 “회원탈퇴”를 입력해야 최종 신청할 수 있습니다.</span>
            </label>

            {errorMessage ? (
              <p className="mt-4 break-keep rounded-2xl bg-red-50 p-4 text-sm font-bold text-red-700">{errorMessage}</p>
            ) : null}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700">
                취소
              </button>
              <button
                type="button"
                onClick={submitDeletionRequest}
                disabled={!canSubmit}
                className="rounded-full bg-red-600 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                {isSubmitting ? "처리 중..." : "회원탈퇴 신청"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
