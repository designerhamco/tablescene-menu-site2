import assert from "node:assert/strict";
import test from "node:test";

import {
  hashStaffInvitationToken,
  isValidStaffInvitationToken,
} from "./staff-invitation-token";

test("staff invitation tokens accept bounded base64url material only", () => {
  const token = "a".repeat(43);
  assert.equal(isValidStaffInvitationToken(token), true);
  assert.equal(isValidStaffInvitationToken("short"), false);
  assert.equal(isValidStaffInvitationToken(`${"a".repeat(42)}+`), false);
  assert.equal(isValidStaffInvitationToken("a".repeat(129)), false);
});

test("staff invitation token hashing produces a one-way database key", () => {
  const token = "opaque_invitation_token_material_123456789";
  const hash = hashStaffInvitationToken(token);

  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.notEqual(hash, token);
  assert.equal(hashStaffInvitationToken(token), hash);
});
