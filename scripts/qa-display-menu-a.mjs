import { chromium } from "@playwright/test";

const baseUrl = process.env.DISPLAY_QA_BASE_URL || "http://127.0.0.1:3005";
const screenshotDir = process.env.DISPLAY_QA_SCREENSHOT_DIR || "/tmp";
const qaCases = (process.env.DISPLAY_QA_CASES || "baseline,sparse_1,sparse_2,sparse,sparse_2cat,recommended,filled,capacity_warning,capacity_strong,category_heavy,dense,autoSplit,extreme_fit,unbalanced_left,unbalanced_right")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
const viewports = [
  { width: 1920, height: 1080 },
  { width: 1600, height: 900 },
  { width: 1366, height: 768 },
];
const pages = [
  { key: "full", page: "3" },
  { key: "split", page: "2" },
];

function buildPreviewPath(pageNumber, qaCase) {
  const params = new URLSearchParams({ page: pageNumber });
  if (qaCase !== "baseline") params.set("qaCase", qaCase);
  return `/templates/display_menu_a/preview?${params.toString()}`;
}

async function measureDisplayPage(page, pageKey) {
  return page.evaluate((key) => {
    const toRect = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return {
        x: Math.round(rect.x),
        y: Math.round(rect.y),
        width: Math.round(rect.width),
        height: Math.round(rect.height),
        top: Math.round(rect.top),
        right: Math.round(rect.right),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
      };
    };

    const board = document.querySelector("[data-display-board]") || document.querySelector("main > section");
    const menuArea = document.querySelector("[data-display-menu-area]");
    const split = document.querySelector("[data-display-split-ratio]");
    const pageIndicator = document.querySelector(".group > .absolute.bottom-4");
    const columns = [...document.querySelectorAll("[data-display-menu-column]")].map((column, index) => {
      const content = column.querySelector("[data-display-menu-column-content]");
      const inner = column.querySelector("[data-display-menu-column-content-inner]");
      const firstCategory = content?.querySelector("[data-display-category-block]") || null;
      const items = [...column.querySelectorAll("[data-display-menu-item]")];
      const lastItem = items.at(-1) || null;
      const columnRect = toRect(column);
      const contentRect = toRect(content);
      const firstCategoryRect = toRect(firstCategory);
      const lastItemRect = toRect(lastItem);
      const columnStyle = getComputedStyle(column);
      const contentStyle = content ? getComputedStyle(content) : null;
      const topGap = contentRect && firstCategoryRect ? Math.round(firstCategoryRect.top - contentRect.top) : null;
      const bottomGap = contentRect && lastItemRect ? Math.round(contentRect.bottom - lastItemRect.bottom) : null;
      const gapDelta = topGap !== null && bottomGap !== null ? Math.abs(bottomGap - topGap) : null;
      const bottomGapPct = bottomGap !== null && contentRect?.height ? Number(((bottomGap / contentRect.height) * 100).toFixed(2)) : null;
      const itemRects = items.map((item) => item.getBoundingClientRect());
      const hasItemOverlap = itemRects.some((rect, itemIndex) => itemIndex > 0 && rect.top < itemRects[itemIndex - 1].bottom - 1);
      const priceBoxes = [...column.querySelectorAll(".cafe-a-price-options-grid, .cafe-a-price-stack")].map((priceBox) => priceBox.getBoundingClientRect());
      const priceColumnOverflow = Boolean(contentRect && priceBoxes.some((rect) => rect.right > contentRect.right + 1 || rect.left < contentRect.left - 1));

      return {
        index,
        itemCount: items.length,
        columnBox: columnRect,
        contentBox: contentRect,
        firstCategoryBox: firstCategoryRect,
        lastMenuItemBox: lastItemRect,
        topGap,
        bottomGap,
        gapDelta,
        bottomGapPct,
        hasItemOverlap,
        priceColumnOverflow,
        paddingTop: columnStyle.paddingTop,
        paddingBottom: columnStyle.paddingBottom,
        paddingLeft: columnStyle.paddingLeft,
        paddingRight: columnStyle.paddingRight,
        overflowY: columnStyle.overflowY,
        containerType: columnStyle.containerType,
        displayRow: contentStyle?.getPropertyValue("--display-row").trim() || null,
        fitInitialClientHeight: content?.getAttribute("data-display-fit-initial-client-height") || null,
        fitInitialScrollHeight: content?.getAttribute("data-display-fit-initial-scroll-height") || null,
        fitInitialBottomGap: content?.getAttribute("data-display-fit-initial-bottom-gap") || null,
        fitInitialOverflow: content?.getAttribute("data-display-fit-initial-overflow") || null,
        fitClientHeight: content?.getAttribute("data-display-fit-client-height") || null,
        fitScrollHeight: content?.getAttribute("data-display-fit-scroll-height") || null,
        fitBottomGap: content?.getAttribute("data-display-fit-bottom-gap") || null,
        fitOverflow: content?.getAttribute("data-display-fit-overflow") || null,
        contentScrollHeight: inner ? Math.round(Math.max(inner.scrollHeight, inner.getBoundingClientRect().height)) : content?.scrollHeight ?? null,
        contentClientHeight: content?.clientHeight ?? null,
        contentHasOverflow: content && inner ? Math.max(inner.scrollHeight, inner.getBoundingClientRect().height) > content.clientHeight + 1 : content ? content.scrollHeight > content.clientHeight : null,
      };
    });
    const indicatorStyle = pageIndicator ? getComputedStyle(pageIndicator) : null;
    const pageIndicatorBox = toRect(pageIndicator);
    const pageIndicatorNormalFlow = Boolean(
      pageIndicator &&
      indicatorStyle &&
      !["absolute", "fixed"].includes(indicatorStyle.position)
    );

    return {
      pageKey: key,
      url: location.href,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight,
      },
      document: {
        documentElementScrollHeight: document.documentElement.scrollHeight,
        bodyScrollHeight: document.body.scrollHeight,
        hasVerticalScroll:
          document.documentElement.scrollHeight > window.innerHeight ||
          document.body.scrollHeight > window.innerHeight,
      },
      boardBox: toRect(board),
      menuAreaBox: toRect(menuArea),
      splitRatio: split?.getAttribute("data-display-split-ratio") || null,
      fit: {
        scale: menuArea?.querySelector("[data-display-menu-content]")?.getAttribute("data-display-fit-scale") || null,
        phase: menuArea?.querySelector("[data-display-menu-content]")?.getAttribute("data-display-fit-phase") || null,
        iteration: menuArea?.querySelector("[data-display-menu-content]")?.getAttribute("data-display-fit-iteration") || null,
        status: menuArea?.querySelector("[data-display-menu-content]")?.getAttribute("data-display-fit-status") || null,
        density: menuArea?.querySelector("[data-display-menu-content]")?.getAttribute("data-display-density") || null,
        secondaryHidden: menuArea?.querySelector("[data-display-menu-content]")?.getAttribute("data-display-secondary-hidden") || null,
        badgeHidden: menuArea?.querySelector("[data-display-menu-content]")?.getAttribute("data-display-badge-hidden") || null,
      },
      pageIndicator: {
        box: pageIndicatorBox,
        position: indicatorStyle?.position || null,
        normalFlow: pageIndicatorNormalFlow,
      },
      columns,
      longestColumnByItems: columns.reduce((best, column) => (column.itemCount > best.itemCount ? column : best), { itemCount: -1 }),
      largestGapDeltaColumn: columns.reduce((best, column) => {
        if (column.gapDelta === null) return best;
        if (!best || column.gapDelta > best.gapDelta) return column;
        return best;
      }, null),
    };
  }, pageKey);
}

const browser = await chromium.launch({ headless: true });
const results = [];

try {
  for (const viewport of viewports) {
    const page = await browser.newPage({
      viewport,
      deviceScaleFactor: 1,
    });

    for (const qaCase of qaCases) {
      for (const target of pages) {
        const path = buildPreviewPath(target.page, qaCase);
        const url = new URL(path, baseUrl).toString();
        await page.goto(url, { waitUntil: "networkidle" });
        await page.waitForTimeout(900);
        const screenshotPath = `${screenshotDir}/display-menu-a-${qaCase}-${target.key}-${viewport.width}x${viewport.height}.png`;
        await page.screenshot({ path: screenshotPath, fullPage: false });
        const measurement = await measureDisplayPage(page, target.key);

        results.push({
          qaCase,
          ...measurement,
          screenshotPath,
        });
      }
    }

    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify(results, null, 2));
