import React, { useState } from 'react';
import { motion } from 'motion/react';
import TemplateCard from '@/components/templates/TemplateCard';
import { templateCatalog, templateCategoryFilters, type TemplateCategoryFilterKey } from '@/lib/templates';

const showcaseTemplates = templateCatalog.filter((template) => template.active);
const recommendedFilterKeys = ['all', 'cafe', 'bakery', 'dessert', 'restaurant', 'hair_salon', 'nail_shop', 'clinic'] as const;
const showcaseCategoryFilters = templateCategoryFilters.filter((filter) => recommendedFilterKeys.includes(filter.key));

const TemplateShowcase = () => {
  const [activeCategory, setActiveCategory] = useState<TemplateCategoryFilterKey>('all');
  const visibleTemplates =
    activeCategory === 'all'
      ? showcaseTemplates
      : showcaseTemplates.filter((template) => template.template_category === activeCategory);

  return (
    <section className="bg-zinc-50 py-24">
      <div className="mx-auto max-w-7xl px-6">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className="mx-auto mb-12 max-w-3xl text-center"
        >
          <h2 className="break-keep text-3xl font-bold tracking-tight text-zinc-950 md:text-5xl">
            디자이너가 만든 템플릿으로 시작하세요
          </h2>
          <p className="mt-5 break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
            템플릿으로 빠르게 시작하고, 글자 크기·배경색·폰트·메뉴 구성을 매장에 맞게 조정할 수 있습니다.
          </p>
        </motion.div>

        <div className="mb-12 flex flex-wrap justify-center gap-3">
          {showcaseCategoryFilters.map((category) => (
            <button
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
              className={`rounded-full px-5 py-3 text-base font-medium transition-colors ${
                activeCategory === category.key
                  ? 'bg-zinc-950 text-white'
                  : 'bg-white text-zinc-700 hover:bg-zinc-100'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {visibleTemplates.length > 0 ? (
            visibleTemplates.map((template, index) => (
              <motion.article
                key={template.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
              >
                <TemplateCard template={template} />
              </motion.article>
            ))
          ) : (
            <div className="col-span-full rounded-[1.5rem] border border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
              <p className="text-lg font-bold text-zinc-900">등록된 템플릿이 아직 없습니다.</p>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                해당 업종 템플릿은 준비 중입니다. 현재는 카페 베이직 템플릿부터 순차적으로 운영하고 있습니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default TemplateShowcase;
