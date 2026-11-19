import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { DEFAULT_DESIGN_REVIEWS } from '../lib/menu-design-policy.ts';
import { getBasicStandardCategories } from '../lib/basic-standard-sample.ts';
// Run with node --import tsx scripts/qa-basic-default-layouts.mjs.
const base = process.env.ORDER_QA_BASE || 'http://localhost:3017';
const output = process.env.ORDER_QA_OUTPUT || '/private/tmp/basic-default-layouts';
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch(), results = [], errors = [], failures = [], writes = [];
const p = await browser.newPage({ reducedMotion: 'reduce' });
p.on('pageerror', e => errors.push(e.message));
await p.route('**/api/**', r => r.request().method() === 'GET' ? r.continue() : (writes.push(r.request().url()), r.abort()));
const structures = DEFAULT_DESIGN_REVIEWS.filter(design => design.layout.startsWith('basic-') && (!process.env.QA_STRUCTURE || design.id === process.env.QA_STRUCTURE)).map(design => design.id);
const sizes = [['pc',1440,900],['pc',1920,1080],['tablet',1180,820],['tablet',820,1180]];
const bounds = () => {
  const rect = e => e ? e.getBoundingClientRect().toJSON() : null;
  const menu = document.querySelector('[data-scroll-menu]');
  const album = document.querySelector('[data-album-grid]');
  const category = document.querySelector('[data-scroll-content] .cafe-a-category-title');
  const title = document.querySelector('[data-basic-top-row] .cafe-a-store-title');
  return { viewport:[innerWidth,innerHeight], outerWidth:document.documentElement.scrollWidth, ready:document.querySelector('[data-paged-ready]')?.dataset.pagedReady,
    brand:rect(document.querySelector('[data-paged-brand]')), header:rect(document.querySelector('[data-basic-top-row]')), actions:rect(document.querySelector('[data-scroll-actions]')),
    menu:rect(menu), scrollHeight:menu.scrollHeight, scrollTop:menu.scrollTop, clientHeight:menu.clientHeight,
    columns:[...document.querySelectorAll('[data-paged-column]')].map(c=>({rect:rect(c),first:rect(c.querySelector("[data-paged-block]")),items:c.querySelectorAll('[data-cafe-a-menu-item]').length})),
    trackCount:album ? getComputedStyle(album).gridTemplateColumns.split(' ').length : document.querySelectorAll('[data-paged-column]').length,
    names:[...document.querySelectorAll('[data-scroll-content] [data-cafe-a-menu-name]')].map(e=>e.textContent),
    headings:[...document.querySelectorAll('[data-scroll-content] .cafe-a-category-title')].map(e=>e.textContent),
    categorySize:category ? parseFloat(getComputedStyle(category).fontSize) : null,
    titleSize:title ? parseFloat(getComputedStyle(title).fontSize) : null,
    fade:document.querySelector('[data-scroll-more]')?.dataset.scrollMore,
    notices:rect(document.querySelector('[data-scroll-menu] [data-paged-notices]')),
    errors:[...document.querySelectorAll('[role="alert"]')].map(e=>e.textContent) };
};
try {
  for (const structure of structures) for (const [device,width,height] of sizes) for (const layoutMode of ['orderedBalancedFit','orderedFit']) {
    const id = `${structure}-${device}-${width}-${layoutMode}`;
    try {
      await p.setViewportSize({width,height});
      await p.goto(`${base}/templates/cafe_design_a/preview?`+new URLSearchParams({design:structure,device,view:'actual',layoutMode,coverPreview:'on',callPreview:'on',orderPreview:'on'}),{waitUntil:'networkidle'});
      await p.evaluate(()=>document.fonts.ready);
      await p.locator('[data-paged-ready="true"]').waitFor({timeout:8000});
      await p.screenshot({path:`${output}/${id}.png`});
      const before=await p.evaluate(bounds);
      assert.deepEqual(before.viewport,[width,height]); assert.equal(before.outerWidth,width); assert.deepEqual(before.errors,[]);
      assert.ok(before.trackCount >= 1 && before.trackCount <= 3, 'readable one-to-three menu tracks');
      const categories = getBasicStandardCategories(!structure.endsWith('-album'));
      assert.deepEqual(before.names, categories.flatMap(category => category.items.map(item => item.name)), 'all starter products keep registered order');
      assert.deepEqual(before.headings, categories.map(category => category.name), 'headings appear once in registered order');
      if(structure==='basic-center-column') {
        if (before.columns.length === 2) {
          assert.ok(before.columns[0].rect.right < before.brand.left && before.columns[1].rect.left > before.brand.right, 'wide center layout has menus on both sides');
        } else {
          assert.equal(before.columns.length, 1);
          assert.ok(before.brand.right < before.columns[0].rect.left, 'narrow center layout places the representative to the left');
        }
      } else if(structure.startsWith('basic-top-row')) {
        assert.ok(before.header.bottom < before.menu.top && before.header.bottom < before.brand.top);
        if (structure !== 'basic-top-row-left-logo') assert.ok(Math.abs(before.titleSize / before.categorySize - 1.3) < .01, 'current top-row category-linked brand size');
      } else if(structure==='basic-upper-left') {
        assert.ok(before.columns[0].first.top >= before.brand.bottom+10,'left menu begins below the scrolling panel');
        assert.ok(before.columns[1].first.top < before.brand.bottom-10,'other columns use the full viewport');
        const imageRatio = await p.locator('.cafe-a-cover-frame').filter({visible:true}).first().evaluate(el=>{const b=el.getBoundingClientRect();return b.width/b.height});
        assert.ok(Math.abs(imageRatio-4/3)<.01,'corner image uses 4:3');
      }
      if(before.scrollHeight>before.clientHeight+2) {
        await p.locator('[data-scroll-menu]').evaluate(e=>e.scrollTop=e.scrollHeight);
        await p.waitForFunction(()=>document.querySelector('[data-scroll-more]').dataset.scrollMore==='false');
        const after=await p.evaluate(bounds);
        if(structure==='basic-upper-left') assert.ok(Math.abs(after.brand.top-before.brand.top+after.scrollTop-before.scrollTop)<1,'corner moves with menu scroll'); else assert.deepEqual(after.brand,before.brand,'representative area stays fixed');assert.deepEqual(after.actions,before.actions,'actions stay fixed');
        if (after.notices) assert.ok(after.notices.bottom<=after.menu.bottom+1,'footer notices are reachable');
      }
      results.push({id,before}); console.log('PASS',id);
    } catch(e) {failures.push({id,error:e.message});await p.screenshot({path:`${output}/${id}-failure.png`});console.log('FAIL',id,e.message.split('\n')[0]);}
  }
  // Each list/album keeps the common mobile reading roles and its own content.
  for(const width of [320,390,430]) {
    for(const structure of structures) {
      await p.setViewportSize({width,height:932});
      await p.goto(`${base}/templates/cafe_design_a/preview?design=${structure}&view=actual&device=mobile&callPreview=on&orderPreview=on`,{waitUntil:'networkidle'});
      await p.evaluate(()=>document.fonts.ready);await p.locator('[data-mobile-brand-fit="ready"]').waitFor();
      const value=await p.locator('[data-cafe-a-menu-item]').filter({visible:true}).evaluateAll(es=>es.map(e=>{
        const name=e.querySelector('[data-cafe-a-menu-name]'),description=e.querySelector('[data-cafe-a-menu-description]');
        return {name:name.textContent,nameSize:parseFloat(getComputedStyle(name).fontSize),descriptionSize:parseFloat(getComputedStyle(description).fontSize)};
      }));
      assert.deepEqual(value.map(item=>item.name),getBasicStandardCategories(!structure.endsWith('-album')).flatMap(category=>category.items.map(item=>item.name)));
      assert.ok(value.every(item=>item.nameSize===16&&item.descriptionSize===14),'independent mobile reading sizes');
      assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth),width,'no horizontal page overflow');
      results.push({id:`${structure}-mobile-${width}`});
    }
  }
} finally {await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
console.log(JSON.stringify({checked:results.length}));
