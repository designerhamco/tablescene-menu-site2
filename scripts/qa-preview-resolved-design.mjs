import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {chromium,expect} from '@playwright/test';
const base=process.env.QA_BASE_URL??'http://127.0.0.1:3042',out=process.env.QA_OUTPUT_DIR??'/private/tmp/artimenu-resolved-design';
await mkdir(out,{recursive:true});
const browser=await chromium.launch();
const page=await browser.newPage({viewport:{width:1440,height:1000}});
page.setDefaultTimeout(20000);page.setDefaultNavigationTimeout(90000);
const errors=[];page.on('pageerror',error=>errors.push(error.message));
const labels=['가게명','카테고리명','상품 기본정보','대표영역 설명','메뉴영역 설명','안내사항·위젯텍스트'];
const groups=['brand','category','product','representative','supporting','information'];
const results=[];
async function ready(){
  // The server renders the wide-panel fallback until the viewport store hydrates.
  await expect(page.locator('[data-preview-frame-shell]')).toBeVisible();
  const toggle=page.locator('[data-preview-options-toggle]');await toggle.waitFor();
  if((await page.evaluate(()=>innerWidth))>=960)await expect(toggle).toHaveAttribute('aria-expanded','true',{timeout:20000});
  else if(await toggle.getAttribute('aria-expanded')==='false')await toggle.click();
  await expect(page.getByRole('button',{name:'가게명 글자색 선택',exact:true})).toBeEnabled({timeout:20000});
  await expect(page.getByRole('combobox',{name:'이미지·텍스트칩 라운드',exact:true})).toBeEnabled({timeout:20000});
}
async function ink(){return page.frameLocator('iframe').locator('body').evaluate(body=>{
  const selectors=[['.cafe-a-store-title','.aube-table-cover h1'],['.cafe-a-category-title','.aube-table-course-header h2','.aube-table-course-title h2'],['.cafe-a-menu-title','.aube-table-item-heading h3'],['.cafe-a-store-description','.cafe-a-topline-description','.aube-table-cover-description'],['.cafe-a-menu-description:not(.cafe-a-store-description):not([data-cafe-a-store-description]):not(.cafe-a-time-sale-time-text)','.aube-table-item-description'],['[data-cafe-a-footer-info] .cafe-a-description-text','[data-native-notices]','.cafe-a-topline-notice-text']];
  return selectors.map(list=>{for(const selector of list){const node=[...body.querySelectorAll(selector)].find(e=>e.getBoundingClientRect().width&&e.getBoundingClientRect().height&&getComputedStyle(e).visibility==='visible'&&!e.closest('[aria-hidden="true"],[data-cafe-a-reference-copy]'));if(node){const raw=getComputedStyle(node).color.match(/[\d.]+/g);return raw?'#'+raw.slice(0,3).map(n=>Math.round(Number(n)).toString(16).padStart(2,'0')).join('').toUpperCase():null;}}return null;});
});}
async function swatches(){return Promise.all(labels.map(label=>page.getByRole('button',{name:`${label} 글자색 선택`,exact:true}).getAttribute('title')));}
try{
 const native=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_roasters_a','cafe_van_gogh_a','cafe_round_focus_a','restaurant_onue_a','fast_food_loop_bagel_a','dining_aube_table_a','dining_aube_table_b'];
 const cases=native.map(key=>({key})).concat([{key:'cafe_design_a',design:'basic-top-row'},{key:'cafe_design_a',design:'basic-first-column-album'},{key:'dining_aube_table_b',design:'dining-sidebar-album'}]);
 const selectedCases=process.env.QA_TEMPLATE_KEYS?cases.filter(item=>process.env.QA_TEMPLATE_KEYS.split(',').includes(item.key)):cases;
 for(const item of selectedCases)for(const device of ['pc','tablet','mobile']){
   const query=new URLSearchParams({device,previewOptions:'design',...(item.design?{design:item.design}:{})});
   await page.goto(`${base}/templates/${item.key}/preview?${query}`,{waitUntil:'domcontentloaded'});await ready();
   await expect(async()=>{
     const colors=await swatches(),paint=await ink();
     for(let i=0;i<paint.length;i++)if(paint[i])assert.equal(colors[i],paint[i],`${item.key} ${device} ${groups[i]} matches rendered ink`);
   }).toPass({timeout:20000});
   const colors=await swatches();
   if(item.key==='dining_aube_table_a'&&device==='pc'){
     await page.frameLocator('iframe').getByRole('button',{name:'다음 메뉴 페이지',exact:true}).click();
     await page.frameLocator('iframe').locator('.aube-table-item-heading h3').first().waitFor();
     await expect(async()=>{
       const paint=await ink();
       for(const i of [1,2,4])if(paint[i])assert.equal(colors[i],paint[i],`unmounted Dining ${groups[i]} already matches its later rendered ink`);
     }).toPass({timeout:20000});
   }
   for(const name of ['가게명·가게 설명 정렬','이미지·텍스트칩 라운드']){
     const control=page.getByRole('combobox',{name,exact:true});if(await control.count()){
       const selected=await control.locator('option:checked').innerText();assert.doesNotMatch(selected,/템플릿 기본값|설정 확인 중/);
       assert.equal(await control.locator('option[value="template"]').count(),0);
     }
   }
   assert.equal(new URL(page.url()).searchParams.has('designPreview'),false,'reading defaults never writes overrides');
   assert.equal(await page.frameLocator('iframe').locator('[data-preview-native-sample]').count(),0);
   results.push({key:item.key,design:item.design,device,colors});console.log(`resolved defaults ${item.design??item.key} ${device} passed`);
 }
 const mocha=`${base}/templates/cafe_mocha_forest_a/preview?device=tablet&previewOptions=design`;
 await page.goto(mocha,{waitUntil:'domcontentloaded'});await ready();const baseline=await swatches();
 assert.deepEqual(baseline,['#F4EDDC','#852322','#852322','#F4EDDC','#852322','#852322']);
 const overrides={textColorGroupsVersion:2,textColors:Object.fromEntries(groups.map((group,index)=>[group,['#123456','#234567','#345678','#456789','#56789A','#6789AB'][index]]))};
 await page.goto(mocha+'&designPreview='+encodeURIComponent(JSON.stringify(overrides)),{waitUntil:'domcontentloaded'});await ready();
 for(let i=0;i<groups.length;i++){
   await page.getByRole('button',{name:`${labels[i]} 글자색 기본색 복원`,exact:true}).click();
   const picker=page.locator('[data-preview-color-picker]');
   await expect(picker.getByRole('textbox',{name:`${labels[i]} 글자색 색상값`,exact:true})).toHaveValue(baseline[i]);
   await picker.getByRole('button',{name:'적용',exact:true}).click();
   await page.waitForURL(url=>!JSON.parse(url.searchParams.get('designPreview')??'{}').textColors?.[groups[i]]);await ready();
   assert.equal((await swatches())[i],baseline[i]);
 }
 console.log('deep-linked custom colors restore all six native inks passed');
 const alignment=page.getByRole('combobox',{name:'가게명·가게 설명 정렬',exact:true});
 await alignment.selectOption('right');await page.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')??'{}').representativeAlignment==='right');await ready();await expect(alignment).toHaveValue('right');
 const radius=page.getByRole('combobox',{name:'이미지·텍스트칩 라운드',exact:true});
 for(const value of ['square','soft','rounded','round']){
   await radius.selectOption(value);await expect(radius).toHaveValue(value);await ready();
   await expect(radius).toHaveValue(value);
 }
 await page.getByRole('button',{name:'디자인 초기화',exact:true}).click();await page.waitForURL(u=>!u.searchParams.has('designPreview'));await ready();
 assert.deepEqual(await swatches(),baseline);assert.equal(await radius.locator('option:checked').innerText(),'이미지 0px · 칩 4px');
 console.log('alignment, shared radius choices and reset passed');
 await page.locator('[data-preview-font-groups]').scrollIntoViewIfNeeded();await page.screenshot({path:out+'/mocha-colors.png'});
 await page.locator('[data-preview-image-radii]').scrollIntoViewIfNeeded();await page.locator('[data-preview-options-panel]').screenshot({path:out+'/resolved-options.png'});
 await page.setViewportSize({width:390,height:1000});await page.goto(mocha,{waitUntil:'domcontentloaded'});await ready();
 assert.deepEqual(await swatches(),baseline);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 console.log('narrow option panel passed');assert.deepEqual(errors,[]);
 await writeFile(out+'/report.json',JSON.stringify({passed:true,cases:results,errors},null,2));
}finally{await browser.close();}
