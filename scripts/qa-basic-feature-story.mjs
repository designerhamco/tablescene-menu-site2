import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

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
  for(const [width,height] of [[320,568],[320,844],[390,844],[820,1180],[1180,820],[1440,900],[2560,1080],[1440,600]]) {
    const page=await browser.newPage({viewport:{width,height},reducedMotion:"reduce",isMobile:width<768,hasTouch:width<768});
    page.on("pageerror",error=>errors.push(error.message));
    await page.route("**/api/**",route=>route.request().method()==="GET" ? route.continue() : route.abort());
    try {
      await enter(page);
      const story=page.locator('[data-basic-feature-story]');
      const segments=story.locator('[data-basic-segment]');
      const nav=story.locator('[data-basic-progress]');
      await expect(segments).toHaveCount(9);
      await expect(segments.first()).toHaveAttribute("aria-current","step");
      await expect(story).toHaveAttribute("data-feature-index","-1");
      assert.ok((await story.locator('h2').textContent()).includes("베이직, 한 장에 담는"));
      await expect(story.locator('[data-basic-management]')).toHaveCount(0);
      await story.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>{}))));
      await page.screenshot({path:`${output}/intro-${width}-${height}.png`});
      await segments.nth(1).click();
      await expect(story).toHaveAttribute("data-feature-index","0");
      await segments.first().click();
      await expect(story).toHaveAttribute("data-feature-index","-1");
      await segments.nth(1).click();
      await expect(story).toHaveAttribute("data-feature-index","0");
      assert.equal(await story.locator('[data-basic-tablet-screen] button').count(),0);
      assert.equal(await story.locator('ol,iframe,[role="dialog"]').count(),0);
      assert.equal(await story.locator('[data-basic-management]').isVisible(),width>=768);
      for(let index=0;index<8;index++) {
        await expect(story).toHaveAttribute("data-feature-index",String(index));
        assert.equal(await story.locator('[data-basic-demo]').getAttribute("data-basic-demo"),kinds[index]);
        assert.ok((await story.locator('h2').textContent()).includes(labels[index]));
        assert.ok((await story.locator('[data-basic-management] h3').textContent()).includes(labels[index]));
        assert.equal(await story.locator('[data-basic-feature-preview]').getAttribute("data-playing"),"false","reduced motion keeps preview static");
        await expect(segments.nth(index+1)).toHaveAttribute("aria-current","step");
        await expect(nav.getByRole("progressbar").nth(index)).toHaveAttribute("aria-valuenow","100");
        if(index<7) await segments.nth(index+2).click();
      }
      assert.ok((await story.locator('[data-basic-feature-copy]').textContent()).includes("선결제는 준비 중"));
      await segments.last().press("ArrowLeft");
      await expect(story).toHaveAttribute("data-feature-index","6");
      await expect(segments.nth(7)).toBeFocused();
      await segments.nth(1).click();
      await expect(story).toHaveAttribute("data-feature-index","0");
      await story.locator('img').evaluateAll(images=>Promise.all(images.map(image=>image.decode().catch(()=>{}))));
      const geometry=await story.evaluate(element=>{
        const rect=element.getBoundingClientRect(), nav=element.querySelector('nav').getBoundingClientRect(), screen=element.querySelector('[data-basic-tablet-screen]').getBoundingClientRect(), title=element.querySelector('h2').getBoundingClientRect();
        return {viewport:[innerWidth,innerHeight],x:rect.x,width:rect.width,overflow:document.documentElement.scrollWidth-innerWidth,navBottom:nav.bottom,screen:{x:screen.x,y:screen.y,width:screen.width,height:screen.height},titleRight:title.right,screenRight:screen.right,titleTop:title.top,headerBottom:document.querySelector("[data-site-header]").getBoundingClientRect().bottom};
      });
      assert.deepEqual(geometry.viewport,[width,height]);
      assert.equal(geometry.overflow,0);
      assert.ok(geometry.titleTop>=geometry.headerBottom,"feature title stays below the header");
      assert.ok(geometry.width<=1600 && Math.abs(geometry.x-(width-geometry.width)/2)<1);
      if(width>=768) assert.ok(geometry.titleRight<geometry.screen.x+10,"copy stays clear of tablet display");
      if(width<768) assert.ok(geometry.navBottom<geometry.screen.y,"mobile navigation precedes the screen");
      await page.screenshot({path:`${output}/basic-${width}-${height}.png`});
      const skip = story.getByRole("link", { name: /Skip.*다이닝으로 이동/ });
      assert.ok((await skip.boundingBox()).x > (await segments.last().boundingBox()).x);
      await skip.click();
      await page.waitForURL("**/#service-dining");
      await expect(page.locator("#service-dining-heading")).toBeFocused();
      await expect.poll(() => page.locator('#service-dining').evaluate(element => Math.abs(element.getBoundingClientRect().top))).toBeLessThan(1);
      await expect(story.locator('[data-basic-feature-preview]')).toHaveAttribute("data-playing","false");
      results.push(geometry); console.log("PASS",JSON.stringify(geometry));
    } finally { await page.close(); }
  }
  const page=await browser.newPage({viewport:{width:1440,height:900},reducedMotion:"no-preference"});
  page.on("pageerror",error=>errors.push(error.message));
  try {
    await enter(page);
    const story=page.locator('[data-basic-feature-story]');
    const runway=await story.evaluate(element => element.closest('[data-basic-scroll-track]').querySelector('[data-basic-scroll-runway]').getBoundingClientRect().height);
    const label=story.locator('[data-service-frame-label]');
    const introY=(await label.boundingBox()).y;
    const step=Math.ceil(runway/9);
    for (let index=0;index<8;index++) {
      await page.mouse.wheel(0,step);
      await expect(story).toHaveAttribute("data-feature-index",String(index));
      await expect(story.locator('[data-basic-demo]')).toHaveAttribute("data-basic-demo",kinds[index]);
      assert.ok(Math.abs((await label.boundingBox()).y-introY)<2,"service label stays pinned while the feature changes");
    }
    for (let index=6;index>=3;index--) {
      await page.mouse.wheel(0,-step);
      await expect(story).toHaveAttribute("data-feature-index",String(index));
    }
    await expect(story.locator('[data-basic-feature-preview]')).toHaveAttribute("data-playing","true");
    const salePosition=await page.evaluate(()=>window.scrollY);
    const timer=story.locator('[data-basic-demo="sale"] [data-demo-motion]');
    const before=await timer.textContent();
    await page.waitForTimeout(1150);
    assert.notEqual(await timer.textContent(),before,"selected countdown starts automatically");
    assert.equal(await story.locator('[data-demo-motion]').evaluate(element=>getComputedStyle(element).animationIterationCount),"infinite");
    await page.screenshot({path:`${output}/basic-sale-playing.png`});
    await story.getByRole("link",{name:/Skip.*다이닝/}).click();
    await page.waitForURL("**/#service-dining");
    await page.waitForFunction(() => {
      const transform = getComputedStyle(document.documentElement, "::view-transition-new(root)").transform;
      if (!transform.startsWith("matrix")) return false;
      return new DOMMatrixReadOnly(transform).m42 > 10;
    }, undefined, { timeout:3000 });
    await expect(page.locator('html')).not.toHaveAttribute('data-home-dining-cover');
    await expect(page.locator('#service-dining-heading')).toBeFocused();
    await page.waitForFunction(()=>document.querySelector('[data-basic-feature-preview]').dataset.playing==="false");
    await expect(story).toHaveAttribute("data-feature-index","7");
    await page.evaluate(top=>window.scrollTo({top,behavior:"instant"}),salePosition);
    await expect(story).toHaveAttribute("data-feature-index","3");
    await page.waitForFunction(()=>document.querySelector('[data-basic-feature-preview]').dataset.playing==="true");
    const resumed=await timer.textContent();
    await expect.poll(()=>timer.textContent()).not.toBe(resumed);
    results.push({automatic:true,loop:true,coveredPause:true,resume:true});
    console.log("PASS automatic loop, cover pause and resume");
  } finally { await page.close(); }
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`,JSON.stringify({results,errors},null,2));
}
