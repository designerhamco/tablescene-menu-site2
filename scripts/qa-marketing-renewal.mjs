import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import axe from "axe-core";

const base = process.env.MARKETING_QA_BASE_URL || "http://127.0.0.1:3008";
const out = process.env.MARKETING_QA_OUTPUT || "/tmp/artimenu-renewal-qa";
await fs.mkdir(out, { recursive: true });
const browser = await chromium.launch({ headless: true });
const results = [];
const failures = [];
try {
  for (const viewport of [
    { width: 360, height: 800 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1440, height: 900 },
  ]) {
    const context = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    for (const route of [
      "/",
      "/services/basic",
      "/services/dining",
      "/services/display",
      "/faq",
    ]) {
      const errorsAtStart = pageErrors.length;
      const response = await page.goto(`${base}${route}`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });
      assert.equal(response.status(), 200);
      await page.evaluate(() => document.fonts.ready);
      await page.addStyleTag({ content: "html { scroll-behavior: auto !important; }" });
      await page.waitForTimeout(300);
      await page.locator("footer").scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await page.evaluate(() => scrollTo(0, 0));
      await page.addScriptTag({ content: axe.source });
      const state = await page.evaluate(async () => {
        const accessibility = await window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21aa"] },
        });
        return {
          viewport: { width: innerWidth, height: innerHeight },
          h1: document.querySelector("h1")?.textContent,
          h1Count: document.querySelectorAll("h1").length,
          overflow: document.documentElement.scrollWidth - innerWidth,
          broken: [...document.images]
            .filter((img) => img.complete && !img.naturalWidth)
            .map((img) => img.currentSrc),
          a11y: accessibility.violations
            .filter((v) => ["critical", "serious"].includes(v.impact))
            .map((v) => ({ id: v.id, targets: v.nodes.map((n) => n.target) })),
        };
      });
      state.route = route;
      state.errors = pageErrors.slice(errorsAtStart);
      results.push(state);
      if (
        state.overflow > 1 ||
        state.broken.length ||
        state.a11y.length ||
        state.errors.length ||
        state.h1Count !== 1
      )
        failures.push(state);
      if (failures.includes(state)) console.log(JSON.stringify(state));
      const name = route === "/" ? "home" : route.split("/").at(-1);
      if ([390, 1440].includes(viewport.width)) {
        await page.screenshot({
          path: `${out}/${name}-${viewport.width}.png`,
          fullPage: true,
        });
        if (route === "/") {
          await page
            .locator("[data-marketing-page] section")
            .nth(2)
            .scrollIntoViewIfNeeded();
          await page.screenshot({
            path: `${out}/home-cards-${viewport.width}.png`,
          });
        }
      }
      if (route.startsWith("/services/")) {
        const button = route.endsWith("display")
          ? page.getByRole("button", { name: "연결 방법 보기" }).first()
          : page.getByRole("button", { name: "Safari", exact: true });
        await button.click();
        await page.getByRole("dialog").waitFor();
        assert.ok(
          await page.getByRole("dialog").getByRole("heading").textContent(),
        );
        await page.keyboard.press("Escape");
        assert.equal(await page.getByRole("dialog").count(), 0);
        await page.waitForTimeout(150);
        assert.equal(
          await button.evaluate((el) => el === document.activeElement),
          true,
        );
      }
      if (route === "/services/display")
        assert.equal(await page.locator('main a[href*="/apply"]').count(), 0);
      if (route === "/faq") {
        await page.getByRole("searchbox").fill("세상에없는질문123");
        await page
          .getByRole("heading", { name: "검색 결과가 없습니다" })
          .waitFor();
        await page.getByRole("searchbox").fill("QR");
        assert.ok(await page.locator("[aria-expanded]").count());
        await page.getByRole("searchbox").fill("");
        const next = page.getByRole("button", {
          name: "다음 페이지",
          exact: true,
        });
        if (await next.count()) {
          await next.click();
          assert.equal(
            await page
              .getByRole("button", { name: "2페이지", exact: true })
              .getAttribute("aria-current"),
            "page",
          );
        }
      }
      console.log(
        JSON.stringify({
          route,
          viewport: state.viewport,
          failures: failures.length,
        }),
      );
    }
    await context.close();
  }
  await fs.writeFile(
    `${out}/results.json`,
    JSON.stringify({ results, failures }, null, 2),
  );
  assert.equal(failures.length, 0, JSON.stringify(failures, null, 2));
  console.log(
    JSON.stringify({
      passed: results.length,
      failed: failures.length,
      output: out,
    }),
  );
} finally {
  await browser.close();
}
