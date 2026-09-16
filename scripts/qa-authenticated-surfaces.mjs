import { chromium } from "@playwright/test";
import axe from "axe-core";

const baseUrl = process.env.AUTHENTICATED_SURFACE_QA_BASE_URL || "http://127.0.0.1:3000";
const email = process.env.AUTHENTICATED_SURFACE_QA_EMAIL;
const password = process.env.AUTHENTICATED_SURFACE_QA_PASSWORD;
const configuredMenuId = process.env.AUTHENTICATED_SURFACE_QA_MENU_ID;
const navigationTimeout = Number(process.env.AUTHENTICATED_SURFACE_QA_TIMEOUT_MS || 30_000);
const routeFilter = process.env.AUTHENTICATED_SURFACE_QA_ROUTE;

if (!email || !password) {
  console.error(
    "AUTHENTICATED_SURFACE_QA_EMAIL and AUTHENTICATED_SURFACE_QA_PASSWORD are required. " +
      "Store them in the ignored .env.qa.local file or provide them only for this command.",
  );
  process.exit(2);
}

const viewports = [
  { key: "desktop", width: 1440, height: 900 },
  { key: "mobile", width: 390, height: 844 },
];

const baseRoutes = [
  "/mypage?tab=menus",
  "/mypage?tab=payments",
  "/mypage?tab=inquiries",
  "/mypage?tab=notifications",
  "/mypage?tab=account",
  "/mypage/operations",
  "/mypage/staff",
  "/mypage/inquiries",
];

function getMenuRoutes(menuId) {
  if (!menuId) return [];

  return [
    `/mypage/menus/${menuId}/edit?tab=basic`,
    `/mypage/menus/${menuId}/edit?tab=menu`,
    `/mypage/menus/${menuId}/edit?tab=design`,
    `/mypage/menus/${menuId}/edit?tab=localization`,
    `/mypage/menus/${menuId}/edit?tab=publish`,
    `/mypage/menus/${menuId}/preview`,
    `/mypage/menus/${menuId}/qr`,
  ];
}

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

async function waitForSettledPage(page) {
  await page.waitForLoadState("networkidle", { timeout: Math.min(navigationTimeout, 5_000) }).catch(() => null);
  await page
    .waitForFunction(() => document.body?.innerText.trim().length >= 10, undefined, {
      timeout: Math.min(navigationTimeout, 5_000),
    })
    .catch(() => null);
  await page.waitForTimeout(500);
}

async function signIn(page) {
  await page.goto(new URL("/sign-in?next=%2Fmypage", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: navigationTimeout,
  });
  await page.getByLabel("이메일", { exact: true }).fill(email);
  await page.getByLabel("비밀번호", { exact: true }).fill(password);
  await Promise.all([
    page.waitForURL((url) => url.pathname.startsWith("/mypage"), { timeout: navigationTimeout }),
    page.getByRole("button", { name: "로그인", exact: true }).click(),
  ]);
  await waitForSettledPage(page);

  if (new URL(page.url()).pathname.startsWith("/sign-in")) {
    throw new Error("login did not leave /sign-in");
  }
}

async function discoverMenuId(page) {
  if (configuredMenuId) return configuredMenuId;

  await page.goto(new URL("/mypage?tab=menus", baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: navigationTimeout,
  });
  await waitForSettledPage(page);
  const href = await page.locator('a[href*="/mypage/menus/"][href$="/edit"]').first().getAttribute("href").catch(() => null);
  return href?.match(/\/mypage\/menus\/([^/]+)\/edit/)?.[1] || null;
}

async function inspectPage(page) {
  await page.addScriptTag({ content: axe.source });
  return page.evaluate(async () => {
    const root = document.scrollingElement || document.documentElement;
    const viewportWidth = document.documentElement.clientWidth;
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

    const hasHorizontalScrollAncestor = (element) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        const style = getComputedStyle(parent);
        if (style.overflowX === "auto" || style.overflowX === "scroll") return true;
      }
      return false;
    };
    const clippedInteractiveElements = [...document.querySelectorAll("a, button, input, textarea, select, [role=button], [role=tab]")]
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        if (style.display === "none" || style.visibility === "hidden" || rect.width <= 0 || rect.height <= 0) return false;
        if (hasHorizontalScrollAncestor(element)) return false;
        return rect.left < -2 || rect.right > viewportWidth + 2;
      })
      .slice(0, 10)
      .map((element) => ({
        tag: element.tagName.toLowerCase(),
        label: (element.getAttribute("aria-label") || element.textContent || "").trim().replace(/\s+/g, " ").slice(0, 80),
      }));

    return {
      title: document.title,
      bodyTextLength: document.body.innerText.trim().length,
      horizontalOverflow: Math.max(0, root.scrollWidth - root.clientWidth),
      brokenImages: visibleImages
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
      clippedInteractiveElements,
      blockingAccessibilityViolations,
    };
  });
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    const page = await context.newPage();

    try {
      await signIn(page);
    } catch (error) {
      results.push({
        route: "/sign-in",
        viewport,
        failures: [`login: ${error instanceof Error ? error.message : String(error)}`],
      });
      await context.close();
      continue;
    }

    const menuId = await discoverMenuId(page);
    const routes = [...baseRoutes, ...getMenuRoutes(menuId)].filter((route) => !routeFilter || route === routeFilter);

    for (const route of routes) {
      const consoleErrors = [];
      const pageErrors = [];
      const requestFailures = [];
      const onConsole = (message) => {
        if (message.type() === "error" && !isExpectedBrowserConsoleNoise(message.text())) consoleErrors.push(message.text());
      };
      const onPageError = (error) => pageErrors.push(error.message);
      const onRequestFailed = (request) => {
        if (isSameOriginRequest(request.url()) && !isCancelledNextPrefetch(request)) {
          requestFailures.push(`${request.method()} ${request.url()} · ${request.failure()?.errorText || "unknown"}`);
        }
      };
      page.on("console", onConsole);
      page.on("pageerror", onPageError);
      page.on("requestfailed", onRequestFailed);

      const url = new URL(route, baseUrl).toString();
      let responseStatus = null;
      let navigationError = null;

      try {
        const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: navigationTimeout });
        responseStatus = response?.status() ?? null;
        await waitForSettledPage(page);
      } catch (error) {
        navigationError = error instanceof Error ? error.message : String(error);
      }

      const measurement = navigationError
        ? {
            title: "",
            bodyTextLength: 0,
            horizontalOverflow: 0,
            brokenImages: [],
            clippedInteractiveElements: [],
            blockingAccessibilityViolations: [],
          }
        : await inspectPage(page);
      const failures = [
        ...(navigationError ? [`navigation: ${navigationError}`] : []),
        ...(responseStatus === null || responseStatus >= 400 ? [`http: ${responseStatus ?? "no response"}`] : []),
        ...(new URL(page.url()).pathname.startsWith("/sign-in") ? ["authentication session was lost"] : []),
        ...(measurement.bodyTextLength < 10 ? ["visible content is empty"] : []),
        ...(measurement.horizontalOverflow > 2 ? [`horizontal overflow: ${measurement.horizontalOverflow}px`] : []),
        ...measurement.brokenImages.map((urlValue) => `broken image: ${urlValue}`),
        ...measurement.clippedInteractiveElements.map(
          (element) => `clipped interactive element: ${element.tag} ${element.label || "(unlabelled)"}`,
        ),
        ...consoleErrors.map((message) => `console: ${message}`),
        ...pageErrors.map((message) => `pageerror: ${message}`),
        ...requestFailures.map((message) => `requestfailed: ${message}`),
        ...measurement.blockingAccessibilityViolations.map(
          (violation) =>
            `accessibility ${violation.impact}: ${violation.id} · ${violation.help} · ${violation.targets.join(", ")}`,
        ),
      ];

      results.push({ route, viewport, responseStatus, ...measurement, failures });
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
      page.off("requestfailed", onRequestFailed);
    }

    await context.close();
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
