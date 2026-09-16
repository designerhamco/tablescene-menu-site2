import { chromium } from "@playwright/test";

const baseUrl = process.env.PUBLIC_SURFACE_QA_BASE_URL || "http://127.0.0.1:3000";
const navigationTimeout = Number(process.env.PUBLIC_SURFACE_QA_TIMEOUT_MS || 30_000);

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
];

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

async function inspectPage(page) {
  return page.evaluate(() => {
    const root = document.scrollingElement || document.documentElement;
    const visibleImages = [...document.images].filter((image) => {
      const style = getComputedStyle(image);
      const rect = image.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    });

    return {
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      brokenImages: visibleImages
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    };
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    for (const route of routes) {
      if (viewport.key === "mobile" && route.startsWith("/templates/display_menu_a/")) continue;

      const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
      const page = await context.newPage();
      const consoleErrors = [];
      const pageErrors = [];
      const requestFailures = [];

      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
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
        const response = await page.goto(url, { waitUntil: "networkidle", timeout: navigationTimeout });
        responseStatus = response?.status() ?? null;
        await page.waitForTimeout(250);
      } catch (error) {
        navigationError = error instanceof Error ? error.message : String(error);
      }

      const measurement = navigationError
        ? { title: "", bodyTextLength: 0, horizontalOverflow: 0, brokenImages: [] }
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
console.log(JSON.stringify({ baseUrl, checked: results.length, failed: failed.length, results }, null, 2));

if (failed.length > 0) process.exitCode = 1;
