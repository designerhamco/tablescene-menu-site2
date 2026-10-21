import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base=process.env.CATALOG_QA_BASE_URL||'http://127.0.0.1:3000';
const output=process.env.CATALOG_QA_OUTPUT||'/private/tmp/catalog-design-access';
await mkdir(output,{recursive:true});
const browser=await chromium.launch({headless:true});
const results=[];
try {
 if(process.env.CAPTURE_CATALOG_DEFAULTS==='1'){
  const ids=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album','dining-full-page','dining-sidebar','dining-full-page-album','dining-sidebar-album'];
  const page=await browser.newPage({viewport:{width:1200,height:900},deviceScaleFactor:1,reducedMotion:'reduce'});
  for(const id of ids){
   const renderer=id.startsWith('basic')?'cafe_design_a':id.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a';
   const query=new URLSearchParams({design:id,view:'actual',embedded:'1',device:'tablet',layoutMode:'orderedBalancedFit',coverPreview:'off'});
   const response=await page.goto(`${base}/templates/${renderer}/preview?${query}`,{waitUntil:'networkidle',timeout:90000});assert.equal(response.status(),200);
   await page.evaluate(()=>document.fonts.ready);if(id.startsWith('dining-'))await page.getByRole('button',{name:id.includes('sidebar')?'A La Carte Menu':'A La Carte Menu 페이지로 이동',exact:true}).first().click();await page.waitForTimeout(1200);
   await page.addStyleTag({content:'nextjs-portal { display: none !important; }'});
   await page.screenshot({path:`public/template-previews/default-${id}.jpg`,type:'jpeg',quality:85});
   results.push({capture:id,viewport:await page.evaluate(()=>({width:innerWidth,height:innerHeight})),title:await page.title()});
  }
  await page.close();
 }
 for(const width of [320,390,430,820,1024,1440]){
  console.log('checking viewport',width);
  const page=await browser.newPage({viewport:{width,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
  let favorites=[];
  await page.route('**/api/template-favorites',async route=>{
   if(route.request().method()==='PATCH'){const {id,liked}=route.request().postDataJSON();favorites=favorites.filter(v=>v!==id);if(liked)favorites.unshift(id);}
   await route.fulfill({json:{authenticated:true,favorites}});
  });
  assert.equal((await page.goto(`${base}/apply`,{waitUntil:'networkidle',timeout:90000})).status(),200);
  await page.evaluate(()=>document.fonts.ready);
  await expect(page.locator('[data-catalog-design]')).toHaveCount(6);
  await expect(page.locator('.site-catalog-plan')).toContainText('4,900원');
  const basic=page.getByRole('group',{name:'기본 디자인 유형 선택'});
  await basic.getByRole('button',{name:'앨범형',exact:true}).click();await expect(page.locator('[data-catalog-design]')).toHaveCount(2);
  const heart=page.locator('.site-catalog-heart').first();await expect(heart).toBeEnabled();await heart.click();await expect(heart).toHaveAttribute('aria-pressed','true');
  await page.reload({waitUntil:'networkidle'});await expect(page.locator('.site-catalog-heart').first()).toHaveAttribute('aria-pressed','true');
  await page.locator('.site-catalog-heart').first().click();await expect(page.locator('.site-catalog-heart').first()).toHaveAttribute('aria-pressed','false');
  await page.getByRole('button',{name:'디자인 템플릿',exact:true}).click();await expect(page.locator('.site-catalog-plan')).toContainText('6,800원');
  await expect(page.locator('[data-catalog-design]')).toHaveCount(6);
  await page.getByRole('button',{name:'다음 템플릿 페이지',exact:true}).click();await expect(page.locator('[data-catalog-design]')).toHaveCount(1);
  await page.getByRole('group',{name:'디자인 템플릿 업종 선택'}).getByRole('button',{name:'일식',exact:true}).click();await expect(page.getByText('일식 템플릿 준비 중',{exact:true})).toBeVisible();
  await page.getByRole('tab',{name:'다이닝',exact:true}).click();await expect(page.locator('.site-catalog-plan')).toContainText('8,800원');await expect(page.locator('[data-catalog-design]')).toHaveCount(2);
  await page.getByRole('button',{name:'기본 디자인',exact:true}).click();await expect(page.locator('.site-catalog-plan')).toContainText('6,900원');await expect(page.locator('[data-catalog-design]')).toHaveCount(4);
  await expect.poll(()=>page.locator('.site-catalog-image').evaluateAll(imgs=>imgs.every(img=>img.complete&&img.naturalWidth>0)),{timeout:15000}).toBe(true);
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth-innerWidth),{timeout:10000}).toBe(0);
  const geometry=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},overflow:document.documentElement.scrollWidth-innerWidth,actions:[...document.querySelectorAll('[data-catalog-design]')].map(c=>({buttons:c.querySelectorAll('.site-template-actions a').length,heart:c.querySelector('.site-catalog-heart').getBoundingClientRect().width,img:c.querySelector('img').naturalWidth}))}));
  assert.equal(geometry.overflow,0);assert.equal(geometry.viewport.width,width);for(const card of geometry.actions){assert.equal(card.buttons,2);assert.ok(card.heart>=40);assert.ok(card.img>0);}
  await page.screenshot({path:`${output}/catalog-${width}.png`,fullPage:true});
  await page.getByRole('tab',{name:'디스플레이',exact:true}).click();await expect(page.locator('[data-catalog-design]')).toHaveCount(1);await expect(page.locator('.site-catalog-plan')).toContainText('준비 중');
  await page.getByRole('tab',{name:'베이직',exact:true}).click();await page.getByRole('tab',{name:'베이직',exact:true}).focus();await page.keyboard.press('ArrowRight');await expect(page.getByRole('tab',{name:'다이닝',exact:true})).toBeFocused();
  assert.deepEqual(errors,[]);results.push({width,...geometry,errors});await page.close();
 }
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 for(const id of ['basic-first-column','basic-top-row-album','dining-full-page','dining-sidebar-album','cafe_mocha_forest_a']){
   assert.equal((await page.goto(`${base}/templates/${id}`,{waitUntil:'networkidle'})).status(),200);
   await expect(page.getByRole('link',{name:'이 디자인으로 시작'})).toHaveAttribute('href',new RegExp(`design=${id}`));
   await expect(page.getByText('메뉴판 1개 · 월 구독',{exact:true})).toBeVisible();
 }
 assert.equal((await page.request.patch(`${base}/api/template-favorites`,{headers:{Origin:base},data:{id:'basic-first-column',liked:true}})).status(),401);
 assert.equal((await page.request.patch(`${base}/api/menu-design`,{headers:{Origin:base},data:{menuId:'00000000-0000-0000-0000-000000000000',designId:'basic-first-column'}})).status(),401);
 await page.goto(`${base}/apply/basic?product=business_basic_single_monthly&template=cafe_design_a&design=basic-first-column`,{waitUntil:'networkidle'});
 assert.ok(new URL(page.url()).pathname.includes('sign-in'));
 await page.close();
 await writeFile(`${output}/results.json`,JSON.stringify(results,null,2));console.log(JSON.stringify({passed:true,viewports:results.length,output}));
}finally{await browser.close();}
