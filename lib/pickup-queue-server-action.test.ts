import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("pickup queue server action module exports only async functions and types", async () => {
  const source = await readFile(
    new URL("../app/mypage/menus/[menuId]/pickup/actions.ts", import.meta.url),
    "utf8",
  );

  assert.match(source, /^"use server";/);
  assert.doesNotMatch(source, /export\s+(?:const|let|var|class)\s+/);
  assert.match(source, /export\s+async\s+function\s+createPickupQueueAction/);
  assert.match(source, /export\s+async\s+function\s+transitionPickupQueueAction/);
});
