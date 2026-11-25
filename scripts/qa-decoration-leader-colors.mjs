import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base=process.env.LEADER_QA_BASE||'http://127.0.0.1:3201',out=process.env.LEADER_QA_OUTPUT||'/private/tmp/artimenu-leader-qa';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),errors=[],writes=[],results=[];
const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','fast_food_loop_bagel_a','restaurant_onue_a'];
const url=(key,device,draft,options={})=>base+'/templates/'+(key==='cafe_design_a'?'cafe_real_matcha_a':key)+'/preview?'+new URLSearchParams({view:'actual',device,descriptionsPreview:'on',...options,...(draft?{designPreview:JSON.stringify(draft)}:{})});
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(90000);
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',r=>{if(['GET','HEAD'].includes(r.request().method()))return r.continue();writes.push(r.request().url());return r.abort();});
async function settle(){await page.locator('[data-cafe-a-menu-item]').filter({visible:true}).first().waitFor();await page.evaluate(()=>document.fonts.ready);const ready=page.locator('[data-native-ready=true], [data-paged-ready=true]');if(await page.locator('[data-native-ready], [data-paged-ready]').count())await ready.first().waitFor();}
async function renderedColors(){return page.locator('[data-cafe-a-menu-item]').filter({visible:true}).evaluateAll(items=>items.filter(e=>e.getAttribute('data-cafe-a-sold-out')!=='true').map(e=>{const leader=e.querySelector('.cafe-a-round-focus-price-leader'),copy=e.querySelector('.cafe-a-menu-description');return {leader:leader&&leader.getBoundingClientRect().width?getComputedStyle(leader).color:null,description:copy&&getComputedStyle(copy).color};}).filter(e=>e.leader&&e.description));}
try{
 for(const [device,width,height] of [['pc',1440,900],['tablet',1180,820],['mobile',390,844]]){
  await page.setViewportSize({width,height});
  for(const key of keys){
   await page.goto(url(key,device,{decorations:{priceLeader:{visible:true,style:'solid'}}}),{waitUntil:'networkidle'});await settle();
   const colors=await renderedColors();assert.ok(colors.length,key);assert.ok(colors.every(c=>c.leader===c.description),JSON.stringify({key,device,colors}));
   const linked={textColorGroupsVersion:2,textColors:{supporting:'#175E9C',product:'#BC2356'},decorations:{priceLeader:{visible:true,style:'solid'}}};
   await page.goto(url(key,device,linked),{waitUntil:'networkidle'});await settle();
   assert.ok((await renderedColors()).every(c=>c.leader==='rgb(23, 94, 156)'));
   results.push(key+' '+device);console.log('PASS',key,device);
  }
 }
 await page.setViewportSize({width:1440,height:1000});
 const lines=['categoryUnderline','columnDivider','categoryDivider','itemDivider','priceLeader'];
 for(const width of [1,2,3]){
  const draft={decorations:Object.fromEntries(lines.map(k=>[k,{visible:true,width,style:'dotted',color:'#19713D'}]))};
  await page.goto(url('cafe_mocha_forest_a','pc',draft),{waitUntil:'networkidle'});await settle();
  const strokes=await page.evaluate(()=>{
   const take=(selector,pseudo,axis)=>[...document.querySelectorAll(selector)].filter(e=>e.getBoundingClientRect().width&&getComputedStyle(e).display!=='none'&&getComputedStyle(e).visibility!=='hidden').map(e=>{const s=getComputedStyle(e,pseudo);return {selector,display:s.display,axis,image:s.backgroundImage,size:s.backgroundSize,border:axis==='y'?s.borderInlineStartWidth:selector.includes('heading')?s.borderBottomWidth:s.borderTopWidth,content:s.content};}).filter(s=>s.display!=='none'&&(!pseudo||s.content==='""'));
   return [...take('.cafe-a-category-heading',null,'x'),...take('[data-menu-column-divider]',null,'y'),...take('.cafe-a-menu-category-top-divider',null,'x'),...take('[data-menu-item-separator]','::after','x'),...take('.cafe-a-round-focus-price-leader',null,'x')];
  });
  assert.ok(strokes.some(s=>s.axis==='y'));
  for(const stroke of strokes){assert.equal(stroke.border,width+'px');assert.ok(stroke.image.includes('rgb(25, 113, 61)'),JSON.stringify(stroke));assert.equal(stroke.size,stroke.axis==='y'?`${width}px ${3*width}px`:`${3*width}px ${width}px`);}
  if(width===2)await page.screenshot({path:out+'/mellow-dotted-2px.png'});
  results.push('dot geometry '+width+'px');
 }
 await page.goto(url('cafe_design_a','pc',{decorations:{categoryUnderline:{visible:true,style:'dotted'}}},{design:'basic-top-row'}),{waitUntil:'networkidle'});await settle();
 await expect(page.locator('.cafe-a-category-heading').filter({visible:true}).first()).toHaveCSS('border-bottom-width','1px');
 await expect(page.locator('.cafe-a-category-heading').filter({visible:true}).first()).toHaveCSS('background-size','3px 1px');
 results.push('neutral default dot width');
 // Native ROSY artwork retains its original palette and opacity with no edits.
 await page.goto(url('cafe_round_focus_a','pc'),{waitUntil:'networkidle'});await settle();
 const native=page.locator('.cafe-a-round-focus-price-leader').filter({visible:true}).first();
 await expect(native).toHaveCSS('color','rgb(23, 19, 15)');await expect(native).toHaveCSS('opacity','0.44');
 assert.equal(await page.locator('[data-decoration-leader-dots]').count(),0);results.push('native palette preserved');
 // Readout, direct color, reset, and hidden supporting copy in the full preview UI.
 const linked={textColorGroupsVersion:2,textColors:{supporting:'#175E9C'},decorations:{priceLeader:{visible:true,style:'solid'}}};
 await page.goto(url('cafe_mocha_forest_a','tablet',linked).replace('view=actual&','')+'&previewOptions=decorations',{waitUntil:'networkidle'});
 const open=page.getByRole('button',{name:'보기 옵션 열기',exact:true});if(await open.count())await open.click();
 const swatch=page.getByRole('button',{name:'메뉴명–가격 연결선 색상 선택',exact:true});
 await expect(swatch).toHaveAttribute('title','#175E9C');
 await swatch.click();const picker=page.locator('[data-preview-color-picker]');await picker.getByRole('textbox').fill('#C94C29');await picker.getByRole('button',{name:'적용',exact:true}).click();
 await expect(page.frameLocator('iframe').locator('.cafe-a-round-focus-price-leader').filter({visible:true}).first()).toHaveCSS('color','rgb(201, 76, 41)');
 await page.getByRole('button',{name:'메뉴명–가격 연결선 색상 기본색 복원',exact:true}).click();await page.locator('[data-preview-color-reset]').getByRole('button',{name:'되돌리기',exact:true}).click();
 await expect(swatch).toHaveAttribute('title','#175E9C');await expect(page.frameLocator('iframe').locator('.cafe-a-round-focus-price-leader').filter({visible:true}).first()).toHaveCSS('color','rgb(23, 94, 156)');
 await page.goto(url('cafe_mocha_forest_a','pc',linked,{descriptionsPreview:'off'}),{waitUntil:'networkidle'});await settle();await expect(page.locator('.cafe-a-round-focus-price-leader').filter({visible:true}).first()).toHaveCSS('color','rgb(23, 94, 156)');
 results.push('picker custom/reset and hidden descriptions');
 for(const [key,design] of [['restaurant_onue_a',''],['cafe_design_a','basic-upper-left']]){
  await page.goto(url(key,'pc',null,{...(design?{design}:{}),previewOptions:'decorations'}).replace('view=actual&',''),{waitUntil:'networkidle'});
  const toggle=page.getByRole('button',{name:'보기 옵션 열기',exact:true});if(await toggle.count())await toggle.click();
  await page.getByRole('button',{name:'패턴 띠 적용 범위',exact:true}).click();
  await expect(page.getByText('기본 좌상단 디자인은 패턴 띠를 지원하지 않습니다.',{exact:true})).toBeVisible();results.push('pattern scope '+(design||key));
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 console.log(JSON.stringify({passed:results.length,results,errors,writes}));
}finally{await browser.close();await fs.writeFile(out+'/report.json',JSON.stringify({results,errors,writes},null,2));}
