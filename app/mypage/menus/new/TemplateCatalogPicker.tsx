"use client";

import { useMemo, useState } from "react";

import TemplateCard from "@/components/templates/TemplateCard";
import {
  BASIC_TEMPLATE_CATEGORY_GROUPS,
  getAvailableTemplatesForService,
  getTemplateCategoryKeysForBasicGroup,
  type BasicTemplateCategoryGroupKey,
  type TemplateKey,
} from "@/lib/templates";

const activeTemplateCatalog = getAvailableTemplatesForService("basic");
const firstCategoryGroupWithTemplate = BASIC_TEMPLATE_CATEGORY_GROUPS.find((group) =>
  activeTemplateCatalog.some((template) => group.categoryKeys.some((category) => category === template.template_category))
);

export default function TemplateCatalogPicker() {
  const firstGroup = firstCategoryGroupWithTemplate?.key ?? BASIC_TEMPLATE_CATEGORY_GROUPS[0].key;
  const firstGroupCategoryKeys = getTemplateCategoryKeysForBasicGroup(firstGroup);
  const firstTemplate = activeTemplateCatalog.find((template) => firstGroupCategoryKeys.includes(template.template_category)) ?? activeTemplateCatalog[0];
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState<BasicTemplateCategoryGroupKey>(firstGroup);
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<TemplateKey | "">(firstTemplate?.key ?? "");

  const filteredTemplates = useMemo(() => {
    const categoryKeys = getTemplateCategoryKeysForBasicGroup(selectedCategoryGroup);
    return activeTemplateCatalog.filter((template) => categoryKeys.includes(template.template_category));
  }, [selectedCategoryGroup]);

  return (
    <fieldset className="space-y-5">
      <div className="flex flex-col gap-2">
        <legend className="text-sm font-bold">템플릿 선택</legend>
        <p className="break-keep text-sm font-medium leading-relaxed text-zinc-500">
          Basic 카테고리를 먼저 선택한 뒤 해당 카테고리 안의 디자인을 고릅니다.
        </p>
      </div>

      <div className="scrollbar-hide -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {BASIC_TEMPLATE_CATEGORY_GROUPS.map((category) => {
          const isSelected = selectedCategoryGroup === category.key;

          return (
            <button
              key={category.key}
              type="button"
              onClick={() => {
                const categoryKeys = getTemplateCategoryKeysForBasicGroup(category.key);
                const nextTemplate = activeTemplateCatalog.find((template) => categoryKeys.includes(template.template_category));
                setSelectedCategoryGroup(category.key);
                setSelectedTemplateKey(nextTemplate?.key ?? "");
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
            <p className="text-base font-black text-zinc-800">템플릿 준비 중입니다.</p>
            <p className="mt-2 break-keep text-sm font-medium leading-relaxed text-zinc-500">
              이 Basic 카테고리의 템플릿은 준비 중입니다.
            </p>
          </div>
        )}
      </div>
    </fieldset>
  );
}
