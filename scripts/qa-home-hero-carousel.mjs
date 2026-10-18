import { chromium, expect } from '@playwright/test';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.HOME_HERO_QA_BASE_URL || 'http://127.0.0.1:3000';
const output = process.env.HOME_HERO_QA_OUTPUT || '/tmp/artimenu-home-hero-qa';
mkdirSync(output, { recursive: true });

// Static/reduced-motion rendering: actual photo/overlay transforms, dark-screen
// pixels, responsive bounds, all images and direct slide selection.
const b=await chromium.launch();const rows=[];
try{for(const width of [320,390,768,992,1440,2560]){
 const page=await b.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base + '/',{waitUntil:'networkidle'});await page.evaluate(()=>document.fonts.ready);
 const root=page.locator('[data-hero-carousel]');await expect(root).toHaveAttribute('data-selected-slide','0');await expect(root).toHaveAttribute('data-auto-playing','false');
 await expect(page.locator('h1')).toHaveText('디지털 메뉴판의 새로운 경험');await expect(page.getByText('디자인 커스터마이징∙할인∙위젯∙호출기능 까지 한 번에',{exact:true})).toBeVisible();
 const frame=page.locator('[data-home-hero-frame]');await expect(frame).toBeVisible();await expect(root.locator('[data-device-screen]')).toHaveCount(3);
 await frame.screenshot({path:`${output}/frame-${width}.png`});
 const geometry=await page.evaluate(()=>{
  const photo=document.querySelector('[data-hero-device-scene] img'),r=photo.getBoundingClientRect(),svg=document.querySelector('[data-hero-device-scene] svg');
  const scale=Math.max(r.width/3344,r.height/1882),left=r.x+(r.width-3344*scale)/2,top=r.y+(r.height-1882*scale)/2;
  const points=[[2150,830],[1150,1150],[1630,1250]];
  return {width:innerWidth,overflow:document.documentElement.scrollWidth-innerWidth,rect:{x:r.x,y:r.y,width:r.width,height:r.height},centers:points.map(([x,y])=>{const actual=new DOMPoint(x,y).matrixTransform(svg.getScreenCTM());return{x:actual.x,y:actual.y,expectedX:left+x*scale,expectedY:top+y*scale}})};
 });
 assert.equal(geometry.overflow,0);for(const p of geometry.centers){assert.ok(Math.abs(p.x-p.expectedX)<.5);assert.ok(Math.abs(p.y-p.expectedY)<.5);}
 const buffer=await page.screenshot();const raw=await sharp(buffer).raw().toBuffer({resolveWithObject:true});
 for(const p of geometry.centers){if(p.y<0||p.y>=1100)continue;const offset=(Math.floor(p.y)*raw.info.width+Math.floor(p.x))*raw.info.channels;const rgb=[...raw.data.subarray(offset,offset+3)];assert.ok(Math.max(...rgb)<65,`${width}: dark screen sample (${p.x}, ${p.y}) ${rgb}`);}
 for(let i=1;i<4;i++){await root.getByRole('button',{name:`${i+1}번 슬라이드 보기`,exact:true}).click();await expect(root).toHaveAttribute('data-selected-slide',String(i));const image=root.locator(`[data-hero-slide]`).nth(i).locator('img');await expect(image).toBeVisible();await expect.poll(()=>image.evaluate(el=>el.complete&&el.naturalWidth>0)).toBe(true);}
 await root.getByRole('button',{name:'1번 슬라이드 보기',exact:true}).click();await page.evaluate(()=>scrollTo(0,0));await page.mouse.move(0,0);await page.screenshot({path:`${output}/hero-${width}.png`,fullPage:false});
 assert.deepEqual(errors,[]);rows.push({width,geometry:geometry.rect,centers:geometry.centers,pass:true});console.log('PASS',width);await page.close();
}
// Inspect the known white seams at the photo's native resolution. At phone
// sizes, one CSS pixel also contains the real metallic bezel, so edge color
// assertions there would confuse the device frame with an uncovered screen.
const nativePage=await b.newPage({viewport:{width:3500,height:2100},reducedMotion:'reduce'});
await nativePage.goto(base+'/',{waitUntil:'networkidle'});
await nativePage.locator('[data-hero-device-scene] img').evaluate(async img=>{
 img.removeAttribute('srcset');img.src='/assets/artimenu-home-hero-hq-3344.webp';await img.decode();
 Object.assign(document.querySelector('[data-home-hero-frame]').style,{position:'fixed',top:'0',left:'0',width:'3344px',height:'1882px',aspectRatio:'auto',borderRadius:'0',zIndex:'999'});
});
const nativeBuffer=await nativePage.locator('[data-home-hero-frame]').screenshot({path:`${output}/native-screen-edges.png`});
const nativeRaw=await sharp(nativeBuffer).raw().toBuffer({resolveWithObject:true});
const edgePoints=[[1582,800],[2150,497],[2695,800],[810,1100],[1150,936],[1499,1100],[1544,1200],[1590,1043],[1718,1200],[1630,1439]];
for(const[x,y]of edgePoints){const offset=(y*nativeRaw.info.width+x)*nativeRaw.info.channels;const rgb=[...nativeRaw.data.subarray(offset,offset+3)];assert.ok(Math.max(...rgb)<65,`native screen seam (${x}, ${y}) ${rgb}`);}
console.log('NATIVE SCREEN EDGES PASSED',edgePoints.length);await nativePage.close();
writeFileSync(`${output}/visual-results.json`,JSON.stringify(rows,null,2));}finally{await b.close();}

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
