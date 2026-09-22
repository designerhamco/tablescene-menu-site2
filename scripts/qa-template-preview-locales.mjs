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
const previewRouteKey = (templateKey) => ({
  cafe_design_a: "cafe_real_matcha_a",
  cafe_sunday_line_a: "cafe_sunday_roasters_a",
}[templateKey] ?? templateKey);
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

      const route = `/templates/${previewRouteKey(templateKey)}/preview?lang=${locale}&device=pc&view=actual&embedded=1`;
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
          fitStatus: board?.getAttribute("data-fit-status") ?? null,
          layoutMode: board?.getAttribute("data-layout-mode") ?? null,
          fitOverflow: board?.getAttribute("data-fit-overflow") ?? null,
          fitColumns: board?.getAttribute("data-fit-columns") ?? null,
          fitFontScale: board?.getAttribute("data-fit-font-scale") ?? null,
          fitGapScale: board?.getAttribute("data-fit-gap-scale") ?? null,
          fitSafetyScale: board?.getAttribute("data-fit-presentation-safety-scale") ?? null,
          fitFinalFontBoost: board?.getAttribute("data-fit-final-font-boost") ?? null,
          fitFinalGapBoost: board?.getAttribute("data-fit-final-gap-boost") ?? null,
          fitFingerprint: board?.getAttribute("data-fit-ordered-balanced-fingerprint") ?? null,
          typography: {
            category: visibleFontSize(".cafe-a-desktop-fit-board .cafe-a-category-title"),
            item: visibleFontSize(".cafe-a-desktop-fit-board .cafe-a-menu-title"),
            featuredItem: visibleFontSize(".cafe-a-desktop-fit-board .cafe-a-featured-title"),
            featuredDescription: visibleFontSize(".cafe-a-desktop-fit-board [data-cafe-a-featured-description]"),
            description: visibleFontSize(".cafe-a-desktop-fit-board .cafe-a-fit-menu-grid .cafe-a-menu-description"),
            linkedSupporting: visibleFontSizes(".cafe-a-desktop-fit-board [data-cafe-a-store-description], .cafe-a-desktop-fit-board .cafe-a-topline-description, .cafe-a-desktop-fit-board .cafe-a-topline-notice-text, .cafe-a-desktop-fit-board [data-cafe-a-footer-info] .cafe-a-description-text, .cafe-a-desktop-fit-board .cafe-a-round-focus-notice"),
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
        const { category, item, featuredItem, featuredDescription, description, linkedSupporting } = measurement.typography;
        const usesNameAndPriceOnly = templateKey === "cafe_round_focus_a"
          || templateKey === "cafe_mocha_forest_a";
        if (category === null || item === null) {
          failures.push(`single-page typography metrics are unavailable: ${JSON.stringify(measurement.typography)}`);
        } else {
          if (category < item * 1.35) failures.push(`category hierarchy is too weak: ${category}px / ${item}px`);
          if (!usesNameAndPriceOnly && featuredItem === null) {
            failures.push(`featured item typography is unavailable: ${JSON.stringify(measurement.typography)}`);
          } else if (featuredItem !== null && Math.abs(featuredItem - item) > 0.18) {
            failures.push(`featured item title is not linked to the menu item title: ${featuredItem}px / ${item}px`);
          }
          if (description === null) {
            if (!usesNameAndPriceOnly) {
              failures.push(`menu description typography is unavailable: ${JSON.stringify(measurement.typography)}`);
            }
            const supportingBaseline = linkedSupporting[0] ?? null;
            const mismatchedSupporting = supportingBaseline === null
              ? []
              : linkedSupporting.filter((size) => Math.abs(size - supportingBaseline) > 0.15);
            if (mismatchedSupporting.length > 0) {
              failures.push(`supporting copy does not share one linked size: ${linkedSupporting.join(", ")}px`);
            }
          } else {
            if (!usesNameAndPriceOnly && featuredDescription === null) {
              failures.push(`featured description typography is unavailable: ${JSON.stringify(measurement.typography)}`);
            } else if (featuredDescription !== null && Math.abs(featuredDescription - description) > 0.18) {
              failures.push(`featured description is not linked to the menu description: ${featuredDescription}px / ${description}px`);
            }
            const mismatchedSupporting = linkedSupporting.filter((size) => Math.abs(size - description) > 0.15);
            if (mismatchedSupporting.length > 0) {
              failures.push(`supporting copy is not linked to menu descriptions: ${description}px / ${linkedSupporting.join(", ")}px`);
            }
          }
        }
      }

      results.push({ templateKey, locale, route, failures });
      await context.close();
    }
  }

  if (!templateFilter && !localeFilter) {
    const deviceCases = [
      { id: "pc", device: "pc", viewport: { width: 1440, height: 900 }, query: "device=pc" },
      { id: "tablet-landscape", device: "tablet", viewport: { width: 1180, height: 820 }, query: "device=tablet&orientation=landscape" },
      { id: "tablet-portrait", device: "tablet", viewport: { width: 820, height: 1180 }, query: "device=tablet&orientation=portrait" },
      { id: "mobile", device: "mobile", viewport: { width: 390, height: 844 }, query: "device=mobile" },
    ];

    for (const templateKey of singlePageTemplates) {
      for (const deviceCase of deviceCases) {
        const context = await browser.newContext({
          viewport: deviceCase.viewport,
          deviceScaleFactor: 1,
          reducedMotion: "reduce",
          serviceWorkers: "block",
        });
        const page = await context.newPage();
        const failures = [];
        page.on("pageerror", (error) => failures.push(`pageerror: ${error.message}`));
        page.on("console", (message) => {
          if (message.type() === "error") failures.push(`console: ${message.text()}`);
        });

        const route = `/templates/${previewRouteKey(templateKey)}/preview?lang=ko&${deviceCase.query}&view=actual&embedded=1`;
        const response = await page.goto(new URL(route, baseUrl).toString(), {
          waitUntil: "domcontentloaded",
          timeout: navigationTimeout,
        });
        await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => null);

        if (deviceCase.device !== "mobile") {
          await page.waitForFunction(() => (
            document.querySelector(".cafe-a-desktop-fit-board")?.getAttribute("data-fit-presentation-state") === "ready"
          ), undefined, { timeout: navigationTimeout }).catch(() => null);
        }

        const typography = await page.evaluate(() => {
          const visibleElements = (selector) => Array.from(document.querySelectorAll(selector)).filter((candidate) => {
            const style = getComputedStyle(candidate);
            const rect = candidate.getBoundingClientRect();
            return rect.width > 0
              && rect.height > 0
              && style.display !== "none"
              && style.visibility !== "hidden"
              && Number.parseFloat(style.opacity || "1") > 0
              && !candidate.closest("[aria-hidden='true']");
          });
          const signature = (element) => {
            if (!element) return null;
            const style = getComputedStyle(element);
            return {
              fontSize: Number.parseFloat(style.fontSize),
              fontFamily: style.fontFamily,
              fontWeight: style.fontWeight,
              fontStyle: style.fontStyle,
              letterSpacing: style.letterSpacing,
              lineHeight: style.lineHeight,
              textTransform: style.textTransform,
            };
          };
          const firstSignature = (selector) => signature(visibleElements(selector)[0]);
          const labeledSignatures = (entries) => entries.flatMap(([label, selector]) => (
            visibleElements(selector).map((element, index) => ({ label: `${label}[${index}]`, signature: signature(element) }))
          ));

          return {
            storeName: firstSignature(".cafe-a-store-title"),
            categoryName: firstSignature(".cafe-a-category-title"),
            itemName: firstSignature("[data-cafe-a-menu-name]"),
            secondaryName: firstSignature(".cafe-a-menu-meta"),
            optionName: firstSignature(".cafe-a-price-column-heading-label, .cafe-a-price-label"),
            featuredName: firstSignature("[data-cafe-a-featured-title]"),
            itemBadge: firstSignature("[data-cafe-a-menu-badge]"),
            featuredBadge: firstSignature("[data-cafe-a-featured-badge]"),
            itemPrice: firstSignature("[data-cafe-a-menu-price] .cafe-a-menu-price:not([data-cafe-a-price-column-sizer])"),
            featuredPrice: firstSignature("[data-cafe-a-featured-price]"),
            itemDescription: firstSignature("[data-cafe-a-menu-description]"),
            featuredDescription: firstSignature("[data-cafe-a-featured-description]"),
            supporting: labeledSignatures([
              ["store description", "[data-cafe-a-store-description]"],
              ["category description", "[data-cafe-a-category-description]"],
              ["top description", ".cafe-a-topline-description"],
              ["top notice", ".cafe-a-topline-notice-text"],
              ["footer notice", "[data-cafe-a-footer-info] .cafe-a-description-text"],
              ["round focus notice", ".cafe-a-round-focus-notice"],
            ]),
          };
        });

        const rhythm = await page.evaluate(() => {
          const isVisible = (element) => {
            const style = getComputedStyle(element);
            const rect = element.getBoundingClientRect();
            return rect.width > 0
              && rect.height > 0
              && style.display !== "none"
              && style.visibility !== "hidden"
              && Number.parseFloat(style.opacity || "1") > 0
              && !element.closest("[aria-hidden='true']");
          };
          const median = (values) => {
            const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
            if (sorted.length === 0) return null;
            const middle = Math.floor(sorted.length / 2);
            return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
          };
          const categories = Array.from(document.querySelectorAll(".cafe-a-menu-category-block")).filter(isVisible);
          const itemGaps = [];
          const titleGaps = [];

          for (const category of categories) {
            const heading = category.querySelector(":scope > .cafe-a-category-heading");
            const items = Array.from(category.querySelectorAll(":scope > .cafe-a-category-items > .cafe-a-menu-item-stack")).filter(isVisible);
            const itemRects = items.map((item) => (
              item.querySelector(":scope > .cafe-a-menu-item") ?? item
            ).getBoundingClientRect());
            for (let index = 1; index < itemRects.length; index += 1) {
              const gap = itemRects[index].top - itemRects[index - 1].bottom;
              if (gap >= 0) itemGaps.push(gap);
            }
            if (heading && isVisible(heading) && itemRects[0]) {
              titleGaps.push(itemRects[0].top - heading.getBoundingClientRect().bottom);
            }
          }

          const categoryGaps = [];
          const widgetTransitions = [];
          const widgetFooterTransitions = [];
          const topLevelBlocks = Array.from(document.querySelectorAll(".cafe-a-menu-category-block, .cafe-a-menu-widget-block")).filter(isVisible);
          const parents = [...new Set(topLevelBlocks.map((block) => block.parentElement).filter(Boolean))];
          for (const parent of parents) {
            const blocks = Array.from(parent.children).filter((child) => (
              child.matches(".cafe-a-menu-category-block, .cafe-a-menu-widget-block") && isVisible(child)
            ));
            for (let index = 1; index < blocks.length; index += 1) {
              const previous = blocks[index - 1];
              const current = blocks[index];
              const previousRect = previous.getBoundingClientRect();
              const currentRect = current.getBoundingClientRect();
              if (Math.abs(previousRect.left - currentRect.left) > 2 || currentRect.top < previousRect.bottom) continue;
              const previousIsCategory = previous.matches(".cafe-a-menu-category-block");
              const currentIsCategory = current.matches(".cafe-a-menu-category-block");
              if (previousIsCategory && currentIsCategory) {
                categoryGaps.push(currentRect.top - previousRect.bottom);
              }
              if (!previousIsCategory || !currentIsCategory) {
                const divider = current.querySelector(":scope > .cafe-a-menu-category-top-divider");
                widgetTransitions.push({
                  from: previousIsCategory ? "category" : "widget",
                  to: currentIsCategory ? "category" : "widget",
                  gap: currentRect.top - previousRect.bottom,
                  marginBottom: Number.parseFloat(getComputedStyle(previous).marginBottom),
                  hasVisibleDivider: Boolean(divider && isVisible(divider)),
                });
              }
            }
          }

          const footers = Array.from(document.querySelectorAll('[data-cafe-a-footer-info][data-cafe-a-footer-placement="desktop"]')).filter(isVisible);
          for (const footer of footers) {
            const previous = footer.previousElementSibling;
            if (!previous?.matches('.cafe-a-menu-widget-block[data-cafe-a-widget-placement="bottom"]') || !isVisible(previous)) continue;
            const previousRect = previous.getBoundingClientRect();
            const footerRect = footer.getBoundingClientRect();
            widgetFooterTransitions.push({
              gap: footerRect.top - previousRect.bottom,
              marginBottom: Number.parseFloat(getComputedStyle(previous).marginBottom),
              footerMarginTop: Number.parseFloat(getComputedStyle(footer).marginTop),
            });
          }

          const root = document.querySelector(".cafe-a-typography");
          const rootStyle = root ? getComputedStyle(root) : null;
          return {
            itemGap: median(itemGaps),
            titleGaps,
            categoryGaps,
            widgetTransitions,
            widgetFooterTransitions,
            titleRatioToken: rootStyle?.getPropertyValue("--cafe-a-category-title-to-first-ratio").trim() ?? null,
            categoryRatioToken: rootStyle?.getPropertyValue("--cafe-a-category-separation-ratio").trim() ?? null,
          };
        });

        const compareTypography = (label, expected, actual, sizeScale = 1) => {
          if (!expected || !actual) {
            failures.push(`${label} typography is unavailable: ${JSON.stringify({ expected, actual })}`);
            return;
          }
          if (Math.abs(expected.fontSize * sizeScale - actual.fontSize) > 0.18) {
            failures.push(`${label} font size is not linked at ${sizeScale}x: ${expected.fontSize}px / ${actual.fontSize}px`);
          }
          for (const property of ["fontFamily", "fontWeight", "fontStyle", "letterSpacing", "textTransform"]) {
            if (expected[property] !== actual[property]) {
              failures.push(`${label} ${property} is not linked: ${expected[property]} / ${actual[property]}`);
            }
          }
          const expectedLineHeightRatio = Number.parseFloat(expected.lineHeight) / expected.fontSize;
          const actualLineHeightRatio = Number.parseFloat(actual.lineHeight) / actual.fontSize;
          if (Math.abs(expectedLineHeightRatio - actualLineHeightRatio) > 0.02) {
            failures.push(`${label} line-height ratio is not linked: ${expectedLineHeightRatio} / ${actualLineHeightRatio}`);
          }
        };

        const usesNameAndPriceOnly = templateKey === "cafe_round_focus_a"
          || templateKey === "cafe_mocha_forest_a";
        const featuredScale = 1;
        if (!usesNameAndPriceOnly) {
          compareTypography("featured item name", typography.itemName, typography.featuredName, featuredScale);
          compareTypography("featured text chip", typography.itemBadge, typography.featuredBadge, featuredScale);
          compareTypography("featured price", typography.itemPrice, typography.featuredPrice, featuredScale);
          compareTypography("featured description", typography.itemDescription, typography.featuredDescription, featuredScale);
        }
        if (templateKey !== "cafe_mocha_forest_a" && (!typography.itemName || !typography.itemBadge)) {
          failures.push(`menu text chip ratio metrics are unavailable: ${JSON.stringify({ itemName: typography.itemName, itemBadge: typography.itemBadge })}`);
        } else if (templateKey !== "cafe_mocha_forest_a" && typography.itemBadge.fontSize < typography.itemName.fontSize * 0.61) {
          failures.push(`menu text chip is too small: ${typography.itemBadge.fontSize}px / ${typography.itemName.fontSize}px`);
        }
        if (!typography.secondaryName && !usesNameAndPriceOnly) {
          failures.push("secondary-language menu names are missing");
        } else if (typography.secondaryName && Number.parseInt(typography.secondaryName.fontWeight, 10) < 600) {
          failures.push(`secondary-language menu names are too light: ${typography.secondaryName.fontWeight}`);
        }
        if (deviceCase.device === "tablet") {
          const deviceTypeScale = await page.locator(".cafe-a-typography").evaluate((element) => (
            getComputedStyle(element).getPropertyValue("--cafe-a-device-type-scale").trim()
          ));
          if (deviceTypeScale !== "1.12") failures.push(`tablet typography scale is incorrect: ${deviceTypeScale || "missing"}`);
        }
        if (rhythm.itemGap === null || rhythm.titleGaps.length === 0) {
          failures.push(`spacing rhythm metrics are unavailable: ${JSON.stringify(rhythm)}`);
        } else {
          const expectedTitleRatio = templateKey === "cafe_round_focus_a" ? 1.15 : 1;
          const actualTitleRatioToken = Number.parseFloat(rhythm.titleRatioToken ?? "");
          if (Math.abs(actualTitleRatioToken - expectedTitleRatio) > 0.001) {
            failures.push(`category-title ratio token is incorrect: ${rhythm.titleRatioToken ?? "missing"} / ${expectedTitleRatio}`);
          }
          for (const titleGap of rhythm.titleGaps) {
            const ratio = titleGap / rhythm.itemGap;
            if (Math.abs(ratio - expectedTitleRatio) > 0.035) {
              failures.push(`category title-to-first-item rhythm is incorrect: ${titleGap}px / ${rhythm.itemGap}px = ${ratio}, expected ${expectedTitleRatio}`);
              break;
            }
          }
          if (templateKey === "cafe_mocha_forest_a" || templateKey === "cafe_round_focus_a") {
            const expectedCategoryRatio = templateKey === "cafe_round_focus_a" ? 2.8 : 2.2;
            const actualCategoryRatioToken = Number.parseFloat(rhythm.categoryRatioToken ?? "");
            if (Math.abs(actualCategoryRatioToken - expectedCategoryRatio) > 0.001) {
              failures.push(`no-divider category ratio token is incorrect: ${rhythm.categoryRatioToken ?? "missing"} / ${expectedCategoryRatio}`);
            }
            if (rhythm.categoryGaps.length === 0) {
              failures.push(`no-divider category gap metrics are unavailable: ${JSON.stringify(rhythm)}`);
            } else {
              for (const categoryGap of rhythm.categoryGaps) {
                const ratio = categoryGap / rhythm.itemGap;
                if (Math.abs(ratio - expectedCategoryRatio) > 0.055) {
                  failures.push(`no-divider category rhythm is incorrect: ${categoryGap}px / ${rhythm.itemGap}px = ${ratio}, expected ${expectedCategoryRatio}`);
                  break;
                }
              }
            }
            if (rhythm.widgetTransitions.length > 0) {
              for (const transition of rhythm.widgetTransitions) {
                const expectedWidgetRatio = transition.to === "category" && transition.hasVisibleDivider
                  ? expectedTitleRatio
                  : expectedCategoryRatio;
                const marginRatio = transition.marginBottom / rhythm.itemGap;
                const visualRatio = transition.gap / rhythm.itemGap;
                if (Math.abs(marginRatio - expectedWidgetRatio) > 0.055) {
                  failures.push(`widget boundary margin is incorrect: ${JSON.stringify(transition)} / ${marginRatio}, expected ${expectedWidgetRatio}`);
                  break;
                }
                if (visualRatio < expectedWidgetRatio - 0.055) {
                  failures.push(`widget boundary is visually too narrow: ${JSON.stringify(transition)} / ${visualRatio}, expected at least ${expectedWidgetRatio}`);
                  break;
                }
              }
            }
            if (deviceCase.viewport.width >= 1024 && templateKey === "cafe_mocha_forest_a") {
              if (rhythm.widgetFooterTransitions.length === 0) {
                failures.push(`bottom widget-to-footer metrics are unavailable: ${JSON.stringify(rhythm)}`);
              } else {
                for (const transition of rhythm.widgetFooterTransitions) {
                  const marginRatio = transition.marginBottom / rhythm.itemGap;
                  if (Math.abs(marginRatio - expectedCategoryRatio) > 0.055) {
                    failures.push(`bottom widget-to-footer margin is incorrect: ${JSON.stringify(transition)} / ${marginRatio}, expected ${expectedCategoryRatio}`);
                    break;
                  }
                  if (Math.abs(transition.gap - transition.marginBottom) > 0.5 || Math.abs(transition.footerMarginTop) > 0.5) {
                    failures.push(`bottom widget-to-footer visual gap is incorrect: ${JSON.stringify(transition)}`);
                    break;
                  }
                }
              }
            }
          }
        }
        const supportingBaseline = usesNameAndPriceOnly ? typography.supporting[0]?.signature ?? null : typography.itemDescription;
        for (const target of typography.supporting) {
          compareTypography(target.label, supportingBaseline, target.signature);
        }
        if (templateKey === "cafe_design_a") {
          if (!typography.storeName || !typography.categoryName || !typography.itemName || !typography.secondaryName || !typography.itemDescription || !typography.itemPrice || !typography.optionName) {
            failures.push(`Real Matcha hierarchy metrics are unavailable: ${JSON.stringify(typography)}`);
          } else {
            const sundayHierarchy = {
              pc: { categoryName: 1.5, secondaryName: 0.64, itemDescription: 0.71, itemPrice: 1, optionName: 0.56 },
              tablet: { categoryName: 1.4, secondaryName: 0.63, itemDescription: 0.72, itemPrice: 1.04, optionName: 0.53 },
              mobile: { categoryName: 1.34, secondaryName: 0.68, itemDescription: 0.81, itemPrice: 1.04, optionName: 0.62 },
            }[deviceCase.device];
            for (const [role, expectedRatio] of Object.entries(sundayHierarchy)) {
              const actualRatio = typography[role].fontSize / typography.itemName.fontSize;
              if (Math.abs(actualRatio - expectedRatio) > 0.025) {
                failures.push(`Real Matcha ${role} does not follow the Sunday hierarchy: ${actualRatio} / ${expectedRatio}`);
              }
            }
            const sundayStoreTitleSize = { pc: 48.6, "tablet-landscape": 46.62, mobile: 42.9 }[deviceCase.id];
            if (sundayStoreTitleSize !== undefined && Math.abs(typography.storeName.fontSize - sundayStoreTitleSize) > 0.25) {
              failures.push(`Real Matcha store title does not follow the Sunday size: ${typography.storeName.fontSize}px / ${sundayStoreTitleSize}px`);
            }
          }
        }
        if (templateKey === "cafe_round_focus_a" && (deviceCase.id === "pc" || deviceCase.id === "tablet-landscape")) {
          const columnWidths = await page.locator(".cafe-a-center-rail-menu-grid").evaluate((element) => (
            getComputedStyle(element).gridTemplateColumns
              .split(" ")
              .map((value) => Number.parseFloat(value))
              .filter(Number.isFinite)
          ));
          if (columnWidths.length !== 3 || Math.max(...columnWidths) - Math.min(...columnWidths) > 1) {
            failures.push(`Round Focus columns are not 1:1:1: ${columnWidths.join(" / ")}`);
          }
          const spacing = await page.locator(".cafe-a-desktop-fit-board").evaluate((element) => {
            const boardStyle = getComputedStyle(element);
            const menuGrid = element.querySelector(".cafe-a-center-rail-menu-grid");
            const column = menuGrid?.querySelector(".cafe-a-balanced-column");
            const gridStyle = menuGrid ? getComputedStyle(menuGrid) : null;
            const columnStyle = column ? getComputedStyle(column) : null;
            return {
              outerInline: Number.parseFloat(boardStyle.paddingLeft),
              columnGap: Number.parseFloat(gridStyle?.columnGap ?? "0"),
              columnBlock: Number.parseFloat(columnStyle?.paddingTop ?? "0"),
              columnInline: Number.parseFloat(columnStyle?.paddingLeft ?? "0"),
            };
          });
          if (spacing.outerInline < 35 || spacing.columnGap < 29 || spacing.columnBlock < 35 || spacing.columnInline < 7) {
            failures.push(`Round Focus spacing is too dense: ${JSON.stringify(spacing)}`);
          }
        }
        if (templateKey === "cafe_sunday_line_a" && (deviceCase.id === "pc" || deviceCase.id === "tablet-landscape")) {
          const spacing = await page.locator(".cafe-a-desktop-fit-board").evaluate((element) => {
            const style = getComputedStyle(element);
            return {
              rowGap: Number.parseFloat(style.rowGap),
              paddingTop: Number.parseFloat(style.paddingTop),
            };
          });
          const spacingIncrease = spacing.rowGap - spacing.paddingTop;
          if (spacingIncrease < 3 || spacingIncrease > 12) {
            failures.push(`Sunday Line row spacing is not a subtle increase: ${JSON.stringify(spacing)}`);
          }
          if (deviceCase.id === "tablet-landscape") {
            const storeTitleMetrics = await page.locator(".cafe-a-typography").evaluate((element) => {
              const title = Array.from(element.querySelectorAll(".cafe-a-store-title")).find((candidate) => {
                const rect = candidate.getBoundingClientRect();
                return rect.width > 0 && rect.height > 0;
              });
              return {
                scale: getComputedStyle(element).getPropertyValue("--cafe-a-store-title-device-scale").trim(),
                fontSize: title ? Number.parseFloat(getComputedStyle(title).fontSize) : null,
              };
            });
            if (storeTitleMetrics.scale !== "0.94" || storeTitleMetrics.fontSize === null || storeTitleMetrics.fontSize < 46 || storeTitleMetrics.fontSize >= 48) {
              failures.push(`Sunday Line tablet store title is not gently reduced: ${JSON.stringify(storeTitleMetrics)}`);
            }
          }
        }
        if (templateKey === "cafe_mocha_forest_a") {
          const categoryScale = await page.locator(".cafe-a-typography").evaluate((element) => (
            getComputedStyle(element).getPropertyValue("--cafe-a-template-category-title-scale").trim()
          ));
          if (categoryScale !== "1") failures.push(`Mocha Forest category scale is incorrect: ${categoryScale || "missing"}`);
        }
        if (!response || response.status() >= 400) failures.push(`http: ${response?.status() ?? "no response"}`);

        results.push({
          templateKey: `${templateKey}-${deviceCase.id}-role-contract`,
          locale: "ko",
          route,
          failures,
        });
        await context.close();
      }
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
    const route = "/templates/cafe_sunday_roasters_a/preview?lang=en";
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
      const profileIcon = previewGuide.locator("[data-preview-guide-profile-icon]").first();
      if (!(await profileIcon.isVisible())) {
        failures.push("browser guide profile icon is missing");
      } else {
        const profileStyle = await profileIcon.evaluate((element) => {
          const iconStyle = getComputedStyle(element);
          const profile = element.closest("[data-preview-guide-profile]");
          const profileStyle = profile instanceof HTMLElement ? getComputedStyle(profile) : null;
          return {
            iconColor: iconStyle.color,
            profileBackground: profileStyle?.backgroundColor ?? "",
            profileRadius: profileStyle ? Number.parseFloat(profileStyle.borderRadius) : 0,
          };
        });
        if (profileStyle.profileBackground === profileStyle.iconColor || profileStyle.profileRadius < 16) {
          failures.push(`browser guide profile icon style is invalid: ${JSON.stringify(profileStyle)}`);
        }
      }
      await previewGuide.getByRole("button", { name: "닫기" }).click();
      await previewGuide.waitFor({ state: "hidden", timeout: navigationTimeout });
    }
    const deviceTabLabels = await toolbar.getByRole("navigation", { name: "미리보기 기기 선택" }).getByRole("link").allTextContents();
    if (deviceTabLabels.map((label) => label.trim()).join(",") !== "태블릿,PC,모바일") {
      failures.push(`device tab order is incorrect: ${deviceTabLabels.join(", ")}`);
    }
    if (await toolbar.getByRole("link", { name: "태블릿", exact: true }).getAttribute("aria-current") !== "page") {
      failures.push("tablet is not selected by default");
    }
    const embeddedPreviewUrl = await page.locator("iframe").getAttribute("src");
    if (!embeddedPreviewUrl?.includes("device=tablet") || !embeddedPreviewUrl.includes("orientation=landscape")) {
      failures.push(`default embedded preview is not tablet landscape: ${embeddedPreviewUrl ?? "missing"}`);
    }
    const deviceNavBounds = await toolbar.getByRole("navigation", { name: "미리보기 기기 선택" }).boundingBox();
    const portraitToggle = toolbar.getByRole("link", { name: "태블릿을 세로로 회전" });
    const orientationToggleBounds = await portraitToggle.boundingBox();
    if (!deviceNavBounds || !orientationToggleBounds) {
      failures.push("tablet toolbar row bounds are unavailable");
    } else {
      const deviceNavCenter = deviceNavBounds.y + deviceNavBounds.height / 2;
      const orientationToggleCenter = orientationToggleBounds.y + orientationToggleBounds.height / 2;
      if (Math.abs(deviceNavCenter - orientationToggleCenter) > 2) {
        failures.push(`tablet orientation toggle is not inline: ${deviceNavCenter}px / ${orientationToggleCenter}px`);
      }
    }
    if (!(await portraitToggle.getAttribute("href"))?.includes("orientation=portrait")) {
      failures.push("tablet rotation toggle does not target portrait");
    }
    await portraitToggle.click();
    await page.waitForURL(/orientation=portrait/, { timeout: navigationTimeout });
    const landscapeToggle = page.locator("[data-preview-device-toolbar]").getByRole("link", { name: "태블릿을 가로로 회전" });
    await landscapeToggle.waitFor({ state: "visible", timeout: navigationTimeout });
    const portraitFrameUrl = await page.locator("iframe").getAttribute("src");
    if (!portraitFrameUrl?.includes("orientation=portrait")) {
      failures.push(`rotation toggle did not update the embedded preview: ${portraitFrameUrl ?? "missing"}`);
    }
    await landscapeToggle.click();
    await page.waitForURL(/orientation=landscape/, { timeout: navigationTimeout });
    const toolbarBackground = await toolbar.evaluate((element) => getComputedStyle(element).backgroundColor);
    const toolbarAlpha = Number.parseFloat(
      toolbarBackground.match(/\/\s*([\d.]+)\s*\)$/)?.[1]
        ?? toolbarBackground.match(/rgba\([^,]+,[^,]+,[^,]+,\s*([\d.]+)\)/)?.[1]
        ?? "1",
    );
    if (toolbarAlpha > 0.55) failures.push(`device toolbar background is too opaque: ${toolbarBackground}`);
    const before = await toolbar.boundingBox();
    if (before && before.height > 64) failures.push(`tablet toolbar is too tall: ${before.height}px`);
    if (await toolbar.getAttribute("data-toolbar-open") !== "true") failures.push("device toolbar is not open by default");
    const frameShell = page.locator("[data-preview-frame-shell]");
    const zoomedFrame = page.locator("[data-preview-zoomed-frame]");
    const zoomControls = toolbar.locator("[data-preview-zoom-controls]");
    const shellBeforeZoom = await frameShell.boundingBox();
    const frameBeforeZoom = await zoomedFrame.evaluate((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
      transform: getComputedStyle(element).transform,
    }));
    await zoomControls.getByRole("button", { name: "메뉴판 확대" }).click();
    await page.waitForFunction(() => (
      document.querySelector("[data-preview-frame-shell]")?.getAttribute("data-preview-zoom-percent") === "110"
    ), undefined, { timeout: navigationTimeout });
    await page.waitForFunction(() => {
      const iframe = document.querySelector("[data-preview-zoomed-frame]");
      const board = iframe?.contentDocument?.querySelector(".cafe-a-desktop-fit-board");
      return iframe instanceof HTMLIFrameElement
        && iframe.clientWidth < 1180
        && board?.getAttribute("data-fit-presentation-state") === "ready"
        && board?.getAttribute("data-fit-overflow") === "false";
    }, undefined, { timeout: navigationTimeout }).catch(() => {
      failures.push("zoomed preview did not reflow to a ready, non-overflowing layout");
    });
    const shellAfterZoom = await frameShell.boundingBox();
    const frameAfterZoom = await zoomedFrame.evaluate((element) => ({
      width: element.clientWidth,
      height: element.clientHeight,
      transform: getComputedStyle(element).transform,
    }));
    if (!shellBeforeZoom || !shellAfterZoom) {
      failures.push("preview frame shell bounds are unavailable during zoom");
    } else if (Math.abs(shellBeforeZoom.width - shellAfterZoom.width) > 0.5 || Math.abs(shellBeforeZoom.height - shellAfterZoom.height) > 0.5) {
      failures.push(`preview frame shell changed size during zoom: ${JSON.stringify({ shellBeforeZoom, shellAfterZoom })}`);
    }
    if (frameAfterZoom.width >= frameBeforeZoom.width || frameAfterZoom.height >= frameBeforeZoom.height || frameAfterZoom.transform === frameBeforeZoom.transform) {
      failures.push(`preview zoom did not change the inner layout viewport: ${JSON.stringify({ frameBeforeZoom, frameAfterZoom })}`);
    }
    await zoomControls.getByRole("button", { name: /메뉴판 배율 110%, 100%로 초기화/ }).click();
    if (await frameShell.getAttribute("data-preview-zoom-percent") !== "100") failures.push("preview zoom did not reset to 100%");
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
    if (!(await toolbar.getByRole("button", { name: "기기 선택 도구 열기" }).isVisible())) failures.push("collapsed device toolbar arrow is missing");
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
      if (categorySize < itemSize * 1.2) failures.push(`Sunday Line category hierarchy is too weak: ${categorySize}px / ${itemSize}px`);
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
