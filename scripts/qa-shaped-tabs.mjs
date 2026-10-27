import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

expect.configure({ timeout: 15_000 });

const baseUrl = process.env.SHAPED_TABS_QA_BASE_URL ?? "http://127.0.0.1:3000";
const output = process.env.SHAPED_TABS_QA_OUTPUT ?? "/tmp/artimenu-shaped-tabs-qa";
await mkdir(output, { recursive: true });

const browser = await chromium.launch();
const results = [];

async function assertUnderlineRail(list, { compact = false } = {}) {
  await expect(list).toHaveCSS("padding-left", "0px");
  await expect(list).toHaveCSS("padding-right", "0px");
  const geometry = await list.evaluate(element => {
    const first = element.firstElementChild?.getBoundingClientRect();
    const last = element.lastElementChild?.getBoundingClientRect();
    const rail = element.getBoundingClientRect();
    return first && last ? {
      firstInset: first.left - rail.left,
      lastInset: rail.right - last.right,
    } : null;
  });
  assert.ok(geometry, "underline tab list must contain tabs");
  assert.ok(Math.abs(geometry.firstInset) < .6, `rail starts ${geometry.firstInset}px before its first tab`);
  if (compact) assert.ok(Math.abs(geometry.lastInset) < .6, `compact rail ends ${geometry.lastInset}px after its last tab`);
}

try {
  for (const width of [375, 820, 1440]) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));

    await page.goto(`${baseUrl}/design-system#shaped-tabs`, { waitUntil: "domcontentloaded" });
    await page.evaluate(() => document.fonts.ready);
    for (const label of ["디자인 시스템 메뉴", "서비스 탐색 예시", "템플릿 라이브러리 서비스", "메뉴판 상태 예시"]) {
      await assertUnderlineRail(page.getByRole("tablist", { name: label }));
    }
    const section = page.locator("#shaped-tabs");
    await section.scrollIntoViewIfNeeded();

    for (const variant of ["folder", "flow"]) {
      const list = section.locator(`.site-${variant}-tabs`).first();
      const active = list.getByRole("tab", { selected: true });
      await expect(list).toBeVisible();
      await expect(list).toHaveCSS("overflow-x", "auto");
      await expect(list).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
      await expect(active).toHaveCSS("font-weight", "600");
      const mask = await active.evaluate(element => getComputedStyle(element, "::before").maskImage);
      assert.match(mask, /tab-folder-mask\.svg/);

      await active.focus();
      await expect(active.locator(".site-shaped-tab-label")).toHaveCSS("outline-width", "2px");
      await page.keyboard.press("ArrowRight");
      await expect(list.getByRole("tab", { selected: true })).toHaveText("기본 템플릿");
      await page.keyboard.press("ArrowRight");
      await expect(list.getByRole("tab", { selected: true })).toHaveText("디자인 템플릿");
    }

    await section.screenshot({ path: `${output}/library-${width}.png` });

    await page.goto(`${baseUrl}/templates`, { waitUntil: "networkidle" });
    const serviceTabs = page.getByRole("tablist", { name: "서비스 및 페이지 유형 선택" });
    await expect(serviceTabs).toHaveClass(/site-topic-tabs/);
    await assertUnderlineRail(serviceTabs, { compact: true });
    const catalogTabs = page.getByRole("tablist", { name: "템플릿 종류 선택" });
    await expect(catalogTabs).toHaveClass(/site-contained-tabs/);
    await expect(catalogTabs).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(catalogTabs.getByRole("tab", { selected: true })).toHaveText("디자인 템플릿");
    const categoryButtons = page.getByRole("group", { name: "업종 선택" }).getByRole("button");
    await expect(categoryButtons.first().locator("svg")).toBeVisible();
    await expect(categoryButtons.first().locator(".site-choice-tile-icon")).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    assert.equal(await categoryButtons.locator(".site-emoji-icon").count(), 0);
    await page.screenshot({ path: `${output}/templates-industries-${width}.png`, fullPage: true });
    await catalogTabs.getByRole("tab", { name: "기본 템플릿" }).focus();
    await page.keyboard.press("Enter");
    await expect(catalogTabs.getByRole("tab", { selected: true })).toHaveText("기본 템플릿");
    const catalogOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(catalogOverflow, 0, `template page overflow at ${width}px`);
    await page.screenshot({ path: `${output}/templates-${width}.png`, fullPage: true });

    await page.goto(`${baseUrl}/guides`, { waitUntil: "networkidle" });
    await assertUnderlineRail(page.getByRole("tablist", { name: "플랜별 사용가이드" }), { compact: true });
    const guideOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(guideOverflow, 0, `guide page overflow at ${width}px`);

    await page.goto(`${baseUrl}/faq?tab=faq`, { waitUntil: "networkidle" });
    const supportTabs = page.getByRole("tablist", { name: "고객센터 메뉴" });
    await expect(supportTabs).toHaveClass(/site-contained-tabs/);
    await expect(supportTabs.getByRole("tab", { selected: true })).toHaveText("FAQ");
    await supportTabs.getByRole("tab", { name: "공지사항" }).focus();
    await page.keyboard.press("Enter");
    await expect(supportTabs.getByRole("tab", { selected: true })).toHaveText("공지사항");
    const supportOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(supportOverflow, 0, `support page overflow at ${width}px`);

    assert.deepEqual(errors, [], `browser errors at ${width}px`);
    results.push({ width, catalogOverflow, guideOverflow, supportOverflow });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed: results.length, results }));
