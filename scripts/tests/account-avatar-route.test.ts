import assert from "node:assert/strict";
import { mock, test } from "node:test";
import sharp from "sharp";

process.env.NEXT_PUBLIC_SUPABASE_URL = "https://storage.test";

const id = "d795dd7d-bd99-4e7e-a644-600e08643ddd";
const oldPath = `account-avatars/${id}/de92d806-4cf3-4acd-b796-dd8f45bc2b43.webp`;
let user: { id: string; user_metadata: Record<string, unknown>; app_metadata: Record<string, unknown> } | null;
let failUpdate = false;
let calls: { operation: string; value: unknown }[] = [];
mock.module(new URL("../../lib/supabase/server.ts", import.meta.url).href, { namedExports: { createClient: async () => ({ auth: {
  getUser: async () => ({ data: { user }, error: null }),
  updateUser: async (value: unknown) => { calls.push({ operation: "update", value }); return { error: failUpdate ? new Error("auth unavailable") : null }; },
} }) } });
mock.module(new URL("../../lib/supabase/admin.ts", import.meta.url).href, { namedExports: { createAdminClient: () => ({ storage: { from: (bucket: string) => {
  assert.equal(bucket, "menu-images");
  return {
    upload: async (path: string, bytes: Uint8Array, options: { upsert: boolean }) => { assert.equal(options.upsert, false); assert.equal((await sharp(bytes).metadata()).width, 512); calls.push({ operation: "upload", value: path }); return { error: null }; },
    remove: async (paths: string[]) => { calls.push({ operation: "remove", value: paths }); return { error: null }; },
  };
} } }) } });
const { POST, DELETE } = await import("../../app/api/account/avatar/route");
const png = await sharp({ create: { width: 10, height: 10, channels: 3, background: "white" } }).png().toBuffer();
function reset() { user = { id, user_metadata: { display_name: "kept", profile_avatar_path: oldPath }, app_metadata: {} }; calls = []; failUpdate = false; }
function request(method: string, origin = "https://site.test") {
  const body = new FormData(); body.append("file", new File([new Uint8Array(png)], "profile.png", { type: "image/png" }));
  body.append("userId", "someone-else"); body.append("previousPath", "menu-sites/other/image.webp");
  return new Request("https://site.test/api/account/avatar", { method, headers: { origin }, ...(method === "POST" ? { body } : {}) });
}

test("route rejects foreign origins, missing users and deleted accounts before storage writes", async () => {
  reset(); assert.equal((await POST(request("POST", "https://outside.test"))).status, 403);
  user = null; assert.equal((await POST(request("POST"))).status, 401);
  reset(); user!.app_metadata.account_status = "deletion_requested"; assert.equal((await DELETE(request("DELETE"))).status, 403);
  assert.deepEqual(calls, []);
});
test("owner and staff use the session identity, preserve auth metadata scope, and cannot target another user", async () => {
  for (const role of ["owner", "staff"]) {
    reset(); user!.app_metadata.role = role;
    const response = await POST(request("POST")); assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const result = await response.json(); assert.ok(result.avatarUrl.includes(`account-avatars/${id}/`));
    assert.deepEqual(calls.map(call => call.operation), ["upload", "update", "remove"]);
    assert.deepEqual(Object.keys((calls[1].value as { data: object }).data), ["profile_avatar_path"]);
    assert.deepEqual(calls[2].value, [oldPath]);
  }
});
test("metadata failure rolls back only the new upload; DELETE clears only the current account photo", async () => {
  reset(); failUpdate = true; assert.equal((await POST(request("POST"))).status, 500);
  assert.deepEqual(calls[2].value, [calls[0].value]); assert.notDeepEqual(calls[2].value, [oldPath]);
  reset(); assert.equal((await DELETE(request("DELETE"))).status, 200);
  assert.deepEqual(calls, [{ operation: "update", value: { data: { profile_avatar_path: null } } }, { operation: "remove", value: [oldPath] }]);
});
