import { getDiningTemplateFeatures, getDiningTemplateTier } from '@/lib/dining-product-tiers';
import { templateSubscriptionPricing } from '@/lib/template-subscription-pricing';
import { getTemplatePreviewRouteKey, resolveTemplatePreviewRouteKey, templateCatalog, type TemplateCatalogItem } from '@/lib/templates';
import { getCatalogDesign, getCatalogPricing } from './catalog-designs';
export type PublicTemplateDetail = Omit<TemplateCatalogItem, "key" | "categoryLabel" | "name" | "description"> & {key:string;categoryLabel:string;name:string;description:string};
export function getPublicTemplateDetail(routeKey:string) {
  const design=getCatalogDesign(routeKey);
  if(design?.kind==='standard') {
    const base=templateCatalog.find(t=>t.key===design.templateKey&&t.status==='available');
    return base?{...base,key:design.id,name:design.name,description:design.description,categoryLabel:'기본 디자인'}:null;
  }
  const key=resolveTemplatePreviewRouteKey(routeKey);
  return templateCatalog.find(t=>t.key===key&&t.status==='available')??null;
}
export function getTemplateDetailHref(templateKey:string) {
  return getCatalogDesign(templateKey)?.detailHref??`/templates/${getTemplatePreviewRouteKey(templateKey)}`;
}
export function getTemplateDetailInfo(template:PublicTemplateDetail) {
  const design=getCatalogDesign(template.key);
  const display=template.service==='display';
  const multiPage=design?design.service==='dining':!display&&getDiningTemplateTier(template.key)==='multi';
  const features=getDiningTemplateFeatures(design?.templateKey??template.key);
  const pricing=display?templateSubscriptionPricing.display:getCatalogPricing(multiPage?'dining':'basic',design?.kind??'designer');
  const productKey=display?'business_display_monthly':multiPage?'business_basic_multi_monthly':'business_basic_single_monthly';
  return {display,multiPage,features,pricing,serviceLabel:display?'디스플레이':multiPage?'다이닝':'베이직',
    formatLabel:design?.kind==='standard'?'기본 디자인':display?'TV·모니터 메뉴판':multiPage?'멀티페이지 메뉴판':'원페이지 메뉴판',
    previewHref:design?.previewHref??`${getTemplateDetailHref(template.key)}/preview`,
    startHref:design?.startHref??(display?`/apply/display?template=${template.key}`:`/apply/basic?product=${productKey}&template=${template.key}`),
    listHref:display?'/templates?plan=display':`/templates?plan=${multiPage?'dining':'basic'}&category=${design?.kind??'designer'}`,
    image:design?.image??`/template-previews/${getTemplatePreviewRouteKey(template.key)}.jpg`};
}
