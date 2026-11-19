import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";

const base=process.env.BASIC_STORY_QA_BASE || "http://localhost:3064";
const output=process.env.BASIC_STORY_QA_OUTPUT || "/tmp/basic-feature-story-qa";
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch();
const results=[], errors=[];
const kinds=["featured","gallery","prices","sale","widgets","advertising","call","order"];
const labels=["대표 상품 영역","상품 이미지","가격 옵션","기간 할인","콘텐츠 위젯","광고","직원 호출","테이블 주문"];
async function enter(page) {
  await page.goto(base);
  await page.locator('[data-basic-feature-story]').waitFor();
  await page.evaluate(()=>document.fonts.ready);
  // A real user input releases any homepage start-scroll guard before the anchor jump.
  await page.mouse.wheel(0,1);
  await page.waitForTimeout(100);
  await page.locator('[data-service-anchor="basic"]').evaluate(element=>window.scrollTo({top:scrollY+element.getBoundingClientRect().top,behavior:"instant"}));
  await page.waitForFunction(()=>document.querySelector('[data-basic-feature-story]').getBoundingClientRect().top<2);
  await page.waitForFunction(()=>[...document.querySelectorAll('[data-basic-feature-story] [data-marketing-copy-reveal]')].every(element=>Number(getComputedStyle(element).opacity)>.99));
}
try {
  for(const [width,height] of [[320,844],[390,844],[820,1180],[1180,820],[1440,900],[2560,1080],[1440,600]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce",isMobile:width<768,hasTouch:width<768});
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/api/**",route=>route.request().method()==="GET" ? route.continue() : route.abort());
    try {
      await enter(page);
      const story=page.locator('[data-basic-feature-story]'), next=story.getByRole("button",{name:"다음 기능 보기"}), previous=story.getByRole("button",{name:"이전 기능 보기"});
      assert.ok(await previous.isDisabled());
      assert.equal(await story.locator('[data-basic-tablet-screen] button').count(),0);
      assert.equal(await story.locator('ol,iframe,[role="dialog"]').count(),0);
      assert.equal(await story.locator('[data-basic-management]').isVisible(),width>=768);
      for(let index=0;index<8;index++) {
        assert.equal(await story.getAttribute("data-feature-index"),String(index));
        assert.equal(await story.locator('[data-basic-demo]').getAttribute("data-basic-demo"),kinds[index]);
        assert.ok((await story.locator('h2').textContent()).includes(labels[index]));
        assert.ok((await story.locator('[data-basic-management] h3').textContent()).includes(labels[index]));
        assert.equal(await story.locator('[data-basic-feature-preview]').getAttribute("data-playing"),"false","reduced motion keeps preview static");
        if(index<7) await next.click();
      }
      assert.ok(await next.isDisabled());
      assert.ok((await story.locator('[data-basic-feature-copy]').textContent()).includes("선결제는 준비 중"));
      await previous.focus();
      await previous.press("ArrowLeft");
      assert.equal(await story.getAttribute("data-feature-index"),"6","keyboard changes selected demo");
      while(!(await previous.isDisabled())) await previous.click();
      await story.locator('[data-basic-demo] img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>{}))));
      const geometry=await story.evaluate(element=>{
        const rect=element.getBoundingClientRect(), nav=element.querySelector('nav').getBoundingClientRect(), screen=element.querySelector('[data-basic-tablet-screen]').getBoundingClientRect(), title=element.querySelector('h2').getBoundingClientRect();
        return {viewport:[innerWidth,innerHeight],x:rect.x,width:rect.width,overflow:document.documentElement.scrollWidth-innerWidth,navBottom:nav.bottom,screen:{x:screen.x,y:screen.y,width:screen.width,height:screen.height},titleRight:title.right,screenRight:screen.right};
      });
      assert.deepEqual(geometry.viewport,[width,height]);
      assert.equal(geometry.overflow,0);
      assert.ok(geometry.width<=1600 && Math.abs(geometry.x-(width-geometry.width)/2)<1);
      if(width>=768) assert.ok(geometry.titleRight<geometry.screen.x+10,"copy stays clear of tablet display");
      if(width<768) assert.ok(geometry.navBottom<geometry.screen.y,"mobile navigation precedes the screen");
      await page.screenshot({path:`${output}/basic-${width}-${height}.png`});
      results.push(geometry); console.log("PASS",JSON.stringify(geometry));
    } finally { await page.close(); }
  }
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"no-preference"});
  page.on("pageerror",error=>errors.push(error.message));
  try {
    await enter(page);
    const story=page.locator('[data-basic-feature-story]');
    await page.waitForFunction(()=>document.querySelector('[data-basic-feature-preview]').dataset.playing==="true");
    for(let index=0;index<3;index++) await story.getByRole("button",{name:"다음 기능 보기"}).click();
    const timer=story.locator('[data-basic-demo="sale"] [data-demo-motion]');
    const before=await timer.textContent();
    await page.waitForTimeout(1150);
    assert.notEqual(await timer.textContent(),before,"selected countdown starts automatically");
    assert.equal(await story.locator('[data-demo-motion]').evaluate(element=>getComputedStyle(element).animationIterationCount),"infinite");
    await page.screenshot({path:`${output}/basic-sale-playing.png`});
    await page.locator('[data-service-anchor="dining"]').evaluate(element=>window.scrollTo({top:scrollY+element.getBoundingClientRect().top+1,behavior:"instant"}));
    await page.waitForFunction(()=>document.querySelector('[data-basic-feature-preview]').dataset.playing==="false");
    const paused=await timer.textContent(); await page.waitForTimeout(1100);
    assert.equal(await timer.textContent(),paused,"covered sticky panel pauses countdown");
    await page.locator('[data-service-anchor="basic"]').evaluate(element=>window.scrollTo({top:scrollY+element.getBoundingClientRect().top,behavior:"instant"}));
    await page.waitForFunction(()=>document.querySelector('[data-basic-feature-preview]').dataset.playing==="true");
    await page.waitForTimeout(1150);
    assert.notEqual(await timer.textContent(),paused,"visible demo resumes automatically");
    results.push({automatic:true,loop:true,coveredPause:true,resume:true});
    console.log("PASS automatic loop, cover pause and resume");
  } finally { await page.close(); }
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`,JSON.stringify({results,errors},null,2));
}
