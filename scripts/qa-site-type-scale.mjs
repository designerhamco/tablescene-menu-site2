import assert from "node:assert/strict";
import { chromium, expect } from "@playwright/test";

const base = process.env.SITE_TYPE_QA_BASE_URL || "http://127.0.0.1:3039";
const screenshotPath = process.env.SITE_TYPE_QA_SCREENSHOT || "/tmp/artimenu-site-type-scale-1440.png";
const routes = [
  "/",
  "/apply",
  "/guides",
  "/design-system",
  "/templates",
  "/templates/cafe_mocha_forest_a",
  "/sign-in",
  "/pricing",
  "/faq",
  "/faq/notices",
];
const widths = [390, 820, 1440];
const forbiddenSizes = new Set([17, 22, 26]);
const results = [];
const browser = await chromium.launch({ headless: true });

const exactRoles = {
  "site-notice": [16],
  "type-page-description": [18, 20],
  "type-body-lg": [18, 20],
  "type-body": [14, 16],
  "type-body-sm": [14],
  "type-card-body": [14],
  "type-plan-title": [16],
};

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
}

async function semanticMetrics(page) {
  return page.evaluate(() => {
    const rolePattern = /^(?:type-|text-(?:copy|support|meta)$)/;
    const nodes = [...document.querySelectorAll("body *")].filter(element => {
      if (!(element instanceof HTMLElement) || element.offsetParent === null) return false;
      return [...element.classList].some(name => rolePattern.test(name));
    });
    return nodes.map(element => {
      // The notice surface owns its text size, including on legacy mixed-class notices.
      const classes = element.classList.contains("site-notice")
        ? ["site-notice"]
        : [...element.classList].filter(name => rolePattern.test(name));
      return {
        classes,
        management: Boolean(element.closest(".site-management-scope")),
        fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
        text: element.textContent?.trim().replace(/\s+/g, " ").slice(0, 80) || "",
      };
    });
  });
}

try {
  for (const width of widths) {
    const page = await browser.newPage({ viewport: { width, height: 1100 }, reducedMotion: "reduce" });
    const pageErrors = [];
    page.on("pageerror", error => pageErrors.push(`${page.url()}: ${error.stack ?? error.message}`));

    for (const route of routes) {
      const response = await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded" });
      assert.ok(response?.ok(), `${route} returned ${response?.status()}`);
      await settle(page);

      if (route === "/design-system") {
        await page.getByRole("tab", { name: "기준·토큰", exact: true }).click();
        await settle(page);
      }

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `${route} ${width}px has ${overflow}px horizontal overflow`);

      if (width >= 1024) {
        const primaryActions = page.locator('main :is(.site-button-lg.site-button-primary, .site-button[data-purpose="primary-action"]):visible');
        if (["/apply", "/pricing", "/sign-in", "/templates/cafe_mocha_forest_a"].includes(route)) {
          await expect(primaryActions.first(), `${route} has a visible primary action`).toBeVisible();
        }
        for (const button of await primaryActions.all()) await expect(button).toHaveCSS("font-size", "16px");

        const mainTabs = page.locator('.site-page-tabs[data-purpose="page"] > .site-tab:visible');
        if (["/guides", "/faq/notices"].includes(route)) {
          await expect(mainTabs.first(), `${route} has visible principal tabs`).toBeVisible();
        }
        for (const tab of await mainTabs.all()) await expect(tab).toHaveCSS("font-size", "16px");

        const sections = page.locator('.site-area-tabs[data-purpose="section"] > .site-area-tab:visible');
        for (const tab of await sections.all()) await expect(tab).toHaveCSS("font-size", "14px");

        if (route === "/templates") {
          const service = page.getByRole("group", { name: "메뉴판 유형", exact: true });
          await expect(service.getByRole("radio", { name: "베이직", exact: true })).toHaveAttribute("aria-checked", "true");
          await service.getByRole("radio", { name: "다이닝", exact: true }).click();
          await expect(page.locator('[data-catalog-service]:not([data-catalog-service="dining"])')).toHaveCount(0);
          await service.getByRole("radio", { name: "베이직", exact: true }).click();
        }
      }

      const metrics = await semanticMetrics(page);
      const step = widths.indexOf(width);
      const pageTitle = [28, 32, 36][step];
      const sectionTitle = route === "/" ? pageTitle : [24, 24, 28][step];
      const metaSize = width >= 1024 ? 14 : 13;
      const expectedRoles = {
        ...exactRoles,
        "type-page-title": [pageTitle],
        "type-section-title": [sectionTitle],
        "type-card-detail": [metaSize],
        "type-caption": [metaSize],
        "type-footnote": [metaSize],
      };
      assert.ok(metrics.length > 0, `${route} ${width}px has no semantic typography roles`);
      for (const item of metrics) {
        assert.ok(
          !forbiddenSizes.has(item.fontSize),
          `${route} ${width}px still renders ${item.fontSize}px for ${item.classes.join(" ")}: ${item.text}`,
        );
        const sizes = item.management ? {
          ...expectedRoles,
          "type-page-title": [[28, 28, 32][step]],
          "type-section-title": [24],
          "type-page-description": [16],
          "type-body-lg": [16],
        } : expectedRoles;
        for (const [role, expected] of Object.entries(sizes)) {
          if (item.classes.includes(role)) {
            assert.ok(
              expected.includes(item.fontSize),
              `${route} ${width}px ${role} must render at ${expected.join(" or ")}px: ${item.text}`,
            );
          }
        }
      }

      results.push({
        route,
        width,
        overflow,
        roles: [...new Set(metrics.flatMap(item => item.classes))].sort(),
        sizes: [...new Set(metrics.map(item => item.fontSize))].sort((a, b) => a - b),
      });

      if (route === "/design-system" && width === 1440) {
        const section = page.locator("#site-type-scale").locator("xpath=ancestor::section[1]");
        await section.scrollIntoViewIfNeeded();
        await section.screenshot({ path: screenshotPath });
      }
    }

    assert.deepEqual(pageErrors, [], `${width}px browser errors`);
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed: results.length, screenshotPath, results }, null, 2));
