"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import { useEffect, useMemo, useState } from "react";

import PaymentDetailModal from "@/components/mypage/PaymentDetailModal";
import SubscriptionManagementModal from "@/components/mypage/SubscriptionManagementModal";

export type BillingHistoryEntry = {
  id: string;
  productName: string;
  productKey: string;
  serviceType: "basic" | "display" | "trial" | "other";
  serviceTypeLabel: string;
  billingMethod: "monthly" | "yearly" | "trial" | "one_time" | "unknown";
  billingMethodLabel: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  statusBucket: "paid" | "failed" | "cancelled" | "refund_processing" | "refunded" | "needs_review" | "pending" | "unknown";
  statusLabel: string;
  statusTone: "success" | "warning" | "danger" | "neutral";
  serviceStatusBucket: "active" | "cancel_scheduled" | "refund_processing" | "archived" | "restored" | "unrecoverable" | "needs_review" | "unknown";
  serviceStatusLabel: string;
  serviceStatusTone: "success" | "warning" | "danger" | "neutral";
  paymentStatusBucket: BillingHistoryEntry["statusBucket"];
  paymentStatusLabel: string;
  paymentStatusTone: BillingHistoryEntry["statusTone"];
  paidAt: string | null;
  paidAtLabel: string;
  amountLabel: string;
  originalAmountLabel: string;
  refundAmountLabel?: string | null;
  pgLabel: string;
  paymentIdLabel: string;
  receiptUrl?: string | null;
  menuName: string | null;
  menuSlug: string | null;
  menuPath: string;
  renewalLabel: string;
  renewalDateLabel: string;
  supportMessage?: string | null;
  restoreSubscription?: {
    menuSiteId: string;
    menuName: string;
    menuPath: string;
    serviceTypeLabel: string;
    retentionLabel: string;
    options: Array<{
      productKey: string;
      label: string;
      amountLabel: string;
      billingCycle: "monthly" | "yearly";
      nextBillingDescription: string;
      renewalDescription: string;
    }>;
  } | null;
  subscriptionManagement?: {
    subscriptionId: string;
    productName: string;
    menuName: string;
    menuStatus: string;
    amountLabel: string;
    billingCycleLabel: string;
    nextBillingLabel: string;
    periodEndLabel: string;
    status: string;
    statusLabel: string;
    cancelAtPeriodEnd: boolean;
    cancelRequestedLabel: string;
    pgLabel: string;
    serviceEntitlementLabel: string;
    canManage: boolean;
    defaultOpen: boolean;
    billingMethod: "monthly" | "yearly" | "unknown";
    refundConfirmEnabled?: boolean;
    restoredNotice?: {
      title: string;
      message: string;
    } | null;
  } | null;
};

type BillingHistoryPanelProps = {
  entries: BillingHistoryEntry[];
  restoreCheckoutEnabled?: boolean;
  restoreCheckoutConfig?: {
    userId: string;
    userEmail?: string | null;
    storeId?: string | null;
    billingChannelKey?: string | null;
  };
};

type FilterState = {
  from: string;
  to: string;
  serviceType: "all" | BillingHistoryEntry["serviceType"];
  billingMethod: "all" | BillingHistoryEntry["billingMethod"];
  serviceStatus: "all" | BillingHistoryEntry["serviceStatusBucket"];
  paymentStatus: "all" | BillingHistoryEntry["paymentStatusBucket"];
  query: string;
};

const initialFilters: FilterState = {
  from: "",
  to: "",
  serviceType: "all",
  billingMethod: "all",
  serviceStatus: "all",
  paymentStatus: "all",
  query: "",
};

const serviceTypeFilterOptions = [
  { value: "all", label: "전체" },
  { value: "basic", label: "Basic" },
  { value: "display", label: "Display" },
];

const billingMethodFilterOptions = [
  { value: "all", label: "전체" },
  { value: "monthly", label: "월결제" },
  { value: "yearly", label: "연결제" },
  { value: "trial", label: "체험 결제" },
];

const paymentStatusFilterOptions = [
  { value: "all", label: "전체" },
  { value: "paid", label: "결제완료" },
  { value: "failed", label: "결제실패" },
  { value: "cancelled", label: "결제취소" },
  { value: "refund_processing", label: "환불처리중" },
  { value: "refunded", label: "환불 처리 완료" },
  { value: "needs_review", label: "처리확인 필요" },
];

function toDateInputValue(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function isInDateRange(value: string | null, from: string, to: string) {
  const dateValue = toDateInputValue(value);
  if (!dateValue) return !from && !to;
  if (from && dateValue < from) return false;
  if (to && dateValue > to) return false;
  return true;
}

function getBadgeClassName(tone: BillingHistoryEntry["statusTone"]) {
  if (tone === "success") return "bg-emerald-50 text-emerald-700 ring-emerald-100";
  if (tone === "danger") return "bg-red-50 text-red-700 ring-red-100";
  if (tone === "warning") return "bg-amber-50 text-amber-700 ring-amber-100";
  return "bg-zinc-100 text-zinc-600 ring-zinc-200";
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black text-zinc-400">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 outline-none transition-colors focus:border-zinc-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

type RestorePreflightState =
  | { status: "idle"; message: string | null; nextBillingDescription: string | null; canRestore: boolean | null }
  | { status: "loading"; message: string | null; nextBillingDescription: string | null; canRestore: boolean | null }
  | { status: "success"; message: string; nextBillingDescription: string | null; canRestore: boolean }
  | { status: "error"; message: string; nextBillingDescription: string | null; canRestore: false };

type RestoreStartState =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string }
  | { status: "success"; message: string }
  | { status: "error"; message: string };

type BillingKeyIssueResponse = {
  code?: string;
  message?: string;
  billingKey?: string;
  billingKeyInfo?: {
    billingKey?: string;
  };
};

function getBillingKeyFromIssueResponse(response: unknown) {
  const billingKeyResponse = response as BillingKeyIssueResponse | null | undefined;
  return billingKeyResponse?.billingKeyInfo?.billingKey ?? billingKeyResponse?.billingKey ?? "";
}

function RestoreSubscriptionModal({
  restore,
  restoreCheckoutEnabled = false,
  restoreCheckoutConfig,
}: {
  restore: NonNullable<BillingHistoryEntry["restoreSubscription"]>;
  restoreCheckoutEnabled?: boolean;
  restoreCheckoutConfig?: BillingHistoryPanelProps["restoreCheckoutConfig"];
}) {
  const [open, setOpen] = useState(false);
  const [selectedProductKey, setSelectedProductKey] = useState(restore.options[0]?.productKey ?? "");
  const [preflightState, setPreflightState] = useState<RestorePreflightState>({
    status: "idle",
    message: null,
    nextBillingDescription: restore.options[0]?.nextBillingDescription ?? null,
    canRestore: null,
  });
  const [startState, setStartState] = useState<RestoreStartState>({ status: "idle", message: null });
  const selectedOption = restore.options.find((option) => option.productKey === selectedProductKey) ?? restore.options[0] ?? null;
  const canStartRestore =
    restoreCheckoutEnabled &&
    Boolean(restoreCheckoutConfig?.userId && restoreCheckoutConfig.storeId && restoreCheckoutConfig.billingChannelKey) &&
    preflightState.status === "success" &&
    preflightState.canRestore === true &&
    Boolean(selectedProductKey) &&
    startState.status !== "loading";

  useEffect(() => {
    if (!open || !selectedProductKey) return;

    let cancelled = false;

    async function runPreflight() {
      setPreflightState({
        status: "loading",
        message: "복구 가능 상태를 확인하고 있습니다.",
        nextBillingDescription: selectedOption?.nextBillingDescription ?? null,
        canRestore: null,
      });

      try {
        const response = await fetch("/api/business-subscriptions/restore/preflight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            restoreMenuSiteId: restore.menuSiteId,
            selectedProductKey,
          }),
        });
        const result = (await response.json()) as {
          ok?: boolean;
          message?: string;
          preflight?: {
            canRestore?: boolean;
            message?: string;
            nextBillingDescription?: string | null;
          };
        };

        if (cancelled) return;

        if (!response.ok || !result.ok || !result.preflight) {
          setPreflightState({
            status: "error",
            message: result.message ?? "복구 가능 상태를 확인하지 못했습니다.",
            nextBillingDescription: selectedOption?.nextBillingDescription ?? null,
            canRestore: false,
          });
          return;
        }

        setPreflightState({
          status: "success",
          message: result.preflight.message ?? "복구 가능한 메뉴판입니다.",
          nextBillingDescription: result.preflight.nextBillingDescription ?? selectedOption?.nextBillingDescription ?? null,
          canRestore: Boolean(result.preflight.canRestore),
        });
      } catch {
        if (cancelled) return;
        setPreflightState({
          status: "error",
          message: "복구 가능 상태 확인 중 문제가 발생했습니다.",
          nextBillingDescription: selectedOption?.nextBillingDescription ?? null,
          canRestore: false,
        });
      }
    }

    void runPreflight();

    return () => {
      cancelled = true;
    };
  }, [open, restore.menuSiteId, selectedOption?.nextBillingDescription, selectedProductKey]);

  async function startRestoreCheckout() {
    if (!canStartRestore || !restoreCheckoutConfig?.storeId || !restoreCheckoutConfig.billingChannelKey || !restoreCheckoutConfig.userId) {
      setStartState({ status: "error", message: "재구독 복구 결제는 현재 QA 준비 중입니다." });
      return;
    }

    const confirmed = window.confirm(
      "선택한 요금제로 재구독 결제를 진행합니다. 결제 완료 후 보관 중인 메뉴판이 다시 이용 가능한 상태로 전환되고, 새 구독 기준 AI 기본 제공량이 지급됩니다. 진행할까요?"
    );

    if (!confirmed) return;

    setStartState({ status: "loading", message: "PortOne 빌링키 발급창을 준비하고 있습니다." });

    try {
      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId: restoreCheckoutConfig.storeId,
        channelKey: restoreCheckoutConfig.billingChannelKey,
        billingKeyMethod: "CARD",
        customer: {
          id: restoreCheckoutConfig.userId,
          ...(restoreCheckoutConfig.userEmail ? { email: restoreCheckoutConfig.userEmail } : {}),
        },
        customData: {
          source: "mypage_restore_subscription",
          restore_menu_site_id: restore.menuSiteId,
          product_key: selectedProductKey,
        },
      } as unknown as Parameters<typeof PortOne.requestIssueBillingKey>[0]);
      const issueResult = issueResponse as BillingKeyIssueResponse | null | undefined;

      if (!issueResponse || issueResult?.code) {
        throw new Error(issueResult?.message ?? "빌링키 발급이 취소되었거나 실패했습니다.");
      }

      const billingKey = getBillingKeyFromIssueResponse(issueResponse);
      if (!billingKey) {
        throw new Error("빌링키 발급 결과를 확인하지 못했습니다.");
      }

      setStartState({ status: "loading", message: "재구독 첫 결제를 요청하고 있습니다." });

      const response = await fetch("/api/business-subscriptions/restore/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          restoreMenuSiteId: restore.menuSiteId,
          selectedProductKey,
          billingKey,
          acceptedRestoreTerms: true,
        }),
      });
      const result = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || !result.ok) {
        throw new Error(result.message ?? "재구독 복구 결제에 실패했습니다.");
      }

      setStartState({ status: "success", message: result.message ?? "재구독 복구가 완료되었습니다." });
      window.location.href = `/mypage?tab=payments&message=${encodeURIComponent("재구독 복구가 완료되었습니다.")}`;
    } catch (error) {
      setStartState({
        status: "error",
        message: error instanceof Error ? error.message : "재구독 복구 결제 중 문제가 발생했습니다.",
      });
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-4 py-2.5 text-xs font-black text-white transition-colors hover:bg-zinc-800"
      >
        구독 관리
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/45 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-amber-500">Subscription management</p>
                <h3 className="mt-2 break-keep text-2xl font-black tracking-tight text-zinc-950">재구독하고 복구</h3>
                <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                  기존 메뉴판을 복구할 구독 상품을 선택해주세요.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-zinc-200 text-lg font-black text-zinc-500 transition-colors hover:bg-zinc-100"
                aria-label="복구 안내 닫기"
              >
                ×
              </button>
            </div>

            <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-900">
              <p>{restore.retentionLabel}</p>
              <p className="mt-2">보관 기간 안에 재구독하면 기존 메뉴판을 다시 사용할 수 있습니다.</p>
              <p className="mt-2">
                새 구독은 결제 완료일 기준으로 시작되며, 기존 환불 내역과 결제 내역은 그대로 보관됩니다.
              </p>
              <p className="mt-2">요금제에 포함된 AI 기본 제공량은 새 구독 기준으로 지급됩니다.</p>
            </div>

            <dl className="mt-5 grid gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-sm md:grid-cols-2">
              <div>
                <dt className="text-xs font-black text-zinc-400">복구 대상</dt>
                <dd className="mt-1 break-keep font-black text-zinc-900">{restore.menuName}</dd>
              </div>
              <div>
                <dt className="text-xs font-black text-zinc-400">서비스</dt>
                <dd className="mt-1 font-black text-zinc-900">{restore.serviceTypeLabel}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-xs font-black text-zinc-400">공개 주소</dt>
                <dd className="mt-1 break-all font-black text-zinc-900">{restore.menuPath}</dd>
              </div>
            </dl>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {restore.options.map((option) => (
                <button
                  key={option.productKey}
                  type="button"
                  onClick={() => setSelectedProductKey(option.productKey)}
                  className={`rounded-2xl border bg-white p-4 text-left transition-colors ${
                    selectedProductKey === option.productKey
                      ? "border-zinc-950 ring-2 ring-zinc-950/10"
                      : "border-zinc-200 hover:border-zinc-400"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h4 className="break-keep text-base font-black text-zinc-950">{option.label}</h4>
                      <p className="mt-2 text-2xl font-black tracking-tight text-zinc-950">{option.amountLabel}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-black ${
                      selectedProductKey === option.productKey ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}>
                      {selectedProductKey === option.productKey ? "선택됨" : "현재가"}
                    </span>
                  </div>
                  <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-zinc-500">{option.renewalDescription}</p>
                </button>
              ))}
            </div>

            <div className={`mt-5 rounded-2xl border p-4 text-sm font-bold leading-relaxed ${
              preflightState.status === "error" || preflightState.canRestore === false
                ? "border-red-100 bg-red-50 text-red-700"
                : preflightState.status === "loading"
                  ? "border-zinc-100 bg-zinc-50 text-zinc-600"
                  : "border-emerald-100 bg-emerald-50 text-emerald-700"
            }`}>
              <p>{preflightState.message ?? "복구할 구독 상품을 선택해주세요."}</p>
              {preflightState.nextBillingDescription ? (
                <p className="mt-2">다음 결제 예정일: {preflightState.nextBillingDescription}</p>
              ) : null}
            </div>

            <button
              type="button"
              disabled={!canStartRestore}
              onClick={startRestoreCheckout}
              className={`mt-5 inline-flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-black transition-colors ${
                canStartRestore
                  ? "bg-zinc-950 text-white hover:bg-zinc-800"
                  : "border border-zinc-200 bg-zinc-100 text-zinc-400"
              }`}
            >
              {startState.status === "loading"
                ? "재구독 결제 진행 중"
                : restoreCheckoutEnabled
                  ? "선택한 요금제로 재구독"
                  : "결제 연결 준비 중"}
            </button>

            {startState.message ? (
              <div className={`mt-3 rounded-2xl border p-4 text-sm font-bold leading-relaxed ${
                startState.status === "error"
                  ? "border-red-100 bg-red-50 text-red-700"
                  : startState.status === "success"
                    ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                    : "border-zinc-100 bg-zinc-50 text-zinc-600"
              }`}>
                {startState.message}
              </div>
            ) : null}

            <div className="mt-5 rounded-2xl border border-zinc-100 bg-zinc-50 p-4 text-xs font-bold leading-relaxed text-zinc-500">
              {restoreCheckoutEnabled
                ? "QA 환경에서만 복구 전용 결제 흐름이 활성화됩니다. 결제 완료 후 보관 중인 메뉴판이 다시 이용 가능한 상태로 전환됩니다."
                : "이번 단계에서는 실제 결제를 실행하지 않습니다. 다음 단계에서 복구 전용 결제 흐름이 연결되면 결제 완료 후 보관 중인 메뉴판이 다시 이용 가능한 상태로 전환됩니다."}
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-full border border-zinc-200 bg-white px-5 py-3 text-sm font-black text-zinc-700 transition-colors hover:bg-zinc-100"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

export default function BillingHistoryPanel({ entries, restoreCheckoutEnabled = false, restoreCheckoutConfig }: BillingHistoryPanelProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const filteredEntries = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return entries.filter((entry) => {
      if (!isInDateRange(entry.paidAt, filters.from, filters.to)) return false;
      if (filters.serviceType !== "all" && entry.serviceType !== filters.serviceType) return false;
      if (filters.billingMethod !== "all" && entry.billingMethod !== filters.billingMethod) return false;
      if (filters.serviceStatus !== "all" && entry.serviceStatusBucket !== filters.serviceStatus) return false;
      if (filters.paymentStatus !== "all" && entry.paymentStatusBucket !== filters.paymentStatus) return false;

      if (normalizedQuery) {
        const searchText = [
          entry.productName,
          entry.menuName,
          entry.menuSlug,
          entry.menuPath,
          entry.paymentIdLabel,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchText.includes(normalizedQuery)) return false;
      }

      return true;
    });
  }, [entries, filters]);

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(initialFilters);

  return (
    <section className="space-y-5">
      <div className="rounded-3xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <h3 className="text-xl font-black tracking-tight text-zinc-950">결제내역 필터</h3>
            <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">
              결제일, 서비스 유형, 결제 방식, 서비스 상태, 결제/환불 상태, 메뉴판명 또는 주소로 결제 기록을 찾을 수 있습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setFilters(initialFilters)}
            disabled={!hasActiveFilters}
            className="inline-flex shrink-0 items-center justify-center rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-xs font-black text-zinc-600 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            필터 초기화
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="block">
            <span className="text-xs font-black text-zinc-400">결제 시작일</span>
            <input
              type="date"
              value={filters.from}
              onChange={(event) => setFilters((current) => ({ ...current, from: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 outline-none transition-colors focus:border-zinc-500"
            />
          </label>
          <label className="block">
            <span className="text-xs font-black text-zinc-400">결제 종료일</span>
            <input
              type="date"
              value={filters.to}
              onChange={(event) => setFilters((current) => ({ ...current, to: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 outline-none transition-colors focus:border-zinc-500"
            />
          </label>
          <FilterSelect
            label="서비스 유형"
            value={filters.serviceType}
            onChange={(value) => setFilters((current) => ({ ...current, serviceType: value as FilterState["serviceType"] }))}
            options={serviceTypeFilterOptions}
          />
          <FilterSelect
            label="결제 방식"
            value={filters.billingMethod}
            onChange={(value) => setFilters((current) => ({ ...current, billingMethod: value as FilterState["billingMethod"] }))}
            options={billingMethodFilterOptions}
          />
          <FilterSelect
            label="서비스 상태"
            value={filters.serviceStatus}
            onChange={(value) => setFilters((current) => ({ ...current, serviceStatus: value as FilterState["serviceStatus"] }))}
            options={[
              { value: "all", label: "전체" },
              { value: "active", label: "이용중" },
              { value: "cancel_scheduled", label: "해지예약중" },
              { value: "refund_processing", label: "환불처리중" },
              { value: "archived", label: "보관중" },
              { value: "restored", label: "재구독 완료" },
              { value: "unrecoverable", label: "복구불가" },
              { value: "needs_review", label: "처리확인 필요" },
            ]}
          />
          <FilterSelect
            label="결제/환불 상태"
            value={filters.paymentStatus}
            onChange={(value) => setFilters((current) => ({ ...current, paymentStatus: value as FilterState["paymentStatus"] }))}
            options={paymentStatusFilterOptions}
          />
          <label className="block md:col-span-2">
            <span className="text-xs font-black text-zinc-400">매장명 / 메뉴판 주소 / 결제번호 검색</span>
            <input
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-800 outline-none transition-colors focus:border-zinc-500"
              placeholder="예: 매장명, 메뉴판 주소, 결제번호로 검색"
            />
          </label>
        </div>
      </div>

      <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 text-sm font-bold leading-relaxed text-amber-900">
        <p>월결제와 연결제는 모두 정기결제 상품입니다. 해지 예약 시 다음 결제일부터 자동결제가 중단되며, 이미 결제된 이용 기간까지 계속 사용할 수 있습니다.</p>
        <p className="mt-2">
          연결제 중도해지/환불은 사용 기간을 월결제 기준 금액으로 재정산한 뒤, 잔여 환불 가능액에서 중도해지 수수료 10%를 공제하는 방식으로 안내합니다.
        </p>
        <p className="mt-2">
          구독 해지, 환불 요청, 재구독하고 복구는 구독/결제내역에서 관리하고, 편집·미리보기·공개 메뉴판 보기·QR 다운로드는 내 메뉴판에서 사용할 수 있습니다.
        </p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h3 className="text-2xl font-black tracking-tight">결제내역</h3>
        <p className="text-xs font-bold text-zinc-400">
          {filteredEntries.length.toLocaleString("ko-KR")} / {entries.length.toLocaleString("ko-KR")}건
        </p>
      </div>

      {filteredEntries.length > 0 ? (
        <div className="grid gap-3">
          {filteredEntries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="text-lg font-black tracking-tight text-zinc-950">{entry.productName}</h4>
                    <span className={`rounded-full px-4 py-1.5 text-sm font-black ring-1 ${getBadgeClassName(entry.serviceStatusTone)}`}>
                      {entry.serviceStatusLabel}
                    </span>
                    <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-black text-zinc-600">
                      {entry.serviceTypeLabel}
                    </span>
                  </div>

                  <dl className="mt-4 grid gap-x-5 gap-y-2 text-sm md:grid-cols-2 xl:grid-cols-4">
                    <div>
                      <dt className="text-xs font-black text-zinc-400">결제일</dt>
                      <dd className="mt-1 font-bold text-zinc-900">{entry.paidAtLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">메뉴판</dt>
                      <dd className="mt-1 break-keep font-bold text-zinc-900">{entry.menuName ?? "연결 메뉴판 없음"}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">공개 주소</dt>
                      <dd className="mt-1 break-all font-bold text-zinc-900">{entry.menuPath}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">결제 방식</dt>
                      <dd className="mt-1 font-bold text-zinc-900">{entry.billingMethodLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">결제금액</dt>
                      <dd className="mt-1 font-bold text-zinc-900">{entry.originalAmountLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">결제/환불 상태</dt>
                      <dd className="mt-1">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-black ring-1 ${getBadgeClassName(entry.paymentStatusTone)}`}>
                          {entry.paymentStatusLabel}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">{entry.renewalLabel}</dt>
                      <dd className="mt-1 font-bold text-zinc-900">{entry.renewalDateLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">정기결제</dt>
                      <dd className="mt-1 font-bold text-zinc-900">{entry.billingMethod === "trial" ? "체험 결제" : entry.billingMethod === "one_time" ? "1회 결제" : "정기결제"}</dd>
                    </div>
                    {entry.refundAmountLabel ? (
                      <div>
                        <dt className="text-xs font-black text-zinc-400">환불금액</dt>
                        <dd className="mt-1 font-bold text-zinc-900">{entry.refundAmountLabel}</dd>
                      </div>
                    ) : null}
                    <div>
                      <dt className="text-xs font-black text-zinc-400">결제수단</dt>
                      <dd className="mt-1 break-keep font-bold text-zinc-900">{entry.paymentMethodLabel}</dd>
                    </div>
                  </dl>

                  {entry.supportMessage ? (
                    <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs font-bold leading-relaxed text-zinc-600">
                      {entry.supportMessage}
                    </div>
                  ) : null}

                  {entry.billingMethod === "yearly" ? (
                    <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs font-bold leading-relaxed text-zinc-500">
                      연결제는 매년 자동결제되는 연 정기결제 상품입니다. 중도해지/환불 요청 시 사용 기간은 월결제 기준 금액으로 재정산되며, 잔여 환불 가능액에서 중도해지 수수료 10%가 공제됩니다.
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                  {entry.restoreSubscription ? (
                    <RestoreSubscriptionModal
                      restore={entry.restoreSubscription}
                      restoreCheckoutEnabled={restoreCheckoutEnabled}
                      restoreCheckoutConfig={restoreCheckoutConfig}
                    />
                  ) : entry.subscriptionManagement ? (
                    <SubscriptionManagementModal {...entry.subscriptionManagement} />
                  ) : null}
                  <PaymentDetailModal
                    productName={entry.productName}
                    statusLabel={entry.statusLabel}
                    statusTone={entry.statusTone}
                    paidAtLabel={entry.paidAtLabel}
                    amountLabel={entry.amountLabel}
                    pgLabel={entry.pgLabel}
                    paymentIdLabel={entry.paymentIdLabel}
                    receiptUrl={entry.receiptUrl}
                    menuName={entry.menuName}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <article className="rounded-2xl border border-dashed border-zinc-200 bg-white p-8 text-center shadow-sm">
          <h4 className="text-xl font-black">조건에 맞는 결제내역이 없습니다</h4>
          <p className="mt-2 break-keep text-sm font-bold leading-relaxed text-zinc-500">필터를 초기화하거나 다른 조건으로 다시 확인해주세요.</p>
        </article>
      )}
    </section>
  );
}
