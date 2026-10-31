import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/preview-design-controls';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),failures=[],errors=[],results=[];
async function page(width,height=1000){const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',error=>errors.push(error.message));p.setDefaultTimeout(12000);await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());return p;}
async function run(name,fn){try{await fn();results.push(name);console.log('PASS',name);}catch(error){failures.push({name,error:error.message});console.log('FAIL',name,error.message);}}
async function controls(width,dining){const p=await page(width,1000);try{
 const key=dining?'dining_aube_table_b':'cafe_real_matcha_a';
 await p.goto(`${base}/templates/${key}/preview?device=tablet&previewOptions=design`,{waitUntil:'domcontentloaded'});
 await p.locator('[data-preview-options-toggle]').waitFor();
 if(await p.getByRole('button',{name:'보기 옵션 열기',exact:true}).count())await p.getByRole('button',{name:'보기 옵션 열기',exact:true}).click();
 const panel=p.locator('[data-preview-design-options]');await panel.waitFor();
 assert.deepEqual(await p.evaluate(()=>[innerWidth,innerHeight]),[width,1000]);
 const textColors=panel.locator('[data-preview-font-groups]');
 assert.deepEqual(await textColors.locator(':scope > [data-preview-color-field] > span').allTextContents(),['가게명','카테고리명','상품 기본정보','대표영역 설명','메뉴영역 설명','안내사항·위젯텍스트']);
 assert.equal(await textColors.locator('fieldset,p').count(),0);
 assert.doesNotMatch(await textColors.innerText(),/글자색|카테고리명·가격 옵션명|상품명·판매가격·가격설명/);
 const grids=panel.locator('[data-preview-backgrounds],[data-preview-font-groups],[data-preview-chip-colors] fieldset > div');
 const measured=await grids.evaluateAll(es=>es.map(e=>({columns:getComputedStyle(e).gridTemplateColumns.split(' ').length,overflow:e.scrollWidth>e.clientWidth+1,fields:[...e.querySelectorAll('[data-preview-color-field]')].map(f=>{const r=f.getBoundingClientRect(),label=f.querySelector('span').getBoundingClientRect(),button=f.querySelector('button').getBoundingClientRect();return{width:r.width,buttonBottom:button.bottom,labelBottom:label.bottom};})})));
 assert.equal(measured.length,dining?2:4);for(const g of measured){assert.equal(g.columns,2);assert.equal(g.overflow,false);for(const f of g.fields)assert.ok(f.buttonBottom>f.labelBottom);}
 assert.equal(await panel.locator('[data-preview-common-fonts] select').count(),2);
 assert.equal(await panel.locator('input[type=text],input[type=number],input[type=range]').count(),0);
 const brand=p.getByRole('button',{name:'가게명 글자색 선택',exact:true});await brand.click();
 const picker=p.locator('[data-preview-color-picker]');await picker.waitFor();
 const rect=await picker.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1,JSON.stringify(rect));
 await picker.getByRole('button',{name:'취소',exact:true}).click();await expect(brand).toBeFocused();
 if(width===390){
   await brand.click();await picker.getByRole('textbox',{name:'가게명 글자색 색상값',exact:true}).fill('#234567');
   await picker.getByRole('button',{name:'적용',exact:true}).click();
   await p.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')||'{}').textColors?.brand==='#234567');
   await p.getByRole('button',{name:'가게명 글자색 기본색 복원',exact:true}).click();
   await picker.getByRole('button',{name:'적용',exact:true}).click();
   await p.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')||'{}').textColors?.brand===undefined);
 }
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(width===390||width===1516){
   await panel.locator('[data-preview-backgrounds]').scrollIntoViewIfNeeded();
   await p.screenshot({path:`${out}/${dining?'dining':'basic'}-${width}.png`});
   if(!dining){await panel.locator('[data-preview-chip-colors]').scrollIntoViewIfNeeded();await p.screenshot({path:`${out}/chips-${width}.png`});}
 }
 }finally{await p.close();}}
async function palette(key,device,width,height,custom){const p=await page(width,height);try{
 await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({view:'actual',device,priceOptionsPreview:'on',imagesPreview:'on',...(custom?{designPreview:JSON.stringify({fonts:{category:{color:'#6340C4'}}})}:{})}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);
 const rows=await p.locator('.cafe-a-category-heading').filter({visible:true}).evaluateAll(es=>es.flatMap(e=>{const title=e.querySelector('.cafe-a-category-title'),labels=[...e.querySelectorAll('.cafe-a-price-column-heading-label')].filter(label=>label.getBoundingClientRect().height);return title&&labels.length?[{name:title.textContent,title:getComputedStyle(title).color,labels:labels.map(label=>getComputedStyle(label).color)}]:[];}));
 assert.ok(rows.length,'price-option category example exists');for(const row of rows)for(const color of row.labels)assert.equal(color,row.title,JSON.stringify(row));
 }finally{await p.close();}}
try{
 if(process.env.CONTROLS_QA_PALETTE_ONLY!=='1')for(const width of [320,390,430,820,1516])for(const dining of [false,true])await run(`controls ${width} ${dining?'dining':'basic'}`,()=>controls(width,dining));
 const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'];
 const jobs=process.env.CONTROLS_QA_UI_ONLY==='1'?[]:keys.flatMap(key=>[['pc',1440,900],['tablet',1180,820],['mobile',390,844]].flatMap(d=>[false,true].map(custom=>()=>run(`category palette ${key} ${d[0]} ${custom?'custom':'native'}`,()=>palette(key,...d,custom)))));
 for(let i=0;i<jobs.length;i+=3)await Promise.all(jobs.slice(i,i+3).map(job=>job()));
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length}));
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors},null,2));}
