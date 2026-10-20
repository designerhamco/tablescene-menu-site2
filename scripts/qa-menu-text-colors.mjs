import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { build } from 'esbuild';
const base=process.env.ORDER_QA_BASE||'http://localhost:3000',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/menu-text-colors';
await fs.mkdir(out,{recursive:true});
// Mount the real editor in a local browser fixture. No authenticated menu or DB writes.
const bundle=await build({stdin:{contents:`
import React from 'react'; import {createRoot} from 'react-dom/client';
import Form from './components/mypage/menu-editor/TypographySettingsForm';
import {getKoreanFontOption,getEnglishFontOption} from './lib/font-options';
import * as typography from './lib/template-typography-presets';
window.ColorQa={...typography,mount(key){const p=typography.mergeTypographySettings(key);const ko=getKoreanFontOption(p.korean_font_key),en=getEnglishFontOption(p.english_font_key);const host=document.createElement('form');host.id='qa-color-form';host.style.cssText='position:fixed;inset:0;overflow:auto;z-index:99999;background:white';document.body.append(host);createRoot(host).render(React.createElement(Form,{formId:host.id,initialFont:ko,initialEnglishFont:en,defaultFont:ko,defaultEnglishFont:en,hasCustomKoreanFont:false,hasCustomEnglishFont:false,initialFontSizeScale:'m',initialRoleSettings:p.typography_roles,templateType:key.startsWith('dining')?'multi_page':'one_page',templateKey:key}));}};`,resolveDir:process.cwd(),loader:'tsx'},bundle:true,write:false,platform:'browser',format:'iife',jsx:'automatic',define:{'process.env.NODE_ENV':'"production"'}});
const browser=await chromium.launch(),results=[],errors=[],writes=[];
const keys=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a','dining_aube_table_a','dining_aube_table_b'];
try{
for(const key of keys.filter(key=>!process.env.QA_KEYS||process.env.QA_KEYS.split(',').includes(key)))for(const[device,width,height]of[['pc',1440,900],['mobile',390,844]]){
 const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 try{
  await page.goto(`${base}/templates/${key}/preview?`+new URLSearchParams({view:'actual',device,callPreview:'on',orderPreview:'on'}),{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
  if(key.startsWith('dining'))await page.locator('.aube-table-cover').waitFor();
  else await page.locator('[data-native-ready=true],[data-paged-ready=true],[data-mobile-brand-fit=ready]').filter({visible:true}).first().waitFor();
  const root=page.locator('.cafe-a-typography').first();
  const before=await root.evaluate(e=>({style:e.getAttribute('style'),roles:e.getAttribute('data-menu-text-colors')}));
  await page.addScriptTag({content:bundle.outputFiles[0].text});await page.evaluate(key=>ColorQa.mount(key),key);
  const picker=page.locator('#typography-group-otherText-color');await picker.fill('#5a327d');
  for(const role of ['itemName','supporting','price'])await assert.equal(await page.locator(`[name=typography_role_${role}_color]`).inputValue(),'#5A327D');
  await page.evaluate(key=>{
   const values=new FormData(document.querySelector('#qa-color-form'));const raw=Object.fromEntries(ColorQa.TYPOGRAPHY_ROLE_KEYS.map(role=>[role,{color:values.get('typography_role_'+role+'_color'),font_ko_key:values.get('typography_role_'+role+'_font_ko_key'),font_en_key:values.get('typography_role_'+role+'_font_en_key')}]));
   const roles=ColorQa.normalizeTypographyRoleSettings(raw,key);const saved=JSON.parse(JSON.stringify({design:{typographyRoles:ColorQa.getCafeATypographyRolePayload(roles)}}));const settings=ColorQa.mergeTypographySettings(key,ColorQa.getCustomTypographySettings({},saved));const root=document.querySelector('.cafe-a-typography');for(const[k,v]of Object.entries(ColorQa.getTypographyCssVariables(settings,key)))root.style.setProperty(k,v);root.dataset.menuTextColors=ColorQa.getTypographyCustomColorRoles(settings);document.querySelector('#qa-color-form').style.display='none';
  },key);
  if(key.startsWith('dining'))await page.locator(key.endsWith('_b')?(device==='mobile'?'.aube-table-mobile-page-tabs button':'.aube-table-sidebar-list button'):'.aube-table-pagination-dot').nth(1).click();
  const colors=await root.evaluate(root=>Object.fromEntries(Object.entries({name:'.cafe-a-menu-title,.aube-table-item-heading h3',supporting:'.cafe-a-menu-description,.aube-table-item-description',price:'.cafe-a-menu-price,.aube-table-item-price,.aube-table-course-price'}).map(([role,selector])=>{const e=[...root.querySelectorAll(selector)].find(e=>e.getBoundingClientRect().width>0&&!e.closest('[inert]'));return[role,e?getComputedStyle(e).color:null];})));
  for(const[role,color]of Object.entries(colors))assert.equal(color,'rgb(90, 50, 125)',`${key} ${device} ${role}`);
  await page.locator('#qa-color-form').evaluate(e=>e.style.display='block');await page.getByRole('button',{name:'기본 색상',exact:true}).nth(2).click();
  for(const role of ['itemName','supporting','price'])assert.equal(await page.locator(`[name=typography_role_${role}_color]`).inputValue(),'');
  await root.evaluate((e,before)=>{if(before.style===null)e.removeAttribute('style');else e.setAttribute('style',before.style);if(before.roles===null)e.removeAttribute('data-menu-text-colors');else e.setAttribute('data-menu-text-colors',before.roles);},before);
  results.push({key,device,viewport:[width,height],colors});console.log(key,device,'passed');
 }finally{await page.close();}
}
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,errors,writes},null,2));}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
