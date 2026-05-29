import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createConsultingApplyAction } from "@/app/apply/actions";
import Footer from "@/app/components/layout/Footer";
import OfficialSiteNavbar from "@/components/layout/OfficialSiteNavbar";
import { getBusinessTypeOptions } from "@/lib/business-types";
import { createClient } from "@/lib/supabase/server";

type PageProps = {
  searchParams: Promise<{ error?: string }>;
};

export const metadata: Metadata = {
  title: "메뉴링크 커스텀 견적 문의 | MenuLink",
  description: "브랜딩과 인터랙션을 담은 프리미엄 웹 메뉴 경험 상담 신청 페이지입니다.",
};

const moodOptions = ["고급스러운", "미니멀한", "감각적인", "브랜드 스토리 중심", "인터랙티브한", "아직 미정"];
const featureOptions = [
  "모바일 웹 메뉴판",
  "태블릿 메뉴판",
  "PC/대형 화면 대응",
  "모션 인터랙션",
  "코스 메뉴 흐름",
  "와인/페어링 정보",
  "브랜드 스토리",
  "기타",
];
const budgetOptions = ["150만 원 이하", "150만 원 ~ 300만 원", "300만 원 ~ 500만 원", "500만 원 이상", "아직 미정"];

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
      <span className="text-sm font-bold text-zinc-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <input
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-950"
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
      <span className="text-sm font-bold text-zinc-800">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </span>
      <select
        name={name}
        required={required}
        defaultValue=""
        className="mt-2 w-full rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 outline-none transition focus:border-zinc-950"
      >
        <option value="">{label === "업종" ? "업종을 선택해주세요" : "선택해주세요"}</option>
        {options.map((option) => (
          <option key={typeof option === "string" ? option : option.value} value={typeof option === "string" ? option : option.value}>
            {typeof option === "string" ? option : option.label}
          </option>
        ))}
      </select>
      {helperText ? <p className="mt-2 break-keep text-xs font-bold leading-relaxed text-zinc-400">{helperText}</p> : null}
    </label>
  );
}

export default async function ApplyCustomPage({ searchParams }: PageProps) {
  const { error } = await searchParams;
  const businessTypeOptions = getBusinessTypeOptions("custom");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/sign-in?next=/apply/custom");
  }

  return (
    <>
      <OfficialSiteNavbar />
      <main className="bg-zinc-50 px-6 py-16 text-zinc-950">
        <div className="mx-auto w-full max-w-6xl">
          <header className="grid gap-8 border-b border-zinc-200 pb-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
            <div>
              <h1 className="max-w-3xl break-keep text-4xl font-black tracking-tight md:text-5xl">
                메뉴링크 커스텀 견적 문의
              </h1>
              <p className="mt-5 max-w-2xl break-keep text-base font-semibold leading-relaxed text-zinc-500">
                브랜딩과 인터랙션을 담은 프리미엄 웹 메뉴 경험을 주문제작 프로젝트로 상담합니다.
              </p>
            </div>
            <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
              <p className="break-keep text-2xl font-black tracking-tight">상담형 · 견적 문의형</p>
              <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                결제 없이 프로젝트 범위와 예산을 먼저 확인합니다. 접수 후 담당자가 맞춤 제작 범위와 일정, 견적을 안내합니다.
              </p>
            </div>
          </header>

          <form action={createConsultingApplyAction} className="mt-10 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
            <input type="hidden" name="serviceType" value="custom" />

            <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm md:p-8">
              {error ? (
                <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">
                  {error}
                </div>
              ) : null}

              <div className="mb-6">
                <h2 className="text-3xl font-black tracking-tight">기본 신청 정보</h2>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                <Field label="매장명" name="storeName" placeholder="예: 메뉴링크 다이닝" required />
                <SelectField
                  label="업종"
                  name="businessCategory"
                  options={businessTypeOptions}
                  required
                  helperText="업종은 템플릿 추천과 신청 정보 확인에 활용됩니다."
                />
                <Field label="담당자명" name="contactName" placeholder="예: 홍길동" required />
                <Field label="연락처" name="contactPhone" placeholder="예: 010-0000-0000" required />
                <Field label="이메일" name="contactEmail" type="email" placeholder="예: hello@example.com" required />
                <SelectField label="원하는 분위기" name="desiredMood" options={moodOptions} />
                <Field label="참고 사이트" name="referenceSite" placeholder="https://example.com" />
                <SelectField label="예산 범위" name="budgetRange" options={budgetOptions} />
                <Field label="희망 일정" name="timeline" placeholder="예: 6월 오픈 전, 8주 이내" />
              </div>

              <fieldset className="mt-6">
                <legend className="text-sm font-bold text-zinc-800">필요한 기능</legend>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {featureOptions.map((feature) => (
                    <label key={feature} className="flex items-center gap-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm font-bold text-zinc-700">
                      <input type="checkbox" name="neededFeatures" value={feature} className="h-4 w-4 accent-zinc-950" />
                      <span>{feature}</span>
                    </label>
                  ))}
                </div>
              </fieldset>

              <label className="mt-6 block">
                <span className="text-sm font-bold text-zinc-800">
                  문의 내용 <span className="text-red-500">*</span>
                </span>
                <textarea
                  name="message"
                  required
                  rows={7}
                  placeholder="브랜드 방향, 필요한 화면, 메뉴 구성, 인터랙션 아이디어, 제작 범위 등을 자유롭게 남겨주세요."
                  className="mt-2 w-full resize-y rounded-2xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold leading-relaxed text-zinc-950 outline-none transition focus:border-zinc-950"
                />
              </label>
            </section>

            <aside className="space-y-6 lg:sticky lg:top-8 lg:self-start">
              <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h2 className="text-2xl font-black tracking-tight">상담 신청하기</h2>
                <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-zinc-500">
                  결제 버튼은 제공하지 않습니다. 접수된 내용은 문의 내역으로 저장되고, 프로젝트 상담 후 별도 견적을 안내합니다.
                </p>
                <button
                  type="submit"
                  className="mt-6 inline-flex w-full items-center justify-center rounded-full bg-zinc-950 px-5 py-4 text-sm font-bold text-white transition hover:bg-zinc-800"
                >
                  견적 문의하기
                </button>
              </section>
            </aside>
          </form>
        </div>
      </main>
      <Footer />
    </>
  );
}
