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
    title: "베이직·다이닝 가격 안내",
    description: "메뉴판 1개당 기본 디자인 또는 디자인 포함 이용권을 선택하고, 같은 서비스 안에서 포함된 디자인끼리 교체할 수 있습니다.",
    plans: [
      {
        label: "베이직 플랜 월 구독",
        badge: "오픈 얼리버드",
        title: "베이직 기본 디자인",
        price: "4,900원 / 월",
        subcopy: "기본 정상가 5,900원 · 디자인 포함 월 6,800원",
        helper: "매월 자동 갱신",
        savings: "※ 모든 금액은 부가세 포함가입니다.",
        href: "/apply/basic?product=business_basic_single_monthly",
        aiTitle: "계정 최초 메뉴 웰컴 크레딧",
        aiUsage: "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      },
      {
        label: "다이닝 플랜 월 구독",
        badge: "오픈 얼리버드",
        title: "다이닝 기본 디자인",
        price: "6,900원 / 월",
        subcopy: "기본 정상가 8,900원 · 디자인 포함 월 8,800원",
        helper: "매월 자동 갱신",
        savings: "※ 모든 금액은 부가세 포함가입니다.",
        href: "/apply/basic?product=business_basic_multi_monthly",
        aiTitle: "계정 최초 메뉴 웰컴 크레딧",
        aiUsage: "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      },
    ],
    features: [
      "베이직: 할인 · 위젯 제공",
      "다이닝: 할인 · 여러 페이지 구성 제공",
      "호출 · 후불 주문 연결 준비 중 · 선결제 미제공",
      "신규 구매·신규 구독 1건당 메뉴판 1개",
      "같은 서비스의 이용권 범위 안에서 디자인 교체",
      "새 메뉴판으로 기존 메뉴 데이터 가져오기 지원",
      "정기 결제 갱신 시 기존 메뉴판 이용기간 연장",
      "공개 메뉴판 링크",
      "QR 이미지 다운로드",
      "메뉴 / 가격 / 설명 직접 수정",
      "페이지 · 카테고리 관리",
      "디자인 포함 이용권 선택 시 디자이너 템플릿 사용",
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
        label: "디스플레이 템플릿 월 구독",
        badge: "오픈 얼리버드",
        title: "디스플레이 디자인 1개",
        price: "10,900원 / 월",
        subcopy: "정상가 12,900원",
        helper: "매월 자동 갱신",
        savings: "※ 모든 금액은 부가세 포함가입니다.",
        href: "/apply/display?billing=monthly",
        aiTitle: "계정 최초 메뉴 웰컴 크레딧",
        aiUsage: "첫 메뉴 생성 완료 시 AI 크레딧 6개를 계정당 1회 제공",
      },
    ],
    features: [
      "신규 Display 구독 1건당 메뉴판 1개",
      "TV / 모니터 화면 최적화",
      "이미지 · MP4 동영상 업로드 포함",
      "동영상 최대 30MB · 메뉴판당 최대 2개",
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
    <section className="site-gutter py-20 md:py-28">
      <div className="mx-auto max-w-[var(--site-content-width)]">
        <div className="mx-auto mb-10 max-w-3xl text-center">
          <h2 className="type-section-title text-zinc-950">
            {data.title}
          </h2>
          {data.description ? (
            <p className="mt-5 break-keep text-copy font-medium leading-relaxed text-zinc-500 md:text-lg">
              {data.description}
            </p>
          ) : null}
        </div>

        <div className="site-section mb-8 px-5 py-4 text-center text-copy font-medium leading-relaxed text-zinc-500">
          <p>※ 모든 금액은 부가세 포함가입니다.</p>
          <p>※ 첫 구독은 계정당 최초 1회 30일 무료이며, 오픈 얼리버드는 2026년 12월 31일까지 가입할 수 있습니다.</p>
          <p>※ 얼리버드 가격은 구독을 유지하는 동안 계속 적용되며, 해지 후 재구독 시 정상가가 적용됩니다.</p>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          {data.plans.map((plan) => {
            return (
              <div
                key={plan.label}
                className="site-section relative overflow-hidden p-7 text-zinc-950 md:p-9"
              >
                <div className="absolute right-0 top-0 rounded-bl-[1.4rem] bg-[#F8E731] px-7 py-4 text-copy font-medium text-zinc-950 md:text-copy">
                  {plan.badge}
                </div>

                <div className="flex min-h-[360px] flex-col pt-6 md:min-h-[390px]">
                  <div>
                    <p className="text-copy font-medium text-zinc-500">{plan.label}</p>
                    <h4 className="type-subsection-title mt-5">
                      {plan.title}
                    </h4>
                    <p className="mt-4 text-3xl font-bold tracking-tight md:text-4xl">
                      {plan.price}
                    </p>
                    <p className="mt-3 break-keep text-copy font-medium leading-relaxed text-zinc-500">
                      {plan.subcopy}
                    </p>
                  </div>

                  <ul className="mt-9 space-y-4">
                    {[plan.helper, plan.savings, plan.aiUsage].map((item) => (
                      <li key={item} className="flex items-start gap-3 break-keep text-copy font-semibold leading-relaxed text-zinc-600">
                        <Check className="mt-1 h-5 w-5 shrink-0 text-zinc-950" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    to={plan.href}
                    className="site-button site-button-primary mt-auto inline-flex w-full items-center justify-center"
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
            <div key={feature} className="flex items-start gap-2 break-keep text-copy font-semibold leading-relaxed text-zinc-600">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F8E731]" />
              <span>{feature}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
