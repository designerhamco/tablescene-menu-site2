"use client";

import { useMemo, useState } from "react";

import TemplateCard from "@/components/templates/TemplateCard";
import {
  TEMPLATE_CATEGORIES,
  templateCatalog,
  type TemplateCategoryKey,
  type TemplateKey,
} from "@/lib/templates";

const activeTemplateCatalog = templateCatalog.filter((template) => template.active);

export default function TemplateCatalogPicker() {
  const firstCategory = TEMPLATE_CATEGORIES[0].key;
  const firstTemplate = activeTemplateCatalog.find((template) => template.template_category === firstCategory) ?? activeTemplateCatalog[0];
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategoryKey>(firstTemplate.template_category);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>(firstTemplate.key);

  const filteredTemplates = useMemo(() => {
    return activeTemplateCatalog.filter((template) => template.template_category === selectedCategory);
  }, [selectedCategory]);

  return (
    <fieldset className="space-y-5">
      <div className="flex flex-col gap-2">
        <legend className="text-sm font-bold">템플릿 선택</legend>
        <p className="break-keep text-sm font-medium leading-relaxed text-zinc-500">
          업종 카테고리를 먼저 선택한 뒤 해당 카테고리 안의 디자인을 고릅니다.
        </p>
      </div>

      <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {TEMPLATE_CATEGORIES.map((category) => {
          const isSelected = selectedCategory === category.key;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => {
                const nextTemplate = activeTemplateCatalog.find((template) => template.template_category === category.key);
                setSelectedCategory(category.key);
                if (nextTemplate) setSelectedTemplateKey(nextTemplate.key);
              }}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-bold transition-colors ${
                isSelected
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-950"
              }`}
              aria-pressed={isSelected}
            >
              {category.label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {filteredTemplates.length > 0 ? filteredTemplates.map((template) => {
          const isSelected = selectedTemplateKey === template.key;

          return (
            <label
              key={template.key}
              className={`group flex cursor-pointer flex-col rounded-3xl border bg-white p-3 transition-all ${
                isSelected
                  ? "border-zinc-950 shadow-xl shadow-zinc-900/10"
                  : "border-zinc-200 shadow-sm hover:border-zinc-400"
              }`}
            >
              <input
                type="radio"
                name="template_key"
                value={template.key}
                checked={isSelected}
                onChange={() => setSelectedTemplateKey(template.key)}
                className="sr-only"
              />
              {isSelected && <input type="hidden" name="template_category" value={template.template_category} />}

              <TemplateCard
                template={template}
                selected={isSelected}
                showServiceBadge={false}
                className="border-0"
                action={
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black ${
                      isSelected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                }
              />
            </label>
          );
        }) : (
          <div className="rounded-3xl border border-dashed border-zinc-200 bg-white px-5 py-12 text-center lg:col-span-3">
            <p className="text-base font-black text-zinc-800">등록된 템플릿이 아직 없습니다.</p>
            <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              이 업종 템플릿은 준비 중입니다. 현재는 카페 템플릿부터 선택할 수 있습니다.
            </p>
          </div>
        )}
      </div>
    </fieldset>
  );
}
