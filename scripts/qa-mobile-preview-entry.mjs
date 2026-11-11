import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ACTUAL_PREVIEW_QA_BASE||'http://localhost:3192';
const output=process.env.MOBILE_ENTRY_QA_OUTPUT||'/tmp/mobile-preview-entry-qa';
await mkdir(output,{recursive:true});
const browser=await chromium.launch(),errors=[],writes=[],results=[];
const phone={viewport:{width:390,height:844},hasTouch:true,isMobile:true,userAgent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'};
async function context(options=phone){
 const ctx=await browser.newContext({reducedMotion:'reduce',...options});ctx.setDefaultTimeout(30000);
 ctx.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await ctx.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 return ctx;
}
async function settled(page){await page.waitForLoadState('networkidle');await page.evaluate(()=>document.fonts.ready);}
try{
 for(const template of ['cafe_design_a','dining_aube_table_a','display_menu_a']){
  const ctx=await context(),page=await ctx.newPage();
  await page.goto(`${base}/templates/${template}/preview`,{waitUntil:'domcontentloaded'});
  const notice=page.locator('[data-preview-mobile-entry]');await notice.waitFor();await settled(page);
  assert.ok((await notice.innerText()).includes('PC에서 더 편하게 볼 수 있어요'));
  const box=await notice.boundingBox();assert.ok(box.x>=0&&box.y>=0&&box.x+box.width<=390&&box.y+box.height<=844);
  const button=notice.getByRole('button',{name:'모바일로 계속 보기',exact:true});
  assert.ok(await button.evaluate(el=>{const r=el.getBoundingClientRect();return el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),'notice stays above preview tools');
  const frame=page.locator('[data-preview-frame-shell]');const before=await frame.count()?await frame.boundingBox():null;
  let navigations=0;page.on('framenavigated',f=>{if(f!==page.mainFrame())navigations++;});
  await page.screenshot({path:`${output}/${template}-entry.png`});
  await button.click();await notice.waitFor({state:'hidden'});
  if(before){const after=await frame.boundingBox();for(const key of ['x','y','width','height'])assert.ok(Math.abs(before[key]-after[key])<.75,'dismissal preserves mockup geometry');}
  assert.equal(navigations,0,'dismissal cannot reload the menu iframe');
  await page.reload();await settled(page);assert.equal(await notice.count(),0,'one notice per tab session');
  if(template!=='display_menu_a'){
   await page.goto(`${base}/templates/${template}/preview?device=pc`,{waitUntil:'networkidle'});
   assert.equal(await notice.count(),0,'mode changes retain acknowledgement');
  }
  await page.goto(`${base}/templates/${template}/preview?view=actual&embedded=1&detached=1`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-preview-mobile-entry], [data-preview-actual-guide], [data-preview-fullscreen-control]').count(),0,'phone actual tab is menu only');
  results.push(`${template}/phone/session-and-actual`);console.log('PASS',results.at(-1));await ctx.close();
 }
 for(const options of [{viewport:{width:1440,height:900}},{viewport:{width:820,height:1180},hasTouch:true,userAgent:'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/130.0 Safari/537.36'}]){
  const ctx=await context(options),page=await ctx.newPage();await page.goto(`${base}/templates/cafe_design_a/preview`,{waitUntil:'networkidle'});
  assert.equal(await page.locator('[data-preview-mobile-entry]').count(),0,'PC/tablet does not show the phone recommendation');
  results.push(`non-phone/${options.viewport.width}`);console.log('PASS',results.at(-1));await ctx.close();
 }
 for(const [id,blocked]of [['escape',false],['restricted-storage',true]]){
  const ctx=await context();if(blocked)await ctx.addInitScript(()=>{
   const get=Storage.prototype.getItem,set=Storage.prototype.setItem;
   Storage.prototype.getItem=function(key){if(key==='artimenu:mobile-preview-entry:v1')throw new Error('Storage restricted');return get.call(this,key);};
   Storage.prototype.setItem=function(key,value){if(key==='artimenu:mobile-preview-entry:v1')throw new Error('Storage restricted');return set.call(this,key,value);};
  });
  const page=await ctx.newPage();await page.goto(`${base}/templates/cafe_design_a/preview`,{waitUntil:'domcontentloaded'});
  const notice=page.locator('[data-preview-mobile-entry]');await notice.waitFor();
  if(blocked)await notice.getByRole('button',{name:'모바일로 계속 보기',exact:true}).click();else await page.keyboard.press('Escape');
  await notice.waitFor({state:'hidden'});assert.equal(await notice.count(),0);
  results.push(id);console.log('PASS',id);await ctx.close();
 }
}finally{await browser.close();}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
await writeFile(`${output}/report.json`,JSON.stringify({base,results,errors,writes},null,2));console.log(JSON.stringify({checked:results.length,errors,writes}));
