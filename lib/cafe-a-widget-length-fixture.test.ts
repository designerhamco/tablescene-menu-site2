import assert from "node:assert/strict";
import test from "node:test";

import {
  buildCafeAWidgetLengthFixture,
  parseCafeAWidgetLengthFixtureOptions,
  type CafeAWidgetLengthFixtureOptions,
} from "./template-demo-data/cafe-a-widget-length-fixture";

function build(options: Partial<CafeAWidgetLengthFixtureOptions> = {}) {
  const parsed = parseCafeAWidgetLengthFixtureOptions({
    type: options.type,
    count: options.count == null ? undefined : String(options.count),
    title: options.titleLength == null ? undefined : String(options.titleLength),
    body: options.bodyLength == null ? undefined : String(options.bodyLength),
    locale: options.locale,
    align: options.align,
    layout: options.layout,
    content: options.content,
  });

  return buildCafeAWidgetLengthFixture(parsed);
}

test("buildCafeAWidgetLengthFixture creates exact title/body lengths", () => {
  const fixture = build({
    type: "text",
    count: 3,
    titleLength: 30,
    bodyLength: 120,
    locale: "ko",
    content: "both",
  });

  assert.equal(fixture.widgets.length, 3);
  fixture.widgets.forEach((widget) => {
    assert.equal(widget.titleUtf16Length, 30);
    assert.equal(widget.bodyUtf16Length, 120);
    assert.equal(widget.titleCodepointLength, 30);
    assert.equal(widget.bodyCodepointLength, 120);
  });
});

test("buildCafeAWidgetLengthFixture supports allowed length matrix values", () => {
  ([10, 20, 30] as const).forEach((titleLength) => {
    ([40, 80, 120] as const).forEach((bodyLength) => {
      const fixture = build({ titleLength, bodyLength });
      assert.equal(fixture.widgets[0]?.titleUtf16Length, titleLength);
      assert.equal(fixture.widgets[0]?.bodyUtf16Length, bodyLength);
    });
  });
});

test("buildCafeAWidgetLengthFixture supports languages and text/image_text types", () => {
  (["ko", "en", "zh", "ja"] as const).forEach((locale) => {
    (["text", "image_text"] as const).forEach((type) => {
      const fixture = build({ type, locale, count: 1, titleLength: 30, bodyLength: 120 });
      const widget = fixture.data.widgets?.[0];
      assert.equal(widget?.type, type);
      assert.equal(widget?.title?.length, 30);
      assert.equal(widget?.description?.length, 120);
      assert.equal(Boolean(widget?.imageUrl), type === "image_text");
    });
  });
});

test("parseCafeAWidgetLengthFixtureOptions falls back for invalid query values", () => {
  const options = parseCafeAWidgetLengthFixtureOptions({
    type: "script",
    count: "99",
    title: "999",
    body: "999",
    locale: "fr",
    align: "justify",
    layout: "balanced",
    content: "unknown",
  });

  assert.equal(options.type, "text");
  assert.equal(options.count, 1);
  assert.equal(options.titleLength, 30);
  assert.equal(options.bodyLength, 120);
  assert.equal(options.locale, "ko");
  assert.equal(options.align, "left");
  assert.equal(options.layout, "orderedBalancedFit");
  assert.equal(options.content, "both");
});

test("buildCafeAWidgetLengthFixture creates exact longWord lengths", () => {
  const fixture = build({
    type: "text",
    count: 1,
    titleLength: 30,
    bodyLength: 120,
    locale: "ja",
    content: "longWord",
  });

  const widget = fixture.data.widgets?.[0];
  assert.equal(widget?.title?.length, 30);
  assert.equal(widget?.description?.length, 120);
  assert.equal(widget?.title?.includes(" "), false);
  assert.equal(widget?.description?.includes(" "), false);
});
