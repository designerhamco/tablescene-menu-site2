import { getCatalogDesign, catalogDesigns } from './catalog-designs';
import { getMenuPlanMonthlyPrice, menuPlanPricebook } from './menu-plan-pricing';
import { MENU_PLAN_CONTRACT_VERSION, canSelectMenuDesign } from './menu-plan-contract';
import { isOpenDiscountPeriod } from './promotion-policy';
import type { MenuDesignAccess, MenuService } from './menu-design-policy';

export type PlanChangeSubscription = {
  id:string; user_id:string; menu_site_id:string|null; product_key:string; plan_type:string;
  billing_cycle:string; status:string; amount:number; currency:string; next_billing_at:string|null;
  cancel_at_period_end:boolean|null; billing_key_ref:string|null;
  menu_design_access:MenuDesignAccess|null; menu_plan_version:string|null;
};
export type PlanChangeSite = {id:string;user_id:string;template_key:string;settings:unknown};
export type MenuPlanChangeQuote = {
  productKey:string; service:MenuService; access:MenuDesignAccess; designId:string;
  amount:number; currency:'KRW'; billingCycle:'monthly'; effectiveAt:string;
  contractVersion:string; pricebookVersion:string; offer:'earlyBird'|'regular';
};
export function getPlanChangeService(site:PlanChangeSite):MenuService|null {
  const design=getCatalogDesign(site.template_key);
  return design?.service==='basic'||design?.service==='dining'?design.service:null;
}
export function planChangeEligibility(subscription:PlanChangeSubscription,site:PlanChangeSite,now=new Date()) {
  if(subscription.user_id!==site.user_id||subscription.menu_site_id!==site.id)return '연결된 메뉴판을 확인할 수 없습니다.';
  if(!getPlanChangeService(site)||subscription.plan_type!=='business_basic')return '이 서비스는 이용권 변경 대상이 아닙니다.';
  if(subscription.status!=='active'||subscription.cancel_at_period_end)return '이용 중이며 해지 예약이 없는 구독에서 변경할 수 있습니다.';
  if(!subscription.billing_key_ref||subscription.currency!=='KRW')return '결제수단과 통화를 먼저 확인해 주세요.';
  if(!subscription.next_billing_at||!Number.isFinite(Date.parse(subscription.next_billing_at))||Date.parse(subscription.next_billing_at)<=now.getTime())return '결제 처리 중에는 변경을 예약할 수 없습니다.';
  return null;
}
export function quoteMenuPlanChange(subscription:PlanChangeSubscription,site:PlanChangeSite,access:unknown,designId:unknown,now=new Date()):MenuPlanChangeQuote {
  const reason=planChangeEligibility(subscription,site,now);if(reason)throw new Error(reason);
  const service=getPlanChangeService(site)!;
  if((access!=='standard'&&access!=='all')||!canSelectMenuDesign(service,access,designId))throw new Error('선택한 이용권에서 사용할 디자인을 확인해 주세요.');
  // An unbroken new-plan early-bird contract retains its offer when changing access.
  const retainedEarlyBird=subscription.menu_plan_version&&subscription.menu_design_access&&subscription.amount===getMenuPlanMonthlyPrice(service,subscription.menu_design_access,'earlyBird');
  const offer=isOpenDiscountPeriod(now)||retainedEarlyBird?'earlyBird':'regular';
  return {productKey:service==='basic'?'business_basic_single_monthly':'business_basic_multi_monthly',service,access,designId:String(designId),amount:getMenuPlanMonthlyPrice(service,access,offer),currency:'KRW',billingCycle:'monthly',effectiveAt:subscription.next_billing_at!,contractVersion:MENU_PLAN_CONTRACT_VERSION,pricebookVersion:menuPlanPricebook.version,offer};
}
export function planChangeDesignChoices(service:MenuService) {return catalogDesigns.filter(d=>d.service===service).map(d=>({id:d.id,name:d.name,kind:d.kind,previewHref:d.previewHref}));}
export function matchesPlanChangeConsent(quote:MenuPlanChangeQuote,consent:unknown) {
  if(!consent||typeof consent!=='object'||Array.isArray(consent))return false;
  const input=consent as Record<string,unknown>;
  return input.productKey===quote.productKey&&input.service===quote.service&&input.access===quote.access&&input.designId===quote.designId&&input.currency===quote.currency&&input.offer===quote.offer&&input.amount===quote.amount&&input.effectiveAt===quote.effectiveAt&&input.contractVersion===quote.contractVersion&&input.pricebookVersion===quote.pricebookVersion&&input.billingCycle===quote.billingCycle;
}
