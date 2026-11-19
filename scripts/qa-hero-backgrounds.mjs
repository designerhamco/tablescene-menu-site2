import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { HERO_COUNTER_TIMELINE, HERO_CHAPTER_DURATION_MS, heroProgressAt } from '../lib/hero-cafe-motion.ts';

const base=process.env.QA_BASE||'http://localhost:3047';
const out=process.env.QA_OUT||'tmp/qa/hero-backgrounds';
const sizes=process.env.QA_EDGES_ONLY?[[1512,762],[2560,1440],[3440,1440],[5120,1440]]:process.env.QA_WIDE_ONLY?[[3440,1440],[5120,1440]]:process.env.QA_COMPACT?[[390,844],[1512,762],[3440,1440]]:[[320,740],[390,844],[430,932],[820,1180],[1440,900],[1512,762],[1920,1080],[2560,1440],[3440,1440],[5120,1440]];
await mkdir(out,{recursive:true});
let browser;
const results=[],errors=[],writes=[],outpaintRequests=[],responsiveSelections=[];
const profileAt=(width,height)=>width>=3840&&width/height>=3?'ultrawide':width>=2560&&width/height>=11/5?'wide':'normal';
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
  await page.locator('[data-hero-composition]').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  const masking=await page.locator('[data-hero-composition]').evaluateAll(async images=>{
   window.__heroSharpMaps={};
   return Promise.all(images.map(async image=>{
    // Render the ACTUAL SVG sharp-layer masks against solid white. Alpha is sharp
    // coverage, rather than total opacity (which includes the blurred underlay).
    const xml=new DOMParser().parseFromString(await (await fetch(image.currentSrc)).text(),'image/svg+xml');
    if(xml.querySelectorAll('image').length!==1||xml.getElementById('seamX'))throw new Error('photo must be one approved flat image without an old-photo insert');
    const photo=xml.getElementById('photo'),rect=xml.createElementNS('http://www.w3.org/2000/svg','rect');
    rect.setAttribute('id','photo');rect.setAttribute('width','4608');rect.setAttribute('height','1536');rect.setAttribute('fill','white');photo.replaceWith(rect);
    [...xml.documentElement.children].find(child=>child.getAttribute('mask')==='url(#verticalMask)').remove();
    const diagnostic=new Image(),url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(xml)],{type:'image/svg+xml'}));diagnostic.src=url;await diagnostic.decode();
    const canvas=document.createElement('canvas');canvas.width=4608;canvas.height=1536;const context=canvas.getContext('2d');context.drawImage(diagnostic,0,0);URL.revokeObjectURL(url);
    const alpha=(x,y)=>context.getImageData(x,y,1,1).data[3],scene=image.dataset.heroComposition;
    window.__heroSharpMaps[scene]=canvas;
    const positions=[0,461,1014,1337,1536,2304];
    return {scene,source:image.currentSrc,center:alpha(2304,768),left:positions.map(x=>alpha(x,768)),right:positions.map(x=>alpha(4607-x,768)),top20:alpha(2304,307)};
   }));
  });
  assert.equal(masking.length,4);
  for(const mask of masking){
   assert.equal(mask.center,255);
   for(const profile of [mask.left,mask.right]){assert.equal(profile[0],0);assert.ok(profile.every((a,i)=>i===0||a>=profile[i-1]),'sharp coverage increases continuously from the full photo edge');}
   mask.left.forEach((a,i)=>assert.ok(Math.abs(a-mask.right[i])<=4,'one symmetric lateral profile'));
   assert.equal(mask.top20,255,'top/bottom transition is shallow');assert.ok(mask.left[2]<255,'sides have a wider transition');
   assert.deepEqual(mask.left,masking[0].left,'all compositions share the same true-edge treatment');
  }
  const states=[];
  async function readState(){return page.evaluate(()=>{
    const hero=document.querySelector('[data-hero-motion]'),plane=hero.querySelector('[data-hero-plane][data-active="true"]'),photo=plane.querySelector('[data-hero-composition]'),canvas=plane.querySelector('[data-hero-canvas]'),r=canvas.getBoundingClientRect(),frame=plane.querySelector('[data-hero-framing]'),f=frame.getBoundingClientRect(),ambient=plane.querySelector('[data-hero-ambient]'),a=ambient.getBoundingClientRect();
    const scale=r.width/1536,b=photo.getBoundingClientRect(),map=window.__heroSharpMaps[plane.dataset.heroPlane],ctx=map.getContext('2d'),sharpCoverage=[];
    for(let row=0;row<=8;row++)for(let col=0;col<=10;col++){
     const x=Math.floor(((innerWidth-1)*col/10-r.x)/scale+1536),y=Math.floor(((innerHeight-1)*row/8-r.y)/scale+256);
     sharpCoverage.push(x<0||x>=4608||y<0||y>=1536?0:ctx.getImageData(x,y,1,1).data[3]);
    }
    const screens=[...plane.querySelectorAll('[data-hero-screen]')].map(screen=>{const s=screen.getBoundingClientRect();return {width:s.width/innerHeight,height:s.height/innerHeight,center:(s.x+s.width/2-innerWidth/2)/innerHeight,y:s.y/innerHeight};});
    const uiMask=plane.querySelector('[data-hero-ui-mask]');
    return {image:plane.dataset.heroPlane,chapter:Number(hero.dataset.chapter),stageHeight:hero.firstElementChild.clientHeight,original:{x:r.x,y:r.y,width:r.width,height:r.height},composition:{src:new URL(photo.currentSrc).pathname,x:b.x,y:b.y,width:b.width,height:b.height,loaded:photo.naturalWidth===4608,filter:getComputedStyle(photo).filter,edgeMask:getComputedStyle(photo).maskImage},sharpViewport:{minimum:Math.min(...sharpCoverage),softSamples:sharpCoverage.filter(a=>a<255).length,total:sharpCoverage.length},uiMask:uiMask?getComputedStyle(uiMask).maskImage:null,oldOriginals:plane.querySelectorAll('img[src$="/counter.webp"],img[src$="/dining.webp"],img[src$="/phone-v3.webp"]').length,scale,screens,frame:{left:f.left,width:f.width,mask:getComputedStyle(frame).maskImage,overflow:getComputedStyle(frame).overflow},ambient:{src:ambient.getAttribute('src'),filter:getComputedStyle(ambient).filter,opacity:getComputedStyle(ambient).opacity,covers:a.left<=0&&a.top<=0&&a.right>=innerWidth&&a.bottom>=innerHeight},overflow:document.documentElement.scrollWidth>innerWidth+1,frames:hero.querySelectorAll('iframe').length};
  });}
  function verifyPhoto(state){
   assert.equal(state.composition.loaded,true);assert.equal(state.overflow,false);
   assert.equal(state.ambient.covers,true);assert.ok(state.ambient.src.endsWith('/venue.webp'));assert.equal(state.ambient.filter,'blur(48px)');
   assert.equal(state.frame.overflow,'visible');assert.equal(state.frame.mask,'none');assert.equal(state.composition.filter,'none');assert.equal(state.composition.edgeMask,'none');
   assert.equal(state.oldOriginals,0,'no original photo may be reinserted over the approved source');
   if(state.image!=='venue')assert.ok(state.uiMask.includes(`${state.image}-screen-mask.png`),'only the projected UI is clipped to the actual device screen');
   const profile=profileAt(width,height);
   assert.ok(state.composition.src.endsWith(`/${state.image}${profile==='normal'?'':`-${profile}`}-composition.svg`),'browser selects the viewport-specific photo edges');
   assert.ok(Math.abs(state.composition.width-state.original.width*3)<.25);
   assert.ok(Math.abs(state.composition.height-state.original.height*1.5)<.25);
   assert.ok(Math.abs(state.composition.x-(state.original.x-1536*state.scale))<.25);
   assert.ok(Math.abs(state.composition.y-(state.original.y-256*state.scale))<.25);
   if([1440,1512,1920,2560].includes(width))assert.equal(state.sharpViewport.minimum,255,`${width}/${state.image}: EVERY visible viewport sample must be fully sharp, including both sides and corners`);
   assert.ok(state.frames<=2);
  }
  for(let chapter=0;chapter<4;chapter++){
   if(chapter){await page.locator(`[data-hero-segment="${chapter}"]`).dispatchEvent("pointerdown");await page.locator(`[data-hero-segment="${chapter}"]`).evaluate(button=>button.click());}
   await page.waitForFunction(index=>Number(document.querySelector('[data-hero-motion]').dataset.chapter)===index,chapter);
   await page.waitForTimeout(700);
   if(chapter>0){await page.locator('[data-hero-live][data-ready="true"]').waitFor({timeout:20000}).catch(()=>{});await page.waitForTimeout(400);}
   const state=await readState();
   assert.equal(state.chapter,chapter,`${width}: requested chapter remains active after demo readiness`);
   assert.equal(state.stageHeight,height);verifyPhoto(state);
   if(width/height>1.6){assert.ok(Math.abs(state.frame.width/height-1.6)<.001);assert.ok(Math.abs(state.frame.left-(width-state.frame.width)/2)<1);assert.equal(state.frame.mask,'none','no interior frame mask may obscure hands');}
   if(width===1440)assert.ok(Math.abs(state.scale-[.9375,1.0125,.975,.9375][chapter])<.01,'notebook start scale stays unchanged');
   states.push(state);
   if([390,1440,1512,3440,5120].includes(width))await page.screenshot({path:`${out}/${width}-${chapter}.png`});
   if(chapter===1||chapter===3){
    const fraction=chapter===1?(HERO_COUNTER_TIMELINE.zoom[1]+1)/HERO_CHAPTER_DURATION_MS[1]*1000:.2;
    const lengths=await page.locator('[data-hero-motion]').evaluate(el=>({height:el.offsetHeight,stage:el.firstElementChild.offsetHeight}));
    await page.evaluate(({height,stage,progress})=>scrollTo({top:(height-stage)*progress+.5,behavior:'instant'}),{...lengths,progress:heroProgressAt(chapter,fraction)});
    await page.waitForTimeout(700);
    const zoomed=await readState();verifyPhoto(zoomed);
    if([390,3440].includes(width))await page.screenshot({path:`${out}/${width}-${chapter}-zoom.png`});
   }
  }
  await page.locator('[data-hero-segment="0"]').dispatchEvent('pointerdown');await page.locator('[data-hero-segment="0"]').evaluate(button=>button.click());await page.waitForFunction(()=>document.querySelector('[data-hero-motion]').dataset.chapter==='0');
  if(width===390){const cdp=await page.context().newCDPSession(page);await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:210,y:460}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:210,y:300}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(150);assert.ok(await page.evaluate(()=>scrollY>0),'mockup swipe scrolls the page');}
  if(width===3440||width===5120)assert.ok(states[0].sharpViewport.softSamples>0,'wider screens reveal the full photograph outer transition');
  if(width===5120){
   for(const [nextWidth,nextHeight]of [[3440,1440],[1512,762],[5120,1440]]){
    await page.setViewportSize({width:nextWidth,height:nextHeight});
    const profile=profileAt(nextWidth,nextHeight);
    await page.waitForFunction(profile=>[...document.querySelectorAll('[data-hero-composition]')].every(image=>image.currentSrc.endsWith(`/${image.dataset.heroComposition}${profile==='normal'?'':`-${profile}`}-composition.svg`)),profile);
    await page.locator('[data-hero-composition]').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
    responsiveSelections.push({width:nextWidth,height:nextHeight,profile});
   }
  }
  results.push({width,height,masking,states});console.log('PASS',width,height);await browser.close();
 }
 const notebook=results.find(r=>r.width===1440);
 if(notebook)for(const result of results.filter(r=>r.width>1440))for(let chapter=0;chapter<4;chapter++){
  result.states[chapter].screens.forEach((screen,i)=>{for(const key of ['width','height','center','y'])assert.ok(Math.abs(screen[key]-notebook.states[chapter].screens[i][key])<.005,`${result.width}/${chapter}/${i}: normalized ${key} matches notebook`);});
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(outpaintRequests,[]);
 await writeFile(`${out}/report.json`,JSON.stringify({base,results,responsiveSelections,errors,writes,outpaintRequests},null,2));
}finally{await browser?.close();}
