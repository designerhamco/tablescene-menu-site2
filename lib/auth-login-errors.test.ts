import assert from "node:assert/strict";
import test from "node:test";

import {
  getSignInErrorCode,
  getSignInErrorMessage,
} from "./auth-login-errors";

test("maps Supabase invalid credential errors to a stable code", () => {
  assert.equal(
    getSignInErrorCode({
      code: "invalid_credentials",
      message: "Invalid login credentials",
    }),
    "invalid-credentials",
  );
});

test("shows a Korean message for invalid credentials", () => {
  assert.equal(
    getSignInErrorMessage("Invalid%20login%20credentials"),
    "이메일 또는 비밀번호가 올바르지 않습니다.",
  );
});

test("does not expose unexpected provider errors", () => {
  assert.equal(
    getSignInErrorMessage("Unexpected%20provider%20detail"),
    "로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
  );
});

test("handles malformed encoded errors safely", () => {
  assert.equal(
    getSignInErrorMessage("%E0%A4%A"),
    "로그인 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.",
  );
});
