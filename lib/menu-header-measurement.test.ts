import assert from "node:assert/strict";
import test from "node:test";
import { measureMenuHeaderContentHeight } from "./menu-header-measurement";

function element(height: number, scrollHeight: number, trigger = false, overlay = false, clamped = false) {
  return {
    getBoundingClientRect: () => ({ height }), scrollHeight,
    hasAttribute: (name: string) => name === "data-language-menu-trigger" ? trigger : name === "data-menu-header-copy-clamped" && clamped,
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

test("intentionally clamped copy reserves only its visible height without leaking hidden lines into the header", () => {
  assert.equal(measureMenuHeaderContentHeight(header(element(63, 420, false, false, true), element(44, 206, true))), 63);
  assert.equal(measureMenuHeaderContentHeight(header(element(42, 420, false, false, true), element(44, 206, true))), 44);
});

test("right-column information reserves trigger, real copy and their in-flow gaps together", () => {
  const stack = {};
  const leaf = (top: number, height: number, trigger = false, overlay = false, clamped = false) => ({
    getBoundingClientRect: () => ({top,height}), scrollHeight: trigger || clamped ? 900 : height,
    hasAttribute: (name:string) => name === "data-language-menu-trigger" ? trigger : name === "data-menu-header-copy-clamped" && clamped,
    closest: (selector:string) => selector === "[data-language-menu-surface]" ? (overlay ? {} : null) : stack,
  }) as unknown as HTMLElement;
  assert.equal(measureMenuHeaderContentHeight(header(leaf(20,36,true),leaf(68,60),leaf(140,40),leaf(56,900,false,true))),160);
  assert.equal(measureMenuHeaderContentHeight(header(leaf(20,36,true),leaf(68,100))),148);
  assert.equal(measureMenuHeaderContentHeight(header(leaf(20,36,true),leaf(68,63,false,false,true))),111);
});

test("centered shared rows reserve tools plus the taller copy on either side", () => {
  const sharedRows = {}, rightStack = {};
  const leaf = (top: number, height: number, right = false, overlay = false) => ({
    getBoundingClientRect: () => ({top, height}), scrollHeight: 900,
    hasAttribute: () => true,
    closest: (selector: string) => selector === "[data-language-menu-surface]" ? (overlay ? {} : null)
      : selector === "[data-menu-header-shared-rows]" ? sharedRows : right ? rightStack : null,
  }) as unknown as HTMLElement;
  const trigger = leaf(20, 24, true);
  assert.equal(measureMenuHeaderContentHeight(header(trigger, leaf(56, 63), leaf(56, 21, true))), 99);
  assert.equal(measureMenuHeaderContentHeight(header(trigger, leaf(56, 21), leaf(56, 63, true), leaf(44, 900, true, true))), 99);
  assert.equal(measureMenuHeaderContentHeight(header(trigger, leaf(56, 63))), 99);
  assert.equal(measureMenuHeaderContentHeight(header(leaf(20, 63))), 63);
});
