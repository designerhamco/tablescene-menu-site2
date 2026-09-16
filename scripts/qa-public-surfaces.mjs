import { chromium } from "@playwright/test";
import axe from "axe-core";

const baseUrl = process.env.PUBLIC_SURFACE_QA_BASE_URL || "http://127.0.0.1:3000";
const navigationTimeout = Number(process.env.PUBLIC_SURFACE_QA_TIMEOUT_MS || 30_000);

const routeFilter = process.env.PUBLIC_SURFACE_QA_ROUTE;
const routes = [
  "/",
  "/apply",
  "/pricing",
  "/faq",
  "/terms",
  "/privacy",
  "/sign-in",
  "/sign-up",
  "/forgot-password",
  "/templates/cafe_design_a/preview",
  "/templates/cafe_mocha_forest_a/preview",
  "/templates/cafe_sunday_line_a/preview",
  "/templates/cafe_round_focus_a/preview",
  "/templates/dining_aube_table_a/preview",
  "/templates/dining_aube_table_b/preview",
  "/templates/display_menu_a/preview?page=3",
].filter((route) => !routeFilter || route === routeFilter);

const viewports = [
  { key: "desktop", width: 1440, height: 900 },
  { key: "mobile", width: 390, height: 844 },
];

function isSameOriginRequest(url) {
  try {
    return new URL(url).origin === new URL(baseUrl).origin;
  } catch {
    return false;
  }
}

function isCancelledNextPrefetch(request) {
  const errorText = request.failure()?.errorText || "";
  return errorText === "net::ERR_ABORTED" && new URL(request.url()).searchParams.has("_rsc");
}

function isExpectedBrowserConsoleNoise(message) {
  return message === "Failed to load resource: net::ERR_CACHE_WRITE_FAILURE";
}

async function inspectPage(page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const root = document.scrollingElement || document.documentElement;
    const visibleImages = [...document.images].filter((image) => {
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });

    const accessibility = await window.axe.run(document, {
      runOnly: {
        type: "tag",
        values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
      },
      resultTypes: ["violations"],
    });
    const blockingAccessibilityViolations = accessibility.violations
      .filter((violation) => violation.impact === "critical" || violation.impact === "serious")
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.slice(0, 5).map((node) => node.target.join(" ")),
      }));

    return {
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      brokenImages: visibleImages
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
      blockingAccessibilityViolations,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    for (const route of routes) {
      if (viewport.key === "mobile" && route.startsWith("/templates/display_menu_a/")) continue;

      const context = await browser.newContext({
        viewport,
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const requestFailures = [];

      page.on("console", (message) => {
        if (message.type() === "error" && !isExpectedBrowserConsoleNoise(message.text())) {
          consoleErrors.push(message.text());
        }
      });
      page.on("pageerror", (error) => pageErrors.push(error.message));
      page.on("requestfailed", (request) => {
        if (isSameOriginRequest(request.url()) && !isCancelledNextPrefetch(request)) {
          requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || "unknown"}`);
        }
      });

      const url = new URL(route, baseUrl).toString();
      let responseStatus = null;
      let navigationError = null;

      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeout });
        responseStatus = response?.status() ?? null;
        await page.waitForLoadState("networkidle", { timeout: Math.min(navigationTimeout, 5_000) }).catch(() => null);
        await page
          .waitForFunction(() => document.body?.innerText.trim().length >= 10, undefined, {
            timeout: Math.min(navigationTimeout, 5_000),
          })
          .catch(() => null);
        await page.waitForTimeout(700);
      } catch (error) {
        navigationError = error instanceof Error ? error.message : String(error);
      }

      const measurement = navigationError
        ? {
            title: "",
            bodyTextLength: 0,
            horizontalOverflow: 0,
            brokenImages: [],
            blockingAccessibilityViolations: [],
          }
        : await inspectPage(page);
      const failures = [
        ...(navigationError ? [`navigation: ${navigationError}`] : []),
        ...(responseStatus === null || responseStatus >= 400 ? [`http: ${responseStatus ?? "no response"}`] : []),
        ...(measurement.bodyTextLength < 10 ? ["visible content is empty"] : []),
        ...(measurement.horizontalOverflow > 2 ? [`horizontal overflow: ${measurement.horizontalOverflow}px`] : []),
        ...measurement.brokenImages.map((urlValue) => `broken image: ${urlValue}`),
        ...consoleErrors.map((message) => `console: ${message}`),
        ...pageErrors.map((message) => `pageerror: ${message}`),
        ...requestFailures.map((message) => `requestfailed: ${message}`),
        ...measurement.blockingAccessibilityViolations.map(
          (violation) =>
            `accessibility ${violation.impact}: ${violation.id} · ${violation.help} · ${violation.targets.join(", ")}`,
        ),
      ];

      results.push({
        route,
        viewport,
        responseStatus,
        ...measurement,
        failures,
      });

      await context.close();
    }
  }
} finally {
  await browser.close();
}

const failed = results.filter((result) => result.failures.length > 0);
console.log(
  JSON.stringify(
    {
      baseUrl,
      checked: results.length,
      failed: failed.length,
      failures: failed,
    },
    null,
    2,
  ),
);

if (failed.length > 0) process.exitCode = 1;
