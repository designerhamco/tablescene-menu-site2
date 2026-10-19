import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/real-matcha-fill';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(), results=[], failures=[], errors=[], writes=[];
const cases=[];
for(const [device,width,height] of [['pc',1280,800],['pc',1440,900],['pc',1920,1080],['pc',2560,1440],['tablet',1180,820],['tablet',820,1180],['tablet',768,1024]])
  cases.push({device,width,height,scenario:'',features:true});
for(const scenario of ['sparse','empty','dense','long','images','widgets','long-notices'])
  for(const [device,width,height] of [['pc',1440,900],['tablet',820,1180]])cases.push({device,width,height,scenario,features:true});
for(const [device,width,height] of [['pc',1440,900],['tablet',1180,820],['tablet',820,1180]])cases.push({device,width,height,scenario:'',features:false});
cases.push({device:'tablet',width:1180,height:820,scenario:'long',features:true,rootSize:20});
const metrics=()=>{
  const root=document.querySelector('[data-scroll-template]'), menu=document.querySelector('[data-scroll-menu]'), rect=menu.getBoundingClientRect();
  const columns=[...document.querySelectorAll('[data-paged-column]')];
  const style=getComputedStyle(root), name=[...root.querySelectorAll('[data-cafe-a-menu-name]')].find(e=>!e.closest('[aria-hidden=true]'));
  const notices=root.querySelector('[data-paged-notices]');
  const gapFailures=[];
  for(const block of root.querySelectorAll('[data-paged-column] [data-paged-block]')) {
    const s=getComputedStyle(block), base=parseFloat(s.getPropertyValue('--scroll-base-gap'))||0;
    const scale=Number(block.closest('[data-paged-column]').dataset.scrollGapScale);
    const last=block.parentElement.nextElementSibling?.matches('[data-paged-notices]')||!block.parentElement.nextElementSibling;
    const expected=last ? (block.parentElement.nextElementSibling?.children.length ? base : 0) : base*scale;
    if(Math.abs(parseFloat(s.paddingBottom)-expected)>.2)gapFailures.push(block.dataset.pagedBlock);
  }
  return {viewport:[innerWidth,innerHeight],rootRem:parseFloat(getComputedStyle(document.documentElement).fontSize),size:parseFloat(style.getPropertyValue('--scroll-item-size')),
    font:name?getComputedStyle(name).fontSize:null, contentHeight:Number(root.dataset.scrollContentHeight),topInset:Number(root.dataset.scrollCentering),
    region:{width:rect.width,height:rect.height,scroll:menu.scrollHeight-menu.clientHeight},more:root.dataset.scrollMore,gapFailures,
    footerColumn:notices.closest('[data-paged-column]').dataset.pagedColumn,noticeHeight:notices.getBoundingClientRect().height,
    noticeFont:notices.querySelector('.cafe-a-script-en')?getComputedStyle(notices.querySelector('.cafe-a-script-en')).fontFamily:null,koFont:style.getPropertyValue('--menu-font-ko').trim(),
    columns:columns.map(c=>({width:c.getBoundingClientRect().width,top:c.getBoundingClientRect().top,scale:Number(c.dataset.scrollGapScale),natural:Number(c.dataset.scrollNaturalHeight),
      ids:[...c.querySelectorAll('[data-paged-block]')].map(e=>e.dataset.pagedBlock),bottom:Math.max(c.getBoundingClientRect().top,...[...c.querySelectorAll('[data-paged-block]')].map(e=>e.getBoundingClientRect().bottom))})),
    expected:[...root.querySelectorAll('[data-measure-id]')].map(e=>e.dataset.measureId),outer:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};
};
try{
  for(const c of cases){const p=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/api/public-menu/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
    try{
      await p.goto(`${base}/templates/cafe_real_matcha_paged_test/preview?`+new URLSearchParams({device:c.device,view:'actual',embedded:'1',layoutMode:'orderedFit',pageTest:c.scenario,callPreview:c.features?'on':'off',orderPreview:c.features?'on':'off'}));
      await p.evaluate(()=>document.fonts.ready);await p.waitForSelector('[data-paged-ready=true]');
      if(c.rootSize)await p.evaluate(n=>document.documentElement.style.fontSize=n+'px',c.rootSize);
      await p.waitForTimeout(350);
      const a=await p.evaluate(metrics);await p.waitForTimeout(150);const stable=await p.evaluate(metrics);
      assert.deepEqual(a,stable,'fonts, measurement and column plan must settle without oscillation');
      assert.deepEqual(a.viewport,[c.width,c.height]);assert.ok(a.outer[0]<=c.width+1&&a.outer[1]<=c.height+1);assert.deepEqual(a.gapFailures,[]);
      assert.deepEqual(a.columns.flatMap(col=>col.ids),a.expected,'every heading/item/widget once in source order');
      assert.equal(a.more,a.region.scroll>2?'true':'false');assert.ok(a.columns.every(col=>col.scale>=1&&col.scale<=1.60001));
      if(a.expected.length){assert.ok(a.columns.every(col=>col.ids.length>0));assert.equal(Number(a.footerColumn),a.columns.length);}
      assert.ok(a.size>=a.rootRem-.01&&a.size<=a.rootRem*(c.device==='pc'?1.35:1.3)+.01);
      assert.ok(Math.max(...a.columns.map(col=>col.top))-Math.min(...a.columns.map(col=>col.top))<.1,'all columns share one top alignment');
      if(a.topInset>0)assert.ok(Math.abs(a.topInset-(a.region.height-a.contentHeight)/2)<.1,'bounded sparse content centers as one composition');
      if(c.scenario==='dense'||c.scenario==='long')assert.ok(a.region.scroll>2,'excess content remains scrollable');
      if(c.scenario==='sparse'||c.scenario==='empty'){assert.equal(a.region.scroll,0);assert.equal(a.more,'false');assert.equal(a.columns.length,1);}
      if(c.scenario===''&&c.width===1440){assert.equal(a.region.scroll,0);assert.ok(a.columns[0].bottom-a.columns[0].top>=a.region.height*.95,'fill uses the actual reading height');}
      if(a.noticeFont)assert.equal(a.noticeFont.replaceAll(/['"]/g,''),a.koFont.replaceAll(/['"]/g,''),'notices retain the saved Korean font for English too');
      const beforeDock=await p.locator('[data-scroll-actions]').count()?await p.locator('[data-scroll-actions]').boundingBox():null;
      const beforeBrand=await p.locator('[data-paged-brand]').boundingBox();
      await p.locator('[data-scroll-menu]').evaluate(e=>e.scrollTop=e.scrollHeight);await p.waitForTimeout(100);
      assert.equal(await p.locator('[data-scroll-template]').getAttribute('data-scroll-more'),'false');
      assert.deepEqual(await p.locator('[data-paged-brand]').boundingBox(),beforeBrand);
      if(beforeDock)assert.deepEqual(await p.locator('[data-scroll-actions]').boundingBox(),beforeDock);
      if(!c.scenario)await p.screenshot({path:`${output}/${c.device}-${c.width}-${c.features}.png`});
      results.push({...c,...a});console.log('PASS',c.device,c.width,c.scenario||'default',a.size,a.columns.length,a.region.scroll);
    }catch(e){failures.push({...c,error:e.message});console.log('FAIL',c.device,c.width,c.scenario,e.message);}finally{await p.close();}}
  assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
}finally{await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors,writes}));
