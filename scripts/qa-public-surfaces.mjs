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
  const url = new URL(request.url());
  const isPrefetch = url.searchParams.has("_rsc");
  const isDevReload = url.pathname === "/_next/static/chunks/main-app.js" && url.searchParams.has("v");
  return errorText === "net::ERR_ABORTED" && (isPrefetch || isDevReload);
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

async function inspectPreviewGuide(page) {
  const failures = [];
  const dialog = page.getByRole("dialog", { name: "메뉴판 미리보기 사용 안내" });
  const closeButton = page.getByRole("button", { name: "닫기", exact: true });
  const hideTodayCheckbox = page.getByRole("checkbox", { name: "오늘 하루 보지 않기" });

  if (!(await dialog.isVisible())) failures.push("preview guide dialog is not visible on the first visit");
  if (!(await closeButton.isVisible())) failures.push("preview guide close button is not visible");
  if (!(await hideTodayCheckbox.isVisible())) failures.push("preview guide hide-today checkbox is not visible");
  if (failures.length > 0) return failures;

  await closeButton.click();
  if (await dialog.isVisible()) failures.push("preview guide remains visible after closing the guide");

  await page.reload({ waitUntil: "domcontentloaded", timeout: navigationTimeout });
  await page.waitForTimeout(100);
  if (await dialog.isVisible()) failures.push("preview guide reopens during the dismissed browser session");

  await page.evaluate(() => window.sessionStorage.clear());
  await page.reload({ waitUntil: "domcontentloaded", timeout: navigationTimeout });
  await dialog.waitFor({ state: "visible", timeout: 2_000 }).catch(() => null);
  if (!(await dialog.isVisible())) failures.push("preview guide does not reopen after session dismissal is cleared");

  if (failures.length === 0) {
    await hideTodayCheckbox.check();
    await closeButton.click();
    await page.reload({ waitUntil: "domcontentloaded", timeout: navigationTimeout });
    await page.waitForTimeout(100);
    if (await dialog.isVisible()) failures.push("preview guide reopens after checking hide for today and closing");
  }

  return failures;
}

async function inspectDisplayPreviewControls(page) {
  const failures = [];
  const dialog = page.getByRole("dialog", { name: "메뉴판 미리보기 사용 안내" });
  const controls = page.locator("[data-display-preview-controls-visible]");
  const pagination = page.locator("[data-display-preview-pagination]");

  if (!(await dialog.isVisible())) failures.push("display preview guide is not visible on the first visit");
  if (await dialog.getAttribute("data-preview-guide-variant") !== "display") {
    failures.push("display preview guide does not use the display-only variant");
  }
  if (await page.getByText("PC·태블릿·모바일 버튼을 눌러").isVisible()) {
    failures.push("display preview guide includes the device selector explanation");
  }
  if (!(await pagination.count())) failures.push("display preview pagination is missing");
  if (failures.length > 0) return failures;

  await page.getByRole("button", { name: "닫기", exact: true }).click();
  const viewport = page.viewportSize();
  if (!viewport) return ["display preview viewport is unavailable"];

  await page.mouse.move(viewport.width / 2, viewport.height * 0.2);
  if (await controls.getAttribute("data-display-preview-controls-visible") !== "false") {
    failures.push("display preview controls stay visible away from the bottom edge");
  }

  await page.mouse.move(viewport.width / 2, viewport.height - 4);
  if (await controls.getAttribute("data-display-preview-controls-visible") !== "true") {
    failures.push("display preview controls do not appear near the bottom edge");
  }

  await page.mouse.move(viewport.width / 2, viewport.height * 0.2);
  if (await controls.getAttribute("data-display-preview-controls-visible") !== "false") {
    failures.push("display preview controls do not hide after leaving the bottom edge");
  }

  const minimumPriceColumnGap = await page.evaluate(() => {
    const gaps = [...document.querySelectorAll(".cafe-a-price-options-grid, .cafe-a-option-header-grid")]
      .flatMap((grid) => {
        const boxes = [...grid.children]
          .map((child) => child.getBoundingClientRect())
          .filter((box) => box.width > 0 && box.height > 0)
          .sort((left, right) => left.left - right.left);

        return boxes.slice(1).map((box, index) => box.left - boxes[index].right);
      });

    return gaps.length > 0 ? Math.min(...gaps) : null;
  });
  if (minimumPriceColumnGap === null) {
    failures.push("display preview price option columns are missing");
  } else if (minimumPriceColumnGap < 12) {
    failures.push(`display preview price option columns are too close: ${minimumPriceColumnGap.toFixed(1)}px`);
  }

  return failures;
}

async function inspectCafeFitPresentation(page) {
  const failures = [];
  const previewFrame = page.frames().find((frame) => frame !== page.mainFrame() && frame.url().includes("view=actual"));
  if (!previewFrame) return ["fitted menu preview iframe is missing"];

  const board = previewFrame.locator(".cafe-a-desktop-fit-board");
  await board.waitFor({ state: "attached", timeout: 5_000 }).catch(() => null);
  if (!(await board.count())) return ["desktop fit board is missing"];

  await previewFrame
    .waitForFunction(() => {
      const state = document.querySelector(".cafe-a-desktop-fit-board")?.getAttribute("data-fit-presentation-state");
      return state === "ready" || state === "reload";
    }, undefined, { timeout: Math.min(navigationTimeout, 30_000) })
    .catch(() => null);

  const presentationState = await board.getAttribute("data-fit-presentation-state");
  const fitOverflow = await board.getAttribute("data-fit-overflow");
  if (presentationState !== "ready") failures.push(`fit presentation did not become ready: ${presentationState ?? "missing"}`);
  if (fitOverflow === "true") failures.push("fit engine reports overflow after stabilization");

  const crop = await previewFrame.evaluate(() => {
    const boardElement = document.querySelector(".cafe-a-desktop-fit-board");
    const menuElement = boardElement?.querySelector("[data-cafe-a-fit-menu], .cafe-a-fit-menu-grid");
    if (!(boardElement instanceof HTMLElement) || !(menuElement instanceof HTMLElement)) {
      return { missing: true, clippedCount: 0, scrollOverflow: false };
    }

    const boardRect = boardElement.getBoundingClientRect();
    const menuRect = menuElement.getBoundingClientRect();
    const safeBottom = Math.min(boardRect.bottom, menuRect.bottom, window.innerHeight);
    const visibleContent = [...menuElement.querySelectorAll(
      "[data-cafe-a-category-heading], [data-cafe-a-menu-name], [data-cafe-a-menu-price], [data-cafe-a-widget-block]",
    )].filter((element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    });
    const clippedCount = visibleContent.filter((element) => {
      const rect = element.getBoundingClientRect();
      return rect.bottom > safeBottom + 1 || rect.right > boardRect.right + 1 || rect.left < boardRect.left - 1;
    }).length;

    return {
      missing: false,
      clippedCount,
      scrollOverflow:
        menuElement.scrollHeight > menuElement.clientHeight + 1 ||
        menuElement.scrollWidth > menuElement.clientWidth + 1 ||
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
    };
  });

  if (crop.missing) failures.push("fit menu element is missing");
  if (crop.clippedCount > 0) failures.push(`fit menu has ${crop.clippedCount} visibly clipped elements`);
  if (crop.scrollOverflow) failures.push("fit menu has scroll overflow after stabilization");
  return failures;
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
      const previewGuideFailures = !navigationError
        && viewport.key === "desktop"
        && route === "/templates/cafe_sunday_line_a/preview"
        ? await inspectPreviewGuide(page)
        : [];
      const displayPreviewFailures = !navigationError
        && viewport.key === "desktop"
        && route === "/templates/display_menu_a/preview?page=3"
        ? await inspectDisplayPreviewControls(page)
        : [];
      const cafeFitFailures = !navigationError
        && viewport.key === "desktop"
        && /^\/templates\/cafe_(?:design|mocha_forest|sunday_line|round_focus)_a\/preview$/.test(route)
        ? await inspectCafeFitPresentation(page)
        : [];
      const failures = [
        ...(navigationError ? [`navigation: ${navigationError}`] : []),
        ...(responseStatus === null || responseStatus >= 400 ? [`http: ${responseStatus ?? "no response"}`] : []),
        ...(measurement.bodyTextLength < 10 ? ["visible content is empty"] : []),
        ...(measurement.horizontalOverflow > 2 ? [`horizontal overflow: ${measurement.horizontalOverflow}px`] : []),
        ...measurement.brokenImages.map((urlValue) => `broken image: ${urlValue}`),
        ...consoleErrors.map((message) => `console: ${message}`),
        ...pageErrors.map((message) => `pageerror: ${message}`),
        ...requestFailures.map((message) => `requestfailed: ${message}`),
        ...previewGuideFailures.map((message) => `preview guide: ${message}`),
        ...displayPreviewFailures.map((message) => `display preview: ${message}`),
        ...cafeFitFailures.map((message) => `cafe fit: ${message}`),
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
