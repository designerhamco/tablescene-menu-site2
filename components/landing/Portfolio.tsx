"use client";

import Image from "next/image";
import { useState } from "react";
import { portfolioContent } from "./data";
import { Icon } from "./Icon";

type Tab = keyof typeof portfolioContent;

export function Portfolio() {
  const [activeTab, setActiveTab] = useState<Tab>("PRO");
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  const [deviceMode, setDeviceMode] = useState<"tablet" | "mobile">("tablet");

  const currentFeatures = portfolioContent[activeTab];
  const currentFeature = currentFeatures[activeFeatureIndex] ?? currentFeatures[0];
  const splitIndex = Math.ceil(currentFeatures.length / 2);
  const leftFeatures = currentFeatures.slice(0, splitIndex);
  const rightFeatures = currentFeatures.slice(splitIndex);

  const changeTab = (tab: Tab) => {
    setActiveTab(tab);
    setActiveFeatureIndex(0);
  };

  return (
    <section id="portfolio" className="relative flex min-h-screen flex-col justify-center overflow-hidden bg-white py-12 text-zinc-900 md:py-16">
      <div className="relative mx-auto w-full max-w-7xl px-6">
        <div className="relative z-10 mb-10 text-center">
          <h2 className="mb-8 text-3xl font-bold leading-tight tracking-tight text-black md:text-5xl">아티메뉴 서비스 화면 미리보기</h2>
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {(Object.keys(portfolioContent) as Tab[]).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => changeTab(tab)}
                className={`rounded-full px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all md:text-sm ${
                  activeTab === tab ? "scale-105 bg-black text-white shadow-lg" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-700"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-4">
            <div className="flex items-center rounded-full border border-zinc-200 bg-zinc-100 p-1">
              {(["tablet", "mobile"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDeviceMode(mode)}
                  className={`flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold transition-all ${
                    deviceMode === mode ? "bg-white text-black shadow-md" : "text-zinc-500 hover:text-zinc-700"
                  }`}
                >
                  <Icon name={mode === "tablet" ? "tablet" : "smartphone"} className="h-4 w-4" />
                  {mode === "tablet" ? "PC・Tablet" : "Mobile"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex w-full flex-col items-center justify-center gap-8 md:flex-row md:gap-12">
          <FeatureColumn features={leftFeatures} active={activeFeatureIndex} onSelect={setActiveFeatureIndex} side="left" />

          <div
            className={`relative z-10 order-first mb-6 shrink-0 overflow-hidden border-[8px] border-zinc-900 bg-zinc-900 shadow-2xl transition-all duration-500 md:order-none md:mb-0 ${
              deviceMode === "tablet" ? "aspect-[4/3] w-[90vw] rounded-[1.5rem] md:w-[700px]" : "aspect-[9/16] w-[70vw] rounded-[2.5rem] md:w-[340px]"
            }`}
          >
            <Image
              src={currentFeature.image}
              alt={currentFeature.text}
              fill
              sizes={deviceMode === "tablet" ? "(min-width: 768px) 700px, 90vw" : "(min-width: 768px) 340px, 70vw"}
              className="object-cover"
            />
            <div className="absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-black/50 to-transparent" />
            <div className="absolute inset-x-0 bottom-6 z-20 text-center">
              <span className="inline-block rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-white/90 backdrop-blur-md">
                {currentFeature.text}
              </span>
            </div>
          </div>

          <FeatureColumn
            features={rightFeatures}
            active={activeFeatureIndex}
            offset={splitIndex}
            onSelect={setActiveFeatureIndex}
            side="right"
          />

          <div className="grid w-full grid-cols-2 gap-3 px-2 md:hidden">
            {currentFeatures.map((feature, idx) => (
              <button
                key={feature.id}
                type="button"
                onClick={() => setActiveFeatureIndex(idx)}
                className={`rounded-xl border p-3 text-center transition-all ${
                  activeFeatureIndex === idx ? "border-black bg-white text-black shadow-md" : "border-zinc-200 bg-white text-zinc-400"
                }`}
              >
                <h3 className={`text-xs font-bold ${activeFeatureIndex === idx ? "text-black" : "text-zinc-400"}`}>{feature.text}</h3>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureColumn({
  features,
  active,
  offset = 0,
  onSelect,
  side,
}: {
  features: readonly { id: string; text: string; image: string }[];
  active: number;
  offset?: number;
  onSelect: (index: number) => void;
  side: "left" | "right";
}) {
  return (
    <div className={`hidden min-h-[300px] w-1/4 flex-col justify-center gap-4 md:flex ${side === "left" ? "items-end text-right" : "items-start text-left"}`}>
      {features.map((feature, idx) => {
        const realIndex = idx + offset;
        const isActive = active === realIndex;
        return (
          <button
            key={feature.id}
            type="button"
            onClick={() => onSelect(realIndex)}
            className={`group transition-all duration-300 ${isActive ? "translate-x-0 opacity-100" : `opacity-40 hover:opacity-70 ${side === "left" ? "hover:-translate-x-2" : "hover:translate-x-2"}`}`}
          >
            <h3 className={`mb-1 text-lg font-bold ${isActive ? "text-black" : "text-zinc-400"}`}>{feature.text}</h3>
            {isActive && <div className="mt-1 h-0.5 w-full bg-black" />}
          </button>
        );
      })}
    </div>
  );
}
