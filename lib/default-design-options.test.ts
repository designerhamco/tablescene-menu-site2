import assert from "node:assert/strict";
import test from "node:test";
import { getDefaultDesignOptions } from "./default-design-options";
import { DEFAULT_DESIGN_REVIEWS } from "./menu-design-policy";
import { buildTemplatePreviewUrl } from "./menu-preview-devices";

test("all default designs open with the logo disabled", () => {
  for (const design of DEFAULT_DESIGN_REVIEWS) {
    const options = getDefaultDesignOptions({ design: design.id });
    assert.equal(options.logoPreview, false);
    assert.equal(options.coverImagesPreview, false);
    assert.equal(options.coverPreview, !["basic-top-row", "basic-top-row-left-logo", "basic-top-row-album"].includes(design.id));
    assert.equal(options.featuredPreview, design.id !== "basic-upper-left");
  }
});

test("logo selection is independent of representative content and survives preview URLs", () => {
  for (const design of DEFAULT_DESIGN_REVIEWS) {
    for (const enabled of ["on", "off"]) {
      const query = { design: design.id, logoPreview: enabled, coverImagesPreview: enabled, coverPreview: "off", featuredPreview: "off" };
      assert.equal(getDefaultDesignOptions(query).logoPreview, enabled === "on");
      for (const device of ["pc", "tablet", "mobile"] as const) {
        const url = new URL(buildTemplatePreviewUrl(design.renderer, query, { device, actual: true, embedded: true }), "https://example.com");
        assert.equal(url.searchParams.get("logoPreview"), enabled);
        assert.equal(url.searchParams.get("coverImagesPreview"), enabled);
        assert.equal(url.searchParams.get("design"), design.id);
        assert.equal(url.searchParams.get("coverPreview"), "off");
      }
    }
  }
});

test("every top-row representative area defaults OFF and can still be explicitly enabled", () => {
  for (const design of ["basic-top-row", "basic-top-row-left-logo", "basic-top-row-album"]) {
    assert.equal(getDefaultDesignOptions({ design }).coverPreview, false);
    assert.equal(getDefaultDesignOptions({ design, coverPreview: "on" }).coverPreview, true);
    assert.equal(getDefaultDesignOptions({ design, coverPreview: "off" }).coverPreview, false);
  }
});
