import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';

const base=process.env.SALE_COLOR_QA_BASE||'http://localhost:3028';
const output=process.env.SALE_COLOR_QA_OUTPUT||'/private/tmp/time-sale-color-contract';
const capture=process.env.SALE_COLOR_QA_THUMBNAILS==='1';
const standards=['basic-first-column','basic-top-row','basic-top-row-left-logo','basic-center-column','basic-upper-left','basic-first-column-album','basic-top-row-album'];
const native=['cafe_design_a','cafe_mocha_forest_a','cafe_sunday_line_a','cafe_van_gogh_a','cafe_round_focus_a','fast_food_loop_bagel_a','restaurant_onue_a'];
const devices=[['pc',1440,900],['tablet',820,1180],['mobile',390,844]];
const cases=[...standards.flatMap(design=>devices.map(device=>({key:'cafe_design_a',design,device}))),...native.flatMap(key=>devices.filter(d=>d[0]!=='tablet').map(device=>({key,device}))),...['basic-top-row','basic-first-column-album','cafe_van_gogh_a'].flatMap(id=>devices.filter(d=>d[0]!=='tablet').map(device=>({key:id.startsWith('basic')?'cafe_design_a':id,design:id.startsWith('basic')?id:undefined,device,custom:true})))];
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch(),results=[],errors=[];
function readColors(){
  return [...document.querySelectorAll('.cafe-a-time-sale-time-text')].filter(el=>el.getBoundingClientRect().width>0&&!el.closest('[inert]')).map(el=>{
    let parent=el.parentElement;while(parent&&!parent.querySelector('.cafe-a-time-sale-badge'))parent=parent.parentElement;
    const badge=parent?.querySelector('.cafe-a-time-sale-badge');
    return {text:el.textContent,color:getComputedStyle(el).color,chip:badge?getComputedStyle(badge).backgroundColor:null,chipText:badge?getComputedStyle(badge).color:null,countdown:el.hasAttribute('data-cafe-a-time-sale-digital-timer'),children:[...el.querySelectorAll('span,svg')].map(child=>getComputedStyle(child).color)};
  });
}
function check(rows,label,requireBoth){
  assert.ok(rows.length>=1,label+' sale timing sample present');
  if(requireBoth){assert.ok(rows.some(r=>r.countdown),label+' countdown present');assert.ok(rows.some(r=>!r.countdown),label+' message present');}
  for(const row of rows){assert.equal(row.color,row.chip,label+' sale copy follows chip background');for(const color of row.children)assert.equal(color,row.chip,label+' digits/icon/script color');}
}
try{
  for(const c of cases.filter(c=>process.env.SALE_COLOR_QA_SCOPE!=='additional'||!c.design||c.custom)){
    const [device,width,height]=c.device,p=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    p.on('pageerror',e=>errors.push(e.message));
    try{
      const query=new URLSearchParams({view:'actual',device});if(c.design)query.set('design',c.design);
      if(c.custom)query.set('designPreview',JSON.stringify({fonts:{other:{color:'#765432'}},textColors:{supporting:'#765432'},chipColors:{saleBackground:'#25478A',saleText:'#FFFFFF'}}));
      assert.equal((await p.goto(`${base}/templates/${c.key}/preview?${query}`,{waitUntil:'networkidle'})).status(),200);
      await p.evaluate(()=>document.fonts.ready);
      await p.locator('.cafe-a-time-sale-time-text').filter({visible:true}).first().waitFor();
      const before=await p.evaluate(readColors),label=[c.design||c.key,device,c.custom?'custom':'default'].join('/');check(before,label,Boolean(c.design));
      if(c.custom)for(const row of before)assert.equal(row.chip,'rgb(37, 71, 138)');
      const root=p.locator('.cafe-a-typography').first();
      const saved=await root.evaluate(root=>({style:root.getAttribute('style'),roles:root.getAttribute('data-menu-text-colors')}));
      // Exercise the legacy saved supporting-color selector that caused the regression.
      await root.evaluate(root=>{root.dataset.menuTextColors='supporting';root.style.setProperty('--menu-role-supporting-color','#765432');});
      check(await p.evaluate(readColors),label+'/saved-supporting',Boolean(c.design));
      await root.evaluate((root,saved)=>{if(saved.style===null)root.removeAttribute('style');else root.setAttribute('style',saved.style);if(saved.roles===null)root.removeAttribute('data-menu-text-colors');else root.setAttribute('data-menu-text-colors',saved.roles);},saved);
      if(!c.custom&&c.design==='basic-top-row'&&device==='pc')await p.screenshot({path:`${output}/basic-top-row.png`});
      if(capture&&c.design&&device==='pc'&&!c.custom){await p.setViewportSize({width:1200,height:900});await p.waitForTimeout(300);await p.addStyleTag({content:'nextjs-portal { display:none !important; }'});await p.screenshot({path:`public/template-previews/default-${c.design}-20261119-sale-color.jpg`,type:'jpeg',quality:86,animations:'disabled'});}
      results.push({label,viewport:[width,height],colors:before});console.log('PASS',label);
    }finally{await p.close();}
  }
  assert.deepEqual(errors,[]);
}finally{await browser.close();await fs.writeFile(`${output}/report.json`,JSON.stringify({base,results,errors},null,2));}
console.log(JSON.stringify({checked:results.length,errors}));
