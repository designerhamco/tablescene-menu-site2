// node --import tsx scripts/qa-template-detail-features.mjs
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import axe from "axe-core";
import { catalogDesigns } from "../lib/catalog-designs.ts";

const base = process.env.TEMPLATE_DETAIL_QA_BASE_URL || "http://127.0.0.1:3100";
const output = process.env.TEMPLATE_DETAIL_QA_OUTPUT || "/tmp/artimenu-detail-feature-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const errors = [];
const writes = [];
const features = ["cover", "images", "prices", "sale", "widgets", "ads", "call", "order"];

function observe(page) {
  page.on("pageerror", error => errors.push(error.message));
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/public-menu/") && request.method() !== "GET") writes.push(request.url()); });
}
async function settled(page) {
  await page.evaluate(() => document.fonts.ready);
}
async function command(page, step, playing = false) {
  await page.evaluate(({ step, playing }) => window.postMessage({ type: "template-feature-command", step, playing }, location.origin), { step, playing });
  await expect(page.locator("[data-scene-step]")).toHaveAttribute("data-scene-step", String(step));
}
async function scene(page, feature, preview = "/templates/cafe_real_matcha_a/preview") {
  const url = new URL(preview, base);
  for (const [key, value] of Object.entries({ view: "actual", embedded: "1", device: "tablet", demoFeature: feature })) url.searchParams.set(key, value);
  assert.equal((await page.goto(url.href, { waitUntil: "networkidle" })).status(), 200);
  await expect(page.locator("[data-scene-ready]")).toHaveAttribute("data-scene-ready", "true");
  assert.deepEqual(await page.evaluate(() => [innerWidth, innerHeight]), [1180, 820]);
}

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
  observe(page);
  for (const [width, height] of [[320, 844], [390, 844], [768, 1024], [820, 1180], [1024, 400], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto(`${base}/templates/cafe_real_matcha_a`, { waitUntil: "networkidle" });
    await settled(page);
    assert.deepEqual(await page.locator("[data-feature-section]").evaluateAll(sections => sections.map(section => section.dataset.featureSection)), features);
    assert.equal(await page.locator("[data-template-story] table tbody tr").count(), 8);
    await expect(page.getByRole("button", { name: "사용 방법", exact: true })).toBeDisabled();
    assert.equal(await page.getByRole("link", { name: "사용 방법", exact: true }).count(), 0);
    const geometry = await page.evaluate(() => {
      const sidebar = document.querySelector("aside[aria-label='템플릿 정보 및 시작']").getBoundingClientRect();
      const story = document.querySelector("[data-template-story]").getBoundingClientRect();
      return { viewport: [innerWidth, innerHeight], overflow: document.documentElement.scrollWidth - innerWidth, sidebar: { x: sidebar.x, bottom: sidebar.bottom }, story: { y: story.y, right: story.right } };
    });
    assert.deepEqual(geometry.viewport, [width, height]);
    assert.equal(geometry.overflow, 0);
    assert.ok(width >= 768 ? geometry.story.right < geometry.sidebar.x : geometry.story.y >= geometry.sidebar.bottom);
    const demo = page.locator('[data-feature-demo="cover"]');
    await demo.scrollIntoViewIfNeeded();
    await expect(demo).toHaveAttribute("data-demo-ready", "true", { timeout: 30000 });
    await demo.getByRole("button", { name: "2단계: 대표 영역 켜기", exact: true }).click();
    await expect(demo).toHaveAttribute("data-demo-step", "1");
    const previewFrame = page.frameLocator('iframe[title="대표 영역 자동 시연 화면"]');
    await expect(previewFrame.locator("[data-show-cover]")).toHaveAttribute("data-show-cover", "true");
    assert.deepEqual(await previewFrame.locator("body").evaluate(() => [innerWidth, innerHeight]), [1180, 820]);
    assert.ok(await demo.evaluate(element => {
      const screen = element.querySelector("[data-demo-screen]").getBoundingClientRect();
      const frame = element.querySelector("iframe").getBoundingClientRect();
      return Math.abs(screen.width - frame.width) < 1 && Math.abs(screen.height - frame.height) < 1;
    }), "The full tablet viewport fits inside its frame without cropping");
    await page.screenshot({ path: `${output}/${width}-cover.png` });
    if (width === 1440) {
      await demo.getByRole("button", { name: "대표 영역 시연 처음부터 보기" }).click();
      await expect(previewFrame.locator("[data-show-cover]")).toHaveAttribute("data-show-cover", "false");
      await demo.getByRole("button", { name: "대표 영역 시연 재생", exact: true }).click();
      await expect(demo).toHaveAttribute("data-demo-step", "1", { timeout: 10000 });
      await demo.getByRole("button", { name: "대표 영역 시연 일시정지" }).click();
      await page.waitForTimeout(5000);
      await expect(demo).toHaveAttribute("data-demo-step", "1");
      results.push({ case: "play-pause-and-restart" });
    }
    const sidebar = page.getByRole("complementary", { name: "템플릿 정보 및 시작" });
    if (width >= 768) {
      await expect(sidebar).toHaveAttribute("data-docked", "true");
      assert.ok(await sidebar.locator("[data-template-detail-actions]").evaluate(element => element.getBoundingClientRect().bottom <= innerHeight));
    } else await expect(sidebar).toHaveAttribute("data-docked", "false");
    await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
    await expect.poll(() => page.locator("iframe").count()).toBe(0);
    await expect(sidebar).toHaveAttribute("data-docked", "false");
    await expect(sidebar.getByRole("region", { name: /디자인 갤러리/ })).toBeVisible();
    await page.addScriptTag({ content: axe.source });
    const violations = await page.evaluate(async () => (await window.axe.run(document, { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.filter(item => ["critical", "serious"].includes(item.impact)).map(item => item.id));
    assert.deepEqual(violations, []);
    results.push({ case: "responsive-and-sidebar", ...geometry });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const design of catalogDesigns) {
    assert.equal((await page.goto(new URL(design.detailHref, base).href, { waitUntil: "networkidle" })).status(), 200);
    await expect(page.getByRole("heading", { level: 1, name: design.name, exact: true })).toBeVisible();
    assert.equal(await page.locator("[data-feature-section]").count(), 8);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0);
    if (design.itemLayout === "album") await expect(page.locator("#feature-images .type-body").first()).toContainText("1:1, 4:5, 5:4");
    if (design.itemLayout === "album" && design.service === "basic") await expect(page.locator("#feature-prices")).toContainText("가격 옵션 열을 제공하지 않습니다");
    if (design.service === "dining") await expect(page.locator("#feature-sale")).toContainText("선택한 디자인에서는 이 기능을 제공하지 않습니다");
    results.push({ case: "catalog", design: design.id, viewport: [390, 844] });
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(`${base}/templates/cafe_real_matcha_a`, { waitUntil: "networkidle" });
  const orderDemo = page.locator('[data-feature-demo="order"]');
  await orderDemo.scrollIntoViewIfNeeded();
  await expect(orderDemo).toHaveAttribute("data-demo-ready", "true", { timeout: 30000 });
  await orderDemo.getByRole("button", { name: "4단계: 주문 내역 확인", exact: true }).click();
  await expect(page.frameLocator('iframe[title="주문 자동 시연 화면"]').locator("[data-history-order]")).toBeVisible({ timeout: 10000 });
  await expect(orderDemo).toHaveAttribute("data-demo-ready", "true");
  results.push({ case: "embedded-order-history" });
  await page.setViewportSize({ width: 1180, height: 820 });
  await scene(page, "cover");
  await expect(page.locator("[data-show-cover]")).toHaveAttribute("data-show-cover", "false");
  await command(page, 1);
  await expect(page.locator("[data-show-cover]")).toHaveAttribute("data-show-cover", "true");
  results.push({ case: "cover-toggle" });

  await scene(page, "images");
  assert.equal(await page.locator('button[aria-label$="이미지 크게 보기"]').count(), 0);
  await command(page, 1);
  await expect(page.locator('button[aria-label$="이미지 크게 보기"]:visible').first()).toBeVisible();
  await command(page, 2, true);
  await expect.poll(() => page.locator("[data-radius-item]").evaluate(element => getComputedStyle(element).getPropertyValue("--menu-image-radius-item"))).toBe("24px");
  await command(page, 3);
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.screenshot({ path: `${output}/images-expanded.png` });
  results.push({ case: "image-toggle-radius-and-lightbox" });

  await scene(page, "prices");
  await command(page, 1);
  await expect(page.locator("body")).toContainText("HOT");
  await expect(page.locator("body")).toContainText("ICE");
  await command(page, 2);
  for (const label of ["SMALL", "TALL", "LARGE"]) await expect(page.locator("body")).toContainText(label);
  await command(page, 3, true);
  await expect(page.locator(".cafe-a-price-label:visible").first()).toContainText("ICE ONLY");
  results.push({ case: "category-price-columns-and-typed-note" });

  await scene(page, "sale");
  assert.equal(await page.locator("[data-cafe-a-time-sale-digital-timer]").count(), 0);
  await command(page, 2, true);
  await expect(page.locator("body")).toContainText("오늘의 특가");
  const timer = page.locator("[data-cafe-a-time-sale-digital-timer]:visible").first();
  const previous = await timer.textContent();
  await expect.poll(() => timer.textContent()).not.toBe(previous);
  await page.screenshot({ path: `${output}/sale-countdown.png` });
  results.push({ case: "sale-typed-badge-and-live-countdown" });

  await scene(page, "widgets");
  for (const step of [1, 2, 3]) {
    await command(page, step);
    if (step !== 2) await expect(page.locator('img[src$="cheese-platter.jpg"]:visible').first()).toBeVisible();
    if (step !== 1) await expect(page.locator("body")).toContainText("매장에서 전하는 작은 소식");
  }
  await page.screenshot({ path: `${output}/widget-image-text.png` });
  results.push({ case: "three-widget-types" });

  await scene(page, "ads");
  assert.equal(await page.locator("[data-menu-advertisement-popup]").count(), 0);
  for (const step of [1, 2, 3]) {
    await command(page, step);
    await expect(page.locator("[data-popup-active]")).toHaveAttribute("data-popup-active", String(step - 1));
  }
  await page.waitForTimeout(5500);
  await expect(page.locator("[data-popup-active]")).toHaveAttribute("data-popup-active", "2");
  results.push({ case: "three-advertisement-slides" });

  await scene(page, "call");
  await command(page, 1);
  await expect(page.locator('[aria-label="직원 호출 항목"] button[aria-pressed="true"]')).toContainText("물");
  await command(page, 3);
  await expect(page.locator("[data-call-status]")).toContainText("직원에게 호출을 보냈습니다");
  await page.screenshot({ path: `${output}/call-sent.png` });
  results.push({ case: "simulated-staff-call" });

  await scene(page, "order");
  await command(page, 1);
  await expect(page.locator('[data-menu-cart] [role="dialog"]')).toContainText("최종 주문 금액", { timeout: 10000 });
  await command(page, 3);
  await expect(page.locator("[data-history-order]")).toContainText("리얼 맛차", { timeout: 10000 });
  await expect(page.locator("[data-history-order]")).toContainText("결제 전");
  await page.screenshot({ path: `${output}/order-history.png` });
  results.push({ case: "simulated-cart-postpay-and-order-history" });

  // Default album and Dining use the same actual renderers inside the scaled tablet.
  for (const preview of ["/templates/cafe_design_a/preview?design=basic-first-column-album", "/templates/dining_aube_table_a/preview"]) {
    await scene(page, "images", preview);
    await command(page, 3);
    await expect(page.getByRole("dialog")).toBeVisible();
    results.push({ case: "album-or-dining-lightbox", preview });
    await scene(page, "order", preview);
    await command(page, 3);
    await expect(page.locator("[data-history-order]")).toBeVisible({ timeout: 10000 });
    results.push({ case: "album-or-dining-postpay", preview });
  }
  await scene(page, "prices", "/templates/dining_aube_table_a/preview");
  await command(page, 2);
  await expect(page.locator(".aube-table-option-price:visible").first()).toContainText("SMALL");
  results.push({ case: "dining-product-price-options" });
  await scene(page, "widgets", "/templates/dining_aube_table_a/preview");
  await command(page, 3);
  await expect(page.locator('img[src$="cheese-platter.jpg"]:visible').first()).toBeVisible();
  results.push({ case: "dining-widget" });
  assert.deepEqual(errors, []);
  assert.deepEqual(writes, []);
  await writeFile(`${output}/results.json`, JSON.stringify({ results, errors, writes }, null, 2));
  console.log(JSON.stringify({ checked: results.length, failed: 0, errors: errors.length, actualWrites: writes.length, output }));
} finally {
  await browser.close();
}
