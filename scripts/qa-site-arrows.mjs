import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.ARROW_QA_BASE || 'http://localhost:3000';
const out = process.env.ARROW_QA_OUT || '/tmp/site-arrow-qa';
await mkdir(out, { recursive: true });
const browser = await chromium.launch();
const results=[];
try {
for (const width of [375, 768, 1440, 2560]) {
 const page = await browser.newPage({ viewport:{width,height:1000}, reducedMotion:'reduce' });
 const errors=[];page.on('pageerror', e=>errors.push(e.message));
 await page.goto(`${base}/design-system`, {waitUntil:'networkidle'});
 await page.evaluate(()=>document.fonts.ready);
 if (width < 768) {const notice=page.getByRole('dialog').filter({hasText:'위치 편집은 PC에서 해 주세요'});await expect(notice).toBeVisible({timeout:15000});await notice.getByRole('button',{name:'확인',exact:true}).click();await expect(notice).toBeHidden();}
 await page.locator('#site-arrows').scrollIntoViewIfNeeded();
 const icons=await page.locator('#site-arrows svg[data-site-arrow]').evaluateAll(els=>els.map(el=>{
  const r=el.getBoundingClientRect();const p=el.querySelector('path');return {kind:el.dataset.siteArrow,direction:el.dataset.direction,width:r.width,height:r.height,fill:getComputedStyle(p).fill,stroke:getComputedStyle(p).stroke,linecap:getComputedStyle(p).strokeLinecap};
 }));
 assert.equal(icons.length,38);assert.equal(icons.filter(i=>i.kind==='shaft'&&i.linecap==='butt').length,14);
 assert.equal(icons.filter(i=>i.kind==='chevron'&&i.fill!=='none').length,4);
 await page.locator('#site-arrows').screenshot({path:`${out}/arrows-${width}.png`});
 const bounds = await page.locator('#site-arrows svg[data-site-arrow]').evaluateAll(els => els.map(el => { const s=el.getBoundingClientRect(); const paths=[...el.querySelectorAll('path')].map(path=>path.getBoundingClientRect()); return {kind:el.dataset.siteArrow,direction:el.dataset.direction,inside:paths.every(p=>p.left>=s.left-.1&&p.right<=s.right+.1&&p.top>=s.top-.1&&p.bottom<=s.bottom+.1)}; }));
 assert.ok(bounds.every(b=>b.inside),JSON.stringify(bounds.filter(b=>!b.inside)));
 const select=page.locator('button[role="combobox"]').first();
 await select.scrollIntoViewIfNeeded();await select.focus();await page.keyboard.press('Enter');
 await expect(select).toHaveAttribute('data-state','open');
 await page.keyboard.press('Escape');await expect(select).toHaveAttribute('data-state','closed');
 assert.ok(await select.evaluate(el=>el===document.activeElement));
 const selectIcon=select.locator('[data-site-arrow="chevron"]');assert.equal(await selectIcon.count(),1);
 const pagination=page.getByRole('navigation',{name:'게시글 페이지 예시'});await pagination.scrollIntoViewIfNeeded();
 await pagination.getByRole('button',{name:'다음 페이지',exact:true}).filter({visible:true}).click();
 await expect(pagination.locator('[aria-current="page"]').filter({visible:true})).toHaveAttribute('aria-label','2페이지');
 await page.goto(`${base}/templates`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const template=await page.evaluate(()=>({viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,arrows:document.querySelectorAll('[data-site-arrow]').length,legacy:document.querySelectorAll('svg.lucide-arrow-up-right').length}));
 assert.equal(template.overflow,0);assert.equal(template.legacy,0);assert.ok(template.arrows>0);
 await page.screenshot({path:`${out}/templates-${width}.png`});
 const native=page.locator('select').first();
 if(await native.count()) assert.ok((await native.evaluate(el=>getComputedStyle(el).backgroundImage)).includes('/icons/site-chevron-down.svg'));
 await page.goto(base,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const home=await page.evaluate(()=>({viewport:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,arrows:document.querySelectorAll('[data-site-arrow]').length,legacy:document.querySelectorAll('svg[class*="lucide-arrow-"],svg[class*="lucide-chevron-"]').length}));
 assert.equal(home.overflow,0);assert.equal(home.legacy,0);assert.ok(home.arrows>0);
 // Footer disclosures retain their native keyboard toggle and new chevron.
 if(width===375){
  const summary=page.locator('footer summary').first();await summary.scrollIntoViewIfNeeded();await summary.focus();await page.keyboard.press('Enter');
  assert.ok(await summary.evaluate(el=>el.parentElement.open));await page.keyboard.press('Enter');assert.equal(await summary.evaluate(el=>el.parentElement.open),false);
 }
 assert.deepEqual(errors,[]);results.push({width,icons,template,home,errors});await page.close();
}
// Actual customer artwork must contain none of the site SVG family, even on preview pages.
for (const key of ['cafe_van_gogh_a','dining_aube_table_a']) {
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto(`${base}/templates/${key}/preview?device=pc&view=actual&embedded=1`,{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const artwork=page.locator('[data-template-artwork],.menu-typography,.aube-table-root,[data-native-ready=true]');
 await expect(artwork.first()).toBeVisible({timeout:20000});
 assert.equal(await artwork.locator('[data-site-arrow]').count(),0);
 results.push({key,artworkCount:await artwork.count(),siteArrowLeaks:0});await page.close();
}
await writeFile(`${out}/results.json`,JSON.stringify({base,results},null,2));console.log(JSON.stringify({base,widths:[375,768,1440,2560],passed:results.length,out}));
} finally {await browser.close();}
