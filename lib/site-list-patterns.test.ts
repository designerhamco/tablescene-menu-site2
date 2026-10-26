import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { getSitePageItems } from "./site-pagination";
import { getAnnouncementNeighborFilter } from "./announcements";

test("page windows keep current and both ends with a bounded mobile width", () => {
  assert.deepEqual(getSitePageItems(1, 3, 1), [1, 2, 3]);
  assert.deepEqual(getSitePageItems(5, 10, 1), [1, "start-ellipsis", 5, "end-ellipsis", 10]);
  assert.deepEqual(getSitePageItems(100, 10, 1), [1, "start-ellipsis", 10]);
  assert.deepEqual(getSitePageItems(1, 0, 1), []);
  for (let total = 1; total < 150; total++) for (let current = 1; current <= total; current++) {
    const items = getSitePageItems(current, total, 1);
    assert.ok(items.length <= 5);
    assert.ok(items.includes(current));
    assert.ok(items.includes(1) && items.includes(total));
    assert.equal(new Set(items).size, items.length);
  }
});

test("post neighbors use stable time/id ordering and reject raw filter injection", () => {
  const id = "11111111-2222-4333-8444-555555555555";
  const at = "2026-10-26T10:30:00.123456+00:00";
  assert.equal(getAnnouncementNeighborFilter(id, at, "previous"), `published_at.lt.${at},and(published_at.eq.${at},id.lt.${id})`);
  assert.equal(getAnnouncementNeighborFilter(id, at, "next"), `published_at.gt.${at},and(published_at.eq.${at},id.gt.${id})`);
  for (const date of [null, "invalid", `${at},status.eq.draft`, "2026-99-99T00:00:00Z"]) assert.equal(getAnnouncementNeighborFilter(id, date, "next"), null);
  assert.equal(getAnnouncementNeighborFilter("injected,or(id.eq.1)", at, "next"), null);
  const server = readFileSync(new URL("./server/announcement-service.ts", import.meta.url), "utf8");
  const neighbors = server.slice(server.indexOf("export async function getPublishedAnnouncementNeighbors"));
  assert.match(neighbors, /\.eq\("status", "published"\)/);
  assert.match(neighbors, /\.lte\("published_at", now\)/);
  assert.doesNotMatch(neighbors, /service_role|\.insert\(|\.update\(|\.delete\(/);
});
