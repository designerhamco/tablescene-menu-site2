import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
import { measureOnePageMobileRhythm, getOnePageMobileRhythmFailures } from './lib/one-page-mobile-rhythm.mjs';
import { measureMenuPriceAlignment, getMenuPriceAlignmentFailures } from './lib/menu-price-alignment.mjs';

const base=process.env.MELLOW_QA_BASE||'http://localhost:3026';
const baseline=process.env.MELLOW_QA_BASELINE||'http://localhost:3000';
const output=process.env.MELLOW_QA_OUTPUT||'/private/tmp/mellow-qa';
const key='cafe_mocha_forest_a',purple='rgb(121, 40, 57)',yellow='rgb(236, 234, 183)';
const cases=[];
for(const [device,width,height] of [['pc',1512,900],['pc',1920,1080],['tablet',1180,820],['tablet',1024,768]])for(const layout of ['orderedBalancedFit','orderedFit'])cases.push({device,width,height,layout});
for(const width of [320,430])for(const call of ['on','off'])cases.push({device:'mobile',width,height:844,call});
for(const lang of ['en','ja','zh'])cases.push({device:'tablet',width:1180,height:820,lang});
for(const device of ['pc','mobile'])cases.push({device,width:device==='pc'?1512:390,height:900,design:{textColorGroupsVersion:2,textColors:{category:'#65C9DC',supporting:'#A3DBAD'}}});
cases.push({device:'pc',width:1512,height:900,design:{fonts:{category:{color:'#65C9DC'}}}});
cases.push({device:'pc',width:1512,height:900,design:{pageBackground:'#163040',auxiliaryBackground:'#163040'}});
for(const device of ['pc','mobile'])cases.push({device,width:device==='pc'?1512:390,height:900,off:true});
const browser=await chromium.launch();await fs.mkdir(output,{recursive:true});
const results=[],errors=[],writes=[];
if(process.env.MELLOW_QA_RESUME==='1'){const previous=JSON.parse(await fs.readFile(`${output}/report.json`,'utf8'));assert.equal(previous.base,base);results.push(...previous.results);errors.push(...previous.errors);writes.push(...previous.writes);}
const bundle=await build({stdin:{contents:"import {readPreviewRenderedDesign} from './lib/menu-preview-rendered-design';window.readMellowDesign=()=>readPreviewRenderedDesign(document);",resolveDir:process.cwd(),loader:'ts'},bundle:true,write:false,platform:'browser',format:'iife'});
function measure(){
 const root=document.querySelector('.cafe-a-typography');
 const visible=e=>e.getBoundingClientRect().width>0&&e.getBoundingClientRect().height>0&&!e.closest('[inert]');
 const box=e=>{const r=e.getBoundingClientRect();return [r.x,r.y,r.width,r.height];};
 const first=s=>[...root.querySelectorAll(s)].find(visible);
 const roles=Object.fromEntries(['.cafe-a-category-title','.cafe-a-menu-title','.cafe-a-menu-meta','.cafe-a-menu-copy .cafe-a-menu-description:not([data-cafe-a-category-description]):not(.cafe-a-time-sale-time-text)'].map(s=>{const e=first(s),v=e&&getComputedStyle(e);return [s,v&&{font:v.fontFamily,size:v.fontSize,line:v.lineHeight,color:v.color}];}));
 const columns=[...root.querySelectorAll('[data-native-column]')].filter(visible);
 const ruleNodes=[...root.querySelectorAll('[data-menu-category-decoration]')].filter(visible);
 const header=first('[data-native-header]'),logo=first('.cafe-a-store-logo'),media=first('[data-cafe-a-widget-media]');
 const rule=ruleNodes.map(e=>({box:box(e),color:getComputedStyle(e).color,background:getComputedStyle(e).backgroundColor}));
 const headerCopy=['.cafe-a-topline-description','.cafe-a-topline-notice-text'].flatMap(s=>{const e=first(s);return e?[{box:box(e),parent:box(e.parentElement),text:e.textContent}]:[];});
 return {viewport:[innerWidth,innerHeight],shell:root.dataset.onePageLayoutShell,background:getComputedStyle(root).backgroundColor,roles,columns:columns.map(box),rules:rule,header:header&&box(header),headerCopy,
 logo:logo&&{src:logo.getAttribute('src'),box:box(logo),fit:getComputedStyle(logo).objectFit,loaded:logo.complete&&logo.naturalWidth>0},
 widget:media&&{box:box(media),src:media.querySelector('img')?.getAttribute('src'),fit:getComputedStyle(media.querySelector('img')).objectFit,position:getComputedStyle(media.querySelector('img')).objectPosition},
 units:[...root.querySelectorAll('[data-native-unit]')].filter(visible).map(box),names:[...root.querySelectorAll('[data-cafe-a-menu-name]')].filter(visible).map(e=>e.textContent),
 menu:first('[data-native-menu]')&&box(first('[data-native-menu]')),overflow:document.documentElement.scrollWidth-innerWidth,
 colors:['.cafe-a-category-title','.cafe-a-topline-description','.cafe-a-topline-notice-text','.cafe-a-time-sale-time-text'].flatMap(s=>{const e=first(s);return e?[getComputedStyle(e).color]:[];})};
}
async function pageAt(url,c,k=key){
 const page=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push({url,k,...c,message:e.message}));
 await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 const params=new URLSearchParams({device:c.device,view:'actual',embedded:'1',layoutMode:c.layout||'orderedBalancedFit',lang:c.lang||'ko',callPreview:c.call||'on',orderPreview:c.call==='off'?'off':'on'});
 if(c.design)params.set('designPreview',JSON.stringify(c.design));if(c.off)for(const k of ['logoPreview','coverPreview','widgetsPreview'])params.set(k,'off');
 await page.goto(`${url}/templates/${k}/preview?${params}`,{waitUntil:'domcontentloaded',timeout:60000});await page.evaluate(()=>document.fonts.ready);
 await page.locator(c.device==='mobile'?'.cafe-a-store-logo,[data-mobile-brand-fit=ready]':'[data-native-ready=true],[data-paged-ready=true]').first().waitFor({timeout:45000});await page.waitForTimeout(500);
 return page;
}
try{
 for(const [i,c] of cases.entries()){
  if(i<Number(process.env.MELLOW_QA_START||0))continue;
  const page=await pageAt(base,c);
  try{
   const m=await page.evaluate(measure);assert.deepEqual(m.viewport,[c.width,c.height]);assert.ok(m.overflow<=1);assert.equal(m.shell,'brand_top_band');
   assert.equal(m.background,c.design?.pageBackground?'rgb(22, 48, 64)':purple);
   const category=c.design?.textColors?.category||c.design?.fonts?.category?.color?'rgb(101, 201, 220)':yellow;
   assert.equal(m.roles['.cafe-a-category-title'].color,category);
   assert.equal(m.roles['.cafe-a-menu-title'].color,yellow);
   assert.equal(m.roles['.cafe-a-menu-copy .cafe-a-menu-description:not([data-cafe-a-category-description]):not(.cafe-a-time-sale-time-text)'].color,c.design?.textColors?.supporting?'rgb(163, 219, 173)':yellow);
   assert.deepEqual(getMenuPriceAlignmentFailures(await page.evaluate(measureMenuPriceAlignment)),[]);
   if(c.device==='mobile'){
    assert.equal(m.rules.length,0);const rhythm=await page.evaluate(measureOnePageMobileRhythm);assert.deepEqual(getOnePageMobileRhythmFailures(rhythm),[]);
   }else{
    assert.equal(m.rules.length,m.columns.length-1);for(let r=0;r<m.rules.length;r++){
     const edge=m.columns[r][0]+m.columns[r][2],next=m.columns[r+1][0];
     assert.ok(Math.abs(m.rules[r].box[0]-(edge+next)/2)<1);assert.equal(m.rules[r].box[2],1);assert.equal(m.rules[r].background,category);
    }
    assert.equal(m.headerCopy.length,1);for(const copy of m.headerCopy)assert.ok(copy.box[1]+copy.box[3]<=copy.parent[1]+copy.parent[3]+1,'complete header description and notices');
   }
   if(c.device!=='mobile'){
    const headerState=await page.evaluate(()=>{
      const header=document.querySelector('[data-native-header]'),identity=header.querySelector('[data-cafe-a-topline-brand-identity]'),description=header.querySelector('.cafe-a-topline-description'),control=header.querySelector('[data-template-language-control]'),notices=document.querySelector('[data-native-tracks] [data-native-notices]');
      const rect=e=>e.getBoundingClientRect().toJSON();
      return {align:header.dataset.basicHeaderAlign,header:rect(header),identity:rect(identity),description:rect(description),control:rect(control),last:notices?.closest('[data-native-column]')===document.querySelector('[data-native-column]:last-child'),headerNotices:header.querySelectorAll('[data-cafe-a-topline-notices]').length,hasCover:!!document.querySelector('.cafe-a-cover-hero'),secondary:document.querySelectorAll('.cafe-a-menu-meta:not([data-cafe-a-reference-copy])').length,chip:[...document.querySelectorAll('.cafe-a-menu-badge,.cafe-a-time-sale-badge')].filter(e=>!e.closest('[inert]')).map(e=>getComputedStyle(e).color)};
    });
    assert.equal(headerState.align,'left');assert.ok(Math.abs(headerState.identity.left-headerState.header.left)<1);
    assert.ok(headerState.description.left>headerState.header.left+headerState.header.width*.6);
    assert.ok(Math.abs(headerState.control.right-headerState.header.right)<1);
    assert.equal(headerState.last,true);assert.equal(headerState.headerNotices,0);assert.equal(headerState.hasCover,false);assert.equal(headerState.secondary,0);
    assert.ok(headerState.chip.every(color=>color==='rgb(121, 40, 57)'),'ordinary and sale chips share MELLOW ink');
   }
   if(c.off){assert.equal(m.logo,undefined);assert.equal(m.widget,undefined);}else{
    assert.equal(m.logo.src,'/menu-templates/cafe_mocha_forest_a/mellow-logo-resized.png');assert.equal(m.logo.loaded,true);assert.equal(m.logo.fit,'contain');
    assert.equal(m.widget.src,'/menu-templates/cafe_mocha_forest_a/mellow-widget-resized.png');assert.equal(m.widget.fit,'contain');assert.equal(m.widget.position,'100% 100%');assert.ok(Math.abs(m.widget.box[2]/m.widget.box[3]-2)<.02);
   }
   await page.addScriptTag({content:bundle.outputFiles[0].text});const defaults=await page.evaluate(()=>window.readMellowDesign());
   assert.equal(defaults.nativeTextColors.category,c.design?.fonts?.category?.color||'#ECEAB7');assert.equal(defaults.nativeTextColors.product,'#ECEAB7');
   const trigger=page.locator('[data-template-language-control] button[aria-haspopup=menu]').filter({visible:true}).first();await trigger.click();
   const popup=page.locator('[data-language-menu-surface]').filter({visible:true}).first();await popup.waitFor();
   const popupInk=await popup.locator('[data-language-menu-item]').first().evaluate(e=>getComputedStyle(e).color);assert.equal(popupInk,category);
   const popupBg=await popup.evaluate(e=>getComputedStyle(e).backgroundColor);assert.equal(popupBg,m.background);await page.keyboard.press('Escape');
   if(i<8||c.device==='mobile'&&c.width===430)await page.screenshot({path:`${output}/mellow-${i}-${c.device}.png`,fullPage:c.device==='mobile'});
   if(m.widget){await page.evaluate(()=>{const el=document.querySelector('[data-native-menu]');if(el)el.scrollTop=el.scrollHeight;});await page.waitForTimeout(100);if(i===0)await page.screenshot({path:`${output}/mellow-widget-bottom.png`});}
   results.push({case:c,metrics:m});await fs.writeFile(`${output}/report.json`,JSON.stringify({base,baseline,results,errors,writes},null,2));console.log(`PASS MELLOW ${i+1}/${cases.length} ${c.device} ${c.width}`);
  }finally{await page.close();}
 }
 for(const k of ['cafe_design_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a']){
  const c={device:'tablet',width:1180,height:820};const old=await pageAt(baseline,c,k),p=await pageAt(base,c,k);
  try{const a=await old.evaluate(measure),b=await p.evaluate(measure);assert.deepEqual(b,a,`${k} keeps geometry, ink, typography and content`);results.push({unchanged:k});console.log(`PASS unchanged ${k}`);}finally{await old.close();await p.close();}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);await fs.writeFile(`${output}/report.json`,JSON.stringify({base,baseline,results,errors,writes},null,2));console.log(`PASS ${results.length} MELLOW and regression cases`);
}finally{await browser.close();}
