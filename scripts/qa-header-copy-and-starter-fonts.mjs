import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const out=process.env.ORDER_QA_OUTPUT||'/private/tmp/header-copy-starter-fonts';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[],failures=[],errors=[];
const devices=[['pc',1440,900],['tablet',1180,820],['tablet',820,1180]];
const skins=['cafe_design_a','cafe_mocha_forest_a','fast_food_loop_bagel_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','restaurant_onue_a'];
async function open(key,device,width,height,query={}){
 const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
 await p.addInitScript(()=>sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed','1'));
 await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({device,view:'actual',callPreview:'on',orderPreview:'on',...query}),{waitUntil:'networkidle'});
 await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);assert.deepEqual(await p.evaluate(()=>[innerWidth,innerHeight]),[width,height]);return p;
}
async function run(name,fn){try{await fn();console.log('PASS',name);}catch(e){failures.push({name,error:e.message});console.log('FAIL',name,e.message);}}
async function header(p){return p.evaluate(()=>{
 const h=document.querySelector('[data-cafe-a-topline-info-header],[data-basic-top-row]'),board=document.querySelector('[data-scroll-brand-board]');
 const copy=[...h.querySelectorAll('.cafe-a-topline-description,.cafe-a-topline-notice-text,[data-scroll-header-copy]')];
 const b=h.getBoundingClientRect(),menu=document.querySelector('[data-native-menu],[data-scroll-viewport]').getBoundingClientRect();
 return {height:b.height,bottom:b.bottom,menuTop:menu.top,menuHeight:menu.height,minimum:board.style.getPropertyValue('--cafe-a-header-copy-height'),copies:copy.map(el=>{
  const range=document.createRange();range.selectNodeContents(el);const rect=range.getBoundingClientRect();
  const ancestors=[];for(let a=el;a&&h.contains(a);a=a.parentElement){const s=getComputedStyle(a);if(/hidden|clip/.test(s.overflowY))ancestors.push({bottom:a.getBoundingClientRect().bottom,top:a.getBoundingClientRect().top});}
  return {text:el.textContent,bottom:rect.bottom,top:rect.top,ancestors};
 })};
});}
function assertHeader(h){assert.ok(h.height>0&&h.menuHeight>100,'header and scroll body have usable height');assert.ok(h.bottom<=h.menuTop+1,'header stays above menu');for(const c of h.copies){assert.ok(c.bottom<=h.bottom+1,'complete copy stays inside header');for(const a of c.ancestors){assert.ok(c.bottom<=a.bottom+1&&c.top>=a.top-1,'copy is not clipped by a native panel');}}}
try{
 for(const [device,w,h] of devices)for(const [key,design] of [['cafe_sunday_line_a'],['cafe_van_gogh_a'],['cafe_design_a','basic-top-row'],['cafe_design_a','basic-top-row-album']])for(const logo of [false,true])await run(`header ${design||key} ${device} ${w} logo=${logo}`,async()=>{
  const p=await open(key,device,w,h,{...(design?{design}:{}),...(logo?{logoPreview:'on'}:{})});try{
   const before=await header(p);assertHeader(before);
   const description=p.locator('.cafe-a-topline-description,[data-basic-top-row] .cafe-a-store-description').first();
   await description.evaluate(el=>el.textContent='좋은 원두와 갓 구운 디저트를 준비합니다. 편안한 공간에서 천천히 머무르며 향긋한 커피와 계절의 맛을 즐겨보세요. 매일 정성껏 준비한 메뉴와 따뜻한 한 잔으로 여유로운 시간을 전합니다.'.repeat(2));
   await p.waitForTimeout(250);const long=await header(p);assertHeader(long);assert.ok(long.height>=before.height,'longer copy grows independently of the title ceiling');
   await description.evaluate(el=>el.textContent='편안한 한 잔을 준비합니다.');await p.waitForTimeout(250);const short=await header(p);assertHeader(short);assert.ok(short.height<long.height,'shorter copy releases reserved header height');
   results.push({kind:'header',key,design,device,viewport:[w,h],logo,before,long,short});
   if(key==='cafe_sunday_line_a'&&device==='tablet'&&w===1180&&!logo)await p.screenshot({path:`${out}/sunday-header-tablet.png`});
  }finally{await p.close();}
 });
 for(const key of skins)for(const [device,w,h] of [['pc',1440,900],['tablet',1180,820],['mobile',390,844]])await run(`ink/font ${key} ${device}`,async()=>{
  const p=await open(key,device,w,h);try{
   const data=await p.evaluate(()=>{
    const visible=e=>!e.closest('[inert],[aria-hidden="true"]')&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';
    const root=document.querySelector('.cafe-a-typography');
    const noticeSelectors='[data-native-notices],[data-paged-notices],.cafe-a-topline-notice-text,.cafe-a-mobile-notice-list p,.cafe-a-round-focus-notices .cafe-a-menu-description,.cafe-a-round-focus-mobile-notices .cafe-a-menu-description';
    const notices=[...root.querySelectorAll(noticeSelectors)].filter(visible);
    const descriptions=[...root.querySelectorAll('[data-cafe-a-menu-item] .cafe-a-menu-description,.cafe-a-store-description')].filter(e=>visible(e)&&!e.closest('.cafe-a-footer-info,[data-sold-out="true"],[data-cafe-a-sold-out="true"]'));
    const secondary=[...root.querySelectorAll('[data-cafe-a-menu-item] .cafe-a-menu-meta .cafe-a-script-en')].filter(visible);
    return {notices:notices.map(e=>({text:e.textContent,color:getComputedStyle(e).color})),descriptionColors:[...new Set(descriptions.map(e=>getComputedStyle(e).color))],secondary:secondary.map(e=>({text:e.textContent,font:getComputedStyle(e).fontFamily})),loaded:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)};
   });
   assert.ok(data.notices.length,'real notice rows are present');assert.ok(data.notices.every(n=>data.descriptionColors.includes(n.color)),'all notice ink matches store or ordinary menu description');
   if(['cafe_mocha_forest_a','fast_food_loop_bagel_a'].includes(key)){
    const font=key==='cafe_mocha_forest_a'?'Carme':'Mogra';assert.ok(data.secondary.length,'secondary names appear without an ON query');assert.ok(data.secondary.every(n=>n.font.startsWith(font)),'English copy uses the requested saved face');assert.ok(data.loaded.some(f=>f.includes(font)),'font file is loaded');
   }
   await p.locator('.cafe-a-typography').evaluate(root=>{root.style.setProperty('--menu-role-supporting-color','#567b69');root.dataset.menuTextColors=`${root.dataset.menuTextColors||''} supporting`;});
   const custom=await p.locator('[data-native-notices],[data-paged-notices],.cafe-a-topline-notice-text,.cafe-a-mobile-notice-list p,.cafe-a-round-focus-notices .cafe-a-menu-description,.cafe-a-round-focus-mobile-notices .cafe-a-menu-description').evaluateAll(es=>es.filter(e=>!e.closest('[inert]')&&e.getBoundingClientRect().width>0).map(e=>getComputedStyle(e).color));
   assert.ok(custom.every(color=>color==='rgb(86, 123, 105)'),'saved supporting color still controls every notice');results.push({kind:'ink-font',key,device,viewport:[w,h],...data});
  }finally{await p.close();}
 });
 for(const key of ['cafe_mocha_forest_a','fast_food_loop_bagel_a'])await run(`catalog defaults ${key}`,async()=>{
  const p=await browser.newPage({viewport:{width:1440,height:1000}});try{
   await p.addInitScript(()=>sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed','1'));
   await p.goto(`${base}/templates/${key}/preview?device=pc`,{waitUntil:'networkidle'});
   const options=p.getByRole('button',{name:/보기 옵션/});if(await options.getAttribute('aria-expanded')==='false')await options.click();
   const toggle=p.getByRole('checkbox',{name:'보조 언어명 보기',exact:true});assert.equal(await toggle.isChecked(),true,'catalog toolbar defaults ON');
   const src=await p.locator('iframe').getAttribute('src');assert.ok(src,'actual catalog iframe is rendered');
   await toggle.uncheck();await p.waitForTimeout(250);assert.equal(await toggle.isChecked(),false);
   const frame=p.frameLocator('iframe');await frame.locator('[data-native-ready="true"]').waitFor();assert.equal(await frame.locator('[data-native-unit] .cafe-a-menu-meta:not([data-cafe-a-reference-copy])').count(),0,'explicit OFF removes actual secondary names');
   results.push({kind:'catalog-default',key,src});
  }finally{await p.close();}
 });
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors},null,2));}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({checked:results.length}));
