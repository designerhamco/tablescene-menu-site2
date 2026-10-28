import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(new URL("../scripts/qa-authenticated-surfaces.mjs", import.meta.url), "utf8");
const packageJson = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

test("authenticated surface QA requires ignored credentials and never uses a service key", () => {
  assert.match(source, /AUTHENTICATED_SURFACE_QA_EMAIL/);
  assert.match(source, /AUTHENTICATED_SURFACE_QA_PASSWORD/);
  assert.doesNotMatch(source, /SERVICE_ROLE|SUPABASE_SERVICE/);
  assert.equal(
    packageJson.scripts["qa:authenticated-surfaces"],
    "node --env-file-if-exists=.env.qa.local scripts/qa-authenticated-surfaces.mjs",
  );
});

test("authenticated surface QA covers every mypage group, discovered editor tabs and responsive failure modes", () => {
  for (const route of [
    "/notifications",
    "/mypage?tab=menus&menuTab=active",
    "/mypage?tab=menus&menuTab=holding",
    "/mypage?tab=menus&menuTab=deleted",
    "/mypage?tab=payments&billingTab=history",
    "/mypage?tab=payments&billingTab=ai-credits",
    "/mypage?tab=inquiries",
    "/mypage?tab=notifications",
    "/mypage?tab=favorites",
    "/mypage?tab=account",
    "/mypage/operations",
    "/mypage/staff",
    "/preview",
    "/qr",
  ]) {
    assert.ok(source.includes(route), `expected authenticated QA route: ${route}`);
  }
  assert.match(source, /discoverMenuEditorRoutes/);
  assert.match(source, /a\[href\*="\/edit\?tab="\]/);
  assert.match(source, /width: 390, height: 844/);
  assert.match(source, /clippedInteractiveElements/);
  assert.match(source, /horizontalOverflow/);
  assert.match(source, /wcag2aa/);
  assert.match(source, /authentication session was lost/);
});
