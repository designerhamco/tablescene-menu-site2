import assert from "node:assert/strict";
import test from "node:test";

const {
  normalizeMenuTableId,
  normalizeMenuTableLabel,
  normalizeMenuTableStatus,
  toMenuTableListItem,
} = await import(
  new URL("./menu-table-validation.ts", import.meta.url).href
) as typeof import("./menu-table-validation");

test("table management validates ids, labels, and mutable statuses", () => {
  assert.equal(normalizeMenuTableId("4f7be4a1-90db-4e1f-987d-e91385f0bf91"), "4f7be4a1-90db-4e1f-987d-e91385f0bf91");
  assert.equal(normalizeMenuTableLabel("  창가 1번  "), "창가 1번");
  assert.equal(normalizeMenuTableStatus("active"), "active");
  assert.equal(normalizeMenuTableStatus("disabled"), "disabled");
  assert.throws(() => normalizeMenuTableId("table-1"), /테이블 정보를/);
  assert.throws(() => normalizeMenuTableLabel("   "), /1자 이상/);
  assert.throws(() => normalizeMenuTableStatus("archived"), /올바른 테이블 상태/);
});

test("table list DTO omits token hashes and archived rows cannot be mapped", () => {
  const item = toMenuTableListItem({
    id: "4f7be4a1-90db-4e1f-987d-e91385f0bf91",
    label: "테이블 1",
    qr_public_id: "bdb5d7b6-5447-4bdd-8e37-0b57ff221727",
    display_order: 0,
    status: "active",
    token_rotated_at: "2026-08-06T12:00:00.000Z",
    created_at: "2026-08-06T12:00:00.000Z",
    updated_at: "2026-08-06T12:00:00.000Z",
  });

  assert.deepEqual(Object.keys(item).sort(), [
    "createdAt",
    "displayOrder",
    "id",
    "label",
    "qrPath",
    "status",
    "tokenRotatedAt",
    "updatedAt",
  ]);
  assert.equal(item.qrPath, "/table/bdb5d7b6-5447-4bdd-8e37-0b57ff221727");
  assert.throws(() => toMenuTableListItem({ ...item, qr_public_id: "bdb5d7b6-5447-4bdd-8e37-0b57ff221727", display_order: 0, status: "archived", token_rotated_at: item.tokenRotatedAt, created_at: item.createdAt, updated_at: item.updatedAt }), /올바른 테이블 상태/);
});
