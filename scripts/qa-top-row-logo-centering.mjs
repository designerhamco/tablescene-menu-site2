import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';

// Read-only rendered regression: customer mobile and left-logo layouts stay separate.
const base = process.env.TOP_ROW_QA_BASE || 'http://localhost:3039';
const out = process.env.TOP_ROW_LOGO_QA_OUT || '/tmp/top-row-logo-centering';
const record = process.env.TOP_ROW_LOGO_QA_RECORD === '1';
const baseline = process.env.TOP_ROW_LOGO_QA_BASELINE ? JSON.parse(await fs.readFile(process.env.TOP_ROW_LOGO_QA_BASELINE, 'utf8')) : null;
const centered = [
  {key:'cafe_van_gogh_a'}, {key:'cafe_sunday_line_a'},
  {key:'cafe_real_matcha_a',design:'basic-top-row'}, {key:'cafe_real_matcha_a',design:'basic-top-row-album'},
];
const left = [{key:'cafe_mocha_forest_a'}, {key:'cafe_real_matcha_a',design:'basic-top-row-left-logo'}];
const sizes = [['pc',1440,900],['tablet',1180,820],['tablet',820,1180]];
const cases = [
  ...centered.flatMap(entry => sizes.flatMap(size => [false,true].map(surface=>({...entry,size,surface,logo:true,centered:true})))),
  ...centered.flatMap(entry=>['square','tall'].map(shape=>({...entry,size:['pc',1440,900],logo:true,centered:true,surface:true,shape}))),
  ...centered.map(entry=>({...entry,size:['pc',1440,900],logo:false})),
  ...centered.map(entry=>({...entry,size:['mobile',390,844],logo:true})),
  ...left.flatMap(entry=>[...sizes,['mobile',390,844]].map(size=>({...entry,size,logo:true}))),
];
const selected = process.env.TOP_ROW_LOGO_QA_EXTENDED ? cases.filter(c=>c.shape||c.size[1]===1180) : process.env.TOP_ROW_LOGO_QA_SMOKE ? cases.filter(c=>c.centered&&c.surface&&c.size[0]==='pc') : cases;
const browser = await chromium.launch();
const results = [], errors = [], writes = [];
const measure = () => {
  const visible = e => e.getBoundingClientRect().height>0&&!e.closest('[aria-hidden="true"]');
  const pick = s => [...document.querySelectorAll(s)].find(visible);
  const header = pick('[data-cafe-a-topline-info-header],[data-basic-top-row]');
  const frame = pick('[data-native-scroll],[data-paged-ready]');
  const native = header?.closest('[data-native-header]');
  const identity = header?.querySelector('.cafe-a-topline-brand-identity') ?? header?.querySelector('[data-menu-logo-slot]')?.parentElement;
  const logo=pick('[data-menu-logo-box]');
  const bounds = e => {if(!e)return null;const r=e.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};};
  const inset=header?parseFloat(getComputedStyle(header).columnGap):0;
  // Painted top rows include padding; unpainted rows have the same virtual
  // band, from page top through the lower inner inset before the menu gap.
  const grid=bounds(header),parent=bounds(native);
  const panel=frame?.dataset.representativePanel==='true';
  const band=grid?(panel ? (parent||grid) : {y:bounds(frame).y,height:grid.y+grid.height+inset-bounds(frame).y}):null;
  return {viewport:[innerWidth,innerHeight],header:grid,band,identity:bounds(identity),logo:bounds(logo),frame:bounds(frame),
    description:bounds(header?.querySelector('.cafe-a-topline-description,.cafe-a-store-description')),
    notices:bounds(header?.querySelector('.cafe-a-topline-notice-text,[data-paged-notices]')),
    trigger:bounds(header?.querySelector('[data-language-menu-trigger]')),
    menu:bounds(pick('[data-native-menu-panel],[data-paged-menu-panel]')),
    mobile:header?null:[...document.querySelectorAll('[data-menu-logo-box],[data-cafe-a-menu-item]')].filter(visible).slice(0,5).map(bounds),
    overflow:document.documentElement.scrollWidth>innerWidth+1};
};
function sameRect(actual, expected, message) {
  assert.equal(Boolean(actual),Boolean(expected),message);
  if(actual)for(const key of ['x','y','width','height'])assert.ok(Math.abs(actual[key]-expected[key])<1,`${message}/${key}: ${actual[key]} vs ${expected[key]}`);
}
try {
  await fs.mkdir(out,{recursive:true});
  for(const c of selected) {
    const [device,width,height]=c.size;
    const id=`${c.design||c.key}/${device}/${c.surface?'colored':'plain'}/${c.logo?'logo':'text'}${c.shape?'/'+c.shape:''}`;
    const page=await browser.newPage({viewport:{width,height},reducedMotion:'reduce'});
    page.on('pageerror',e=>errors.push({id,message:e.message}));
    await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
    try {
      if(c.shape)await page.route('**/placeholders/starter/default-logo.svg',r=>r.fulfill({contentType:'image/svg+xml',body:`<svg xmlns="http://www.w3.org/2000/svg" width="${c.shape==='square'?400:200}" height="${c.shape==='square'?400:600}"><rect width="100%" height="100%" fill="#eeeeee"/></svg>`}));
      const query=new URLSearchParams({device,view:'actual',embedded:'1',logoPreview:c.logo?'on':'off',...(c.design?{design:c.design}:{}),...(c.surface?{designPreview:JSON.stringify({auxiliaryBackground:'#178559'})}:{})});
      await page.goto(`${base}/templates/${c.key}/preview?${query}`,{waitUntil:'load'});
      await page.evaluate(()=>document.fonts.ready);
      if(device!=='mobile')await page.locator('[data-native-ready="true"],[data-paged-ready="true"]').filter({visible:true}).first().waitFor();
      if(c.logo)await page.locator('[data-menu-logo-ready="true"]').filter({visible:true}).first().waitFor();
      let previous, state;
      for(let i=0;i<35;i++){state=await page.evaluate(measure);if(JSON.stringify(state)===JSON.stringify(previous))break;previous=state;await page.waitForTimeout(100);}
      assert.equal(state.overflow,false,id);
      if(!record&&c.centered) {
        const logoCenter=state.logo.y+state.logo.height/2, bandCenter=state.band.y+state.band.height/2;
        assert.ok(state.logo.y>=state.band.y-1&&state.logo.y+state.logo.height<=state.band.y+state.band.height+1,`${id}: logo stays in representative band`);
        assert.ok(Math.abs(state.logo.x+state.logo.width/2-(state.header.x+state.header.width/2))<1,`${id}: horizontal center preserved`);
        if(c.shape)assert.ok(Math.abs(state.logo.width/state.logo.height-(c.shape==='square'?1:1/3))<.01,`${id}: artwork aspect preserved`);
        assert.ok(Math.abs(logoCenter-bandCenter)<1,`${id}: logo center ${logoCenter}, band center ${bandCenter}`);
      }
      if(!record&&c.centered&&c.surface){
        const trigger=page.locator('[data-language-menu-trigger]').filter({visible:true}).first();
        if(await trigger.count())for(let i=0;i<2;i++){
          await trigger.click();await page.keyboard.press('Escape');
          const closed=await page.evaluate(measure);
          for(const key of ['header','logo','description','notices','trigger','menu'])sameRect(closed[key],state[key],`${id}: language reopen/${key}`);
        }
      }
      const old=baseline?.results.find(r=>r.id===id&&r.state.viewport[0]===width&&r.state.viewport[1]===height)?.state;
      if(old){
        for(const key of ['header','frame','description','notices','trigger','menu'])sameRect(state[key],old[key],`${id}/${key}`);
        if(c.centered){for(const key of ['x','width','height'])assert.ok(Math.abs(state.logo[key]-old.logo[key])<1,`${id}: logo ${key} preserved`);}
        else{sameRect(state.logo,old.logo,`${id}: excluded logo`);assert.deepEqual(state.mobile,old.mobile,`${id}: mobile reading geometry`);}
      }
      if(c.centered&&c.surface&&device==='pc'&&c.key==='cafe_van_gogh_a')await page.screenshot({path:`${out}/centered-logo.png`});
      results.push({id,state});console.log('PASS',id);
    }finally{await page.close();}
  }
}finally{await browser.close();}
assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
await fs.writeFile(`${out}/report.json`,JSON.stringify({base,record,results,errors,writes},null,2));
console.log(JSON.stringify({cases:results.length,errors,writes}));
