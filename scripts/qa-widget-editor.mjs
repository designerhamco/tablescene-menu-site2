import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.WIDGET_QA_BASE||'http://localhost:3026';
const browser=await chromium.launch(),results=[],errors=[],writes=[];
try{
for(const key of ['cafe_mocha_forest_a','cafe_design_a','dining_aube_table_a','dining_aube_table_b']){
 const p=await browser.newPage({viewport:{width:1440,height:1000}});
 p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/*',route=>['GET','HEAD','OPTIONS'].includes(route.request().method())?route.continue():(writes.push(route.request().url()),route.abort()));
 await p.goto(`${base}/__qa/widget-placement?editor=on&template=${key}`);
 const row=p.locator('[data-widget-structure-row]');await row.waitFor();
 const dining=key.startsWith('dining');
 assert.equal(await row.getAttribute('data-widget-order-locked'),dining?null:'true');
 const payload=async()=>JSON.parse(await p.locator('input[name=menuWidgetFinalSavePayload]').inputValue());
 let data=await payload();
 assert.equal(data.widgetDrafts[0].settings.placement,dining?'flow':'bottom');
 assert.equal(data.contentBlocksByPage[0].blocks.at(dining?1:-1).blockType,'widget');
 await row.locator('button').last().click();
 if(dining){
  assert.equal(await p.getByText('마지막 열 하단 정렬',{exact:true}).count(),0);
  assert.equal(await p.getByRole('button',{name:'위로 이동',exact:true}).isEnabled(),true);
 }else{
  assert.equal(await row.getByRole('button',{name:'하단 고정 위젯: 순서 이동 불가',exact:true}).isDisabled(),true);
  assert.equal(await p.getByRole('button',{name:'위로 이동',exact:true}).isDisabled(),true);
  assert.equal(await p.getByRole('button',{name:'아래로 이동',exact:true}).isDisabled(),true);
  await p.getByLabel('콘텐츠 이어붙이기',{exact:false}).check();
  // This applies local editor draft only; never submit the final server form.
  await p.locator('button.site-button-primary').filter({hasText:'수정 내용 반영'}).click();
  assert.equal(await row.getAttribute('data-widget-order-locked'),null);
  assert.equal(await p.getByRole('button',{name:'위로 이동',exact:true}).isEnabled(),true);
 }
 await p.getByRole('button',{name:'위로 이동',exact:true}).click();
 await p.waitForFunction(index=>JSON.parse(document.querySelector('input[name=menuWidgetFinalSavePayload]').value).contentBlocksByPage[0].blocks[index].blockType==='widget',dining?0:1);
 data=await payload();
 const blocks=data.contentBlocksByPage[0].blocks;
 assert.equal(blocks.at(dining?0:1).blockType,'widget','flow widgets move through category order');
 assert.equal(data.widgetDrafts[0].settings.placement,'flow');
 assert.equal(await row.getByRole('button',{name:'위젯 순서 이동',exact:true}).isEnabled(),true);
 results.push(key);await p.close();
}
}finally{await browser.close();}
await fs.writeFile('/private/tmp/widget-editor-qa.json',JSON.stringify({results,errors,writes},null,2));
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({passed:results.length,errors,writes}));
