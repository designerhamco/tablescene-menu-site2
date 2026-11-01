import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import test from "node:test";
import { catalogDesigns } from "./catalog-designs";
import { applyTemplatePreviewOptions } from "./template-preview-data";
import { getTemplatePreviewOptionGroups } from "./template-preview-options";
import { buildStarterPreviewData } from "./template-starter-preview";
import type { TemplateKey } from "./templates";

for (const design of catalogDesigns) {
  test(`${design.id}: enabled preview media exists and never exposes the legacy TS logo`, () => {
    const source = buildStarterPreviewData(design.templateKey as TemplateKey, null, design.id);
    const original = structuredClone(source);
    const choices = getTemplatePreviewOptionGroups(design.templateKey).flatMap(group => group.choices);
    const enabled = applyTemplatePreviewOptions(source, Object.fromEntries(choices.map(([key]) => [key, "on"])));
    const disabled = applyTemplatePreviewOptions(source, Object.fromEntries(choices.map(([key]) => [key, "off"])));
    if (choices.some(([key]) => key === "logoPreview")) {
      assert.ok(enabled.menuSite.logo_url, "logo ON must have a visible example");
      assert.notEqual(enabled.menuSite.logo_url, "/placeholders/starter/logo.svg");
      assert.equal(disabled.menuSite.logo_url, null, "logo OFF restores the text brand");
    }
    const urls = [enabled.menuSite.logo_url, enabled.menuSite.cover_image_url,
      ...enabled.items.map(item => item.image_url),
      ...(enabled.featuredSlides ?? []).map(slide => slide.imageUrl),
      ...(enabled.widgets ?? []).map(widget => widget.imageUrl)];
    for (const url of new Set(urls.filter((value): value is string => Boolean(value)))) {
      if (url.startsWith("/")) assert.ok(existsSync(new URL(`../public${url}`, import.meta.url)), `${design.id}: missing ${url}`);
    }
    assert.deepEqual(source, original, "catalog options must not change the starter or customer source");
  });
}

test("logo options retain genuine brand assets rather than replacing them with examples", () => {
  const source = buildStarterPreviewData("cafe_van_gogh_a");
  source.menuSite.logo_url = "/merchant-brand.svg";
  assert.equal(applyTemplatePreviewOptions(source, { logoPreview: "on" }).menuSite.logo_url, "/merchant-brand.svg");
  assert.equal(source.menuSite.logo_url, "/merchant-brand.svg");
});
