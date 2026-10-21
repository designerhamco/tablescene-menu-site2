import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium, expect } from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3017',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/preview-sidebar';
await fs.mkdir(out,{recursive:true});
const browser=await chromium.launch(),results=[],failures=[],errors=[];
const configs=[
 ['pc',1516,1000],['pc',1024,768],['tablet',1516,1000],['tablet',1024,768],['tablet',960,900],['tablet',959,900],['tablet',820,1180],
 ['mobile',1516,1000],['mobile',320,900],['mobile',390,900],['mobile',430,900],
 ['tablet',1516,1000,'dining'],['tablet',1024,768,'dining'],['tablet',1516,1000,'portrait'],['mobile',390,900,'dining'],['pc',1516,1000,'mocha']
];
async function run([device,width,height,variant]){const name=`${device} ${width}x${height} ${variant||'basic'}`,p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});p.setDefaultTimeout(12000);p.on('pageerror',e=>errors.push(e.message));await p.addInitScript(()=>sessionStorage.setItem('artimenu:menu-preview-guide-v4-closed','1'));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():r.abort());try{
 const dining=variant==='dining'||variant==='portrait',key=dining?'dining_aube_table_b':variant==='mocha'?'cafe_mocha_forest_a':'cafe_real_matcha_a';
 await p.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({device,...(dining?{design:'dining-sidebar-album'}:variant==='mocha'?{}:{design:'basic-first-column-album'}),...(variant==='portrait'?{orientation:'portrait'}:{}),previewOptions:'design',imagesPreview:'on'}),{waitUntil:'networkidle'});
 const iframe=p.frameLocator('iframe'),source=device==='pc'?[width,height]:device==='mobile'?[390,844]:variant==='portrait'?[820,1180]:[1180,820];
 await expect.poll(()=>iframe.locator('body').evaluate(()=>[innerWidth,innerHeight])).toEqual(source);await iframe.locator('body').evaluate(()=>document.fonts.ready);await p.waitForTimeout(150);
 const toggle=p.getByRole('button',{name:'보기 옵션 열기',exact:true});await expect(toggle).toHaveAttribute('aria-expanded','false');assert.equal(await p.getByRole('tab',{name:'디자인 옵션',exact:true}).count(),0);
 const src=await p.locator('iframe').getAttribute('src');await iframe.locator('body').evaluate(()=>{window.__panelProbe='same-document';const e=document.querySelector('[data-scroll-menu],[data-native-scroll]');if(e){e.scrollTop=100;e.setAttribute('data-probe-scroll',String(e.scrollTop));}});
 const before=await p.locator('[data-preview-frame-shell]').boundingBox();await toggle.click();await expect(p.getByRole('tab',{name:'디자인 옵션',exact:true})).toHaveAttribute('aria-selected','true');await p.waitForTimeout(150);
 assert.equal(await p.locator('iframe').getAttribute('src'),src);assert.deepEqual(await iframe.locator('body').evaluate(()=>[innerWidth,innerHeight]),source);assert.equal(await iframe.locator('body').evaluate(()=>window.__panelProbe),'same-document');assert.ok(await iframe.locator('body').evaluate(()=>{const e=document.querySelector('[data-probe-scroll]');return !e||e.scrollTop===Number(e.getAttribute('data-probe-scroll'));}));
 const panel=p.locator('[data-preview-options-panel]'),rect=await panel.boundingBox(),frame=await p.locator('[data-preview-frame-shell]').boundingBox(),toolbar=await p.locator('[data-preview-device-toolbar]').boundingBox();await expect(panel).toHaveCSS('background-color','rgb(246, 247, 249)');
 if(width>=960){assert.ok(rect.x+rect.width+8<=frame.x,JSON.stringify({rect,frame}));assert.ok(frame.x+frame.width<=width+1&&frame.y+frame.height<=height+1,JSON.stringify(frame));assert.ok(frame.y>=toolbar.y+toolbar.height+8,JSON.stringify({toolbar,frame}));assert.ok(frame.width<=before.width+1);assert.ok(await p.locator('[data-preview-display-scale]').count());const body=p.locator('#preview-display-options');assert.ok(await body.evaluate(e=>e.scrollHeight>=e.clientHeight));}
 else{assert.ok(rect.y>=toolbar.y+toolbar.height,JSON.stringify({rect,toolbar}));assert.equal(await p.locator('[data-preview-display-scale]').count(),0);}
 if(width===1516&&device==='tablet'&&!variant){await p.screenshot({path:`${out}/tablet-panel.png`});await p.setViewportSize({width:820,height:1180});await p.waitForTimeout(200);assert.deepEqual(await iframe.locator('body').evaluate(()=>[innerWidth,innerHeight]),source);assert.equal(await iframe.locator('body').evaluate(()=>window.__panelProbe),'same-document');await p.setViewportSize({width,height});await p.waitForTimeout(200);}
 if(device==='mobile'&&width===390&&!variant)await p.screenshot({path:`${out}/mobile-panel.png`});
 await p.getByRole('button',{name:'기기 선택 도구 닫기',exact:true}).click();await p.waitForTimeout(350);if(width>=960)await expect(panel).toBeVisible();else await expect(panel).toBeHidden();await p.getByRole('button',{name:'기기 선택 도구 열기',exact:true}).click();await p.waitForTimeout(350);
 await p.getByRole('button',{name:'보기 옵션 닫기',exact:true}).focus();await p.getByRole('button',{name:'보기 옵션 닫기',exact:true}).press('Escape');await expect(p.getByRole('button',{name:'보기 옵션 열기',exact:true})).toBeFocused();assert.equal(await iframe.locator('body').evaluate(()=>window.__panelProbe),'same-document');
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));results.push(name);console.log('PASS',name);
 }catch(e){failures.push({name,error:e.message});console.log('FAIL',name,e.message);await p.screenshot({path:`${out}/failure-${results.length}-${width}.png`}).catch(()=>{});}finally{await p.close();}}
try{for(let i=0;i<configs.length;i+=3)await Promise.all(configs.slice(i,i+3).map(run));assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);console.log(JSON.stringify({passed:results.length}));}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors},null,2));}
