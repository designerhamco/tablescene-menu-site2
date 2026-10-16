import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const baseUrl = process.env.MARKETING_QA_BASE_URL || "http://127.0.0.1:3000";
const browser = await chromium.launch({ headless: true });
const results = [];

async function expectService(page, service) {
  await expect(page).toHaveURL(new URL(service === "display" ? "/services/display" : "/", baseUrl).href);
  await expect(page.locator("h1")).toHaveText(service === "display" ? "ArtiMenu DisplayMade to Be Seen" : "ArtiMenuPerfect For Your Store");
  await expect(page.locator("[data-home-hero-frame]")).toHaveCount(service === "display" ? 0 : 1);
}

async function selectService(page, service, mobile) {
  if (mobile) await page.getByRole("button", { name: "메뉴 열기", exact: true }).click();
  await page.getByRole("link", { name: service === "display" ? "아티메뉴 디스플레이" : /^아티메뉴 다이닝/ }).click();
  await expectService(page, service);
}

try {
  // Exercise Next Link transitions in both directions, including history and reload.
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const mobile = viewport.width < 1024;
    const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
    await expectService(page, "dining");
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
    assert.deepEqual(errors, []);
    results.push({ check: "navigation", viewport, repeatedRoundTrips: 3, history: true, reload: true, directDisplayEntry: true });
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
