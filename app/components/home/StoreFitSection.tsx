"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";

const storeTypes = [
  {
    label: "카페/베이커리",
    image: "https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=1400&auto=format&fit=crop",
  },
  {
    label: "음식점/다이닝",
    image: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=1400&auto=format&fit=crop",
  },
  {
    label: "뷰티/웰니스",
    image: "https://images.unsplash.com/photo-1562322140-8baeececf3df?q=80&w=1400&auto=format&fit=crop",
  },
  {
    label: "클래스/공방",
    image: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?q=80&w=1400&auto=format&fit=crop",
  },
  {
    label: "병원/클리닉",
    image: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?q=80&w=1400&auto=format&fit=crop",
  },
];

const storeNeeds = [
  "가격 변동이 잦은 매장",
  "시즌 메뉴를 자주 추가하는 매장",
  "종이 메뉴판 제작이 번거로운 매장",
  "모바일과 매장 화면을 함께 쓰고 싶은 매장",
];

function SectionTitle() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mx-auto mb-10 max-w-3xl text-center"
    >
      <h2 className="break-keep text-3xl font-bold leading-tight tracking-tight text-zinc-950 md:text-5xl">
        메뉴판을 자주 바꾸는 매장이라면
      </h2>
      <p className="mt-5 break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
        메뉴와 가격표를 쉽게 만들고, 사장님이 직접 관리하고 싶은 매장에 잘 맞습니다.
      </p>
    </motion.div>
  );
}

export function StoreFitVisual({ className = "", showNeeds = true }: { className?: string; showNeeds?: boolean }) {
  const [activeStore, setActiveStore] = useState(storeTypes[0]);

  return (
    <div className={className}>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-2 md:flex-wrap md:justify-center md:overflow-visible">
        {storeTypes.map((store) => {
          const isActive = activeStore.label === store.label;
          return (
            <button
              key={store.label}
              type="button"
              onClick={() => setActiveStore(store)}
              onMouseEnter={() => setActiveStore(store)}
              className={`shrink-0 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                isActive ? "bg-zinc-950 text-white" : "bg-white text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              {store.label}
            </button>
          );
        })}
      </div>

      <div className="relative overflow-hidden rounded-[2rem] bg-zinc-950">
        <AnimatePresence mode="wait">
          <motion.img
            key={activeStore.label}
            src={activeStore.image}
            alt=""
            initial={{ opacity: 0, scale: 1.03 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.02 }}
            transition={{ duration: 0.35 }}
            className="h-[420px] w-full object-cover opacity-75 md:h-[600px]"
          />
        </AnimatePresence>
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/15 to-black/75" />
        {showNeeds ? (
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            <div className="grid gap-3 md:grid-cols-4">
              {storeNeeds.map((need) => (
                <div key={need} className="flex items-start gap-2 text-sm font-bold leading-relaxed text-white md:text-base">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#F8E731]" />
                  {need}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function StoreFitSection() {
  return (
    <section className="bg-zinc-50 px-6 py-20 md:py-28">
      <div className="mx-auto max-w-7xl">
        <SectionTitle />
        <StoreFitVisual />
      </div>
    </section>
  );
}
