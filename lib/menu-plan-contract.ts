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

/** A recovery receipt describes the saved purchase, never today's catalog quote.
 * Missing legacy fields remain missing; template kind must not invent a tier.
 */
export function getRecoveredMenuPlanSnapshot(contract: {
  product_key: string; initial_design_id: string | null; amount: number;
  menu_design_access: string | null; menu_plan_version: string | null;
}) {
  const selection = getMenuPlanSelection(contract.product_key, contract.initial_design_id);
  if (!selection || !Number.isInteger(contract.amount) || contract.amount < 0) return null;
  const pricebooks: Record<string, string> = { '2026-10-21': '2026-10-19', '2026-11-25': '2026-11-25' };
  const pricebookVersion = contract.menu_plan_version && Object.hasOwn(pricebooks, contract.menu_plan_version) ? pricebooks[contract.menu_plan_version] : undefined;
  return {
    version: contract.menu_plan_version, service: selection.service,
    access: contract.menu_design_access, designId: selection.designId, templateKey: selection.templateKey,
    amount: contract.amount, recovered: true,
    ...(pricebookVersion ? { pricebookVersion } : {}),
  };
}
