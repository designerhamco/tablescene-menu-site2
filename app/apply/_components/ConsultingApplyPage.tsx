import { redirect } from "next/navigation";

import { createConsultingApplyAction } from "@/app/apply/actions";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { getBusinessTypeOptions } from "@/lib/business-types";
import { createClient } from "@/lib/supabase/server";

type ConsultingServiceType = "order" | "custom";

type ConsultingApplyPageProps = {
  serviceType: ConsultingServiceType;
  errorMessage?: string;
};

const CONSULTING_COPY: Record<
  ConsultingServiceType,
  {
    eyebrow: string;
    title: string;
    description: string;
    submitLabel: string;
  }
> = {
  order: {
    eyebrow: "TableScene QR Order",
    title: "테이블씬 오더 1.0 상담 신청",
    description: "QR로 주문하고 주방까지 바로 연결되는 오더 시스템 도입을 상담합니다.",
    submitLabel: "도입 문의하기",
  },
  custom: {
    eyebrow: "TableScene Custom",
    title: "테이블씬 커스텀 견적 문의",
    description: "브랜딩과 인터랙션을 담은 프리미엄 웹 메뉴 경험을 프로젝트 단위로 상담합니다.",
    submitLabel: "견적 문의하기",
  },
};

function Field({
  label,
  name,
  placeholder,
  required,
  type = "text",
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-zinc-800">
        {label}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
      />
    </label>
  );
}

function SelectField({
  label,
  name,
  options,
  required,
  helperText,
}: {
  label: string;
  name: string;
  options: readonly (string | { value: string; label: string })[];
  required?: boolean;
  helperText?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-semibold text-zinc-800">
        {label}
        {required ? " *" : ""}
      </span>
      <select
        name={name}
        required={required}
        className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
        defaultValue=""
      >
        <option value="">{label === "업종" ? "업종을 선택해주세요" : "선택해주세요"}</option>
        {options.map((option) => (
          <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
            {typeof option === "string" ? option : option.label}
          </option>
        ))}
      </select>
      {helperText ? <p className="mt-2 break-keep text-xs font-semibold leading-relaxed text-zinc-400">{helperText}</p> : null}
    </label>
  );
}

export default async function ConsultingApplyPage({
  serviceType,
  errorMessage,
}: ConsultingApplyPageProps) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=/apply/${serviceType}`);
  }

  const copy = CONSULTING_COPY[serviceType];
  const isOrder = serviceType === "order";
  const businessTypeOptions = getBusinessTypeOptions(serviceType);

  return (
    <>
      <OfficialSiteNavbar />
      <main className="min-h-screen bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-4xl">
          <header className="mb-10 border-b border-zinc-200 pb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.24em] text-zinc-400">
              {copy.eyebrow}
            </p>
            <h1 className="text-4xl font-bold tracking-tight md:text-5xl">{copy.title}</h1>
            <p className="mt-4 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500">
              {copy.description}
            </p>
          </header>

          <form
            action={createConsultingApplyAction}
            className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8"
          >
            <input type="hidden" name="serviceType" value={serviceType} />

            {errorMessage ? (
              <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                {errorMessage}
              </div>
            ) : null}

            <div className="grid gap-5 md:grid-cols-2">
              <Field label="매장명" name="storeName" placeholder="예: 테이블씬 카페" required />
              <SelectField
                label="업종"
                name="businessCategory"
                options={businessTypeOptions}
                required
                helperText="업종은 템플릿 추천과 신청 정보 확인에 활용됩니다."
              />
              <Field label="담당자명" name="contactName" placeholder="예: 홍길동" required />
              <Field label="연락처" name="contactPhone" placeholder="예: 010-0000-0000" required />
              <Field
                label="이메일"
                name="contactEmail"
                type="email"
                placeholder="예: hello@tablescene.kr"
                required
              />

              {isOrder ? (
                <>
                  <Field label="테이블 수" name="tableCount" placeholder="예: 12개" />
                  <SelectField
                    label="현재 POS 사용 여부"
                    name="posUsage"
                    options={["사용 중", "사용하지 않음", "도입 예정", "상담 필요"]}
                  />
                  <SelectField
                    label="선불/후불 희망"
                    name="paymentPreference"
                    options={["선불", "후불", "둘 다 필요", "상담 필요"]}
                  />
                  <SelectField
                    label="주방 대시보드 필요 여부"
                    name="kitchenDashboard"
                    options={["필요", "불필요", "상담 필요"]}
                  />
                </>
              ) : (
                <>
                  <Field label="원하는 분위기" name="desiredMood" placeholder="예: 고급스럽고 차분한 톤" />
                  <Field label="참고 사이트" name="referenceSite" placeholder="https://example.com" />
                  <Field label="예산 범위" name="budgetRange" placeholder="예: 300만원~500만원" />
                  <Field label="희망 일정" name="timeline" placeholder="예: 6월 오픈 전" />
                </>
              )}
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-semibold text-zinc-800">문의 내용 *</span>
              <textarea
                name="message"
                required
                rows={6}
                placeholder="도입 배경, 필요한 기능, 궁금한 내용을 적어주세요."
                className="mt-2 w-full rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-950 outline-none transition focus:border-zinc-950"
              />
            </label>

            <div className="mt-8 flex justify-end">
              <button
                type="submit"
                className="inline-flex items-center justify-center rounded-full bg-zinc-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-zinc-800"
              >
                {copy.submitLabel}
              </button>
            </div>
          </form>
        </div>
      </main>
    </>
  );
}
