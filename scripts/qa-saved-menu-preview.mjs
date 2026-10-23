// Run the actual owner route with the actual catalog data; stub only authorization reads and visual boundaries.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
const bundle='/private/tmp/saved-menu-preview-route-services.mjs';
await build({stdin:{contents:`export {default as ownerPreview} from './app/mypage/menus/[menuId]/preview/page.tsx';export {default as catalogPreview} from './app/templates/[templateKey]/preview/page.tsx';export {catalogDesigns} from './lib/catalog-designs.ts';export {setPreviewContext} from '@/lib/menu-page-data';`,resolveDir:process.cwd()},outfile:bundle,bundle:true,platform:'node',format:'esm',tsconfig:'tsconfig.json',logLevel:'silent',plugins:[{name:'saved-preview-read-boundary',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'preview-read'}));
 b.onResolve({filter:/^@\/lib\/menu-page-data$/},()=>({path:'data',namespace:'preview-read'}));
 b.onResolve({filter:/^@\/lib\/supabase\/server$/},()=>({path:'auth',namespace:'preview-read'}));
 b.onResolve({filter:/^@\/components\//},args=>({path:args.path,namespace:'preview-read'}));
 b.onLoad({filter:/.*/,namespace:'preview-read'},args=>({contents:args.path==='navigation'?`export function redirect(url){throw Object.assign(new Error('Redirect'),{redirect:url});}export function notFound(){throw new Error('Not found');}`:args.path==='data'?`export let context;export function setPreviewContext(value){context=value;}export async function getAuthorizedPreviewMenuPageData(){return context;}`:args.path==='auth'?`import {context} from 'preview-context';export async function createClient(){return {auth:{getUser:async()=>({data:{user:context.user===false?null:{id:'test-owner'}}})}};}`:`export default function VisualBoundary(){return null;}`}));
 b.onResolve({filter:/^preview-context$/},()=>({path:'data',namespace:'preview-read'}));
}}]});
const service=await import(pathToFileURL(bundle).href);
const find=(node,predicate)=>{if(!node||typeof node!=='object')return null;if(predicate(node.props??{}))return node.props;if(Array.isArray(node))return node.map(n=>find(n,predicate)).find(Boolean)??null;return find(node.props?.children,predicate);};
let checks=0;
for(const design of service.catalogDesigns){
 const source=find(await service.catalogPreview({params:Promise.resolve({templateKey:design.templateKey}),searchParams:Promise.resolve({...Object.fromEntries(new URL(design.previewHref,'https://menu.test').searchParams),view:'actual',device:'pc'})}),props=>Boolean(props.menuSite));
 const data=structuredClone(Object.fromEntries(Object.entries(source).filter(([key])=>!['orderCallConfig'].includes(key))));
 data.menuSite.id='customer-menu';data.menuSite.settings={...data.menuSite.settings,menu_design_id:design.id};
 const before=structuredClone(data);
 service.setPreviewContext({accessContext:{isOwner:true},accessState:{canOwnerPreview:true,lifecycleState:'active'},data});
 const framed=await service.ownerPreview({params:Promise.resolve({menuId:'customer-menu'}),searchParams:Promise.resolve({device:'tablet'})});
 if(design.service!=='display'){
  const frame=find(framed,props=>Boolean(props.menuId&&props.previewDisplayOptions));
  assert.ok(frame,design.id+' common options panel');assert.equal(frame.menuId,'customer-menu');assert.equal(frame.menuTemplateKey,design.templateKey);assert.equal(frame.menuDesignId,design.kind==='standard'?design.id:undefined);checks+=4;
 }
 const rendered=find(await service.ownerPreview({params:Promise.resolve({menuId:'customer-menu'}),searchParams:Promise.resolve({device:'mobile',view:'actual',embedded:'1',imagesPreview:'off',designPreview:JSON.stringify({pageBackground:'#123456'}),design:'dining-sidebar'})}),props=>Boolean(props.menuSite));
 assert.ok(rendered,design.id+' actual saved data');assert.deepEqual(rendered.items.map(i=>[i.id,i.name,i.price]),data.items.map(i=>[i.id,i.name,i.price]));assert.deepEqual(data,before,design.id+' no source mutation');assert.equal(rendered.menuSite.settings.menu_design_id,design.id);checks+=4;
}
service.setPreviewContext({user:false});
await assert.rejects(service.ownerPreview({params:Promise.resolve({menuId:'private-menu'})}),error=>error.redirect==='/sign-in?next=/mypage/menus/private-menu/preview');checks++;
service.setPreviewContext({accessContext:{isOwner:true},accessState:{canOwnerPreview:false},data:null});
assert.equal(find(await service.ownerPreview({params:Promise.resolve({menuId:'private-menu'})}),props=>Boolean(props.previewDisplayOptions)),null);checks++;
console.log(JSON.stringify({passed:checks,designs:service.catalogDesigns.length,actualOwnerServerRoute:true,actualCatalogData:true,productionWrites:0}));
