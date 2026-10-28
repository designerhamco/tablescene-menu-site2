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
    const hierarchySection = page.locator("#selection-hierarchy-title").locator("xpath=../..");
    const hierarchy = page.getByRole("list", { name: "상위에서 하위로 이어지는 탭 위계" });
    const hierarchyTabs = hierarchy.locator('[data-slot="tabs"]');
    await expect(hierarchyTabs.nth(0)).toHaveAttribute("data-hierarchy", "primary");
    await expect(hierarchyTabs.nth(0).locator('[data-slot="tabs-list"]')).toHaveClass(/site-tabs-outline/);
    await expect(hierarchyTabs.nth(1)).toHaveAttribute("data-hierarchy", "secondary");
    await expect(hierarchyTabs.nth(1).locator('[data-slot="tabs-list"]')).toHaveClass(/site-topic-tabs/);
    await expect(hierarchyTabs.nth(2)).toHaveAttribute("data-hierarchy", "embedded");
    await expect(hierarchyTabs.nth(2)).toHaveCSS("border-top-width", "0px");
    if (width >= 768) {
      const levelLefts = await hierarchy.locator("li").evaluateAll(elements => elements.map(element => element.getBoundingClientRect().left));
      assert.ok(levelLefts.every((left, index) => index === 0 || left > levelLefts[index - 1]), `hierarchy does not step inward at ${width}px`);
    }
    const designSystemOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(designSystemOverflow, 0, `design system page overflow at ${width}px`);
    await hierarchySection.screenshot({ path: `${output}/hierarchy-${width}.png` });

    const section = page.locator("#shaped-tabs");
    await section.scrollIntoViewIfNeeded();

    const areaRoot = section.locator(".site-area-tabs-root").first();
    const areaList = areaRoot.locator(".site-area-tabs");
    const areaActive = areaList.getByRole("tab", { selected: true });
    await expect(areaRoot).toBeVisible();
    await expect(areaRoot).toHaveCSS("border-top-width", "0px");
    await expect(areaList).toHaveCSS("overflow-x", "auto");
    await expect(areaList).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(areaActive).toHaveCSS("font-weight", "600");
    assert.equal(await areaActive.evaluate(element => getComputedStyle(element, "::before").maskImage), "none");

    await areaActive.focus();
    await expect(areaActive).toHaveCSS("outline-width", "2px");
    await page.keyboard.press("ArrowRight");
    await expect(areaList.getByRole("tab", { selected: true })).toHaveText("기본 템플릿");
    await page.keyboard.press("ArrowRight");
    await expect(areaList.getByRole("tab", { selected: true })).toHaveText("디자인 템플릿");

    await section.screenshot({ path: `${output}/library-${width}.png` });

    await page.goto(`${baseUrl}/templates`, { waitUntil: "networkidle" });
    const serviceTabs = page.getByRole("tablist", { name: "서비스 및 페이지 유형 선택" });
    await expect(serviceTabs).toHaveAttribute("data-hierarchy", "secondary");
    await expect(serviceTabs).toHaveClass(/site-topic-tabs/);
    await assertUnderlineRail(serviceTabs, { compact: true });
    const catalogTabs = page.getByRole("tablist", { name: "템플릿 종류 선택" });
    await expect(catalogTabs).toHaveAttribute("data-hierarchy", "embedded");
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
    await expect(supportTabs).toHaveAttribute("data-hierarchy", "primary");
    await expect(supportTabs).toHaveClass(/site-tabs-outline/);
    await expect(supportTabs.getByRole("tab", { selected: true })).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(supportTabs.getByRole("tab", { selected: true })).toHaveText("FAQ");
    await supportTabs.getByRole("tab", { name: "공지사항" }).focus();
    await page.keyboard.press("Enter");
    await expect(supportTabs.getByRole("tab", { selected: true })).toHaveText("공지사항");
    const supportOverflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    assert.equal(supportOverflow, 0, `support page overflow at ${width}px`);
    await page.screenshot({ path: `${output}/support-${width}.png`, fullPage: true });

    assert.deepEqual(errors, [], `browser errors at ${width}px`);
    results.push({ width, designSystemOverflow, catalogOverflow, guideOverflow, supportOverflow });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed: results.length, results }));
