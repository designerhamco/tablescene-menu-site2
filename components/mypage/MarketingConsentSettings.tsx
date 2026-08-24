"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type MarketingConsentSettingsProps = {
  initialAccepted: boolean;
  consentedAt?: string | null;
  withdrawnAt?: string | null;
};

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function formatDateTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  const timestamp = date.getTime();
  if (!Number.isFinite(timestamp)) return null;

  const kstDate = new Date(timestamp + KST_OFFSET_MS);
  const year = kstDate.getUTCFullYear();
  const month = kstDate.getUTCMonth() + 1;
  const day = kstDate.getUTCDate();
  const hour24 = kstDate.getUTCHours();
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const period = hour24 < 12 ? "오전" : "오후";
  const minute = String(kstDate.getUTCMinutes()).padStart(2, "0");

  return `${year}. ${month}. ${day}. ${period} ${hour12}:${minute}`;
}

export default function MarketingConsentSettings({
  initialAccepted,
  consentedAt,
  withdrawnAt,
}: MarketingConsentSettingsProps) {
  const router = useRouter();
  const [accepted, setAccepted] = useState(initialAccepted);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function updateConsent(nextAccepted: boolean) {
    setAccepted(nextAccepted);
    setIsSaving(true);
    setMessage(null);
    setError(null);

    try {
      const response = await fetch("/api/account/marketing-consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ marketingAccepted: nextAccepted }),
      });
      const result = (await response.json().catch(() => ({}))) as { ok?: boolean; message?: string };

      if (!response.ok || !result.ok) {
        throw new Error(result.message || "마케팅 수신 설정 저장에 실패했습니다.");
      }

      setMessage(result.message || "마케팅 수신 설정이 저장되었습니다.");
      router.refresh();
    } catch (updateError) {
      setAccepted(!nextAccepted);
      setError(updateError instanceof Error ? updateError.message : "마케팅 수신 설정 저장에 실패했습니다.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <h3 className="text-lg font-black tracking-tight text-zinc-950">광고성 정보 수신 동의</h3>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
            이벤트, 할인 혜택, 신규 템플릿 출시, AI 기능 업데이트, 서비스 개선 소식, 유료 기능 안내 등을 이메일, 문자메시지, 카카오 메시지 등으로 받을 수 있습니다.
          </p>
          <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-400">
            동의하지 않아도 아티메뉴 서비스 이용에는 제한이 없습니다. 결제 완료, 정기결제 예정 또는 실패, 구독 만료, 데이터 삭제 예정, 약관·정책 변경, 서비스 장애, 보안 안내 등 필수 고지는 수신 동의 여부와 관계없이 발송될 수 있습니다.
          </p>
          <p className="mt-3 break-keep text-[11px] font-bold leading-relaxed text-zinc-400">
            {accepted
              ? `동의일: ${formatDateTime(consentedAt) ?? "저장 후 기록됩니다."}`
              : `철회일: ${formatDateTime(withdrawnAt) ?? "저장 후 기록됩니다."}`} · 추후 이메일/문자/카카오 채널별 설정으로 확장할 수 있도록 계정 단위 설정으로 저장합니다.
          </p>
          {message ? <p className="mt-3 text-xs font-black text-emerald-700">{message}</p> : null}
          {error ? <p className="mt-3 text-xs font-black text-red-700">{error}</p> : null}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={accepted}
          disabled={isSaving}
          onClick={() => void updateConsent(!accepted)}
          className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-white p-4 text-left transition-colors hover:bg-zinc-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:min-w-52"
        >
          <span className="min-w-0">
            <span className="block text-sm font-black text-zinc-900">{accepted ? "수신 동의 중" : "수신 동의 안 함"}</span>
            <span className="mt-1 block text-xs font-bold text-zinc-400">{isSaving ? "저장 중..." : "클릭해서 변경"}</span>
          </span>
          <span className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors ${accepted ? "bg-zinc-950" : "bg-zinc-200"}`}>
            <span className={`absolute left-1 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${accepted ? "translate-x-5" : ""}`} />
          </span>
          <span className="sr-only">광고성 정보 수신 동의 변경</span>
        </button>
      </div>
    </section>
  );
}
