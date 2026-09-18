import { chromium } from "@playwright/test";

const baseUrl = process.env.TEMPLATE_PREVIEW_LOCALE_QA_BASE_URL || "http://127.0.0.1:3000";
const navigationTimeout = Number(process.env.TEMPLATE_PREVIEW_LOCALE_QA_TIMEOUT_MS || 30_000);
const templateFilter = process.env.TEMPLATE_PREVIEW_LOCALE_QA_TEMPLATE;
const localeFilter = process.env.TEMPLATE_PREVIEW_LOCALE_QA_LOCALE;
const templates = [
  "cafe_design_a",
  "cafe_mocha_forest_a",
  "cafe_sunday_line_a",
  "cafe_round_focus_a",
  "dining_aube_table_a",
  "dining_aube_table_b",
  "display_menu_a",
].filter((templateKey) => !templateFilter || templateKey === templateFilter);
const singlePageTemplates = new Set([
  "cafe_design_a",
  "cafe_mocha_forest_a",
  "cafe_sunday_line_a",
  "cafe_round_focus_a",
]);
const locales = ["en", "zh", "ja"].filter((locale) => !localeFilter || locale === localeFilter);
const singlePageInternalTitleByLocale = {
  en: "MENU",
  zh: "菜单",
  ja: "メニュー",
};
const hangulPattern = /[가-힣]/;
const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const templateKey of templates) {
    for (const locale of locales) {
      const context = await browser.newContext({
        viewport: templateKey === "display_menu_a" ? { width: 1920, height: 1080 } : { width: 1440, height: 900 },
        deviceScaleFactor: 1,
        reducedMotion: "reduce",
        serviceWorkers: "block",
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (error) => errors.push(`pageerror: ${error.message}`));
      page.on("console", (message) => {
        if (message.type() === "error") errors.push(`console: ${message.text()}`);
      });

      const route = `/templates/${templateKey}/preview?lang=${locale}&view=actual&embedded=1`;
      const response = await page.goto(new URL(route, baseUrl).toString(), {
        waitUntil: "domcontentloaded",
        timeout: navigationTimeout,
      });
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => null);

      if (templateKey.startsWith("cafe_") && templateKey !== "cafe_brew_chapter_a") {
        await page.waitForFunction(() => (
          document.querySelector(".cafe-a-desktop-fit-board")?.getAttribute("data-fit-presentation-state") === "ready"
        ), undefined, { timeout: navigationTimeout }).catch(() => null);
      }

      const measurement = await page.evaluate(() => {
        const visibleFontSize = (selector) => {
          const element = Array.from(document.querySelectorAll(selector)).find((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          });
          return element ? Number.parseFloat(getComputedStyle(element).fontSize) : null;
        };
        const visibleFontSizes = (selector) => Array.from(document.querySelectorAll(selector))
          .filter((candidate) => {
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0;
          })
          .map((element) => Number.parseFloat(getComputedStyle(element).fontSize))
          .filter(Number.isFinite);
        const textRoot = document.body.cloneNode(true);
        if (textRoot instanceof HTMLElement) {
          textRoot.querySelector("[data-cafe-a-fit-presentation]")?.remove();
          textRoot.querySelectorAll("script, style, noscript, template, [hidden], [aria-hidden='true']")
            .forEach((element) => element.remove());
        }
        const board = document.querySelector(".cafe-a-desktop-fit-board");
        const menu = board?.querySelector("[data-cafe-a-fit-menu], .cafe-a-fit-menu-grid");
        const boardRect = board?.getBoundingClientRect();
        const menuRect = menu?.getBoundingClientRect();
        return {
          text: textRoot instanceof HTMLElement ? textRoot.innerText.trim() : "",
          horizontalOverflow: Math.max(0, document.documentElement.scrollWidth - document.documentElement.clientWidth),
          fitState: board?.getAttribute("data-fit-presentation-state") ?? null,
          fitOverflow: board?.getAttribute("data-fit-overflow") ?? null,
          fitColumns: board?.getAttribute("data-fit-columns") ?? null,
          fitFontScale: board?.getAttribute("data-fit-font-scale") ?? null,
          typography: {
            category: visibleFontSize(".cafe-a-desktop-fit-board .cafe-a-category-title"),
            item: visibleFontSize(".cafe-a-desktop-fit-board .cafe-a-menu-title"),
            featuredItem: visibleFontSize(".cafe-a-desktop-fit-board .cafe-a-featured-title"),
            description: visibleFontSize(".cafe-a-desktop-fit-board .cafe-a-fit-menu-grid .cafe-a-menu-description"),
            linkedSupporting: visibleFontSizes(".cafe-a-desktop-fit-board [data-cafe-a-store-description], .cafe-a-desktop-fit-board [data-cafe-a-featured-description], .cafe-a-desktop-fit-board .cafe-a-topline-description, .cafe-a-desktop-fit-board .cafe-a-topline-notice-text, .cafe-a-desktop-fit-board [data-cafe-a-footer-info] .cafe-a-description-text, .cafe-a-desktop-fit-board .cafe-a-round-focus-notice"),
          },
          boardRect: boardRect ? { width: boardRect.width, height: boardRect.height } : null,
          menuRect: menuRect ? { width: menuRect.width, height: menuRect.height } : null,
          menuScroll: menu instanceof HTMLElement
            ? { width: menu.scrollWidth, height: menu.scrollHeight, clientWidth: menu.clientWidth, clientHeight: menu.clientHeight }
            : null,
        };
      });
      const failures = [...errors];
      if (!response || response.status() >= 400) failures.push(`http: ${response?.status() ?? "no response"}`);
      if (measurement.text.length < 10) failures.push("visible content is empty");
      if (hangulPattern.test(measurement.text)) {
        const samples = [...new Set(measurement.text.split(/\s+/).filter((value) => hangulPattern.test(value)))].slice(0, 8);
        failures.push(`Korean fallback remains: ${samples.join(", ")}`);
      }
      if (measurement.horizontalOverflow > 2) failures.push(`horizontal overflow: ${measurement.horizontalOverflow}px`);
      if (templateKey.startsWith("cafe_") && measurement.fitState !== "ready") {
        failures.push(`fit presentation did not become ready: ${measurement.fitState ?? "missing"} · ${JSON.stringify(measurement)}`);
      }
      if (singlePageTemplates.has(templateKey)) {
        const visibleLines = measurement.text.split("\n").map((line) => line.trim()).filter(Boolean);
        if (visibleLines.includes(singlePageInternalTitleByLocale[locale])) {
          failures.push(`internal single-page title is visible: ${singlePageInternalTitleByLocale[locale]}`);
        }
        const { category, item, featuredItem, description, linkedSupporting } = measurement.typography;
        if (category === null || item === null || featuredItem === null || description === null) {
          failures.push(`single-page typography metrics are unavailable: ${JSON.stringify(measurement.typography)}`);
        } else {
          if (category < item * 1.35) failures.push(`category hierarchy is too weak: ${category}px / ${item}px`);
          if (Math.abs(featuredItem - item) > 0.15) {
            failures.push(`featured item title is not linked to menu item title: ${featuredItem}px / ${item}px`);
          }
          const mismatchedSupporting = linkedSupporting.filter((size) => Math.abs(size - description) > 0.15);
          if (mismatchedSupporting.length > 0) {
            failures.push(`supporting copy is not linked to menu descriptions: ${description}px / ${linkedSupporting.join(", ")}px`);
          }
        }
      }

      results.push({ templateKey, locale, route, failures });
      await context.close();
    }
  }

  if (!templateFilter && !localeFilter) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
      reducedMotion: "reduce",
      serviceWorkers: "block",
    });
    const page = await context.newPage();
    const failures = [];
    const route = "/templates/cafe_sunday_line_a/preview?lang=en";
    const response = await page.goto(new URL(route, baseUrl).toString(), {
      waitUntil: "domcontentloaded",
      timeout: navigationTimeout,
    });
    const toolbar = page.locator("[data-preview-device-toolbar]");
    await toolbar.waitFor({ state: "visible", timeout: navigationTimeout });
    await page.waitForTimeout(500);
    const previewGuide = page.locator("[data-preview-guide-variant]");
    await previewGuide.waitFor({ state: "visible", timeout: 5_000 }).catch(() => null);
    if (await previewGuide.isVisible()) {
      if (!(await previewGuide.locator("[data-preview-guide-profile-icon]").first().isVisible())) {
        failures.push("browser guide profile icon is missing");
      }
      await previewGuide.getByRole("button", { name: "닫기" }).click();
      await previewGuide.waitFor({ state: "hidden", timeout: navigationTimeout });
    }
    const before = await toolbar.boundingBox();
    if (await toolbar.getAttribute("data-toolbar-open") !== "true") failures.push("device toolbar is not open by default");
    await toolbar.getByRole("button", { name: "기기 선택 도구 닫기" }).click();
    await page.waitForFunction((beforeY) => {
      const toolbarElement = document.querySelector("[data-preview-device-toolbar]");
      const contentElement = document.querySelector("[data-preview-device-toolbar-content]");
      if (!(toolbarElement instanceof HTMLElement) || !(contentElement instanceof HTMLElement)) return false;

      const contentOpacity = Number.parseFloat(getComputedStyle(contentElement).opacity);
      const toolbarHasMoved = beforeY === null || toolbarElement.getBoundingClientRect().y < beforeY - 10;
      return toolbarElement.dataset.toolbarOpen === "false" && contentOpacity === 0 && toolbarHasMoved;
    }, before?.y ?? null, { timeout: navigationTimeout }).catch(() => {
      failures.push("device toolbar collapse transition did not settle");
    });
    const after = await toolbar.boundingBox();
    if (await toolbar.getAttribute("data-toolbar-open") !== "false") failures.push("device toolbar did not collapse");
    const collapsedContentOpacity = await toolbar.locator("[data-preview-device-toolbar-content]").evaluate((element) => (
      Number.parseFloat(getComputedStyle(element).opacity)
    ));
    if (collapsedContentOpacity !== 0) failures.push(`collapsed device controls remain visible: opacity ${collapsedContentOpacity}`);
    if (!(await toolbar.locator("button").isVisible())) failures.push("collapsed device toolbar arrow is missing");
    if (!before || !after) {
      failures.push("device toolbar bounds are unavailable");
    } else {
      if (Math.abs(before.width - after.width) > 0.5) failures.push(`device toolbar width changed: ${before.width}px -> ${after.width}px`);
      if (after.y >= before.y - 10) failures.push(`device toolbar did not slide upward: ${before.y}px -> ${after.y}px`);
    }

    const frame = page.frameLocator("iframe");
    const fitBoard = frame.locator(".cafe-a-desktop-fit-board");
    await fitBoard.waitFor({ state: "visible", timeout: navigationTimeout });
    await page.waitForFunction(() => {
      const iframe = document.querySelector("iframe");
      return iframe?.contentDocument?.querySelector(".cafe-a-desktop-fit-board")?.getAttribute("data-fit-presentation-state") === "ready";
    }, undefined, { timeout: navigationTimeout }).catch(() => null);
    const visibleFontSize = async (selector) => frame.locator(selector).evaluateAll((elements) => {
      const element = elements.find((candidate) => {
        const rect = candidate.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });
      return element ? Number.parseFloat(getComputedStyle(element).fontSize) : null;
    });
    const categorySize = await visibleFontSize(".cafe-a-category-title");
    const itemSize = await visibleFontSize(".cafe-a-menu-title");
    const descriptionSize = await visibleFontSize(".cafe-a-fit-menu-grid .cafe-a-menu-description");
    const topLeftSize = await visibleFontSize(".cafe-a-topline-description");
    const topRightSize = await visibleFontSize(".cafe-a-topline-notice-text");
    if (await fitBoard.getAttribute("data-fit-presentation-state") !== "ready") failures.push("Sunday Line fit presentation did not become ready");
    if (categorySize === null || itemSize === null || descriptionSize === null || topLeftSize === null || topRightSize === null) {
      failures.push("Sunday Line typography metrics are unavailable");
    } else {
      if (categorySize < itemSize * 1.3) failures.push(`Sunday Line category hierarchy is too weak: ${categorySize}px / ${itemSize}px`);
      if (itemSize < descriptionSize * 1.2) failures.push(`Sunday Line item hierarchy is too weak: ${itemSize}px / ${descriptionSize}px`);
      if (Math.abs(topLeftSize - descriptionSize) > 0.15 || Math.abs(topRightSize - descriptionSize) > 0.15) {
        failures.push(`Sunday Line top copy does not follow description size: ${topLeftSize}px / ${topRightSize}px / ${descriptionSize}px`);
      }
    }
    await fitBoard.evaluate((element) => {
      window.__artimenuFitPresentationStates = [];
      window.__artimenuFitPresentationObserver?.disconnect();
      window.__artimenuFitPresentationObserver = new MutationObserver(() => {
        window.__artimenuFitPresentationStates.push(element.getAttribute("data-fit-presentation-state"));
      });
      window.__artimenuFitPresentationObserver.observe(element, { attributes: true, attributeFilter: ["data-fit-presentation-state"] });
    });
    await page.setViewportSize({ width: 1280, height: 820 });
    await page.waitForTimeout(1_500);
    const resizePresentation = await fitBoard.evaluate((element) => {
      window.__artimenuFitPresentationObserver?.disconnect();
      return {
        current: element.getAttribute("data-fit-presentation-state"),
        states: window.__artimenuFitPresentationStates ?? [],
        overflow: element.getAttribute("data-fit-overflow"),
      };
    });
    if (resizePresentation.states.includes("loading")) {
      failures.push(`ready preview returned to loading during resize: ${resizePresentation.states.join(" -> ")}`);
    }
    if (resizePresentation.current !== "ready" || resizePresentation.overflow !== "false") {
      failures.push(`resized preview is not ready and safe: ${JSON.stringify(resizePresentation)}`);
    }
    if (!response || response.status() >= 400) failures.push(`http: ${response?.status() ?? "no response"}`);
    results.push({ templateKey: "preview-toolbar-and-sunday-line", locale: "en", route, failures });
    await context.close();
  }
} finally {
  await browser.close();
}

const failed = results.filter((result) => result.failures.length > 0);
console.log(JSON.stringify({ baseUrl, checked: results.length, failed: failed.length, failures: failed }, null, 2));
if (failed.length > 0) process.exitCode = 1;
