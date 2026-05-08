"use client";

import { useMemo, useState } from "react";

import {
  TEMPLATE_CATEGORIES,
  templateCatalog,
  type TemplateCatalogItem,
  type TemplateCategoryKey,
  type TemplateKey,
} from "@/lib/templates";

function getThumbnailClassName(tone: TemplateCatalogItem["thumbnailTone"]) {
  const toneClasses: Record<TemplateCatalogItem["thumbnailTone"], string> = {
    light: "bg-[#f7f4ed] text-zinc-950",
    warm: "bg-[#f8eadb] text-zinc-950",
    dark: "bg-zinc-950 text-white",
  };

  return toneClasses[tone];
}

function TemplateThumbnail({ template }: { template: TemplateCatalogItem }) {
  const isDark = template.thumbnailTone === "dark";

  if (template.thumbnailUrl) {
    return (
      <div
        aria-label={`${template.name} 템플릿 미리보기`}
        className="relative h-48 overflow-hidden rounded-3xl bg-zinc-100 bg-cover bg-center"
        role="img"
        style={{ backgroundImage: `url(${template.thumbnailUrl})` }}
      />
    );
  }

  return (
    <div className={`relative h-48 overflow-hidden rounded-3xl p-4 ${getThumbnailClassName(template.thumbnailTone)}`}>
      <div className={`absolute inset-x-0 top-0 h-20 ${isDark ? "bg-white/10" : "bg-zinc-950/10"}`} />
      <div className="relative mx-auto flex h-full max-w-[148px] flex-col rounded-[1.7rem] border border-current/10 bg-white/90 p-3 text-zinc-950 shadow-xl shadow-zinc-900/10">
        <div className="mb-3 flex items-center justify-between gap-2">
          <div className="h-7 w-7 rounded-full bg-zinc-950" />
          <div className="h-2 w-12 rounded-full bg-zinc-200" />
        </div>
        <div className="mb-3 space-y-1.5">
          <div className="h-3 w-20 rounded-full bg-zinc-950" />
          <div className="h-2 w-24 rounded-full bg-zinc-200" />
        </div>
        <div className="space-y-2">
          {[0, 1, 2].map((item) => (
            <div key={item} className="rounded-2xl border border-zinc-100 bg-white p-2">
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-xl bg-zinc-100" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="h-2 w-16 rounded-full bg-zinc-800" />
                  <div className="h-1.5 w-20 rounded-full bg-zinc-200" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-auto h-2 w-full rounded-full bg-zinc-100" />
      </div>
    </div>
  );
}

export default function TemplateCatalogPicker() {
  const firstCategory = TEMPLATE_CATEGORIES[0].key;
  const firstTemplate = templateCatalog.find((template) => template.template_category === firstCategory) ?? templateCatalog[0];
  const [selectedCategory, setSelectedCategory] = useState<TemplateCategoryKey>(firstTemplate.template_category);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey>(firstTemplate.key);

  const filteredTemplates = useMemo(() => {
    return templateCatalog.filter((template) => template.template_category === selectedCategory);
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
                const nextTemplate = templateCatalog.find((template) => template.template_category === category.key);
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
        {filteredTemplates.map((template) => {
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

              <TemplateThumbnail template={template} />

              <div className="flex flex-1 flex-col p-2 pt-5">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{template.name}</h3>
                    <p className="mt-1 font-mono text-xs font-bold text-zinc-400">{template.key}</p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] ${
                      isSelected ? "bg-zinc-950 text-white" : "bg-zinc-100 text-zinc-500"
                    }`}
                  >
                    {isSelected ? "선택됨" : template.badge}
                  </span>
                </div>

                <p className="break-keep text-sm font-medium leading-relaxed text-zinc-500">{template.description}</p>

                <div className="mt-4 flex flex-wrap gap-2">
                  {template.categoryLabels.map((label) => (
                    <span key={label} className="rounded-full bg-zinc-100 px-2.5 py-1 text-[11px] font-bold text-zinc-500">
                      {label}
                    </span>
                  ))}
                </div>

                <div className="mt-5 flex items-center justify-between gap-3 border-t border-zinc-100 pt-4">
                  <p className="text-xs font-bold text-zinc-400">썸네일 이미지는 추후 연결 가능</p>
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-black ${
                      isSelected ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
