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
import { Badge } from "@/app/components/ui/badge";
import { CategoryFilter } from "@/app/components/ui/category-filter";
import { EmptyState } from "@/app/components/ui/empty-state";
import { PanelsTopLeft } from "lucide-react";

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
        <legend className="text-copy font-medium">템플릿 선택</legend>
        <p className="break-keep text-copy font-medium leading-relaxed text-zinc-500">
          Basic 카테고리를 먼저 선택한 뒤 해당 카테고리 안의 디자인을 고릅니다.
        </p>
      </div>

      <CategoryFilter label="새 메뉴판 템플릿 주제" value={selectedCategoryGroup}
        options={BASIC_TEMPLATE_CATEGORY_GROUPS.map(category => ({ value: category.key, label: category.label }))}
        onValueChange={value => {
          const next = value as BasicTemplateCategoryGroupKey;
          const categoryKeys = getTemplateCategoryKeysForBasicGroup(next);
          const template = activeTemplateCatalog.find(item => categoryKeys.includes(item.template_category));
          setSelectedCategoryGroup(next);
          setSelectedTemplateKey(template?.key ?? "");
        }} />

      <div className="grid gap-4 lg:grid-cols-3">
        {filteredTemplates.length > 0 ? filteredTemplates.map((template) => {
          const isSelected = selectedTemplateKey === template.key;

          return (
            <label
              key={template.key}
              className={`site-card site-card-interactive group flex cursor-pointer flex-col p-3 ${
                isSelected
                  ? "border-zinc-950"
                  : "border-zinc-200"
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
                  <Badge

                  >
                    ✓
                  </Badge>
                }
              />
            </label>
          );
        }) : (
          <EmptyState headingLevel={3} className="lg:col-span-3" icon={<PanelsTopLeft />} title="템플릿 준비 중입니다." description="이 Basic 카테고리의 템플릿은 준비 중입니다." />
        )}
      </div>
    </fieldset>
  );
}
