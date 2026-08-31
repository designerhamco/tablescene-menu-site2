import assert from "node:assert/strict";
import test from "node:test";

import { validateAubeTablePublishStructure } from "./aube-table";
import { createStarterMenuData, getStarterPreset } from "./menu-starter-presets";

type InsertRow = Record<string, unknown>;

class StarterProvisioningClient {
  readonly inserted = new Map<string, InsertRow[]>();

  from(table: string) {
    return {
      select: (_columns: string, options?: { count?: string; head?: boolean }) => {
        if (!options?.head) throw new Error(`Unexpected select on ${table}`);

        return {
          eq: async () => ({ data: null, error: null, count: 0 }),
        };
      },
      insert: (payload: InsertRow | InsertRow[]) => {
        const rows = (Array.isArray(payload) ? payload : [payload]).map((row, index) => ({
          ...row,
          id: `${table}-${(this.inserted.get(table)?.length ?? 0) + index + 1}`,
        }));
        this.inserted.set(table, [...(this.inserted.get(table) ?? []), ...rows]);

        const result = Promise.resolve({ data: rows, error: null });
        return {
          select: async () => ({ data: rows, error: null }),
          then: result.then.bind(result),
        };
      },
    };
  }
}

for (const templateKey of ["dining_aube_table_a", "dining_aube_table_b"] as const) {
  test(`${templateKey} starter provisions a publishable multipage graph`, async () => {
    const client = new StarterProvisioningClient();
    const preset = getStarterPreset(templateKey);
    const expectedCategories = preset.pages.flatMap((page) => page.categories);
    const expectedItems = preset.pages.flatMap((page) => [
      ...page.categories.flatMap((category) => category.items),
      ...(page.direct_items ?? []),
    ]);
    const expectedPriceOptions = expectedItems.flatMap((item) => item.price_options ?? []);

    const result = await createStarterMenuData(
      client as never,
      `menu-${templateKey}`,
      templateKey,
      "fine_dining",
      "fine_dining",
      "basic",
      { applySiteDefaults: false, includeAuxiliaryContent: false },
    );

    const pages = client.inserted.get("menu_pages") ?? [];
    const categories = client.inserted.get("menu_categories") ?? [];
    const items = client.inserted.get("menu_items") ?? [];
    const priceOptions = client.inserted.get("menu_item_price_options") ?? [];
    const pageIds = new Set(pages.map((page) => String(page.id)));
    const categoryIds = new Set(categories.map((category) => String(category.id)));

    assert.equal(result.created, true);
    assert.equal(result.pageCount, preset.pages.length);
    assert.equal(result.categoryCount, expectedCategories.length);
    assert.equal(result.itemCount, expectedItems.length);
    assert.equal(pages.length, preset.pages.length);
    assert.equal(categories.length, expectedCategories.length);
    assert.equal(items.length, expectedItems.length);
    assert.equal(priceOptions.length, expectedPriceOptions.length);

    assert.equal(
      pages.every(
        (page) =>
          pageIds.has(String(page.id)) &&
          (page.layout_columns === 1 || page.layout_columns === 2) &&
          (page.text_alignment === "left" || page.text_alignment === "center"),
      ),
      true,
    );
    assert.equal(
      categories.every(
        (category) =>
          pageIds.has(String(category.menu_page_id)) &&
          typeof category.course_price_visible === "boolean" &&
          typeof category.course_price_description_visible === "boolean",
      ),
      true,
    );
    assert.equal(
      items.every((item) => {
        const pageId = String(item.menu_page_id);
        const categoryId = item.category_id == null ? null : String(item.category_id);
        return pageIds.has(pageId) && (categoryId === null || categoryIds.has(categoryId));
      }),
      true,
    );
    assert.ok(items.some((item) => item.category_id === null));
    assert.ok(items.some((item) => item.category_id !== null));
    assert.equal(
      priceOptions.every((option) => items.some((item) => item.id === option.menu_item_id)),
      true,
    );

    const publishError = validateAubeTablePublishStructure({
      pages: pages.map((page) => ({
        id: String(page.id),
        title: String(page.title),
        visible: page.visible !== false,
        sort_order: Number(page.sort_order),
      })),
      categories: categories.map((category) => ({
        id: String(category.id),
        menu_page_id: String(category.menu_page_id),
        name: String(category.name),
        visible: category.visible !== false,
      })),
      items: items.map((item) => ({
        id: String(item.id),
        menu_page_id: String(item.menu_page_id),
        category_id: item.category_id == null ? null : String(item.category_id),
        visible: item.visible !== false,
      })),
    });

    assert.equal(publishError, null);
  });
}
