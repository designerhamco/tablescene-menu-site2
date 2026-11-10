import assert from "node:assert/strict";
import test from "node:test";
import { measureMenuHeaderContentHeight } from "./menu-header-measurement";

function element(height: number, scrollHeight: number, trigger = false, overlay = false) {
  return {
    getBoundingClientRect: () => ({ height }), scrollHeight,
    hasAttribute: (name: string) => name === "data-language-menu-trigger" && trigger,
    closest: () => overlay ? {} : null,
  } as unknown as HTMLElement;
}
function header(...elements: HTMLElement[]) {
  return { querySelectorAll: () => elements } as unknown as ParentNode;
}

test("popup scroll overflow cannot enlarge a header, while the trigger retains its real size", () => {
  const copy = element(42, 42);
  assert.equal(measureMenuHeaderContentHeight(header(copy, element(44, 44, true))), 44);
  assert.equal(measureMenuHeaderContentHeight(header(copy, element(44, 206, true), element(158, 158, false, true))), 44);
});

test("actual clipped or expanded copy still reserves its complete reading height", () => {
  assert.equal(measureMenuHeaderContentHeight(header(element(42, 120), element(44, 206, true))), 120);
  assert.equal(measureMenuHeaderContentHeight(header(element(160, 120), element(44, 206, true))), 160);
  assert.equal(measureMenuHeaderContentHeight(header(element(21, 21), element(44, 206, true))), 44);
  assert.equal(measureMenuHeaderContentHeight(null), 0);
});
