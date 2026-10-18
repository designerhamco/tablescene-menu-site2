import assert from "node:assert/strict";
import fs from "node:fs/promises";
import { chromium } from "@playwright/test";
import {
  measureOnePageMobileRhythm,
  getOnePageMobileRhythmFailures,
} from "./lib/one-page-mobile-rhythm.mjs";
const base = process.env.ORDER_QA_BASE || "http://localhost:3017";
const output = process.env.ORDER_QA_OUTPUT || "/private/tmp/basic-dining-qa";
await fs.mkdir(output, { recursive: true });
const browser = await chromium.launch();
const failures = [],
  results = [],
  errors = [],
  writes = [];
const record = results.push.bind(results);
results.push = (result) => {
  console.log("PASS", JSON.stringify(result));
  return record(result);
};
const recordFailure = failures.push.bind(failures);
failures.push = (failure) => {
  console.log(
    "FAIL",
    JSON.stringify({ ...failure, error: failure.error.split("\n")[0] }),
  );
  return recordFailure(failure);
};
const newPage = async (viewport) => {
  const p = await browser.newPage({ viewport, reducedMotion: "reduce" });
  p.on("pageerror", (e) => errors.push(e.message));
  await p.route("**/api/public-menu/**", (route) => {
    if (route.request().method() !== "GET") {
      writes.push(route.request().url());
      return route.abort();
    }
    return route.continue();
  });
  return p;
};
async function goto(p, key, device, extra = "") {
  await p.goto(
    base +
      "/templates/" +
      key +
      "/preview?device=" +
      device +
      "&view=actual&embedded=1" +
      extra,
    { waitUntil: "domcontentloaded" },
  );
  await p.evaluate(() => document.fonts.ready);
}
async function paged(device, width, height, scenario, layout) {
  const p = await newPage({ width, height });
  try {
    await goto(
      p,
      "cafe_real_matcha_paged_test",
      device,
      "&callPreview=on&orderPreview=on&pageTest=" +
        scenario +
        "&layoutMode=" +
        layout,
    );
    await p.waitForFunction(
      () =>
        document
          .querySelector("[data-paged-ready]")
          ?.getAttribute("data-paged-ready") === "true",
    );
    await p.waitForTimeout(150);
    const expected = await p
      .locator("[data-measure-id]")
      .evaluateAll((els) =>
        els
          .filter((e) => e.dataset.kind !== "heading")
          .map((e) => e.dataset.measureId),
      );
    assert.equal(await p.locator("[data-paged-layout]").getAttribute("data-paged-layout"),layout);
    const total = Number(
      await p.locator("[data-paged-total]").getAttribute("data-paged-total"),
    );
    const geometry = await p.locator("[data-paged-brand]").boundingBox(),
      actions = await p.locator("[data-table-menu-actions]").boundingBox();
    const seen = [];
    for (let page = 1; page <= total; page++) {
      if (page > 1)
        await p
          .getByRole("button", { name: page + "페이지 보기", exact: true })
          .click();
      const m = await p.evaluate(() => {
        const root = document.querySelector("[data-paged-ready]"),
          menu = root.querySelector('section[aria-label="메뉴 페이지"]'),
          bounds = menu.getBoundingClientRect();
        const blocks = [
          ...document.querySelectorAll(
            "[data-paged-column] [data-paged-block]",
          ),
        ];
        const clipped = blocks
          .filter((e) => {
            const r = e.getBoundingClientRect();
            return (
              r.top < bounds.top - 1 ||
              r.bottom > bounds.bottom + 1 ||
              r.left < bounds.left - 1 ||
              r.right > bounds.right + 1
            );
          })
          .map((e) => e.dataset.pagedBlock);
        const widget = [
          ...document.querySelectorAll(
            "[data-paged-column] [data-paged-block]",
          ),
        ].find((e) => e.dataset.pagedBlock === "test-last-widget");
        return {
          viewport: [innerWidth, innerHeight],
          scroll: [
            document.documentElement.scrollWidth,
            document.documentElement.scrollHeight,
          ],
          clipped,
          ids: blocks
            .filter((e) => e.dataset.kind !== "heading")
            .map((e) => e.dataset.pagedBlock),
          columns: document.querySelectorAll("[data-paged-column]").length,
          widgetBottom: widget?.getBoundingClientRect().bottom,
          noticeTop: document
            .querySelector("[data-paged-notices]")
            .getBoundingClientRect().top,
        };
      });
      assert.deepEqual(m.viewport, [width, height]);
      assert.ok(
        m.scroll[0] <= width + 1 && m.scroll[1] <= height + 1,
        JSON.stringify(m),
      );
      assert.deepEqual(m.clipped, []);
      assert.deepEqual(
        await p.locator("[data-paged-brand]").boundingBox(),
        geometry,
      );
      assert.deepEqual(
        await p.locator("[data-table-menu-actions]").boundingBox(),
        actions,
      );
      if (m.widgetBottom)
        assert.ok(
          m.widgetBottom <= m.noticeTop + 1,
          "terminal widget precedes notices",
        );
      seen.push(...m.ids);
    }
    assert.deepEqual(seen, expected);
    results.push({
      kind: "paged",
      device,
      viewport: [width, height],
      scenario,
      layout,
      pages: total,
    });
    if (!scenario && width === 1440)
      await p.screenshot({ path: output + "/paged-desktop.png" });
  } catch (e) {
    failures.push({
      kind: "paged",
      device,
      width,
      height,
      scenario,
      layout,
      error: e.message,
    });
  } finally {
    await p.close();
  }
}
try {
  const sizes = [
    ["pc", 1440, 900],
    ["pc", 1920, 1080],
    ["tablet", 1180, 820],
    ["tablet", 820, 1180],
  ];
  for (const [device, w, h] of process.env.ORDER_QA_INTERACTION_ONLY
    ? []
    : sizes)
    for (const scenario of ["", "dense", "long", "widgets"])
      for (const layout of ["orderedBalancedFit", "orderedFit"])
        await paged(device, w, h, scenario, layout);
  for (const width of process.env.ORDER_QA_INTERACTION_ONLY
    ? []
    : [320, 390, 430, 820]) {
    const p = await newPage({ width, height: 844 });
    try {
      await goto(
        p,
        "cafe_real_matcha_paged_test",
        "mobile",
        "&callPreview=on&orderPreview=on",
      );
      await p.waitForSelector('[data-mobile-brand-fit="ready"]');
      assert.equal(await p.locator("[data-paged-ready]").count(), 0);
      assert.ok(await p.locator("[data-one-page-call-bar]").isVisible());
      const order = await p
        .locator("[data-one-page-call-bar]")
        .evaluate((el) => {
          const language = el.querySelector("[data-template-language-control]"),
            table = el.querySelector("[data-one-page-table-label]"),
            actions = el.querySelector("[data-one-page-table-actions]");
          return {
            language: language?.getBoundingClientRect().left,
            table: table?.getBoundingClientRect().left,
            actions: actions?.getBoundingClientRect().left,
            scrollWidth: document.documentElement.scrollWidth,
            width: innerWidth,
          };
        });
      assert.ok(order.language < order.table && order.table < order.actions);
      assert.ok(order.scrollWidth <= width + 1);
      if (width < 768)
        assert.deepEqual(
          getOnePageMobileRhythmFailures(
            await p.evaluate(measureOnePageMobileRhythm),
          ),
          [],
        );
      results.push({ kind: "mobile", viewport: [width, 844] });
    } catch (e) {
      failures.push({ kind: "mobile", width, error: e.message });
    } finally {
      await p.close();
    }
  }
  const p = await newPage({ width: 1440, height: 1600 });
  try {
    await p.goto(base + "/qa/table-order", { waitUntil: "domcontentloaded" });
    await p.getByLabel("테스트 기기").selectOption("mobile");
    await p.getByLabel("테스트 콘텐츠").selectOption("options");
    let f = p.frameLocator('iframe[title="리얼맛차 페이지형 주문 테스트"]');
    await f.locator('[data-mobile-brand-fit="ready"]').waitFor();
    await p.locator("iframe").scrollIntoViewIfNeeded();
    await f
      .locator("[data-menu-order-add]")
      .filter({ visible: true })
      .first()
      .click();
    let dialog = f.getByRole("dialog");
    await dialog.getByRole("button", { name: /장바구니 담기/ }).click();
    await dialog.getByText("필수 옵션과 선택 개수를 확인해 주세요.").waitFor();
    await dialog.getByRole("button", { name: /^ICE/ }).click();
    await dialog
      .getByRole("button", { name: "수량 늘리기", exact: true })
      .click();
    await dialog.getByRole("button", { name: /장바구니 담기/ }).click();
    await f
      .getByRole("button", { name: "장바구니 2개", exact: true })
      .filter({ visible: true })
      .click();
    dialog = f.getByRole("dialog", { name: "장바구니", exact: true });
    assert.ok(
      await dialog
        .getByRole("button", { name: "선결제 · 준비 중", exact: true })
        .isDisabled(),
    );
    await dialog
      .getByRole("button", { name: "옵션 변경", exact: false })
      .click();
    await p.locator("iframe").scrollIntoViewIfNeeded();
    await f.getByRole("dialog").getByRole("button", { name: /^HOT/ }).click();
    await f
      .getByRole("dialog")
      .getByRole("button", { name: "변경사항 저장" })
      .click();
    await dialog.getByText("HOT", { exact: true }).waitFor();
    await dialog
      .getByRole("button", { name: "메뉴 더 담기", exact: true })
      .click();
    await f
      .locator("[data-menu-order-add]")
      .filter({ visible: true })
      .nth(1)
      .click();
    await f
      .getByRole("dialog")
      .getByRole("button", { name: /장바구니 담기/ })
      .click();
    await f
      .getByRole("button", { name: "장바구니 3개", exact: true })
      .filter({ visible: true })
      .click();
    await dialog
      .getByRole("button", { name: / 삭제$/ })
      .last()
      .click();
    await dialog.getByRole("button", { name: /수량 줄이기$/ }).click();
    await dialog
      .getByRole("button", { name: "후불로 주문하기", exact: true })
      .click();
    await p.locator("[data-demo-order]").waitFor();
    assert.match(await p.locator("[data-demo-order]").innerText(), /Table 1/);
    assert.match(await p.locator("[data-demo-order]").innerText(), /HOT/);
    for (const name of [
      "접수 처리",
      "준비 중 처리",
      "준비 완료 처리",
      "제공 완료 처리",
    ])
      await p.getByRole("button", { name, exact: true }).click();
    assert.match(await p.locator("[data-demo-order]").innerText(), /제공 완료/);
    await p.screenshot({ path: output + "/order-demo.png", fullPage: true });
    await p.locator("iframe").scrollIntoViewIfNeeded();
    await dialog.getByRole("button", { name: "장바구니 닫기" }).click();
    // Closing a product without adding must not leave that sheet stuck on the next cart open.
    await f
      .locator("[data-menu-order-add]")
      .filter({ visible: true })
      .first()
      .click();
    await f
      .getByRole("dialog")
      .getByRole("button", { name: "메뉴 담기 닫기", exact: true })
      .last()
      .click();
    await f
      .getByRole("button", { name: "장바구니 0개", exact: true })
      .filter({ visible: true })
      .click();
    await f
      .getByRole("dialog", { name: "장바구니", exact: true })
      .getByText("장바구니가 비어 있어요")
      .waitFor();
    await f
      .getByRole("dialog")
      .getByRole("button", { name: "장바구니 닫기" })
      .click();
    await p.getByLabel("테스트 기기").selectOption("pc");
    await f.locator('[data-paged-ready="true"]').waitFor();
    await f
      .getByRole("button", { name: "장바구니 0개", exact: true })
      .filter({ visible: true })
      .click();
    assert.equal(
      await f
        .getByRole("button", { name: "선결제 · 준비 중", exact: true })
        .count(),
      0,
    );
    results.push({
      kind: "cart",
      options: true,
      quantity: true,
      edit: true,
      postpayDemo: true,
      adminStatusChain: true,
      prepayDisabled: true,
    });
  } catch (e) {
    failures.push({ kind: "cart", error: e.message });
  } finally {
    await p.close();
  }
  // Both Dining layouts expose add buttons on a menu page, with controls outside the content stream.
  for (const key of ["dining_aube_table_a", "dining_aube_table_b"])
    for (const [device, width, height] of [
      ["pc", 1440, 900],
      ["mobile", 390, 844],
      ["mobile", 820, 1180],
    ]) {
      const p = await newPage({ width, height });
      try {
        await goto(p, key, device, "&callPreview=on&orderPreview=on");
        await p.waitForTimeout(450);
        if (key.endsWith("_a") && device === "mobile")
          await p.locator(".aube-table-pagination-dots button").nth(1).click();
        else if (key.endsWith("_a"))
          await p
            .getByRole("button", { name: "다음 메뉴 페이지", exact: true })
            .click();
        else
          await p
            .locator(
              ".aube-table-sidebar-list button,.aube-table-mobile-page-tabs button",
            )
            .filter({ visible: true })
            .nth(1)
            .click();
        await p
          .locator("[data-menu-order-add]")
          .filter({ visible: true })
          .first()
          .waitFor();
        await p
          .getByRole("button", { name: "장바구니 0개", exact: true })
          .filter({ visible: true })
          .click();
        await p
          .getByRole("dialog", { name: "장바구니", exact: true })
          .waitFor();
        await p.getByRole("button", { name: "장바구니 닫기" }).click();
        const m = await p.evaluate(() => ({
          width: innerWidth,
          scroll: document.documentElement.scrollWidth,
          rootWidth: document
            .querySelector(".aube-table-root")
            .getBoundingClientRect().width,
          cols: getComputedStyle(
            document.querySelector(".aube-table-page-content"),
          ).gridTemplateColumns,
        }));
        assert.ok(m.scroll <= width + 1);
        if (device === "mobile") assert.ok(m.rootWidth <= 767);
        results.push({
          kind: "dining",
          key,
          device,
          viewport: [width, height],
          ...m,
        });
      } catch (e) {
        failures.push({ kind: "dining", key, device, width, error: e.message });
      } finally {
        await p.close();
      }
    }
  // Feature switches must be independent in the visible device toolbar.
  const toolbar = await newPage({ width: 1440, height: 900 });
  try {
    await toolbar.goto(base + "/templates/cafe_design_a/preview", {
      waitUntil: "domcontentloaded",
    });
    await toolbar.waitForTimeout(500);
    if (await toolbar.locator("[data-preview-guide-variant]").count())
      await toolbar.getByRole("button", { name: "닫기", exact: true }).click();
    await toolbar.getByLabel("주문 기능 미리보기").check();
    await toolbar.waitForURL(/orderPreview=on/);
    await toolbar.getByLabel("호출 기능 미리보기").check();
    await toolbar.waitForURL(/callPreview=on/);
    assert.equal(
      new URL(
        await toolbar
          .locator("[data-preview-detached-link]")
          .getAttribute("href"),
        base,
      ).searchParams.get("orderPreview"),
      "on",
    );
    results.push({ kind: "toolbar", independentToggles: true });
  } catch (e) {
    failures.push({ kind: "toolbar", error: e.message });
  } finally {
    await toolbar.close();
  }
} finally {
  await browser.close();
  await fs.writeFile(
    output + "/report.json",
    JSON.stringify({ base, results, failures, errors, writes }, null, 2),
  );
}
console.log(
  JSON.stringify({ checked: results.length, failures, errors, writes }),
);
if (failures.length || errors.length || writes.length) process.exitCode = 1;
