import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { getStarterPreset } from "./menu-starter-presets";

test("Loop Bagel opens with the branded plain bagel hero and retains the second slide", () => {
  const preset = getStarterPreset("fast_food_loop_bagel_a");
  const imageUrl = "/menu-templates/fast_food_loop_bagel_a/featured-plain-bagel-loop-packaging.webp";
  assert.equal(preset.site.cover_image_url, imageUrl);
  assert.equal(preset.featured_item_key, "plain-bagel");
  assert.equal(preset.featured_item_name, "플레인 베이글");
  assert.equal(preset.featured_slides?.length, 2);
  assert.deepEqual(preset.featured_slides?.[0], {
    id: "loop-bagel-featured-plain-bagel",
    image_url: imageUrl,
    image_path: null,
    featured_item_key: "plain-bagel",
    featured_item_name: "플레인 베이글",
    sort_order: 0,
  });
  assert.equal(preset.featured_slides?.[1]?.featured_item_key, "honey-walnut-cream-cheese");
  const linkedItem = preset.pages.flatMap((page) => page.categories.flatMap((category) => category.items))
    .find((item) => item.key === preset.featured_slides?.[0]?.featured_item_key);
  assert.equal(linkedItem?.name, "플레인 베이글");
  assert.equal(linkedItem?.price, 3200);
  assert.ok(existsSync(new URL(`../public${imageUrl}`, import.meta.url)));
});
