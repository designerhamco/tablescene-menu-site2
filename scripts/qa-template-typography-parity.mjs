import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.ORDER_QA_BASE||'http://localhost:3017';
const out=process.env.ORDER_QA_OUTPUT||'/private/tmp/template-typography-parity';
await fs.mkdir(out,{recursive:true});
const native=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a','dining_aube_table_a','dining_aube_table_b'].map(key=>({key}));
const defaults=['basic-first-column','basic-top-row','basic-center-column','basic-upper-left','dining-full-page','dining-sidebar','basic-first-column-album','basic-top-row-album','dining-full-page-album','dining-sidebar-album'].map(design=>({key:design.startsWith('basic')?'cafe_design_a':design.includes('sidebar')?'dining_aube_table_b':'dining_aube_table_a',design}));
const cases=[...native,...defaults].flatMap(c=>[['pc',1440,900],['tablet',1180,820],['mobile',390,844]].map(([device,width,height])=>({...c,device,width,height})));
const browser=await chromium.launch(),rows=[],failures=[],errors=[],writes=[];
async function check(c){
 const p=await browser.newPage({viewport:{width:c.width,height:c.height},reducedMotion:'reduce'});
 p.on('pageerror',e=>errors.push(e.message));await p.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
 const params=new URLSearchParams({device:c.device,view:'actual',callPreview:'on',orderPreview:'on',secondaryNamesPreview:'on',descriptionsPreview:'on',categoryDescriptionsPreview:'on',layoutMode:'orderedBalancedFit',...(c.design?{design:c.design}:{})});
 try{
  await p.goto(`${base}/templates/${c.key}/preview?${params}`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
  const dining=c.key.startsWith('dining');
  if(dining)await p.locator('.aube-table-pagination-dot,.aube-table-sidebar-list button,.aube-table-mobile-page-tabs button').filter({visible:true}).nth(2).click();
  else await p.locator('[data-native-ready=true],[data-paged-ready=true],[data-mobile-brand-fit=ready]').filter({visible:true}).first().waitFor();
  await p.waitForTimeout(200);
  const measure=()=>p.evaluate(()=>{
   const visible=e=>!e.closest('[inert],[aria-hidden=true]')&&e.getBoundingClientRect().width>0&&getComputedStyle(e).visibility!=='hidden';
   const root=document.querySelector('.cafe-a-typography,.aube-table-root');
   const select={name:'.cafe-a-menu-title,.aube-table-item h3',secondary:'.cafe-a-menu-meta:not([data-cafe-a-reference-copy]),.aube-table-item-secondary',description:'.cafe-a-menu-description,.aube-table-item-description',price:'.cafe-a-menu-price,.aube-table-item-price'};
   return {viewport:[innerWidth,innerHeight],roles:Object.fromEntries(Object.entries(select).map(([role,selector])=>[role,[...new Set([...root.querySelectorAll(selector)].filter(e=>visible(e)&&e.closest('[data-cafe-a-menu-item],.aube-table-item')).map(e=>Number(parseFloat(getComputedStyle(e).fontSize).toFixed(3))))].sort((a,b)=>a-b)]))};
  });
  if(!dining&&c.device!=='mobile'){
   const settled=await p.evaluate(async()=>{
    const root=document.querySelector('[data-native-scroll],[data-scroll-template]'),states=[];
    for(let i=0;i<16;i++){await new Promise(requestAnimationFrame);states.push([root.getAttribute('data-scroll-columns')||root.style.getPropertyValue('--native-columns'),...([...root.querySelectorAll('[data-native-unit],[data-paged-block]')].slice(0,4).map(e=>Math.round(e.getBoundingClientRect().y)))]);}
    return states;
   });assert.ok(settled.every(state=>JSON.stringify(state)===JSON.stringify(settled[0])),'column choice and item geometry stay stable after measurement');
  }
  if(!dining){
   const rails=await p.locator('.cafe-a-price-column-header').filter({visible:true}).evaluateAll(headers=>headers.filter(e=>!e.closest('[inert]')).map(header=>{
    const labels=[...header.querySelectorAll('.cafe-a-price-column-heading-label')].map(e=>e.getBoundingClientRect());
    return labels.slice(1).map((label,i)=>label.left-labels[i].right);
   }));assert.ok(rails.flat().every(gap=>gap>=9),'long option labels retain their minimum gap');
  }
  const current=await measure();assert.deepEqual(current.viewport,[c.width,c.height]);for(const values of Object.values(current.roles))assert.ok(values.length,'each visible product field is measured');
  if(!dining&&c.device!=='mobile'){
   params.set('layoutMode','orderedFit');await p.goto(`${base}/templates/${c.key}/preview?${params}`,{waitUntil:'networkidle'});await p.evaluate(()=>document.fonts.ready);
   await p.locator('[data-native-ready=true],[data-paged-ready=true]').filter({visible:true}).first().waitFor();assert.deepEqual((await measure()).roles,current.roles,'grouped/fill use identical reading sizes');
  }
  if(c.key==='fast_food_loop_bagel_a'){
   const checker=()=>p.locator('.cafe-a-typography').evaluate(root=>['::before','::after'].map(pseudo=>{const s=getComputedStyle(root,pseudo);return {height:s.height,position:s.position,background:s.backgroundImage};}));
   const before=await checker();await p.locator('.cafe-a-typography').evaluate(root=>root.style.setProperty('--menu-role-brand-color','#8a3456'));
   const after=await checker();for(let i=0;i<2;i++){assert.equal(after[i].height,before[i].height);assert.equal(after[i].position,before[i].position);assert.ok(after[i].background.includes('rgb(138, 52, 86)'),'both checker bands follow saved brand color');}
  }
  rows.push({...c,...current});console.log('PASS',c.design||c.key,c.device);
 }catch(e){failures.push({...c,error:e.message});console.log('FAIL',c.design||c.key,c.device,e.message);}finally{await p.close();}
}
try{for(let i=0;i<cases.length;i+=3)await Promise.all(cases.slice(i,i+3).map(check));
 for(const row of rows){const family=row.key.startsWith('dining')?'dining-full-page':'basic-first-column';const reference=rows.find(r=>r.design===family&&r.device===row.device);assert.ok(reference);for(const role of ['name','secondary','description','price'])assert.deepEqual(row.roles[role],reference.roles[role],`${row.design||row.key} ${row.device} ${role} follows its default design`);}
}finally{await browser.close();await fs.writeFile(`${out}/report.json`,JSON.stringify({rows,failures,errors,writes},null,2));}
assert.deepEqual(failures,[]);assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);console.log(JSON.stringify({checked:rows.length,layoutPairs:26,checkerDevices:3}));
