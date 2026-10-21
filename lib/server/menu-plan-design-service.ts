import 'server-only';
import { getCatalogDesign } from '@/lib/catalog-designs';
import { buildMenuDesignMutation, getNeutralDesignAppearance } from '@/lib/menu-design-mutation';
import { createAdminClient } from '@/lib/supabase/admin';
import { canSelectMenuDesign } from '@/lib/menu-plan-contract';
import type { MenuDesignAccess, MenuService } from '@/lib/menu-design-policy';
import type { Json } from '@/lib/supabase/types';
type Admin=ReturnType<typeof createAdminClient>;
const record=(value:unknown):Record<string,unknown>=>value&&typeof value==='object'&&!Array.isArray(value)?{...value as Record<string,unknown>}:{};
export async function initializePurchasedMenuDesign(admin:Admin,menuId:string,id:string) {
  const design=getCatalogDesign(id);if(!design)throw new Error('구매한 디자인을 찾을 수 없습니다.');
  const {data:site,error}=await admin.from('menu_sites').select('settings,page_settings,template_key').eq('id',menuId).single();
  if(error||!site||site.template_key!==design.templateKey)throw new Error('구매한 메뉴판 디자인이 일치하지 않습니다.');
  const settings=record(site.settings);if(settings.menu_design_initialized===id)return;
  const page=record(site.page_settings);
  const update={settings:{...settings,...(design.kind==='standard'?getNeutralDesignAppearance():{}),menu_design_id:id,menu_design_initialized:id},
    ...(design.kind==='standard'?{brand_color:'#191c1b',page_settings:{...page,design:{...record(page.design),backgroundColor:'#ffffff'},cover_image_visible:false,multi_page_cover_background_color:'#ffffff'}}:{})};
  const result=await admin.from('menu_sites').update(update as {settings:Json}).eq('id',menuId);if(result.error)throw new Error('구매한 디자인 초기화에 실패했습니다.');
}
export async function getMenuPlanEntitlement(admin:Admin,menuId:string,userId:string) {
  const {data,error}=await admin.from('business_subscriptions').select('id,product_key,status,menu_design_access,menu_plan_version,current_period_end,trial_ends_at').eq('menu_site_id',menuId).eq('user_id',userId).in('status',['active','trialing']).order('created_at',{ascending:false}).limit(1).maybeSingle();
  if(error||!data)return null;
  const subscription=data as unknown as {id:string;product_key:string;status:string;menu_design_access:MenuDesignAccess|null;menu_plan_version:string|null;current_period_end:string|null;trial_ends_at:string|null};
  if(!['standard','all'].includes(subscription.menu_design_access??'')||!subscription.menu_plan_version||!['business_basic_single_monthly','business_basic_multi_monthly'].includes(subscription.product_key))return null;
  const end=subscription.trial_ends_at&&subscription.status==='trialing'?subscription.trial_ends_at:subscription.current_period_end;
  if(!end||!Number.isFinite(Date.parse(end))||Date.parse(end)<=Date.now())return null;
  const service:MenuService=subscription.product_key==='business_basic_multi_monthly'?'dining':'basic';
  return {subscriptionId:subscription.id,service,access:subscription.menu_design_access as MenuDesignAccess};
}
export async function switchContractMenuDesign(admin:Admin,userId:string,menuId:string,id:string) {
  const plan=await getMenuPlanEntitlement(admin,menuId,userId);
  if(!plan||!canSelectMenuDesign(plan.service,plan.access,id))throw new Error('현재 구독에서 이용할 수 없는 디자인입니다.');
  const design=getCatalogDesign(id)!;
  const {data:site,error}=await admin.from('menu_sites').select('id,slug,template_key,brand_color,settings,page_settings,updated_at').eq('id',menuId).eq('user_id',userId).single();
  if(error||!site)throw new Error('메뉴판을 찾을 수 없습니다.');
  const settings=record(site.settings),previous=String(settings.menu_design_id??site.template_key);
  if(previous===id)return site;
  const mutation=buildMenuDesignMutation({settings:site.settings,pageSettings:site.page_settings,templateKey:site.template_key??'',brandColor:site.brand_color,targetId:id});
  const result=await admin.from('menu_sites').update({template_key:design.templateKey,template_category:design.categories[0]??(plan.service==='dining'?'fine_dining':'cafe'),brand_color:mutation.brandColor,settings:mutation.settings as Json,page_settings:mutation.pageSettings as Json,updated_at:new Date().toISOString()}).eq('id',menuId).eq('user_id',userId).eq('updated_at',site.updated_at).select('id').maybeSingle();
  if(result.error||!result.data)throw new Error('다른 변경이 진행 중입니다. 새로고침 후 다시 시도해 주세요.');
  return site;
}
