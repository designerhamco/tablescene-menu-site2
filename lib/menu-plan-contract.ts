import { getCatalogDesign } from './catalog-designs';
import { getMenuPlanMonthlyPrice, menuPlanPricebook } from './menu-plan-pricing';
import type { MenuDesignAccess, MenuService } from './menu-design-policy';
export const MENU_PLAN_CONTRACT_VERSION='2026-10-21';
export function getMenuPlanSelection(productKey:unknown,designId:unknown,templateKey?:unknown) {
  const service:MenuService|null=productKey==='business_basic_single_monthly'?'basic':productKey==='business_basic_multi_monthly'?'dining':null;
  const design=getCatalogDesign(designId);
  if(!service||!design||design.service!==service||(templateKey!==undefined&&design.templateKey!==templateKey))return null;
  return {version:MENU_PLAN_CONTRACT_VERSION,pricebookVersion:menuPlanPricebook.version,service,access:(design.kind==='standard'?'standard':'all') as MenuDesignAccess,designId:design.id,templateKey:design.templateKey,
    regularAmount:getMenuPlanMonthlyPrice(service,design.kind==='standard'?'standard':'all','regular'),earlyBirdAmount:getMenuPlanMonthlyPrice(service,design.kind==='standard'?'standard':'all','earlyBird')};
}
export function canSelectMenuDesign(service:MenuService,access:MenuDesignAccess,id:unknown) {
  const design=getCatalogDesign(id);
  return !!design&&design.service===service&&(access==='all'||design.kind==='standard');
}
