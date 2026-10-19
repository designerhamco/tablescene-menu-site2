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
          .map((e) => e.dataset.measureId),
      );
    assert.equal(await p.locator("[data-paged-layout]").getAttribute("data-paged-layout"),layout);
    assert.equal(await p.getByRole("navigation", {name: "메뉴 페이지 이동"}).count(), 0);
    assert.equal(await p.locator("[data-paged-controls] [data-one-page-call-button]").count(), 0);
    const geometry = await p.locator("[data-paged-brand]").boundingBox();
    const actions = await p.locator("[data-scroll-actions]").boundingBox();
    const viewport = await p.locator("[data-scroll-menu]").boundingBox();
    assert.ok(actions.x >= viewport.x - 1 && actions.x + actions.width <= viewport.x + viewport.width + 1);
    assert.ok(Math.abs(actions.y + actions.height - (height - geometry.y)) < 1, "actions are fixed at the menu bottom");
    assert.equal(await p.locator("[data-scroll-call]").count(), 1);
    assert.equal(await p.locator("[data-scroll-order]").count(), 1);
    const seen = await p.locator("[data-paged-column] [data-paged-block]").evaluateAll(els => els.map(e => e.dataset.pagedBlock));
    assert.deepEqual(seen, expected);
    const measure = async () => p.evaluate(() => {
      const menu = document.querySelector("[data-scroll-menu]"), bounds = menu.getBoundingClientRect();
      const blocks = [...document.querySelectorAll("[data-paged-column] [data-paged-block]")];
      const widget = blocks.find(e => e.dataset.pagedBlock === "test-last-widget");
      const bad = [];
      for (const column of document.querySelectorAll("[data-paged-column]")) {
        let end = -Infinity;
        for (const block of column.querySelectorAll("[data-paged-block]")) {
          const rect = block.getBoundingClientRect();
          if (rect.left < bounds.left - 1 || rect.right > bounds.right + 1 || rect.top < end - 1) bad.push(block.dataset.pagedBlock);
          end = rect.bottom;
        }
      }
      return {viewport:[innerWidth,innerHeight], outer:[document.documentElement.scrollWidth,document.documentElement.scrollHeight],
        scrollTop:menu.scrollTop, max:menu.scrollHeight-menu.clientHeight, bad,
        first:blocks[0]?.getBoundingClientRect().top,
        last:Math.max(...blocks.map(e => e.getBoundingClientRect().bottom)), bottom:bounds.bottom,
        widgetBottom:widget?.getBoundingClientRect().bottom,
        noticeTop:document.querySelector("[data-paged-notices]").getBoundingClientRect().top,
        noticeBottom:document.querySelector("[data-paged-notices]").getBoundingClientRect().bottom,
        more:document.querySelector("[data-scroll-more]").dataset.scrollMore,
        pointer:getComputedStyle(document.querySelector("[data-scroll-fade]")).pointerEvents};
    });
    const start = await measure();
    assert.deepEqual(start.viewport,[width,height]);
    assert.ok(start.outer[0] <= width + 1 && start.outer[1] <= height + 1);
    assert.equal(start.more,start.max > 2 ? "true" : "false");
    assert.equal(start.pointer,"none");
    for (const fraction of [0.5,1]) {
      await p.locator("[data-scroll-menu]").evaluate((e,f) => {e.scrollTop=(e.scrollHeight-e.clientHeight)*f},fraction);
      await p.waitForTimeout(180);
      const current = await measure();
      assert.deepEqual(current.bad,[]);
      assert.ok(Math.abs((start.first-current.first)-current.scrollTop)<1,"all menu columns share the scroll offset");
      assert.deepEqual(await p.locator("[data-paged-brand]").boundingBox(),geometry);
      assert.deepEqual(await p.locator("[data-scroll-actions]").boundingBox(),actions);
      if(fraction===1) {
        assert.equal(current.more,"false");
        assert.ok(current.last <= current.bottom + 1 && current.noticeBottom <= current.bottom + 1,"last content and notices stay reachable above the fixed buttons");
        if(current.widgetBottom)assert.ok(current.widgetBottom<=current.noticeTop+1,"last widget precedes notices");
      }
    }
    results.push({kind:"scroll",device,viewport:[width,height],scenario,layout,overflow:start.max});
    if(!scenario) {
      await p.locator("[data-scroll-menu]").evaluate(e => {e.scrollTop=0});
      await p.screenshot({path:output+`/scroll-${device}-${width}-${layout}.png`});
    }
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
    for (const scenario of ["", "images", "dense", "long", "widgets"])
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
      assert.deepEqual(await p.locator("[data-one-page-call-bar] [data-one-page-call-button]").evaluateAll(buttons => buttons.map(b => b.dataset.onePageCallButton)), ["mobile-cart"]);
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
    let f = p.frameLocator('iframe[title="리얼맛차 스크롤 주문 테스트"]');
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
    await dialog.getByRole("button", { name: "메뉴판으로 돌아가기" }).click();
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
      .getByRole("button", { name: "메뉴판으로 돌아가기" })
      .click();
    await p.getByLabel("테스트 기기").selectOption("pc");
    await f.locator('[data-paged-ready="true"]').waitFor();
    await f.locator("[data-scroll-order]").click();
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
        await p.getByRole("button", { name: "메뉴판으로 돌아가기" }).click();
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
    await toolbar.locator("[data-preview-guide-variant]").waitFor({state:"visible"});
    await toolbar.locator("[data-preview-guide-variant]").getByRole("button", { name: "닫기", exact: true }).click();
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
    await toolbar.goto(base + "/templates/cafe_real_matcha_paged_test/preview?device=pc&callPreview=on&orderPreview=on");
    await toolbar.locator('[data-preview-layout-mode="orderedFit"]').click();
    await toolbar.waitForURL(/layoutMode=orderedFit/);
    let embedded = new URL(await toolbar.locator("iframe").getAttribute("src"), base);
    assert.equal(embedded.searchParams.get("layoutMode"), "orderedFit");
    assert.equal(embedded.searchParams.get("orderPreview"), "on");
    await toolbar.getByRole("link", {name: "태블릿", exact: true}).click();
    await toolbar.waitForURL(/device=tablet/);
    assert.equal(new URL(await toolbar.locator("iframe").getAttribute("src"), base).searchParams.get("layoutMode"), "orderedFit");
    await toolbar.locator('[data-preview-layout-mode="orderedBalancedFit"]').click();
    await toolbar.waitForURL(/layoutMode=orderedBalancedFit/);
    assert.equal(new URL(await toolbar.locator("[data-preview-detached-link]").getAttribute("href"), base).searchParams.get("layoutMode"), "orderedBalancedFit");
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
