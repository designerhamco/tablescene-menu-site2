import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import TemplateCard from '@/components/templates/TemplateCard';
import {
  BASIC_TEMPLATE_CATEGORY_GROUPS,
  DISPLAY_TEMPLATE_CATEGORY_GROUPS,
  getAvailableTemplatesForService,
  getFeaturedTemplatesForBasicPage,
  getTemplateCategoryKeysForBasicGroup,
  getTemplateCategoryKeysForDisplayGroup,
  type BasicTemplateCategoryGroupKey,
  type DisplayTemplateCategoryGroupKey,
  type TemplateCatalogItem,
  type TemplateServiceKey,
} from '@/lib/templates';

const firstBasicCategoryGroupKey = BASIC_TEMPLATE_CATEGORY_GROUPS[0].key;
const firstDisplayCategoryGroupKey = DISPLAY_TEMPLATE_CATEGORY_GROUPS[0].key;

type TemplateShowcaseProps = {
  service?: TemplateServiceKey | 'all';
};

const serviceTabs = [
  {
    key: 'basic',
    label: '아티메뉴 베이직',
    description: '모바일·태블릿·PC에서 열어보는 디지털 메뉴판',
  },
  {
    key: 'display',
    label: '아티메뉴 디스플레이',
    description: '매장 TV와 모니터에 띄우는 디지털 메뉴보드',
  },
] as const satisfies readonly { key: TemplateServiceKey; label: string; description: string }[];

function getShowcaseTemplates(service: TemplateServiceKey): TemplateCatalogItem[] {
  return getAvailableTemplatesForService(service);
}

const TemplateShowcase = ({ service = 'all' }: TemplateShowcaseProps) => {
  const [activeCategory, setActiveCategory] = useState<BasicTemplateCategoryGroupKey | DisplayTemplateCategoryGroupKey>(
    service === 'display' ? firstDisplayCategoryGroupKey : firstBasicCategoryGroupKey
  );
  const [activePage, setActivePage] = useState(0);
  const [cardsPerPage, setCardsPerPage] = useState(4);
  const carouselRef = useRef<HTMLDivElement>(null);
  const isHomeShowcase = service === 'all';
  const selectedService = isHomeShowcase ? 'basic' : service;
  const activeServiceCopy = serviceTabs.find((tab) => tab.key === selectedService) ?? serviceTabs[0];
  const showcaseTemplates = getShowcaseTemplates(selectedService);
  const activeCategoryGroups =
    selectedService === 'basic' ? BASIC_TEMPLATE_CATEGORY_GROUPS : DISPLAY_TEMPLATE_CATEGORY_GROUPS;
  const visibleTemplates = isHomeShowcase
    ? getFeaturedTemplatesForBasicPage()
    : selectedService === 'basic'
      ? showcaseTemplates.filter((template) => getTemplateCategoryKeysForBasicGroup(activeCategory as BasicTemplateCategoryGroupKey).includes(template.template_category))
      : showcaseTemplates.filter((template) => getTemplateCategoryKeysForDisplayGroup(activeCategory as DisplayTemplateCategoryGroupKey).includes(template.template_category));
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
    <section className={`${isHomeShowcase ? 'bg-transparent py-28 text-white md:py-36' : 'bg-zinc-50 py-24 md:py-36'}`}>
      <div className={`${isHomeShowcase ? 'mx-auto max-w-[1560px]' : 'mx-auto max-w-7xl px-6'}`}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55 }}
          className={`mx-auto max-w-4xl px-6 text-center ${isHomeShowcase ? 'mb-16 md:mb-20' : 'mb-12'}`}
        >
          {isHomeShowcase ? <p className="mb-4 text-sm font-bold text-zinc-400">전문 디자이너가 설계한 메뉴판</p> : null}
          <h2 className={`whitespace-pre-line break-keep text-3xl font-bold tracking-tight md:text-5xl ${isHomeShowcase ? 'text-white' : 'text-zinc-950'}`}>
            {isHomeShowcase ? '매장의 분위기를 완성하는\n아티메뉴 템플릿' : '디자이너가 만든 템플릿으로 시작하세요'}
          </h2>
          {isHomeShowcase ? (
            <p className="mx-auto mt-6 max-w-2xl break-keep text-base font-medium leading-relaxed text-zinc-400 md:text-lg">
              카페와 음식점의 분위기를 세심하게 담은 베이직 템플릿을 둘러보고 매장에 어울리는 디자인을 선택하세요.
            </p>
          ) : (
            <p className="mt-5 break-keep text-base font-medium leading-relaxed text-zinc-500 md:text-lg">
              {activeServiceCopy.description}
            </p>
          )}
        </motion.div>

        {!isHomeShowcase ? (
          <div className="mb-12 flex flex-wrap justify-center gap-3">
            {activeCategoryGroups.map((category) => (
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
        ) : null}

        <div className={isHomeShowcase ? 'relative' : ''}>
          {isHomeShowcase ? <><div className="pointer-events-none absolute inset-y-0 left-0 z-20 w-20 bg-gradient-to-r from-zinc-950 via-zinc-950/80 to-transparent md:w-44" /><div className="pointer-events-none absolute inset-y-0 right-0 z-20 w-20 bg-gradient-to-l from-zinc-950 via-zinc-950/80 to-transparent md:w-44" /></> : null}
          <div
            ref={carouselRef}
            onScroll={handleCarouselScroll}
            className={`flex snap-x snap-mandatory overflow-x-auto scroll-smooth pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${isHomeShowcase ? 'gap-4 px-[10vw] md:gap-6 md:px-[5vw]' : 'gap-4 md:gap-6'}`}
          >
          {visibleTemplates.length > 0 ? (
            visibleTemplates.map((template, index) => (
              <motion.article
                key={template.key}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.45, delay: index * 0.08 }}
                className={`min-w-0 shrink-0 snap-start ${isHomeShowcase ? 'basis-[82%] sm:basis-[56%] lg:basis-[35%]' : 'basis-[calc((100%_-_1rem)/2)] md:basis-[calc((100%_-_4.5rem)/4)]'}`}
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
                이 {selectedService === 'basic' ? 'Basic' : 'Display'} 카테고리의 템플릿은 준비 중입니다.
              </p>
            </div>
          )}
          </div>
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
                  activePage === index ? `w-8 ${isHomeShowcase ? 'bg-white' : 'bg-zinc-950'}` : `w-2.5 ${isHomeShowcase ? 'bg-white/25 hover:bg-white/40' : 'bg-zinc-300 hover:bg-zinc-400'}`
                }`}
              />
            ))}
          </div>
        ) : null}

        {isHomeShowcase ? (
          <div className="mt-10 flex justify-center">
            <a
              href="/store"
              className="inline-flex items-center justify-center rounded-full border border-white/25 bg-white/5 px-6 py-3 text-sm font-bold text-white transition-colors hover:bg-white hover:text-zinc-950"
            >
              더 많은 템플릿 보기 <span aria-hidden="true" className="ml-2">→</span>
            </a>
          </div>
        ) : null}
      </div>
    </section>
  );
};

export default TemplateShowcase;
