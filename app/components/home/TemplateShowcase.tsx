import { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import TemplateCard from '@/components/templates/TemplateCard';
import { MarketingSectionCopy } from './MarketingSectionCopy';
import TabletTemplateCarousel from './TabletTemplateCarousel';
import {
  BASIC_TEMPLATE_CATEGORY_GROUPS,
  DISPLAY_TEMPLATE_CATEGORY_GROUPS,
  getAvailableTemplatesForService,
  getFeaturedTemplatesForBasicPage,
  getFeaturedTemplatesForDisplayPage,
  getTemplateCategoryKeysForBasicGroup,
  getTemplateCategoryKeysForDisplayGroup,
  getTemplatePreviewRouteKey,
  type BasicTemplateCategoryGroupKey,
  type DisplayTemplateCategoryGroupKey,
  type TemplateServiceKey,
} from '@/lib/templates';

type TemplateShowcaseProps = {
  service?: TemplateServiceKey | 'all';
  presentation?: 'catalog' | 'marquee';
};

export default function TemplateShowcase({ service = 'all', presentation = 'catalog' }: TemplateShowcaseProps) {
  const isDiningShowcase = service === 'all';
  const selectedService = service === 'all' ? 'basic' : service;
  const isFeatured = service === 'all' || presentation === 'marquee';
  const isDisplay = selectedService === 'display';
  const categories = isDisplay ? DISPLAY_TEMPLATE_CATEGORY_GROUPS : BASIC_TEMPLATE_CATEGORY_GROUPS;
  const [category, setCategory] = useState<string>(categories[0].key);
  const reduceMotion = useReducedMotion();
  const templates = isFeatured
    ? isDisplay ? getFeaturedTemplatesForDisplayPage() : getFeaturedTemplatesForBasicPage()
    : getAvailableTemplatesForService(selectedService);
  const categoryKeys = isDisplay
    ? getTemplateCategoryKeysForDisplayGroup(category as DisplayTemplateCategoryGroupKey)
    : getTemplateCategoryKeysForBasicGroup(category as BasicTemplateCategoryGroupKey);
  const visibleTemplates = isFeatured ? templates : templates.filter((template) => categoryKeys.includes(template.template_category));

  return (
    <section className={`site-section-spacing bg-transparent ${isDisplay ? 'text-white' : 'text-zinc-950'}`}>
      <div className="site-container">
        <div className="mb-12 text-center md:mb-16">
          <MarketingSectionCopy
            centered
            inverted={isDisplay}

            title={isDisplay ? <>매장 화면에 맞춘<br />디스플레이 디자인</> : <>매장의 분위기를 완성하는<br />아티메뉴 템플릿</>}
            body={isDisplay ? '멀리서도 메뉴와 가격이 선명한 화면 구성으로 시작할 수 있습니다.' : '매장 분위기에 맞는 디자인을 선택해 바로 시작할 수 있습니다.'}
            className="max-w-xl"
          />
        </div>
        {!isFeatured ? (
          <div className="site-filter-group mb-8" role="group" aria-label="템플릿 업종 선택">
            {categories.map((item) => <button key={item.key} type="button" className={`site-filter${isDisplay ? " site-filter-inverse" : ""}`} aria-pressed={category === item.key} onClick={() => setCategory(item.key)}>{item.label}</button>)}
          </div>
        ) : null}
        {isDiningShowcase ? <TabletTemplateCarousel /> : <div className="site-template-grid">
          {visibleTemplates.map((template, index) => (
            <motion.article
              key={template.key}
              className="site-template-card"
              initial={reduceMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: reduceMotion ? 0 : .65, delay: reduceMotion ? 0 : Math.min(index, 5) * .08 }}
            >
              {template.status === 'available' ? (
                <a href={`/templates/${getTemplatePreviewRouteKey(template.key)}/preview`} target="_blank" rel="noreferrer" aria-label={`${template.name} 템플릿 미리보기 새창으로 열기`} className="block h-full">
                  <TemplateCard template={template} inverted={isDisplay} />
                </a>
              ) : <TemplateCard template={template} inverted={isDisplay} />}
            </motion.article>
          ))}
        </div>}
        {!isDiningShowcase && visibleTemplates.length === 0 ? <p className="type-body py-16 text-center">등록된 템플릿이 아직 없습니다.</p> : null}
        <div className="mt-12 flex justify-center">
          <a href="/apply" className={`site-button ${isDisplay ? 'site-button-secondary' : 'site-button-primary'}`}>더 많은 디자인 보기</a>
        </div>
      </div>
    </section>
  );
}
