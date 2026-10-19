import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/basic-default-layouts';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], failures = [], writes = [];
const p = await browser.newPage({ reducedMotion: 'reduce' });
p.on('pageerror', e => errors.push(e.message));
await p.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : (writes.push(r.request().url()), r.abort()));
const structures = ['basic-first-column', 'basic-top-row', 'basic-center-column', 'basic-upper-left'].filter(s=>!process.env.QA_STRUCTURE||s===process.env.QA_STRUCTURE);
const sizes = [['pc',1440,900],['pc',1920,1080],['tablet',1180,820],['tablet',820,1180]];
const bounds = () => {
  const rect = e => e ? e.getBoundingClientRect().toJSON() : null;
  const menu = document.querySelector('[data-scroll-menu]');
  return { viewport:[innerWidth,innerHeight], outerWidth:document.documentElement.scrollWidth, ready:document.querySelector('[data-paged-ready]')?.dataset.pagedReady,
    brand:rect(document.querySelector('[data-paged-brand]')), header:rect(document.querySelector('[data-basic-top-row]')), actions:rect(document.querySelector('[data-scroll-actions]')),
    menu:rect(menu), scrollHeight:menu.scrollHeight, scrollTop:menu.scrollTop, clientHeight:menu.clientHeight,
    columns:[...document.querySelectorAll('[data-paged-column]')].map(c=>({rect:rect(c),first:rect(c.querySelector("[data-paged-block]")),items:c.querySelectorAll('[data-cafe-a-menu-item]').length})),
    names:[...document.querySelectorAll('[data-paged-column] [data-cafe-a-menu-name]')].map(e=>e.textContent),
    headings:[...document.querySelectorAll('[data-paged-column] .cafe-a-category-title')].map(e=>e.textContent),
    fade:document.querySelector('[data-scroll-more]')?.dataset.scrollMore,
    notices:rect(document.querySelector('[data-paged-notices]')),
    errors:[...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent) };
};
try {
  for (const structure of structures) for (const [device,width,height] of sizes) for (const layoutMode of ['orderedBalancedFit','orderedFit']) {
    const id = `${structure}-${device}-${width}-${layoutMode}`;
    try {
      await p.setViewportSize({width,height});
      await p.goto(`${base}/templates/cafe_design_a/preview?`+new URLSearchParams({design:structure,device,view:'actual',layoutMode,callPreview:'on',orderPreview:'on'}),{waitUntil:'networkidle'});
      await p.evaluate(()=>document.fonts.ready);
      await p.locator('[data-paged-ready="true"]').waitFor({timeout:8000});
      await p.screenshot({path:`${output}/${id}.png`});
      const before=await p.evaluate(bounds);
      assert.deepEqual(before.viewport,[width,height]); assert.equal(before.outerWidth,width); assert.deepEqual(before.errors,[]);
      assert.ok(before.columns.length>=2&&before.columns.length<=3);
      assert.equal(before.names.length,18); assert.equal(new Set(before.headings).size,before.headings.length,'headings never repeat');
      if(structure==='basic-center-column') {
        assert.equal(before.columns.length,2);
        assert.ok(before.columns[0].rect.right < before.brand.left && before.columns[1].rect.left > before.brand.right, 'menus lie on both sides of the center brand');
      } else if(structure==='basic-top-row') {
        assert.ok(before.header.bottom < before.menu.top && before.header.bottom < before.brand.top);
        const ratio = await p.locator('[data-scroll-brand-board]').getAttribute('data-fit-header-ratio');
        assert.ok(Number(ratio)>=.08&&Number(ratio)<=.14, 'shared 8–14% header policy');
      } else if(structure==='basic-upper-left') {
        assert.ok(before.columns[0].first.top >= before.brand.bottom+10,'left menu begins below the scrolling panel');
        assert.ok(before.columns[1].first.top < before.brand.bottom-10,'other columns use the full viewport');
        assert.ok(before.brand.height < before.menu.height*.75,'corner is not a full-height rail');
      }
      if(before.scrollHeight>before.clientHeight+2) {
        await p.locator('[data-scroll-menu]').evaluate(e=>e.scrollTop=e.scrollHeight);
        await p.waitForFunction(()=>document.querySelector('[data-scroll-more]').dataset.scrollMore==='false');
        const after=await p.evaluate(bounds);
        if(structure==='basic-upper-left') assert.ok(Math.abs(after.brand.top-before.brand.top+after.scrollTop-before.scrollTop)<1,'corner moves with menu scroll'); else assert.deepEqual(after.brand,before.brand,'representative area stays fixed');assert.deepEqual(after.actions,before.actions,'actions stay fixed');
        assert.ok(after.notices.bottom<=after.menu.bottom+1 || structure==='basic-top-row','notices are reachable');
      }
      results.push({id,before}); console.log('PASS',id);
    } catch(e) {failures.push({id,error:e.message});await p.screenshot({path:`${output}/${id}-failure.png`});console.log('FAIL',id,e.message.split('\n')[0]);}
  }
  // All neutral structures deliberately delegate mobile to the exact approved renderer.
  for(const width of [320,390,430]) {
    let reference;
    for(const structure of structures) {
      await p.setViewportSize({width,height:932});
      await p.goto(`${base}/templates/cafe_design_a/preview?design=${structure}&view=actual&device=mobile&callPreview=on&orderPreview=on`,{waitUntil:'networkidle'});
      await p.evaluate(()=>document.fonts.ready);await p.locator('[data-mobile-brand-fit="ready"]').waitFor();
      const value=await p.locator('[data-cafe-a-menu-item]').filter({visible:true}).evaluateAll(es=>es.map(e=>({text:e.textContent,rect:e.getBoundingClientRect().toJSON()})));
      if(reference)assert.deepEqual(value,reference,'mobile geometry and data are identical across Basic structures');else reference=value;
      results.push({id:`${structure}-mobile-${width}`});
    }
  }
} finally {await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
console.log(JSON.stringify({checked:results.length}));
