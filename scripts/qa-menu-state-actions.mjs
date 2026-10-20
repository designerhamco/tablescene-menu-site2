import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
const base=process.env.ORDER_QA_BASE||'http://localhost:3000',out=process.env.ORDER_QA_OUTPUT||'/private/tmp/menu-state-actions';
await fs.mkdir(out,{recursive:true});
const native=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a','dining_aube_table_a','dining_aube_table_b'];
const designs=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left','dining-full-page','dining-sidebar','basic-first-column-album','basic-top-row-album','dining-full-page-album','dining-sidebar-album'];
const cases=[...native.map(key=>({key})),...designs.map(design=>({design,key:design.startsWith('basic')?'cafe_design_a':design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a'}))].filter(c=>!process.env.QA_KEYS||process.env.QA_KEYS.split(',').includes(c.design||c.key));
const sizes=process.env.STATE_QA_SMOKE==='1'?[['mobile',390,844]]:[['pc',1440,900],['tablet',1180,820],['mobile',390,844]];
const b=await chromium.launch(),results=[],failures=[],errors=[],writes=[];
async function check(c,[device,width,height]){
 const p=await b.newPage({viewport:{width,height},reducedMotion:'reduce'});p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 try{
  await p.goto(`${base}/templates/${c.key}/preview?`+new URLSearchParams({device,view:'actual',callPreview:'on',orderPreview:'on',soldOutPreview:'on',imagesPreview:'on',...(c.design?{design:c.design}:{})}),{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  if(c.key.startsWith('dining')){await p.locator('[data-aube-table]').waitFor();await p.locator('.aube-table-pagination-dot,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({visible:true}).nth(2).click();await p.locator('.aube-table-page').waitFor();}
  else await p.locator('[data-native-ready=true],[data-paged-ready=true],[data-mobile-brand-fit=ready]').filter({visible:true}).first().waitFor();
  await p.waitForTimeout(250);
  assert.deepEqual(await p.evaluate(()=>[innerWidth,innerHeight]),[width,height]);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
  assert.equal(await p.locator('[data-cafe-a-widget-block]').count(),0,'widgets default OFF without removing starter content');
  const geometry=await p.locator('[data-menu-order-add]').filter({visible:true}).evaluateAll(es=>es.filter(e=>!e.closest('[inert]')).map(e=>{
   const area=e.closest('.cafe-a-price-area,.aube-table-item-purchase,.aube-table-course-purchase');const r=e.getBoundingClientRect(),a=area?.getBoundingClientRect();return {area:!!area,inside:!!a&&r.left>=a.left-1&&r.right<=a.right+1&&r.top>=a.top-1&&r.bottom<=a.bottom+1};
  }));assert.ok(geometry.length>0);assert.ok(geometry.every(g=>g.area&&g.inside),'all add icons stay in their actual price area');
  const sold=p.locator('[data-cafe-a-menu-item][data-cafe-a-sold-out=true],[data-aube-table-item][data-cafe-a-sold-out=true]').filter({visible:true});assert.ok(await sold.count()>0);
  const colors=await sold.locator('.cafe-a-menu-title,.cafe-a-menu-meta:not([data-cafe-a-reference-copy]),.cafe-a-menu-description,.cafe-a-menu-price,h3,.aube-table-item-secondary,.aube-table-item-description,.aube-table-item-price').evaluateAll(es=>es.map(e=>getComputedStyle(e).color));
  assert.ok(colors.every(c=>{const nums=c.match(/[\d.]+/g).map(Number);return Math.max(...nums.slice(0,3))-Math.min(...nums.slice(0,3))<2&&nums[0]>=100;}),'sold-out copy uses neutral gray despite native/saved color overrides');
  const theme=await p.locator('[data-menu-interaction-shell]').evaluate(e=>{
   const root=e.querySelector('.cafe-a-typography,.aube-table-root'),s=getComputedStyle(e),rs=getComputedStyle(root);
   const category=[...root.querySelectorAll('.cafe-a-category-title,.aube-table-course-header h2')].find(e=>!e.closest('[inert]')&&e.getBoundingClientRect().width>0);
   const normalize=color=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=1;const ctx=canvas.getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3).join(',');};
   return {fill:normalize(s.getPropertyValue('--menu-order-bg')),category:normalize(rs.getPropertyValue('--menu-role-category-color').trim()||(category&&getComputedStyle(category).color)||rs.getPropertyValue('--aube-accent'))};
  });assert.equal(theme.fill,theme.category,'Order fill matches the persistent category color');
  const actionColors=await p.locator('[data-menu-interaction-shell]').evaluate(e=>{
   const theme=getComputedStyle(e),normalize=color=>{const ctx=document.createElement('canvas').getContext('2d');ctx.fillStyle=color;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data].slice(0,3).join(',');};
   return [...e.querySelectorAll('button')].filter(b=>b.getBoundingClientRect().width>0&&(/^(호출하기|주문하기)$/.test(b.textContent.trim())||b.className.includes('diningFloatingCall'))).map(b=>{const order=b.textContent.trim()==='주문하기',s=getComputedStyle(b);return {background:normalize(s.backgroundColor),expectedBackground:normalize(theme.getPropertyValue(order?'--menu-order-bg':'--menu-call-bg')),ink:normalize(s.color),expectedInk:normalize(theme.getPropertyValue(order?'--menu-order-ink':'--menu-call-ink')),border:normalize(s.borderTopColor),expectedBorder:normalize(theme.getPropertyValue(order?'--menu-order-border':'--menu-call-border'))};});
  });assert.ok(actionColors.length);for(const color of actionColors){assert.equal(color.background,color.expectedBackground);assert.equal(color.ink,color.expectedInk);assert.equal(color.border,color.expectedBorder);}
  await p.screenshot({path:`${out}/${c.design||c.key}-${device}.png`});results.push({...c,device,icons:geometry.length,colors,theme});console.log('PASS',c.design||c.key,device);
 }catch(e){failures.push({...c,device,error:e.message});console.log('FAIL',c.design||c.key,device,e.message);}finally{await p.close();}
}
try{const jobs=cases.flatMap(c=>sizes.map(size=>[c,size]));for(let i=0;i<jobs.length;i+=3)await Promise.all(jobs.slice(i,i+3).map(args=>check(...args)));}
finally{await b.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({results,failures,errors,writes},null,2));}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:results.length}));
