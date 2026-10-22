import assert from "node:assert/strict";
import test from "node:test";
import { DEFAULT_DESIGN_REVIEWS } from "./menu-design-policy";
import { createStarterMenuData, getStarterPreset } from "./menu-starter-presets";
import { getStarterTranslationCopy } from "./standard-design-starter";
import { getMenuDesignDisplayName, getSavedMenuDesign } from "./menu-design-identity";
import { ensurePurchasedMenuStarter } from "./server/purchased-menu-provisioning";

import { StarterClient } from "./test-support/starter-provisioning-client";

for (const design of DEFAULT_DESIGN_REVIEWS) {
  test(`${design.id}: purchased starter is neutral, keeps stable links and merchant fields`, async () => {
    const native = structuredClone(getStarterPreset(design.renderer));
    const preset = getStarterPreset(design.renderer, null, null, design.id);
    assert.deepEqual(getStarterPreset(design.renderer), native);
    assert.equal(preset.design_id, design.id);
    assert.match(preset.site.cover_image_url, /^\/placeholders\/starter\//);
    assert.equal(preset.site.settings?.footer_notice_2, "알레르기가 있다면 주문 전 알려주세요.");
    assert.equal(preset.pages.length, native.pages.length);
    assert.deepEqual(preset.pages.flatMap(p => p.categories.flatMap(c => c.items.map(i => i.key))), native.pages.flatMap(p => p.categories.flatMap(c => c.items.map(i => i.key))));
    const client = new StarterClient();
    const result = await createStarterMenuData(client as never, "new-menu", design.renderer, null, null, "business_basic_single_monthly", {designId: design.id});
    assert.equal(result.created, true);
    assert.equal(client.site.restaurant_name, "고객 매장");
    assert.equal(client.site.restaurant_address, "고객 주소");
    assert.equal(client.site.restaurant_phone, "고객 전화");
    assert.deepEqual((client.site.settings as Record<string, unknown>).table_order, {orderEnabled: true});
    const rows = client.rows.get("menu_items") ?? [];
    assert.equal(rows.length, preset.pages.reduce((n, p) => n + p.categories.reduce((m, c) => m + c.items.length, 0) + (p.direct_items?.length ?? 0), 0));
    assert.ok(rows.every(row => !/리얼 맛차|REAL MATCHA|오브 테이블/.test(String(row.name))));
    assert.ok(rows.every(row => row.image_url === null || String(row.image_url).startsWith("/placeholders/starter/")));
    assert.match(getMenuDesignDisplayName(design.renderer, null, {menu_design_id: design.id}), /^기본 디자인/);
    const snapshot = structuredClone([...client.rows]);
    assert.equal((await createStarterMenuData(client as never, "new-menu", design.renderer, null, null, "business_basic_single_monthly", {designId: design.id})).created, false);
    assert.deepEqual([...client.rows], snapshot);
    if (design.renderer === "cafe_design_a") {
      assert.deepEqual((client.rows.get("menu_categories") ?? []).map(row => row.name), ["SIGNATURE", "COFFEE", "NON-COFFEE", "ADE", "BAKERY"]);
      assert.equal(rows[0].name, "말차 라떼");
      const bakery = (client.rows.get("menu_categories") ?? []).find(c => c.name === "BAKERY");
      assert.ok(rows.filter(row => row.category_id === bakery?.id).every(row => row.image_url === null));
      const columns = client.rows.get("menu_category_price_columns") ?? [];
      assert.equal(columns.length, design.itemLayout === "album" ? 0 : 5);
      assert.ok((client.rows.get("menu_site_translations") ?? []).every(row => row.restaurant_name === null));
      const translations = getStarterTranslationCopy(preset)!;
      for (const locale of ["en", "zh", "ja"] as const) {
        assert.doesNotMatch(JSON.stringify(translations[locale].site), /REAL.?MATCHA|real\.matcha|济州|済州/);
        assert.doesNotMatch(JSON.stringify(translations[locale].items).replace(/real-matcha/g, ""), /Real Matcha|真抹茶|リアル抹茶/);
      }
    }
  });
}

test("designer selection and legacy label keep native sample assets", () => {
  const native = getStarterPreset("cafe_design_a");
  assert.deepEqual(getStarterPreset("cafe_design_a", null, null, "cafe_design_a"), native);
  assert.match(native.site.cover_image_url, /real-matcha/);
  assert.match(getMenuDesignDisplayName("cafe_design_a"), /REAL MATCHA/);
  assert.equal(getSavedMenuDesign("cafe_design_a", {menu_design_id: "dining-full-page"}), null);
  assert.throws(() => getStarterPreset("cafe_design_a", null, null, "dining-full-page"), /일치하지/);
});

test("payment recovery forwards the purchased design instead of the shared renderer sample", async () => {
  const client = new StarterClient();
  await ensurePurchasedMenuStarter(client as never, {menuSiteId: "recovered", templateKey: "cafe_design_a", productKey: "business_basic_single_monthly", designId: "basic-first-column"});
  assert.equal(client.rows.get("menu_items")?.[0].name, "말차 라떼");
  assert.equal(client.site.brand_description, "좋은 커피와 갓 구운 디저트를 준비합니다.");
});
