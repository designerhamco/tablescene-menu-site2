import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = process.env.SITE_CONTROL_QA_BASE_URL ?? "http://127.0.0.1:3000";
const browser = await chromium.launch();
const cases = [
  { width: 375, hasTouch: true, minimums: [40, 44, 48] },
  { width: 820, hasTouch: true, minimums: [40, 44, 48] },
  { width: 1440, hasTouch: false, minimums: [32, 44, 48] },
  { width: 2600, hasTouch: false, minimums: [36, 49.5, 54] },
];

try {
  for (const { width, hasTouch, minimums } of cases) {
    const page = await browser.newPage({ viewport: { width, height: 1000 }, hasTouch, reducedMotion: "reduce" });
    await page.goto(`${base}/design-system#control-size-examples`, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    for (const [index, size] of ["sm", "md", "lg"].entries()) {
      const panel = page.locator(`[data-control-size-example="${size}"]`);
      await expect(panel).toBeVisible();
      const measured = await panel.evaluate(element => {
        const input = element.querySelector('input[data-slot="input"]');
        const select = element.querySelector("select");
        const search = element.querySelector(".site-search-field");
        const save = element.querySelector('.site-field-action-row > button');
        const row = save.parentElement;
        const fields = [input, select, search, save];
        const bounds = fields.map(control => control.getBoundingClientRect());
        return {
          heights: bounds.map(bound => bound.height),
          radii: fields.map(control => getComputedStyle(control).borderRadius),
          centerDifference: Math.abs(bounds[0].y + bounds[0].height / 2 - bounds[3].y - bounds[3].height / 2),
          actionWidth: bounds[3].width,
          rowWidth: row.getBoundingClientRect().width,
        };
      });
      for (const height of measured.heights) {
        assert.ok(Math.abs(height - minimums[index]) <= 1, JSON.stringify({ width, size, measured }));
      }
      assert.deepEqual(measured.radii, ["12px", "12px", "12px", "8px"]);
      assert.ok(measured.centerDifference <= 1);
      assert.ok(measured.actionWidth < measured.rowWidth / 2);
    }

    const sample = page.locator("#button-surface-boundaries");
    const outline = sample.getByRole("button", { name: "사용 가능한 이동 예시", exact: true });
    const reset = sample.getByRole("button", { name: "초기화 예시", exact: true });
    const disabled = sample.getByRole("button", { name: "초기화 · 비활성", exact: true });
    for (const button of [outline, reset]) {
      await expect(button).toHaveCSS("background-color", "rgb(255, 255, 255)");
      await expect(button).toHaveCSS("border-top-color", "rgb(159, 163, 171)");
    }
    await expect(disabled).toBeDisabled();
    await expect(disabled).toHaveCSS("background-color", "rgb(226, 229, 233)");
    await expect(disabled).toHaveCSS("border-top-width", "1px");
    const chip = page.locator("main .site-chip").first();
    assert.ok(await chip.evaluate(el => parseFloat(getComputedStyle(el).borderRadius) > el.getBoundingClientRect().height / 2));

    await page.goto(`${base}/sign-in`, { waitUntil: "load" });
    const signIn = page.getByRole("button", { name: "로그인", exact: true });
    await expect(signIn).toHaveAttribute("data-button-width", "full");
    const email = page.getByRole("textbox", { name: "이메일", exact: true });
    await expect(email).toHaveCSS("border-radius", "12px");
    assert.equal((await signIn.boundingBox()).width, (await email.boundingBox()).width);

    await page.goto(`${base}/faq`, { waitUntil: "load" });
    const faqSearch = page.getByRole("searchbox", { name: "고객센터 검색" }).locator("..");
    await expect(faqSearch).toHaveCSS("border-radius", "12px");
    assert.ok(Math.abs((await faqSearch.boundingBox()).height - minimums[2]) <= 1);

    await page.goto(`${base}/templates`, { waitUntil: "load" });
    await expect(page.locator('[data-site-control-kit="standard"]')).toHaveCount(0);
    const catalogSearch = page.locator(".site-catalog-search .site-search-field");
    if (await catalogSearch.isVisible()) await expect(catalogSearch).toHaveCSS("border-radius", "9999px");
    await expect(page.getByRole("tablist", { name: "템플릿 종류 선택" })).toHaveClass(/site-area-tabs/);

    await page.goto(`${base}/templates/cafe_real_matcha_a`, { waitUntil: "load" });
    const detailActions = page.locator("[data-template-detail-actions]");
    await expect(page.locator('[data-site-control-kit="standard"]')).toHaveCount(0);
    for (const name of ["미리보기", "이 디자인으로 시작"]) {
      assert.equal((await detailActions.getByRole("link", { name, exact: true }).boundingBox()).width, (await detailActions.boundingBox()).width);
    }
    console.log(`Passed the official control family at ${width}px`);
    await page.close();
  }
} finally {
  await browser.close();
}
