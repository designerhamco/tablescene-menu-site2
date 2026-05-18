"use client";

import { useState } from "react";

import AiCreditPurchaseModal from "@/components/ai/AiCreditPurchaseModal";
import { formatAiCredits, type AiCreditBalance, type AiCreditPackKey } from "@/lib/ai-credits";

type AiCreditRechargePanelProps = {
  menuSiteId: string;
  menuName: string;
  userId: string;
  userEmail?: string | null;
  storeId?: string;
  channelKey?: string;
  initialBalance: AiCreditBalance | null;
  compact?: boolean;
  accountSummaryOnly?: boolean;
};

export default function AiCreditRechargePanel({
  menuSiteId,
  menuName,
  userId,
  userEmail,
  storeId,
  channelKey,
  initialBalance,
  compact = false,
  accountSummaryOnly = false,
}: AiCreditRechargePanelProps) {
  const [balance, setBalance] = useState(initialBalance);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingProductKey, setPendingProductKey] = useState<AiCreditPackKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const totalRemainingCredits = balance?.totalRemainingCredits ?? 0;
  const totalGrantedCredits = balance?.accountGrantedCredits ?? 0;
  const totalPurchasedCredits = balance?.accountPurchasedCredits ?? 0;
  const totalUsedCredits = balance?.accountUsedCredits ?? 0;
  const totalCredits = totalGrantedCredits + totalPurchasedCredits;
  const wrapperClassName = accountSummaryOnly
    ? "rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm"
    : compact
      ? "mt-4 rounded-2xl border border-zinc-100 bg-white p-4"
      : "mt-6 rounded-2xl border border-zinc-100 bg-zinc-50 p-4";

  return (
    <div className={wrapperClassName}>
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-400">AI 크레딧</p>
          <h4 className={`${compact ? "mt-1 text-sm" : "mt-2 text-base"} font-black text-zinc-950`}>
            {`보유 AI 크레딧 ${formatAiCredits(totalRemainingCredits)}`}
          </h4>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
            {accountSummaryOnly
              ? "메뉴판을 만들 때마다 기본 AI 크레딧이 계정에 지급됩니다. 충전한 AI 크레딧도 내 계정의 모든 메뉴판에서 함께 사용할 수 있습니다."
              : compact
                ? "이 크레딧은 내 계정의 모든 메뉴판에서 사용할 수 있습니다."
                : `기본 지급 ${formatAiCredits(totalGrantedCredits)} · 추가 충전 ${formatAiCredits(totalPurchasedCredits)} · 사용 ${formatAiCredits(totalUsedCredits)}`}
          </p>
          {!accountSummaryOnly && balance && totalCredits > 0 ? (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-zinc-950"
                style={{ width: `${Math.min(100, Math.max(0, (balance.totalRemainingCredits / totalCredits) * 100))}%` }}
              />
            </div>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-700 transition-colors hover:bg-zinc-100"
        >
          {compact ? "충전하기" : "AI 크레딧 충전하기"}
        </button>
      </div>

      {!compact && !accountSummaryOnly ? (
        <div className="mt-3 space-y-1 break-keep text-xs font-bold leading-relaxed text-zinc-500">
          <p>AI 기능마다 차감되는 크레딧이 다릅니다. 보유 AI 크레딧은 내 계정의 모든 메뉴판에서 사용할 수 있습니다.</p>
          <p>메뉴판 생성으로 지급된 크레딧과 추가 충전한 크레딧을 함께 사용할 수 있습니다.</p>
          <p>AI 설명 작성 1크레딧 · 부분 자동 번역 1크레딧 · AI 메뉴 정리 3크레딧 · 전체 자동 번역 5크레딧</p>
        </div>
      ) : null}
      {message ? <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-700">{message}</p> : null}
      <AiCreditPurchaseModal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        menuSiteId={menuSiteId}
        menuName={menuName}
        userId={userId}
        userEmail={userEmail}
        storeId={storeId}
        channelKey={channelKey}
        pendingProductKey={pendingProductKey}
        setPendingProductKey={setPendingProductKey}
        onPurchased={(nextBalance, nextMessage) => {
          setBalance(nextBalance);
          setMessage(nextMessage);
        }}
        onError={(nextMessage) => setMessage(nextMessage || null)}
      />
    </div>
  );
}
