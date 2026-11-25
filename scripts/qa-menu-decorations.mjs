import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium, expect } from "@playwright/test";

const base = process.env.DECORATIONS_QA_BASE || "http://127.0.0.1:3192";
const baseline = process.env.DECORATIONS_QA_BASELINE;
const output = process.env.DECORATIONS_QA_OUTPUT || "/private/tmp/artimenu-decorations-qa";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const results = [], failures = [], errors = [], writes = [];
const keys = ["cafe_design_a", "cafe_mocha_forest_a", "cafe_sunday_line_a", "cafe_van_gogh_a", "cafe_round_focus_a", "fast_food_loop_bagel_a", "restaurant_onue_a"];
const neutral = ["basic-first-column", "basic-top-row", "basic-center-column", "basic-upper-left", "basic-top-row-left-logo", "basic-first-column-album", "basic-top-row-album"];
const cases = [...keys.map(key => ({ key })), ...neutral.map(design => ({ key: "cafe_design_a", design }))];
const devices = process.env.DECORATIONS_QA_LANDSCAPE === "1" ? [["tablet", 1180, 820]] : [["pc", 1440, 900], ["tablet", 820, 1180], ["mobile", 390, 844]];
const lineKeys = ["categoryUnderline", "columnDivider", "categoryDivider", "itemDivider", "priceLeader"];
const colors = ["#19713D", "#772288", "#1857A6", "#995522", "#A91F42"];
const rgb = hex => `rgb(${hex.match(/\w\w/g).map(n => parseInt(n, 16)).join(", ")})`;
const url = (host, c, device, draft) => `${host}/templates/${c.key === "cafe_design_a" ? "cafe_real_matcha_a" : c.key}/preview?${new URLSearchParams({ view: "actual", device, imagesPreview: "on", secondaryNamesPreview: "on", descriptionsPreview: "on", categoryDescriptionsPreview: "on", widgetsPreview: "on", ...(process.env.DECORATIONS_QA_LAYOUT ? { layoutMode: process.env.DECORATIONS_QA_LAYOUT } : {}), ...(c.design ? { design: c.design } : {}), ...(draft ? { designPreview: JSON.stringify(draft) } : {}) })}`;
async function page(width, height) {
  const p = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
  p.setDefaultTimeout(15000);
  p.setDefaultNavigationTimeout(60000);
  p.on("pageerror", e => errors.push(e.message));
  await p.route("**/api/**", route => {
    if (["GET", "HEAD"].includes(route.request().method())) return route.continue();
    writes.push(route.request().url()); return route.abort();
  });
  await p.addInitScript(() => sessionStorage.setItem("artimenu:menu-preview-guide-v4-closed", "1"));
  return p;
}
async function settle(p) {
  await p.locator(".cafe-a-typography").first().waitFor();
  await p.evaluate(() => document.fonts.ready);
  if (await p.locator("[data-native-ready], [data-paged-ready]").count()) await p.locator('[data-native-ready="true"], [data-paged-ready="true"]').first().waitFor();
  await p.waitForTimeout(350);
}
async function settlePreview(p) {
  const menu = p.frameLocator("iframe");
  await menu.locator(".cafe-a-typography").first().waitFor();
  await p.locator("iframe").evaluate(async e => { await e.contentDocument.fonts.ready; });
  if (await menu.locator("[data-native-ready], [data-paged-ready]").count()) await menu.locator('[data-native-ready="true"], [data-paged-ready="true"]').first().waitFor();
  await p.waitForTimeout(200);
}
async function run(name, fn) {
  try { await fn(); results.push(name); console.log("PASS", name); }
  catch (e) { failures.push({ name, error: e.message }); console.log("FAIL", name, e.message); }
}
async function nativeSnapshot(p) {
  return p.evaluate(() => {
    const selectors = [".cafe-a-category-heading", ".cafe-a-menu-item", "[data-paged-brand]", "[data-native-brand]", "[data-upper-left-intro]", ".cafe-a-cover-frame", "[data-native-column]", "[data-paged-column]", ".cafe-a-store-title", "[data-menu-mobile-representative]"];
    return selectors.map(selector => [selector, [...document.querySelectorAll(selector)].filter(e => {
      const s = getComputedStyle(e); return s.visibility !== "hidden" && s.display !== "none" && e.getBoundingClientRect().width > 0;
    }).map(e => { const r = e.getBoundingClientRect(), s = getComputedStyle(e); return { rect: [r.x, r.y, r.width, r.height].map(n => Math.round(n * 10) / 10), font: [s.fontSize, s.fontFamily, s.fontWeight], ink: s.color, border: s.borderBottom }; })]);
  });
}
async function render(c, [device, width, height], index) {
  const p = await page(width, height);
  try {
    await p.goto(url(base, c, device), { waitUntil: "networkidle" }); await settle(p);
    assert.deepEqual(await p.evaluate(() => [innerWidth, innerHeight]), [width, height]);
    const native = await nativeSnapshot(p);
    if (baseline) {
      const old = await page(width, height);
      try { await old.goto(url(baseline, c, device), { waitUntil: "networkidle" }); await settle(old); assert.deepEqual(native, await nativeSnapshot(old), "untouched native geometry, fonts, ink and heading rules match the previous revision"); }
      finally { await old.close(); }
    }
    const strokeWidth = index % 3 + 1, style = ["solid", "dashed", "dotted"][index % 3];
    const decorations = Object.fromEntries(lineKeys.map((key, i) => [key, { visible: true, width: strokeWidth, style, color: colors[i] }]));
    decorations.patternBands = true;
    await p.goto(url(base, c, device, { decorations }), { waitUntil: "networkidle" }); await settle(p);
    const heading = p.locator(".cafe-a-category-heading").filter({ visible: true }).first();
    await expect(heading).toHaveCSS("border-bottom-width", `${strokeWidth}px`);
    await expect(heading).toHaveCSS("border-bottom-style", style);
    await expect(heading).toHaveCSS("border-bottom-color", rgb(colors[0]));
    const album = c.design?.endsWith("album"), center = c.design === "basic-center-column" || c.key === "cafe_round_focus_a";
    const dividers = p.locator("[data-menu-column-divider]").filter({ visible: true });
    if (device === "mobile" || album || center) assert.equal(await dividers.count(), 0);
    else {
      const tracks = await p.locator("[data-native-column], [data-paged-column]").filter({ visible: true }).count();
      assert.equal(await dividers.count(), Math.max(0, tracks - 1));
      if (await dividers.count()) {
        await expect(dividers.first()).toHaveCSS("border-inline-start-width", `${strokeWidth}px`);
        await expect(dividers.first()).toHaveCSS("border-inline-start-style", style);
        await expect(dividers.first()).toHaveCSS("color", rgb(colors[1]));
        const spaces = await dividers.evaluateAll(nodes => nodes.map(e => {
          const r = e.getBoundingClientRect(), track = e.parentElement, previous = track.previousElementSibling;
          const a = previous.getBoundingClientRect(), b = track.getBoundingClientRect();
          return [r.left - a.right, b.left - r.right];
        }));
        assert.ok(spaces.every(([left, right]) => left > 0 && Math.abs(left - right) < .2), JSON.stringify(spaces));
      }
    }
    const separators = await p.locator("[data-menu-item-separator]").filter({ visible: true }).evaluateAll(nodes => nodes.map(e => {
      const s = getComputedStyle(e, "::after"), r = e.getBoundingClientRect();
      return { content: s.content, color: s.color, style: s.borderTopStyle, width: s.borderTopWidth, top: parseFloat(s.top), height: r.height };
    }));
    if (album) assert.equal(separators.length, 0);
    else {
      const painted = separators.filter(s => s.content !== "none" && s.content !== "normal");
      assert.ok(painted.length > 0, "item separators are present between adjacent items");
      for (const s of painted) { assert.equal(s.width, `${strokeWidth}px`); assert.equal(s.style, style); assert.equal(s.color, rgb(colors[3])); assert.ok(s.top >= s.height, JSON.stringify(s)); }
    }
    const leaders = p.locator(".cafe-a-round-focus-price-leader").filter({ visible: true });
    if (album) assert.equal(await leaders.count(), 0);
    else { assert.ok(await leaders.count()); await expect(leaders.first()).toHaveCSS("border-top-width", `${strokeWidth}px`); await expect(leaders.first()).toHaveCSS("border-top-style", style); await expect(leaders.first()).toHaveCSS("color", rgb(colors[4])); }
    if (c.key === "restaurant_onue_a" || c.design === "basic-upper-left") assert.equal(await p.locator("[data-menu-pattern-bands]").count(), 0);
    const categoryRules = p.locator(".cafe-a-menu-category-top-divider").filter({ visible: true });
    assert.ok(await categoryRules.count());
    await expect(categoryRules.first()).toHaveCSS("border-top-width", `${strokeWidth}px`);
    await expect(categoryRules.first()).toHaveCSS("border-top-color", rgb(colors[2]));
    assert.equal(await p.locator("[data-menu-column-start] .cafe-a-menu-category-top-divider").filter({ visible: true }).count(), 0);
    await expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), { timeout: 5000 }).toBe(true);
    if (c.design === "basic-top-row" || (c.key === "cafe_van_gogh_a" && !c.design)) await p.screenshot({ path: `${output}/${c.design || c.key}-${device}.png` });
    // Linked colors affect only their agreed owners; explicit stroke colors won above.
    const linked = { textColorGroupsVersion: 2, textColors: { category: "#123456", supporting: "#654321" }, decorations: Object.fromEntries(lineKeys.map(key => [key, { visible: true, width: 2, style: "solid" }])) };
    await p.goto(url(base, c, device, linked), { waitUntil: "networkidle" }); await settle(p);
    await expect(p.locator(".cafe-a-category-heading").filter({ visible: true }).first()).toHaveCSS("border-bottom-color", "rgb(18, 52, 86)");
    for (const color of await p.locator("[data-menu-column-divider]").filter({ visible: true }).evaluateAll(nodes => nodes.map(e => getComputedStyle(e).color))) assert.equal(color, "rgb(18, 52, 86)");
    for (const color of await p.locator("[data-menu-item-separator]").filter({ visible: true }).evaluateAll(nodes => nodes.filter(e => getComputedStyle(e, "::after").content === '""').map(e => getComputedStyle(e, "::after").color))) assert.equal(color, "rgb(101, 67, 33)");
    await p.goto(url(base, c, device, { decorations: {} }), { waitUntil: "networkidle" }); await settle(p);
    assert.deepEqual(await nativeSnapshot(p), native, "clearing decoration overrides restores the native design");
  } finally { await p.close(); }
}
async function toolbar() {
  const p = await page(1440, 1000);
  try {
    await p.goto(url(base, { key: "cafe_design_a", design: "basic-top-row" }, "pc").replace("view=actual&", ""), { waitUntil: "networkidle" });
    await p.getByRole("tab", { name: "장식 기능", exact: true }).click();
    const before = await p.locator("iframe").getAttribute("src");
    const check = p.getByRole("checkbox", { name: "카테고리명 아래 선 표시", exact: true });
    await expect(check).not.toBeChecked();
    await expect(p.locator("[data-preview-decoration]")).toHaveCount(0);
    await check.check();
    await p.waitForURL(u => Boolean(u.searchParams.get("designPreview")));
    await expect(p.frameLocator("iframe").locator(".cafe-a-category-heading").first()).toHaveCSS("border-bottom-width", "1px");
    await p.getByRole("combobox", { name: "카테고리명 아래 선 두께", exact: true }).selectOption("3");
    await expect(p.frameLocator("iframe").locator(".cafe-a-category-heading").first()).toHaveCSS("border-bottom-width", "3px");
    await p.getByRole("combobox", { name: "카테고리명 아래 선 스타일", exact: true }).selectOption("dotted");
    await expect(p.frameLocator("iframe").locator(".cafe-a-category-heading").first()).toHaveCSS("border-bottom-style", "dotted");
    await p.getByRole("button", { name: "카테고리명 아래 선 색상 선택", exact: true }).click();
    const picker = p.locator("[data-preview-color-picker]");
    await picker.getByRole("textbox").fill("#356B8F");
    await picker.getByRole("button", { name: "적용", exact: true }).click();
    await expect(p.frameLocator("iframe").locator(".cafe-a-category-heading").first()).toHaveCSS("border-bottom-color", "rgb(53, 107, 143)");
    await p.getByRole("button", { name: "카테고리명 아래 선 색상 기본색 복원", exact: true }).click();
    await p.locator("[data-preview-color-reset]").getByRole("button", { name: "되돌리기", exact: true }).click();
    await p.waitForURL(u => !JSON.parse(u.searchParams.get("designPreview") || "{}").decorations?.categoryUnderline?.color);
    await check.uncheck();
    await expect(p.locator("[data-preview-decoration]")).toHaveCount(0);
    await expect(p.frameLocator("iframe").locator(".cafe-a-category-heading").first()).toHaveCSS("border-bottom-width", "0px");
    await check.check();
    await expect(p.getByRole("combobox", { name: "카테고리명 아래 선 두께", exact: true })).toHaveValue("3");
    await expect(p.getByRole("combobox", { name: "카테고리명 아래 선 스타일", exact: true })).toHaveValue("dotted");
    await expect(p.frameLocator("iframe").locator(".cafe-a-category-heading").first()).toHaveCSS("border-bottom-width", "3px");
    await settlePreview(p);
    await p.screenshot({ path: `${output}/decoration-options.png` });
    const serialized = new URL(p.url()).searchParams.get("designPreview");
    await p.getByRole("tab", { name: "디자인 옵션", exact: true }).click();
    await expect(p.getByRole("button", { name: "디자인 초기화", exact: true })).toBeDisabled();
    assert.equal(new URL(p.url()).searchParams.get("designPreview"), serialized, "tab changes retain decoration choices");
    await p.getByRole("tab", { name: "장식 기능", exact: true }).click();
    await p.getByRole("button", { name: "장식 초기화", exact: true }).click();
    await expect(p.frameLocator("iframe").locator(".cafe-a-category-heading").first()).toHaveCSS("border-bottom-width", "0px");
    assert.notEqual(await p.locator("iframe").getAttribute("src"), before, "explicit reset snapshot travels through the preview URL");
    await expect(check).not.toBeChecked();
    await expect(p.locator("[data-preview-decoration]")).toHaveCount(0);
    await settlePreview(p);
    await p.screenshot({ path: `${output}/decoration-empty.png` });
  } finally { await p.close(); }
}
async function strokeDetails() {
  const p = await page(1440, 900), c = { key: "cafe_design_a", design: "basic-top-row" };
  try {
    for (const width of [1, 2, 3]) for (const style of ["solid", "dashed", "dotted"]) {
      const decorations = Object.fromEntries(lineKeys.map(key => [key, { visible: true, width, style }]));
      await p.goto(url(base, c, "pc", { decorations }), { waitUntil: "networkidle" }); await settle(p);
      await expect(p.locator(".cafe-a-category-heading").filter({ visible: true }).first()).toHaveCSS("border-bottom", `${width}px ${style} rgb(25, 28, 27)`);
      await expect(p.locator(".cafe-a-round-focus-price-leader").filter({ visible: true }).first()).toHaveCSS("border-top-width", `${width}px`);
    }
    for (const [device, width, height] of [["pc", 1440, 900], ["tablet", 1180, 820], ["mobile", 390, 844]]) {
      await p.setViewportSize({ width, height });
      await p.goto(url(base, c, device, { decorations: { priceLeader: { visible: true, width: 3, style: "dotted" } } }), { waitUntil: "networkidle" }); await settle(p);
      const row = p.locator(".cafe-a-menu-item").filter({ visible: true }).first();
      await row.evaluate(e => { e.querySelector("[data-cafe-a-menu-name]").textContent = "정성껏 구운 닭고기와 제철 채소를 듬뿍 곁들인 그릴 치킨 플레이트"; });
      await p.waitForTimeout(100);
      const geometry = await row.evaluate(e => { const name = e.querySelector("[data-cafe-a-menu-name]"), leader = e.querySelector(".cafe-a-round-focus-price-leader"); return { name: name.getBoundingClientRect().toJSON(), leader: leader.getBoundingClientRect().toJSON(), line: parseFloat(getComputedStyle(name).lineHeight) }; });
      assert.ok(geometry.leader.top < geometry.name.top + geometry.line && geometry.leader.width > 0, JSON.stringify(geometry));
    }
    await p.setViewportSize({ width: 1440, height: 900 });
    for (const key of ["cafe_mocha_forest_a", "cafe_van_gogh_a", "cafe_round_focus_a"]) {
      await p.goto(url(base, { key }, "pc", { decorations: Object.fromEntries(lineKeys.map(k => [k, { visible: false }])) }), { waitUntil: "networkidle" }); await settle(p);
      assert.equal(await p.locator("[data-menu-column-divider], [data-menu-item-separator]").count(), 0);
      assert.equal(await p.locator(".cafe-a-round-focus-price-leader").filter({ visible: true }).count(), 0);
    }
  } finally { await p.close(); }
}
async function checkboxDefaults() {
  const p = await page(1440, 1000);
  const open = async (c, device) => {
    await p.goto(url(base, c, device).replace("view=actual&", "") + "&previewOptions=decorations", { waitUntil: "networkidle" });
    const toggle = p.getByRole("button", { name: "보기 옵션 열기", exact: true });
    if (await toggle.count()) await toggle.click();
    await expect(p.getByRole("tab", { name: "장식 기능", exact: true })).toHaveAttribute("aria-selected", "true");
  };
  try {
    const nativeEnabled = { cafe_design_a: "카테고리명 아래 선 표시", cafe_mocha_forest_a: "열 사이 구분선 표시", cafe_van_gogh_a: "메뉴 아이템 사이 구분선 표시", cafe_round_focus_a: "메뉴명–가격 연결선 표시", fast_food_loop_bagel_a: "상·하단 패턴 띠 표시" };
    for (const key of keys) {
      await open({ key }, "pc");
      const checked = await p.locator("[data-preview-decoration-choices] input:checked").evaluateAll(nodes => nodes.map(e => e.getAttribute("aria-label")));
      assert.deepEqual(checked, nativeEnabled[key] ? [nativeEnabled[key]] : []);
      assert.equal(new URL(p.url()).searchParams.get("designPreview"), null, "opening native choices never creates an override");
      await expect(p.locator("[data-preview-decoration]")).toHaveCount(nativeEnabled[key] && key !== "fast_food_loop_bagel_a" ? 1 : 0);
    }
    for (const [device, width, height] of [["mobile", 390, 844], ["tablet", 820, 1180], ["tablet", 1180, 820]]) {
      await p.setViewportSize({ width, height });
      await open({ key: "cafe_design_a", design: "basic-top-row-album" }, device);
      await expect(p.locator("[data-preview-decoration-choices] input")).toHaveCount(3);
      await p.getByRole("checkbox", { name: "카테고리명 아래 선 표시", exact: true }).check();
      await expect(p.getByRole("combobox", { name: "카테고리명 아래 선 두께", exact: true })).toBeVisible();
      await expect(p.locator("[data-preview-decoration]")).toHaveCount(1);
      await expect.poll(() => p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await settlePreview(p);
      await p.screenshot({ path: `${output}/decoration-checkboxes-${device}-${width}.png` });
    }
    await p.setViewportSize({ width: 390, height: 844 });
    await open({ key: "cafe_mocha_forest_a" }, "mobile");
    await expect(p.getByRole("checkbox", { name: "열 사이 구분선 표시", exact: true })).toBeChecked();
    await expect(p.getByRole("checkbox", { name: "열 사이 구분선 표시", exact: true })).toBeDisabled();
    await expect(p.locator('[data-preview-decoration="columnDivider"]')).toHaveCount(0);
    await open({ key: "restaurant_onue_a" }, "mobile");
    await expect(p.getByRole("checkbox", { name: "상·하단 패턴 띠 표시", exact: true })).toBeDisabled();
  } finally { await p.close(); }
}
try {
  await run("decoration tab, preview edit and reset", toolbar);
  if (process.env.DECORATIONS_QA_CHECKBOXES === "1") await run("native checkbox defaults and responsive selected-only controls", checkboxDefaults);
  if (process.env.DECORATIONS_QA_DETAILS === "1") await run("nine stroke combinations, long names and explicit native OFF", strokeDetails);
  const selectedCases = process.env.DECORATIONS_QA_CASES ? cases.filter(c => process.env.DECORATIONS_QA_CASES.split(",").includes(c.design || c.key)) : process.env.DECORATIONS_QA_SMOKE === "1" ? cases.filter(c => ["basic-top-row", "basic-upper-left", "basic-first-column-album"].includes(c.design) || (!c.design && ["cafe_mocha_forest_a", "cafe_round_focus_a", "cafe_van_gogh_a"].includes(c.key))) : cases;
  const jobs = process.env.DECORATIONS_QA_ONLY_UI === "1" ? [] : selectedCases.flatMap((c, i) => devices.map(d => () => run(`${c.design || c.key} ${d[0]}`, () => render(c, d, i))));
  for (let i = 0; i < jobs.length; i += 2) await Promise.all(jobs.slice(i, i + 2).map(fn => fn()));
  assert.deepEqual(failures, []); assert.deepEqual(errors, []); assert.deepEqual(writes, []);
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ passed: results.length, results, failures, errors, writes }, null, 2));
}
