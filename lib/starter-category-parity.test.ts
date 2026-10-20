import assert from "node:assert/strict";
import test from "node:test";
import { getStarterPreset } from "./menu-starter-presets";
import { templateCatalog } from "./templates";
import { buildDisplayMenuAPreviewData } from "./template-demo-data/display-menu-a";

test("all catalog starter categories have even example item counts", () => {
  for (const template of templateCatalog) {
    const preset = getStarterPreset(template.key, template.categoryLabel, template.template_category);
    for (const page of preset.pages) for (const category of page.categories) {
      const context = `${template.key} / ${page.title} / ${category.name}`;
      assert.equal(category.items.length % 2, 0, context);
      assert.equal(new Set(category.items.map(item => item.name)).size, category.items.length, `${context}: distinct items`);
      assert.ok(category.items.every(item => item.name.trim() && Number.isFinite(item.price) && item.price >= 0), context);
    }
  }
});

test("Display's default preview and creation fixture have even categories and unique IDs", () => {
  const data = buildDisplayMenuAPreviewData();
  for (const category of data.categories) {
    const items = data.items.filter(item => item.category_id === category.id);
    assert.equal(items.length % 2, 0, category.name);
    assert.ok(items.length > 0);
  }
  assert.equal(new Set(data.items.map(item => item.id)).size, data.items.length);
});
