import assert from "node:assert/strict";
import test from "node:test";
import { createUnsavedChangesRegistry } from "./unsaved-changes";

test("미저장 배치와 리스트 초안을 함께 확인하고 취소하면 모두 유지한다", async () => {
  const guard = createUnsavedChangesRegistry(); let discarded = 0, asked = 0;
  const unregister = guard.register({ dirty: true, discard: () => discarded++ });
  guard.register({ dirty: true, discard: () => discarded++ });
  assert.equal(await guard.confirm(() => { asked++; return false; }, () => assert.fail()), false);
  assert.equal(asked, 1); assert.equal(discarded, 0); assert.equal(guard.hasChanges(), true);
  assert.equal(await guard.confirm(() => { asked++; return true; }, () => assert.fail()), true);
  assert.equal(discarded, 2); assert.equal(guard.hasChanges(), false);
  assert.equal(await guard.confirm(() => assert.fail("같은 이동에서 중복 확인하지 않는다"), () => assert.fail()), true);
  unregister();
});
test("자동 저장 중에는 이동을 차단하고 성공 후에는 다시 묻지 않으며 실패 초안은 보호한다", async () => {
  const guard = createUnsavedChangesRegistry(); let busy = 0;
  const unregister = guard.register({ dirty: true, pending: true, discard: () => assert.fail() });
  assert.equal(await guard.confirm(() => assert.fail(), () => { busy++; }), false); assert.equal(busy, 1);
  unregister();
  const saved = guard.register({ dirty: false, discard: () => assert.fail() });
  assert.equal(await guard.confirm(() => assert.fail(), () => assert.fail()), true); saved();
  guard.register({ dirty: true, discard: () => assert.fail() });
  assert.equal(await guard.confirm(() => false, () => assert.fail()), false);
});
