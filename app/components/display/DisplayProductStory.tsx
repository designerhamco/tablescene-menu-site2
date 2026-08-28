"use client";

import React from "react";
import { motion } from "motion/react";
import { Monitor, RefreshCw, Tv } from "lucide-react";

import { MarketingSectionCopy } from "@/app/components/home/MarketingSectionCopy";

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

const menuColumns = [
  ["Americano", "4.5"],
  ["Cafe latte", "5.5"],
  ["Flat white", "5.8"],
  ["Vanilla latte", "6.0"],
];

function DisplayMenuScreen({ tone = "light" }: { tone?: "light" | "dark" | "warm" }) {
  const toneClass = tone === "dark"
    ? "bg-zinc-950 text-white"
    : tone === "warm"
      ? "bg-[#e9dfce] text-zinc-950"
      : "bg-[#f7f3ea] text-zinc-950";

  return (
    <div className={`flex h-full flex-col overflow-hidden ${toneClass}`}>
      <div className="flex items-center justify-between border-b border-current/15 px-5 py-4">
        <div>
          <p className="text-sm font-black tracking-[-0.04em]">AUBE COFFEE</p>
          <p className="mt-1 text-[7px] font-bold uppercase tracking-[0.2em] opacity-45">Coffee · Dessert</p>
        </div>
        <span className="rounded-full bg-[#F8E731] px-2 py-1 text-[7px] font-black text-zinc-950">OPEN</span>
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-[1.05fr_0.95fr] gap-4 p-5">
        <div className="overflow-hidden rounded-xl bg-zinc-300">
          <img
            src="/menu-templates/cafe_design_a/black-sesame-featured.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
        <div className="flex flex-col justify-center gap-3">
          {menuColumns.map(([name, price]) => (
            <div key={name} className="flex items-center justify-between gap-3 border-b border-current/15 pb-2 text-[9px] font-black md:text-[11px]">
              <span>{name}</span>
              <span>{price}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
function CeilingDisplayMockup() {
  return (
    <div className="relative h-full overflow-hidden bg-zinc-900">
      <img
        src="https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=85&w=2200&auto=format&fit=crop"
        alt="카페 천장에 설치된 디스플레이 메뉴판 목업을 위한 임시 매장 이미지"
        className="h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/5 to-black/55" />

      <div className="absolute left-1/2 top-[14%] flex w-[88%] max-w-[1180px] -translate-x-1/2 items-start justify-center gap-2 sm:gap-4 md:gap-6">
        {["light", "dark", "warm"].map((tone, index) => (
          <div key={tone} className={`relative w-1/3 ${index === 1 ? "translate-y-5" : ""}`}>
            <span className="absolute bottom-full left-[18%] h-20 w-1 bg-zinc-950 md:h-28" />
            <span className="absolute bottom-full right-[18%] h-20 w-1 bg-zinc-950 md:h-28" />
            <div className="aspect-[16/10] overflow-hidden border-[5px] border-zinc-950 bg-white shadow-[0_30px_70px_rgba(0,0,0,0.48)] md:border-[9px]">
              <DisplayMenuScreen tone={tone as "light" | "dark" | "warm"} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DisplayHero() {
  return (
    <section className="overflow-hidden bg-[linear-gradient(155deg,#a97e00_0%,#e5c546_24%,#fff0a3_100%)] text-zinc-950">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.7 }}
        className="h-[58vh] min-h-[480px] md:h-[66vh] md:min-h-[610px]"
      >
        <CeilingDisplayMockup />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.08 }}
        className="mx-auto max-w-[1120px] px-6 pb-28 pt-16 text-center md:pb-40 md:pt-24"
      >
        <p className="text-base font-bold leading-[1.35] tracking-[-0.02em] md:text-lg">매장을 완성하는 디지털 메뉴보드</p>
        <h1 className="mt-[1.125rem] break-keep text-[clamp(2.75rem,7vw,6rem)] font-bold leading-[1.02] tracking-[-0.055em]">
          메뉴가 가장 잘 보이는<br />아티메뉴 디스플레이
        </h1>
        <p className="mx-auto mt-[1.375rem] max-w-2xl break-keep text-sm font-medium leading-[1.75] text-zinc-700 md:text-base">
          매장 TV와 모니터를 멀리서도 메뉴명과 가격이 또렷한 디지털 메뉴보드로 전환합니다.
        </p>
      </motion.div>
    </section>
  );
}

function StoryVisualFrame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      {...fadeUp}
      transition={{ ...fadeUp.transition, delay: 0.08 }}
      className="h-[380px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#171717] shadow-2xl md:h-[500px]"
    >
      {children}
    </motion.div>
  );
}

function DisplayDarkStorySection({
  eyebrow,
  title,
  body,
  image,
  reverse = false,
  endOfRegion = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  image: string;
  reverse?: boolean;
  endOfRegion?: boolean;
}) {
  const spacingClass = endOfRegion
    ? "pb-36 pt-20 md:pb-52 md:pt-24"
    : "py-20 md:py-24";

  return (
    <section className={`bg-transparent px-6 text-white md:px-10 ${spacingClass}`}>
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <motion.div {...fadeUp} className={reverse ? "lg:order-2" : ""}>
          <MarketingSectionCopy inverted eyebrow={eyebrow} title={title} body={body} className="max-w-xl" />
        </motion.div>
        <div className={reverse ? "lg:order-1" : ""}>
          <StoryVisualFrame>
            <img src={image} alt="" className="h-full w-full object-cover" />
          </StoryVisualFrame>
        </div>
      </div>
    </section>
  );
}

export function DisplayPurposeSection() {
  return (
    <DisplayDarkStorySection
      eyebrow="대형 화면 전용 메뉴판"
      title={<>손님이 여는 메뉴판이 아닌<br />매장이 보여주는 화면</>}
      body="카운터 뒤 TV와 매장 모니터에 계속 띄워두는 화면으로, 메뉴와 가격을 한눈에 전달합니다."
      image="https://images.unsplash.com/photo-1556742502-ec7c0e9f34b1?q=85&w=1600&auto=format&fit=crop"
    />
  );
}

export function ExistingScreenSection() {
  return (
    <DisplayDarkStorySection
      reverse
      eyebrow="기존 화면 활용"
      title={<>가지고 있는 TV와 모니터의<br />디지털 메뉴보드 전환</>}
      body="스마트 TV 브라우저 또는 노트북·미니 PC·TV 스틱을 연결해 전용 링크를 전체화면으로 사용할 수 있습니다."
      image="https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=85&w=1600&auto=format&fit=crop"
    />
  );
}

export function ReadabilitySection() {
  return (
    <DisplayDarkStorySection
      eyebrow="먼 거리 가독성"
      title={<>먼저 읽히는 메뉴명과 가격</>}
      body="큰 글씨와 넓은 간격, 명확한 카테고리로 몇 걸음 떨어진 거리에서도 핵심 정보가 선명합니다."
      image="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=85&w=1600&auto=format&fit=crop"
    />
  );
}

export function ScreenFitSection() {
  return (
    <DisplayDarkStorySection
      reverse
      eyebrow="화면 맞춤 구성"
      title={<>메뉴 수와 화면에 맞춘<br />보기 좋은 비율</>}
      body="메뉴 개수와 화면 크기에 따라 여백·열 구성·글자 크기를 조정해 가독성을 유지합니다."
      image="https://images.unsplash.com/photo-1556157382-97eda2d62296?q=85&w=1600&auto=format&fit=crop"
    />
  );
}

export function LiveUpdateSection() {
  return (
    <DisplayDarkStorySection
      eyebrow="빠른 콘텐츠 수정"
      title={<>가격과 품절 상태의<br />빠른 화면 반영</>}
      body="마이페이지에서 메뉴·가격·품절·시즌 안내를 수정하면 새 출력물이나 이미지 작업 없이 화면에 반영됩니다."
      image="https://images.unsplash.com/photo-1581291518857-4e27b48ff24e?q=85&w=1600&auto=format&fit=crop"
    />
  );
}

export function DisplayLinkSection() {
  return (
    <DisplayDarkStorySection
      reverse
      endOfRegion
      eyebrow="브라우저 기반 운영"
      title={<>링크 하나로 연결되는<br />매장 디스플레이</>}
      body="TV·모니터·노트북·태블릿의 브라우저에서 링크를 열고 전체화면으로 바로 운영할 수 있습니다."
      image="https://images.unsplash.com/photo-1542744094-24638eff58bb?q=85&w=1600&auto=format&fit=crop"
    />
  );
}

const setupSteps = [
  { number: "01", title: "화면 용도 선택", body: "메뉴보드·가격표·대기 안내 등 목적을 정합니다.", icon: Tv },
  { number: "02", title: "템플릿 선택", body: "큰 화면용 디자인에서 시작합니다.", icon: Monitor },
  { number: "03", title: "링크 생성", body: "결제 후 디스플레이 전용 링크가 준비됩니다.", icon: RefreshCw },
  { number: "04", title: "메뉴 입력", body: "메뉴·가격·품절·이벤트 문구를 입력합니다.", icon: Monitor },
  { number: "05", title: "화면 조정", body: "메뉴 수와 화면에 맞게 구성을 다듬습니다.", icon: Tv },
  { number: "06", title: "전체화면 실행", body: "매장 기기에서 링크를 열어 운영합니다.", icon: RefreshCw },
] as const;

export function DisplaySetupSection() {
  return (
    <section className="bg-white px-6 pb-20 pt-16 md:px-10 md:pb-24 md:pt-16">
      <div className="mx-auto max-w-[1280px]">
        <motion.div {...fadeUp} className="mb-14 max-w-3xl md:mb-20">
          <MarketingSectionCopy eyebrow="간편한 시작" title={<>여섯 단계로 완성되는<br />매장 메뉴보드</>} body="화면 목적을 정하고 템플릿과 메뉴를 선택한 뒤 링크를 전체화면으로 실행합니다." />
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {setupSteps.map((step, index) => {
            const Icon = step.icon;
            return (
              <motion.article
                key={step.number}
                {...fadeUp}
                transition={{ ...fadeUp.transition, delay: index * 0.05 }}
                className="rounded-[1.75rem] border border-zinc-200 bg-white p-6 md:p-8"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-zinc-400">{step.number}</span>
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-950 text-white"><Icon className="h-4 w-4" /></span>
                </div>
                <h3 className="mt-8 text-xl font-bold tracking-tight text-zinc-950 md:text-2xl">{step.title}</h3>
                <p className="mt-3 break-keep text-sm font-medium leading-[1.75] text-zinc-500 md:text-base">{step.body}</p>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
