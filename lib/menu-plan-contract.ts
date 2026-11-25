import { getCatalogDesign, getSelectableCatalogDesign } from './catalog-designs';
import { getMenuPlanMonthlyPrice, menuPlanPricebook } from './menu-plan-pricing';
import type { MenuDesignAccess, MenuService, MenuTemplateService } from './menu-design-policy';
export const MENU_PLAN_CONTRACT_VERSION='2026-11-25';
export function getMenuPlanSelection(productKey:unknown,designId:unknown,templateKey?:unknown) {
  const service:MenuService|null=productKey==='business_basic_single_monthly'?'basic':productKey==='business_basic_multi_monthly'?'dining':null;
  const design=getCatalogDesign(designId);
  if(!service||!design||design.service!==service||(templateKey!==undefined&&design.templateKey!==templateKey))return null;
  return {version:MENU_PLAN_CONTRACT_VERSION,pricebookVersion:menuPlanPricebook.version,service,access:'all' as const,designId:design.id,templateKey:design.templateKey,
    regularAmount:getMenuPlanMonthlyPrice(service,'all','regular'),earlyBirdAmount:getMenuPlanMonthlyPrice(service,'all','earlyBird')};
}
export function getNewMenuPlanSelection(productKey: unknown, designId: unknown, templateKey?: unknown) {
  return getSelectableCatalogDesign(designId) ? getMenuPlanSelection(productKey, designId, templateKey) : null;
}

export function canSelectMenuDesign(service:MenuTemplateService,_access:MenuDesignAccess,id:unknown) {
  const design=getSelectableCatalogDesign(id);
  return !!design&&design.service===service;
}
