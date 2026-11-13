import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {catalogDesigns} from '../lib/catalog-designs.ts';
import {getFixedHeaderIdentityAlignment} from '../lib/menu-design-surfaces.ts';
import {getTemplatePreviewRouteKey} from '../lib/templates.ts';

// node --import tsx scripts/qa-left-logo-device-alignment.mjs
const base=process.env.ORDER_QA_BASE||'http://localhost:3000';
const output=process.env.ORDER_QA_OUTPUT||'/private/tmp/left-logo-device-alignment';
await fs.mkdir(output,{recursive:true});
const designs=catalogDesigns.filter(d=>d.service==='basic'&&getFixedHeaderIdentityAlignment(d.templateKey,{menu_design_id:d.id})==='left');
const browser=await chromium.launch(),results=[],errors=[],writes=[];
const page=await browser.newPage({reducedMotion:'reduce'});
page.on('pageerror',e=>errors.push(e.message));
await page.route('**/api/**',r=>r.request().method()==='GET'?r.continue():(writes.push(r.request().url()),r.abort()));
const read=()=>{
 const scope=document.querySelector('[data-menu-appearance]');
 const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[aria-hidden=true]');};
 const pick=s=>[...scope.querySelectorAll(s)].find(visible);
 const header=pick('[data-basic-top-row],[data-cafe-a-topline-info-header]');
 const identity=header||scope;
 const find=s=>[...identity.querySelectorAll(s)].find(visible);
 const logo=find('[data-menu-logo-slot]');
 const title=find('.cafe-a-store-title');
 const description=find('.cafe-a-topline-description,.cafe-a-store-description,[data-cafe-a-store-description]');
 const rect=e=>{const r=e.getBoundingClientRect();return {left:r.left,right:r.right,width:r.width,top:r.top,height:r.height};};
 return {viewport:[innerWidth,innerHeight],header:header?rect(header):null,
  title:title?getComputedStyle(title).textAlign:null,description:description?getComputedStyle(description).textAlign:null,
  logo:logo?{slot:rect(logo),box:rect(logo.querySelector('[data-menu-logo-box]')),justify:getComputedStyle(logo).justifyContent}:null,
  scopeAlignment:scope.dataset.representativeAlign,outerWidth:document.documentElement.scrollWidth};
};
async function settled(target=page,expectLogo=false){
 await target.locator('[data-menu-appearance]').waitFor();await target.locator('body').evaluate(()=>document.fonts.ready);
 await target.locator('[data-menu-logo-slot]').evaluateAll(logos=>Promise.all(logos.flatMap(l=>[...l.querySelectorAll('img')].map(i=>i.decode().catch(()=>{})))));
 let last;
 for(let i=0;i<55;i++){
  await page.waitForTimeout(100);
  const pending=await target.locator('body').evaluate((_body,expectLogo)=>{
   const visible=e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width>0&&r.height>0&&s.visibility!=='hidden'&&s.display!=='none'&&!e.closest('[aria-hidden=true]');};
   const root=document.querySelector('[data-menu-appearance]');
   const logos=[...root.querySelectorAll('[data-menu-logo-slot]')].filter(visible);
   return (innerWidth>=768&&[...document.querySelectorAll('[data-native-ready="false"],[data-paged-ready="false"]')].some(visible))
    ||(expectLogo&&(!logos.length||logos.some(e=>e.dataset.menuLogoReady!=='true'||e.dataset.menuLogoMeasured!=='true')));
  },expectLogo);
  if(pending){last=undefined;continue;}
  const state=await target.locator('body').evaluate(read);
  if(JSON.stringify(state)===JSON.stringify(last))return state;
  last=state;
 }
 assert.fail(`alignment did not settle: ${page.url()} ${JSON.stringify(await target.locator('body').evaluate(read))}`);
}
function check(state,mobile,alignment,logo){
 assert.equal(state.outerWidth,state.viewport[0]);
 assert.equal(Boolean(state.header),!mobile,'mobile identity is outside fixed headers');
 const brand=mobile?alignment:'left';
 assert.equal(state.description,mobile?alignment:'right','description follows device policy');
 if(logo){
  assert.ok(state.logo,'logo identity is visible');
  const {slot,box}=state.logo;
  const offset=brand==='left'?box.left-slot.left:brand==='right'?slot.right-box.right:(slot.left+slot.right-box.left-box.right)/2;
  assert.ok(Math.abs(offset)<1,`actual logo box alignment ${brand}: ${offset}`);
 }else assert.equal(state.title,brand,'actual text identity follows device policy');
}
function href(design,params){
 const url=new URL(`/templates/${getTemplatePreviewRouteKey(design.templateKey)}/preview`,base);
 if(design.kind==='standard')url.searchParams.set('design',design.id);
 for(const[k,v]of Object.entries(params))url.searchParams.set(k,v);
 return url.toString();
}
try{
 assert.ok(designs.length>=2,'discover all registered native/default left-logo designs');
 for(const design of designs)for(const logo of [false,true])for(const alignment of [undefined,'left','center','right'])for(const[device,width,height]of [['mobile',390,844],['tablet',820,1180],['pc',1440,900]]){
  await page.setViewportSize({width,height});
  await page.goto(href(design,{device,view:'actual',embedded:'1',logoPreview:logo?'on':'off',...(alignment?{designPreview:JSON.stringify({representativeAlignment:alignment})}:{})}),{waitUntil:'domcontentloaded'});
  const state=await settled(page,logo);check(state,device==='mobile',alignment||'center',logo);
  results.push({case:'render',design:design.id,logo,alignment:alignment||'default',device,...state});
  if(device==='pc')console.log('PASS',design.id,logo?'logo':'text',alignment||'default');
 }
 // Real viewing-option changes and device links must preserve mobile choice.
 for(const design of designs)for(const logo of [false,true]){
  await page.setViewportSize({width:1440,height:1000});
  await page.goto(href(design,{device:'mobile',previewOptions:'design',logoPreview:logo?'on':'off'}),{waitUntil:'domcontentloaded'});
  const frame=page.frameLocator('iframe');
  const select=page.getByRole('combobox',{name:'가게명·가게 설명 정렬',exact:true});
  await select.waitFor();check(await settled(frame,logo),true,'center',logo);
  assert.equal(await select.isEnabled(),true);assert.equal(await select.inputValue(),'center');
  for(const alignment of ['right','center','left']){
   await select.selectOption(alignment);await page.waitForURL(u=>JSON.parse(u.searchParams.get('designPreview')||'{}').representativeAlignment===alignment);
   check(await settled(frame,logo),true,alignment,logo);
   for(const device of ['PC','태블릿','모바일']){
    await page.getByRole('navigation',{name:'미리보기 기기 선택'}).getByRole('link',{name:device,exact:true}).click();
    await page.waitForURL(u=>u.searchParams.get('device')===({'PC':'pc','태블릿':'tablet','모바일':'mobile'}[device]));
    const state=await settled(frame,logo);check(state,device==='모바일',alignment,logo);
    assert.equal(await select.isEnabled(),device==='모바일');
    assert.equal(JSON.parse(new URL(page.url()).searchParams.get('designPreview')).representativeAlignment,alignment,'desktop must not overwrite mobile choice');
    if(device==='모바일'){
     await page.waitForFunction(value=>document.querySelector('[data-preview-representative-alignment] select')?.value===value,alignment);
     assert.equal(await select.inputValue(),alignment);
    }
    else {
     await page.waitForFunction(()=>document.querySelector('[data-preview-representative-alignment] select')?.selectedOptions[0]?.textContent?.match(/왼쪽.*설명 오른쪽/));
     assert.match(await select.locator('option:checked').innerText(),/왼쪽.*설명 오른쪽/,'disabled control reports fixed geometry');
    }
    results.push({case:'device-roundtrip',design:design.id,logo,alignment,device,...state});
    if(device==='모바일')console.log('PASS roundtrip',design.id,logo?'logo':'text',alignment);
   }
  }
  await page.screenshot({path:`${output}/${design.id}-${logo?'logo':'text'}-mobile.png`});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
}finally{
 await page.screenshot({path:`${output}/last.png`});await browser.close();
 await fs.writeFile(`${output}/report.json`,JSON.stringify({results,errors,writes},null,2));
}
console.log(JSON.stringify({checked:results.length,errors,writes}));
