"use client";

import { useMemo, useState } from "react";

import PaymentDetailModal from "@/components/mypage/PaymentDetailModal";
import SubscriptionManagementModal from "@/components/mypage/SubscriptionManagementModal";

export type BillingHistoryEntry = {
  id: string;
  productName: string;
  productKey: string;
  serviceType: "basic" | "display" | "other";
  serviceTypeLabel: string;
  billingMethod: "monthly" | "yearly" | "one_time" | "unknown";
  billingMethodLabel: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  statusBucket: "paid" | "failed" | "cancelled" | "refunded" | "pending" | "unknown";
  statusLabel: string;
  statusTone: "success" | "warning" | "danger" | "neutral";
  paidAt: string | null;
  paidAtLabel: string;
  amountLabel: string;
  pgLabel: string;
  paymentIdLabel: string;
  receiptUrl?: string | null;
  menuName: string | null;
  menuSlug: string | null;
  menuPath: string;
  renewalLabel: string;
  renewalDateLabel: string;
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
  } | null;
};

type BillingHistoryPanelProps = {
  entries: BillingHistoryEntry[];
};

type FilterState = {
  from: string;
  to: string;
  serviceType: "all" | BillingHistoryEntry["serviceType"];
  billingMethod: "all" | BillingHistoryEntry["billingMethod"];
  status: "all" | BillingHistoryEntry["statusBucket"];
  paymentMethod: string;
  query: string;
};

const initialFilters: FilterState = {
  from: "",
  to: "",
  serviceType: "all",
  billingMethod: "all",
  status: "all",
  paymentMethod: "all",
  query: "",
};

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

export default function BillingHistoryPanel({ entries }: BillingHistoryPanelProps) {
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const paymentMethodOptions = useMemo(() => {
    const labels = Array.from(new Set(entries.map((entry) => entry.paymentMethodLabel).filter(Boolean)));
    return [
      { value: "all", label: "전체" },
      ...labels.map((label) => ({ value: label, label })),
    ];
  }, [entries]);
  const filteredEntries = useMemo(() => {
    const normalizedQuery = filters.query.trim().toLowerCase();

    return entries.filter((entry) => {
      if (!isInDateRange(entry.paidAt, filters.from, filters.to)) return false;
      if (filters.serviceType !== "all" && entry.serviceType !== filters.serviceType) return false;
      if (filters.billingMethod !== "all" && entry.billingMethod !== filters.billingMethod) return false;
      if (filters.status !== "all" && entry.statusBucket !== filters.status) return false;
      if (filters.paymentMethod !== "all" && entry.paymentMethodLabel !== filters.paymentMethod) return false;

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
              결제일, 서비스 유형, 결제 방식, 상태, 결제수단, 메뉴판명 또는 주소로 결제 기록을 찾을 수 있습니다.
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
            options={[
              { value: "all", label: "전체" },
              { value: "basic", label: "Basic" },
              { value: "display", label: "Display" },
            ]}
          />
          <FilterSelect
            label="결제 방식"
            value={filters.billingMethod}
            onChange={(value) => setFilters((current) => ({ ...current, billingMethod: value as FilterState["billingMethod"] }))}
            options={[
              { value: "all", label: "전체" },
              { value: "monthly", label: "월결제" },
              { value: "yearly", label: "연결제" },
              { value: "one_time", label: "일회성" },
            ]}
          />
          <FilterSelect
            label="결제 상태"
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value as FilterState["status"] }))}
            options={[
              { value: "all", label: "전체" },
              { value: "paid", label: "결제완료" },
              { value: "failed", label: "실패" },
              { value: "cancelled", label: "취소" },
              { value: "refunded", label: "환불" },
              { value: "pending", label: "처리 중" },
            ]}
          />
          <FilterSelect
            label="결제수단"
            value={filters.paymentMethod}
            onChange={(value) => setFilters((current) => ({ ...current, paymentMethod: value as FilterState["paymentMethod"] }))}
            options={paymentMethodOptions}
          />
          <label className="block md:col-span-2">
            <span className="text-xs font-black text-zinc-400">메뉴판명 / slug / 결제번호 검색</span>
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
          연결제 중도해지/환불은 정액 수수료 방식이 아니라, 월정가 기준 사용료와 이미 적용받은 연간 할인 혜택을 사용 기간 기준으로 재정산하는 방식으로 안내합니다. 실제 환불 API와 복구 API는 아직 연결하지 않았습니다.
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
                    <span className={`rounded-full px-3 py-1 text-xs font-black ring-1 ${getBadgeClassName(entry.statusTone)}`}>
                      {entry.statusLabel}
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
                      <dt className="text-xs font-black text-zinc-400">금액</dt>
                      <dd className="mt-1 font-bold text-zinc-900">{entry.amountLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">결제수단</dt>
                      <dd className="mt-1 break-keep font-bold text-zinc-900">{entry.paymentMethodLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">{entry.renewalLabel}</dt>
                      <dd className="mt-1 font-bold text-zinc-900">{entry.renewalDateLabel}</dd>
                    </div>
                    <div>
                      <dt className="text-xs font-black text-zinc-400">정기결제</dt>
                      <dd className="mt-1 font-bold text-zinc-900">{entry.billingMethod === "one_time" ? "자동결제 없음" : "정기결제"}</dd>
                    </div>
                  </dl>

                  {entry.billingMethod === "yearly" ? (
                    <div className="mt-4 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-xs font-bold leading-relaxed text-zinc-500">
                      연결제는 매년 자동결제되는 연 정기결제 상품입니다. 중도해지/환불 요청 시 사용 기간은 월결제 기준 금액으로 재정산되며, 사용 기간에 해당하는 연간 할인 혜택이 환불금에서 공제될 수 있습니다.
                    </div>
                  ) : null}
                </div>

                <div className="flex shrink-0 flex-wrap gap-2 lg:flex-col">
                  {entry.subscriptionManagement ? (
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
