import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';
import { buildMenuDesignMutation } from '@/lib/menu-design-mutation';
import { getCatalogDesign } from '@/lib/catalog-designs';
import { planChangeEligibility, getPlanChangeService, quoteMenuPlanChange, planChangeDesignChoices, matchesPlanChangeConsent, type PlanChangeSubscription, type PlanChangeSite } from '@/lib/menu-plan-change-policy';
import { payWithBillingKey, getPortOnePaymentAmountSummary } from '@/lib/portone-billing';
import type { Json } from '@/lib/supabase/types';

type Admin=ReturnType<typeof createAdminClient>;
export type MenuPlanChange = {id:string;subscription_id:string;user_id:string;menu_site_id:string;state:'pending'|'processing'|'applied'|'cancelled';effective_at:string;target_product_key:string;target_access:'standard'|'all';target_design_id:string;target_amount:number;contract_version:string;pricebook_version:string;payment_id:string|null;period_end:string|null};
export function menuPlanChangeLedgerReady() {return process.env.MENU_PLAN_CHANGE_LEDGER_READY==='true';}
export function menuPlanChangeRenewalsEnabled() {return process.env.ENABLE_MENU_PLAN_CHANGE_RENEWALS==='true';}
export function menuPlanChangesEnabled() {return menuPlanChangeLedgerReady()&&menuPlanChangeRenewalsEnabled()&&process.env.ENABLE_MENU_PLAN_CHANGES==='true';}
export class MenuPlanChangeError extends Error {constructor(message:string,public status=409){super(message);}}
async function subscriptionAndSite(admin:Admin,id:string,user:string) {
  const {data:subscription,error}=await admin.from('business_subscriptions').select('*').eq('id',id).eq('user_id',user).maybeSingle();
  if(error||!subscription)throw new MenuPlanChangeError('구독을 찾을 수 없습니다.',404);
  const s=subscription as unknown as PlanChangeSubscription;
  if(!s.menu_site_id)throw new MenuPlanChangeError('연결된 메뉴판을 찾을 수 없습니다.',404);
  const {data:site,error:siteError}=await admin.from('menu_sites').select('id,user_id,template_key,settings').eq('id',s.menu_site_id).eq('user_id',user).maybeSingle();
  if(siteError||!site)throw new MenuPlanChangeError('메뉴판을 찾을 수 없습니다.',404);
  return {subscription:s,site:site as PlanChangeSite};
}
async function liveChange(admin:Admin,id:string,user?:string) {
  let query=admin.from('menu_plan_changes' as never).select('*').eq('subscription_id' as never,id as never).in('state' as never,['pending','processing'] as never);
  if(user)query=query.eq('user_id' as never,user as never);
  const {data,error}=await query.maybeSingle();
  if(error)throw new MenuPlanChangeError('변경 예약을 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.',503);
  return data as unknown as MenuPlanChange|null;
}
export async function getMenuPlanChangeDetail(admin:Admin,id:string,user:string) {
  const {subscription,site}=await subscriptionAndSite(admin,id,user);
  const pending=await liveChange(admin,id,user),reason=planChangeEligibility(subscription,site),service=getPlanChangeService(site);
  const options=service?planChangeDesignChoices(service):[];
  const first=options.find(d=>d.kind==='standard');
  const quotes=!reason&&first?(['standard','all'] as const).map(access=>quoteMenuPlanChange(subscription,site,access,first.id)):[];
  return {eligible:!reason,reason,service,currentAmount:subscription.amount,currentBillingCycle:subscription.billing_cycle,effectiveAt:subscription.next_billing_at,options,quotes,pending:pending?{id:pending.id,state:pending.state,canCancel:pending.state==='pending'&&Date.parse(pending.effective_at)>Date.now(),access:pending.target_access,designId:pending.target_design_id,amount:pending.target_amount,effectiveAt:pending.effective_at}:null};
}
export async function reserveMenuPlanChange(admin:Admin,id:string,user:string,body:Record<string,unknown>) {
  const {subscription,site}=await subscriptionAndSite(admin,id,user);
  let quote;try{quote=quoteMenuPlanChange(subscription,site,body.access,body.designId);}catch(error){throw new MenuPlanChangeError(error instanceof Error?error.message:"이용권 선택을 확인해 주세요.",400);}
  if(!matchesPlanChangeConsent(quote,body.consent))throw new MenuPlanChangeError('적용일 또는 요금이 변경되었습니다. 새 안내를 확인한 뒤 다시 신청해 주세요.');
  const {error}=await admin.rpc('reserve_menu_plan_change' as never,{p_subscription:id,p_user:user,p_expected_billing:quote.effectiveAt,p_product:quote.productKey,p_access:quote.access,p_design:quote.designId,p_amount:quote.amount,p_contract_version:quote.contractVersion,p_pricebook_version:quote.pricebookVersion} as never);
  if(error)throw new MenuPlanChangeError(error.message.includes('CHANGE_PROCESSING')?'결제 처리 중에는 변경 예약을 수정할 수 없습니다.':'구독 상태가 변경되었습니다. 새로고침 후 다시 확인해 주세요.');
  return getMenuPlanChangeDetail(admin,id,user);
}
export async function cancelMenuPlanChange(admin:Admin,id:string,user:string,change:unknown) {
  if(typeof change!=='string'||!/^[0-9a-f-]{36}$/i.test(change))throw new MenuPlanChangeError('변경 예약을 확인해 주세요.',400);
  const {data,error}=await admin.rpc('cancel_menu_plan_change' as never,{p_subscription:id,p_user:user,p_change:change} as never);
  if(error||data!==true)throw new MenuPlanChangeError('결제 처리 전까지만 예약을 취소할 수 있습니다. 새로고침 후 확인해 주세요.');
  return getMenuPlanChangeDetail(admin,id,user);
}

/** Null means no opt-in reservation: the existing renewal path remains unchanged. */
export async function processMenuPlanChangeRenewal(admin:Admin,id:string,dryRun:boolean) {
  const pending=await liveChange(admin,id);if(!pending)return null;
  const {data:raw,error:readError}=await admin.from('business_subscriptions').select('cancel_at_period_end,next_billing_at,status').eq('id',id).single();
  if(readError)throw new MenuPlanChangeError('구독 갱신 상태를 확인하지 못했습니다.',503);
  if(raw.cancel_at_period_end)return null;
  if(raw.status!=='active'||Date.parse(pending.effective_at)>Date.now())return null;
  if(dryRun)return {subscriptionId:id,productKey:pending.target_product_key,action:'would_charge' as const,amount:pending.target_amount,nextBillingAt:pending.effective_at,paymentId:pending.payment_id??undefined};
  const {data,error}=await admin.rpc('claim_menu_plan_change' as never,{p_subscription:id} as never);
  if(error)throw new MenuPlanChangeError('변경 예약을 결제 처리 상태로 전환하지 못했습니다.',503);
  if(!data)return null;
  const claimed=data as unknown as {change:MenuPlanChange;subscription:PlanChangeSubscription};
  const change=claimed.change,subscription=claimed.subscription;
  if(!change.payment_id||!change.period_end||!subscription.billing_key_ref)throw new Error('PLAN_CHANGE_PAYMENT_INVARIANT');
  const design=getCatalogDesign(change.target_design_id);if(!design)throw new Error('RESERVED_DESIGN_MISSING');
  // The existing adapter rechecks PAID + exact ID/amount after duplicate/network errors.
  // Every retry uses this DB-frozen payment ID, never a new charge ID.
  const payment=await payWithBillingKey({paymentId:change.payment_id,billingKey:subscription.billing_key_ref,orderName:'아티메뉴 이용권 변경 월결제',amount:change.target_amount,customer:{id:subscription.user_id}});
  if((getPortOnePaymentAmountSummary(payment.rawPayment).cancelled??0)>0)throw new Error('PLAN_CHANGE_PAYMENT_CANCELLED_REQUIRES_REVIEW');
  for(let attempt=0;attempt<3;attempt++) {
    const {data:site,error:siteError}=await admin.from('menu_sites').select('id,user_id,slug,template_key,settings,page_settings,brand_color,updated_at').eq('id',change.menu_site_id).eq('user_id',change.user_id).single();
    if(siteError||!site)throw new Error('PAID_PLAN_CHANGE_MENU_MISSING');
    const mutation=buildMenuDesignMutation({settings:site.settings,pageSettings:site.page_settings,templateKey:site.template_key,brandColor:site.brand_color,targetId:change.target_design_id});
    const applied=await admin.rpc('apply_paid_menu_plan_change' as never,{p_change:change.id,p_payment_id:change.payment_id,p_amount:change.target_amount,p_menu_updated_at:site.updated_at,p_template:design.templateKey,p_category:design.categories[0]??(design.service==='dining'?'fine_dining':'cafe'),p_settings:mutation.settings as Json,p_page_settings:mutation.pageSettings as Json,p_brand_color:mutation.brandColor,p_payment:payment.rawPayment as Json} as never);
    if(!applied.error)return {subscriptionId:id,productKey:change.target_product_key,action:'charged' as const,amount:change.target_amount,nextBillingAt:change.period_end,paymentId:change.payment_id,menuId:site.id,slug:site.slug};
    if(!applied.error.message.includes('MENU_EDIT_CONFLICT'))throw new Error('PAID_PLAN_CHANGE_RECONCILIATION_REQUIRED');
  }
  throw new Error('PAID_PLAN_CHANGE_MENU_EDIT_CONFLICT');
}
