import assert from "node:assert/strict";
import test from "node:test";

import { isOwnerRuntimeActor } from "./owner-runtime-access";

test("owner runtime access allows only the exact resource owner", () => {
  assert.equal(isOwnerRuntimeActor("owner-a", { user_id: "owner-a" }), true);
  assert.equal(isOwnerRuntimeActor("staff-a", { user_id: "owner-a" }), false);
});

test("owner runtime access fails closed for missing identities and resources", () => {
  assert.equal(isOwnerRuntimeActor("", { user_id: "owner-a" }), false);
  assert.equal(isOwnerRuntimeActor("owner-a", { user_id: null }), false);
  assert.equal(isOwnerRuntimeActor("owner-a", null), false);
});
