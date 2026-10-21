import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/preview-design-controls';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),failures=[],errors=[],results=[];
async function page(width,height=1000){const p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',error=>errors.push(error.message));p.setDefaultTimeout(12000);await p.addInitScript(()=>sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed','1'));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());return p;}
async function run(name,fn){try{await fn();results.push(name);console.log('PASS',name);}catch(error){failures.push({name,error:error.message});console.log('FAIL',name,error.message);}}
async function controls(width,dining){const p=await page(width,1000);try{
 const key=dining?'dining_aube_table_b':'cafe_real_matcha_a',design=dining?'dining-sidebar-album':'basic-first-column-album';
 await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({design,device:'mobile',previewOptions:'design',imagesPreview:'on'}),{waitUntil:'networkidle'});
 await expect(p.getByRole('button',{name:'보기 옵션 열기',exact:true})).toHaveAttribute('aria-expanded','false');await p.getByRole('button',{name:'보기 옵션 열기',exact:true}).click();const panel=p.locator('[data-preview-design-options]');assert.equal(await panel.locator('input[type=text],input[type=number],input[type=range]').count(),0);
 assert.deepEqual(await p.evaluate(()=>[innerWidth,innerHeight]),[width,1000]);
 for(const field of await panel.locator('[data-preview-color-field]').all()){const gap=await field.evaluate(e=>e.querySelector('button').getBoundingClientRect().left-e.querySelector('span').getBoundingClientRect().right);assert.ok(gap<=9,`label/swatch gap ${gap}`);}
 const columns=await panel.locator('[data-preview-backgrounds],[data-preview-image-radii],[data-preview-font-groups]').evaluateAll(es=>es.map(e=>getComputedStyle(e).gridTemplateColumns.split(' ').length));assert.deepEqual(columns,[2,2,2]);
 const label=dining?'본문 페이지 배경색':'페이지 배경색',trigger=p.getByRole('button',{name:label+' 선택',exact:true});await trigger.click();
 const picker=p.locator('[data-preview-color-picker]'),hex=picker.getByRole('textbox',{name:label+' 색상값',exact:true});await expect(hex).toHaveValue('#FFFFFF');
 const rect=await picker.boundingBox();assert.ok(rect.x>=0&&rect.x+rect.width<=width+1&&rect.y>=0&&rect.y+rect.height<=1001,JSON.stringify(rect));
 const before=p.url();await hex.fill('#bad');await hex.press('Enter');await expect(hex).toHaveAttribute('aria-invalid','true');assert.equal(p.url(),before);
 await hex.fill('#e6f3fa');await hex.press('Enter');await p.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')||'{}').pageBackground==='#E6F3FA');
 await expect(p.frameLocator('iframe').locator('.cafe-a-typography').first()).toHaveCSS('background-color','rgb(230, 243, 250)');
 await expect(trigger).toBeEnabled();if(!await picker.isVisible())await trigger.click();const spectrum=picker.getByRole('slider',{name:label+' 채도와 밝기',exact:true});await spectrum.focus();await spectrum.press('ArrowLeft');await p.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')||'{}').pageBackground!=='#E6F3FA');
 await hex.press('Escape');await expect(trigger).toBeFocused();
 await trigger.click();assert.equal(await picker.getByRole('button',{name:'템플릿 기본색 복원',exact:true}).count(),0);await p.getByRole('button',{name:label+' 기본색 복원',exact:true}).click();await p.waitForURL(u=>!JSON.parse(u.searchParams.get('designPreview')||'{}').pageBackground);await expect(picker).toBeHidden();
 const radius=p.getByRole('combobox',{name:'상품 이미지 라운드',exact:true});await radius.selectOption('rounded');await p.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')||'{}').imageRadii?.item===16);await radius.selectOption('template');await p.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')||'{}').imageRadii?.item===undefined);
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 if(width===390||width===1516){await panel.evaluate(e=>{e.scrollTop=0;});await p.screenshot({path:`${out}/${dining?'dining':'basic'}-${width}.png`});await trigger.click();await p.screenshot({path:`${out}/picker-${dining?'dining':'basic'}-${width}.png`});}
 }finally{await p.close();}}
async function palette(key,device,width,height,custom){const p=await page(width,height);try{
 await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({view:'actual',device,priceOptionsPreview:'on',imagesPreview:'on',...(custom?{designPreview:JSON.stringify({fonts:{category:{color:'#6340C4'}}})}:{})}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);await p.waitForTimeout(200);
 const rows=await p.locator('.cafe-a-category-heading').filter({visible:true}).evaluateAll(es=>es.flatMap(e=>{const title=e.querySelector('.cafe-a-category-title'),labels=[...e.querySelectorAll('.cafe-a-price-column-heading-label')].filter(label=>label.getBoundingClientRect().height);return title&&labels.length?[{name:title.textContent,title:getComputedStyle(title).color,labels:labels.map(label=>getComputedStyle(label).color)}]:[];}));
 assert.ok(rows.length,'price-option category example exists');for(const row of rows)for(const color of row.labels)assert.equal(color,row.title,JSON.stringify(row));
 }finally{await p.close();}}
try{
 if(process.env.CONTROLS_QA_PALETTE_ONLY!=='1')for(const width of [320,390,430,1516])for(const dining of [false,true])await run(`controls ${width} ${dining?'dining':'basic'}`,()=>controls(width,dining));
 const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'];
 const jobs=process.env.CONTROLS_QA_UI_ONLY==='1'?[]:keys.flatMap(key=>[['pc',1440,900],['tablet',1180,820],['mobile',390,844]].flatMap(d=>[false,true].map(custom=>()=>run(`category palette ${key} ${d[0]} ${custom?'custom':'native'}`,()=>palette(key,...d,custom)))));
 for(let i=0;i<jobs.length;i+=3)await Promise.all(jobs.slice(i,i+3).map(job=>job()));
 assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length}));
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors},null,2));}
