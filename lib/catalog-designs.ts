import { getCatalogFacets, normalizeCatalogSearch, normalizeCatalogSelections, CATALOG_MOODS, CATALOG_COLORS, type CatalogFacets, type CatalogMoodFilter, type CatalogColorFilter } from "./catalog-facets";
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
export type CatalogImage = { src: string; label: string };
export type CatalogDesign = CatalogFacets & {
  id: string; name: string; description: string; service: CatalogService; kind: CatalogKind;
  templateKey: string; itemLayout: 'list' | 'album'; categories: TemplateCategoryKey[];
  categoryLabel: string; image: string; images: readonly CatalogImage[]; previewHref: string; detailHref: string; startHref: string;
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
const standardPreviewVersions: Readonly<Record<string, string>> = {
  "basic-top-row": "20261110",
  "basic-top-row-left-logo": "20261110-v2",
};
const standards: CatalogDesign[]=DEFAULT_DESIGN_REVIEWS.map(design=>{
  const service=MENU_LAYOUTS[design.layout].service;
  return {...getCatalogFacets(design.renderer, "standard"),id:design.id,name:`${MENU_LAYOUTS[design.layout].label} · ${design.itemLayout==='album'?'앨범형':'리스트형'}`,
    description:design.itemLayout==='album'?'상품 사진을 중심으로 메뉴를 보여주는 기본 디자인입니다. 색상과 서체를 매장에 맞게 꾸며보세요.':'흰 배경과 검정 글자를 바탕으로 메뉴를 정갈하게 보여주는 기본 디자인입니다.',
    service,kind:'standard',templateKey:design.renderer,itemLayout:design.itemLayout,categories:[],categoryLabel:'기본 디자인',
    image:`/template-previews/default-${design.id}-${standardPreviewVersions[design.id] ?? "20261021"}.jpg`,
    images:[{src:`/template-previews/default-${design.id}-${standardPreviewVersions[design.id] ?? "20261021"}.jpg`,label:"메뉴판 디자인"}],previewHref:getDefaultDesignReviewUrl(design),detailHref:`/templates/${design.id}`,
    startHref:getCatalogStartHref(service,design.renderer,design.id)};
});
// Catalog cards, detail galleries and checkout media share the same image.
const catalogImages: Readonly<Partial<Record<string, string>>> = {
  cafe_real_matcha_a: '/template-previews/cafe_real_matcha_a-desktop-20261113.jpg',
  cafe_sunday_roasters_a: '/template-previews/cafe_sunday_roasters_a-20261104.jpg',
};
const catalogGalleries: Readonly<Partial<Record<string, readonly CatalogImage[]>>> = {
  cafe_real_matcha_a: [
    { src: '/template-previews/cafe_real_matcha_a-desktop-20261113.jpg', label: '메뉴판 디자인' },
    { src: '/template-previews/cafe_real_matcha_a-mobile-qr-20261111.jpg', label: '모바일 QR 메뉴' },
    { src: '/template-previews/cafe_real_matcha_a-tablet-stand-20261111-v2.jpg', label: '태블릿 스탠드' },
  ],
  cafe_mocha_forest_a: [
    { src: '/template-previews/cafe_mocha_forest_a-mobile-20261113.jpg', label: '모바일 QR 메뉴' },
    { src: '/template-previews/cafe_mocha_forest_a-tablet-stand-20261113.png', label: '태블릿 스탠드' },
    { src: '/template-previews/cafe_mocha_forest_a-desktop-20261113.png', label: 'PC 메뉴 모니터' },
    { src: '/template-previews/cafe_mocha_forest_a-exterior-20261113-v2.jpg', label: '매장 외관' },
  ],
};
const designers: CatalogDesign[]=templateCatalog.filter(t=>t.status==='available').map(t=>{
  const service=t.service==='display'?'display':getDiningTemplateTier(t.key)==='multi'?'dining':'basic';
  const route=getTemplatePreviewRouteKey(t.key);
  const facets=getCatalogFacets(t.key,"designer");
  const categories=facets.industries?[...facets.industries]:[...t.categories];
  const images=catalogGalleries[route]??[{src:catalogImages[route]??`/template-previews/${route}.jpg`,label:"메뉴판 디자인"}];
  return {...facets,id:t.key,name:t.name,description:t.description,service,kind:'designer',templateKey:t.key,itemLayout:'list',categories,categoryLabel:getCatalogIndustryLabel(categories,t.categoryLabel),
    image:images[0].src,images,previewHref:`/templates/${route}/preview`,detailHref:`/templates/${route}`,startHref:getCatalogStartHref(service,t.key,t.key)};
});
export const catalogDesigns: readonly CatalogDesign[]=[...standards,...designers];
export function getCatalogDesign(id: unknown) {
  if(typeof id!=='string')return null;
  return catalogDesigns.find(d=>d.id===id||d.detailHref===`/templates/${id}`)??null;
}
export type CatalogFilters = {
  industry: Exclude<CatalogIndustry, "all">[];
  layout: Exclude<CatalogLayoutFilter, "all">[];
  mood: Exclude<CatalogMoodFilter, "all">[];
  color: Exclude<CatalogColorFilter, "all">[];
};
export function normalizeCatalogFilters(input: { industry?: unknown; layout?: unknown; mood?: unknown; color?: unknown }, kind: CatalogKind): CatalogFilters {
  return {
    industry: kind === "standard" ? [] : normalizeCatalogSelections(input.industry, CATALOG_INDUSTRIES),
    layout: normalizeCatalogSelections(input.layout ?? (kind === "standard" ? input.industry : undefined), CATALOG_LAYOUT_FILTERS),
    mood: kind === "standard" ? [] : normalizeCatalogSelections(input.mood, CATALOG_MOODS),
    color: kind === "standard" ? [] : normalizeCatalogSelections(input.color, CATALOG_COLORS),
  };
}
export function filterCatalogDesigns(service: CatalogService, kind: CatalogKind, filter: string | readonly string[] = 'all', layout: CatalogLayoutFilter | readonly CatalogLayoutFilter[] = 'all', facets: { mood?: CatalogMoodFilter | readonly CatalogMoodFilter[]; color?: CatalogColorFilter | readonly CatalogColorFilter[]; query?: string } = {}) {
  const search = normalizeCatalogSearch(facets.query);
  const selections = normalizeCatalogFilters({ industry: filter, layout: layout === "all" ? undefined : layout, ...facets }, service === "display" ? "designer" : kind);
  return catalogDesigns.filter(design => design.service === service && (service === 'display' || design.kind === kind))
    .filter(design => !selections.industry.length || selections.industry.some(key => CATALOG_INDUSTRIES.find(industry => industry.key === key)!.categories.some(category => design.categories.includes(category as TemplateCategoryKey))))
    .filter(design => !selections.layout.length || selections.layout.includes(design.itemLayout))
    .filter(design => !selections.mood.length || selections.mood.some(mood => design.moods.includes(mood)))
    .filter(design => !selections.color.length || selections.color.some(color => design.colors.includes(color)))
    .filter(design => !search || [design.name, ...(design.searchNames ?? [])].some(name => normalizeCatalogSearch(name).includes(search)));
}
