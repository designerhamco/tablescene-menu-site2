"use client";

import React from "react";
import { motion } from "motion/react";
import {
  ArrowUpRight,
  Check,
  Clock3,
  ImageIcon,
  Languages,
  Link2,
  Monitor,
  MousePointer2,
  Palette,
  Smartphone,
  Sparkles,
  Tablet,
  Type,
  WandSparkles,
} from "lucide-react";
import { Link } from "react-router";

const menuItems = [
  { name: "Black sesame latte", price: "6.5", image: "/menu-templates/cafe_design_a/black-sesame-featured.jpg" },
  { name: "Nutty cream latte", price: "6.8", image: "/menu-templates/cafe_design_a/nutty-cream-featured.jpg" },
  { name: "Matcha cloud", price: "6.5", image: "/menu-templates/cafe_design_a/malcha.jpg" },
];

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.2 },
  transition: { duration: 0.55, ease: "easeOut" as const },
};

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <span className="mb-5 inline-flex items-center gap-2 text-[13px] font-black uppercase tracking-[0.18em] text-zinc-500">
      <span className="h-1.5 w-1.5 rounded-full bg-zinc-950" />
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

function EditorPanel() {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-[0_24px_70px_rgba(0,0,0,0.13)]">
      <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
        <div>
          <p className="text-xs font-black text-zinc-950">메뉴 추가</p>
          <p className="mt-1 text-[10px] font-semibold text-zinc-400">입력한 순서대로 자동 정리돼요</p>
        </div>
        <span className="grid h-7 w-7 place-items-center rounded-full bg-zinc-950 text-white"><WandSparkles className="h-3.5 w-3.5" /></span>
      </div>
      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-zinc-200 px-3 py-2.5">
          <p className="text-[9px] font-bold text-zinc-400">메뉴명</p>
          <p className="mt-1 text-xs font-black text-zinc-800">Black sesame latte</p>
        </div>
        <div className="grid grid-cols-[1fr_5rem] gap-2">
          <div className="rounded-lg border border-zinc-200 px-3 py-2.5">
            <p className="text-[9px] font-bold text-zinc-400">설명</p>
            <p className="mt-1 truncate text-[10px] font-bold text-zinc-700">고소한 흑임자와 크림의 조화</p>
          </div>
          <div className="rounded-lg border border-zinc-200 px-3 py-2.5">
            <p className="text-[9px] font-bold text-zinc-400">가격</p>
            <p className="mt-1 text-xs font-black text-zinc-800">6,500</p>
          </div>
        </div>
        <button type="button" className="flex w-full items-center justify-center gap-2 rounded-lg bg-zinc-950 py-3 text-xs font-black text-white">
          <Sparkles className="h-3.5 w-3.5" /> 메뉴판에 추가
        </button>
      </div>
    </div>
  );
}

export function ProductHero() {
  return (
    <section className="relative overflow-hidden bg-white px-6 pb-24 pt-28 md:min-h-[calc(100vh-4.5rem)] md:px-10 md:pb-16 md:pt-32">
      <div className="mx-auto grid min-h-[720px] max-w-[1440px] items-center gap-14 lg:grid-cols-[0.78fr_1.22fr] lg:gap-16">
        <motion.div {...fadeUp} className="relative z-10 max-w-2xl">
          <SectionLabel>자동 레이아웃</SectionLabel>
          <h1 className="break-keep text-[clamp(3rem,5.4vw,5.75rem)] font-black leading-[0.98] tracking-[-0.065em] text-zinc-950">
            텍스트만 입력하면,<br />메뉴판이 완성돼요.
          </h1>
          <p className="mt-8 max-w-xl break-keep text-lg font-semibold leading-relaxed text-zinc-500 md:text-xl">
            직접 배치하지 않아도 괜찮아요. 메뉴명과 가격을 입력하면 보기 좋은 간격과 순서로 자동 정리됩니다.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 text-sm font-bold text-zinc-600">
            {["메뉴 입력", "자동 정렬", "바로 공개"].map((item, index) => (
              <span key={item} className="inline-flex items-center gap-2 rounded-full border border-zinc-200 px-4 py-2.5">
                <span className="text-[10px] font-black text-zinc-400">0{index + 1}</span>{item}
              </span>
            ))}
          </div>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="relative min-h-[540px] lg:min-h-[680px]">
          <div className="absolute inset-0 rounded-[2.25rem] bg-zinc-100" />
          <div className="absolute bottom-7 left-[8%] right-5 top-10 overflow-hidden rounded-[1.65rem] border border-black/5 bg-white shadow-[0_30px_90px_rgba(0,0,0,0.14)] md:bottom-10 md:left-[12%] md:right-10 md:top-14">
            <MenuBoard />
          </div>
          <div className="absolute left-0 top-[13%] w-[245px] md:left-[-3%] md:w-[285px]">
            <EditorPanel />
          </div>
          <div className="absolute bottom-2 right-0 flex items-center gap-2 rounded-full border border-zinc-200 bg-white px-4 py-3 text-xs font-black text-zinc-800 shadow-xl md:bottom-6 md:right-2">
            <Check className="h-4 w-4 rounded-full bg-emerald-500 p-0.5 text-white" /> 자동 배치 완료
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export function CustomizationSection() {
  return (
    <section className="bg-zinc-950 px-6 py-24 text-white md:px-10 md:py-36">
      <div className="mx-auto grid max-w-[1380px] items-center gap-14 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <motion.div {...fadeUp}>
          <SectionLabel>내 맘대로 커스터마이징</SectionLabel>
          <h2 className="break-keep text-4xl font-black leading-[1.08] tracking-[-0.05em] md:text-6xl">
            템플릿은 시작일 뿐,<br />완성은 우리 매장답게.
          </h2>
          <p className="mt-7 max-w-lg break-keep text-lg font-medium leading-relaxed text-zinc-400">
            이미지를 바꾸고, 글자 크기와 스타일을 조절하세요. 템플릿의 완성도는 유지하면서 매장 분위기는 자유롭게 담을 수 있어요.
          </p>
          <ul className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {[
              { icon: ImageIcon, label: "이미지 변경" },
              { icon: Type, label: "글자 스타일" },
              { icon: Palette, label: "배경과 색상" },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 border-t border-white/15 pt-4 text-sm font-black text-white/85">
                <Icon className="h-4 w-4" /> {label}
              </li>
            ))}
          </ul>
        </motion.div>

        <motion.div {...fadeUp} transition={{ ...fadeUp.transition, delay: 0.08 }} className="relative rounded-[2rem] border border-white/10 bg-white/5 p-4 md:p-6">
          <div className="overflow-hidden rounded-[1.35rem] bg-[#ece5d8] shadow-2xl">
            <MenuBoard />
          </div>
          <div className="absolute -bottom-7 left-5 right-5 grid grid-cols-3 gap-2 rounded-2xl border border-zinc-200 bg-white p-3 text-zinc-950 shadow-2xl md:left-auto md:right-[-2rem] md:top-1/2 md:bottom-auto md:w-52 md:-translate-y-1/2 md:grid-cols-1 md:p-4">
            {[
              { icon: ImageIcon, label: "대표 이미지", meta: "직접 업로드" },
              { icon: Type, label: "타이포그래피", meta: "크기 · 스타일" },
              { icon: Palette, label: "배경 스타일", meta: "컬러 · 이미지" },
            ].map(({ icon: Icon, label, meta }) => (
              <button key={label} type="button" className="rounded-xl border border-zinc-100 p-3 text-left transition-colors hover:bg-zinc-50">
                <Icon className="mb-3 h-4 w-4" />
                <span className="block text-[11px] font-black md:text-xs">{label}</span>
                <span className="mt-1 hidden text-[10px] font-semibold text-zinc-400 md:block">{meta}</span>
              </button>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function TimeSaleVisual() {
  return (
    <div className="relative h-full overflow-hidden rounded-[1.35rem] bg-[#ece7dd] p-5 md:p-8">
      <div className="absolute inset-x-6 top-7 flex items-center justify-between">
        <p className="text-lg font-black tracking-[-0.04em] text-zinc-950">TODAY&apos;S MENU</p>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1.5 text-[10px] font-black text-white">
          <Clock3 className="h-3 w-3" /> 18:42:09
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

function TranslationVisual() {
  return (
    <div className="relative h-full overflow-hidden rounded-[1.35rem] bg-zinc-950 p-5 text-white md:p-8">
      <div className="flex items-center justify-between">
        <p className="text-lg font-black tracking-[-0.04em]">AUBE COFFEE</p>
        <Languages className="h-5 w-5 text-white/60" />
      </div>
      <div className="mt-8 grid grid-cols-4 gap-2">
        {["한국어", "English", "中文", "日本語"].map((language, index) => (
          <span key={language} className={`rounded-full px-2 py-2 text-center text-[9px] font-black ${index === 1 ? "bg-white text-zinc-950" : "border border-white/15 text-white/55"}`}>
            {language}
          </span>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        {[
          ["Black sesame latte", "6.5"],
          ["Nutty cream latte", "6.8"],
          ["Matcha cloud", "6.5"],
        ].map(([name, price]) => (
          <div key={name} className="flex items-center justify-between rounded-xl bg-white/7 px-4 py-3">
            <div>
              <p className="text-xs font-black">{name}</p>
              <p className="mt-1 text-[9px] font-semibold text-white/40">Translated automatically</p>
            </div>
            <p className="text-sm font-black">{price}</p>
          </div>
        ))}
      </div>
      <div className="absolute bottom-5 right-5 inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[10px] font-black text-zinc-950 shadow-xl">
        <MousePointer2 className="h-3 w-3" /> 클릭 한 번으로 번역 완료
      </div>
    </div>
  );
}

export function SalesAndLanguageSection() {
  const features = [
    {
      number: "01",
      title: "타임 세일과 위젯으로\n매출 기회를 놓치지 마세요.",
      description: "한정 할인, 추천 메뉴, 이벤트 위젯을 원하는 시간에 보여주고 고객의 시선을 자연스럽게 모을 수 있어요.",
      visual: <TimeSaleVisual />,
    },
    {
      number: "02",
      title: "직접 번역하지 마세요.\n클릭 한 번이면 충분해요.",
      description: "한국어 메뉴판을 기준으로 영어·중국어·일본어 번역을 제공해 4개 국어 메뉴판을 빠르게 준비할 수 있어요.",
      visual: <TranslationVisual />,
    },
  ];

  return (
    <section className="bg-white px-6 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1380px]">
        <motion.div {...fadeUp} className="mb-14 max-w-3xl md:mb-20">
          <SectionLabel>더 똑똑한 메뉴판</SectionLabel>
          <h2 className="break-keep text-4xl font-black leading-[1.08] tracking-[-0.05em] text-zinc-950 md:text-6xl">
            보여주는 것을 넘어,<br />매출과 운영까지 생각했어요.
          </h2>
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {features.map((feature, index) => (
            <motion.article key={feature.number} {...fadeUp} transition={{ ...fadeUp.transition, delay: index * 0.08 }} className="min-w-0 overflow-hidden rounded-[2rem] border border-zinc-200 bg-zinc-50 p-5 md:p-7">
              <div className="aspect-[16/10] min-h-[300px] min-w-0">{feature.visual}</div>
              <div className="grid gap-5 px-1 pb-3 pt-7 md:grid-cols-[3rem_1fr] md:pt-9">
                <span className="text-sm font-black text-zinc-400">{feature.number}</span>
                <div>
                  <h3 className="whitespace-pre-line break-keep text-2xl font-black leading-tight tracking-[-0.035em] text-zinc-950 md:text-3xl">{feature.title}</h3>
                  <p className="mt-4 break-keep text-base font-medium leading-relaxed text-zinc-500">{feature.description}</p>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
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
    <section className="overflow-hidden bg-[#f3f3f1] px-6 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1380px]">
        <motion.div {...fadeUp} className="mx-auto max-w-4xl text-center">
          <SectionLabel>하나의 링크, 모든 화면</SectionLabel>
          <h2 className="break-keep text-4xl font-black leading-[1.08] tracking-[-0.055em] text-zinc-950 md:text-6xl">
            링크만 있으면 어디서든<br />메뉴판을 바로 띄워요.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl break-keep text-lg font-medium leading-relaxed text-zinc-500">
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
      title: "갖고 있는 디바이스에\n메뉴판을 띄우시려면",
      name: "아티메뉴 베이직",
      href: "/services/basic",
      icon: Tablet,
    },
    {
      eyebrow: "TV · 모니터 · 대형 화면",
      title: "매장 디스플레이에\n메뉴판을 띄우시려면",
      name: "아티메뉴 디스플레이",
      href: "/services/display",
      icon: Monitor,
    },
  ];

  return (
    <section className="bg-white px-6 py-24 md:px-10 md:py-36">
      <div className="mx-auto max-w-[1380px]">
        <motion.div {...fadeUp} className="mb-14 md:mb-20">
          <SectionLabel>자세히 알아보세요</SectionLabel>
          <h2 className="break-keep text-4xl font-black leading-[1.08] tracking-[-0.05em] text-zinc-950 md:text-6xl">
            우리 매장에 맞는 방식으로<br />시작할 수 있어요.
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
                  <h3 className="mt-16 whitespace-pre-line break-keep text-3xl font-black leading-tight tracking-[-0.04em] text-zinc-950 md:text-4xl">{service.title}</h3>
                  <div className="mt-auto flex items-end justify-between gap-5 pt-14">
                    <p className="text-xl font-black text-zinc-950 md:text-2xl">{service.name}</p>
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
