import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/real-matcha-fill';
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(), results=[], failures=[], errors=[], writes=[];
const cases=[];
for(const width of [1920,2560]) for(const layoutMode of ['orderedFit','orderedBalancedFit'])
  cases.push({device:'pc',width,height:1080,scenario:'dense',features:true,layoutMode});
for(const [device,width,height] of [['pc',1280,800],['pc',1440,900],['pc',1920,1080],['pc',2560,1440],['tablet',1180,820],['tablet',820,1180],['tablet',768,1024]])
  cases.push({device,width,height,scenario:'',features:true});
for(const scenario of ['sparse','empty','dense','long','images','widgets','long-notices'])
  for(const [device,width,height] of [['pc',1440,900],['tablet',820,1180]])cases.push({device,width,height,scenario,features:true});
for(const [device,width,height] of [['pc',1440,900],['tablet',1180,820],['tablet',820,1180]])cases.push({device,width,height,scenario:'',features:false});
cases.push({device:'tablet',width:1180,height:820,scenario:'long',features:true,rootSize:20});
for(const [device,width,height,scenario] of [['pc',1440,900,''],['pc',1440,900,'widgets'],['tablet',820,1180,'widgets']])
  cases.push({device,width,height,scenario,features:true,layoutMode:'orderedBalancedFit'});
const metrics=()=>{
  const root=document.querySelector('[data-scroll-template]'), menu=document.querySelector('[data-scroll-menu]'), rect=menu.getBoundingClientRect();
  const columns=[...document.querySelectorAll('[data-paged-column]')];
  const scrollContent=root.querySelector('[data-scroll-content]'), columnGrid=root.querySelector('[data-scroll-columns]');
  const style=getComputedStyle(root), dock=root.querySelector('[data-scroll-actions]'), tracks=root.querySelector('[data-paged-column]').parentElement;
  const sides=['paddingTop','paddingRight','paddingBottom','paddingLeft'].map(key=>parseFloat(style[key]));
  const trackRects=columns.map(c=>c.getBoundingClientRect()), brand=root.querySelector('[data-paged-brand]').getBoundingClientRect(), panel=root.querySelector('[data-paged-menu-panel]').getBoundingClientRect();
  const spacing={sides,brandGap:panel.left-brand.right,menuGap:parseFloat(getComputedStyle(menu).columnGap),trackGap:parseFloat(getComputedStyle(tracks).columnGap),
    actualGutters:trackRects.slice(1).map((r,i)=>r.left-trackRects[i].right),dockGap:dock?dock.querySelector('button').getBoundingClientRect().top-rect.bottom:null};
  const name=[...root.querySelectorAll('[data-cafe-a-menu-name]')].find(e=>!e.closest('[aria-hidden=true]'));
  const notices=root.querySelector('[data-paged-notices]');
  const title=root.querySelector('[data-canvas-brand-fit]');
  const gapFailures=[], boundaryBases=[], widgetTopPadding=[];
  for(const block of root.querySelectorAll('[data-paged-column] [data-paged-block]')) {
    const s=getComputedStyle(block), base=parseFloat(s.getPropertyValue('--scroll-base-gap'))||0;
    const last=block.parentElement.nextElementSibling?.matches('[data-paged-notices]')||!block.parentElement.nextElementSibling;
    const expected=last && !block.parentElement.nextElementSibling?.children.length ? 0 : base;
    if(Math.abs(parseFloat(s.paddingBottom)-expected)>.2)gapFailures.push(block.dataset.pagedBlock);
    if(['heading','widget','notices'].includes(block.dataset.nextKind) && expected>0)boundaryBases.push({id:block.dataset.pagedBlock,next:block.dataset.nextKind,base});
    if(block.dataset.kind==='widget')widgetTopPadding.push(parseFloat(s.paddingTop));
  }
  const footerColumn=notices.closest('[data-paged-column]');
  const finalBlock=[...footerColumn.querySelectorAll('[data-paged-block]')].at(-1);
  const noticeGap=finalBlock&&notices.children.length ? notices.getBoundingClientRect().top-(finalBlock.getBoundingClientRect().bottom-parseFloat(getComputedStyle(finalBlock).paddingBottom)) : null;
  return {viewport:[innerWidth,innerHeight],rootRem:parseFloat(getComputedStyle(document.documentElement).fontSize),size:parseFloat(style.getPropertyValue('--scroll-item-size')),
    spacing,font:name?getComputedStyle(name).fontSize:null,brandTarget:title?.dataset.canvasBrandTarget,brandLayout:title?.dataset.canvasBrandLayout,
    contentHeight:Number(root.dataset.scrollContentHeight),
    safePadding:parseFloat(getComputedStyle(scrollContent).paddingBottom),contentBelow:columnGrid.getBoundingClientRect().bottom-rect.bottom,
    region:{width:rect.width,height:rect.height,scroll:menu.scrollHeight-menu.clientHeight},more:root.dataset.scrollMore,gapFailures,boundaryBases,widgetTopPadding,noticeGap,
    footerColumn:notices.closest('[data-paged-column]').dataset.pagedColumn,noticeHeight:notices.getBoundingClientRect().height,
    noticeFont:notices.querySelector('.cafe-a-script-en')?getComputedStyle(notices.querySelector('.cafe-a-script-en')).fontFamily:null,koFont:style.getPropertyValue('--menu-font-ko').trim(),
    columns:columns.map(c=>({width:c.getBoundingClientRect().width,top:c.getBoundingClientRect().top,natural:Number(c.dataset.scrollNaturalHeight),
      ids:[...c.querySelectorAll('[data-paged-block]')].map(e=>e.dataset.pagedBlock),bottom:Math.max(c.getBoundingClientRect().top,...[...c.querySelectorAll('[data-paged-block]')].map(e=>e.getBoundingClientRect().bottom))})),
    expected:[...root.querySelectorAll('[data-measure-id]')].map(e=>e.dataset.measureId),outer:[document.documentElement.scrollWidth,document.documentElement.scrollHeight]};
};
try{
  for(const c of cases){const p=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));
    await p.route('**/api/public-menu/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
    try{
      await p.goto(`${base}/templates/cafe_real_matcha_paged_test/preview?`+new URLSearchParams({device:c.device,view:'actual',embedded:'1',layoutMode:c.layoutMode||'orderedFit',pageTest:c.scenario,callPreview:c.features?'on':'off',orderPreview:c.features?'on':'off'}), {waitUntil:'networkidle'});
      await p.evaluate(()=>document.fonts.ready);await p.waitForSelector('[data-paged-ready=true]');await p.waitForSelector('[data-canvas-brand-fit=ready]');
      if(c.rootSize)await p.evaluate(n=>document.documentElement.style.fontSize=n+'px',c.rootSize);
      await p.waitForTimeout(350);
      const a=await p.evaluate(metrics);await p.waitForTimeout(150);const stable=await p.evaluate(metrics);
      assert.deepEqual(a,stable,'fonts, measurement and column plan must settle without oscillation');
      assert.deepEqual(a.viewport,[c.width,c.height]);assert.ok(a.outer[0]<=c.width+1&&a.outer[1]<=c.height+1);assert.deepEqual(a.gapFailures,[]);
      assert.ok(a.boundaryBases.every(b=>Math.abs(b.base-a.boundaryBases[0].base)<.2),'category, widget and notice transitions share one semantic gap');
      assert.ok(a.widgetTopPadding.every(padding=>padding<.1),'widgets do not add an unrelated leading gap');
      if(a.noticeGap!==null)assert.ok(Math.abs(a.noticeGap-a.boundaryBases[0].base)<.3,'visible notice clearance follows the category gap');
      const inset=a.spacing.sides[0];
      const vmin=Math.min(c.width,c.height),expectedInset=c.width>=1024?Math.max(2*a.rootRem,Math.min(.042*vmin,4.25*a.rootRem)):Math.max(1.25*a.rootRem,Math.min(.03*vmin,2*a.rootRem));
      assert.ok(Math.abs(inset-expectedInset)<.15,'outer inset follows the original responsive board rule');
      assert.ok(a.spacing.sides.every(side=>Math.abs(side-inset)<.1),'one page inset on all four sides');
      for(const gap of [a.spacing.brandGap,a.spacing.menuGap,a.spacing.trackGap,...a.spacing.actualGutters])assert.ok(Math.abs(gap-inset)<.15,'actual brand/menu gutters equal the page inset');
      if(a.spacing.dockGap!==null){
        const safeGap=Math.max(.875*a.rootRem,Math.min(inset*.75,1.25*a.rootRem));
        assert.ok(Math.abs(a.spacing.dockGap-safeGap)<.15,'fixed dock clearance follows the page inset within modest rem bounds');
        assert.ok(a.spacing.dockGap<=inset+.1,'dock clearance never exceeds the page inset');
      }
      assert.deepEqual(a.columns.flatMap(col=>col.ids),a.expected,'every heading/item/widget once in source order');
      assert.equal(Number(a.brandTarget),.75,'representative title retains the shared 75% width target');
      assert.equal(a.brandLayout,'brand-column');
      assert.equal(a.more,a.contentBelow>2?'true':'false');
      if(c.layoutMode!=='orderedBalancedFit')assert.ok(Math.abs(a.safePadding-inset)<.15,'fill-only trailing safe area equals the page inset');
      else assert.equal(a.safePadding,0,'grouped mode retains its existing bottom edge');
      if(a.expected.length){assert.ok(a.columns.every(col=>col.ids.length>0));assert.equal(Number(a.footerColumn),a.columns.length);}
      assert.ok(a.columns.length <= 4);
      if(a.columns.length===4)assert.ok(a.columns.every(col=>col.width>=12*a.rootRem-.1),'four readable tracks fit after brand and gutters');
      assert.ok(a.size>=a.rootRem-.01&&a.size<=a.rootRem*(c.device==='pc'?1.35:1.3)+.01);
      assert.ok(Math.max(...a.columns.map(col=>col.top))-Math.min(...a.columns.map(col=>col.top))<.1,'all columns share one top alignment');
      if(c.scenario==='dense'||c.scenario==='long')assert.ok(a.region.scroll>2,'excess content remains scrollable');
      if(c.scenario==='sparse'||c.scenario==='empty'){assert.equal(a.region.scroll,0);assert.equal(a.more,'false');assert.equal(a.columns.length,1);}
      if(c.layoutMode!=='orderedBalancedFit')assert.ok(Math.abs(a.size-a.rootRem*(c.device==='pc'?1.35:1.3))<.02,'fill uses a stable device-scale font instead of content-driven shrink');
      if(a.noticeFont)assert.equal(a.noticeFont.replaceAll(/['"]/g,''),a.koFont.replaceAll(/['"]/g,''),'notices retain the saved Korean font for English too');
      if(!c.scenario)await p.screenshot({path:`${output}/${c.device}-${c.width}-${c.features}-top.png`});
      const beforeDock=await p.locator('[data-scroll-actions]').count()?await p.locator('[data-scroll-actions]').boundingBox():null;
      const beforeBrand=await p.locator('[data-paged-brand]').boundingBox();
      await p.locator('[data-scroll-menu]').evaluate(e=>e.scrollTop=e.scrollHeight);await p.waitForTimeout(100);
      assert.equal(await p.locator('[data-scroll-template]').getAttribute('data-scroll-more'),'false');
      assert.deepEqual(await p.locator('[data-paged-brand]').boundingBox(),beforeBrand);
      if(beforeDock)assert.deepEqual(await p.locator('[data-scroll-actions]').boundingBox(),beforeDock);
      if(!c.scenario)await p.screenshot({path:`${output}/${c.device}-${c.width}-${c.features}-bottom.png`});
      results.push({...c,...a});console.log('PASS',c.device,c.width,c.scenario||'default',a.size,a.columns.length,a.region.scroll);
    }catch(e){failures.push({...c,error:e.message});console.log('FAIL',c.device,c.width,c.scenario,e.message);}finally{await p.close();}}
  assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
  for(const count of [1,2,3,4])assert.ok(results.some(r=>r.columns.length===count),`actual adaptive ${count}-column case`);
}finally{await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
console.log(JSON.stringify({passed:results.length,failures,errors,writes}));
