import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {menuColorContrast} from '../lib/menu-interaction-theme.ts';
const base=process.env.ORDER_QA_BASE||'http://127.0.0.1:3027',output=process.env.ORDER_QA_OUTPUT||'/private/tmp/dining-semantic-colors';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),passed=[],failures=[],errors=[],writes=[];
const devices=[['pc',1440,900],['tablet',1180,820],['mobile',390,844]];
const skins=[['dining_aube_table_a'],['dining_aube_table_b'],['dining_aube_table_a','dining-full-page'],['dining_aube_table_b','dining-sidebar'],['dining_aube_table_a','dining-full-page-album'],['dining_aube_table_b','dining-sidebar-album']];
const read=()=>{
 const box=e=>{if(!e)return null;const r=e.getBoundingClientRect(),s=getComputedStyle(e);return {top:r.top,bottom:r.bottom,width:r.width,height:r.height,ink:s.color,bg:s.backgroundColor,border:s.borderColor,visible:r.width>0&&r.height>0&&s.display!=='none'};};
 const root=document.querySelector('.aube-table-root'),toolbar=document.querySelector('[data-table-menu-header]')||document.querySelector('[data-dining-menu-toolbar]');
 const shell=document.querySelector('[data-menu-interaction-shell]');
 const sidebar=root?.querySelector('.aube-table-sidebar-navigation'),trigger=toolbar?.querySelector('[data-language-menu-trigger]');
 const sb=sidebar?.getBoundingClientRect(),tr=trigger?.getBoundingClientRect();const sidebarSurface=sb?.width&&tr&&tr.x+tr.width/2<sb.right?getComputedStyle(sidebar).backgroundColor:null;
 return {sidebarSurface,coursePriced:document.querySelector('.aube-table-course')?.dataset.coursePriced==='true',viewport:[innerWidth,innerHeight],title:box(document.querySelector('.aube-table-page-header h1')),category:box(document.querySelector('.aube-table-course-header h2')),pageDescription:box(document.querySelector('.aube-table-page-description')),categoryDescription:box(document.querySelector('.aube-table-course-description')),price:box(document.querySelector('.aube-table-course-price')),priceNote:box(document.querySelector('.aube-table-course-price-description')),product:box(document.querySelector('.aube-table-item-heading h3')),tools:box(toolbar),toolColors:toolbar?[...toolbar.querySelectorAll('[data-language-menu-trigger],[data-terminal-table-label],[data-dining-cart],[data-table-menu-actions] button')].filter(e=>e.getBoundingClientRect().height>0).map(e=>getComputedStyle(e).color):[],table:toolbar?.querySelector('[data-terminal-table-label]')?.textContent,cart:box(document.querySelector('[data-dining-cart]')),cartDisabled:document.querySelector('[data-dining-cart]')?.disabled,notes:box(document.querySelector('[data-dining-cover-notices]')),nav:box(document.querySelector('.aube-table-pagination')),dock:box(document.querySelector('[data-table-mobile-dock]')),palette:Object.fromEntries(['--menu-order-bg','--menu-call-bg','--menu-call-ink','--menu-call-border','--menu-call-circle-bg'].map(k=>[k,shell?getComputedStyle(shell).getPropertyValue(k).trim():''])),root:box(root)};
};
const colors={brand:'#ECEAB7',representative:'#ECEAB7',pageTitle:'#225577',category:'#A52A4B',sectionDescription:'#64728A',supporting:'#556B48',product:'#26313A',price:'#886622'};
const cases=[];
for(const [key,design]of skins)for(const [device,width,height]of devices)for(const surface of ['dark','light'])cases.push({key,design,device,width,height,surface});
for(const [key,design]of skins)for(const [device,width,height]of devices.slice(0,2))cases.push({key,design,device,width,height,surface:'dark',off:true});
if(!process.env.DINING_SEMANTIC_QA_PRODUCTION)for(const surface of ['dark','light'])for(const [device,width,height]of devices.slice(1))cases.push({key:'dining_aube_table_a',device,width,height,surface,photo:true});
const selected=process.env.DINING_SEMANTIC_QA_ONLY==='ui'?[]:process.env.DINING_SEMANTIC_QA_ONLY==='off'?cases.filter(c=>c.off):process.env.DINING_SEMANTIC_QA_ONLY==='photo'?cases.filter(c=>c.photo):process.env.DINING_SEMANTIC_QA_ONLY==='sidebar'?cases.filter(c=>!c.off&&!c.photo&&c.device!=='mobile'&&(c.design?.includes('sidebar')||!c.design&&c.key.endsWith('_b'))):process.env.DINING_SEMANTIC_QA_SMOKE?cases.filter(c=>!c.design&&['pc','tablet','mobile'].includes(c.device)&&c.surface==='dark'&&!c.off&&!c.photo):cases;
for(const c of selected){
 const page=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(writes.push(route.request().url()),route.abort()));
 try{
  const ink=c.surface==='light'&&!c.photo?'#792839':'#ECEAB7';
  const q=new URLSearchParams({device:c.device,view:'actual',coverPreview:'on',coverImagesPreview:'off',categoryDescriptionsPreview:'on',callPreview:c.off?'off':'on',orderPreview:c.off?'off':'on',...(c.design?{design:c.design}:{}),designPreview:JSON.stringify({textColorGroupsVersion:2,diningTextColorGroupsVersion:3,textColors:{...colors,representative:ink},coverBackground:c.surface==='dark'?'#0d172a':'#fffdf8'})});
  const url=c.photo?`${base}/__qa/widget-placement?template=${c.key}&cover=on&photo=${c.surface}&call=on&device=${c.device}&designPreview=${encodeURIComponent(q.get('designPreview'))}`:`${base}/templates/${c.key}/preview?${q}`;
  await page.goto(url,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>document.querySelector('[data-aube-table-cover]')&&getComputedStyle(document.querySelector('[data-aube-table-cover]')).display==='grid');await page.waitForTimeout(300);
  let m=await page.evaluate(read);assert.deepEqual(m.viewport,[c.width,c.height]);
  assert.equal(await page.getByText('Table 1',{exact:true}).filter({visible:true}).count(),0,'cover hides every table label');
  assert.equal(await page.locator('[data-dining-cart],[data-table-menu-actions],[data-dining-floating-call],[data-table-mobile-dock]').filter({visible:true}).count(),0,'cover shows no operational actions');
  if(c.device!=='mobile'){
   assert.ok(m.tools?.visible&&!m.cart?.visible,'Dining covers show language only');assert.equal(m.toolColors.length,1);
  }
  if(!c.off||c.device!=='mobile'){
   assert.ok(m.toolColors.every(i=>i===m.tools.ink),'all three controls share ink');
   if(c.photo&&c.surface==='light'){assert.ok(menuColorContrast(m.tools.ink,'#fffdf8')>=4.5,'bright photo uses readable dark page ink');assert.notEqual(m.tools.ink,'rgb(255, 255, 255)');}
   else assert.equal(m.tools.ink,ink==='#ECEAB7'?'rgb(236, 234, 183)':'rgb(121, 40, 57)','store-description ink is first priority');
  }
  assert.equal(m.palette['--menu-order-bg'],'#225577');assert.equal(m.palette['--menu-call-circle-bg'],'#225577');assert.equal(m.palette['--menu-call-ink'],'#225577');assert.equal(m.palette['--menu-call-border'],'#225577');
  if(c.off&&c.device!=='mobile')assert.equal(await page.locator('[data-dining-floating-call]').count(),0);
  const nav=page.locator('.aube-table-pagination-dots button,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({visible:true});await nav.nth(1).click();await page.locator('.aube-table-page').waitFor();await page.waitForTimeout(200);m=await page.evaluate(read);
  assert.equal(m.title.ink,'rgb(34, 85, 119)');assert.equal(m.category.ink,'rgb(165, 42, 75)');assert.equal(m.pageDescription.ink,'rgb(85, 107, 72)');assert.equal(m.categoryDescription.ink,'rgb(85, 107, 72)');assert.equal(m.product.ink,'rgb(38, 49, 58)');const itemDescriptions=await page.locator('.aube-table-item-description').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));assert.ok(itemDescriptions.length&&itemDescriptions.every(i=>i==='rgb(85, 107, 72)'),'all menu descriptions share page/category ink');if(m.price)assert.equal(m.price.ink,'rgb(136, 102, 34)');if(m.priceNote)assert.equal(m.priceNote.ink,'rgb(85, 107, 72)');assert.equal(m.palette['--menu-order-bg'],'#225577');
  assert.ok(m.tools.visible&&menuColorContrast(m.tools.ink,m.root.bg)>=4.5);
  if(c.device!=='mobile'){if(c.off){assert.ok(!m.cart?.visible,'both OFF hides history');assert.ok(!m.table);}else{assert.ok(m.cart.visible);assert.equal(m.cartDisabled,Boolean(c.photo));assert.equal(m.table,'Table 1');}}
  const geometry=await page.locator('[data-dining-menu-toolbar]').evaluateAll(es=>es.map(e=>[...e.querySelectorAll('[data-language-menu-trigger],[data-terminal-table-label],[data-dining-cart]')].filter(e=>e.getBoundingClientRect().width).map(e=>{const r=e.getBoundingClientRect();return {x:r.x,w:r.width};})));
  if(c.device!=='mobile'){const [g]=geometry;assert.ok(g[0].x<50,'left language: '+JSON.stringify(g));if(!c.off)assert.ok(g.at(-1).x>c.width-100,'right history');if(!c.off)assert.ok(Math.abs(g[1].x+g[1].w/2-c.width/2)<2,'table is centered');}
  const adds=await page.locator('[data-menu-order-add]').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));assert.ok(adds.every(ink=>ink==='rgb(38, 49, 58)'),'course and item add icons follow product ink');
  if(!c.design&&c.key==='dining_aube_table_a'&&c.surface==='dark'&&!c.off&&!c.photo)await page.screenshot({path:`${output}/${c.device}-separate-colors.png`});
  if(c.off&&!c.design&&c.key==='dining_aube_table_a'&&c.device==='pc')await page.screenshot({path:`${output}/pc-actions-off.png`});
  if(!c.photo){
   await nav.nth(2).click();await page.locator('.aube-table-course:not([data-course-priced="true"])').first().waitFor();await page.waitForTimeout(200);
   const ordinary=await page.locator('.aube-table-course:not([data-course-priced="true"]) .aube-table-course-description').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));
   assert.ok(ordinary.length&&ordinary.every(i=>i==='rgb(85, 107, 72)'),'ordinary category description shares page description ink');
   const itemPrices=await page.locator('.aube-table-item-price').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));assert.ok(itemPrices.length&&itemPrices.every(i=>i==='rgb(136, 102, 34)'),'menu and option prices are independent from product names');
   const ordinaryAdds=await page.locator('[data-menu-order-add]').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));assert.ok(ordinaryAdds.every(i=>i==='rgb(38, 49, 58)'),'ordinary item add icons share product ink');
  }
  passed.push(c);console.log('PASS',JSON.stringify(c));
 }catch(e){failures.push({...c,error:e.message});console.log('FAIL',JSON.stringify(failures.at(-1)));await page.screenshot({path:`${output}/fail-${failures.length}.png`});}finally{await page.close();}
}
if(!process.env.DINING_SEMANTIC_QA_PRODUCTION&&!process.env.DINING_SEMANTIC_QA_SMOKE&&(!process.env.DINING_SEMANTIC_QA_ONLY||process.env.DINING_SEMANTIC_QA_ONLY==='ui')){
 for(const key of ['dining_aube_table_a','dining_aube_table_b','cafe_design_a']){
  const page=await browser.newPage({viewport:{width:1440,height:900}});page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(writes.push(route.request().url()),route.abort()));
  try{
   await page.goto(`${base}/__qa/basic-design?editor=on&template=${key}`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);await page.waitForTimeout(300);
   if(key.startsWith('dining_')){
    for(const [label,hex]of [['페이지 제목','#225577'],['카테고리명','#A52A4B'],['페이지·카테고리·메뉴 설명','#556B48'],['상품명','#26313A'],['가격','#886622']]){
     await page.getByRole('button',{name:`${label} 글자색 선택`,exact:true}).click();
     await page.getByRole('textbox',{name:`${label} 글자색 색상값`,exact:true}).fill(hex);
     await page.getByRole('button',{name:'적용',exact:true}).click();
    }
    const values=await page.locator('#fixture-design').evaluate(form=>Object.fromEntries(new FormData(form)));
    assert.equal(values.text_color_pageTitle,'#225577');assert.equal(values.text_color_category,'#A52A4B');assert.equal(values.text_color_supporting,'#556B48');assert.ok(!('text_color_sectionDescription' in values));assert.equal(values.dining_shared_descriptions,'1');assert.equal(values.text_color_product,'#26313A');assert.equal(values.text_color_price,'#886622');assert.equal(values.dining_text_colors_present,'1');
    await page.getByRole('button',{name:'페이지 제목 글자색 기본색 복원',exact:true}).click();await page.getByRole('button',{name:'적용',exact:true}).click();
    const reset=await page.locator('#fixture-design').evaluate(form=>Object.fromEntries(new FormData(form)));assert.equal(reset.text_color_pageTitle,'');assert.equal(reset.text_color_category,'#A52A4B');
    await page.getByRole('button',{name:'가격 글자색 기본색 복원',exact:true}).click();await page.getByRole('button',{name:'적용',exact:true}).click();
    const priceReset=await page.locator('#fixture-design').evaluate(form=>Object.fromEntries(new FormData(form)));assert.equal(priceReset.text_color_price,'');assert.equal(priceReset.text_color_product,'#26313A');
   }else{assert.equal(await page.getByRole('button',{name:'페이지 제목 글자색 선택',exact:true}).count(),0);assert.equal(await page.locator('[name="text_color_pageTitle"]').count(),0);}
   passed.push({editor:key});console.log('PASS',JSON.stringify({editor:key}));
  }catch(e){failures.push({editor:key,error:e.message});console.log('FAIL',JSON.stringify(failures.at(-1)));}finally{await page.close();}
 }
 for(const key of ['dining_aube_table_a','dining_aube_table_b']){
  const page=await browser.newPage({viewport:{width:1180,height:820}});page.on('pageerror',e=>errors.push(e.message));
  try{
   for(const toggle of ['off','on']){
    await page.goto(`${base}/templates/${key}/preview?device=tablet&view=actual&coverPreview=off&pageDescriptionsPreview=${toggle}&categoryDescriptionsPreview=on`,{waitUntil:'domcontentloaded'});
    await page.locator('.aube-table-page').waitFor();await page.evaluate(()=>document.fonts.ready);
    assert.equal(await page.locator('.aube-table-page-description').count(),toggle==='on'?1:0);assert.ok(await page.locator('.aube-table-course-description').count());
   }
   passed.push({visibility:key});console.log('PASS',JSON.stringify({visibility:key}));
  }catch(e){failures.push({visibility:key,error:e.message});console.log('FAIL',JSON.stringify(failures.at(-1)));}finally{await page.close();}
 }
}
await browser.close();await fs.writeFile(`${output}/results.json`,JSON.stringify({passed,failures,errors,writes},null,2));console.log(JSON.stringify({passed:passed.length,failed:failures.length,errors,writes}));if(failures.length||errors.length||writes.length)process.exitCode=1;
