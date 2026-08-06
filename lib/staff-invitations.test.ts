import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStaffInvitationEmail,
  isStaffInvitationRole,
  isValidStaffInvitationEmail,
  normalizeStaffInvitationEmail,
} from "./staff-invitations";

test("staff invitation input normalization fails closed", () => {
  assert.equal(normalizeStaffInvitationEmail("  OWNER@Example.COM "), "owner@example.com");
  assert.equal(isValidStaffInvitationEmail("member@example.com"), true);
  assert.equal(isValidStaffInvitationEmail("member@localhost"), false);
  assert.equal(isStaffInvitationRole("manager"), true);
  assert.equal(isStaffInvitationRole("owner"), false);
});

test("staff invitation email contains the bounded acceptance link without exposing HTML", () => {
  const template = buildStaffInvitationEmail({
    inviterEmail: "owner@example.com",
    inviteUrl: "https://menu.example/staff/invitations/accept?token=opaque-token",
    menuSiteNames: ["Cafe <One>", "Cafe Two"],
    role: "editor",
    expiresAt: new Date("2026-08-13T00:00:00.000Z"),
  });

  assert.match(template.subject, /직원 초대/);
  assert.match(template.text, /편집자/);
  assert.match(template.text, /opaque-token/);
  assert.match(template.html, /Cafe &lt;One&gt;/);
  assert.doesNotMatch(template.html, /Cafe <One>/);
});
