import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.WIDGET_QA_BASE||'http://localhost:3027';
const browser=await chromium.launch(),results=[],errors=[],writes=[];
try{
for(const key of ['cafe_mocha_forest_a','cafe_design_a','dining_aube_table_a','dining_aube_table_b']){
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(writes.push(route.request().url()),route.abort()));
 await p.goto(`${base}/__qa/widget-placement?editor=on&template=${key}`);
 const row=p.locator('[data-widget-structure-row]');await row.waitFor();
 const payload=async()=>JSON.parse(await p.locator('input[name=menuWidgetFinalSavePayload]').inputValue());
 let data=await payload();
 assert.equal(data.widgetDrafts[0].settings.placement,'flow');
 assert.equal(data.contentBlocksByPage[0].blocks[1].blockType,'widget','legacy hint retains mixed order');
 assert.equal(await row.getByRole('button',{name:'위젯 순서 이동',exact:true}).isEnabled(),true);
 await row.locator('button').last().click();
 assert.equal(await p.getByText('마지막 열 하단 정렬',{exact:true}).count(),0);
 assert.equal(await p.getByText('콘텐츠 이어붙이기',{exact:true}).count(),0);
 for(const [name,index] of [['위로 이동',0],['아래로 이동',1],['아래로 이동',2],['위로 이동',1]]){
  const move=p.getByRole('button',{name,exact:true});assert.equal(await move.isEnabled(),true);await move.click();
  await p.waitForFunction(index=>JSON.parse(document.querySelector('input[name=menuWidgetFinalSavePayload]').value).contentBlocksByPage[0].blocks[index].blockType==='widget',index);
 }
 const categories=p.getByRole('button',{name:/^(카테고리|코스) 순서 이동$/});
 await row.getByRole('button',{name:'위젯 순서 이동',exact:true}).dragTo(categories.first());
 await p.waitForFunction(()=>JSON.parse(document.querySelector('input[name=menuWidgetFinalSavePayload]').value).contentBlocksByPage[0].blocks[0].blockType==='widget');
 await row.getByRole('button',{name:'위젯 순서 이동',exact:true}).dragTo(categories.last());
 await p.waitForFunction(()=>JSON.parse(document.querySelector('input[name=menuWidgetFinalSavePayload]').value).contentBlocksByPage[0].blocks[2].blockType==='widget');
 await p.getByRole('button',{name:'위로 이동',exact:true}).click();
 await p.getByPlaceholder('예: 오늘의 안내').fill('수정한 검수 위젯');
 // Apply only the local draft. Never submit the authorized final-save form.
 await p.locator('button.site-button-primary').filter({hasText:'수정 내용 반영'}).click();
 data=await payload();
 assert.deepEqual(data.contentBlocksByPage[0].blocks.map(b=>b.blockType),['category','widget','category']);
 assert.equal(data.widgetDrafts[0].settings.placement,'flow');
 assert.equal(data.widgetDrafts[0].sortOrder,1);
 results.push(key);await p.close();
}
}finally{await browser.close();}
await fs.writeFile('/private/tmp/widget-editor-qa.json',JSON.stringify({results,errors,writes},null,2));
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({passed:results.length,errors,writes}));
