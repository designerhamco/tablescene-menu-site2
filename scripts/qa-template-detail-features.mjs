// node --import tsx scripts/qa-template-detail-features.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import axe from "axe-core";
import { catalogDesigns } from "../lib/catalog-designs.ts";
import { DETAIL_FEATURES } from "../lib/template-detail-features.ts";

const base = process.env.TEMPLATE_DETAIL_QA_BASE_URL || "http://127.0.0.1:3120";
const output = process.env.TEMPLATE_DETAIL_QA_OUTPUT || "/tmp/artimenu-detail-accordion-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const errors = [], writes = [], results = [];
const route = `${base}/templates/cafe_real_matcha_a`;
function observe(page) {
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/public-menu/") && request.method() !== "GET") writes.push(request.url()); });
}
async function loaded(root) {
  await expect(root).toHaveAttribute("data-image-ready", "true", { timeout: 20000 });
  await expect.poll(() => root.locator("img").evaluate(image => image.complete && image.naturalWidth > 0)).toBe(true);
}
async function progress(root) {
  return root.locator('[data-active="true"] [aria-hidden="true"] > span').evaluate(element => new DOMMatrix(getComputedStyle(element).transform).a);
}
async function firstOnly(root) {
  await expect(root).toHaveAttribute("data-selected-item", "0");
  assert.equal(await root.locator('[data-feature-trigger][aria-expanded="true"]').count(), 1);
  assert.equal(await root.locator('[role="region"]:visible').count(), 1);
  await expect(root.locator("[data-feature-trigger]").first()).toHaveAttribute("aria-expanded", "true");
}

try {
  let page;
  for (const [width, height] of [[320, 844], [390, 844], [768, 1024], [820, 1180], [1024, 400], [1440, 900]]) {
    console.log(`Checking ${width}×${height}`);
    if (page) await page.close();
    page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    observe(page);
    assert.equal((await page.goto(route, { waitUntil: "domcontentloaded" })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.deepEqual(await page.evaluate(() => [innerWidth, innerHeight]), [width, height]);
    assert.equal(await page.locator("[data-feature-card]").count(), 8);
    assert.equal(await page.locator("[data-feature-section]").count(), 8);
    assert.equal(await page.locator("[data-template-story] table, [data-template-story] iframe").count(), 0);
    const cards = await page.locator("[data-feature-card]").evaluateAll(cards => cards.map(card => {
      const icon = card.querySelector("svg").getBoundingClientRect();
      const title = card.querySelector("h3").getBoundingClientRect();
      const text = card.querySelector("p").getBoundingClientRect();
      return { vertical: icon.bottom <= title.top && title.bottom <= text.top, radius: getComputedStyle(card).borderRadius, background: getComputedStyle(card).backgroundColor };
    }));
    assert.ok(cards.every(card => card.vertical && card.radius === "16px" && card.background !== "rgb(255, 255, 255)"));
    const guide = page.getByRole("link", { name: "사용 방법 (새 창)", exact: true });
    await expect(guide).toHaveAttribute("href", "/guides?plan=basic");
    await expect(guide).toHaveAttribute("target", "_blank");
    assert.ok(await guide.evaluate(element => element.getBoundingClientRect().width < element.closest("section").getBoundingClientRect().width * .7));
    const cover = page.locator('[data-feature-accordion="cover"]');
    await cover.scrollIntoViewIfNeeded();
    await loaded(cover);
    await firstOnly(cover);
    const positions = await cover.evaluate(element => {
      const image = element.querySelector("figure").getBoundingClientRect();
      const list = element.querySelector("ol").getBoundingClientRect();
      return { image: { x: image.x, y: image.y, right: image.right, bottom: image.bottom }, list: { x: list.x, y: list.y }, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    assert.equal(positions.overflow, 0);
    assert.ok(width >= 1200 ? positions.image.right < positions.list.x : positions.list.y >= positions.image.bottom);
    const sidebar = page.getByRole("complementary", { name: "템플릿 정보 및 시작" });
    if (width >= 768) {
      await expect(sidebar).toHaveAttribute("data-docked", "true");
      assert.ok(await sidebar.locator("[data-template-detail-actions]").evaluate(element => Math.abs(element.getBoundingClientRect().bottom - (innerHeight - 24)) < 2));
    } else await expect(sidebar).toHaveAttribute("data-docked", "false");
    await page.screenshot({ path: `${output}/${width}-section.png` });
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect(sidebar).toHaveAttribute("data-docked", "false");
    await expect(sidebar.getByRole("region", { name: /디자인 갤러리/ })).toBeVisible();
    console.log(`Checking accessibility ${width}×${height}`);
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.filter(item => ["critical", "serious"].includes(item.impact)).map(item => ({ id: item.id, targets: item.nodes.map(node => node.target) })));
    assert.deepEqual(violations, []);
    results.push({ case: "responsive-cards-accordion-and-sidebar", viewport: [width, height], ...positions });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  for (const feature of DETAIL_FEATURES) {
    const root = page.locator(`[data-feature-accordion="${feature.id}"]`);
    await root.scrollIntoViewIfNeeded();
    await firstOnly(root);
    assert.equal(await root.locator(".site-button-primary").count(), 0);
    for (let index = 0; index < feature.steps.length; index++) {
      await root.locator("[data-feature-trigger]").nth(index).click();
      await expect(root).toHaveAttribute("data-selected-item", String(index));
      await expect(root.locator("[data-feature-image]")).toHaveAttribute("data-feature-image", feature.steps[index].image);
      await loaded(root);
      assert.equal(await root.locator('[data-feature-trigger][aria-expanded="true"]').count(), 1);
      assert.equal(await root.locator('[role="region"]:visible').count(), 1);
    }
    results.push({ case: "manual-image-and-single-open-panel", feature: feature.id, steps: feature.steps.length });
  }
  const cover = page.locator('[data-feature-accordion="cover"]');
  await cover.scrollIntoViewIfNeeded();
  const triggers = cover.locator("[data-feature-trigger]");
  await triggers.first().focus();
  await triggers.first().press("ArrowDown");
  await expect(triggers.nth(1)).toBeFocused();
  await triggers.nth(1).press("Home");
  await expect(triggers.first()).toBeFocused();
  await triggers.first().press("Enter");
  await expect(cover).toHaveAttribute("data-selected-item", "0");
  await expect(cover).toHaveAttribute("data-auto-playing", "false");
  results.push({ case: "keyboard-and-reduced-motion" });
  await page.getByRole("link", { name: "사용 방법 (새 창)", exact: true }).scrollIntoViewIfNeeded();
  await page.locator('[aria-label="메뉴판 핵심 기능 8가지"]').evaluate(element => element.scrollIntoView({ behavior: "instant", block: "center" }));
  await page.screenshot({ path: `${output}/overview-cards.png` });
  const popupPromise = page.waitForEvent("popup");
  await page.getByRole("link", { name: "사용 방법 (새 창)", exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState("domcontentloaded");
  await expect(popup).toHaveURL(`${base}/guides?plan=basic`);
  await expect(popup.getByRole("tab", { name: "베이직", exact: true })).toHaveAttribute("aria-selected", "true");
  await popup.close();
  results.push({ case: "guide-opens-basic-in-new-window" });

  await page.close();
  page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: "reduce" });
  observe(page);
  for (const design of catalogDesigns) {
    assert.equal((await page.goto(new URL(design.detailHref, base).href, { waitUntil: "domcontentloaded" })).status(), 200);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("[data-feature-card]").count(), 8);
    for (const root of await page.locator("[data-feature-accordion]").all()) await firstOnly(root);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    if (design.itemLayout === "album") await expect(page.locator("#feature-images")).toContainText("1:1, 4:5, 5:4");
    results.push({ case: "catalog-initial-state", design: design.id, viewport: [390, 844] });
  }
  const auto = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "no-preference" });
  observe(auto);
  await auto.goto(route, { waitUntil: "domcontentloaded" });
  const root = auto.locator('[data-feature-accordion="cover"]');
  await root.scrollIntoViewIfNeeded();
  await loaded(root);
  await expect(root).toHaveAttribute("data-auto-playing", "true");
  await auto.waitForTimeout(1000);
  const running = await progress(root);
  assert.ok(running > 0 && running < 1);
  await root.getByRole("button", { name: "대표 영역 자동 전환 일시정지", exact: true }).click();
  const paused = await progress(root);
  await auto.waitForTimeout(1000);
  assert.ok(Math.abs(await progress(root) - paused) < .02);
  await root.getByRole("button", { name: "대표 영역 자동 전환 재생", exact: true }).click();
  await expect(root).toHaveAttribute("data-selected-item", "1", { timeout: 8000 });
  await expect(root.locator("[data-feature-image]")).toHaveAttribute("data-feature-image", DETAIL_FEATURES[0].steps[1].image);
  await loaded(root);
  await expect(root).toHaveAttribute("data-selected-item", "0", { timeout: 8000 });
  await root.locator("[data-feature-trigger]").nth(1).click();
  assert.ok(await progress(root) < .1);
  await auto.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
  await expect(root).toHaveAttribute("data-auto-playing", "false");
  const offscreen = await progress(root);
  await auto.waitForTimeout(1000);
  assert.ok(Math.abs(await progress(root) - offscreen) < .02);
  results.push({ case: "progress-pause-resume-auto-next-wrap-manual-reset-and-offscreen" });
  await auto.close();
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors, writes }, null, 2));
  console.log(JSON.stringify({ checked: results.length, failed: 0, errors: 0, actualWrites: 0, output }));
} finally { await browser.close(); }
