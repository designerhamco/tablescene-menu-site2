import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base=process.env.BASIC_STORY_QA_BASE || "http://localhost:3064";
const output=process.env.BASIC_STORY_QA_OUTPUT || "/tmp/basic-feature-story-qa";
await fs.mkdir(output,{recursive:true});
const browser=await chromium.launch();
const results=[], errors=[];
const kinds=["featured","gallery","prices","sale","widgets","advertising"];
const labels=["대표 상품 영역","상품 이미지","가격 옵션","기간 할인","콘텐츠 위젯","광고"];

async function expectDevicePair(story, scene) {
  const devices = story.locator("[data-basic-device-screen]");
  await expect(devices).toHaveCount(2);
  await expect.poll(() => devices.evaluateAll(elements => elements.map(element => element.dataset.deviceScene)))
    .toEqual([scene, scene]);
  for (const device of await devices.all()) {
    await expect.poll(() => device.locator("img").evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
  }
}

async function enter(page) {
  await page.goto(base);
  await page.addStyleTag({content:"nextjs-portal { display:none !important; }"});
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
    page.on("console",message=>{
      const text=message.text();
      if(message.type()==="error" && text.includes("hydrated") && text.includes("HomeHeroMotion")) errors.push(text);
    });
    await page.route("**/api/**",route=>route.request().method()==="GET" ? route.continue() : route.abort());
    try {
      await enter(page);
      await expect(page.locator("[data-hero-motion]")).toHaveAttribute("data-reduced","true");
      const story=page.locator('[data-basic-feature-story]');
      const segments=story.locator('[data-basic-segment]');
      const nav=story.locator('[data-basic-progress]');
      await expect(segments).toHaveCount(kinds.length);
      await expect(nav.locator('[aria-current="step"]')).toHaveCount(0);
      await expect(nav.getByRole("progressbar").and(nav.locator('[aria-valuenow="0"]'))).toHaveCount(kinds.length);
      await expect(story).toHaveAttribute("data-feature-index","-1");
      assert.ok((await story.locator('h2').textContent()).includes("베이직, 한 장에 담는"));
      await expect(story.locator('[data-basic-management]')).toHaveCount(0);
      await expect.poll(() => story.locator('img').evaluateAll(images=>images.every(image=>image.complete && image.naturalWidth>0))).toBe(true);
      await page.screenshot({path:`${output}/intro-${width}-${height}.png`});
      await segments.first().click();
      await expect(story).toHaveAttribute("data-feature-index","0");
      await segments.first().press("Home");
      await expect(story).toHaveAttribute("data-feature-index","-1");
      await segments.first().click();
      await expect(story).toHaveAttribute("data-feature-index","0");
      assert.equal(await story.locator('[data-basic-device-screen] button').count(),0);
      assert.equal(await story.locator('ol,iframe,[role="dialog"]').count(),0);
      assert.equal(await story.locator('[data-basic-management]').isVisible(),width>=768);
      for(let index=0;index<kinds.length;index++) {
        await expect(story).toHaveAttribute("data-feature-index",String(index));
        await expectDevicePair(story, kinds[index]);
        assert.ok((await story.locator('h2').textContent()).includes(labels[index]));
        assert.ok((await story.locator('[data-basic-management] h3').textContent()).includes(labels[index]));
        assert.equal(await story.locator('[data-basic-feature-preview]').getAttribute("data-playing"),"false","reduced motion keeps preview static");
        await expect(segments.nth(index)).toHaveAttribute("aria-current","step");
        if(index>0) await expect(nav.getByRole("progressbar").nth(index-1)).toHaveAttribute("aria-valuenow","100");
        if(index<kinds.length-1) await segments.nth(index+1).click();
      }
      assert.match(await story.locator('[data-basic-feature-copy]').textContent(), /광고/);
      await segments.last().press("ArrowLeft");
      await expect(story).toHaveAttribute("data-feature-index","4");
      await expect(segments.nth(4)).toBeFocused();
      await segments.first().click();
      await expect(story).toHaveAttribute("data-feature-index","0");
      await expectDevicePair(story, "featured");
      const geometry=await story.evaluate(element=>{
        const monitorScreen=element.querySelector('[data-basic-device-screen="monitor"]');
        const monitor=monitorScreen.parentElement.getBoundingClientRect();
        const rect=element.getBoundingClientRect(), nav=element.querySelector('nav').getBoundingClientRect(), screen=monitorScreen.getBoundingClientRect(), title=element.querySelector('h2').getBoundingClientRect();
        const projection=new DOMMatrixReadOnly(getComputedStyle(monitorScreen).transform);
        const topLeft=projection.transformPoint(new DOMPoint(0,0));
        const topRight=projection.transformPoint(new DOMPoint(monitorScreen.offsetWidth,0));
        const screenFraction=Math.max(0,Math.min(1,(title.right-screen.left)/screen.width));
        const screenTopAtTitle=monitor.top+(topLeft.y/topLeft.w*(1-screenFraction)+topRight.y/topRight.w*screenFraction)*monitor.height/monitorScreen.parentElement.offsetHeight;
        return {viewport:[innerWidth,innerHeight],x:rect.x,width:rect.width,overflow:document.documentElement.scrollWidth-innerWidth,navBottom:nav.bottom,navTop:nav.top,navRight:nav.right,
          thumbnailBottom:element.querySelector('[data-basic-management]').getBoundingClientRect().bottom,
          screen:{x:screen.x,y:screen.y,width:screen.width,height:screen.height},titleRight:title.right,screenRight:screen.right,titleTop:title.top,titleBottom:title.bottom,screenTopAtTitle,headerBottom:document.querySelector("[data-site-header]").getBoundingClientRect().bottom};
      });
      assert.deepEqual(geometry.viewport,[width,height]);
      assert.equal(geometry.overflow,0);
      assert.ok(geometry.titleTop>=geometry.headerBottom,"feature title stays below the header");
      assert.ok(geometry.width<=1600 && Math.abs(geometry.x-(width-geometry.width)/2)<1);
      if(width>=768) assert.ok(geometry.titleRight<geometry.screen.x+10 || geometry.titleBottom<=geometry.screenTopAtTitle,"title stays clear of monitor display");
      assert.ok(geometry.navRight<=geometry.screen.x || geometry.navTop>=geometry.screen.y+geometry.screen.height-1,"progress stays clear of the monitor");
      if(width>=768) assert.ok(geometry.navTop>=geometry.thumbnailBottom,"progress follows the management thumbnail");
      assert.ok(geometry.navBottom<=height+1,"progress fits in the viewport");
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
    const hint = page.locator('[data-home-scroll-hint]');
    await page.goto(base);
    await expect(page.locator('[data-hero-motion]')).toHaveAttribute("data-in-view", "true");
    await page.mouse.move(83, 335);
    await expect(hint).toBeVisible({ timeout:4000 });

    await enter(page);
    const story=page.locator('[data-basic-feature-story]');
    const runway=await story.evaluate(element => element.closest('[data-basic-scroll-track]').querySelector('[data-basic-scroll-runway]').getBoundingClientRect().height);
    const label=story.locator('[data-service-frame-label]');
    const introY=(await label.boundingBox()).y;
    await page.mouse.move(1330, 320);
    await expect(hint).toBeHidden();
    await expect(hint).toBeVisible({ timeout:4000 });
    await expect(hint).toHaveText("");
    await expect(hint.locator("svg")).toHaveCount(2);
    await expect(hint).toHaveCSS("mix-blend-mode","difference");
    const arrow = hint.locator('[data-site-icon="arrow-down-s-line"]');
    await expect(arrow).toHaveCSS("animation-iteration-count", "infinite");
    const initialHint = await hint.boundingBox();
    await page.mouse.move(1280, 320);
    await expect.poll(async () => (await hint.boundingBox()).x).not.toBe(initialHint.x);
    await page.mouse.wheel(0, 1);
    await expect(hint).toBeHidden();
    const step=Math.ceil(runway/(kinds.length+1));
    for (let index=0;index<kinds.length;index++) {
      await page.mouse.wheel(0,step);
      await expect(story).toHaveAttribute("data-feature-index",String(index));
      await expectDevicePair(story, kinds[index]);
      assert.ok(Math.abs((await label.boundingBox()).y-introY)<2,"service label stays pinned while the feature changes");
    }
    for (let index=kinds.length-2;index>=3;index--) {
      await page.mouse.wheel(0,-step);
      await expect(story).toHaveAttribute("data-feature-index",String(index));
    }
    await expect(story.locator('[data-basic-feature-preview]')).toHaveAttribute("data-playing","true");
    const salePosition=await page.evaluate(()=>window.scrollY);
    await expectDevicePair(story, "sale");
    await page.screenshot({path:`${output}/basic-sale-playing.png`});
    await story.getByRole("link",{name:/Skip.*다이닝/}).click();
    await page.waitForURL("**/#service-dining");
    await page.waitForFunction(() => {
      const transform = getComputedStyle(document.documentElement, "::view-transition-new(root)").transform;
      if (!transform.startsWith("matrix")) return false;
      return new DOMMatrixReadOnly(transform).m42 > 10;
    }, undefined, { timeout:3000 });
    await expect(page.locator('html')).not.toHaveAttribute('data-home-service-cover');
    await expect(page.locator('#service-dining-heading')).toBeFocused();
    await page.waitForFunction(()=>document.querySelector('[data-basic-feature-preview]').dataset.playing==="false");
    await expect(story).toHaveAttribute("data-feature-index","5");
    await page.evaluate(top=>window.scrollTo({top,behavior:"instant"}),salePosition);
    await expect(story).toHaveAttribute("data-feature-index","3");
    await page.waitForFunction(()=>document.querySelector('[data-basic-feature-preview]').dataset.playing==="true");
    await expectDevicePair(story, "sale");
    results.push({ coveredPause:true, pairedRewind:true });
    await page.goto(`${base}/pricing`);
    await expect(hint).toHaveCount(0);
    console.log("PASS home-only cue, paired captures, skip transition and rewind");
  } finally { await page.close(); }
  assert.deepEqual(errors,[]);
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`,JSON.stringify({results,errors},null,2));
}
