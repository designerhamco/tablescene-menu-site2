"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  normalizeContactProfileInput,
  normalizeKoreanPhoneNumber,
  validateContactName,
  validateContactProfileInput,
  validateKoreanPhoneNumber,
  validateNotificationEmail,
} from "@/lib/contact-profile";

export type ContactProfileEditorProps = {
  contactName: string;
  contactPhone: string;
  notificationEmail: string;
};

type ApiResult = {
  ok?: boolean;
  message?: string;
  debugCode?: string;
  safeDebug?: {
    step?: string;
    supabaseCode?: string;
    supabaseMessage?: string;
    supabaseDetails?: string;
    supabaseHint?: string;
  };
};

type FieldState = {
  helperText: string;
  errorText: string | null;
};

function formatSafeDebug(result: ApiResult) {
  const debugParts = [
    result.debugCode,
    result.safeDebug?.step,
    result.safeDebug?.supabaseCode,
    result.safeDebug?.supabaseMessage,
    result.safeDebug?.supabaseDetails,
    result.safeDebug?.supabaseHint,
  ].filter(Boolean);

  return debugParts.length > 0 ? debugParts.join(" · ") : null;
}

function getFieldStates({
  contactName,
  contactPhone,
  notificationEmail,
}: ContactProfileEditorProps): {
  name: FieldState;
  phone: FieldState;
  email: FieldState;
} {
  const trimmedName = contactName.trim();
  const normalizedPhone = normalizeKoreanPhoneNumber(contactPhone);
  const trimmedEmail = notificationEmail.trim();
  const nameError = validateContactName(trimmedName);
  const phoneError = validateKoreanPhoneNumber(normalizedPhone ?? contactPhone.trim());
  const emailError = validateNotificationEmail(trimmedEmail);

  return {
    name: {
      helperText: "2~20자, 한글/영문/숫자/공백과 -, _, ., · 기호만 사용할 수 있습니다.",
      errorText: nameError,
    },
    phone: {
      helperText: "선택 항목입니다. 휴대폰, 지역번호, 대표번호 형식으로 입력해주세요.",
      errorText: phoneError,
    },
    email: {
      helperText: "문의 답변, 서비스 안내, 결제/구독 안내를 받을 이메일입니다. 최대 100자입니다.",
      errorText: emailError,
    },
  };
}

function FieldHelper({ state }: { state: FieldState }) {
  return (
    <p className={`mt-2 break-keep text-xs font-bold leading-relaxed ${state.errorText ? "text-red-600" : "text-zinc-400"}`}>
      {state.errorText ?? state.helperText}
    </p>
  );
}

export default function ContactProfileEditor({
  contactName,
  contactPhone,
  notificationEmail,
}: ContactProfileEditorProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [nameValue, setNameValue] = useState(contactName);
  const [phoneValue, setPhoneValue] = useState(contactPhone);
  const [emailValue, setEmailValue] = useState(notificationEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fieldStates = getFieldStates({
    contactName: nameValue,
    contactPhone: phoneValue,
    notificationEmail: emailValue,
  });

  function openModal() {
    setNameValue(contactName);
    setPhoneValue(contactPhone);
    setEmailValue(notificationEmail);
    setError(null);
    setDebugInfo(null);
    setNotice(null);
    setIsOpen(true);
  }

  function closeWithoutSaving() {
    setIsOpen(false);
    setError(null);
    setDebugInfo(null);
  }

  function updatePhoneValue(value: string) {
    if (/^[0-9\-\s]*$/.test(value)) {
      const digits = value.replace(/\D/g, "");
      const normalizedPhone = normalizeKoreanPhoneNumber(digits);
      setPhoneValue(normalizedPhone ?? value);
      return;
    }

    setPhoneValue(value);
  }

  async function submitContactProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextProfile = normalizeContactProfileInput({
      contactName: nameValue,
      contactPhone: phoneValue,
      notificationEmail: emailValue,
    });
    const validationError = validateContactProfileInput(nextProfile);

    if (validationError) {
      setError(validationError);
      setDebugInfo(null);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setDebugInfo(null);

    try {
      const response = await fetch("/api/account/contact-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextProfile),
      });
      const result = (await response.json().catch(() => ({}))) as ApiResult;

      if (!response.ok || !result.ok) {
        setDebugInfo(formatSafeDebug(result));
        throw new Error(result.message || "담당자 정보 저장에 실패했습니다.");
      }

      setIsOpen(false);
      setNotice(result.message || "담당자 정보가 저장되었습니다.");
      toast.success(result.message || "담당자 정보가 저장되었습니다.");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "담당자 정보 저장에 실패했습니다.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <div className="flex flex-col items-start gap-2 md:items-end">
        <button
          type="button"
          onClick={openModal}
          className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
        >
          담당자 정보 수정
        </button>
        {notice ? <p className="text-xs font-bold text-emerald-700">{notice}</p> : null}
      </div>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/40 px-4 py-8">
          <form
            onSubmit={submitContactProfile}
            className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">Contact</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-zinc-950">담당자 정보 수정</h2>
                <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                  문의 답변과 서비스 안내는 담당자 정보 기준으로 전달됩니다. 사업자 인증 정보 변경은 고객지원으로 문의해주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={closeWithoutSaving}
                disabled={isSubmitting}
                className="rounded-full border border-zinc-200 px-3 py-1.5 text-xs font-black text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                닫기
              </button>
            </div>

            <div className="mt-6 space-y-4">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">담당자명</span>
                <input
                  value={nameValue}
                  onChange={(event) => setNameValue(event.target.value)}
                  maxLength={20}
                  required
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 outline-none transition-colors focus:border-zinc-500"
                  placeholder="예: 홍길동"
                  aria-invalid={Boolean(fieldStates.name.errorText)}
                  aria-describedby="contact-name-helper"
                />
                <div id="contact-name-helper">
                  <FieldHelper state={fieldStates.name} />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">담당자 연락처</span>
                <input
                  value={phoneValue}
                  onChange={(event) => updatePhoneValue(event.target.value)}
                  maxLength={13}
                  inputMode="tel"
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 outline-none transition-colors focus:border-zinc-500"
                  placeholder="010-1234-5678"
                  aria-invalid={Boolean(fieldStates.phone.errorText)}
                  aria-describedby="contact-phone-helper"
                />
                <div id="contact-phone-helper">
                  <FieldHelper state={fieldStates.phone} />
                </div>
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">문의/알림 수신 이메일</span>
                <input
                  type="email"
                  value={emailValue}
                  onChange={(event) => setEmailValue(event.target.value)}
                  maxLength={100}
                  required
                  className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 outline-none transition-colors focus:border-zinc-500"
                  placeholder="name@example.com"
                  aria-invalid={Boolean(fieldStates.email.errorText)}
                  aria-describedby="notification-email-helper"
                />
                <div id="notification-email-helper">
                  <FieldHelper state={fieldStates.email} />
                </div>
              </label>
            </div>

            {error ? (
              <div className="mt-4 break-keep rounded-lg bg-red-50 p-3 text-sm font-bold text-red-700">
                <p>{error}</p>
                {debugInfo ? (
                  <p className="mt-2 break-all font-mono text-[11px] font-semibold text-red-500">
                    개발 확인 정보: {debugInfo}
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={closeWithoutSaving}
                disabled={isSubmitting}
                className="rounded-full border border-zinc-200 px-5 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400"
              >
                {isSubmitting ? "저장 중..." : "저장"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
