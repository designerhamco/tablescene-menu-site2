import assert from "node:assert/strict";
import test from "node:test";

import {
  buildStaffInvitationEmail,
  isStaffInvitationRole,
  isValidStaffInvitationEmail,
  normalizeStaffInvitationEmail,
  STAFF_INVITATION_ROLE_DESCRIPTIONS,
  STAFF_INVITATION_ROLE_LABELS,
} from "./staff-invitations";

test("staff invitation input normalization fails closed", () => {
  assert.equal(normalizeStaffInvitationEmail("  OWNER@Example.COM "), "owner@example.com");
  assert.equal(isValidStaffInvitationEmail("member@example.com"), true);
  assert.equal(isValidStaffInvitationEmail("member@localhost"), false);
  assert.equal(isStaffInvitationRole("manager"), true);
  assert.equal(isStaffInvitationRole("owner"), false);
});

test("staff role labels and descriptions match the current operations policy", () => {
  assert.equal(STAFF_INVITATION_ROLE_LABELS.order_staff, "운영 직원");
  assert.match(STAFF_INVITATION_ROLE_DESCRIPTIONS.order_staff, /호출·대기번호/);
  assert.match(STAFF_INVITATION_ROLE_DESCRIPTIONS.order_staff, /메뉴 편집은 할 수 없습니다/);
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
