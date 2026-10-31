import { DEFAULT_DESIGN_REVIEWS, MENU_LAYOUTS, getDefaultDesignReviewUrl } from './menu-design-policy';
import { getDiningTemplateTier } from './dining-product-tiers';
import { getMenuPlanMonthlyPrice } from './menu-plan-pricing';
import { getTemplatePreviewRouteKey, templateCatalog, type TemplateCategoryKey } from './templates';

export type CatalogService = 'basic' | 'dining' | 'display';
export type CatalogKind = 'standard' | 'designer';
export const CATALOG_LAYOUT_FILTERS = [
  {key:'all',label:'전체'},
  {key:'list',label:'리스트형'},
  {key:'album',label:'앨범형'},
] as const;
export type CatalogLayoutFilter = typeof CATALOG_LAYOUT_FILTERS[number]['key'];
export function normalizeCatalogLayoutFilter(value: unknown): CatalogLayoutFilter {
  return value === 'list' || value === 'album' ? value : 'all';
}
export type CatalogDesign = {
  id: string; name: string; description: string; service: CatalogService; kind: CatalogKind;
  templateKey: string; itemLayout: 'list' | 'album'; categories: TemplateCategoryKey[];
  categoryLabel: string; image: string; previewHref: string; detailHref: string; startHref: string;
};
export const CATALOG_INDUSTRIES = [
  {key:'all',label:'전체',categories:[]},
  {key:'cafe_bakery',label:'카페베이커리',categories:['cafe','bakery','dessert']},
  {key:'restaurant_dining',label:'레스토랑다이닝',categories:['restaurant','brunch','casual_dining','fine_dining']},
  {key:'japanese',label:'일식',categories:['japanese']},
  {key:'pub_bar',label:'바주점',categories:['pub_bar']},
  {key:'quick_meal',label:'패스트푸드분식',categories:['fast_food']},
] as const;
export type CatalogIndustry = typeof CATALOG_INDUSTRIES[number]['key'];
export function getCatalogIndustryLabel(categories: readonly TemplateCategoryKey[], fallback: string) {
  return CATALOG_INDUSTRIES.filter(industry=>industry.key!=='all'&&industry.categories.some(category=>categories.includes(category)))
    .map(industry=>industry.label).join(' · ') || fallback;
}
export function getCatalogPricing(service: 'basic'|'dining', kind: CatalogKind) {
  const access=kind==='standard'?'standard':'all';
  return {regularMonthly:getMenuPlanMonthlyPrice(service,access,'regular'),earlyBirdMonthly:getMenuPlanMonthlyPrice(service,access,'earlyBird')};
}
export function getCatalogStartHref(service: CatalogService, templateKey: string, designId: string) {
  if(service==='display') return `/apply/display?template=${templateKey}`;
  return `/apply/basic?${new URLSearchParams({product:service==='dining'?'business_basic_multi_monthly':'business_basic_single_monthly',template:templateKey,design:designId})}`;
}
const standards: CatalogDesign[]=DEFAULT_DESIGN_REVIEWS.map(design=>{
  const service=MENU_LAYOUTS[design.layout].service;
  return {id:design.id,name:`${MENU_LAYOUTS[design.layout].label} · ${design.itemLayout==='album'?'앨범형':'리스트형'}`,
    description:design.itemLayout==='album'?'상품 사진을 중심으로 메뉴를 보여주는 기본 디자인입니다. 색상과 서체를 매장에 맞게 꾸며보세요.':'흰 배경과 검정 글자를 바탕으로 메뉴를 정갈하게 보여주는 기본 디자인입니다.',
    service,kind:'standard',templateKey:design.renderer,itemLayout:design.itemLayout,categories:[],categoryLabel:'기본 디자인',
    image:`/template-previews/default-${design.id}-20261021.jpg`,previewHref:getDefaultDesignReviewUrl(design),detailHref:`/templates/${design.id}`,
    startHref:getCatalogStartHref(service,design.renderer,design.id)};
});
const designers: CatalogDesign[]=templateCatalog.filter(t=>t.status==='available').map(t=>{
  const service=t.service==='display'?'display':getDiningTemplateTier(t.key)==='multi'?'dining':'basic';
  const route=getTemplatePreviewRouteKey(t.key);
  return {id:t.key,name:t.name,description:t.description,service,kind:'designer',templateKey:t.key,itemLayout:'list',categories:[...t.categories],categoryLabel:getCatalogIndustryLabel(t.categories,t.categoryLabel),
    image:`/template-previews/${route}.jpg`,previewHref:`/templates/${route}/preview`,detailHref:`/templates/${route}`,startHref:getCatalogStartHref(service,t.key,t.key)};
});
export const catalogDesigns: readonly CatalogDesign[]=[...standards,...designers];
export function getCatalogDesign(id: unknown) {
  if(typeof id!=='string')return null;
  return catalogDesigns.find(d=>d.id===id||d.detailHref===`/templates/${id}`)??null;
}
export function filterCatalogDesigns(service:CatalogService,kind:CatalogKind,filter='all',layout:CatalogLayoutFilter='all') {
  return catalogDesigns.filter(d=>d.service===service&&(service==='display'||d.kind===kind)).filter(d=>{
    if(filter==='all')return true;
    if(kind==='standard')return d.itemLayout===filter;
    const industry=CATALOG_INDUSTRIES.find(i=>i.key===filter);
    return industry?.categories.some(c=>d.categories.includes(c as TemplateCategoryKey))??false;
  }).filter(design => layout === 'all' || design.itemLayout === layout);
}
