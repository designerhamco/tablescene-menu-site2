// Execute the real catalog server route and creation function; only visual wrappers are stubbed.
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
const bundle='/private/tmp/catalog-starter-parity-services.mjs';
await build({stdin:{contents:`export {default as preview} from './app/templates/[templateKey]/preview/page.tsx';export {catalogDesigns} from './lib/catalog-designs.ts';export {createStarterMenuData} from './lib/menu-starter-presets.ts';export {StarterClient} from './lib/test-support/starter-provisioning-client.ts';`,resolveDir:process.cwd()},outfile:bundle,bundle:true,platform:'node',format:'esm',tsconfig:'tsconfig.json',logLevel:'silent',plugins:[{name:'catalog-render-boundary',setup(b){
 b.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'catalog-ui'}));
 b.onResolve({filter:/^@\/components\//},args=>({path:args.path,namespace:'catalog-ui'}));
 b.onLoad({filter:/.*/,namespace:'catalog-ui'},args=>({contents:args.path==='navigation'?`export function notFound(){throw new Error('Catalog route not found');}`:`export default function VisualBoundary(){return null;}`}));
}}]});
const service=await import(pathToFileURL(bundle).href);
const findData=node=>{if(!node||typeof node!=='object')return null;if(node.props?.menuSite)return node.props;if(Array.isArray(node))return node.map(findData).find(Boolean)??null;return findData(node.props?.children);};
let checks=0;
for(const design of service.catalogDesigns){
 const query=Object.fromEntries(new URL(design.previewHref,'https://menu.test').searchParams);
 const element=await service.preview({params:Promise.resolve({templateKey:design.templateKey}),searchParams:Promise.resolve({...query,view:'actual',device:'pc'})});
 const preview=findData(element);assert.ok(preview,design.id+' preview data');checks++;
 const client=new service.StarterClient();client.site={...client.site,id:'menu',template_key:design.templateKey,settings:{menu_design_id:design.id}};
 const product=design.service==='basic'?'business_basic_single_monthly':design.service==='dining'?'business_basic_multi_monthly':'business_display_monthly';
 await service.createStarterMenuData(client,'menu',design.templateKey,null,null,product,{designId:design.id});
 const rows=client.rows.get('menu_items')??[];
 assert.deepEqual(rows.map(item=>[item.name,item.price]),preview.items.map(item=>[item.name,item.price]),design.id+' visible item samples');checks++;
 assert.deepEqual((client.rows.get('menu_pages')??[]).map(page=>page.title),preview.pages.map(page=>page.title),design.id+' page samples');checks++;
 assert.deepEqual((client.rows.get('menu_categories')??[]).map(category=>category.name),preview.categories.map(category=>category.name),design.id+' category samples');checks++;
}
let languageCases=0;
for(const design of service.catalogDesigns.filter(d=>d.kind==='standard'&&d.service==='dining'))for(const locale of ['en','zh','ja']){
 const query=Object.fromEntries(new URL(design.previewHref,'https://menu.test').searchParams);
 const preview=findData(await service.preview({params:Promise.resolve({templateKey:design.templateKey}),searchParams:Promise.resolve({...query,view:'actual',device:'pc',lang:locale})}));
 const text=JSON.stringify({pages:preview.pages.map(p=>({title:p.title,description:p.description})),categories:preview.categories.map(c=>({name:c.name,description:c.description}))});
 assert.doesNotMatch(text,/오브 테이블|메종 마레|Maison Marais|Aube Table|Marais evening/i,design.id+'/'+locale+' neutral identity');checks++;
 assert.equal(preview.categories[0].course_price,185000,design.id+' approved shared course');checks++;
 if(locale==='en'){assert.doesNotMatch(text,/[가-힣]/,design.id+' shared sample English dictionary');checks++;}
 languageCases++;
}
console.log(JSON.stringify({passed:checks,designs:service.catalogDesigns.length,languageCases,actualCatalogServerRoute:true,actualCreationFunction:true,productionWrites:0,realPayments:0}));
