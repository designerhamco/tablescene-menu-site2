import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { HERO_CAFE_PHOTOS, HERO_COUNTER_TIMELINE, HERO_CHAPTER_DURATION_MS, heroProgressAt } from '../lib/hero-cafe-motion.ts';

const base=process.env.QA_BASE||'http://localhost:3047';
const out=process.env.QA_OUT||'tmp/qa/hero-backgrounds';
const sizes=process.env.QA_COMPACT?[[390,844],[1440,900],[3440,1440]]:[[320,740],[390,844],[430,932],[820,1180],[1440,900],[1920,1080],[2560,1440],[3440,1440],[5120,1440]];
await mkdir(out,{recursive:true});
let browser;
const results=[],errors=[],writes=[],outpaintRequests=[];
// Regression-only samples at photographed outer edges; these do not drive rendering.
const edgeSamples={venue:[],counter:[[1250,760]],dining:[[1150,90],[300,300]],phone:[[80,220],[1200,850]]};
try {
 for(const [width,height] of sizes.filter(([w])=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH))){
  browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width,height}});
  page.on('pageerror',error=>errors.push({width,message:error.message}));
  page.on('request',request=>{if(request.url().includes('hero-cafe-v2')||request.url().includes('-expanded.webp'))outpaintRequests.push(request.url());});
  await page.route('**/api/**',route=>route.request().method()==='GET'?route.continue():(writes.push(route.request().url()),route.abort()));
  await page.goto(base+'/',{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-hero-motion]').waitFor();
  await page.locator('[data-hero-original]').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.locator('[data-hero-surroundings]').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  const masking=await page.locator('[data-hero-surroundings]').evaluateAll((images,edgeSamples)=>images.map(image=>{
   const canvas=document.createElement('canvas');canvas.width=1536;canvas.height=1024;const context=canvas.getContext('2d');context.drawImage(image,0,0);
   const alpha=(x,y)=>context.getImageData(x,y,1,1).data[3],scene=image.dataset.heroSurroundings;
   const positions=[0,154,307,461,614,768];
   return {scene,center:alpha(768,512),left:positions.map(x=>alpha(x,512)),right:positions.map(x=>alpha(1535-x,512)),top20:alpha(768,205),bottom20:alpha(768,819),edgeExposure:edgeSamples[scene].map(([x,y])=>alpha(x,y))};
  }),edgeSamples);
  assert.equal(masking.length,4);
  for(const mask of masking){
   assert.equal(mask.center,255,'the center is intact; no center hole or subject cutouts');
   for(const profile of [mask.left,mask.right]){assert.equal(profile[0],0);assert.ok(profile.every((a,i)=>i===0||a>=profile[i-1]),'fade is continuous and monotonic from each side');}
   mask.left.forEach((a,i)=>assert.ok(Math.abs(a-mask.right[i])<=4,'both lateral edges share one symmetric profile'));
   assert.ok(mask.left[2]<mask.top20&&mask.left[2]<mask.bottom20,'top/bottom treatment is shallower than the sides');
   assert.ok(mask.edgeExposure.every(a=>a<=32),'outer faces and malformed arm ends are strongly faded');
   assert.deepEqual(mask.left,masking[0].left,'every photo uses the same edge profile');
  }
  const states=[];
  async function readState(){return page.evaluate(()=>{
    const hero=document.querySelector('[data-hero-motion]'),plane=hero.querySelector('[data-hero-plane][data-active="true"]'),photo=plane.querySelector('[data-hero-original]'),canvas=photo.parentElement,r=canvas.getBoundingClientRect(),frame=plane.querySelector('[data-hero-framing]'),f=frame.getBoundingClientRect(),ambient=plane.querySelector('[data-hero-ambient]'),a=ambient.getBoundingClientRect();
    const scale=r.width/1536,surroundings=plane.querySelector('[data-hero-surroundings]'),b=surroundings.parentElement.getBoundingClientRect();
    const screens=[...plane.querySelectorAll('[data-hero-screen]')].map(screen=>{const s=screen.getBoundingClientRect();return {width:s.width/innerHeight,height:s.height/innerHeight,center:(s.x+s.width/2-innerWidth/2)/innerHeight,y:s.y/innerHeight};});
    return {image:plane.dataset.heroPlane,chapter:Number(hero.dataset.chapter),stageHeight:hero.firstElementChild.clientHeight,original:{src:photo.getAttribute('src'),x:r.x,y:r.y,width:r.width,height:r.height,loaded:photo.naturalWidth>0,filter:getComputedStyle(photo).filter,edgeMask:getComputedStyle(photo).maskImage},scale,screens,frame:{left:f.left,width:f.width,mask:getComputedStyle(frame).maskImage,overflow:getComputedStyle(frame).overflow},ambient:{src:ambient.getAttribute('src'),filter:getComputedStyle(ambient).filter,opacity:getComputedStyle(ambient).opacity,covers:a.left<=0&&a.top<=0&&a.right>=innerWidth&&a.bottom>=innerHeight},surroundings:{src:surroundings.getAttribute('src'),x:b.x,y:b.y,width:b.width,mapping:getComputedStyle(surroundings).transform},expanded:hero.querySelectorAll('[data-hero-expanded]').length,overflow:document.documentElement.scrollWidth>innerWidth+1,frames:hero.querySelectorAll('iframe').length};
  });}
  for(let chapter=0;chapter<4;chapter++){
   if(chapter){await page.locator(`[data-hero-segment="${chapter}"]`).dispatchEvent("pointerdown");await page.locator(`[data-hero-segment="${chapter}"]`).evaluate(button=>button.click());}
   await page.waitForFunction(index=>Number(document.querySelector('[data-hero-motion]').dataset.chapter)===index,chapter);
   await page.waitForTimeout(700);
   if(chapter>0){await page.locator('[data-hero-live][data-ready="true"]').waitFor({timeout:20000}).catch(()=>{});await page.waitForTimeout(400);}
   const state=await readState();
   assert.equal(state.chapter,chapter,`${width}: requested chapter remains active after demo readiness`);
   assert.equal(state.stageHeight,height);assert.equal(state.original.loaded,true);assert.equal(state.overflow,false);assert.equal(state.expanded,0,'unmasked surroundings must never be displayed');
   assert.equal(state.ambient.covers,true);assert.ok(state.ambient.src.endsWith('/venue.webp'),'surroundings use the person-free venue only');assert.equal(state.ambient.filter,'blur(48px)');assert.equal(state.frame.overflow,'visible');assert.equal(state.frame.mask,'none');assert.equal(state.original.filter,'none','normal hands and device photos are never blurred');assert.ok(state.original.edgeMask.includes('3%')&&state.original.edgeMask.includes('97%')&&state.original.edgeMask.includes('6%')&&state.original.edgeMask.includes('94%'),'only the true photo edges are lightly feathered');
   assert.ok(state.surroundings.src.endsWith(`/${state.image}-surroundings.svg`));
   assert.equal(state.surroundings.mapping,'matrix(2, 0, 0, 2, -768, -512)');
   assert.ok(Math.abs(state.surroundings.x-state.original.x)<.25&&Math.abs(state.surroundings.y-state.original.y)<.25&&Math.abs(state.surroundings.width-state.original.width)<.25,'photo and soft-edge surroundings share the same camera');
   assert.ok(state.original.src.endsWith(HERO_CAFE_PHOTOS[state.image]));assert.ok(state.frames<=2);
   if(width/height>1.6){assert.ok(Math.abs(state.frame.width/height-1.6)<.001);assert.ok(Math.abs(state.frame.left-(width-state.frame.width)/2)<1);assert.equal(state.frame.mask,'none','no interior frame mask may obscure hands');}
   if(width===1440)assert.ok(Math.abs(state.scale-[.9375,1.0125,.975,.9375][chapter])<.01,'notebook start scale stays unchanged');
   states.push(state);
   if([390,1440,3440,5120].includes(width))await page.screenshot({path:`${out}/${width}-${chapter}.png`});
   if(chapter===1||chapter===3){
    const fraction=chapter===1?(HERO_COUNTER_TIMELINE.zoom[1]+1)/HERO_CHAPTER_DURATION_MS[1]*1000:.2;
    const lengths=await page.locator('[data-hero-motion]').evaluate(el=>({height:el.offsetHeight,stage:el.firstElementChild.offsetHeight}));
    await page.evaluate(({height,stage,progress})=>scrollTo({top:(height-stage)*progress+.5,behavior:'instant'}),{...lengths,progress:heroProgressAt(chapter,fraction)});
    await page.waitForTimeout(700);
    const zoomed=await readState();assert.equal(zoomed.overflow,false);assert.equal(zoomed.expanded,0);
    if([390,3440].includes(width))await page.screenshot({path:`${out}/${width}-${chapter}-zoom.png`});
   }
  }
  await page.locator('[data-hero-segment="0"]').dispatchEvent('pointerdown');await page.locator('[data-hero-segment="0"]').evaluate(button=>button.click());await page.waitForFunction(()=>document.querySelector('[data-hero-motion]').dataset.chapter==='0');
  if(width===390){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:460}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:210,y:300}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>scrollY>0),'mockup swipe scrolls the page');}
  results.push({width,height,masking,states});console.log('PASS',width,height);await browser.close();
 }
 const notebook=results.find(r=>r.width===1440);
 if(notebook)for(const result of results.filter(r=>r.width>1440))for(let chapter=0;chapter<4;chapter++){
  result.states[chapter].screens.forEach((screen,i)=>{for(const key of ['width','height','center','y'])assert.ok(Math.abs(screen[key]-notebook.states[chapter].screens[i][key])<.005,`${result.width}/${chapter}/${i}: normalized ${key} matches notebook`);});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(outpaintRequests,[]);
 await writeFile(`${out}/report.json`,JSON.stringify({base,results,errors,writes,outpaintRequests},null,2));
}finally{await browser?.close();}
