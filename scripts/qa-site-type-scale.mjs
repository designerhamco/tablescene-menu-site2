import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

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
  "type-card-detail": [13],
  "type-caption": [13],
  "type-footnote": [13],
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
    page.on("pageerror", error => pageErrors.push(error.message));

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

      const metrics = await semanticMetrics(page);
      const step = widths.indexOf(width);
      const pageTitle = [28, 28, 32][step];
      const sectionTitle = (route === "/" ? [28, 32, 36] : [24, 24, 28])[step];
      const expectedRoles = { ...exactRoles, "type-page-title": [pageTitle], "type-section-title": [sectionTitle] };
      assert.ok(metrics.length > 0, `${route} ${width}px has no semantic typography roles`);
      for (const item of metrics) {
        assert.ok(
          !forbiddenSizes.has(item.fontSize),
          `${route} ${width}px still renders ${item.fontSize}px for ${item.classes.join(" ")}: ${item.text}`,
        );
        const sizes = item.management ? {
          ...expectedRoles,
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
