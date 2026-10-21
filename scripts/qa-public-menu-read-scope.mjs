// Public read identity regression. No real credentials, network or data writes.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
const prefix=await fs.mkdtemp('/private/tmp/public-menu-read-scope-');
let checks=0;const check=(a,b)=>{assert.deepEqual(a,b);checks++;};
const empty={name:'empty-server-only',setup(b){b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'qa-empty'}));b.onLoad({filter:/.*/,namespace:'qa-empty'},()=>({contents:'export {};'}));}};
try{
 // The actual factory sends only the publishable key, with no stored user session.
 const factoryPath=prefix+'/factory.mjs',savedFetch=globalThis.fetch;
 const prior={url:process.env.NEXT_PUBLIC_SUPABASE_URL,key:process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY};
 process.env.NEXT_PUBLIC_SUPABASE_URL='https://public-read-qa.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='qa-public-key';
 await build({entryPoints:['lib/supabase/public-read.ts'],outfile:factoryPath,bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[empty,{name:'sdk-external',setup(b){b.onResolve({filter:/^@supabase\/supabase-js$/},()=>({path:process.cwd()+'/node_modules/@supabase/supabase-js/dist/index.mjs',external:true}));}}]});
 const calls=[];globalThis.fetch=async(input,init)=>{const req=new Request(input,init);calls.push({authorization:req.headers.get('authorization'),cookie:req.headers.get('cookie'),apikey:req.headers.get('apikey')});return new Response(JSON.stringify([{id:'published'}]),{status:200,headers:{'content-type':'application/json'}});};
 try{const factory=await import(pathToFileURL(factoryPath).href);const client=factory.createPublicReadClient();check((await client.auth.getSession()).data.session,null);check((await client.from('menu_sites').select('id')).data,[{id:'published'}]);check(calls,[{authorization:'Bearer qa-public-key',cookie:null,apikey:'qa-public-key'}]);}finally{globalThis.fetch=savedFetch;for(const[k,v]of [['NEXT_PUBLIC_SUPABASE_URL',prior.url],['NEXT_PUBLIC_SUPABASE_ANON_KEY',prior.key]])if(v===undefined)delete process.env[k];else process.env[k]=v;}
 const sites=[{id:'published',user_id:'owner',slug:'published',name:'공개 매장',status:'published',template_key:'cafe_design_a',settings:{enabled_locales:['ko']},page_settings:{}},{id:'draft',user_id:'owner',slug:'draft',name:'비공개 매장',status:'draft',template_key:'cafe_design_a',settings:{},page_settings:{}},{id:'expired',user_id:'owner',slug:'expired',name:'만료 매장',status:'published',template_key:'cafe_design_a',settings:{},page_settings:{}}];
 const rows={menu_sites:sites,menu_pages:[{id:'page',menu_site_id:'published',title:'메뉴',visible:true,sort_order:0}],menu_categories:[{id:'category',menu_page_id:'page',menu_site_id:'published',name:'커피',visible:true,sort_order:0}],menu_items:[{id:'item',menu_site_id:'published',category_id:'category',name:'공개 라떼',price:5000,visible:true,traits_visible:false,sort_order:0},{id:'hidden',menu_site_id:'published',category_id:'category',name:'숨긴 상품',price:9000,visible:false,sort_order:1}]};
 let actor='anonymous',privateReads=0,publicReads=0;
 function db(scope){return {from(table){let filters=[];const chain={select(){return chain;},eq(key,value){filters.push(row=>row[key]===value);return chain;},in(key,values){filters.push(row=>values.includes(row[key]));return chain;},order(){return chain;},limit(){return chain;},or(){return chain;},is(){return chain;},gte(){return chain;},lte(){return chain;},gt(){return chain;},lt(){return chain;},neq(){return chain;},async maybeSingle(){return {data:read()[0]??null,error:null};},single(){return chain.maybeSingle();},then(ok,bad){return Promise.resolve({data:read(),error:null}).then(ok,bad);}};function read(){const data=(rows[table]||[]).filter(row=>filters.every(fn=>fn(row)));if(table==='menu_sites'&&scope==='account')return data.filter(row=>row.user_id===actor);return data;}return chain;}};}
 globalThis.__publicMenuScopeQa={publicClient(){publicReads++;return db('public');},accountClient(){privateReads++;return db('account');},access:async({menuSiteId})=>({canViewPublic:menuSiteId!=='expired'})};
 const loaderPath=prefix+'/loader.mjs';
 await build({entryPoints:['lib/menu-page-data.ts'],outfile:loaderPath,bundle:true,platform:'node',format:'esm',tsconfig:'tsconfig.json',logLevel:'silent',plugins:[empty,{name:'scope-adapters',setup(b){
  b.onResolve({filter:/supabase\/server$/},()=>({path:'account',namespace:'qa-account'}));b.onLoad({filter:/.*/,namespace:'qa-account'},()=>({contents:'export const createClient=async()=>globalThis.__publicMenuScopeQa.accountClient();'}));
  b.onResolve({filter:/supabase\/public-read$/},()=>({path:'public',namespace:'qa-public'}));b.onLoad({filter:/.*/,namespace:'qa-public'},()=>({contents:'export const createPublicReadClient=()=>globalThis.__publicMenuScopeQa.publicClient();'}));
  b.onResolve({filter:/supabase\/admin$/},()=>({path:'admin',namespace:'qa-admin'}));b.onLoad({filter:/.*/,namespace:'qa-admin'},()=>({contents:'export const createAdminClient=()=>{throw Error("No privileged reads in public loader")};'}));
  b.onResolve({filter:/menu-site-access-service$/},()=>({path:'access',namespace:'qa-access'}));b.onLoad({filter:/.*/,namespace:'qa-access'},()=>({contents:'export const getMenuSiteAccessStateForMenuSite=(input)=>globalThis.__publicMenuScopeQa.access(input);export const requireMenuSitePermission=()=>{throw Error("Unexpected staff scope")};'}));
 }}]});
 const loader=await import(pathToFileURL(loaderPath).href);
 for(actor of ['anonymous','owner','other-store-owner','expired-account']){const data=await loader.getPublicMenuDataBySlug('published');check(data?.menuSite.id,'published');check(data?.items.map(item=>item.name),['공개 라떼']);}
 check(privateReads,0);check(publicReads,4);
 check(await loader.getPublicMenuDataBySlug('draft'),null);check(await loader.getPublicMenuDataBySlug('expired'),null);check(await loader.getPublicMenuDataBySlug('missing'),null);
 actor='owner';check((await loader.getOwnerPreviewMenuPageData('draft','owner'))?.menuSite.id,'draft');
 actor='other-store-owner';check(await loader.getOwnerPreviewMenuPageData('draft','owner'),null);check(privateReads,2);
 console.log(JSON.stringify({passed:checks,actualPublicClient:true,actualMenuLoader:true,accountCookieReadsInPublic:0,privatePreviewPreserved:true,networkRequests:0,productionWrites:0}));
}finally{delete globalThis.__publicMenuScopeQa;await fs.rm(prefix,{recursive:true,force:true});}
