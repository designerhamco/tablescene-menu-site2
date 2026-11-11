import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";
import axe from "axe-core";

const base = process.env.IMAGE_VIEWER_QA_BASE || "http://127.0.0.1:3019";
const output = process.env.IMAGE_VIEWER_QA_OUTPUT || "/tmp/artimenu-image-viewer-qa";
await mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [];
const errors = [];
try {
  for (const [width, height] of [[320, 844], [390, 844], [768, 1024], [820, 1180], [1024, 400], [1440, 900], [2560, 1080], [844, 390]]) {
    const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
    page.on("pageerror", error => errors.push(error.message));
    await page.goto(`${base}/templates/cafe_real_matcha_a`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const gallery = page.getByRole("region", { name: "REAL MATCHA 디자인 갤러리", exact: true });
    const trigger = gallery.getByRole("button", { name: "REAL MATCHA 메뉴판 디자인 크게 보기", exact: true });
    await trigger.click();
    const viewer = page.getByRole("dialog");
    await expect(viewer).toHaveAccessibleName("REAL MATCHA · 메뉴판 디자인");
    const image = viewer.locator("img");
    await image.evaluate(image => image.decode());
    await viewer.evaluate(async element => Promise.all(element.getAnimations().map(animation => animation.finished.catch(() => {}))));
    const frame = await viewer.evaluate(element => {
      const rect = element.getBoundingClientRect();
      return { width: rect.width, height: rect.height, x: rect.x, y: rect.y, viewport: [innerWidth, innerHeight], overflow: document.documentElement.scrollWidth - innerWidth };
    });
    assert.deepEqual(frame.viewport, [width, height]);
    assert.equal(frame.overflow, 0);
    assert.ok(frame.x >= -1 && frame.y >= -1 && frame.x + frame.width <= width + 1 && frame.y + frame.height <= height + 1);
    if (width < 768) assert.equal(frame.width, width);
    await expect(image).toHaveCSS("object-fit", "contain");
    const close = viewer.getByRole("button", { name: "닫기", exact: true });
    const closeRect = await close.boundingBox();
    assert.ok(closeRect.width >= 40 && closeRect.height >= 40);
    assert.ok(closeRect.y >= 0 && closeRect.y + closeRect.height <= height);
    await viewer.getByRole("button", { name: "확대", exact: true }).click();
    const viewport = viewer.locator(".site-image-viewer-viewport");
    await expect(viewport).toHaveAttribute("data-zoomed");
    await expect.poll(() => viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(0);
    const zoom = await viewport.evaluate(element => ({ width: element.clientWidth, height: element.clientHeight, scrollWidth: element.scrollWidth, scrollHeight: element.scrollHeight }));
    assert.ok(zoom.scrollWidth >= zoom.width * 1.99 && zoom.scrollHeight >= zoom.height * 1.99);
    await viewport.focus();
    await page.keyboard.press("ArrowRight");
    await expect(viewer.getByRole("status")).toHaveText("1 / 3");
    await viewer.getByRole("button", { name: "다음 확대 이미지", exact: true }).click();
    await expect(viewer.getByRole("status")).toHaveText("2 / 3");
    await expect(viewport).not.toHaveAttribute("data-zoomed");
    await viewer.press("End");
    await expect(viewer.getByRole("status")).toHaveText("3 / 3");
    await viewer.press("Home");
    await expect(viewer.getByRole("status")).toHaveText("1 / 3");
    for (let i = 0; i < 8; i++) {
      await page.keyboard.press("Tab");
      assert.ok(await viewer.evaluate(element => element.contains(document.activeElement)), "focus remains inside the viewer");
    }
    if ([390, 1440].includes(width)) {
      await page.screenshot({ path: `${output}/viewer-${width}.png` });
      await page.addScriptTag({ content: axe.source });
      const audit = await page.evaluate(async () => (await window.axe.run(document.querySelector('[role="dialog"]'), { runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] } })).violations.filter(issue => ["critical", "serious"].includes(issue.impact)));
      assert.deepEqual(audit, []);
    }
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await trigger.press("Space");
    await expect(viewer).toBeVisible();
    await close.click();
    await expect(trigger).toBeFocused();
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    const thumbnail = gallery.getByRole("button", { name: "모바일 QR 메뉴", exact: true });
    await thumbnail.click();
    await expect(viewer.getByRole("status")).toHaveText("2 / 3");
    await viewer.getByRole("button", { name: "닫기", exact: true }).click();
    await expect(thumbnail).toBeFocused();
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    await expect(thumbnail).toHaveAttribute("aria-pressed", "true");
    if ([390, 1440].includes(width)) {
      const box = await gallery.locator(".site-image-carousel-viewport").boundingBox();
      await page.mouse.move(box.x + box.width * .8, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width * .2, box.y + box.height / 2, { steps: 15 });
      await page.mouse.up();
      await expect(viewer).toHaveCount(0);
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
      await expect(gallery.getByRole("status")).toHaveText("3/3");
    }
    const hero = page.getByRole("button", { name: "REAL MATCHA 메뉴판 전체 구성 크게 보기", exact: true });
    await hero.click();
    await expect(viewer.getByRole("status")).toHaveText("1 / 3");
    if (width >= 768) await page.mouse.click(4, 4);
    else await close.click();
    await expect(viewer).toHaveCount(0);
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    await expect(hero).toBeFocused();
    console.log("PASS viewer", width, height);
    results.push({ case: "viewer", ...frame, zoom, navigation: "keyboard, controls, thumbnail and hero", focus: "trapped and restored" });
    await page.close();
  }
  for (const width of [390, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: "reduce" });
    await page.goto(`${base}/templates/cafe_sunday_roasters_a`, { waitUntil: "networkidle" });
    await page.getByRole("region", { name: /디자인 갤러리/ }).locator(".site-image-open-trigger").click();
    const viewer = page.getByRole("dialog");
    await expect(viewer.getByRole("status")).toHaveText("1 / 1");
    await expect(viewer.getByRole("group", { name: "확대 이미지 선택" })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(viewer).toHaveCount(0);
    await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    console.log("PASS single image", width);
    results.push({ case: "single-image-viewer", viewport: width });
    await page.close();
  }
  for (const width of [320, 390, 767, 768, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    await page.goto(`${base}/templates?plan=basic&category=designer&view=small`, { waitUntil: "networkidle" });
    const grid = page.locator(".site-catalog-results .site-template-grid");
    const metrics = await grid.evaluate(element => {
      const css = getComputedStyle(element), cards = [...element.children].map(child => child.getBoundingClientRect());
      return { columnGap: parseFloat(css.columnGap), rowGap: parseFloat(css.rowGap), cardWidth: cards[0].width, width: element.clientWidth, columns: css.gridTemplateColumns.split(" ").length, overflow: document.documentElement.scrollWidth - innerWidth };
    });
    assert.equal(metrics.overflow, 0);
    if (width < 768) {
      assert.equal(metrics.columnGap, 12); assert.equal(metrics.rowGap, 32); assert.equal(metrics.columns, width < 640 ? 2 : 3);
      assert.ok(metrics.cardWidth > (metrics.width - (metrics.columns - 1) * 24) / metrics.columns, "narrower gutters make mobile thumbnails wider");
    } else assert.ok(metrics.columnGap >= 24);
    console.log("PASS catalog", width);
    results.push({ case: "catalog", viewport: width, ...metrics });
    await page.close();
  }
  for (const width of [390, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    await page.goto(`${base}/design-system`, { waitUntil: "networkidle" });
    const mobileNotice = page.getByRole("dialog", { name: "위치 편집은 PC에서 해 주세요", exact: true });
    if (await mobileNotice.isVisible()) {
      await mobileNotice.getByRole("button", { name: "확인", exact: true }).click();
      await expect(mobileNotice).toHaveCount(0);
      await expect(page.locator('[data-slot="dialog-overlay"]')).toHaveCount(0);
    }
    const panel = page.locator(".site-notification-panel[data-compact]");
    await panel.getByRole("button", { name: "모두 읽기", exact: true }).click();
    await panel.getByRole("tab", { name: /읽지 않음/ }).click();
    await expect(panel.getByRole("heading", { name: "읽지 않은 알림이 없습니다", exact: true })).toBeVisible();
    const spacing = await panel.locator('.site-notification-feed[data-state="active"]').evaluate(element => ({ padding: parseFloat(getComputedStyle(element).paddingTop), gap: element.querySelector(".site-empty-state").getBoundingClientRect().top - element.getBoundingClientRect().top, background: getComputedStyle(element.querySelector(".site-empty-state")).backgroundColor }));
    assert.equal(spacing.padding, 24); assert.equal(spacing.gap, 24);
    assert.equal(spacing.background, "rgba(0, 0, 0, 0)");
    await panel.getByRole("button", { name: "모두 읽기", exact: true }).isDisabled().then(value => assert.ok(value));
    if (width === 390) await panel.screenshot({ path: `${output}/notification-empty-${width}.png` });
    console.log("PASS notification empty", width);
    results.push({ case: "notification-empty", viewport: width, ...spacing });
    if (width === 390) {
      const example = page.locator('#image-carousel-examples [data-presentation="gallery"]');
      await example.getByRole("button", { name: /메뉴판 디자인 크게 보기/ }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.getByRole("dialog").getByRole("button", { name: "닫기", exact: true }).click();
      results.push({ case: "design-system-viewer", passed: true });
    }
    await page.close();
  }
  assert.deepEqual(errors, []);
  await writeFile(`${output}/results.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify({ checked: results.length, failed: 0, output }));
} finally { await browser.close(); }
