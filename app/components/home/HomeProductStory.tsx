"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowUpRight,
  Clock3,
  Languages,
  Link2,
  Monitor,
  Smartphone,
  Sparkles,
  Tablet,
  WandSparkles,
} from "lucide-react";
import { Link } from "react-router";

const menuItems = [
  { name: "Black sesame latte", price: "6.5", image: "/menu-templates/cafe_design_a/black-sesame-featured.jpg" },
  { name: "Nutty cream latte", price: "6.8", image: "/menu-templates/cafe_design_a/nutty-cream-featured.jpg" },
  { name: "Matcha cloud", price: "6.5", image: "/menu-templates/cafe_design_a/malcha.jpg" },
];

const heroScreens = [
  {
    name: "AUBE COFFEE",
    note: "Coffee · Dessert",
    image: "/menu-templates/cafe_design_a/black-sesame-featured.jpg",
    accent: "bg-[#eee5d7]",
  },
  {
    name: "NUTTY ROOM",
    note: "Signature menu",
    image: "/menu-templates/cafe_design_a/nutty-cream-featured.jpg",
    accent: "bg-[#e8dfd0]",
  },
  {
    name: "MATCHA DAY",
    note: "Seasonal special",
    image: "/menu-templates/cafe_design_a/malcha.jpg",
    accent: "bg-[#e3e4d5]",
  },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

function SectionLabel({ children, inverted = false }: { children: React.ReactNode; inverted?: boolean }) {
  return (
    <span className={`mb-4 inline-flex text-sm font-bold ${inverted ? "text-zinc-400" : "text-zinc-500"}`}>
      {children}
    </span>
  );
}

function MenuBoard({ compact = false }: { compact?: boolean }) {
  return (
    <div className="h-full overflow-hidden bg-[#f5f0e7] text-[#1f1b17]">
      <div className={`flex items-center justify-between border-b border-black/10 ${compact ? "px-5 py-4" : "px-8 py-6"}`}>
        <div>
          <p className={`${compact ? "text-lg" : "text-2xl"} font-black tracking-[-0.04em]`}>AUBE COFFEE</p>
          <p className="mt-0.5 text-[9px] font-bold uppercase tracking-[0.24em] text-black/45">Everyday coffee & dessert</p>
        </div>
        <span className="rounded-full border border-black/15 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em]">Menu</span>
      </div>

      <div className={`grid ${compact ? "grid-cols-3 gap-2 p-4" : "grid-cols-3 gap-4 p-7"}`}>
        {menuItems.map((item) => (
          <article key={item.name} className="min-w-0">
            <div className={`overflow-hidden bg-[#ddd3c3] ${compact ? "aspect-square rounded-lg" : "aspect-[4/3] rounded-xl"}`}>
              <img src={item.image} alt="" className="h-full w-full object-cover" />
            </div>
            <div className={`flex items-start justify-between gap-2 ${compact ? "mt-2" : "mt-4"}`}>
              <p className={`${compact ? "text-[9px]" : "text-sm"} min-w-0 font-black leading-tight`}>{item.name}</p>
              <p className={`${compact ? "text-[9px]" : "text-sm"} shrink-0 font-black`}>{item.price}</p>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function RotatingMenuScreen({ screenIndex, compact = false }: { screenIndex: number; compact?: boolean }) {
  const screen = heroScreens[screenIndex];

  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={screen.name}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.45 }}
        className={`flex h-full flex-col overflow-hidden ${screen.accent} text-zinc-950`}
      >
        <div className={`flex items-center justify-between border-b border-black/10 ${compact ? "px-3 py-2" : "px-5 py-4"}`}>
          <div>
            <p className={`${compact ? "text-[8px]" : "text-sm"} font-black tracking-[-0.03em]`}>{screen.name}</p>
            <p className={`${compact ? "text-[5px]" : "text-[8px]"} mt-0.5 font-bold uppercase tracking-[0.14em] text-black/40`}>{screen.note}</p>
          </div>
          <span className={`${compact ? "h-1.5 w-1.5" : "h-2.5 w-2.5"} rounded-full bg-zinc-950`} />
        </div>
        <div className={`grid min-h-0 flex-1 grid-cols-[1.15fr_0.85fr] ${compact ? "gap-1.5 p-2" : "gap-3 p-4"}`}>
          <img src={screen.image} alt="" className="h-full min-h-0 w-full rounded-[0.55rem] object-cover" />
          <div className="flex min-h-0 flex-col justify-between rounded-[0.55rem] bg-white/75 p-2.5">
            <div>
              <span className={`${compact ? "text-[4px]" : "text-[7px]"} font-black uppercase tracking-[0.1em] text-black/35`}>Featured</span>
              <p className={`${compact ? "mt-1 text-[6px]" : "mt-2 text-[11px]"} font-black leading-tight`}>{screen.name}</p>
            </div>
            <div className="space-y-1">
              {[1, 2, 3].map((line) => <span key={line} className="block h-px bg-black/15" />)}
            </div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

export function BrandHero() {
  const [screenIndex, setScreenIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setScreenIndex((current) => (current + 1) % heroScreens.length);
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  return (
    <section className="relative min-h-[760px] overflow-hidden bg-[linear-gradient(155deg,#a97e00_0%,#e5c546_24%,#fff0a3_100%)] px-5 pt-28 text-zinc-950 md:min-h-[930px] md:px-10 md:pt-36">
      <motion.div {...fadeUp} className="relative z-10 mx-auto max-w-[1180px] text-center">
        <p className="text-base font-bold tracking-[-0.02em] md:text-xl">다이닝의 새로운 메뉴 경험</p>
        <h1 className="mt-5 break-keep text-[clamp(3rem,7.8vw,6.25rem)] font-bold leading-[0.98] tracking-[-0.055em]">
          ArtiMenu<br />Perfect For Your Store
        </h1>
      </motion.div>

      <motion.div
        {...fadeUp}
        transition={{ ...fadeUp.transition, delay: 0.12 }}
        className="absolute bottom-0 left-1/2 h-[390px] w-[740px] max-w-[116vw] -translate-x-1/2 md:h-[520px] md:w-[1120px]"
        aria-label="PC, 태블릿, 모바일에서 바뀌는 아티메뉴 화면 예시"
      >
        <div className="absolute bottom-4 left-0 w-[66%] md:bottom-8">
          <div className="overflow-hidden rounded-t-[1rem] border-[7px] border-zinc-950 bg-white shadow-[0_28px_80px_rgba(0,0,0,0.22)] md:rounded-t-[1.4rem] md:border-[10px]">
            <div className="aspect-[16/10]"><RotatingMenuScreen screenIndex={screenIndex} /></div>
          </div>
          <div className="mx-auto h-3 w-[108%] -translate-x-[4%] rounded-b-xl bg-zinc-950 md:h-5" />
        </div>

        <div className="absolute bottom-0 right-[5%] w-[35%] overflow-hidden rounded-[1.45rem] border-[7px] border-zinc-950 bg-white shadow-[0_30px_80px_rgba(0,0,0,0.24)] md:rounded-[2rem] md:border-[10px]">
          <div className="aspect-[4/3]"><RotatingMenuScreen screenIndex={screenIndex} compact /></div>
        </div>

        <div className="absolute bottom-[-1rem] left-1/2 w-[18%] -translate-x-1/2 overflow-hidden rounded-[1.6rem] border-[6px] border-zinc-950 bg-white shadow-[0_32px_80px_rgba(0,0,0,0.28)] md:bottom-[-2rem] md:rounded-[2.4rem] md:border-[9px]">
          <div className="aspect-[9/18]"><RotatingMenuScreen screenIndex={screenIndex} compact /></div>
        </div>
      </motion.div>
    </section>
  );
}

function StoryVisualFrame({ children }: { children: React.ReactNode }) {
  return (
    <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="h-[380px] overflow-hidden rounded-[2rem] border border-white/10 bg-[#171717] shadow-2xl md:h-[500px]">
      <div className="h-full overflow-hidden">{children}</div>
    </motion.div>
  );
}

function DarkStorySection({ eyebrow, title, body, visual, reverse = false }: { eyebrow: string; title: React.ReactNode; body: string; visual: React.ReactNode; reverse?: boolean }) {
  return (
    <section className="bg-transparent px-6 py-20 text-white md:px-10 md:py-28">
      <div className="mx-auto grid max-w-[1280px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <motion.div {...fadeUp} className={reverse ? "lg:order-2" : ""}>
          <SectionLabel inverted>{eyebrow}</SectionLabel>
          <h2 className="break-keep text-3xl font-bold leading-tight tracking-tight md:text-5xl">{title}</h2>
          <p className="mt-6 max-w-xl break-keep text-base font-medium leading-relaxed text-zinc-400 md:text-lg">{body}</p>
        </motion.div>
        <div className={reverse ? "lg:order-1" : ""}><StoryVisualFrame>{visual}</StoryVisualFrame></div>
      </div>
    </section>
  );
}

function InputSyncVisual() {
  const [activeField, setActiveField] = useState(0);
  const fields = [
    ["메뉴명", "흑임자 크림 라떼"],
    ["설명", "고소한 흑임자와 부드러운 크림"],
    ["가격", "6,500원"],
  ];

  useEffect(() => {
    const interval = window.setInterval(() => setActiveField((current) => (current + 1) % fields.length), 1800);
    return () => window.clearInterval(interval);
  }, [fields.length]);

  return (
    <div className="grid h-full grid-cols-[0.82fr_1.18fr] bg-zinc-100 p-4 text-zinc-950 md:p-7">
      <div className="z-10 self-center rounded-2xl bg-white p-4 shadow-xl md:p-6">
        <p className="mb-4 text-xs font-black">메뉴 정보 입력</p>
        <div className="space-y-2.5">
          {fields.map(([label, value], index) => (
            <div key={label} className={`rounded-xl border px-3 py-3 transition-colors ${activeField === index ? "border-zinc-950 bg-zinc-50" : "border-zinc-200"}`}>
              <p className="text-[9px] font-bold text-zinc-400">{label}</p>
              <p className="mt-1 truncate text-[11px] font-black md:text-sm">{value}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="-ml-4 self-center overflow-hidden rounded-2xl border border-black/10 bg-[#eee5d7] p-5 pl-9 shadow-xl">
        <p className="text-xs font-black tracking-tight">AUBE COFFEE</p>
        <img src="/menu-templates/cafe_design_a/black-sesame-featured.jpg" alt="" className="mt-4 aspect-[4/3] w-full rounded-xl object-cover" />
        <div className="mt-4 flex justify-between gap-3">
          <div>
            <p className={`font-black transition-all ${activeField === 0 ? "text-base" : "text-sm"}`}>{fields[0][1]}</p>
            <p className={`mt-1 line-clamp-2 text-[9px] font-semibold text-black/50 transition-opacity ${activeField >= 1 ? "opacity-100" : "opacity-40"}`}>{fields[1][1]}</p>
          </div>
          <p className={`shrink-0 font-black transition-all ${activeField === 2 ? "text-base" : "text-sm"}`}>{fields[2][1]}</p>
        </div>
      </div>
    </div>
  );
}

function LayoutModeVisual() {
  const [mode, setMode] = useState<"group" | "fill">("group");

  useEffect(() => {
    const interval = window.setInterval(() => setMode((current) => current === "group" ? "fill" : "group"), 2600);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="flex h-full flex-col bg-[#eee8dc] p-5 text-zinc-950 md:p-8">
      <div className="mx-auto flex rounded-full bg-white p-1.5 shadow-sm">
        {[{ key: "group", label: "묶음형 자동 배치" }, { key: "fill", label: "채움형 배치" }].map((item) => (
          <button key={item.key} type="button" onClick={() => setMode(item.key as "group" | "fill")} className={`rounded-full px-4 py-2 text-[10px] font-black transition-colors md:text-xs ${mode === item.key ? "bg-zinc-950 text-white" : "text-zinc-400"}`}>{item.label}</button>
        ))}
      </div>
      <motion.div layout className={`mt-6 grid min-h-0 flex-1 gap-3 ${mode === "group" ? "grid-cols-2" : "grid-cols-3"}`}>
        {menuItems.concat(menuItems.slice(0, 1)).map((item, index) => (
          <motion.article layout key={`${item.name}-${index}`} className={`${mode === "group" && index === 0 ? "col-span-2 grid grid-cols-2" : ""} overflow-hidden rounded-xl bg-white`}>
            <img src={item.image} alt="" className="h-full min-h-0 w-full object-cover" />
            {mode === "group" && index === 0 ? <div className="flex flex-col justify-end p-4"><p className="text-xs font-black">{item.name}</p><p className="mt-2 text-xs font-black">{item.price}</p></div> : null}
          </motion.article>
        ))}
      </motion.div>
    </div>
  );
}

function CustomizationVisual() {
  const [mode, setMode] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setMode((current) => (current + 1) % 4), 2300);
    return () => window.clearInterval(interval);
  }, []);

  const labels = ["이미지 노출", "이미지 변경", "글자 스타일", "배경 색상"];
  return (
    <div className={`flex h-full flex-col p-5 text-zinc-950 transition-colors duration-500 md:p-8 ${mode === 3 ? "bg-[#dce4d5]" : "bg-[#eee5d7]"}`}>
      <div className="flex flex-wrap gap-2">
        {labels.map((label, index) => <span key={label} className={`rounded-full px-3 py-2 text-[9px] font-black transition-colors ${mode === index ? "bg-zinc-950 text-white" : "bg-white/60 text-zinc-500"}`}>{label}</span>)}
      </div>
      <div className="mt-5 grid min-h-0 flex-1 grid-cols-[1.2fr_0.8fr] gap-4 rounded-2xl bg-white/65 p-4">
        <motion.img key={mode === 1 ? "matcha" : "sesame"} initial={{ opacity: 0 }} animate={{ opacity: mode === 0 ? 0.15 : 1 }} src={mode === 1 ? "/menu-templates/cafe_design_a/malcha.jpg" : "/menu-templates/cafe_design_a/black-sesame-featured.jpg"} alt="" className="h-full min-h-0 w-full rounded-xl object-cover" />
        <div className="flex flex-col justify-center">
          <p className={`transition-all ${mode === 2 ? "font-serif text-2xl italic" : "text-xl font-black"}`}>Signature Latte</p>
          <p className="mt-3 text-xs font-semibold leading-relaxed text-black/50">원하는 이미지와 글자 스타일, 배경을 메뉴판에 맞게 바꿔보세요.</p>
        </div>
      </div>
    </div>
  );
}

export function ProductHero() {
  return <DarkStorySection eyebrow="쉽고 간편하게 만들어요" title={<>텍스트만 입력하면<br />메뉴판이 완성!</>} body="메뉴명, 설명, 가격을 입력하는 순간 선택한 템플릿에 바로 반영돼요. 복잡한 편집 없이 빠르고 쉽게 메뉴판을 완성할 수 있어요." visual={<InputSyncVisual />} />;
}

export function AutoLayoutSection() {
  return <DarkStorySection reverse eyebrow="보기 좋게 자동 배치돼요" title={<>카테고리를 묶음형, 채움형 배치 방식으로<br />원하는 배치를 선택할 수 있어요</>} body="메뉴 구성과 화면에 맞춰 묶음형 자동 배치와 채움형 배치를 오가며 가장 보기 좋은 구성을 선택하세요." visual={<LayoutModeVisual />} />;
}

export function CustomizationSection() {
  return <DarkStorySection eyebrow="내맘대로 커스터마이징" title={<>이미지도 내맘대로 변경.<br />글자 크기/스타일도 내맘대로 변경</>} body="이미지를 보이거나 숨기고, 원하는 이미지로 교체하세요. 글자 모양과 배경색까지 매장의 분위기에 맞게 바꿀 수 있어요." visual={<CustomizationVisual />} />;
}

function TimeSaleVisual() {
  const [remaining, setRemaining] = useState(18 * 60 * 60 + 42 * 60 + 9);

  useEffect(() => {
    const interval = window.setInterval(() => setRemaining((current) => current > 0 ? current - 1 : 18 * 60 * 60 + 42 * 60 + 9), 1000);
    return () => window.clearInterval(interval);
  }, []);

  const time = [Math.floor(remaining / 3600), Math.floor((remaining % 3600) / 60), remaining % 60].map((value) => String(value).padStart(2, "0")).join(":");
  return (
    <div className="relative h-full overflow-hidden rounded-[1.35rem] bg-[#ece7dd] p-5 md:p-8">
      <div className="absolute inset-x-6 top-7 flex items-center justify-between">
        <p className="text-lg font-black tracking-[-0.04em] text-zinc-950">TODAY&apos;S MENU</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-[10px] font-black text-white">
          <Clock3 className="h-3 w-3" /> {time} 남았어요
        </span>
      </div>
      <div className="absolute inset-x-6 bottom-6 top-20 grid grid-cols-[1.15fr_0.85fr] gap-3">
        <div className="relative overflow-hidden rounded-2xl bg-zinc-300">
          <img src="/menu-templates/cafe_design_a/nutty-cream-featured.jpg" alt="" className="h-full w-full object-cover" />
          <span className="absolute left-3 top-3 rounded-full bg-white px-3 py-1 text-[10px] font-black text-red-500">TIME SALE</span>
        </div>
        <div className="flex flex-col justify-between rounded-2xl bg-white p-4 text-zinc-950">
          <div>
            <p className="text-[10px] font-black text-zinc-400">ONLY TODAY</p>
            <p className="mt-2 text-lg font-black leading-tight">Nutty cream latte</p>
          </div>
          <div>
            <p className="text-xs font-bold text-zinc-400 line-through">6,800원</p>
            <p className="mt-1 text-xl font-black text-red-500">5,500원</p>
          </div>
        </div>
      </div>
    </div>
  );
}

function WidgetVisual() {
  return (
    <div className="grid h-full grid-cols-[0.78fr_1.22fr] bg-zinc-100 p-5 text-zinc-950 md:p-8">
      <div className="z-10 self-center rounded-2xl bg-white p-4 shadow-xl">
        <p className="text-xs font-black">위젯 추가</p>
        <div className="mt-4 space-y-2">
          {["오늘의 추천 메뉴", "신메뉴 안내", "매장 소식"].map((label, index) => <div key={label} className={`rounded-xl border px-3 py-3 text-[10px] font-black ${index === 0 ? "border-zinc-950 bg-zinc-50" : "border-zinc-200 text-zinc-400"}`}>{label}</div>)}
        </div>
        <button type="button" className="mt-4 w-full rounded-xl bg-zinc-950 py-3 text-[10px] font-black text-white">메뉴판에 위젯 넣기</button>
      </div>
      <div className="-ml-4 self-center overflow-hidden rounded-2xl bg-[#ece4d5] p-5 pl-9 shadow-xl">
        <p className="text-xs font-black">AUBE COFFEE</p>
        <div className="mt-4 rounded-2xl bg-zinc-950 p-5 text-white">
          <p className="text-[9px] font-bold text-white/50">TODAY&apos;S PICK</p>
          <p className="mt-2 text-lg font-black">오늘의 추천 메뉴</p>
          <p className="mt-3 text-[10px] leading-relaxed text-white/60">고소한 흑임자 크림 라떼를 만나보세요.</p>
        </div>
      </div>
    </div>
  );
}

export function SalesAndLanguageSection() {
  return (
    <>
      <DarkStorySection reverse eyebrow="시간이 매출 기회가 되도록" title={<>타임 세일로<br />고객의 시선을 붙잡아요</>} body="할인 메뉴와 시간을 입력하면 메뉴판에 바로 반영되고, 남은 시간이 실시간으로 줄어들어 지금만의 혜택을 분명하게 보여줘요." visual={<TimeSaleVisual />} />
      <DarkStorySection eyebrow="필요한 정보를 더 눈에 띄게" title={<>위젯 기능으로<br />매장의 소식을 전해요</>} body="추천 메뉴, 신메뉴, 매장 소식 위젯을 원하는 위치에 넣어 고객에게 꼭 보여주고 싶은 내용을 강조할 수 있어요." visual={<WidgetVisual />} />
    </>
  );
}

function AiMenuVisual() {
  return (
    <div className="h-full bg-zinc-950 p-5 text-white md:p-7">
      <div className="flex items-center justify-between"><p className="text-sm font-black">AI 메뉴 정리</p><WandSparkles className="h-5 w-5 text-[#F8E731]" /></div>
      <p className="mt-5 rounded-xl bg-white/10 p-4 text-xs font-semibold leading-relaxed text-white/65">아메리카노 4,500원 / 카페라떼 5,000원 / 말차라떼 6,500원...</p>
      <div className="mt-3 space-y-2">{["아메리카노 · 4,500원", "카페라떼 · 5,000원", "말차라떼 · 6,500원", "바닐라라떼 · 5,500원", "레몬에이드 · 6,000원"].map((item) => <div key={item} className="flex items-center gap-2 rounded-xl bg-white px-4 py-3 text-[11px] font-black text-zinc-950"><Sparkles className="h-3.5 w-3.5" />{item}</div>)}</div>
    </div>
  );
}

function TranslationVisual() {
  return (
    <div className="h-full bg-[#eee8dc] p-5 text-zinc-950 md:p-7">
      <div className="flex items-center justify-between"><p className="text-sm font-black">AI 다국어 번역</p><Languages className="h-5 w-5" /></div>
      <div className="mt-5 grid grid-cols-4 gap-2">{["한국어", "English", "中文", "日本語"].map((language, index) => <span key={language} className={`rounded-full px-2 py-2 text-center text-[9px] font-black ${index === 1 ? "bg-zinc-950 text-white" : "bg-white text-zinc-500"}`}>{language}</span>)}</div>
      <div className="mt-5 space-y-2">{[["흑임자 크림 라떼", "Black sesame cream latte"], ["말차 크림 라떼", "Matcha cream latte"], ["바닐라빈 라떼", "Vanilla bean latte"], ["레몬 에이드", "Fresh lemon ade"]].map(([ko, en]) => <div key={ko} className="rounded-xl bg-white px-4 py-3"><p className="text-[9px] font-bold text-zinc-400">{ko}</p><p className="mt-1 text-[11px] font-black">{en}</p></div>)}</div>
    </div>
  );
}

export function AiFeaturesSection() {
  const features = [
    { eyebrow: "AI 메뉴 정리", title: "메뉴 정보를 한 번에 정리해 등록해요", body: "메뉴명, 가격, 설명을 한꺼번에 입력하면 AI가 항목별로 정리해 메뉴 등록을 도와줘요.", visual: <AiMenuVisual /> },
    { eyebrow: "AI 다국어 번역", title: "클릭 한 번으로 4개국어 메뉴판이 완성!", body: "AI가 메뉴명과 설명을 영어·중국어·일본어로 번역해 외국인 고객도 편하게 볼 수 있어요.", visual: <TranslationVisual /> },
  ];

  return (
    <section className="bg-white px-6 pb-28 pt-32 md:px-10 md:pb-40 md:pt-40">
      <div className="mx-auto max-w-[1280px]">
        <motion.div {...fadeUp} className="mb-14 max-w-3xl"><SectionLabel>AI 기능</SectionLabel><h2 className="break-keep text-3xl font-bold leading-tight tracking-tight text-zinc-950 md:text-5xl">반복되는 메뉴 작업은<br />AI에게 맡기세요</h2></motion.div>
        <div className="grid gap-6 lg:grid-cols-2">{features.map((feature, index) => <motion.article key={feature.eyebrow} {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.08 }} className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white"><div className="h-[360px] overflow-hidden md:h-[420px]">{feature.visual}</div><div className="px-6 pb-8 pt-6 md:px-8 md:pb-10"><p className="text-sm font-bold text-zinc-500">{feature.eyebrow}</p><h3 className="mt-3 break-keep text-2xl font-bold leading-tight text-zinc-950 md:text-3xl">{feature.title}</h3><p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">{feature.body}</p></div></motion.article>)}</div>
      </div>
    </section>
  );
}

function DeviceMockup({ type }: { type: "desktop" | "tablet" | "mobile" }) {
  if (type === "mobile") {
    return (
      <div className="mx-auto h-[270px] w-[132px] overflow-hidden rounded-[1.7rem] border-[6px] border-zinc-950 bg-white shadow-2xl">
        <MenuBoard compact />
      </div>
    );
  }

  if (type === "tablet") {
    return (
      <div className="mx-auto w-full max-w-[390px] overflow-hidden rounded-[1.7rem] border-[8px] border-zinc-950 bg-white shadow-2xl">
        <div className="aspect-[4/3]"><MenuBoard compact /></div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[640px]">
      <div className="overflow-hidden rounded-t-[1.3rem] border-[9px] border-b-0 border-zinc-950 bg-white shadow-2xl">
        <div className="aspect-[16/9]"><MenuBoard compact /></div>
      </div>
      <div className="mx-auto h-4 w-[108%] -translate-x-[4%] rounded-b-lg bg-zinc-950" />
    </div>
  );
}

export function DeviceEverywhereSection() {
  return (
    <section className="overflow-hidden bg-white px-6 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1380px]">
        <motion.div {...fadeUp} className="max-w-4xl text-left">
          <SectionLabel>PC/태블릿/모바일(QR)</SectionLabel>
          <h2 className="break-keep text-3xl font-bold leading-tight tracking-tight text-zinc-950 md:text-5xl">
            링크만 있으면 메뉴판을<br />PC/태블릿/모바일(QR) 어디서든 띄워요!
          </h2>
          <p className="mt-5 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
            PC와 태블릿은 물론, 모바일에서는 QR로 간편하게. 같은 메뉴판이 화면 크기에 맞춰 자연스럽게 보여요.
          </p>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="relative mt-20 min-h-[590px] rounded-[2.5rem] bg-white px-5 pb-10 pt-16 shadow-[0_30px_100px_rgba(0,0,0,0.08)] md:px-12">
          <div className="grid min-h-[450px] items-end gap-10 lg:grid-cols-[1.25fr_0.85fr_0.42fr] lg:gap-5">
            <div><DeviceMockup type="desktop" /><p className="mt-8 text-center text-sm font-black text-zinc-500"><Monitor className="mr-2 inline h-4 w-4" />PC · 노트북</p></div>
            <div><DeviceMockup type="tablet" /><p className="mt-8 text-center text-sm font-black text-zinc-500"><Tablet className="mr-2 inline h-4 w-4" />태블릿</p></div>
            <div><DeviceMockup type="mobile" /><p className="mt-8 text-center text-sm font-black text-zinc-500"><Smartphone className="mr-2 inline h-4 w-4" />모바일 QR</p></div>
          </div>
          <span className="absolute left-1/2 top-6 inline-flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-950 px-4 py-2 text-xs font-black text-white">
            <Link2 className="h-3.5 w-3.5" /> artimenu.kr/your-store
          </span>
        </motion.div>
      </div>
    </section>
  );
}

export function ServiceGuideSection() {
  const services = [
    {
      eyebrow: "PC · 태블릿 · 모바일 QR",
      title: "갖고 있는 디바이스에 띄우시려면",
      name: "아티메뉴 베이직",
      href: "/services/basic",
      icon: Tablet,
    },
    {
      eyebrow: "TV · 모니터 · 대형 화면",
      title: "매장 TV에 띄우시려면",
      name: "아티메뉴 디스플레이",
      href: "/services/display",
      icon: Monitor,
    },
  ];

  return (
    <section className="bg-white px-6 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1380px]">
        <motion.div {...fadeUp} className="mb-12 md:mb-16">
          <SectionLabel>서비스 안내</SectionLabel>
          <h2 className="break-keep text-3xl font-bold leading-tight tracking-tight text-zinc-950 md:text-5xl">
            자세히 알아보세요
          </h2>
        </motion.div>

        <div className="grid gap-5 lg:grid-cols-2">
          {services.map((service, index) => {
            const Icon = service.icon;
            return (
              <motion.article key={service.name} {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.08 }} className="group relative min-h-[390px] overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-50 p-7 md:min-h-[440px] md:p-10">
                <div className="relative z-10 flex h-full flex-col">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-[0.12em] text-zinc-400">{service.eyebrow}</span>
                    <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-zinc-950 shadow-sm"><Icon className="h-5 w-5" /></span>
                  </div>
                  <h3 className="mt-16 whitespace-pre-line break-keep text-2xl font-bold leading-tight tracking-tight text-zinc-950 md:text-3xl">{service.title}</h3>
                  <div className="mt-auto flex items-end justify-between gap-5 pt-14">
                    <p className="text-lg font-bold text-zinc-950 md:text-xl">{service.name}</p>
                    <Link to={service.href} aria-label={`${service.name} 자세히 보기`} className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-zinc-950 text-white transition-transform group-hover:-translate-y-1 group-hover:translate-x-1">
                      <ArrowUpRight className="h-5 w-5" />
                    </Link>
                  </div>
                </div>
                <div className="absolute -bottom-24 -right-20 h-64 w-64 rounded-full border-[42px] border-white transition-transform duration-500 group-hover:scale-110" />
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
