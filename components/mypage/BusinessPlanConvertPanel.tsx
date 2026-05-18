"use client";

import { useState } from "react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { businessBasicMonthlyProduct, businessBasicYearlyProduct, formatKrw, type BasicProductKey } from "@/lib/payments";

type BusinessVerificationResponse = {
  ok?: boolean;
  verified?: boolean;
  businessProfileId?: string;
  businessName?: string | null;
  representativeName?: string;
  businessRegistrationNumberMasked?: string;
  businessStatus?: string | null;
  taxType?: string | null;
  verifiedAt?: string | null;
  message?: string;
};

type BusinessVerificationState =
  | { type: "idle"; message: string }
  | { type: "checking"; message: string }
  | { type: "verified"; message: string; result: BusinessVerificationResponse }
  | { type: "failed"; message: string };

type FormState = {
  businessName: string;
  representativeName: string;
  businessNumber: string;
  openingDate: string;
  phone: string;
};

const conversionProducts = [businessBasicMonthlyProduct, businessBasicYearlyProduct] as const;

function formatBusinessNumber(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 10);

  if (digits.length <= 3) return digits;
  if (digits.length <= 5) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function getBusinessNumberError(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.length === 10 ? null : "사업자등록번호는 숫자 10자리로 입력해주세요.";
}

function getRequiredError(label: string, value: string) {
  return value.trim() ? null : `${label}을 입력해주세요.`;
}

export default function BusinessPlanConvertPanel({ menuSiteId }: { menuSiteId: string }) {
  const [selectedProductKey, setSelectedProductKey] = useState<BasicProductKey>("business_basic_monthly");
  const [form, setForm] = useState<FormState>({
    businessName: "",
    representativeName: "",
    businessNumber: "",
    openingDate: "",
    phone: "",
  });
  const [verificationState, setVerificationState] = useState<BusinessVerificationState>({
    type: "idle",
    message: "사업자등록번호, 대표자명, 개업일자, 상호명을 입력한 뒤 확인합니다.",
  });

  const selectedProduct = conversionProducts.find((product) => product.product_key === selectedProductKey) ?? businessBasicMonthlyProduct;
  const businessNameError = getRequiredError("상호명", form.businessName);
  const representativeNameError = getRequiredError("대표자명", form.representativeName);
  const businessNumberError = form.businessNumber.trim() ? getBusinessNumberError(form.businessNumber) : "사업자등록번호를 입력해주세요.";
  const openingDateError = getRequiredError("개업일자", form.openingDate);
  const isVerified = verificationState.type === "verified" && Boolean(verificationState.result.businessProfileId);

  function updateField(key: keyof FormState, value: string) {
    setForm((current) => ({
      ...current,
      [key]: key === "businessNumber" ? formatBusinessNumber(value) : value,
    }));
    setVerificationState({
      type: "idle",
      message: "사업자 정보가 변경되었습니다. 다시 확인해주세요.",
    });
  }

  async function verifyBusiness() {
    const error = businessNameError ?? representativeNameError ?? businessNumberError ?? openingDateError;

    if (error) {
      setVerificationState({ type: "failed", message: error });
      return;
    }

    setVerificationState({ type: "checking", message: "사업자 정보를 확인하고 있습니다." });

    try {
      const response = await fetch("/api/business/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: form.businessName,
          representativeName: form.representativeName,
          businessRegistrationNumber: form.businessNumber,
          openingDate: form.openingDate,
          phone: form.phone,
        }),
      });
      const result = (await response.json()) as BusinessVerificationResponse;

      if (!response.ok || !result.ok || !result.verified) {
        setVerificationState({
          type: "failed",
          message: result.message ?? "사업자 정보가 확인되지 않았습니다. 입력 정보를 다시 확인해주세요.",
        });
        return;
      }

      setVerificationState({
        type: "verified",
        message: result.message ?? "사업자 인증이 완료되었습니다.",
        result,
      });
    } catch {
      setVerificationState({
        type: "failed",
        message: "사업자 정보 확인 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.",
      });
    }
  }

  function showBillingNotice() {
    // TODO(billing-conversion): 자동결제 구현 시 businessProfileId 소유권, verification_status,
    // menuSiteId 소유권, 개인 체험 전환 가능 상태, 기존 menu_site 유지, 기존 slug/메뉴/이미지 유지,
    // billing key/subscription 생성 성공, subscription_id 저장, 기존 entitlement 전환 또는 신규 entitlement 연결을 서버에서 검증해야 합니다.
    setVerificationState((current) => ({
      ...current,
      message: isVerified
        ? "사업자 인증이 완료되었습니다. 기존 메뉴판을 이어서 사용할 수 있는 월/연 자동결제 전환 기능은 곧 제공될 예정입니다."
        : "사업자 인증 완료 후 전환 준비 상태를 확인할 수 있습니다.",
    }));
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Plan</p>
        <h2 className="text-2xl font-black tracking-tight">사업자 플랜 선택</h2>
        <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
          개인 체험으로 만든 기존 메뉴판을 그대로 이어서 사용할 사업자 Basic 플랜을 선택합니다.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          {conversionProducts.map((product) => {
            const selected = selectedProductKey === product.product_key;

            return (
              <button
                key={product.product_key}
                type="button"
                onClick={() => setSelectedProductKey(product.product_key)}
                className={`rounded-3xl border p-5 text-left transition ${
                  selected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                }`}
              >
                <span className={`rounded-full px-3 py-1 text-xs font-black ${selected ? "bg-white text-zinc-950" : "bg-zinc-100 text-zinc-600"}`}>
                  {product.billing_cycle === "yearly" ? "연 자동결제" : "월 자동결제"}
                </span>
                <h3 className="mt-4 text-xl font-black">{product.label}</h3>
                <p className={`mt-2 text-sm font-bold leading-relaxed ${selected ? "text-white/70" : "text-zinc-500"}`}>
                  사업자 인증 후 기존 메뉴판을 정식 플랜으로 전환합니다.
                </p>
                <p className="mt-4 text-sm font-black">
                  정가 {formatKrw(product.regular_amount)} / 오픈 할인 {formatKrw(product.amount)}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      <aside className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm lg:sticky lg:top-28 lg:self-start">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Summary</p>
        <h2 className="text-2xl font-black tracking-tight">전환 준비</h2>
        <dl className="mt-6 space-y-4 text-sm font-bold">
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">전환 대상</dt>
            <dd className="text-right text-zinc-900">기존 메뉴판</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">메뉴판 ID</dt>
            <dd className="break-all text-right text-xs text-zinc-600">{menuSiteId}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">선택 플랜</dt>
            <dd className="text-right text-zinc-900">{selectedProduct.label}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">결제 방식</dt>
            <dd className="text-right text-zinc-900">{selectedProduct.billing_cycle === "yearly" ? "연 자동결제" : "월 자동결제"}</dd>
          </div>
        </dl>
        <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold leading-relaxed ${isVerified ? "border-emerald-100 bg-emerald-50 text-emerald-700" : verificationState.type === "failed" ? "border-red-100 bg-red-50 text-red-700" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
          {isVerified
            ? "사업자 인증이 완료되었습니다. 기존 메뉴판을 이어서 사용할 수 있는 월/연 자동결제 전환 기능은 곧 제공될 예정입니다."
            : verificationState.type === "checking"
              ? "사업자 정보를 확인하고 있습니다."
              : verificationState.message}
        </div>
        <button
          type="button"
          onClick={showBillingNotice}
          disabled={!isVerified}
          className="mt-6 inline-flex w-full cursor-not-allowed items-center justify-center rounded-full bg-zinc-300 px-5 py-4 text-sm font-black text-white disabled:bg-zinc-300"
        >
          {isVerified ? "자동결제 준비 중" : "사업자 인증 후 진행 가능"}
        </button>
      </aside>

      <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm lg:col-span-2">
        <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Business</p>
        <h2 className="text-2xl font-black tracking-tight">사업자 인증</h2>
        <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
          사업자 플랜 전환은 사업자 정보 확인 후 진행됩니다. 이번 단계에서는 인증만 진행하고, 자동결제 연결은 아직 호출하지 않습니다.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="상호명" value={form.businessName} onChange={(value) => updateField("businessName", value)} placeholder="테이블씬카페" required />
          <Field label="대표자명" value={form.representativeName} onChange={(value) => updateField("representativeName", value)} placeholder="홍길동" required />
          <Field label="사업자등록번호" value={form.businessNumber} onChange={(value) => updateField("businessNumber", value)} placeholder="123-45-67890" required />
          <Field label="개업일자" value={form.openingDate} onChange={(value) => updateField("openingDate", value)} placeholder="2024-01-15 또는 20240115" required />
          <Field label="사업장 연락처" value={form.phone} onChange={(value) => updateField("phone", value)} placeholder="02-1234-5678" />
        </div>

        <div className="mt-6 flex flex-col gap-3 md:flex-row md:items-center">
          <button
            type="button"
            onClick={verifyBusiness}
            disabled={verificationState.type === "checking"}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-zinc-950 px-5 py-3 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {verificationState.type === "checking" ? <LoadingSpinner className="h-4 w-4" /> : null}
            {verificationState.type === "checking" ? "확인 중..." : "사업자 정보 확인"}
          </button>
          <p className={`break-keep text-sm font-bold ${verificationState.type === "verified" ? "text-emerald-700" : verificationState.type === "failed" ? "text-red-700" : "text-zinc-500"}`}>
            {verificationState.message}
          </p>
        </div>

        {verificationState.type === "verified" && (
          <dl className="mt-6 grid gap-3 rounded-3xl border border-emerald-100 bg-emerald-50 p-5 md:grid-cols-3">
            <SummaryItem label="상호명" value={verificationState.result.businessName || form.businessName || "-"} />
            <SummaryItem label="대표자명" value={verificationState.result.representativeName || form.representativeName || "-"} />
            <SummaryItem label="사업자등록번호" value={verificationState.result.businessRegistrationNumberMasked ?? "-"} />
            <SummaryItem label="사업자 상태" value={verificationState.result.businessStatus ?? "-"} />
            <SummaryItem label="과세 유형" value={verificationState.result.taxType ?? "-"} />
            <SummaryItem label="인증일" value={verificationState.result.verifiedAt ? new Date(verificationState.result.verifiedAt).toLocaleDateString("ko-KR") : "-"} />
          </dl>
        )}
      </section>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-xs font-black uppercase tracking-[0.16em] text-zinc-400">
        {label}
        {required ? <span className="ml-1 text-red-500">*</span> : null}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-bold text-zinc-900 outline-none transition focus:border-zinc-950"
      />
    </label>
  );
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <dt className="text-xs font-black uppercase tracking-[0.16em] text-emerald-500">{label}</dt>
      <dd className="mt-2 break-keep text-sm font-black text-emerald-900">{value}</dd>
    </div>
  );
}
