// Actual design services/API + approved DB guard, isolated from Production.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const {PGlite}=await import(process.env.PGLITE_TEST_MODULE||'/private/tmp/artimenu-order-db-test/node_modules/@electric-sql/pglite/dist/index.js');
const db=new PGlite(), q=async(sql,args=[])=>(await db.query(sql,args)).rows;
const copy=value=>JSON.parse(JSON.stringify(value));
let checks=0;const check=(actual,expected)=>{assert.deepEqual(actual,expected);checks++;};
const rejected=async(fn,pattern)=>{await assert.rejects(fn,pattern);checks++;};
try {
 await db.exec(`create role anon;create role authenticated;create role service_role;
 create schema auth;create function auth.role() returns text language sql as $$select coalesce(current_setting('request.jwt.claim.role',true),'service_role')$$;
 create table menu_sites(id uuid primary key,user_id uuid,slug text,name text,description text,template_key text,template_category text,brand_color text,settings jsonb default '{}',page_settings jsonb default '{}',updated_at timestamptz default date_trunc('milliseconds',clock_timestamp()));
 create table business_subscriptions(id uuid primary key,menu_site_id uuid,user_id uuid,product_key text,status text,amount integer,created_at timestamptz default now(),current_period_end timestamptz,trial_ends_at timestamptz);
 create table menu_categories(id uuid primary key,menu_site_id uuid,name text);
 create table menu_items(id uuid primary key,menu_site_id uuid,category_id uuid,name text,price integer,image_url text);
 create table menu_tables(id uuid primary key,menu_site_id uuid,qr_public_id uuid);
 create table menu_customer_orders(id uuid primary key,menu_site_id uuid,total_amount integer);
 create table payments(id uuid primary key,amount integer);`);
 await db.exec(await fs.readFile(new URL('../supabase/migrations/20261021122057_add_menu_design_subscription_contract.sql',import.meta.url),'utf8'));
 const bundle='/private/tmp/customer-design-journey-services.mjs';
 await build({stdin:{contents:`export * from './lib/server/menu-plan-design-service.ts';export * from './lib/menu-plan-contract.ts';export * from './lib/catalog-designs.ts';export * from './lib/menu-design-surfaces.ts';export * from './lib/promotions.ts';export * as api from './app/api/menu-design/route.ts';`,resolveDir:process.cwd()},outfile:bundle,bundle:true,platform:'node',format:'esm',tsconfig:'tsconfig.json',logLevel:'silent',plugins:[{name:'isolated-journey-adapters',setup(b){
  b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'qa-empty'}));b.onLoad({filter:/.*/,namespace:'qa-empty'},()=>({contents:'export {};'}));
  b.onResolve({filter:/^next\/server$/},()=>({path:process.cwd()+'/node_modules/next/server.js',external:true}));
  b.onResolve({filter:/^next\/cache$/},()=>({path:'cache',namespace:'qa-cache'}));b.onLoad({filter:/.*/,namespace:'qa-cache'},()=>({contents:'export const revalidatePath=(path)=>globalThis.__designJourneyInvalidations.push(path);'}));
  b.onResolve({filter:/supabase\/admin$/},()=>({path:'admin',namespace:'qa-admin'}));b.onLoad({filter:/.*/,namespace:'qa-admin'},()=>({contents:'export const createAdminClient=()=>globalThis.__designJourneyAdmin;'}));
  b.onResolve({filter:/supabase\/server$/},()=>({path:'server',namespace:'qa-auth'}));b.onLoad({filter:/.*/,namespace:'qa-auth'},()=>({contents:'export const createClient=async()=>({auth:{getUser:async()=>({data:{user:globalThis.__designJourneyUser}})}});'}));
 }}]});
 const service=await import(pathToFileURL(bundle).href),owner=crypto.randomUUID(),stranger=crypto.randomUUID();
 const ident=value=>{assert.match(value,/^[a-z_]+$/);return value;};
 let beforeUpdate=null;
 const writes=[];
 const admin={from(table){assert.ok(['menu_sites','business_subscriptions'].includes(table));let fields='*',updates=null,filters=[],values=[],sort='',limit='';
  const chain={select(value){fields=value;return chain;},eq(key,value){values.push(value);filters.push(`${ident(key)}=$${values.length}`);return chain;},in(key,list){values.push(list);filters.push(`${ident(key)}=any($${values.length}::text[])`);return chain;},order(key,{ascending}){sort=` order by ${ident(key)} ${ascending?'asc':'desc'}`;return chain;},limit(n){assert.ok(Number.isSafeInteger(n)&&n>0);limit=` limit ${n}`;return chain;},update(value){updates=value;return chain;},async maybeSingle(){const result=await execute();return {...result,data:result.data?.[0]??null};},single(){return chain.maybeSingle();},then(ok,bad){return execute().then(ok,bad);}};
  async function execute(){try{if(updates&&beforeUpdate){const hook=beforeUpdate;beforeUpdate=null;await hook();}
   let rows;if(updates){assert.equal(table,'menu_sites');writes.push(Object.keys(updates).sort());const params=[...values];const set=Object.entries(updates).map(([key,value])=>{params.push(value);return `${ident(key)}=$${params.length}`;});rows=await q(`update ${table} set ${set.join(',')} where ${filters.join(' and ')} returning *`,params);}
   else rows=await q(`select ${fields.split(',').map(v=>v==='*'?v:ident(v)).join(',')} from ${table}${filters.length?' where '+filters.join(' and '):''}${sort}${limit}`,values);
   return {data:copy(rows),error:null};}catch(error){return {data:null,error:{message:error.message}};}}
  return chain;
 }};
 globalThis.__designJourneyAdmin=admin;globalThis.__designJourneyUser={id:owner,app_metadata:{}};globalThis.__designJourneyInvalidations=[];
 const offers=[['business_basic_single_monthly','basic-first-column',4900,'standard'],['business_basic_single_monthly','cafe_mocha_forest_a',6800,'all'],['business_basic_multi_monthly','dining-full-page',6900,'standard'],['business_basic_multi_monthly','dining_aube_table_b',8800,'all']];
 const fixtures=[];
 for(const [product,id,amount,access] of offers){
  const design=service.getCatalogDesign(id),selection=service.getMenuPlanSelection(product,id,design.templateKey);
  check(selection.access,access);check(selection.earlyBirdAmount,amount);
  const promotion=service.getOpenPromotionSnapshot(product,new Date('2026-10-22T00:00:00Z'),id);check(service.getPromotionAwareChargeAmount(product,promotion,id),amount);
  const menu=crypto.randomUUID(),sub=crypto.randomUUID(),category=crypto.randomUUID();
  const settings={enabled_locales:['ko','en'],advertisementPopup:{enabled:true,images:['/customer-ad.jpg']},table_order:{orderEnabled:true,postpayEnabled:true},widgets:[{id:'customer-widget',imageUrl:'/customer-widget.jpg'}]};
  const page={menu_cover_enabled:true,cover_image_visible:true,multi_page_cover_background_opacity:52,customerPhoto:'/customer-cover.jpg',design:{appearance:{imageRadii:{item:12},chipShape:'soft'}}};
  await q('insert into menu_sites(id,user_id,slug,name,description,template_key,template_category,settings,page_settings) values($1,$2,$3,$4,$5,$6,$7,$8,$9)',[menu,owner,'journey-'+menu,'고객 매장','고객 가게 설명',design.templateKey,design.categories[0],settings,page]);
  await q("insert into business_subscriptions(id,menu_site_id,user_id,product_key,status,amount,current_period_end,menu_design_access,menu_plan_version,initial_design_id) values($1,$2,$3,$4,'active',$5,now()+interval '30 days',$6,'2026-10-21',$7)",[sub,menu,owner,product,amount,access,id]);
  await q("insert into menu_categories values($1,$2,'고객 카테고리')",[category,menu]);
  for(let n=0;n<2;n++)await q("insert into menu_items values($1,$2,$3,$4,$5,'/customer-photo.jpg')",[crypto.randomUUID(),menu,category,'고객 메뉴 '+n,5000+n*1000]);
  await q('insert into menu_tables values($1,$2,$3)',[crypto.randomUUID(),menu,crypto.randomUUID()]);await q('insert into menu_customer_orders values($1,$2,12500)',[crypto.randomUUID(),menu]);
  await service.initializePurchasedMenuDesign(admin,menu,id);let site=(await q('select * from menu_sites where id=$1',[menu]))[0];
  check(site.settings.menu_design_id,id);check(site.settings.menu_design_initialized,id);check(site.settings.enabled_locales,settings.enabled_locales);check(site.settings.table_order,settings.table_order);check(site.page_settings.customerPhoto,page.customerPhoto);
  fixtures.push({menu,sub,id,access,service:design.service});
 }
 const preservedTables=['business_subscriptions','menu_categories','menu_items','menu_tables','menu_customer_orders','payments'];
 const fingerprint=async()=>{const rows={};for(const table of preservedTables)rows[table]=copy(await q(`select * from ${table} order by id`));return rows;};
 const before=await fingerprint();
 for(const f of fixtures){
  let site=(await q('select * from menu_sites where id=$1',[f.menu]))[0];
  const values=f.service==='basic'?{pageBackground:'#FCFAF0',auxiliaryBackground:'#DECAB0',representativeAlignment:'right'}:{pageBackground:'#FCFAF0',coverBackground:'#203040',sidebarBackground:'#CCBBAA',coverDescriptionColor:'#FFF0D0'};
  const edited=service.withMenuSurfaceSettings(site.page_settings,site.settings,site.template_key,values);
  await q('update menu_sites set page_settings=$1 where id=$2',[edited,f.menu]);
  // Replayed initialization must not replace customer edits.
  await service.initializePurchasedMenuDesign(admin,f.menu,f.id);check((await q('select page_settings from menu_sites where id=$1',[f.menu]))[0].page_settings,edited);
  const target=f.service==='basic'?'basic-center-column':'dining-full-page-album';
  await service.switchContractMenuDesign(admin,owner,f.menu,target);site=(await q('select * from menu_sites where id=$1',[f.menu]))[0];check(site.settings.menu_design_id,target);
  await service.switchContractMenuDesign(admin,owner,f.menu,f.id);site=(await q('select * from menu_sites where id=$1',[f.menu]))[0];check(site.page_settings,edited);
  check(site.name,'고객 매장');check(site.description,'고객 가게 설명');check(site.slug,'journey-'+f.menu);
  check(site.settings.advertisementPopup,{enabled:true,images:['/customer-ad.jpg']});check(site.settings.widgets,[{id:'customer-widget',imageUrl:'/customer-widget.jpg'}]);
  await rejected(()=>service.switchContractMenuDesign(admin,stranger,f.menu,target),/이용할 수 없는/);
  await rejected(()=>service.switchContractMenuDesign(admin,owner,f.menu,f.service==='basic'?'dining-full-page':'basic-first-column'),/이용할 수 없는/);
  if(f.access==='standard')await rejected(()=>service.switchContractMenuDesign(admin,owner,f.menu,f.service==='basic'?'cafe_mocha_forest_a':'dining_aube_table_a'),/이용할 수 없는/);
 }
 check(await fingerprint(),before);
 const f=fixtures[0],saved=(await q('select settings,page_settings from menu_sites where id=$1',[f.menu]))[0];
 beforeUpdate=()=>q("update menu_sites set description='동시에 편집한 고객 설명',updated_at=date_trunc('milliseconds',clock_timestamp())+interval '1 second' where id=$1",[f.menu]);
 await rejected(()=>service.switchContractMenuDesign(admin,owner,f.menu,'basic-top-row'),/다른 변경/);
 check((await q('select description from menu_sites where id=$1',[f.menu]))[0].description,'동시에 편집한 고객 설명');check((await q('select settings,page_settings from menu_sites where id=$1',[f.menu]))[0],saved);
 await db.exec("set request.jwt.claim.role='authenticated'");
 await rejected(()=>q("update menu_sites set template_key='cafe_mocha_forest_a',settings=settings||'{\"menu_design_id\":\"cafe_mocha_forest_a\"}' where id=$1",[f.menu]),/outside the subscribed/);
 await rejected(()=>q("update menu_sites set template_key='dining_aube_table_a',settings=settings||'{\"menu_design_id\":\"dining-full-page\"}' where id=$1",[f.menu]),/subscribed service/);
 await db.exec("set request.jwt.claim.role='service_role'");
 const patch=(menu=f.menu,id='basic-top-row',origin='https://menu.test')=>new Request('https://menu.test/api/menu-design',{method:'PATCH',headers:{origin,'content-type':'application/json'},body:JSON.stringify({menuId:menu,designId:id})});
 check((await service.api.PATCH(patch(f.menu,'basic-top-row','https://outside.test'))).status,403);
 globalThis.__designJourneyUser=null;check((await service.api.PATCH(patch())).status,401);
 globalThis.__designJourneyUser={id:stranger,app_metadata:{}};check((await service.api.PATCH(patch())).status,409);
 globalThis.__designJourneyUser={id:owner,app_metadata:{}};check((await service.api.PATCH(patch())).status,200);
 check(globalThis.__designJourneyInvalidations,[`/mypage/menus/${f.menu}/edit`,`/mypage/menus/${f.menu}/preview`,`/menu/journey-${f.menu}`]);
 check((await service.api.PATCH(patch(f.menu,'cafe_mocha_forest_a'))).status,409);check((await service.api.PATCH(patch(f.menu,'dining-full-page'))).status,409);
 for(const change of ["status='canceled'","current_period_end=now()-interval '1 day'","menu_design_access=null"]){
  await q(`update business_subscriptions set ${change} where id=$1`,[f.sub]);await rejected(()=>service.switchContractMenuDesign(admin,owner,f.menu,'basic-first-column'),/이용할 수 없는/);await q("update business_subscriptions set status='active',current_period_end=now()+interval '30 days',menu_design_access='standard' where id=$1",[f.sub]);
 }
 assert.ok(writes.every(keys=>keys.every(key=>['template_key','template_category','brand_color','settings','page_settings','updated_at'].includes(key))));checks++;
 console.log(JSON.stringify({passed:checks,actualDesignServices:true,actualDesignApi:true,approvedDatabaseGuard:true,checkoutQuotes:4,isolatedDatabase:true,productionWrites:0,realPayments:0}));
}finally{await db.close();}
