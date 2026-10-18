import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.HOME_HERO_QA_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.HOME_HERO_QA_OUTPUT || '/tmp/artimenu-home-hero-qa';
mkdirSync(output, { recursive: true });

// The authored PSD is a single image. Verify its responsive crop and pixels,
// rather than accepting independently positioned browser screen overlays.
const b=await chromium.launch();const rows=[];
try{for(const width of [320,390,768,992,1440,2560]){
 const page=await b.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const root=page.locator('[data-hero-carousel]');await expect(root).toHaveAttribute('data-selected-slide','0');await expect(root).toHaveAttribute('data-auto-playing','false');
 await expect(page.locator('h1')).toHaveText('디지털 메뉴판의 새로운 경험');await expect(page.getByText('디자인 커스터마이징∙할인∙위젯∙호출기능 까지 한 번에',{exact:true})).toBeVisible();
 const scene=root.locator('[data-hero-device-scene]');await expect(scene).toHaveAttribute('data-hero-composite','psd');await expect(scene.locator('svg')).toHaveCount(0);await expect(root.locator('[data-device-screen]')).toHaveCount(0);
 const photo=scene.locator('img');await expect.poll(()=>photo.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);await photo.evaluate(el=>el.decode());
 const frame=root.locator('[data-home-hero-frame]');await frame.screenshot({path:`${output}/frame-${width}.png`});
 const geometry=await photo.evaluate(img=>{const r=img.getBoundingClientRect(),s=Math.max(r.width/img.naturalWidth,r.height/img.naturalHeight),left=r.x+(r.width-img.naturalWidth*s)/2,top=r.y+(r.height-img.naturalHeight*s)/2;return{width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,src:img.currentSrc,centers:[[2150,830],[1150,1150],[1630,1250]].map(([x,y])=>({x:left+x/3344*img.naturalWidth*s,y:top+y/1882*img.naturalHeight*s}))};});
 assert.equal(geometry.overflow,0);assert.ok(geometry.src.includes('artimenu-home-hero-psd-v2-'));
 const buffer=await page.screenshot();const raw=await sharp(buffer).raw().toBuffer({resolveWithObject:true});
 for(const point of geometry.centers){if(point.y<0||point.y>=1100)continue;const i=(Math.floor(point.y)*raw.info.width+Math.floor(point.x))*raw.info.channels;assert.ok(Math.max(...raw.data.subarray(i,i+3))<65,`${width}: dark device screen`);}
 for(let i=1;i<4;i++){await root.getByRole('button',{name:`${i+1}번 슬라이드 보기`,exact:true}).click();await expect(root).toHaveAttribute('data-selected-slide',String(i));const img=root.locator('[data-hero-slide]').nth(i).locator('img');await expect.poll(()=>img.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);}
 await root.getByRole('button',{name:'1번 슬라이드 보기',exact:true}).click();await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:`${output}/hero-${width}.png`});assert.deepEqual(errors,[]);rows.push(geometry);console.log('PASS',width);await page.close();
}
// Compare the entire native image with the Photoshop export, including all
// device corners, metallic rims, counter and transparent background edges.
const native=await b.newPage({viewport:{width:3500,height:2100},reducedMotion:'reduce'});await native.goto(base+'/',{waitUntil:'networkidle'});
await native.locator('[data-hero-device-scene] img').evaluate(async img=>{img.removeAttribute('srcset');img.src='/assets/artimenu-home-hero-psd-v2-3344.webp';await img.decode();Object.assign(document.querySelector('[data-home-hero-frame]').style,{position:'fixed',top:'0',left:'0',width:'3344px',height:'1882px',aspectRatio:'auto',borderRadius:'0',zIndex:'2147483647'});const header=document.querySelector('header');if(header)header.style.visibility='hidden';});
const nativeFrame=native.locator('[data-home-hero-frame]');const background=await nativeFrame.evaluate(el=>getComputedStyle(el).backgroundColor);
const actual=await sharp(await nativeFrame.screenshot({path:`${output}/native-psd-composite.png`})).removeAlpha().raw().toBuffer({resolveWithObject:true});
const expected=await sharp('public/assets/artimenu-home-hero-psd-v2.png').flatten({background}).removeAlpha().raw().toBuffer({resolveWithObject:true});
assert.equal(actual.info.width,3344);assert.equal(actual.info.height,1882);assert.equal(actual.data.length,expected.data.length);let maxDifference=0;for(let i=0;i<actual.data.length;i++)maxDifference=Math.max(maxDifference,Math.abs(actual.data[i]-expected.data[i]));assert.ok(maxDifference<=2,`native PSD composite differs by ${maxDifference}`);
console.log('NATIVE PSD COMPOSITE MATCH',3344*1882,'PIXELS, MAX CHANNEL DIFFERENCE',maxDifference);await native.close();writeFileSync(`${output}/visual-results.json`,JSON.stringify(rows,null,2));}finally{await b.close();}

// Playback timing, pause/resume, focus, visibility and a real touch gesture.
const browser=await chromium.launch();
const progress=root=>root.locator('[aria-current="true"] span span').evaluate(el=>new DOMMatrix(getComputedStyle(el).transform).a);
try{
 const page=await browser.newPage({viewport:{width:1440,height:1100},reducedMotion:'no-preference'});
 await page.goto(base + '/',{waitUntil:'networkidle'});const root=page.locator('[data-hero-carousel]');await expect(root).toHaveAttribute('data-auto-playing','true');
 await root.getByRole('button',{name:'1번 슬라이드 보기',exact:true}).click();await page.waitForTimeout(1100);const p=await progress(root);assert.ok(p>.15&&p<.65,p);
 await root.getByRole('button',{name:'자동 슬라이드 일시 정지',exact:true}).click();await expect(root).toHaveAttribute('data-auto-playing','false');const paused=await progress(root);await page.waitForTimeout(1000);assert.ok(Math.abs(await progress(root)-paused)<.02);
 await root.getByRole('button',{name:'자동 슬라이드 재생',exact:true}).click();await root.locator('[data-home-hero-frame]').hover();
 for(const selected of [1,2,3,0]){await expect(root).toHaveAttribute('data-selected-slide',String(selected),{timeout:6000});console.log('AUTOPLAY',selected);}
 await page.keyboard.press('Shift+Tab');await expect(root).toHaveAttribute('data-auto-playing','false');const before=await root.getAttribute('data-selected-slide');await page.waitForTimeout(4200);await expect(root).toHaveAttribute('data-selected-slide',before);
 await page.keyboard.press('ArrowRight');await expect(root).toHaveAttribute('data-selected-slide',String((Number(before)+1)%4));
 await root.getByRole('button',{name:'자동 슬라이드 재생',exact:true}).focus();await page.keyboard.press('Enter');await expect(root).toHaveAttribute('data-auto-playing','true');
 await page.evaluate(()=>scrollTo({top:document.body.scrollHeight,behavior:'instant'}));await expect(root).toHaveAttribute('data-auto-playing','false');
 await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await expect(root).toHaveAttribute('data-auto-playing','true');
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(root).toHaveAttribute('data-auto-playing','false');
 await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await expect(root).toHaveAttribute('data-auto-playing','true');console.log('PROGRESS, PAUSE, KEYBOARD, OFFSCREEN, VISIBILITY PASSED');await page.close();
 const mobile=await browser.newPage({viewport:{width:390,height:1000},hasTouch:true,isMobile:true,reducedMotion:'reduce'});await mobile.goto(base + '/',{waitUntil:'networkidle'});const mroot=mobile.locator('[data-hero-carousel]');await expect(mroot).toHaveAttribute('data-auto-playing','false');
 const box=await mroot.locator('[data-home-hero-frame]').boundingBox();const cdp=await mobile.context().newCDPSession(mobile);const y=box.y+box.height*.5;
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:box.x+box.width*.8,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.5,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:box.x+box.width*.2,y}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await expect(mroot).toHaveAttribute('data-selected-slide','1');await mroot.getByRole('button',{name:'자동 슬라이드 재생',exact:true}).click();await expect(mroot).toHaveAttribute('data-auto-playing','true');await expect(mroot).toHaveAttribute('data-selected-slide','2',{timeout:6000});assert.equal(await mroot.locator('[data-hero-slide]').first().evaluate(el=>getComputedStyle(el).transitionDuration),'0s');console.log('TOUCH AND REDUCED MOTION OPT-IN PASSED');await mobile.close();
}finally{await browser.close();}
