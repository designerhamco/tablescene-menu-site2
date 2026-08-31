"use client";

import * as PortOne from "@portone/browser-sdk/v2";
import { useState } from "react";

import LoadingSpinner from "@/components/ui/LoadingSpinner";
import { ConsentAgreementBox, ConsentDetailText, type ConsentAgreementItem } from "@/components/consent/ConsentAgreementBox";
import { businessBasicMonthlyProduct, businessBasicYearlyProduct, formatKrw, type BasicProductKey } from "@/lib/payments";
import { openDiscountPolicy } from "@/lib/promotion-policy";

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

type BillingKeyIssueResponse = {
  code?: string;
  message?: string;
  billingKey?: string;
  billingKeyInfo?: {
    billingKey?: string;
  };
};

type BusinessSubscriptionResponse = {
  ok?: boolean;
  step?: string;
  debugCode?: string;
  message?: string;
  safeDebug?: {
    portoneStatus?: number;
    portoneCode?: string;
    portoneMessage?: string;
  };
  debug?: {
    portoneStatus?: number;
    portoneCode?: string;
    portoneMessage?: string;
  };
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

type ConvertConsentKey = "termsAccepted" | "businessInfoAccepted" | "paymentPolicyAccepted" | "marketingAccepted";

type BusinessPlanConvertPanelProps = {
  menuSiteId: string;
  storeId: string | null;
  billingChannelKey: string | null;
};

const conversionProducts = [businessBasicMonthlyProduct, businessBasicYearlyProduct] as const;

const convertConsentItems: readonly ConsentAgreementItem[] = [
  {
    key: "termsAccepted",
    label: "[필수] 아티메뉴 이용약관에 동의합니다.",
    required: true,
    href: "/terms",
    detailTitle: "아티메뉴 이용약관 동의",
    detail: <ConsentDetailText><p>아티메뉴 서비스 이용, 첫 달 체험, 유료서비스, 정기결제, 해지, 환불 제한, AI 크레딧, 데이터 보관 및 삭제 기준을 확인하고 동의합니다.</p></ConsentDetailText>,
  },
  {
    key: "businessInfoAccepted",
    label: "[필수] 유료 전환을 위한 사업자 정보 수집·이용에 동의합니다.",
    required: true,
    href: "/privacy",
    detailTitle: "사업자 정보 수집·이용 동의",
    detail: (
      <ConsentDetailText>
        <p>첫 달 체험 메뉴판의 유료서비스 전환, 사업자 확인, 월결제 또는 연결제 결제, 정기구독 관리, 증빙 처리, 고객지원 및 부정 이용 방지를 위해 상호명, 대표자명, 사업자등록번호, 사업장 주소, 업종, 업태, 담당자명, 담당자 연락처, 담당자 이메일을 수집·이용합니다.</p>
        <p>사업자 정보는 사업자 인증 API를 통해 유효성이 확인될 수 있으며, 사업자등록증 파일은 기본적으로 수집하지 않습니다.</p>
        <p>보유기간은 유료서비스 이용기간 동안이며, 결제·정산·계약·소비자 분쟁 관련 기록은 관계 법령에 따라 일정 기간 보관됩니다.</p>
        <p>동의를 거부할 경우 첫 달 체험 메뉴판의 유료 전환, 결제 및 유료서비스 이용이 제한될 수 있습니다.</p>
      </ConsentDetailText>
    ),
  },
  {
    key: "paymentPolicyAccepted",
    label: "[필수] 결제 즉시 유료서비스가 시작되며, 정기결제·해지·환불 제한 조건을 확인했습니다.",
    required: true,
    detailTitle: "유료 전환 및 결제 조건",
    detail: (
      <ConsentDetailText>
        <p>첫 달 체험 메뉴판을 유료서비스로 전환하면 기존 메뉴판 데이터가 유지되며, 선택한 요금제의 유료서비스 이용기간이 시작됩니다.</p>
        <p>결제 완료 즉시 유료서비스 제공 및 AI 크레딧 지급이 시작되므로, 서비스 제공 개시 후에는 단순 변심, 착오 구매, 미사용 등을 이유로 한 청약철회 및 환불이 제한될 수 있습니다.</p>
        <p>구독을 해지하는 경우 다음 결제일부터 결제가 중단되며, 이미 결제된 이용기간 동안은 서비스를 계속 이용할 수 있습니다.</p>
      </ConsentDetailText>
    ),
  },
  {
    key: "marketingAccepted",
    label: "[선택] 이벤트·혜택·신규 템플릿·AI 기능 업데이트 등 광고성 정보 수신에 동의합니다.",
    detailTitle: "마케팅 정보 수신 동의",
    detail: <ConsentDetailText><p>마케팅 정보 수신 동의는 선택 사항이며, 동의하지 않아도 유료 전환 및 서비스 이용에는 제한이 없습니다. 동의는 마이페이지 또는 고객지원 문의를 통해 철회할 수 있습니다.</p></ConsentDetailText>,
  },
];

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

export default function BusinessPlanConvertPanel({ menuSiteId, storeId, billingChannelKey }: BusinessPlanConvertPanelProps) {
  const [selectedProductKey, setSelectedProductKey] = useState<BasicProductKey>("business_basic_single_monthly");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [consents, setConsents] = useState<Record<ConvertConsentKey, boolean>>({
    termsAccepted: false,
    businessInfoAccepted: false,
    paymentPolicyAccepted: false,
    marketingAccepted: false,
  });
  const [activeConsent, setActiveConsent] = useState<ConvertConsentKey | null>(null);
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
  const isPortOneReady = Boolean(storeId && billingChannelKey);
  const requiredConsentsAccepted = consents.termsAccepted && consents.businessInfoAccepted && consents.paymentPolicyAccepted;

  function updateConsent(key: ConvertConsentKey, checked: boolean) {
    setConsents((current) => ({ ...current, [key]: checked }));
  }

  function toggleAllConsents(checked: boolean) {
    setConsents({
      termsAccepted: checked,
      businessInfoAccepted: checked,
      paymentPolicyAccepted: checked,
      marketingAccepted: checked,
    });
  }

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

function getBillingKeyFromIssueResponse(response: unknown) {
  const billingKeyResponse = response as BillingKeyIssueResponse | null | undefined;
  return billingKeyResponse?.billingKeyInfo?.billingKey ?? billingKeyResponse?.billingKey ?? "";
}

function getBusinessSubscriptionErrorMessage(result: BusinessSubscriptionResponse) {
  const baseMessage = result.message ?? "사업자 플랜 전환 결제 처리에 실패했습니다.";

  if (process.env.NODE_ENV === "production") {
    return baseMessage;
  }

  const safeDebug = result.safeDebug ?? result.debug;
  const details = [
    result.step ? `step: ${result.step}` : null,
    result.debugCode ? `debugCode: ${result.debugCode}` : null,
    typeof safeDebug?.portoneStatus === "number" ? `portoneStatus: ${safeDebug.portoneStatus}` : null,
    safeDebug?.portoneCode ? `portoneCode: ${safeDebug.portoneCode}` : null,
    safeDebug?.portoneMessage ? `portoneMessage: ${safeDebug.portoneMessage}` : null,
  ].filter(Boolean);

  return details.length > 0 ? `${baseMessage}\n${details.join("\n")}` : baseMessage;
}

  async function startConversionBilling() {
    // TODO(billing-conversion): 자동결제 구현 시 businessProfileId 소유권, verification_status,
    // menuSiteId 소유권, 개인 체험 전환 가능 상태, 기존 menu_site 유지, 기존 slug/메뉴/이미지 유지,
    // billing key/subscription 생성 성공, subscription_id 저장, 기존 entitlement 전환 또는 신규 entitlement 연결을 서버에서 검증해야 합니다.
    if (!isVerified || verificationState.type !== "verified") {
      setVerificationState({ type: "failed", message: "사업자 인증 완료 후 전환할 수 있습니다." });
      return;
    }

    if (!requiredConsentsAccepted) {
      setVerificationState({ type: "failed", message: "필수 동의 항목을 확인해주세요." });
      return;
    }

    if (!storeId || !billingChannelKey) {
      setVerificationState({
        type: "failed",
        message: "사업자 정기결제용 PortOne 빌링키 채널 환경변수가 필요합니다. NEXT_PUBLIC_PORTONE_BILLING_CHANNEL_KEY 설정을 확인해주세요.",
      });
      return;
    }

    setIsSubmitting(true);
    setVerificationState((current) => ({ ...current, message: "PortOne 빌링키 발급창을 준비하고 있습니다." }));

    try {
      const issueResponse = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey: billingChannelKey,
        billingKeyMethod: "CARD",
        customer: {
          id: menuSiteId,
          name: {
            full: form.representativeName,
          },
        },
        customData: {
          product_key: selectedProduct.product_key,
          plan_type: selectedProduct.plan_type,
          billing_cycle: selectedProduct.billing_cycle,
          billing_channel: "subscription",
          source: "personal_trial_convert",
          menu_site_id: menuSiteId,
          terms_accepted: consents.termsAccepted,
          business_info_accepted: consents.businessInfoAccepted,
          payment_policy_accepted: consents.paymentPolicyAccepted,
          marketing_accepted: consents.marketingAccepted,
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

      setVerificationState((current) => ({ ...current, message: "빌링키로 첫 결제를 요청하고 있습니다." }));

      const response = await fetch("/api/business-subscriptions/start", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mode: "convert",
          billingKey,
          businessProfileId: verificationState.result.businessProfileId,
          productKey: selectedProduct.product_key,
          billingCycle: selectedProduct.billing_cycle,
          menuSiteId,
          consentSnapshot: {
            termsAccepted: consents.termsAccepted,
            businessInfoAccepted: consents.businessInfoAccepted,
            paymentPolicyAccepted: consents.paymentPolicyAccepted,
            marketingAccepted: consents.marketingAccepted,
            consentAgreedAt: new Date().toISOString(),
            consentContext: "personal_trial_convert",
          },
        }),
      });
      const result = (await response.json()) as BusinessSubscriptionResponse;

      if (!response.ok || !result.ok) {
        throw new Error(getBusinessSubscriptionErrorMessage(result));
      }

      window.location.assign("/mypage");
    } catch (error) {
      setVerificationState({
        type: "failed",
        message: error instanceof Error ? error.message : "사업자 플랜 전환 중 알 수 없는 오류가 발생했습니다.",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm">
        <h2 className="text-2xl font-black tracking-tight">사업자 플랜 선택</h2>
        <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
          현재 메뉴판은 아티메뉴 다이닝 체험 메뉴판입니다. 기존 메뉴판을 그대로 이어서 사용하려면 아티메뉴 다이닝 사업자 플랜으로 전환할 수 있습니다.
          아티메뉴 디스플레이 플랜은 템플릿과 화면 구성이 달라 신규 신청으로 제공될 예정입니다.
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
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">오늘 결제 금액</dt>
            <dd className="text-right text-zinc-900">{formatKrw(selectedProduct.amount)}</dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
            <dt className="text-zinc-400">오픈 할인</dt>
            <dd className="text-right text-zinc-900">{openDiscountPolicy.durationLabel}</dd>
          </div>
        </dl>
        <p className="mt-4 break-keep text-xs font-bold leading-relaxed text-zinc-400">
          {openDiscountPolicy.note}
        </p>
        <div className="mt-6">
          <ConsentAgreementBox<ConvertConsentKey>
            values={consents}
            items={convertConsentItems}
            activeKey={activeConsent}
            onChange={updateConsent}
            onToggleAll={toggleAllConsents}
            onOpen={setActiveConsent}
            onClose={() => setActiveConsent(null)}
          />
        </div>
        <div className={`mt-6 whitespace-pre-line rounded-2xl border p-4 text-sm font-bold leading-relaxed ${isVerified ? "border-emerald-100 bg-emerald-50 text-emerald-700" : verificationState.type === "failed" ? "border-red-100 bg-red-50 text-red-700" : "border-amber-100 bg-amber-50 text-amber-800"}`}>
          {isVerified
            ? "사업자 인증이 완료되었습니다. 빌링키를 발급한 뒤 기존 메뉴판을 이어서 사용할 수 있습니다."
            : verificationState.type === "checking"
              ? "사업자 정보를 확인하고 있습니다."
              : verificationState.message}
        </div>
        <button
          type="button"
          onClick={startConversionBilling}
          disabled={!isVerified || !requiredConsentsAccepted || isSubmitting}
          className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-black text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
        >
          {isSubmitting ? "정기결제 처리 중..." : isVerified && requiredConsentsAccepted ? "동의하고 유료 전환하기" : "사업자 인증 및 필수 동의 후 진행 가능"}
        </button>
        {!isPortOneReady && (
          <p className="mt-3 break-keep text-xs font-bold leading-relaxed text-amber-700">
            사업자 월/연 정기결제는 PortOne V2 빌링키 발급을 지원하는 채널의 channelKey가 필요합니다.
          </p>
        )}
      </aside>

      <section className="rounded-3xl border border-zinc-200 bg-white p-7 shadow-sm lg:col-span-2">
        <h2 className="text-2xl font-black tracking-tight">사업자 인증</h2>
        <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
          사업자 플랜 전환은 사업자 정보 확인 후 진행됩니다. 이번 단계에서는 인증만 진행하고, 자동결제 연결은 아직 호출하지 않습니다.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <Field label="상호명" value={form.businessName} onChange={(value) => updateField("businessName", value)} placeholder="아티메뉴카페" required />
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
          <p className={`whitespace-pre-line break-keep text-sm font-bold ${verificationState.type === "verified" ? "text-emerald-700" : verificationState.type === "failed" ? "text-red-700" : "text-zinc-500"}`}>
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
