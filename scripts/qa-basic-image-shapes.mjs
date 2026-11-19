import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import { DEFAULT_DESIGN_REVIEWS } from "../lib/menu-design-policy.ts";
import { MENU_SHAPE_PRESETS, TEMPLATE_SHAPE_DEFAULTS, normalizeMenuAppearance, withUnifiedAppearanceRadius } from "../lib/menu-appearance.ts";

const base = process.env.SHAPE_QA_BASE || "http://localhost:3061";
const output = process.env.SHAPE_QA_OUTPUT || "/private/tmp/basic-image-shapes";
await fs.mkdir(output, { recursive: true });
const native = TEMPLATE_SHAPE_DEFAULTS.filter(template => !template.key.startsWith("dining_") && template.key !== "display_menu_a").map(template => ({ key: template.key }));
const standard = DEFAULT_DESIGN_REVIEWS.filter(design => design.layout.startsWith("basic-")).map(design => ({ key: design.renderer, design: design.id }));
const devices = [["pc", 1440, 900], ["tablet", 1180, 820], ["mobile", 390, 844]];
const corners = { square: 0, soft: 2, rounded: 4, round: 6 };
const browser = await chromium.launch();
const results = [], failures = [], errors = [];

async function makePage(width, height) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
  page.on("pageerror", error => errors.push(error.message));
  await page.route("**/api/**", route => route.request().method() === "GET" ? route.continue() : route.abort());
  return page;
}

const appearance = preset => {
  const value = withUnifiedAppearanceRadius(normalizeMenuAppearance({}), MENU_SHAPE_PRESETS[preset].imageRadius, true);
  return { imageRadii: value.imageRadii, chipShape: value.chipShape };
};
function url(sample, device, extra = {}) {
  return `${base}/templates/${sample.key}/preview?` + new URLSearchParams({ device, view: "actual", imagesPreview: "on", coverPreview: "on", callPreview: "on", orderPreview: "on", ...(sample.design ? { design: sample.design } : {}), ...extra });
}
async function ready(page) {
  await page.locator("[data-menu-appearance]").waitFor();
  await page.evaluate(() => document.fonts.ready);
  await page.waitForFunction(() => !document.querySelector('[data-native-ready="false"]') && [...document.querySelectorAll(".cafe-a-menu-item-image-zoom")].some(element => element.getBoundingClientRect().width > 0));
}
async function measure(page, sample, device, preset) {
  const expected = MENU_SHAPE_PRESETS[preset].imageRadius;
  const fixed = sample.key === "restaurant_onue_a" || sample.design === "basic-upper-left";
  const zooms = page.locator(".cafe-a-menu-item-image-zoom").filter({ visible: true });
  assert.ok(await zooms.count(), "product zoom examples exist");
  const radii = await zooms.evaluateAll(elements => elements.map(element => ({ zoom: getComputedStyle(element).borderTopLeftRadius, image: getComputedStyle(element.closest("button")).borderTopLeftRadius })));
  for (const radius of radii) {
    assert.equal(radius.zoom, `${corners[preset]}px`, "zoom corner follows the small-box scale");
    assert.equal(radius.image, `${expected}px`, "product frame keeps the selected image radius");
  }
  const frames = page.locator(".cafe-a-cover-hero, .cafe-a-cover-frame").filter({ visible: true });
  assert.ok(await frames.count(), "representative example exists");
  const photos = await frames.evaluateAll(elements => elements.map(element => { const box = element.getBoundingClientRect(); return { radius: getComputedStyle(element).borderTopLeftRadius, ratio: box.width / box.height }; }));
  for (const photo of photos) {
    assert.equal(photo.radius, `${fixed ? 0 : expected}px`, "only upper-left representatives stay square");
    if (fixed) assert.ok(Math.abs(photo.ratio - (device === "mobile" ? 1 : 4 / 3)) < .01, `registered photo ratio ${photo.ratio}`);
  }
  assert.equal(await page.locator("[data-square-representative]").count(), fixed ? 1 : 0);
  return { sample: sample.design || sample.key, device, preset, zoom: corners[preset], image: expected, representative: fixed ? 0 : expected, photos: photos.map(photo => photo.ratio) };
}
async function verify(sample, [device, width, height], preset = "round") {
  const page = await makePage(width, height);
  try {
    await page.goto(url(sample, device, { designPreview: JSON.stringify(appearance(preset)) }));
    await ready(page);
    assert.deepEqual(await page.evaluate(() => [innerWidth, innerHeight]), [width, height]);
    const measured = await measure(page, sample, device, preset);
    if ((device === "mobile" && ["restaurant_onue_a", "fast_food_loop_bagel_a"].includes(sample.key)) || (device === "pc" && sample.design === "basic-upper-left")) {
      const image = page.locator(".cafe-a-menu-item-image-slot").filter({ visible: true }).first();
      await image.click();
      const enlarged = page.locator(".cafe-a-image-lightbox img");
      await enlarged.waitFor();
      assert.equal(await enlarged.evaluate(element => getComputedStyle(element).borderTopLeftRadius), `${MENU_SHAPE_PRESETS[preset].imageRadius}px`);
      await page.getByRole("button", { name: "이미지 크게 보기 닫기", exact: true }).click();
      await image.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${sample.design || sample.key}-${device}-${preset}.png` });
    }
    return measured;
  } finally { await page.close(); }
}
async function previewControls(sample) {
  const page = await makePage(1440, 1000);
  try {
    await page.goto(url(sample, "mobile", { view: "preview", previewOptions: "design" }));
    await page.locator("[data-preview-options-panel]").waitFor({ state: "attached" });
    const select = page.getByRole("combobox", { name: "이미지·텍스트칩 라운드", exact: true });
    await select.waitFor();
    const frame = page.frameLocator("[data-preview-frame-shell] iframe");
    for (const preset of Object.keys(corners)) {
      await page.locator('[data-preview-image-radii] select:enabled').waitFor();
      await select.selectOption(preset);
      await frame.locator("[data-menu-appearance]").waitFor();
      await frame.locator(".cafe-a-menu-item-image-zoom").first().waitFor();
      await page.waitForFunction(expected => {
        const doc = document.querySelector("[data-preview-frame-shell] iframe")?.contentDocument;
        const zoom = doc?.querySelector(".cafe-a-menu-item-image-zoom");
        return zoom && doc.defaultView.getComputedStyle(zoom).borderTopLeftRadius === `${expected}px`;
      }, corners[preset]);
      await page.waitForFunction(expected => {
        const select = document.querySelector('[data-preview-image-radii] select');
        return select && !select.disabled && select.value === expected;
      }, preset);
    }
    await page.getByRole("button", { name: "디자인 초기화", exact: true }).click();
    const nativePreset = sample.design ? "square" : TEMPLATE_SHAPE_DEFAULTS.find(template => template.key === sample.key).preset;
    await page.waitForFunction(expected => {
      const doc = document.querySelector("[data-preview-frame-shell] iframe")?.contentDocument;
      const zoom = doc?.querySelector(".cafe-a-menu-item-image-zoom");
      return zoom && doc.defaultView.getComputedStyle(zoom).borderTopLeftRadius === `${expected}px`;
    }, corners[nativePreset]);
    return { sample: sample.design || sample.key, controls: "four presets and native reset" };
  } finally { await page.close(); }
}
async function excluded(key) {
  const page = await makePage(1440, 900);
  try {
    await page.goto(url({ key }, "pc", { designPreview: JSON.stringify(appearance("round")) }));
    await page.locator("[data-menu-appearance]").waitFor();
    assert.equal(await page.locator(".cafe-a-menu-item-image-zoom,[data-square-representative]").count(), 0);
    if (key.startsWith("dining_")) assert.equal(await page.locator(".aube-table-cover").evaluate(element => getComputedStyle(element).borderTopLeftRadius), "0px");
    return { excluded: key };
  } finally { await page.close(); }
}
async function run(name, fn) {
  if (process.env.SHAPE_QA_CONTROLS_ONLY === "1" && !name.startsWith("controls ")) return;
  try { const result = await fn(); results.push({ name, ...result }); console.log("PASS", JSON.stringify(results.at(-1))); }
  catch (error) { failures.push({ name, error: error.message }); console.log("FAIL", name, error.message); }
}
try {
  const smoke = process.env.SHAPE_QA_SMOKE === "1";
  const samples = smoke ? [{ key: "fast_food_loop_bagel_a" }, { key: "restaurant_onue_a" }, { key: "cafe_design_a", design: "basic-upper-left" }, { key: "cafe_design_a", design: "basic-first-column-album" }] : [...native, ...standard];
  for (const sample of samples) for (const device of devices) await run(`${sample.design || sample.key} ${device[0]}`, () => verify(sample, device));
  if (!smoke) {
    for (const preset of ["square", "soft", "rounded"]) await run(`loop ${preset}`, () => verify({ key: "fast_food_loop_bagel_a" }, devices[2], preset));
    for (const sample of [{ key: "restaurant_onue_a" }, { key: "cafe_design_a", design: "basic-upper-left" }]) {
      for (const device of [["tablet", 820, 1180], ["mobile", 320, 844]]) await run(`${sample.design || sample.key} narrow ${device[0]}`, () => verify(sample, device));
    }
    for (const sample of [{ key: "fast_food_loop_bagel_a" }, { key: "restaurant_onue_a" }, { key: "cafe_design_a", design: "basic-upper-left" }, { key: "cafe_design_a", design: "basic-top-row-album" }]) await run(`controls ${sample.design || sample.key}`, () => previewControls(sample));
    for (const key of ["dining_aube_table_a", "dining_aube_table_b", "display_menu_a"]) await run(`excluded ${key}`, () => excluded(key));
  }
  assert.deepEqual(failures, []);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ passed: results.length, failures: failures.length, errors: errors.length }));
} finally {
  await browser.close();
  await fs.writeFile(`${output}/report.json`, JSON.stringify({ results, failures, errors }, null, 2));
}
