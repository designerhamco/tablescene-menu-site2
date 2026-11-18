import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { HERO_CAFE_PHOTOS, HERO_COUNTER_TIMELINE, HERO_CHAPTER_DURATION_MS } from '../lib/hero-cafe-motion.ts';

const base=process.env.QA_BASE||'http://localhost:3046';
const out=process.env.QA_OUT||'tmp/qa/hero-backgrounds';
const sizes=process.env.QA_COMPACT?[[390,844],[1440,900],[3440,1440]]:[[320,740],[390,844],[430,932],[820,1180],[1440,900],[1920,1080],[2560,1440],[3440,1440],[5120,1440]];
await mkdir(out,{recursive:true});
let browser;
const results=[],errors=[],writes=[];
try {
 for(const [width,height] of sizes.filter(([w])=>!process.env.QA_WIDTH||w===Number(process.env.QA_WIDTH))){
  browser=await chromium.launch();
  const page=await browser.newPage({viewport:{width,height}});
  page.on('pageerror',error=>errors.push({width,message:error.message}));
  await page.route('**/api/**',route=>route.request().method()==='GET'?route.continue():(writes.push(route.request().url()),route.abort()));
  await page.goto(base+'/',{waitUntil:'load'});
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('[data-hero-motion]').waitFor();
  await page.locator('[data-hero-expanded]').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  const states=[];
  for(let chapter=0;chapter<4;chapter++){
   if(chapter)await page.locator(`[data-hero-dot="${chapter}"]`).click();
   try { await page.waitForFunction(index=>Number(document.querySelector('[data-hero-motion]').dataset.chapter)===index,chapter); } catch(error) { console.log('NAVIGATION STATE',await page.evaluate(()=>({scrollY,hero:document.querySelector('[data-hero-motion]')?.dataset}))); throw error; }
   await page.waitForTimeout(700);
   const state=await page.evaluate(()=>{
    const hero=document.querySelector('[data-hero-motion]'),plane=hero.querySelector('[data-hero-plane][data-active="true"]'),photo=plane.querySelector('[data-hero-original]'),expanded=plane.querySelector('[data-hero-expanded]'),canvas=photo.parentElement,r=canvas.getBoundingClientRect();
    const scale=r.width/1536,inverse=new DOMMatrix(getComputedStyle(expanded).transform).inverse();
    const corners=[[0,0],[innerWidth,0],[innerWidth,innerHeight],[0,innerHeight]].map(([x,y])=>inverse.transformPoint(new DOMPoint((x-r.x)/scale,(y-r.y)/scale)));
    const original=photo.getBoundingClientRect();
    return {image:plane.dataset.heroPlane,chapter:Number(hero.dataset.chapter),stageHeight:hero.firstElementChild.clientHeight,original:{src:photo.getAttribute('src'),x:original.x,y:original.y,width:original.width,height:original.height},scale,expandedLoaded:expanded.naturalWidth>0,covers:corners.every(p=>p.x>=-2&&p.x<=1538&&p.y>=-2&&p.y<=1026),overflow:document.documentElement.scrollWidth>innerWidth+1,frames:hero.querySelectorAll('iframe').length};
   });
   assert.equal(state.stageHeight,height);assert.equal(state.expandedLoaded,true);assert.equal(state.covers,true,`${width}/${chapter}: expanded image covers the stage`);assert.equal(state.overflow,false);
   assert.ok(state.original.src.endsWith(HERO_CAFE_PHOTOS[state.image]));assert.ok(state.frames<=2);
   if(width===1440){assert.ok(Math.abs(state.scale-[.9375,1.0125,.975,.9375][chapter])<.01,'notebook start scale stays unchanged');}
   states.push(state);
   if([390,3440,5120].includes(width))await page.screenshot({path:`${out}/${width}-${chapter}.png`});
   if(chapter===1||chapter===3){
    const fraction=chapter===1?(HERO_COUNTER_TIMELINE.zoom[1]+1)/HERO_CHAPTER_DURATION_MS[1]*1000:.2;
    const lengths=await page.locator('[data-hero-motion]').evaluate(el=>({height:el.offsetHeight,stage:el.firstElementChild.offsetHeight}));
    // Use current narrative lengths, not hard-coded DOM scroll distances.
    const {heroProgressAt}=await import('../lib/hero-cafe-motion.ts');
    await page.evaluate(({height,stage,progress})=>scrollTo({top:(height-stage)*progress+.5,behavior:'instant'}),{...lengths,progress:heroProgressAt(chapter,fraction)});
    await page.waitForTimeout(700);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
   }
  }
  await page.locator('[data-hero-dot="0"]').click();await page.waitForFunction(()=>document.querySelector('[data-hero-motion]').dataset.chapter==='0');
  if(width===390){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:460}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:210,y:300}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>scrollY>0),'mockup swipe scrolls the page');}
  results.push({width,height,states});console.log('PASS',width,height);await browser.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);
 await writeFile(`${out}/report.json`,JSON.stringify({base,results,errors,writes},null,2));
}finally{await browser?.close();}
