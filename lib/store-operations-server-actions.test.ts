import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const actionModules = [
  "../app/mypage/menus/[menuId]/calls/actions.ts",
  "../app/mypage/menus/[menuId]/orders/actions.ts",
  "../app/mypage/menus/[menuId]/tables/actions.ts",
];

test("store operation server action modules export only async functions and types", async () => {
  for (const modulePath of actionModules) {
    const source = await readFile(new URL(modulePath, import.meta.url), "utf8");

    assert.match(source, /^"use server";/, `${modulePath} must remain a server action module`);
    assert.doesNotMatch(
      source,
      /export\s+(?:const|let|var|class)\s+/,
      `${modulePath} must not export runtime values other than async functions`,
    );
  }
});
