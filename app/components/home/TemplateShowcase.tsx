import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import TemplateCard from '@/components/templates/TemplateCard';
import {
  getFeaturedTemplatesForBasicPage,
  getFeaturedTemplatesForDisplayPage,
  templateCategoryFilters,
  type TemplateCategoryFilterKey,
  type TemplateCatalogItem,
  type TemplateServiceKey,
} from '@/lib/templates';

const recommendedFilterKeys: readonly TemplateCategoryFilterKey[] = [
  'all',
  'cafe',
  'bakery',
  'dessert',
  'restaurant',
  'hair_salon',
  'nail_shop',
  'clinic',
] as const;
const showcaseCategoryFilters = templateCategoryFilters.filter((filter) => recommendedFilterKeys.includes(filter.key));

type TemplateShowcaseProps = {
  service?: TemplateServiceKey | 'all';
};

const serviceTabs = [
  {
    key: 'basic',
    label: '메뉴링크 베이직',
    description: '모바일·태블릿·PC에서 열어보는 디지털 메뉴판',
  },
  {
    key: 'display',
    label: '메뉴링크 디스플레이',
    description: '매장 TV와 모니터에 띄우는 디지털 메뉴보드',
  },
] as const satisfies readonly { key: TemplateServiceKey; label: string; description: string }[];

function getShowcaseTemplates(service: TemplateServiceKey): TemplateCatalogItem[] {
  if (service === 'display') return getFeaturedTemplatesForDisplayPage();
  return getFeaturedTemplatesForBasicPage();
}

const TemplateShowcase = ({ service = 'all' }: TemplateShowcaseProps) => {
  const [activeService, setActiveService] = useState<TemplateServiceKey>('basic');
  const [activeCategory, setActiveCategory] = useState<TemplateCategoryFilterKey>('all');
  const [activePage, setActivePage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isHomeShowcase = service === 'all';
  const selectedService = isHomeShowcase ? activeService : service;
  const activeServiceCopy = serviceTabs.find((tab) => tab.key === selectedService) ?? serviceTabs[0];
  const showcaseTemplates = getShowcaseTemplates(selectedService);
  const visibleTemplates =
    activeCategory === 'all'
      ? showcaseTemplates
      : showcaseTemplates.filter((template) => template.template_category === activeCategory);
  const pageCount = Math.ceil(visibleTemplates.length / cardsPerPage);
  const showDots = visibleTemplates.length > cardsPerPage;

  useEffect(() => {
    const mediaQuery = window.matchMedia('(min-width: 768px)');
    const syncCardsPerPage = () => setCardsPerPage(mediaQuery.matches ? 4 : 2);

    syncCardsPerPage();
    mediaQuery.addEventListener('change', syncCardsPerPage);

    return () => mediaQuery.removeEventListener('change', syncCardsPerPage);
  }, []);

  useEffect(() => {
    setActivePage(0);
    carouselRef.current?.scrollTo({ left: 0 });
  }, [activeCategory, selectedService]);

  const scrollToPage = (pageIndex: number) => {
    const carousel = carouselRef.current;
    if (!carousel) return;

    const nextPage = Math.max(0, Math.min(pageIndex, pageCount - 1));
    setActivePage(nextPage);
    carousel.scrollTo({
      left: nextPage * carousel.clientWidth,
      behavior: 'smooth',
    });
  };

  const handleCarouselScroll = () => {
    const carousel = carouselRef.current;
    if (!carousel || !carousel.clientWidth) return;

    setActivePage(Math.round(carousel.scrollLeft / carousel.clientWidth));
  };

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
            {activeServiceCopy.description}
          </p>
        </motion.div>

        {isHomeShowcase ? (
          <div className="mx-auto mb-8 grid max-w-3xl gap-3 rounded-[1.5rem] border border-zinc-200 bg-white p-2 md:grid-cols-2">
            {serviceTabs.map((tab) => {
              const isSelected = activeService === tab.key;

              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => {
                    setActiveService(tab.key);
                    setActiveCategory('all');
                  }}
                  className={`rounded-[1.1rem] px-5 py-4 text-left transition-colors ${
                    isSelected ? 'bg-zinc-950 text-white' : 'text-zinc-600 hover:bg-zinc-50'
                  }`}
                  aria-pressed={isSelected}
                >
                  <span className="block text-base font-black">{tab.label}</span>
                  <span className={`mt-1 block break-keep text-sm font-medium leading-relaxed ${
                    isSelected ? 'text-white/70' : 'text-zinc-500'
                  }`}>
                    {tab.description}
                  </span>
                </button>
              );
            })}
          </div>
        ) : null}

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

        <div
          ref={carouselRef}
          onScroll={handleCarouselScroll}
          className="flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-smooth pb-3 [-ms-overflow-style:none] [scrollbar-width:none] md:gap-6 [&::-webkit-scrollbar]:hidden"
        >
          {visibleTemplates.length > 0 ? (
            visibleTemplates.map((template, index) => (
              <motion.article
                key={template.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className="min-w-0 shrink-0 basis-[calc((100%_-_1rem)/2)] snap-start md:basis-[calc((100%_-_4.5rem)/4)]"
              >
                {template.status === 'available' ? (
                  <a
                    href={`/templates/${template.key}/preview`}
                    target="_blank"
                    rel="noreferrer"
                    aria-label={`${template.name} 템플릿 미리보기 새창으로 열기`}
                    className="block h-full"
                  >
                    <TemplateCard template={template} />
                  </a>
                ) : (
                  <TemplateCard template={template} />
                )}
              </motion.article>
            ))
          ) : (
            <div className="w-full shrink-0 rounded-[1.5rem] border border-dashed border-zinc-200 bg-white px-6 py-16 text-center">
              <p className="text-lg font-bold text-zinc-900">등록된 템플릿이 아직 없습니다.</p>
              <p className="mt-3 break-keep text-sm font-medium leading-relaxed text-zinc-500">
                해당 업종 템플릿은 준비 중입니다. 현재는 카페 베이직 템플릿부터 순차적으로 운영하고 있습니다.
              </p>
            </div>
          )}
        </div>

        {showDots ? (
          <div className="mt-7 flex justify-center gap-2">
            {Array.from({ length: pageCount }).map((_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => scrollToPage(index)}
                aria-label={`템플릿 ${index + 1}번째 묶음 보기`}
                className={`h-2.5 rounded-full transition-all ${
                  activePage === index ? 'w-8 bg-zinc-950' : 'w-2.5 bg-zinc-300 hover:bg-zinc-400'
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default TemplateShowcase;
