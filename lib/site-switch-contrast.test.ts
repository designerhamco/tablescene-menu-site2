import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import test from "node:test";
import postcss from "postcss";
import { Switch } from "../app/components/ui/switch";
import SwitchField from "../components/mypage/menu-editor/SwitchField";

const read = (file: string) => readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const css = read("styles/ui-system.css");
const rules = postcss.parse(css);
function palette(surface: "light" | "dark") {
  const values: Record<string, string> = {};
  rules.walkRules(rule => {
    if (!rule.selectors.includes(`.site-switch[data-surface="${surface}"]`)) return;
    rule.walkDecls(decl => { values[decl.prop] = decl.value; });
  });
  return values;
}
function luminance(hex: string) {
  assert.match(hex, /^#[\da-f]{6}$/i, "switch colors must be explicit and opaque");
  const rgb = hex.slice(1).match(/../g)!.map(value => {
    const channel = parseInt(value, 16) / 255;
    return channel <= .04045 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4;
  });
  return rgb[0] * .2126 + rgb[1] * .7152 + rgb[2] * .0722;
}
function contrast(a: string, b: string) {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + .05) / (Math.min(x, y) + .05);
}

for (const surface of ["light", "dark"] as const) {
  test(`${surface} switch keeps track, thumb and focus identifiable on supported surfaces`, () => {
    const p = palette(surface);
    const backgrounds = surface === "light"
      ? ["#ffffff", "#f7f8fa", "#f0f1f3"]
      : ["#15181e", "#24282f", "#09090b", "#032214", "#063925"];
    for (const background of backgrounds) {
      for (const state of ["off", "on", "off-hover", "on-hover"]) {
        assert.ok(contrast(p[`--ui-switch-${state}`], background) >= 3, `${surface} ${state} vs ${background}`);
        assert.ok(contrast(p["--ui-switch-thumb"], p[`--ui-switch-${state}`]) >= 3, `${surface} ${state} thumb`);
      }
      // Product policy: disabled is exempt in WCAG, but remains identifiable here.
      assert.ok(contrast(p["--ui-switch-disabled-edge"], background) >= 3, `${surface} disabled edge`);
      assert.ok(contrast(p["--ui-switch-disabled-thumb"], p["--ui-switch-disabled-track"]) >= 3, `${surface} disabled thumb`);
      assert.ok(contrast(p["--ui-switch-focus"], background) >= 3, `${surface} focus`);
    }
  });
}

test("shared switch preserves role, checked, disabled and external form association", () => {
  for (const checked of [false, true]) for (const disabled of [false, true]) {
    const html = renderToStaticMarkup(createElement(Switch, {
      checked, disabled, name: "enabled", form: "settings-form", surface: "dark", "aria-label": "주문 기능 사용",
    }));
    assert.match(html, /role="switch"/);
    assert.ok(html.includes(`aria-checked="${checked}"`));
    assert.match(html, /data-surface="dark"/);
    assert.match(html, /class="site-switch peer"/);
    assert.match(html, /type="checkbox"[^>]*name="enabled"/);
    assert.match(html, /form="settings-form"/);
    assert.equal(/<input[^>]*\schecked=""/.test(html), checked);
    assert.equal(/<input[^>]*\sdisabled=""/.test(html), disabled);
  }
});

test("switch loading preserves its confirmed position and geometry while blocking duplicate input", () => {
  for (const checked of [false, true]) {
    const html = renderToStaticMarkup(createElement(Switch, { checked, loading: true, "aria-label": "공개 설정" }));
    assert.ok(html.includes(`aria-checked="${checked}"`));
    assert.match(html, /data-loading="true"/); assert.match(html, /aria-busy="true"/);
    assert.match(html, /<button[^>]*disabled=""/); assert.match(html, /site-switch-spinner/);
  }
  const row = /\.site-switch\[data-loading\] \.site-switch-thumb \{([^}]+)\}/.exec(css)?.[1] ?? "";
  assert.doesNotMatch(row, /width:|height:|padding:|margin:|transform:/);
});

test("editor switch uses common control and keeps blocked initial values out of the form", () => {
  for (const canTurnOn of [false, true]) {
    const html = renderToStaticMarkup(createElement(SwitchField, {
      name: "visible", label: "콘텐츠 표시", defaultChecked: true, canTurnOn, form: "editor-form",
      description: "공개할 콘텐츠를 선택합니다.",
    }));
    assert.match(html, /class="site-switch peer"/);
    assert.match(html, /aria-labelledby="[^"]+-label"/);
    assert.match(html, /aria-describedby="[^"]+-description"/);
    assert.equal(/<input[^>]*\schecked=""/.test(html), canTurnOn);
    assert.match(html, /form="editor-form"/);
  }
  assert.doesNotMatch(read("components/mypage/menu-editor/SwitchField.tsx"), /opacity-|peer-checked:bg|bg-zinc-200/);
  const consent = read("components/mypage/MarketingConsentSettings.tsx");
  assert.match(consent, /<Switch[^>]+checked=\{accepted\}[^>]+disabled=\{isSaving\}/);
  assert.match(consent, /onCheckedChange=\{nextAccepted => void updateConsent\(nextAccepted\)\}/);
  assert.doesNotMatch(consent, /opacity-|role="switch"/);
});

test("switch state rules keep disabled opaque and motion / forced colors supported", () => {
  assert.match(css, /\.site-switch:disabled \{ cursor: not-allowed; opacity: 1; \}/);
  assert.match(css, /\.site-switch:disabled \.site-switch-track \{\s*border-color: var\(--ui-switch-disabled-edge\);\s*background: var\(--ui-switch-disabled-track\);/);
  assert.match(css, /\.site-switch:not\(:disabled\):hover/);
  assert.match(css, /\.site-switch:focus-visible \.site-switch-track/);
  assert.match(css, /height: var\(--ui-control-height-header\)/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(forced-colors: active\) \{[\s\S]*?\.site-switch:disabled \.site-switch-thumb \{ background: GrayText; \}/);
  assert.doesNotMatch(read("app/components/ui/switch.tsx"), /bg-switch-background|opacity-/);
});
