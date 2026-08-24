"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

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

const AI_CREDIT_BALANCE_UPDATED_EVENT = "tablescene:ai-credit-balance-updated";

type AiCreditBalanceUpdatedEventDetail = {
  usedCredits: number;
  totalCredits: number;
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
  const router = useRouter();
  const [balance, setBalance] = useState(initialBalance);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingProductKey, setPendingProductKey] = useState<AiCreditPackKey | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    function handleBalanceUpdated(event: Event) {
      const detail = (event as CustomEvent<AiCreditBalanceUpdatedEventDetail>).detail;
      if (!detail || !Number.isFinite(detail.usedCredits) || !Number.isFinite(detail.totalCredits)) return;

      setBalance((currentBalance) => {
        const totalCredits = Math.max(0, Math.floor(detail.totalCredits));
        const usedCredits = Math.max(0, Math.floor(detail.usedCredits));
        const remainingCredits = Math.max(0, totalCredits - usedCredits);

        if (!currentBalance) {
          return {
            accountGrantedCredits: totalCredits,
            accountPurchasedCredits: 0,
            accountUsedCredits: usedCredits,
            accountRemainingCredits: remainingCredits,
            totalRemainingCredits: remainingCredits,
            includedCredits: totalCredits,
            purchasedCredits: 0,
            usedCredits,
            remainingCredits,
          };
        }

        return {
          ...currentBalance,
          accountUsedCredits: usedCredits,
          accountRemainingCredits: remainingCredits,
          totalRemainingCredits: remainingCredits,
          usedCredits,
          remainingCredits,
        };
      });
    }

    window.addEventListener(AI_CREDIT_BALANCE_UPDATED_EVENT, handleBalanceUpdated);
    return () => window.removeEventListener(AI_CREDIT_BALANCE_UPDATED_EVENT, handleBalanceUpdated);
  }, []);

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
          <h4 className={`${compact ? "text-sm" : "text-base"} font-black text-zinc-950`}>
            {`보유 AI 크레딧 ${formatAiCredits(totalRemainingCredits)}`}
          </h4>
          <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-500">
            {accountSummaryOnly
              ? "AI 크레딧은 아티메뉴 AI 기능 이용을 위한 통합 단위입니다. 아티메뉴 베이직과 첫 달 체험은 18크레딧, 아티메뉴 디스플레이는 26크레딧을 기본 제공합니다."
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
          <p>AI 크레딧은 아티메뉴 AI 기능 이용을 위한 통합 단위입니다. 보유 AI 크레딧은 내 계정의 모든 메뉴판에서 사용할 수 있습니다.</p>
          <p>아티메뉴 베이직과 첫 달 체험은 18크레딧, 아티메뉴 디스플레이는 26크레딧을 기본 제공합니다.</p>
          <p>AI 설명 작성 1크레딧 · 부분 자동 번역 1크레딧 · AI 메뉴 정리 3크레딧 · 전체 자동 번역 3크레딧</p>
          <p>요금제에 포함된 AI 크레딧은 현금성 가치가 없으며 환불, 현금 교환 또는 양도 대상이 아닙니다.</p>
          <p>AI가 생성한 문구와 번역은 참고용 초안입니다. 공개 전 실제 메뉴 정보와 일치하는지 직접 확인해주세요.</p>
          <p>주민등록번호, 카드번호, 계좌번호, 민감정보, 제3자의 개인정보는 AI 입력창에 입력하지 마세요.</p>
        </div>
      ) : null}
      {accountSummaryOnly ? (
        <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-4 text-xs font-bold leading-relaxed text-zinc-500">
          <p>차감 기준: AI 설명 작성 1크레딧 · 부분 자동 번역 1크레딧 · AI 메뉴 정리 3크레딧 · 전체 자동 번역 3크레딧</p>
          <p className="mt-2">요금제에 포함된 AI 크레딧은 현금성 가치가 없으며 환불, 현금 교환 또는 양도 대상이 아닙니다.</p>
          <p className="mt-2">AI 결과물은 참고용 초안이므로 공개 전 실제 메뉴 정보와 일치하는지 직접 확인해주세요.</p>
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
          router.refresh();
        }}
        onError={(nextMessage) => setMessage(nextMessage || null)}
      />
    </div>
  );
}
