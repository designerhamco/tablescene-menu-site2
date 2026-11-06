"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { toast } from "sonner";
import { ContentPanel } from "@/app/components/ui/content-panel";
import { Switch } from "@/app/components/ui/switch";

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
  const switchId = useId();
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

      const message = result.message || "마케팅 수신 설정이 저장되었습니다.";
      setMessage(message);
      toast.success(message);
      router.refresh();
    } catch (updateError) {
      setAccepted(!nextAccepted);
      const message = updateError instanceof Error ? updateError.message : "마케팅 수신 설정 저장에 실패했습니다.";
      setError(message);
      toast.error(message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <ContentPanel>
      <div className="site-content-heading-row">
        <div className="site-stack-title min-w-0">
          <h3 className="type-content-title text-zinc-950">광고성 정보 수신 동의</h3>
          <p className="type-body-sm site-copy-muted">
            이벤트, 할인 혜택, 신규 템플릿 출시, AI 기능 업데이트, 서비스 개선 소식, 유료 기능 안내 등을 이메일, 문자메시지, 카카오 메시지 등으로 받을 수 있습니다.
          </p>
          <p className="type-body-sm site-copy-muted">
            동의하지 않아도 아티메뉴 서비스 이용에는 제한이 없습니다. 결제 완료, 정기결제 예정 또는 실패, 구독 만료, 데이터 삭제 예정, 약관·정책 변경, 서비스 장애, 보안 안내 등 필수 고지는 수신 동의 여부와 관계없이 발송될 수 있습니다.
          </p>
          <p className="type-body-sm site-copy-muted">
            {accepted
              ? `동의일: ${formatDateTime(consentedAt) ?? "저장 후 기록됩니다."}`
              : `철회일: ${formatDateTime(withdrawnAt) ?? "저장 후 기록됩니다."}`} · 추후 이메일/문자/카카오 채널별 설정으로 확장할 수 있도록 계정 단위 설정으로 저장합니다.
          </p>
          {message ? <p className="type-body-sm text-emerald-700">{message}</p> : null}
          {error ? <p className="type-body-sm text-red-700">{error}</p> : null}
        </div>
        <label
          htmlFor={switchId}
          className="site-action-row shrink-0"
        >
          <span className="site-stack-copy min-w-0">
            <span className="type-label">{accepted ? "수신 동의 중" : "수신 동의 안 함"}</span>
            <span id={`${switchId}-description`} className="type-caption site-copy-muted">{isSaving ? "저장 중..." : "클릭해서 변경"}</span>
          </span>
          <Switch id={switchId} surface="light" checked={accepted} loading={isSaving} disabled={isSaving} aria-label="광고성 정보 수신 동의" aria-describedby={`${switchId}-description`} aria-busy={isSaving} onCheckedChange={nextAccepted => void updateConsent(nextAccepted)} />
        </label>
      </div>
    </ContentPanel>
  );
}
