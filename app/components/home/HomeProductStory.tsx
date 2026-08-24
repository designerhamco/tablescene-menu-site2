"use client";

import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ChevronLeft,
  ChevronRight,
  Clock3,
  Languages,
  Link2,
  Monitor,
  Smartphone,
  Sparkles,
  Tablet,
  WandSparkles,
} from "lucide-react";

import { MarketingSectionCopy } from "./MarketingSectionCopy";

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

function DarkStorySection({
  eyebrow,
  title,
  body,
  visual,
  reverse = false,
  endOfRegion = false,
}: {
  eyebrow: string;
  title: React.ReactNode;
  body: string;
  visual: React.ReactNode;
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
          <p className="mt-3 text-xs font-semibold leading-relaxed text-black/50">이미지·글자·배경을 원하는 스타일로 설정합니다.</p>
        </div>
      </div>
    </div>
  );
}

export function ProductHero() {
  return <DarkStorySection eyebrow="간편한 메뉴 제작" title={<>텍스트 입력만으로<br />완성되는 메뉴판</>} body="메뉴명·설명·가격 입력 즉시 선택한 템플릿에 반영됩니다." visual={<InputSyncVisual />} />;
}

export function AutoLayoutSection() {
  return <DarkStorySection reverse eyebrow="묶음형 or 채움형 배치" title={<>보기 좋은 배치를 위한<br />두 가지 방식</>} body="카테고리 구성에 맞춰 묶음형과 채움형을 전환할 수 있습니다." visual={<LayoutModeVisual />} />;
}

export function CustomizationSection() {
  return <DarkStorySection eyebrow="자유로운 커스터마이징" title={<>이미지도 내맘대로 변경.<br />글자, 색상도 내맘대로 변경.</>} body="이미지 노출과 교체부터 글자 모양, 배경색까지 자유롭게 설정할 수 있습니다." visual={<CustomizationVisual />} />;
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
      <DarkStorySection reverse eyebrow="실시간 타임 세일" title={<>타임 세일로 만드는<br />구매의 순간</>} body="할인 메뉴와 남은 시간을 실시간으로 노출해 혜택을 강조합니다." visual={<TimeSaleVisual />} />
      <DarkStorySection eyebrow="콘텐츠 위젯" title={<>매장 소식을 강조하는<br />위젯</>} body="추천 메뉴와 신메뉴, 매장 소식을 원하는 위치에 배치할 수 있습니다." visual={<WidgetVisual />} />
    </>
  );
}

const fineDiningPages = [
  {
    eyebrow: "01 · CHEF'S TASTING",
    title: "Seasonal Course",
    body: "계절의 흐름을 담은 시그니처 코스",
    image: "/menu-templates/cafe_design_a/black-sesame-featured.jpg",
  },
  {
    eyebrow: "02 · WINE PAIRING",
    title: "Sommelier Selection",
    body: "각 코스와 어울리는 와인 셀렉션",
    image: "/menu-templates/cafe_design_a/nutty-cream-featured.jpg",
  },
  {
    eyebrow: "03 · DESSERT",
    title: "Finale",
    body: "디저트와 티로 완성하는 마지막 페이지",
    image: "/menu-templates/cafe_design_a/malcha.jpg",
  },
] as const;

function MultiPageVisual() {
  const [pageIndex, setPageIndex] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setPageIndex((current) => (current + 1) % fineDiningPages.length);
    }, 2600);

    return () => window.clearInterval(interval);
  }, []);

  const goToPage = (direction: number) => {
    setPageIndex((current) => (current + direction + fineDiningPages.length) % fineDiningPages.length);
  };

  return (
    <div className="flex h-full flex-col bg-[#eee8dc] p-5 text-zinc-950 md:p-8">
      <div className="flex items-center justify-between border-b border-zinc-300 pb-4">
        <div>
          <p className="text-sm font-black tracking-[-0.03em]">MAISON LUNE</p>
          <p className="mt-1 text-[8px] font-bold uppercase tracking-[0.2em] text-zinc-400">Fine dining collection</p>
        </div>
        <p className="text-[9px] font-bold text-zinc-400">{String(pageIndex + 1).padStart(2, "0")} / {String(fineDiningPages.length).padStart(2, "0")}</p>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden py-5 md:py-7">
        <AnimatePresence mode="wait" initial={false}>
          <motion.article
            key={pageIndex}
            initial={{ opacity: 0, x: 34 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -34 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="grid h-full grid-cols-[1.08fr_0.92fr] overflow-hidden rounded-2xl bg-white shadow-xl"
          >
            <img src={fineDiningPages[pageIndex].image} alt="" className="h-full min-h-0 w-full object-cover" />
            <div className="flex flex-col justify-end p-5 md:p-7">
              <p className="text-[8px] font-black tracking-[0.12em] text-zinc-400 md:text-[10px]">{fineDiningPages[pageIndex].eyebrow}</p>
              <h3 className="mt-3 text-xl font-black leading-tight md:text-3xl">{fineDiningPages[pageIndex].title}</h3>
              <p className="mt-3 break-keep text-[10px] font-semibold leading-relaxed text-zinc-500 md:text-sm">{fineDiningPages[pageIndex].body}</p>
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-[9px] font-bold text-zinc-400 md:text-[10px]">페이지 전환으로 이어지는 메뉴 구성</p>
        <div className="flex gap-2">
          <button type="button" onClick={() => goToPage(-1)} aria-label="이전 메뉴 페이지" className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-zinc-950 shadow-sm transition-colors hover:bg-zinc-100"><ChevronLeft className="h-4 w-4" /></button>
          <button type="button" onClick={() => goToPage(1)} aria-label="다음 메뉴 페이지" className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-950 text-white shadow-sm transition-colors hover:bg-zinc-800"><ChevronRight className="h-4 w-4" /></button>
        </div>
      </div>
    </div>
  );
}

export function MultiPageSection() {
  return (
    <DarkStorySection
      reverse
      eyebrow="파인다이닝 멀티 페이지"
      title={<>여러 장의 메뉴를<br />한 권처럼</>}
      body="코스·와인·디저트를 페이지별로 나눠 다이닝의 흐름을 구성합니다."
      visual={<MultiPageVisual />}
    />
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
    { eyebrow: "AI 메뉴 정리", title: "메뉴 정보 자동 정리와 등록", body: "메뉴명·가격·설명을 입력하면 AI가 항목별로 정리합니다.", visual: <AiMenuVisual /> },
    { eyebrow: "AI 다국어 번역", title: "클릭 한 번으로 완성되는 4개국어 메뉴판", body: "메뉴명과 설명을 영어·중국어·일본어로 번역합니다.", visual: <TranslationVisual /> },
  ];

  return (
    <section className="bg-white px-6 pb-12 pt-16 md:px-10 md:pb-12 md:pt-16">
      <div className="mx-auto max-w-[1280px]">
        <motion.div {...fadeUp} className="mb-14 max-w-3xl">
          <MarketingSectionCopy eyebrow="AI 메뉴 관리" title={<>AI로 정리되는<br />반복 메뉴 작업</>} />
        </motion.div>
        <div className="grid gap-6 lg:grid-cols-2">{features.map((feature, index) => <motion.article key={feature.eyebrow} {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.08 }} className="overflow-hidden rounded-[2rem] border border-zinc-200 bg-white"><div className="h-[360px] overflow-hidden md:h-[420px]">{feature.visual}</div><div className="px-6 pb-8 pt-6 md:px-8 md:pb-10"><p className="text-base font-bold text-zinc-500 md:text-lg">{feature.eyebrow}</p><h3 className="mt-3 break-keep text-2xl font-bold leading-tight text-zinc-950 md:text-3xl">{feature.title}</h3><p className="mt-4 break-keep text-sm font-medium leading-relaxed text-zinc-500 md:text-base">{feature.body}</p></div></motion.article>)}</div>
      </div>
    </section>
  );
}

export function StoreScenesSection() {
  const scenes = [
    {
      image: "https://images.unsplash.com/photo-1514933651103-005eec06c04b?q=80&w=1400&auto=format&fit=crop",
      title: "매장 분위기를 담은 화면",
      body: "공간의 톤과 메뉴의 매력을 하나의 화면으로 연결합니다.",
    },
    {
      image: "/menu-templates/cafe_design_a/malcha_present.jpg",
      title: "메뉴 매력을 살리는 정보",
      body: "사진과 설명으로 메뉴의 특징을 명확하게 전달합니다.",
    },
    {
      image: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1400&auto=format&fit=crop",
      title: "수정 즉시 반영되는 메뉴판",
      body: "가격과 메뉴 정보 변경 사항을 화면에 빠르게 반영합니다.",
    },
  ];

  return (
    <section className="bg-white px-6 pb-20 pt-12 md:px-10 md:pb-24 md:pt-12">
      <div className="mx-auto max-w-[1380px]">
        <motion.div {...fadeUp} className="mb-14 max-w-4xl md:mb-20">
          <MarketingSectionCopy eyebrow="In Store" title={<>매장에서 만나는<br />아티메뉴</>} />
        </motion.div>

        <div className="grid gap-10 md:grid-cols-3 md:gap-6">
          {scenes.map((scene, index) => (
            <motion.article key={scene.title} {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.08 }}>
              <div className="aspect-[4/5] overflow-hidden rounded-[1.75rem] bg-zinc-100 md:rounded-[2rem]">
                <img src={scene.image} alt="" className="h-full w-full object-cover" />
              </div>
              <h3 className="mt-6 break-keep text-xl font-bold leading-tight text-zinc-950 md:text-2xl">{scene.title}</h3>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500 md:text-base">{scene.body}</p>
            </motion.article>
          ))}
        </div>
      </div>
    </section>
  );
}

function DecorativeQr() {
  const modules = [
    [9, 2], [11, 2], [13, 2], [16, 2], [18, 2], [20, 2],
    [8, 4], [10, 4], [12, 4], [16, 4], [19, 4], [21, 4],
    [9, 6], [12, 6], [14, 6], [17, 6], [20, 6],
    [2, 9], [4, 9], [6, 9], [9, 9], [11, 9], [13, 9], [15, 9], [18, 9], [20, 9], [22, 9],
    [3, 11], [6, 11], [8, 11], [10, 11], [14, 11], [17, 11], [19, 11], [22, 11],
    [2, 13], [5, 13], [8, 13], [11, 13], [13, 13], [16, 13], [18, 13], [21, 13],
    [3, 15], [6, 15], [9, 15], [12, 15], [15, 15], [19, 15], [22, 15],
    [2, 17], [5, 17], [8, 17], [10, 17], [13, 17], [16, 17], [18, 17], [21, 17],
    [9, 19], [12, 19], [15, 19], [18, 19], [20, 19], [22, 19],
    [8, 21], [10, 21], [13, 21], [16, 21], [19, 21], [22, 21],
  ];

  return (
    <svg viewBox="0 0 25 25" role="img" aria-label="QR 코드 예시 이미지" className="h-full w-full bg-white p-3">
      {[ [1, 1], [17, 1], [1, 17] ].map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <rect x={x} y={y} width="7" height="7" fill="#18181b" />
          <rect x={x + 1} y={y + 1} width="5" height="5" fill="white" />
          <rect x={x + 2} y={y + 2} width="3" height="3" fill="#18181b" />
        </g>
      ))}
      {modules.map(([x, y]) => <rect key={`${x}-${y}`} x={x} y={y} width="1" height="1" fill="#18181b" />)}
    </svg>
  );
}

function DeviceSetVisual() {
  return (
    <div className="relative h-full overflow-hidden bg-[#eee8dc] text-zinc-950">
      <span className="absolute left-1/2 top-5 z-30 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-zinc-950 px-3 py-2 text-[9px] font-black text-white md:top-7 md:px-4 md:text-[10px]">
        <Link2 className="h-3 w-3" /> artimenu.kr/your-store
      </span>

      <div className="absolute left-[4%] top-[25%] z-10 w-[63%]">
        <div className="overflow-hidden rounded-t-xl border-[5px] border-b-0 border-zinc-950 bg-white shadow-2xl md:border-[7px]">
          <div className="aspect-[16/9]"><MenuBoard compact /></div>
        </div>
        <div className="mx-auto h-2.5 w-[108%] -translate-x-[4%] rounded-b-md bg-zinc-950 md:h-3.5" />
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-black text-zinc-500 md:text-[10px]"><Monitor className="h-3 w-3" />PC · 노트북</p>
      </div>

      <div className="absolute right-[4%] top-[31%] z-20 w-[43%] overflow-hidden rounded-xl border-[5px] border-zinc-950 bg-white shadow-2xl md:rounded-2xl md:border-[7px]">
        <div className="aspect-[4/3]"><MenuBoard compact /></div>
      </div>
      <p className="absolute right-[4%] top-[72%] z-30 flex w-[43%] items-center justify-center gap-1.5 text-[9px] font-black text-zinc-500 md:text-[10px]"><Tablet className="h-3 w-3" />태블릿</p>

      <div className="absolute bottom-[5%] left-[45%] z-30 h-[43%] w-[18%] overflow-hidden rounded-[1.15rem] border-[4px] border-zinc-950 bg-white shadow-2xl md:rounded-[1.4rem] md:border-[6px]">
        <RotatingMenuScreen screenIndex={0} compact />
      </div>

      <div className="absolute bottom-[4%] right-[3%] z-40 flex w-[34%] items-center gap-2 rounded-xl bg-white p-2 shadow-xl md:gap-3 md:p-3">
        <div className="aspect-square w-[42%] shrink-0 overflow-hidden rounded-md"><DecorativeQr /></div>
        <div className="min-w-0">
          <p className="flex items-center gap-1 text-[8px] font-black md:text-[10px]"><Smartphone className="h-3 w-3 shrink-0" />모바일 QR</p>
          <p className="mt-1 break-keep text-[7px] font-semibold leading-relaxed text-zinc-500 md:text-[9px]">QR 이미지 다운로드 및 매장 안내물 활용</p>
        </div>
      </div>
    </div>
  );
}

export function DeviceEverywhereSection() {
  return (
    <DarkStorySection
      endOfRegion
      eyebrow="반응형 메뉴판"
      title={<>하나의 링크,<br />모든 디바이스에 최적화</>}
      body="PC·태블릿·모바일 화면에 맞춰 같은 메뉴판이 자동 최적화됩니다."
      visual={<DeviceSetVisual />}
    />
  );
}

export function ResourceCtaSection() {
  return (
    <section className="bg-white px-6 pb-12 pt-0 md:px-10 md:pb-16 md:pt-0">
      <div className="mx-auto max-w-[1380px]">
        <motion.div {...fadeUp} className="relative overflow-hidden rounded-[2rem] bg-zinc-950 px-7 py-14 text-white md:min-h-[500px] md:rounded-[2.5rem] md:px-16 md:py-20 lg:grid lg:grid-cols-[1.08fr_0.92fr] lg:items-center">
          <div className="relative z-10 max-w-2xl">
            <MarketingSectionCopy
              inverted
              eyebrow="아티메뉴 가이드"
              title={<>아티메뉴 시작을 위한<br />안내</>}
              body="서비스 특징과 메뉴판 제작 방법을 한곳에서 확인할 수 있습니다."
              className="max-w-xl"
            />
            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <a href="#" onClick={(event) => event.preventDefault()} className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3.5 text-sm font-bold text-zinc-950 transition-colors hover:bg-zinc-100">서비스 소개서</a>
              <a href="#" onClick={(event) => event.preventDefault()} className="inline-flex items-center justify-center rounded-full bg-zinc-800 px-6 py-3.5 text-sm font-bold text-white transition-colors hover:bg-zinc-700">이용 가이드</a>
            </div>
          </div>

          <div className="relative mt-14 h-[270px] lg:mt-0 lg:h-[360px]">
            <div className="absolute left-[3%] top-[18%] h-[62%] w-[58%] overflow-hidden rounded-2xl border-4 border-white bg-[#eee5d7] shadow-2xl">
              <MenuBoard compact />
            </div>
            <div className="absolute right-[4%] top-[4%] h-[48%] w-[52%] overflow-hidden rounded-2xl border-4 border-zinc-800 bg-white shadow-2xl">
              <img src="/menu-templates/cafe_design_a/nutty-cream-featured.jpg" alt="" className="h-full w-full object-cover" />
            </div>
            <div className="absolute bottom-[2%] right-[13%] h-[56%] w-[31%] overflow-hidden rounded-[1.6rem] border-[6px] border-zinc-800 bg-white shadow-2xl">
              <MenuBoard compact />
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
