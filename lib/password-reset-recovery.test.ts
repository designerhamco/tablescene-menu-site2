import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS,
  updateAndVerifyPassword,
} from "./password-reset-recovery";

test("password reset succeeds only after the new credential is verified", async () => {
  const calls: string[] = [];
  const result = await updateAndVerifyPassword(
    {
      async updatePassword() {
        calls.push("update");
        return { email: "owner@example.com", error: false, userId: "user-1" };
      },
      async verifyPassword(email, password) {
        calls.push(`verify:${email}:${password.length}`);
        return { email, error: false, userId: "user-1" };
      },
    },
    "new-password",
  );

  assert.deepEqual(result, { ok: true, userId: "user-1" });
  assert.deepEqual(calls, ["update", "verify:owner@example.com:12"]);
});

test("password reset does not report success when update result is incomplete", async () => {
  let verificationCalled = false;
  const result = await updateAndVerifyPassword(
    {
      async updatePassword() {
        return { email: null, error: false, userId: null };
      },
      async verifyPassword() {
        verificationCalled = true;
        return { email: null, error: false, userId: null };
      },
    },
    "new-password",
  );

  assert.deepEqual(result, { ok: false, reason: "update-failed" });
  assert.equal(verificationCalled, false);
});

test("password reset does not report success when the new credential cannot sign in", async () => {
  const result = await updateAndVerifyPassword(
    {
      async updatePassword() {
        return { email: "owner@example.com", error: false, userId: "user-1" };
      },
      async verifyPassword(email) {
        return { email, error: true, userId: null };
      },
    },
    "new-password",
  );

  assert.deepEqual(result, { ok: false, reason: "verification-failed" });
});

test("recovery authorization marker stays short-lived", () => {
  assert.equal(PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS, 15 * 60);
});

test("password recovery exchanges codes only through the server callback", () => {
  const actionsSource = readFileSync(new URL("../app/auth/actions.ts", import.meta.url), "utf8");
  const callbackSource = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  const formSource = readFileSync(
    new URL("../app/reset-password/ResetPasswordForm.tsx", import.meta.url),
    "utf8",
  );

  assert.match(actionsSource, /callbackUrl\.searchParams\.set\("flow", "recovery"\)/);
  assert.match(callbackSource, /exchangeCodeForSession\(code\)/);
  assert.doesNotMatch(formSource, /exchangeCodeForSession/);
});

test("reset form requires a short-lived server recovery marker", () => {
  const callbackSource = readFileSync(new URL("../app/auth/callback/route.ts", import.meta.url), "utf8");
  const pageSource = readFileSync(new URL("../app/reset-password/page.tsx", import.meta.url), "utf8");

  assert.match(callbackSource, /httpOnly: true/);
  assert.match(callbackSource, /sameSite: "lax"/);
  assert.match(pageSource, /hasRecoveryMarker && Boolean\(user\)/);
});
