import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.FEATURE_GALLERY_QA_BASE || "http://localhost:3062";
const output = process.env.FEATURE_GALLERY_QA_OUTPUT || "/tmp/service-feature-gallery";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], errors = [];
try {
  const sizes = process.env.FEATURE_GALLERY_QA_SMOKE === "1" ? [[390,844],[1440,900]] : [[320,844],[390,844],[820,1180],[1440,900],[2560,1080],[1440,600]];
  for (const [width,height] of sizes) {
    const page = await browser.newPage({ viewport: { width,height }, reducedMotion: "reduce", hasTouch:width<768, isMobile:width<768 });
    page.on("pageerror", error => errors.push(error.message));
    await page.route("**/api/**", route => route.request().method() === "GET" ? route.continue() : route.abort());
    try {
      await page.goto(`${base}/#service-basic`);
      const gallery = page.locator('[data-service-gallery="basic"]');
      await gallery.waitFor();
      await gallery.scrollIntoViewIfNeeded();
      await page.evaluate(() => document.fonts.ready);
      await page.waitForFunction(() => [...document.querySelectorAll('[data-service-gallery] [data-marketing-copy-reveal]')].every(element => getComputedStyle(element).opacity === "1"));
      const rail = gallery.getByRole("list", { name: "베이직 기능 소개" });
      const cards = rail.locator("li");
      const previous = gallery.getByRole("button", { name: "이전 기능 보기" });
      const next = gallery.getByRole("button", { name: "다음 기능 보기" });
      assert.equal(await cards.count(), 8);
      assert.equal(await gallery.locator('[data-playing="true"]').count(), 0, "no automatic playback");
      assert.ok(await previous.isDisabled());
      for (const button of [previous,next]) {
        const size = await button.boundingBox();
        assert.ok(size.width >= 24 && size.height >= 24, "canonical media arrow target");
      }
      assert.equal(await page.getByRole("dialog").count(), 0);
      const first = cards.nth(0).getByRole("button");
      await first.click();
      assert.equal(await first.getAttribute("aria-pressed"), "true");
      const second = cards.nth(1).getByRole("button");
      await second.focus();
      await second.press("Enter");
      assert.equal(await first.getAttribute("aria-pressed"), "false");
      assert.equal(await second.getAttribute("aria-pressed"), "true");
      assert.equal(await gallery.locator('[data-feature-media][data-playing="true"]').count(), 1);
      await next.click();
      assert.equal(await gallery.locator('[data-feature-media][data-playing="true"]').count(), 0, "navigation pauses media");
      for (let attempts=0; attempts<8 && !await next.isDisabled(); attempts++) {
        await next.click();
        await page.waitForTimeout(100);
      }
      assert.ok(await next.isDisabled(), "right edge reached");
      assert.ok(await cards.last().evaluate(element => element.getBoundingClientRect().right <= element.parentElement.getBoundingClientRect().right + 2));
      await rail.focus();
      await rail.press("Home");
      await page.waitForFunction(() => document.querySelector('[data-service-gallery] ol').scrollLeft <= 1);
      await page.waitForTimeout(100);
      assert.ok(await previous.isDisabled());
      await rail.press("End");
      await page.waitForTimeout(100);
      assert.ok(await next.isDisabled(), "keyboard End reaches last cards");
      // Direct scroll exercises the same native rail used by touch swipes.
      await rail.evaluate(element => element.scrollTo({ left: 0, behavior: "instant" }));
      await page.waitForTimeout(100);
      if (width === 390) {
        const bounds = await rail.boundingBox();
        const touch = await page.context().newCDPSession(page);
        const x = bounds.x + bounds.width * .8, y = bounds.y + Math.min(bounds.height / 3, 100);
        await touch.send("Input.dispatchTouchEvent", { type:"touchStart", touchPoints:[{x,y}] });
        for(let step=1;step<=10;step++) {
          await touch.send("Input.dispatchTouchEvent", { type:"touchMove", touchPoints:[{x:x-step*bounds.width*.055,y}] });
          await page.waitForTimeout(20);
        }
        await touch.send("Input.dispatchTouchEvent", { type:"touchEnd", touchPoints:[] });
        await page.waitForFunction(() => document.querySelector('[data-service-gallery] ol').scrollLeft > 50);
        assert.equal(await gallery.locator('[data-feature-media][data-playing="true"]').count(),0,"swipe does not trigger playback");
        await rail.evaluate(element => element.scrollTo({left:0,behavior:"instant"}));
        await page.waitForTimeout(100);
        await touch.detach();
      }
      await first.click();
      await page.locator('[data-service-anchor="dining"]').evaluate(element => window.scrollTo({top:scrollY + element.getBoundingClientRect().top + 1,behavior:"instant"}));
      await page.waitForFunction(() => !document.querySelector('[data-feature-media][data-playing="true"]'));
      await gallery.scrollIntoViewIfNeeded();
      await rail.evaluate(element => element.scrollTo({ left: 0, behavior: "instant" }));
      const geometry = await gallery.evaluate(element => {
        const rect = element.getBoundingClientRect();
        const media = element.querySelector('[data-feature-media]').getBoundingClientRect();
        return { viewport: [innerWidth,innerHeight], x:rect.x, width:rect.width, ratio:media.width/media.height, overflow:document.documentElement.scrollWidth-innerWidth };
      });
      assert.deepEqual(geometry.viewport, [width,height]);
      assert.equal(geometry.overflow, 0);
      assert.ok(geometry.width <= 1600 && Math.abs(geometry.x - (width - geometry.width)/2) < 1);
      assert.ok(Math.abs(geometry.ratio - (width<768 ? 4/3 : 16/10)) < .01);
      await page.screenshot({ path:`${output}/basic-${width}-${height}.png` });
      results.push(geometry);
      console.log("PASS", JSON.stringify(geometry));
    } finally { await page.close(); }
  }
  const page = await browser.newPage({ viewport:{width:1440,height:900}, reducedMotion:"no-preference" });
  page.on("pageerror", error => errors.push(error.message));
  try {
    await page.goto(`${base}/#service-basic`);
    const gallery = page.locator('[data-service-gallery="basic"]');
    await gallery.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll('[data-service-gallery] [data-marketing-copy-reveal]')].every(element => Number(getComputedStyle(element).opacity) > .99));
    await gallery.getByRole("list").evaluate(element => element.scrollTo({left:element.children[3].offsetLeft,behavior:"instant"}));
    const sale = gallery.locator('[data-service-feature="sale"]');
    await sale.getByRole("button").click();
    const timer = sale.locator('[data-demo-motion]').last();
    const before = await timer.textContent();
    await page.waitForTimeout(1100);
    assert.notEqual(await timer.textContent(), before, "countdown advances only after manual play");
    await sale.getByRole("button").click();
    const paused = await timer.textContent();
    await page.waitForTimeout(1100);
    assert.equal(await timer.textContent(), paused, "pause holds countdown");
    await page.screenshot({path:`${output}/basic-playing-desktop.png`});
    results.push({motion:"scroll reveal, countdown and pause"});
  } finally { await page.close(); }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed:results.length,errors:errors.length }));
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({results,errors},null,2));
}
