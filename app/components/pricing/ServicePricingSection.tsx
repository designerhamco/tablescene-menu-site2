"use client";

import React from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router";

type ServicePricingKey = "basic" | "display";

type BillingPlan = {
  label: string;
  regularPrice: string;
  salePrice: string;
  helper: string;
  savings: string;
  href: string;
  aiTitle: string;
  aiUsage: string;
};

type PricingData = {
  title: string;
  description: string;
  plans: BillingPlan[];
  features: string[];
  note: string;
};

const PRICING_DATA: Record<ServicePricingKey, PricingData> = {
  basic: {
    title: "테이블씬 베이직 가격 안내",
    description: "메뉴와 가격표를 직접 관리하는 기본 디지털 메뉴판입니다.",
    plans: [
      {
        label: "월 결제",
        regularPrice: "월 12,000원",
        salePrice: "월 6,000원",
        helper: "매월 자동 갱신",
        savings: "부담 없이 시작하기",
        href: "/apply/basic?billing=monthly",
        aiTitle: "AI 작성 도우미 기본 제공",
        aiUsage: "설명 작성 10회 · 메뉴 정리 2회 · 자동 번역 1페이지",
      },
      {
        label: "연 결제",
        regularPrice: "연 120,000원",
        salePrice: "연 60,000원",
        helper: "월 5,000원 수준",
        savings: "월 결제보다 연 12,000원 절약",
        href: "/apply/basic?billing=yearly",
        aiTitle: "AI 작성 도우미 연간 제공",
        aiUsage: "설명 작성 120회 · 메뉴 정리 24회 · 자동 번역 12페이지",
      },
    ],
    features: [
      "디지털 메뉴판 1개",
      "공개 메뉴판 링크",
      "QR 이미지 다운로드",
      "메뉴 / 가격 / 설명 직접 수정",
      "페이지 · 카테고리 관리",
      "디자이너 템플릿 사용",
      "반응형 화면 지원",
      "모바일 / 태블릿 / PC / 매장 화면 대응",
    ],
    note: "월 결제 이용 중 연 결제로 변경을 원하시는 경우 고객지원으로 문의해주세요. 현재 이용 기간 종료 후 연 결제로 변경을 도와드립니다.",
  },
  display: {
    title: "테이블씬 디스플레이 가격 안내",
    description: "매장 TV와 모니터에 띄우는 대형 화면용 디지털 메뉴보드입니다.",
    plans: [
      {
        label: "월 결제",
        regularPrice: "월 24,000원",
        salePrice: "월 12,000원",
        helper: "매월 자동 갱신",
        savings: "매장 화면부터 가볍게 시작",
        href: "/apply/display?billing=monthly",
        aiTitle: "AI 작성 도우미 기본 제공",
        aiUsage: "설명 작성 10회 · 메뉴 정리 2회 · 자동 번역 1페이지",
      },
      {
        label: "연 결제",
        regularPrice: "연 240,000원",
        salePrice: "연 120,000원",
        helper: "월 10,000원 수준",
        savings: "월 결제보다 연 24,000원 절약",
        href: "/apply/display?billing=yearly",
        aiTitle: "AI 작성 도우미 연간 제공",
        aiUsage: "설명 작성 120회 · 메뉴 정리 24회 · 자동 번역 12페이지",
      },
    ],
    features: [
      "디스플레이용 메뉴보드 1개",
      "TV / 모니터 화면 최적화",
      "큰 화면용 레이아웃",
      "전체화면 링크",
      "매장 화면용 디자인 구성",
      "베이직 주요 기능 포함",
    ],
    note: "월 결제 이용 중 연 결제로 변경을 원하시는 경우 고객지원으로 문의해주세요. 현재 이용 기간 종료 후 연 결제로 변경을 도와드립니다.",
  },
};

export default function ServicePricingSection({ service }: { service: ServicePricingKey }) {
  const data = PRICING_DATA[service];

  return (
    <section className="px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="break-keep text-3xl font-bold leading-tight tracking-tight text-zinc-950 md:text-5xl">
            {data.title}
          </h2>
          <p className="mt-5 break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
            {data.description}
          </p>
        </div>

        <div className="rounded-[2rem] bg-zinc-950 p-6 text-white md:p-8">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <h3 className="break-keep text-2xl font-bold tracking-tight md:text-3xl">
              {service === "basic" ? "테이블씬 베이직" : "테이블씬 디스플레이"}
            </h3>
            <span className="flex h-20 w-20 shrink-0 flex-col items-center justify-center rounded-full bg-[#F8E731] text-center text-zinc-950">
              <span className="text-xl font-black leading-none">50%</span>
              <span className="mt-1 text-[11px] font-bold leading-none">오픈할인</span>
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {data.plans.map((plan, index) => {
              const isAnnual = index === 1;

              return (
                <div
                  key={plan.label}
                  className={`rounded-[1.5rem] border p-5 md:p-6 ${
                    isAnnual
                      ? "border-white/10 bg-white text-zinc-950"
                      : "border-white/10 bg-white/5 text-white"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className={`text-sm font-bold ${isAnnual ? "text-zinc-400" : "text-white/50"}`}>{plan.label}</p>
                      <div className="mt-6 flex flex-wrap items-end gap-3">
                        <span className={`text-base font-bold line-through ${isAnnual ? "text-zinc-300" : "text-white/35"}`}>
                          {plan.regularPrice}
                        </span>
                        <span className="text-4xl font-bold tracking-tight">{plan.salePrice}</span>
                      </div>
                      <p className={`mt-3 text-sm font-bold ${isAnnual ? "text-zinc-500" : "text-white/55"}`}>{plan.helper}</p>
                      <p className={`mt-1 text-xs font-bold ${isAnnual ? "text-zinc-400" : "text-white/40"}`}>{plan.savings}</p>
                    </div>
                  </div>

                  <div className={`mt-6 rounded-2xl p-4 ${isAnnual ? "bg-zinc-50" : "bg-white/5"}`}>
                    <p className={`text-xs font-bold ${isAnnual ? "text-zinc-400" : "text-white/40"}`}>{plan.aiTitle}</p>
                    <p className={`mt-2 break-keep text-sm font-bold leading-relaxed ${isAnnual ? "text-zinc-950" : "text-white"}`}>
                      {plan.aiUsage}
                    </p>
                  </div>

                  <Link
                    to={plan.href}
                    className={`mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-bold transition-colors ${
                      isAnnual
                        ? "bg-zinc-950 text-white hover:bg-zinc-800"
                        : "bg-white text-zinc-950 hover:bg-zinc-100"
                    }`}
                  >
                    {plan.label}로 만들기
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              );
            })}
          </div>

          <div className="mt-6 grid gap-3 border-t border-white/10 pt-6 sm:grid-cols-2 lg:grid-cols-4">
            {data.features.map((feature) => (
              <div key={feature} className="flex items-start gap-2 break-keep text-sm font-semibold leading-relaxed text-white/70">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F8E731]" />
                <span>{feature}</span>
              </div>
            ))}
          </div>

          <div className="mt-6 rounded-[1.2rem] border border-white/10 bg-white/5 p-5">
            <p className="break-keep text-sm font-semibold leading-relaxed text-white/65">
              자동 번역은 페이지 단위로 제공되며, 선택한 페이지의 한국어 내용을 영어·중국어·일본어로 번역합니다. 미사용 월 제공량은 다음 달로 이월되지 않습니다.
            </p>
            <p className="mt-3 break-keep text-sm font-semibold leading-relaxed text-white/65">
              {data.note}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
