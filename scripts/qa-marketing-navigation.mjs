import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

expect.configure({ timeout: 15000 });
const baseUrl = process.env.MARKETING_QA_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const results = [];

async function expectService(page, service) {
  await expect(page).toHaveURL(new URL(service === "display" ? "/services/display" : "/", baseUrl).href);
  await expect(page.locator("h1")).toHaveText(service === "display" ? "ArtiMenu DisplayMade to Be Seen" : "디지털 메뉴판의 새로운 경험");
  await expect(page.locator("[data-home-hero-frame]")).toHaveCount(service === "display" ? 0 : 1);
}

async function selectService(page, service, mobile) {
  if (mobile) await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await page.getByRole("link", { name: service === "display" ? "아티메뉴 디스플레이" : /^아티메뉴 다이닝/ }).click();
  await expectService(page, service);
}

try {
  // Exercise Next Link transitions in both directions, including history and reload.
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 1024, height: 768 }, { width: 390, height: 844 }]) {
    const mobile = viewport.width < 1280;
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await expectService(page, "dining");
    const header = page.locator("[data-site-header]");
    await page.evaluate(() => window.scrollTo({ top: 300, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-floating", String(viewport.width >= 768));
    if (viewport.width < 768) {
      await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
      await expect(header).toHaveAttribute("data-floating", "false");
      await expect(page.getByRole("navigation", { name: "모바일 공식 사이트 메뉴" })).toBeVisible();
      await page.getByRole("button", { name: "메뉴 닫기", exact: true }).click();
      await expect(header).toHaveAttribute("data-floating", String(viewport.width >= 768));
    }
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await expect(header).toHaveAttribute("data-floating", "false");
    for (let round = 0; round < 3; round += 1) {
      await selectService(page, "display", mobile);
      await selectService(page, "dining", mobile);
    }
    await page.goBack();
    await expectService(page, "display");
    await page.goForward();
    await expectService(page, "dining");
    await page.reload({ waitUntil: "domcontentloaded" });
    await expectService(page, "dining");
    await page.goto(new URL("/services/display", baseUrl).href, { waitUntil: "domcontentloaded" });
    await expectService(page, "display");
    await selectService(page, "dining", mobile);
    if (mobile) await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
    await page.getByRole("link", { name: "템플릿 보러가기", exact: true }).click();
    await expect(page).toHaveURL(new URL("/apply", baseUrl).href);
    await selectService(page, "dining", mobile);
    assert.deepEqual(errors, []);
    results.push({ check: "navigation", viewport, repeatedRoundTrips: 3, history: true, reload: true, directDisplayEntry: true, floatingHeader: true, templateEntry: true });
    await page.close();
  }

  // Existing dining/display aliases must still agree with direct visits.
  const page = await browser.newPage();
  for (const [path, service] of [["/services/basic", "dining"], ["/services/menu", "dining"], ["/services/screen", "display"]]) {
    await page.goto(new URL(path, baseUrl).href, { waitUntil: "domcontentloaded" });
    await expectService(page, service);
    results.push({ check: "alias", path, service });
  }
  await page.close();
  console.log(JSON.stringify({ baseUrl, passed: results.length, results }, null, 2));
} finally {
  await browser.close();
}
