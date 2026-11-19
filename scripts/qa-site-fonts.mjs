import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const base = process.env.SITE_FONT_QA_BASE_URL || "http://127.0.0.1:3038";
const samples = {
  letters: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
  korean: "가게소개메뉴가격",
  digits: "0123456789",
  symbols: "()[]{}<>!@#$%^&*_-+=:;,.?/~₩",
};
const results = [];
const browser = await chromium.launch({ headless: true });

async function renderedFonts(page, client, parent, stack) {
  await page.evaluate(({ parent, samples, stack }) => {
    document.querySelector("[data-font-qa]")?.remove();
    const probe = document.createElement("div");
    probe.dataset.fontQa = "";
    if (stack) probe.style.fontFamily = stack;
    for (const [key, text] of Object.entries(samples)) {
      const span = document.createElement("span");
      span.dataset.fontQaSample = key;
      span.textContent = text;
      probe.append(span);
    }
    document.querySelector(parent).append(probe);
  }, { parent, samples, stack });
  await page.evaluate(() => document.fonts.ready);
  const { root } = await client.send("DOM.getDocument");
  const fonts = {};
  for (const key of Object.keys(samples)) {
    const { nodeId } = await client.send("DOM.querySelector", {
      nodeId: root.nodeId,
      selector: `[data-font-qa-sample="${key}"]`,
    });
    const result = await client.send("CSS.getPlatformFontsForNode", { nodeId });
    fonts[key] = [...new Set(result.fonts.filter(font => font.glyphCount > 0).map(font => font.familyName))];
  }
  await page.locator("[data-font-qa]").evaluate(node => node.remove());
  return fonts;
}

try {
  for (const width of [390, 820, 1440, 2600]) {
    const page = await browser.newPage({ viewport: { width, height: 1100 }, reducedMotion: "reduce" });
    const client = await page.context().newCDPSession(page);
    await client.send("DOM.enable");
    await client.send("CSS.enable");
    for (const route of ["/", "/sign-in", "/templates", "/templates/cafe_design_a", "/faq"]) {
      const response = await page.goto(`${base}${route}`, { waitUntil: "networkidle" });
      assert.ok(response?.ok(), `${route}: HTTP ${response?.status()}`);
      const fonts = await renderedFonts(page, client, "main");
      assert.deepEqual(fonts.letters, ["Tenor Sans"], `${route} ${width}px letters`);
      for (const key of ["korean", "digits", "symbols"]) {
        assert.deepEqual(fonts[key], ["Pretendard"], `${route} ${width}px ${key}`);
      }
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      assert.ok(overflow <= 1, `${route} ${width}px overflow: ${overflow}`);
      results.push({ route, width, fonts });
    }

    // Exercise the original menu face, including its numerals/punctuation.
    // Restricting the global Tenor Sans face would silently change saved menus.
    const device = width < 768 ? "mobile" : width < 1024 ? "tablet" : "pc";
    await page.goto(`${base}/templates/dining_aube_table_a/preview?view=actual&device=${device}`, { waitUntil: "networkidle" });
    await page.locator(".menu-typography").first().waitFor();
    const menuFonts = await renderedFonts(page, client, ".menu-typography", "var(--menu-font-en)");
    for (const key of ["letters", "digits", "symbols"]) {
      assert.ok(menuFonts[key].includes("Tenor Sans"), `menu ${width}px ${key}: ${menuFonts[key]}`);
    }
    const menuFamily = await page.locator(".menu-typography").first().evaluate(node => getComputedStyle(node).fontFamily);
    assert.ok(!menuFamily.includes("ArtiMenu Site Latin"), `site alias leaked into menu: ${menuFamily}`);
    results.push({ route: "dining menu preview", width, fonts: menuFonts });
    await page.close();
  }
} finally {
  await browser.close();
}

console.log(JSON.stringify({ passed: results.length, results }, null, 2));
