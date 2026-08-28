"use client";

import React from "react";
import { ArrowRight, Check } from "lucide-react";
import { Link } from "react-router";

type ServicePricingKey = "basic" | "display";

type BillingPlan = {
  label: string;
  badge: string;
  title: string;
  price: string;
  subcopy: string;
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
    title: "아티메뉴 다이닝 가격 안내",
    description: "",
    plans: [
      {
        label: "월결제",
        badge: "25% 할인",
        title: "아티메뉴 다이닝",
        price: "9,900원 / 월",
        subcopy: "정가 13,200원 · 오픈할인 25%",
        helper: "매월 자동 갱신",
        savings: "※ 모든 금액은 부가세 포함가입니다.",
        href: "/apply/basic?product=business_basic_monthly",
        aiTitle: "계정 최초 메뉴 웰컴 크레딧",
        aiUsage: "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      },
      {
        label: "연결제",
        badge: "약 40% 할인",
        title: "아티메뉴 다이닝",
        price: "95,000원 / 년",
        subcopy: "연 정가 158,400원 대비 약 40% 할인",
        helper: "오픈 월결제 12개월 대비 약 20% 할인",
        savings: "※ 모든 금액은 부가세 포함가입니다.",
        href: "/apply/basic?product=business_basic_yearly",
        aiTitle: "계정 최초 메뉴 웰컴 크레딧",
        aiUsage: "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      },
    ],
    features: [
      "신규 구매·신규 구독 1건당 Basic 메뉴판 1개",
      "추가 메뉴판은 별도 구매 후 같은 계정에서 관리",
      "정기 결제 갱신 시 기존 메뉴판 이용기간 연장",
      "공개 메뉴판 링크",
      "QR 이미지 다운로드",
      "메뉴 / 가격 / 설명 직접 수정",
      "페이지 · 카테고리 관리",
      "디자이너 템플릿 사용",
      "반응형 화면 지원",
      "모바일 / 태블릿 / PC / 매장 화면 대응",
      "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      "추가 메뉴판·재구독·결제 갱신 시 웰컴 크레딧 추가 없음",
      "보유 AI 크레딧은 계정의 모든 메뉴판에서 사용 가능",
      "부족한 경우 AI 크레딧 추가 충전 가능",
    ],
  },
  display: {
    title: "아티메뉴 디스플레이 가격 안내",
    description: "매장 TV와 모니터에 띄우는 대형 화면용 디지털 메뉴보드입니다.",
    plans: [
      {
        label: "월결제",
        badge: "50% 할인",
        title: "아티메뉴 디스플레이",
        price: "19,800원 / 월",
        subcopy: "정가 39,600원 · 오픈할인 50%",
        helper: "매월 자동 갱신",
        savings: "※ 모든 금액은 부가세 포함가입니다.",
        href: "/apply/display?billing=monthly",
        aiTitle: "계정 최초 메뉴 웰컴 크레딧",
        aiUsage: "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      },
      {
        label: "연결제",
        badge: "약 60% 할인",
        title: "아티메뉴 디스플레이",
        price: "190,000원 / 년",
        subcopy: "연 정가 475,200원 대비 약 60% 할인",
        helper: "오픈 월결제 12개월 대비 약 20% 할인",
        savings: "※ 모든 금액은 부가세 포함가입니다.",
        href: "/apply/display?billing=yearly",
        aiTitle: "계정 최초 메뉴 웰컴 크레딧",
        aiUsage: "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      },
    ],
    features: [
      "신규 Display 구독 1건당 메뉴판 1개",
      "TV / 모니터 화면 최적화",
      "전체화면 링크",
      "매장 화면용 디자인 구성",
      "베이직 주요 기능 포함",
      "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      "추가 메뉴판·재구독·결제 갱신 시 웰컴 크레딧 추가 없음",
      "보유 AI 크레딧은 계정의 모든 메뉴판에서 사용 가능",
      "부족한 경우 AI 크레딧 추가 충전 가능",
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

        <div className="mb-8 rounded-2xl border border-zinc-200 bg-white px-5 py-4 text-center text-sm font-bold leading-relaxed text-zinc-500">
          <p>※ 모든 금액은 부가세 포함가입니다.</p>
          <p>※ 오픈할인은 공식 오픈일로부터 1년간 제공됩니다.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {data.plans.map((plan) => {
            return (
              <div
                key={plan.label}
                className="relative overflow-hidden rounded-[2rem] border border-zinc-950 bg-white p-7 text-zinc-950 md:p-9"
              >
                <div className="absolute right-0 top-0 rounded-bl-[1.4rem] bg-[#F8E731] px-7 py-4 text-sm font-black text-zinc-950 md:text-base">
                  {plan.badge}
                </div>

                <div className="flex min-h-[360px] flex-col pt-6 md:min-h-[390px]">
                  <div>
                    <p className="text-base font-bold text-zinc-500">{plan.label}</p>
                    <h4 className="mt-5 break-keep text-2xl font-bold tracking-tight md:text-3xl">
                      {plan.title}
                    </h4>
                    <p className="mt-4 text-3xl font-black tracking-tight md:text-4xl">
                      {plan.price}
                    </p>
                    <p className="mt-3 break-keep text-sm font-bold leading-relaxed text-zinc-500">
                      {plan.subcopy}
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
