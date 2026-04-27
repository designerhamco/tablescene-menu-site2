"use client";

import PortOne from "@portone/browser-sdk/v2";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import {
  formatKrw,
  isValidMenuSlug,
  menuCreationProduct,
  normalizeMenuSlug,
  type MenuOrderPayload,
} from "@/lib/payments";
import { templateCategoryFilters, type TemplateCatalogItem, type TemplateKey } from "@/lib/templates";

type ApplyOrderFormProps = {
  templates: readonly TemplateCatalogItem[];
  userEmail: string;
  userId: string;
  storeId: string | null;
  channelKey: string | null;
};

type AgreementKey = "terms" | "privacy" | "paymentPolicy";

type FormState = {
  template_key: TemplateKey;
  menuName: string;
  desiredSlug: string;
  restaurantName: string;
  restaurantCategory: string;
  restaurantAddress: string;
  restaurantPhone: string;
  instagramUrl: string;
  notes: string;
  buyerName: string;
  buyerPhone: string;
  buyerEmail: string;
  businessName: string;
  businessNumber: string;
};

type SlugState =
  | { slug: string; type: "idle"; message: string }
  | { slug: string; type: "checking"; message: string }
  | { slug: string; type: "available"; message: string }
  | { slug: string; type: "unavailable"; message: string }
  | { slug: string; type: "error"; message: string };

type UiState =
  | { type: "idle"; message: string | null }
  | { type: "loading"; message: string }
  | { type: "success"; message: string }
  | { type: "error"; message: string };

const initialAgreements: Record<AgreementKey, boolean> = {
  terms: false,
  privacy: false,
  paymentPolicy: false,
};

const agreementLabels: Record<AgreementKey, string> = {
  terms: "서비스 이용약관에 동의합니다.",
  privacy: "개인정보 수집 및 이용에 동의합니다.",
  paymentPolicy: "결제 진행 및 메뉴판 생성 정책에 동의합니다.",
};

function createPaymentId() {
  const randomId = crypto.randomUUID().replaceAll("-", "").slice(0, 18);
  return `tablescene-${Date.now()}-${randomId}`;
}

function createMockPaymentId() {
  const randomId = crypto.randomUUID().replaceAll("-", "").slice(0, 18);
  return `mock_tablescene_${Date.now()}_${randomId}`;
}

function required(value: string) {
  return value.trim().length > 0;
}

function nullable(value: string) {
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function getThumbnailClassName(tone: TemplateCatalogItem["thumbnailTone"]) {
  if (tone === "dark") {
    return "bg-zinc-950 text-white";
  }

  if (tone === "warm") {
    return "bg-[#f6eee3] text-zinc-950";
  }

  return "bg-white text-zinc-950";
}

function getUiStateClassName(type: UiState["type"]) {
  if (type === "success") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }

  if (type === "error") {
    return "border-red-100 bg-red-50 text-red-700";
  }

  return "border-zinc-200 bg-zinc-50 text-zinc-600";
}

function getSlugStateClassName(type: SlugState["type"]) {
  if (type === "available") {
    return "text-emerald-700";
  }

  if (type === "unavailable" || type === "error") {
    return "text-red-700";
  }

  return "text-zinc-400";
}

function TemplatePreview({ template }: { template: TemplateCatalogItem }) {
  return (
    <div className={`mb-4 h-44 rounded-lg border border-zinc-100 p-4 ${getThumbnailClassName(template.thumbnailTone)}`}>
      <div className="flex h-full flex-col">
        <div className="flex items-center justify-between">
          <div className="h-7 w-7 rounded-full bg-current opacity-90" />
          <div className="h-2 w-14 rounded-full bg-current opacity-20" />
        </div>
        <div className="mt-8 space-y-2">
          <div className="h-3 w-24 rounded-full bg-current opacity-90" />
          <div className="h-2 w-32 rounded-full bg-current opacity-20" />
        </div>
        <div className="mt-auto grid grid-cols-2 gap-2">
          {[1, 2].map((item) => (
            <div key={item} className="rounded-lg border border-current/10 bg-white/70 p-2">
              <div className="h-2 w-14 rounded-full bg-zinc-800/70" />
              <div className="mt-2 h-1.5 w-20 rounded-full bg-zinc-400/40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function ApplyOrderForm({ templates, userEmail, userId, storeId, channelKey }: ApplyOrderFormProps) {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [agreements, setAgreements] = useState(initialAgreements);
  const [uiState, setUiState] = useState<UiState>({ type: "idle", message: null });
  const [slugState, setSlugState] = useState<SlugState>({ slug: "", type: "idle", message: "영문 소문자, 숫자, 하이픈만 사용할 수 있습니다." });
  const [form, setForm] = useState<FormState>({
    template_key: templates[0]?.key ?? "design_a",
    menuName: "",
    desiredSlug: "",
    restaurantName: "",
    restaurantCategory: "",
    restaurantAddress: "",
    restaurantPhone: "",
    instagramUrl: "",
    notes: "",
    buyerName: "",
    buyerPhone: "",
    buyerEmail: userEmail,
    businessName: "",
    businessNumber: "",
  });

  const filteredTemplates = useMemo(() => {
    if (selectedCategory === "all") {
      return templates;
    }

    return templates.filter((template) => template.categories.some((category) => category === selectedCategory));
  }, [selectedCategory, templates]);

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.key === form.template_key) ?? templates[0],
    [form.template_key, templates]
  );

  const payload = useMemo<MenuOrderPayload>(
    () => ({
      template_key: form.template_key,
      menuName: form.menuName.trim(),
      desiredSlug: normalizeMenuSlug(form.desiredSlug),
      restaurantName: form.restaurantName.trim(),
      restaurantCategory: form.restaurantCategory.trim(),
      restaurantAddress: form.restaurantAddress.trim(),
      restaurantPhone: form.restaurantPhone.trim(),
      instagramUrl: nullable(form.instagramUrl),
      notes: nullable(form.notes),
      buyerName: form.buyerName.trim(),
      buyerPhone: form.buyerPhone.trim(),
      buyerEmail: form.buyerEmail.trim(),
      businessName: nullable(form.businessName),
      businessNumber: nullable(form.businessNumber),
      amount: menuCreationProduct.amount,
    }),
    [form]
  );

  const isPortOneReady = Boolean(storeId && channelKey);
  const isDevelopment = process.env.NODE_ENV !== "production";
  const isSlugValid = isValidMenuSlug(payload.desiredSlug);
  const visibleSlugState = useMemo<SlugState>(() => {
    if (!payload.desiredSlug) {
      return { slug: "", type: "idle", message: "영문 소문자, 숫자, 하이픈만 사용할 수 있습니다." };
    }

    if (!isSlugValid) {
      return { slug: payload.desiredSlug, type: "unavailable", message: "slug는 3자 이상이며 소문자 영문, 숫자, 하이픈만 사용할 수 있습니다." };
    }

    if (slugState.slug !== payload.desiredSlug) {
      return { slug: payload.desiredSlug, type: "checking", message: "주소 중복을 확인하고 있습니다." };
    }

    return slugState;
  }, [isSlugValid, payload.desiredSlug, slugState]);
  const isSlugAvailable = visibleSlugState.type === "available";
  const isFormReady =
    required(payload.menuName) &&
    isSlugValid &&
    isSlugAvailable &&
    required(payload.restaurantName) &&
    required(payload.restaurantCategory) &&
    required(payload.restaurantAddress) &&
    required(payload.restaurantPhone) &&
    required(payload.buyerName) &&
    required(payload.buyerPhone) &&
    required(payload.buyerEmail) &&
    Object.values(agreements).every(Boolean);
  const isLoading = uiState.type === "loading";

  useEffect(() => {
    const slug = normalizeMenuSlug(form.desiredSlug);

    if (!slug || !isValidMenuSlug(slug)) {
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSlugState({ slug, type: "checking", message: "주소 중복을 확인하고 있습니다." });

      try {
        const response = await fetch(`/api/menu-sites/slug-availability?slug=${encodeURIComponent(slug)}`, {
          signal: controller.signal,
        });
        const result = (await response.json()) as { available?: boolean; message?: string };

        if (!response.ok) {
          setSlugState({ slug, type: "error", message: result.message ?? "주소 확인 중 오류가 발생했습니다." });
          return;
        }

        setSlugState({
          slug,
          type: result.available ? "available" : "unavailable",
          message: result.message ?? (result.available ? "사용 가능한 주소입니다." : "이미 사용 중인 주소입니다."),
        });
      } catch (error) {
        if (!controller.signal.aborted) {
          setSlugState({
            slug,
            type: "error",
            message: error instanceof Error ? error.message : "주소 확인 중 오류가 발생했습니다.",
          });
        }
      }
    }, 350);

    return () => {
      controller.abort();
      window.clearTimeout(timeout);
    };
  }, [form.desiredSlug]);

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: key === "desiredSlug" ? normalizeMenuSlug(String(value)) : value,
    }));
  }

  function toggleAgreement(key: AgreementKey) {
    setAgreements((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function completePayment(paymentId: string) {
    const response = await fetch("/api/payment/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        paymentId,
        orderPayload: payload,
      }),
    });
    const result = (await response.json()) as {
      ok?: boolean;
      message?: string;
      menuSiteId?: string;
      slug?: string;
    };

    if (!response.ok || !result.ok) {
      throw new Error(result.message ?? "결제 검증 또는 메뉴판 생성에 실패했습니다.");
    }

    router.push(`/success?${result.menuSiteId ? `menuSiteId=${encodeURIComponent(result.menuSiteId)}` : `slug=${encodeURIComponent(result.slug ?? payload.desiredSlug)}`}`);
  }

  async function handlePayment() {
    if (!isFormReady || isLoading) {
      return;
    }

    console.log("Table Scene menu order payload", payload);

    if (!isPortOneReady || !storeId || !channelKey) {
      if (!isDevelopment) {
        setUiState({
          type: "success",
          message: "PortOne 공개 환경변수가 없어 결제창은 열지 않았습니다. 콘솔에서 결제 payload를 확인할 수 있습니다.",
        });
        return;
      }

      setUiState({ type: "loading", message: "개발 환경 mock 결제로 메뉴판 생성 흐름을 확인하고 있습니다." });

      try {
        await completePayment(createMockPaymentId());
      } catch (error) {
        setUiState({
          type: "error",
          message: error instanceof Error ? error.message : "mock 결제 처리 중 알 수 없는 오류가 발생했습니다.",
        });
      }

      return;
    }

    const paymentId = createPaymentId();

    setUiState({ type: "loading", message: "결제창을 준비하고 있습니다." });

    try {
      const paymentRequest = {
        storeId,
        channelKey,
        paymentId,
        orderName: menuCreationProduct.name,
        totalAmount: menuCreationProduct.amount,
        currency: menuCreationProduct.currency,
        payMethod: "CARD",
        customer: {
          customerId: userId,
          fullName: payload.buyerName,
          phoneNumber: payload.buyerPhone,
          email: payload.buyerEmail,
        },
        customData: {
          product_key: menuCreationProduct.key,
          template_key: payload.template_key,
          desired_slug: payload.desiredSlug,
        },
      } as unknown as Parameters<typeof PortOne.requestPayment>[0];

      const payment = await PortOne.requestPayment(paymentRequest);

      if (!payment) {
        setUiState({ type: "error", message: "결제가 완료되지 않았습니다. 결제창이 닫혔거나 리디렉션 방식으로 진행 중일 수 있습니다." });
        return;
      }

      if (payment.code) {
        setUiState({ type: "error", message: payment.message ?? "결제가 취소되었거나 실패했습니다." });
        return;
      }

      setUiState({ type: "loading", message: "서버에서 결제를 검증하고 메뉴판을 생성하고 있습니다." });
      await completePayment(payment.paymentId);
    } catch (error) {
      setUiState({
        type: "error",
        message: error instanceof Error ? error.message : "결제 처리 중 알 수 없는 오류가 발생했습니다.",
      });
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <div className="space-y-6">
        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <div className="mb-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Step 1</p>
            <h2 className="text-3xl font-bold tracking-tight">템플릿 선택</h2>
          </div>

          <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
            {templateCategoryFilters.map((filter) => (
              <button
                key={filter.key}
                type="button"
                onClick={() => setSelectedCategory(filter.key)}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                  selectedCategory === filter.key ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-400"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {filteredTemplates.map((template) => {
              const isSelected = form.template_key === template.key;

              return (
                <button
                  key={template.key}
                  type="button"
                  onClick={() => updateField("template_key", template.key)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    isSelected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 bg-white text-zinc-950 hover:border-zinc-400"
                  }`}
                >
                  <TemplatePreview template={template} />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-bold">{template.name}</h3>
                      <p className={`mt-1 font-mono text-xs font-bold ${isSelected ? "text-white/60" : "text-zinc-400"}`}>{template.key}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${isSelected ? "bg-[#F8E731] text-zinc-950" : "bg-zinc-100 text-zinc-500"}`}>
                      {isSelected ? "선택됨" : template.badge}
                    </span>
                  </div>
                  <p className={`mt-3 break-keep text-sm font-medium leading-relaxed ${isSelected ? "text-white/70" : "text-zinc-500"}`}>
                    {template.description}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Step 2</p>
          <h2 className="mb-6 text-3xl font-bold tracking-tight">메뉴판 기본 정보</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="메뉴판 이름" value={form.menuName} onChange={(value) => updateField("menuName", value)} required />
            <Field label="희망 slug" value={form.desiredSlug} onChange={(value) => updateField("desiredSlug", value)} required />
            <p className={`-mt-3 text-xs font-bold md:col-start-2 ${getSlugStateClassName(visibleSlugState.type)}`}>{visibleSlugState.message}</p>
            <Field label="레스토랑 이름" value={form.restaurantName} onChange={(value) => updateField("restaurantName", value)} required />
            <Field label="레스토랑 카테고리" value={form.restaurantCategory} onChange={(value) => updateField("restaurantCategory", value)} required />
            <Field label="주소" value={form.restaurantAddress} onChange={(value) => updateField("restaurantAddress", value)} required className="md:col-span-2" />
            <Field label="전화번호" value={form.restaurantPhone} onChange={(value) => updateField("restaurantPhone", value)} required />
            <Field label="인스타그램 URL" value={form.instagramUrl} onChange={(value) => updateField("instagramUrl", value)} />
            <TextAreaField label="요청사항" value={form.notes} onChange={(value) => updateField("notes", value)} className="md:col-span-2" />
          </div>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Step 3</p>
          <h2 className="mb-6 text-3xl font-bold tracking-tight">주문자 정보</h2>
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="주문자 이름" value={form.buyerName} onChange={(value) => updateField("buyerName", value)} required />
            <Field label="주문자 전화번호" value={form.buyerPhone} onChange={(value) => updateField("buyerPhone", value)} required />
            <Field label="주문자 이메일" value={form.buyerEmail} onChange={(value) => updateField("buyerEmail", value)} required />
            <Field label="상호명" value={form.businessName} onChange={(value) => updateField("businessName", value)} />
            <Field label="사업자등록번호" value={form.businessNumber} onChange={(value) => updateField("businessNumber", value)} />
          </div>
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Step 4</p>
          <h2 className="text-2xl font-bold tracking-tight">주문 요약</h2>
          <dl className="mt-6 space-y-4 text-sm font-medium">
            <SummaryRow label="상품명" value={menuCreationProduct.name} />
            <SummaryRow label="선택 템플릿" value={selectedTemplate ? `${selectedTemplate.name} (${selectedTemplate.key})` : "-"} />
            <SummaryRow label="메뉴판 이름" value={payload.menuName || "-"} />
            <SummaryRow label="공개 예정 URL" value={payload.desiredSlug ? `/m/${payload.desiredSlug}` : "-"} />
            <SummaryRow label="금액" value={formatKrw(menuCreationProduct.amount)} strong />
          </dl>
          <p className="mt-5 break-keep text-xs font-semibold leading-relaxed text-zinc-400">VAT 포함 금액입니다. 결제 검증 성공 후 메뉴판이 자동 생성됩니다.</p>
        </section>

        <section className="rounded-3xl bg-white p-7 shadow-sm">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">Step 5</p>
          <h2 className="mb-5 text-2xl font-bold tracking-tight">약관 동의</h2>
          <div className="space-y-3">
            {(Object.keys(agreementLabels) as AgreementKey[]).map((key) => (
              <label key={key} className="flex items-start gap-3 text-sm font-bold leading-relaxed text-zinc-600">
                <input type="checkbox" checked={agreements[key]} onChange={() => toggleAgreement(key)} className="mt-1 h-4 w-4 accent-zinc-950" />
                {agreementLabels[key]}
              </label>
            ))}
          </div>

          {!isPortOneReady && (
            <div className="mt-6 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm font-bold leading-relaxed text-amber-700">
              {isDevelopment
                ? "PortOne 공개 환경변수가 없어서 개발 환경 mock 결제로 메뉴판 생성 흐름을 테스트합니다."
                : "PortOne 공개 환경변수가 없어서 결제 버튼은 payload 콘솔 확인 모드로 동작합니다."}
            </div>
          )}

          {uiState.message && (
            <div className={`mt-6 rounded-2xl border p-4 text-sm font-bold leading-relaxed ${getUiStateClassName(uiState.type)}`}>{uiState.message}</div>
          )}

          <button
            type="button"
            onClick={handlePayment}
            disabled={!isFormReady || isLoading}
            className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300"
          >
            {isLoading ? "처리 중..." : isPortOneReady ? "결제하고 메뉴판 생성하기" : isDevelopment ? "mock 결제로 생성 테스트" : "결제 payload 확인"}
          </button>
        </section>
      </aside>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  required: isRequired,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">
        {label}
        {isRequired && <span className="text-red-500"> *</span>}
      </span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
      />
    </label>
  );
}

function TextAreaField({
  label,
  value,
  onChange,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-bold uppercase tracking-[0.18em] text-zinc-400">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 min-h-28 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 outline-none transition focus:border-zinc-950"
      />
    </label>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-t border-zinc-100 pt-4">
      <dt className="text-zinc-400">{label}</dt>
      <dd className={`text-right ${strong ? "text-xl font-black text-zinc-950" : "font-bold text-zinc-800"}`}>{value}</dd>
    </div>
  );
}
