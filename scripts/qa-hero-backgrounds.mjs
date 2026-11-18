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
  const states=[];
  async function readState(){return page.evaluate(()=>{
    const hero=document.querySelector('[data-hero-motion]'),plane=hero.querySelector('[data-hero-plane][data-active="true"]'),photo=plane.querySelector('[data-hero-original]'),canvas=photo.parentElement,r=canvas.getBoundingClientRect(),frame=plane.querySelector('[data-hero-framing]'),f=frame.getBoundingClientRect(),ambient=plane.querySelector('[data-hero-ambient]'),a=ambient.getBoundingClientRect();
    const scale=r.width/1536;
    const screens=[...plane.querySelectorAll('[data-hero-screen]')].map(screen=>{const s=screen.getBoundingClientRect();return {width:s.width/innerHeight,height:s.height/innerHeight,center:(s.x+s.width/2-innerWidth/2)/innerHeight,y:s.y/innerHeight};});
    return {image:plane.dataset.heroPlane,chapter:Number(hero.dataset.chapter),stageHeight:hero.firstElementChild.clientHeight,original:{src:photo.getAttribute('src'),x:r.x,y:r.y,width:r.width,height:r.height,loaded:photo.naturalWidth>0},scale,screens,frame:{left:f.left,width:f.width,mask:getComputedStyle(frame).maskImage,overflow:getComputedStyle(frame).overflow},ambient:{src:ambient.getAttribute('src'),filter:getComputedStyle(ambient).filter,opacity:getComputedStyle(ambient).opacity,covers:a.left<=0&&a.top<=0&&a.right>=innerWidth&&a.bottom>=innerHeight},expanded:hero.querySelectorAll('[data-hero-expanded]').length,overflow:document.documentElement.scrollWidth>innerWidth+1,frames:hero.querySelectorAll('iframe').length};
  });}
  for(let chapter=0;chapter<4;chapter++){
   if(chapter)await page.locator(`[data-hero-segment="${chapter}"]`).evaluate(button=>button.click());
   await page.waitForFunction(index=>Number(document.querySelector('[data-hero-motion]').dataset.chapter)===index,chapter);
   await page.waitForTimeout(700);
   if(chapter>0){await page.locator('[data-hero-live][data-ready="true"]').waitFor({timeout:20000}).catch(()=>{});await page.waitForTimeout(400);}
   const state=await readState();
   assert.equal(state.stageHeight,height);assert.equal(state.original.loaded,true);assert.equal(state.overflow,false);assert.equal(state.expanded,0,'generated surroundings must never be displayed');
   assert.equal(state.ambient.covers,true);assert.ok(state.ambient.src.endsWith('/venue.webp'),'surroundings use the person-free venue only');assert.equal(state.ambient.filter,'blur(48px)');assert.equal(state.frame.overflow,'hidden');
   assert.ok(state.original.src.endsWith(HERO_CAFE_PHOTOS[state.image]));assert.ok(state.frames<=2);
   if(width/height>1.6){assert.ok(Math.abs(state.frame.width/height-1.6)<.001);assert.ok(Math.abs(state.frame.left-(width-state.frame.width)/2)<1);assert.notEqual(state.frame.mask,'none','clear photo must fade at the side boundary');}
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
  await page.locator('[data-hero-segment="0"]').evaluate(button=>button.click());await page.waitForFunction(()=>document.querySelector('[data-hero-motion]').dataset.chapter==='0');
  if(width===390){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:460}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:210,y:300}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>scrollY>0),'mockup swipe scrolls the page');}
  results.push({width,height,states});console.log('PASS',width,height);await browser.close();
 }
 const notebook=results.find(r=>r.width===1440);
 if(notebook)for(const result of results.filter(r=>r.width>1440))for(let chapter=0;chapter<4;chapter++){
  result.states[chapter].screens.forEach((screen,i)=>{for(const key of ['width','height','center','y'])assert.ok(Math.abs(screen[key]-notebook.states[chapter].screens[i][key])<.005,`${result.width}/${chapter}/${i}: normalized ${key} matches notebook`);});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(outpaintRequests,[]);
 await writeFile(`${out}/report.json`,JSON.stringify({base,results,errors,writes,outpaintRequests},null,2));
}finally{await browser?.close();}
