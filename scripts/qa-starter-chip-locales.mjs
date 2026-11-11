import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import {chromium} from '@playwright/test';
const base=process.env.STARTER_QA_BASE||'http://127.0.0.1:3027',output=process.env.STARTER_QA_OUTPUT||'/private/tmp/starter-chip-locales';
await fs.mkdir(output,{recursive:true});
await build({stdin:{contents:`export {catalogDesigns} from './lib/catalog-designs.ts';export {buildStarterPreviewData} from './lib/template-starter-preview.ts';export {applyStarterPreviewLocalization} from './lib/template-demo-data/starter-preview-localization.ts';export {getMenuItemBadgeLabel} from './lib/menu-badges.ts';`,resolveDir:process.cwd()},outfile:`${output}/fixtures.mjs`,bundle:true,platform:'node',format:'esm',tsconfig:'tsconfig.json',logLevel:'silent'});
const fixtures=await import(pathToFileURL(`${output}/fixtures.mjs`).href);
const devices=[['pc',1440,900],['tablet',1180,820],['mobile',390,844]],cases=[];
for(const design of fixtures.catalogDesigns)for(const locale of ['en','zh','ja'])for(const [device,width,height]of devices){
 if(process.env.STARTER_QA_DESIGN&&design.id!==process.env.STARTER_QA_DESIGN)continue;
 if(process.env.STARTER_QA_SMOKE&&(design.kind!=='designer'||locale!=='ja'||device==='tablet'))continue;
 cases.push({design,locale,device,width,height});
}
const browser=await chromium.launch(),passed=[],failures=[],errors=[],writes=[];
let cursor=0;
async function worker(){
 while(cursor<cases.length){const c=cases[cursor++],page=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});
 page.on('pageerror',error=>errors.push({id:c.design.id,locale:c.locale,device:c.device,error:error.message}));
 await page.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(writes.push(route.request().url()),route.abort()));
 try{
  const url=new URL(c.design.previewHref,base);for(const [key,value]of Object.entries({device:c.device,view:'actual',lang:c.locale,coverPreview:'off',orderPreview:'off',callPreview:'off'}))url.searchParams.set(key,value);
  // Display opens on an image promotion by default; inspect its real full-menu page.
  if(c.design.service==='display')url.searchParams.set('page','3');
  await page.goto(url.href,{waitUntil:'domcontentloaded'});await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('.cafe-a-typography,.aube-table-root,[data-display-preview-controls-visible]'));
  await page.waitForTimeout(250);
  const localized=fixtures.applyStarterPreviewLocalization(fixtures.buildStarterPreviewData(c.design.templateKey,null,c.design.id),c.locale);
  const expected=new Set([...localized.items.map(item=>fixtures.getMenuItemBadgeLabel(item,c.locale)),...localized.timeSales.map(sale=>sale.badgeText)].filter(Boolean).map(text=>text.replace(/\s+/g,' ').trim().toUpperCase()));
  if(expected.size&&c.design.service!=='dining')await page.waitForFunction(()=>[...document.querySelectorAll('.cafe-a-menu-badge,.cafe-a-featured-badge,.brew-chapter-menu-badge')].some(element=>{const r=element.getBoundingClientRect(),s=getComputedStyle(element);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!element.closest('[inert],[aria-hidden="true"]');}),null,{timeout:15000});
  const chips=await page.locator('.cafe-a-menu-badge,.cafe-a-featured-badge,.brew-chapter-menu-badge').evaluateAll(elements=>elements.filter(element=>{const r=element.getBoundingClientRect(),s=getComputedStyle(element);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&!element.closest('[inert],[aria-hidden="true"]');}).map(element=>({text:element.textContent?.replace(/\s+/g,' ').trim(),soldOut:element.classList.contains('cafe-a-sold-out-chip')})));
  for(const chip of chips){assert.ok(!/[가-힣]/.test(chip.text),`Korean chip: ${chip.text}`);if(!chip.soldOut)assert.ok(expected.has(chip.text.toUpperCase()),`unexpected untranslated chip: ${chip.text}`);}
  const viewport=await page.evaluate(()=>[innerWidth,innerHeight]);assert.deepEqual(viewport,[c.width,c.height]);
  if(c.design.id==='cafe_mocha_forest_a'&&c.locale==='en'&&c.device==='pc')await page.screenshot({path:`${output}/mellow-en-chips.png`});
  if(c.design.id==='cafe_sunday_line_a'&&c.locale==='ja'&&c.device==='mobile')await page.screenshot({path:`${output}/sunday-ja-chips.png`});
  passed.push({id:c.design.id,locale:c.locale,device:c.device,chips:chips.map(chip=>chip.text)});console.log('PASS',JSON.stringify(passed.at(-1)));
 }catch(error){failures.push({id:c.design.id,locale:c.locale,device:c.device,error:error.message});console.log('FAIL',JSON.stringify(failures.at(-1)));await page.screenshot({path:`${output}/failure-${failures.length}.png`});}finally{await page.close();}
 }
}
await Promise.all([worker(),worker()]);await browser.close();await fs.writeFile(`${output}/results.json`,JSON.stringify({passed,failures,errors,writes},null,2));console.log(JSON.stringify({checked:passed.length,failures:failures.length,errors:errors.length,writes:writes.length}));if(failures.length||errors.length||writes.length)process.exitCode=1;
