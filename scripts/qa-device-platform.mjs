import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium } from "@playwright/test";

const base = process.env.DEVICE_PLATFORM_QA_BASE_URL || "http://127.0.0.1:3043";
const output = process.env.DEVICE_PLATFORM_QA_OUTPUT || "/tmp/artimenu-device-platform-qa";
const scenes = ["monitor", "tablet-landscape", "tablet-portrait", "phone"];
const viewports = [
  { width: 320, height: 740 }, { width: 390, height: 844 }, { width: 820, height: 1180 },
  { width: 1024, height: 768 }, { width: 1440, height: 900 }, { width: 2560, height: 1440 },
];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];

const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
const readPose = root => {
  const visual = root.querySelector("[role=img]");
  const body = root.querySelector("[data-device-body]");
  const screen = root.querySelector("[data-device-screen]");
  const bounds = visual.getBoundingClientRect();
  const frame = body.getBoundingClientRect();
  const rotation = parseFloat(visual.style.getPropertyValue("--device-rotation"));
  return {
    index: Number(root.dataset.deviceIndex),
    progress: Number(root.dataset.progress),
    template: root.dataset.menuTemplate,
    matches: root.querySelectorAll("[data-device-body]").length,
    frame: { width: body.offsetWidth, height: body.offsetHeight, rotation },
    inFrame: frame.left >= bounds.left - 1 && frame.right <= bounds.right + 1 &&
      frame.top >= bounds.top - 1 && frame.bottom <= bounds.bottom + 1,
    overlap: document.documentElement.scrollWidth > innerWidth + 1,
    screens: [...screen.querySelectorAll("img")].map(image => ({
      scene: image.dataset.deviceScreenScene,
      opacity: Number(image.style.opacity),
      loaded: image.complete && image.naturalWidth > 0,
      filter: getComputedStyle(image).filter,
    })),
  };
};

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    const response = await page.goto(`${base}/#device-platform`, { waitUntil: "domcontentloaded", timeout: 90000 });
    assert.ok(response?.ok(), `homepage HTTP ${response?.status()}`);
    const section = page.locator("[data-device-section]");
    const story = section.locator("[data-device-platform]");
    const header = page.locator("[data-site-header]");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => {
      const section = document.querySelector("[data-device-section]");
      if (!section) return false;
      const header = document.querySelector("[data-site-header]");
      return Math.abs(section.getBoundingClientRect().top - header.offsetHeight) < 2 &&
        [...section.querySelectorAll("img")].every(image => image.complete && image.naturalWidth > 0);
    }, null, { timeout: 30000 });
    assert.deepEqual(await page.evaluate(() => ({ width: innerWidth, height: innerHeight })), viewport);
    assert.equal(await story.getAttribute("data-image-mode"), "static");
    assert.equal(await story.locator("iframe, [data-device-paper], nav, button, [role=progressbar]").count(), 0);
    const scroll = await section.evaluate(node => {
      const stage = node.querySelector("[data-device-stage]");
      return {
        start: scrollY + node.getBoundingClientRect().top - parseFloat(getComputedStyle(node).scrollMarginTop),
        range: node.offsetHeight - stage.offsetHeight,
      };
    });
    const seek = async progress => {
      await page.evaluate(top => scrollTo({ top, behavior: "instant" }), scroll.start + scroll.range * progress);
      await page.evaluate(nextFrame);
      return story.evaluate(readPose);
    };
    const initial = await seek(0);
    await page.mouse.move(viewport.width / 2, viewport.height / 2);
    const before = await page.evaluate(() => scrollY);
    await page.mouse.wheel(0, 160);
    await page.waitForFunction(y => scrollY > y, before);
    for (const index of [0, 1, 2, 3, 2, 1, 0]) {
      const pose = await seek(index / 3);
      assert.equal(pose.index, index, `${viewport.width}px device ${index}`);
      assert.equal(pose.matches, 1);
      assert.equal(pose.template, "cafe_sunday_line_a");
      assert.ok(pose.inFrame && !pose.overlap);
      assert.equal(pose.frame.rotation, index > 1 ? -90 : 0);
      assert.deepEqual(pose.screens.map(screen => screen.scene), scenes);
      assert.ok(pose.screens.every(screen => screen.loaded && screen.filter === "none"));
      assert.deepEqual(pose.screens.map(screen => screen.opacity), scenes.map((_, step) => index === step ? 1 : 0));
      results.push({ ...viewport, device: scenes[index] });
    }
    const landscape = await seek(1 / 3);
    const turning = await seek(.5);
    assert.ok(turning.inFrame && turning.frame.rotation < -40 && turning.frame.rotation > -50);
    assert.equal(turning.frame.width, landscape.frame.width);
    assert.equal(turning.frame.height, landscape.frame.height);
    await seek(.85);
    assert.deepEqual(await seek(.5), turning, "reverse scroll returns the same pose");
    const last = await seek(1);
    assert.equal(last.index, 3);
    assert.ok(last.progress >= .999);
    await header.evaluate(node => {
      if (node.dataset.homeHero === "true") throw new Error("Basic colors appeared before the section arrived");
    });
    assert.equal(await header.getAttribute("data-home-basic-approach"), "true");
    await page.screenshot({ path: `${output}/${viewport.width}-phone.png` });

    const services = page.locator("[data-service-stack]");
    await services.evaluate(node => scrollTo({
      top: window.scrollY + node.getBoundingClientRect().top + 2, behavior: "instant",
    }));
    await page.waitForFunction(() => document.querySelector("[data-site-header]")?.dataset.homeHero === "true");
    assert.equal((await story.evaluate(readPose)).index, 3);
    await seek(0);
    assert.deepEqual(await story.evaluate(readPose), initial);
    assert.equal(await header.getAttribute("data-home-basic-approach"), null);
    if (viewport.width === 1440) {
      await page.screenshot({ path: `${output}/1440-monitor.png` });
      await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
      await page.locator("[data-hero-skip]").click();
      await page.waitForFunction(() => document.activeElement?.id === "device-platform-heading");
      await page.waitForFunction(() => document.querySelector("[data-device-platform]")?.dataset.progress === "0.0000");
      assert.equal((await story.evaluate(readPose)).index, 0);
    }
    assert.deepEqual(errors, [], `${viewport.width}px runtime errors`);
    await page.close();
  }

  const reduced = await browser.newPage({ reducedMotion: "reduce", viewport: { width: 390, height: 844 } });
  await reduced.goto(`${base}/#device-platform`, { waitUntil: "domcontentloaded" });
  const story = reduced.locator("[data-device-platform]");
  await reduced.waitForFunction(() => document.querySelector("[data-device-platform]")?.dataset.reduced === "true");
  assert.equal(await story.locator("[data-device-stage]").evaluate(node => getComputedStyle(node).position), "relative");
  assert.equal(await story.locator("nav, button, [role=progressbar]").count(), 0);
  assert.equal((await story.evaluate(readPose)).index, 0);
  await reduced.mouse.wheel(0, 220);
  await reduced.evaluate(nextFrame);
  const still = await story.evaluate(readPose);
  assert.equal(still.index, 0);
  assert.equal(still.frame.rotation, 0);
  await reduced.close();
} finally {
  await browser.close();
}

const summary = { passed: results.length, viewports: viewports.length, reducedMotion: true, results };
await writeFile(`${output}/results.json`, JSON.stringify(summary, null, 2));
console.log(JSON.stringify({ passed: summary.passed, viewports: summary.viewports, reducedMotion: summary.reducedMotion, output }));
