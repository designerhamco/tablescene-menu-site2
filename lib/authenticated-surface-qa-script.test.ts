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

test("authenticated surface QA covers account, editor, operations and responsive failure modes", () => {
  for (const route of [
    "/mypage?tab=menus",
    "/mypage?tab=payments",
    "/mypage/operations",
    "/mypage/staff",
    "edit?tab=menu",
    "edit?tab=localization",
    "/preview",
    "/qr",
  ]) {
    assert.ok(source.includes(route), `expected authenticated QA route: ${route}`);
  }
  assert.match(source, /width: 390, height: 844/);
  assert.match(source, /clippedInteractiveElements/);
  assert.match(source, /horizontalOverflow/);
  assert.match(source, /wcag2aa/);
  assert.match(source, /authentication session was lost/);
});
