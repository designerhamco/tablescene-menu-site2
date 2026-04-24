"use client";

import { useState } from "react";
import { faqData } from "./data";
import { Icon } from "./Icon";

export function FAQ() {
  const [activeTab, setActiveTab] = useState(0);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const handleTabChange = (index: number) => {
    setActiveTab(index);
    setOpenIndex(0);
  };

  return (
    <section id="faq" className="relative bg-white py-24">
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-10 text-center">
          <h2 className="mb-6 text-3xl font-bold leading-tight tracking-tight text-zinc-900 md:text-5xl">자주 묻는 질문</h2>
          <p className="text-lg font-medium text-zinc-500">서비스 이용과 관련하여 가장 많이 궁금해하시는 내용입니다.</p>
        </div>

        <div className="mb-10 flex flex-wrap justify-center gap-2">
          {faqData.map((category, idx) => (
            <button
              key={category.category}
              type="button"
              onClick={() => handleTabChange(idx)}
              className={`rounded-full px-5 py-2.5 text-sm font-bold transition-all duration-300 md:text-base ${
                activeTab === idx ? "scale-105 bg-zinc-900 text-white shadow-lg" : "bg-zinc-100 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
              }`}
            >
              {category.category}
            </button>
          ))}
        </div>

        <div className="mx-auto mb-12 min-h-[400px] w-full rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:max-w-6xl md:p-8">
          {faqData[activeTab].items.map(([question, answer], index) => {
            const isOpen = openIndex === index;
            return (
              <div key={question} className="border-b border-zinc-200 last:border-none">
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="group flex w-full items-start justify-between gap-6 rounded-lg px-4 py-6 text-left transition-colors hover:bg-zinc-50/50 md:items-center"
                >
                  <span className={`text-lg font-bold transition-colors md:text-xl ${isOpen ? "text-primary" : "text-zinc-900 group-hover:text-black"}`}>
                    <span className="mr-2 text-primary">Q.</span>
                    {question}
                  </span>
                  <span className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300 md:mt-0 ${isOpen ? "rotate-180 border-primary bg-primary text-white" : "border-zinc-300 text-zinc-400 group-hover:border-zinc-900 group-hover:text-zinc-900"}`}>
                    <Icon name={isOpen ? "minus" : "plus"} className="h-4 w-4" />
                  </span>
                </button>
                {isOpen && (
                  <div className="overflow-hidden pb-8 pl-4 pr-4 pt-2 text-base font-medium leading-relaxed text-zinc-600 md:pl-8 md:pr-12">
                    <div className="flex gap-3">
                      <span className="shrink-0 font-bold text-zinc-900">A.</span>
                      <p>{answer}</p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
