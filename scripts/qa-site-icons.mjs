import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.ICON_QA_BASE || 'http://localhost:3003';
const out = process.env.ICON_QA_OUT || '/tmp/site-icon-qa';
await mkdir(out, {recursive:true});
const browser = await chromium.launch();
const results=[];
try {
 for(const width of [375,768,1440,2560]) {
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${base}/design-system`,{waitUntil:'networkidle'});
  await page.evaluate(()=>document.fonts.ready);
  if(width<768) {const notice=page.getByRole('dialog').filter({hasText:'위치 편집은 PC에서 해 주세요'});await expect(notice).toBeVisible({timeout:15000});await notice.getByRole('button',{name:'확인',exact:true}).click();}
  const gallery=page.locator('#site-icons');await gallery.scrollIntoViewIfNeeded();
  const glyphs=await gallery.locator('[data-site-icon-example] svg').evaluateAll(els=>els.map(el=>{
   const box=el.getBBox();return {name:el.dataset.siteIcon,source:el.dataset.iconSource,inside:box.x>=-.01&&box.y>=-.01&&box.x+box.width<=24.01&&box.y+box.height<=24.01,visible:box.width>0&&box.height>0};
  }));
  assert.ok(glyphs.length>=100);assert.equal(new Set(glyphs.map(g=>g.name)).size,glyphs.length);
  assert.ok(glyphs.every(g=>g.inside&&g.visible&&g.source==='remix'),JSON.stringify(glyphs.filter(g=>!g.inside||!g.visible)));
  assert.equal(await page.locator('svg[class*="lucide-"]').count(),0);
  const like=page.getByRole('button',{name:'좋아요 예시',exact:true});await like.scrollIntoViewIfNeeded();
  await expect(like).toHaveAttribute('aria-pressed','false');await expect(like.locator('svg')).toHaveAttribute('data-filled','false');
  const outline=await like.locator('path').getAttribute('d');await like.click();
  await expect(like).toHaveAttribute('aria-pressed','true');await expect(like.locator('svg')).toHaveAttribute('data-filled','true');
  assert.notEqual(await like.locator('path').getAttribute('d'),outline);
  await like.focus();await page.keyboard.press('Space');await expect(like).toHaveAttribute('aria-pressed','false');
  const switchMetrics=[];
  for(const surface of ['white','muted','dark']) {
   const panel=page.locator(`[data-switch-example="${surface}"]`);
   const switches=panel.getByRole('switch');
   for(let i=0;i<await switches.count();i++) {
    const control=switches.nth(i);const m=await control.evaluate(el=>{
     const r=el.getBoundingClientRect(),t=el.querySelector('.site-switch-track').getBoundingClientRect(),h=el.querySelector('.site-switch-thumb').getBoundingClientRect();
     return {size:el.dataset.size,target:[r.width,r.height],track:[t.width,t.height],thumb:[h.width,h.height],inside:h.left>=t.left&&h.right<=t.right&&h.top>=t.top&&h.bottom<=t.bottom,disabled:el.disabled,loading:el.hasAttribute('data-loading')};
    });
    const scale=width>1600?Math.min(1.125,1+(width-1600)/800*.125):1;
    // Browser CSS uses rem-based site controls; compare geometry independent of root scale.
    assert.ok(m.target[0]>=44&&m.target[1]>=44);assert.ok(m.inside);
    assert.ok(Math.abs(m.thumb[0]/m.track[1]-(m.size==='sm'?14/20:18/24))<.01);
    if(m.loading) {await expect(control).toHaveAttribute('aria-busy','true');await expect(control).toBeDisabled();}
    switchMetrics.push({...m,scale});
   }
   const control=switches.first();await control.scrollIntoViewIfNeeded();await control.focus();
   await page.keyboard.press('Space');await expect(control).toHaveAttribute('aria-checked','true');
   const after=await control.evaluate(el=>{const t=el.querySelector('.site-switch-track').getBoundingClientRect(),h=el.querySelector('.site-switch-thumb').getBoundingClientRect();return h.right<=t.right&&h.left>=t.left;});assert.ok(after);
   await page.keyboard.press('Enter');await expect(control).toHaveAttribute('aria-checked','false');
  }
  await gallery.scrollIntoViewIfNeeded();await gallery.screenshot({path:`${out}/icons-${width}.png`});
  await page.locator('[data-switch-example="white"]').screenshot({path:`${out}/switch-${width}.png`});
  assert.ok(await gallery.evaluate(el=>{const r=el.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
  // Existing new-window and tooltip geometry stay independent of Remix.
  assert.ok(await page.locator('[data-site-arrow="shaft"][data-direction="up-right"]').count()>0);
  await page.getByRole('button',{name:'팝업 글자 확인',exact:true}).click();
  const dialog=page.getByRole('dialog').filter({hasText:'안내를 확인해 주세요'});await expect(dialog).toBeVisible();
  await expect(dialog.locator('svg[data-site-icon="close-line"]')).toBeVisible();await page.keyboard.press('Escape');await expect(dialog).toBeHidden();
  for(const route of ['/templates','/support/chat','/services/order']) {
   await page.goto(`${base}${route}`,{waitUntil:'networkidle'});
   assert.equal(await page.locator('svg[class*="lucide-"]').count(),0,route);
   assert.ok(await page.locator('[data-site-icon]').count()>0,route);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),0,route);
  }
  results.push({width,glyphs:glyphs.length,switches:switchMetrics,errors});assert.deepEqual(errors,[]);await page.close();
 }
 for(const template of ['cafe_van_gogh_a','dining_aube_table_a']) {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  await page.goto(`${base}/templates/${template}/preview?device=pc&view=actual&embedded=1`,{waitUntil:'networkidle'});
  await page.waitForSelector('.menu-typography,.aube-table-root,[data-native-ready="true"],[data-template-artwork]',{timeout:30000});
  assert.equal(await page.locator('.menu-typography [data-site-icon],.aube-table-root [data-site-icon],[data-template-artwork] [data-site-icon]').count(),0);
  results.push({template,siteIconsInArtwork:0});await page.close();
 }
 await writeFile(`${out}/results.json`,JSON.stringify(results,null,2));
 console.log(`PASS ${results.length} cases: responsive Remix glyphs, favorite state, switch geometry/keyboard/loading, dialog close, preserved arrows, independent menu artwork.`);
} finally {await browser.close();}
