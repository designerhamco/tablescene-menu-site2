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
};

const PRICING_DATA: Record<ServicePricingKey, PricingData> = {
  basic: {
    title: "테이블씬 베이직 가격 안내",
    description: "",
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
      "AI 작성 도우미 기본 제공",
    ],
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
      "AI 작성 도우미 기본 제공",
    ],
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
          {data.description ? (
            <p className="mt-5 break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
              {data.description}
            </p>
          ) : null}
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {data.plans.map((plan) => {
            return (
              <div
                key={plan.label}
                className="relative overflow-hidden rounded-[2rem] border border-zinc-950 bg-white p-7 text-zinc-950 md:p-9"
              >
                <div className="absolute right-0 top-0 rounded-bl-[1.4rem] bg-[#F8E731] px-7 py-4 text-sm font-black text-zinc-950 md:text-base">
                  50% 할인
                </div>

                <div className="flex min-h-[360px] flex-col pt-6 md:min-h-[390px]">
                  <div>
                    <p className="text-base font-bold text-zinc-500">{plan.label}</p>
                    <h4 className="mt-5 break-keep text-2xl font-bold tracking-tight md:text-3xl">
                      {service === "basic" ? "TableScene Basic" : "TableScene Display"}
                    </h4>
                    <p className="mt-4 text-base font-bold text-zinc-400 line-through">
                      {plan.regularPrice}
                    </p>
                    <p className="mt-2 text-3xl font-black tracking-tight md:text-4xl">
                      {plan.salePrice}
                    </p>
                  </div>

                  <ul className="mt-9 space-y-4">
                    {[plan.helper, plan.savings, plan.aiUsage].map((item) => (
                      <li key={item} className="flex items-start gap-3 break-keep text-base font-semibold leading-relaxed text-zinc-600">
                        <Check className="mt-1 h-5 w-5 shrink-0 text-zinc-950" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={plan.href}
                    className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-950 px-6 py-4 text-base font-bold text-white transition-colors hover:bg-zinc-800 md:py-5 md:text-lg"
                  >
                    {plan.label}로 만들기
                    <ArrowRight className="h-5 w-5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-8 grid gap-3 border-t border-zinc-200 pt-7 sm:grid-cols-2 lg:grid-cols-4">
          {data.features.map((feature) => (
            <div key={feature} className="flex items-start gap-2 break-keep text-sm font-semibold leading-relaxed text-zinc-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F8E731]" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
